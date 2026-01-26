"""
Конфигурация приложения
"""
import os
import sys
from pathlib import Path


def get_data_dir() -> Path:
    """
    Возвращает папку для данных приложения.
    
    Windows: C:\\Users\\<user>\\AppData\\Roaming\\UTMka
    macOS: ~/Library/Application Support/UTMka
    Linux: ~/.local/share/UTMka
    """
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


class Config:
    """Базовая конфигурация"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{get_db_path()}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DesktopConfig(Config):
    """Конфигурация для desktop"""
    DEBUG = False


class DevelopmentConfig(Config):
    """Конфигурация для разработки"""
    DEBUG = True
    SQLALCHEMY_ECHO = True
