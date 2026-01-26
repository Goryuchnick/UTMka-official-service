"""
UTMka API - Flask приложение
"""
import os
import sys
from flask import Flask

from src.core.config import Config, DesktopConfig, DevelopmentConfig


def get_resource_path(relative_path: str) -> str:
    """Путь к ресурсам (работает и в dev, и в PyInstaller)"""
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base_path, relative_path)


def create_app(config_name: str = 'development') -> Flask:
    """
    Фабрика приложений Flask
    
    Args:
        config_name: Имя конфигурации ('development', 'desktop')
    
    Returns:
        Настроенное Flask приложение
    """
    # Определяем пути
    static_folder = get_resource_path('.')
    template_folder = get_resource_path('.')
    
    app = Flask(
        __name__,
        static_url_path='',
        static_folder=static_folder,
        template_folder=template_folder
    )
    
    # Загружаем конфигурацию
    configs = {
        'development': DevelopmentConfig,
        'desktop': DesktopConfig,
        'default': Config
    }
    app.config.from_object(configs.get(config_name, Config))
    
    # Регистрируем blueprints
    from src.api.routes.main import main_bp
    from src.api.routes.history import history_bp
    from src.api.routes.templates import templates_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(templates_bp)
    
    return app