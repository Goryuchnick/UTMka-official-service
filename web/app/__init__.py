"""
Flask Application Factory для UTMka Web Service
"""
from flask import Flask
from .config import Config
from .extensions import db, jwt, migrate

# Импортируем модели для Alembic
from .models import User, OAuthAccount, Subscription, History, Template, Payment


def create_app(config_class=Config):
    """
    Создаёт и настраивает Flask приложение.
    
    Args:
        config_class: Класс конфигурации (по умолчанию Config)
    
    Returns:
        Flask: Настроенное Flask приложение
    """
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Инициализация расширений
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    
    # Регистрация blueprints
    from .routes import register_blueprints
    register_blueprints(app)
    
    # Инициализация базы данных (только для SQLite в dev, для PostgreSQL используем миграции)
    with app.app_context():
        # Для SQLite в development можно использовать create_all
        # Для production всегда используем миграции Alembic
        if app.config.get('SQLALCHEMY_DATABASE_URI', '').startswith('sqlite'):
            db.create_all()
    
    return app
