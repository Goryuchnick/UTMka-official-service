"""
OAuth провайдеры
"""
from .yandex import YandexOAuth
from .vk import VKOAuth
from .google import GoogleOAuth

__all__ = ['YandexOAuth', 'VKOAuth', 'GoogleOAuth']
