"""
Декораторы для проверки авторизации и подписки
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from ..models import User


def subscription_required(f):
    """
    Декоратор для эндпоинтов, требующих активную подписку.
    
    Использование:
        @subscription_required
        @jwt_required()
        def my_endpoint():
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Проверяем, что JWT токен валиден
        try:
            verify_jwt_in_request()
        except Exception:
            return jsonify({
                'error': 'Unauthorized',
                'message': 'Требуется авторизация'
            }), 401
        
        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({
                'error': 'Unauthorized',
                'message': 'Требуется авторизация'
            }), 401
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'error': 'User not found',
                'message': 'Пользователь не найден'
            }), 404
        
        # Проверяем подписку
        if not user.subscription or not user.subscription.is_active():
            return jsonify({
                'error': 'Subscription required',
                'message': 'Для доступа к этой функции требуется активная подписка',
                'subscription_required': True
            }), 403
        
        return f(*args, **kwargs)
    return decorated_function
