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
