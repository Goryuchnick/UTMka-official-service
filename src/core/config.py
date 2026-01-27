"""
Конфигурация приложения
"""
import os
import sys
from pathlib import Path


def is_frozen() -> bool:
    """Проверяет, запущено ли из PyInstaller"""
    return getattr(sys, 'frozen', False)


def get_data_dir() -> Path:
    """
    Возвращает папку для данных приложения.
    
    Windows: C:\\Users\\<user>\\AppData\\Roaming\\UTMka
    macOS: ~/Library/Application Support/UTMka
    Linux: ~/.local/share/UTMka
    Dev: текущая директория (для совместимости)
    """
    # В режиме разработки — текущая директория (для совместимости со старой БД)
    if not is_frozen():
        return Path.cwd()
    
    if sys.platform == 'win32':
        base = Path(os.environ.get('APPDATA', Path.home() / 'AppData' / 'Roaming'))
    elif sys.platform == 'darwin':
        base = Path.home() / 'Library' / 'Application Support'
    else:
        base = Path.home() / '.local' / 'share'
    
    data_dir = base / 'UTMka'
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_db_path() -> Path:
    """Путь к базе данных"""
    # В режиме разработки — utm_data.db в текущей директории
    if not is_frozen():
        return Path.cwd() / 'utm_data.db'
    
    db_dir = get_data_dir() / 'databases'
    db_dir.mkdir(parents=True, exist_ok=True)
    return db_dir / 'utmka.db'


def get_exports_dir() -> Path:
    """Папка для экспорта"""
    exports_dir = get_data_dir() / 'exports'
    exports_dir.mkdir(parents=True, exist_ok=True)
    return exports_dir


def get_downloads_dir() -> Path:
    """Папка для загрузок"""
    downloads_dir = get_data_dir() / 'downloads'
    downloads_dir.mkdir(parents=True, exist_ok=True)
    return downloads_dir


def get_resource_path(relative_path: str) -> Path:
    """Путь к ресурсам (работает и в dev, и в PyInstaller)"""
    if is_frozen():
        base_path = Path(sys._MEIPASS)
    else:
        base_path = Path(__file__).parent.parent.parent
    return base_path / relative_path


class Config:
    """Базовая конфигурация"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{get_db_path()}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'connect_args': {'timeout': 30}
    }


class DesktopConfig(Config):
    """Конфигурация для desktop"""
    DEBUG = False


class DevelopmentConfig(Config):
    """Конфигурация для разработки"""
    DEBUG = True
    SQLALCHEMY_ECHO = False  # True для отладки SQL


class WebConfig(Config):
    """Конфигурация для Web версии"""
    DEBUG = False

    # PostgreSQL
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://localhost/utmka')

    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY')

    # OAuth
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    YANDEX_CLIENT_ID = os.environ.get('YANDEX_CLIENT_ID')
    YANDEX_CLIENT_SECRET = os.environ.get('YANDEX_CLIENT_SECRET')

    # Email (для magic links)
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', '587'))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')

    # Payments
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    YOOKASSA_SHOP_ID = os.environ.get('YOOKASSA_SHOP_ID')
    YOOKASSA_SECRET_KEY = os.environ.get('YOOKASSA_SECRET_KEY')

    # Limits
    FREE_HISTORY_LIMIT = 100
    FREE_TEMPLATES_LIMIT = 10
    PRO_HISTORY_LIMIT = 10000
    PRO_TEMPLATES_LIMIT = 1000


class ProductionConfig(WebConfig):
    """Конфигурация для production"""
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
    }
