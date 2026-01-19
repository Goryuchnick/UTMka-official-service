"""
Flask Application Factory для UTMka Web Service
"""
from flask import Flask
from .config import Config
from .extensions import db, jwt, migrate


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
    
    # Инициализация базы данных
    with app.app_context():
        db.create_all()
    
    return app
