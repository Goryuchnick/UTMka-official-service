"""
Роуты авторизации
"""
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import (
    create_access_token, 
    create_refresh_token, 
    get_jwt_identity,
    jwt_required,
    get_jwt
)
from ..extensions import db
from ..models import User
from ..services.auth_service import AuthService
from marshmallow import Schema, fields, ValidationError, validate


# Схемы валидации
class RegisterSchema(Schema):
    email = fields.Email(required=True, validate=validate.Length(min=5, max=255))
    password = fields.Str(required=True, validate=validate.Length(min=6, max=100))
    name = fields.Str(validate=validate.Length(max=255))


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)


class RefreshSchema(Schema):
    refresh_token = fields.Str(required=True)


auth_bp = Blueprint('auth', __name__, url_prefix='/auth')
register_schema = RegisterSchema()
login_schema = LoginSchema()
refresh_schema = RefreshSchema()


@auth_bp.route('/register', methods=['POST'])
def register():
    """Регистрация нового пользователя"""
    try:
        # Валидация данных
        data = register_schema.load(request.json)
    except ValidationError as err:
        return jsonify({
            'error': 'Validation error',
            'message': 'Неверные данные',
            'errors': err.messages
        }), 400
    
    try:
        # Регистрация пользователя
        user = AuthService.register_user(
            email=data['email'],
            password=data['password'],
            name=data.get('name')
        )
        
        # Создаём токены
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'success': True,
            'message': 'Регистрация успешна!',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 3600,
            'user': user.to_dict(include_subscription=True)
        }), 201
        
    except ValueError as e:
        return jsonify({
            'error': 'Registration failed',
            'message': str(e)
        }), 409
    except Exception as e:
        current_app.logger.error(f'Registration error: {e}')
        return jsonify({
            'error': 'Internal server error',
            'message': 'Произошла ошибка при регистрации'
        }), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Авторизация пользователя"""
    try:
        # Валидация данных
        data = login_schema.load(request.json)
    except ValidationError as err:
        return jsonify({
            'error': 'Validation error',
            'message': 'Неверные данные',
            'errors': err.messages
        }), 400
    
    try:
        # Аутентификация
        user = AuthService.authenticate_user(
            email=data['email'],
            password=data['password']
        )
        
        # Создаём токены
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'success': True,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 3600,
            'user': user.to_dict(include_subscription=True)
        }), 200
        
    except ValueError as e:
        return jsonify({
            'error': 'Authentication failed',
            'message': str(e)
        }), 401
    except Exception as e:
        current_app.logger.error(f'Login error: {e}')
        return jsonify({
            'error': 'Internal server error',
            'message': 'Произошла ошибка при авторизации'
        }), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Выход из системы"""
    # В будущем можно добавить blacklist токенов
    # Пока просто возвращаем успех
    return jsonify({
        'success': True,
        'message': 'Вы вышли из системы'
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Получение информации о текущем пользователе"""
    user_id = get_jwt_identity()
    user = AuthService.get_user_by_id(user_id)
    
    if not user:
        return jsonify({
            'error': 'User not found',
            'message': 'Пользователь не найден'
        }), 404
    
    return jsonify(user.to_dict(include_subscription=True)), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Обновление access токена"""
    user_id = get_jwt_identity()
    user = AuthService.get_user_by_id(user_id)
    
    if not user:
        return jsonify({
            'error': 'Invalid token',
            'message': 'Неверный токен'
        }), 401
    
    # Создаём новый access токен
    access_token = create_access_token(identity=user_id)
    
    return jsonify({
        'access_token': access_token,
        'expires_in': 3600
    }), 200


# OAuth роуты (заглушки, будут реализованы в итерациях 5-7)
@auth_bp.route('/yandex', methods=['GET'])
def yandex_oauth():
    """Yandex OAuth (будет реализовано в итерации 5)"""
    return jsonify({'error': 'Not implemented'}), 501


@auth_bp.route('/vk', methods=['GET'])
def vk_oauth():
    """VK OAuth (будет реализовано в итерации 6)"""
    return jsonify({'error': 'Not implemented'}), 501


@auth_bp.route('/google', methods=['GET'])
def google_oauth():
    """Google OAuth (будет реализовано в итерации 7)"""
    return jsonify({'error': 'Not implemented'}), 501
