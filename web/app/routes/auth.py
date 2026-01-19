"""
Роуты авторизации (заглушки для тестирования фронтенда)
Будет полностью реализовано в итерации 4
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    """Заглушка регистрации"""
    data = request.json
    return jsonify({
        'success': True,
        'message': 'Регистрация успешна! Проверьте email для подтверждения.',
        'user': {
            'id': 1,
            'email': data.get('email'),
            'name': data.get('name'),
            'email_verified': False
        }
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Заглушка входа"""
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    # Простая проверка для тестирования
    if email and password:
        # Создаём токены
        access_token = create_access_token(identity=1)
        refresh_token = create_refresh_token(identity=1)
        
        return jsonify({
            'success': True,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 3600,
            'user': {
                'id': 1,
                'email': email,
                'name': 'Test User',
                'subscription': {
                    'plan': 'free',
                    'expires_at': None,
                    'is_active': False
                }
            }
        }), 200
    
    return jsonify({'error': 'Неверный email или пароль'}), 401


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Заглушка выхода"""
    return jsonify({'success': True, 'message': 'Вы вышли из системы'}), 200


@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Заглушка получения текущего пользователя"""
    return jsonify({
        'id': 1,
        'email': 'test@example.com',
        'name': 'Test User',
        'email_verified': True,
        'created_at': '2026-01-19T10:00:00Z',
        'oauth_providers': [],
        'subscription': {
            'plan': 'free',
            'expires_at': None,
            'is_active': False
        }
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """Заглушка обновления токена"""
    data = request.json
    if data.get('refresh_token'):
        access_token = create_access_token(identity=1)
        return jsonify({
            'access_token': access_token,
            'expires_in': 3600
        }), 200
    return jsonify({'error': 'Invalid refresh token'}), 401


@auth_bp.route('/yandex', methods=['GET'])
def yandex_oauth():
    """Заглушка Yandex OAuth"""
    return jsonify({'error': 'Not implemented'}), 501


@auth_bp.route('/vk', methods=['GET'])
def vk_oauth():
    """Заглушка VK OAuth"""
    return jsonify({'error': 'Not implemented'}), 501


@auth_bp.route('/google', methods=['GET'])
def google_oauth():
    """Заглушка Google OAuth"""
    return jsonify({'error': 'Not implemented'}), 501
