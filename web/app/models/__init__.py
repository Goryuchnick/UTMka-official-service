"""
Модели базы данных
"""
from .user import User
from .oauth import OAuthAccount
from .subscription import Subscription
from .history import History
from .template import Template
from .payment import Payment

# Экспорт всех моделей для Alembic
__all__ = [
    'User',
    'OAuthAccount',
    'Subscription',
    'History',
    'Template',
    'Payment'
]
