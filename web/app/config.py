"""
Конфигурация приложения из переменных окружения
"""
import os
from datetime import timedelta


class Config:
    """Базовая конфигурация"""
    
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///utmka_dev.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 3600)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(seconds=int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES', 2592000)))
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_COOKIE_SECURE = os.environ.get('FLASK_ENV') == 'production'
    JWT_COOKIE_CSRF_PROTECT = True
    
    # OAuth: Yandex
    YANDEX_CLIENT_ID = os.environ.get('YANDEX_CLIENT_ID')
    YANDEX_CLIENT_SECRET = os.environ.get('YANDEX_CLIENT_SECRET')
    YANDEX_REDIRECT_URI = os.environ.get('YANDEX_REDIRECT_URI', 'http://localhost:5000/auth/yandex/callback')
    
    # OAuth: VK
    VK_CLIENT_ID = os.environ.get('VK_CLIENT_ID')
    VK_CLIENT_SECRET = os.environ.get('VK_CLIENT_SECRET')
    VK_REDIRECT_URI = os.environ.get('VK_REDIRECT_URI', 'http://localhost:5000/auth/vk/callback')
    
    # OAuth: Google
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:5000/auth/google/callback')
    
    # Payment: YooKassa
    YOOKASSA_SHOP_ID = os.environ.get('YOOKASSA_SHOP_ID')
    YOOKASSA_SECRET_KEY = os.environ.get('YOOKASSA_SECRET_KEY')
    YOOKASSA_RETURN_URL = os.environ.get('YOOKASSA_RETURN_URL', 'http://localhost:5000/payment/success')
    
    # Email (опционально)
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@utmka.ru')
    
    # Redis (опционально)
    REDIS_URL = os.environ.get('REDIS_URL')
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')


class DevelopmentConfig(Config):
    """Конфигурация для разработки"""
    DEBUG = True
    SQLALCHEMY_ECHO = True


class ProductionConfig(Config):
    """Конфигурация для production"""
    DEBUG = False
    SQLALCHEMY_ECHO = False
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_HTTPONLY = True


class TestingConfig(Config):
    """Конфигурация для тестирования"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=60)


# Словарь конфигураций
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
