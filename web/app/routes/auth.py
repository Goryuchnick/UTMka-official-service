"""
Роуты авторизации
"""
import secrets
from flask import Blueprint, jsonify, request, current_app, session, redirect, url_for
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
from ..services.oauth import YandexOAuth, VKOAuth, GoogleOAuth
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


# OAuth роуты
@auth_bp.route('/yandex', methods=['GET'])
def yandex_oauth():
    """
    Инициация Yandex OAuth авторизации.
    Редиректит пользователя на страницу авторизации Yandex.
    """
    # Проверяем, настроен ли Yandex OAuth
    if not current_app.config.get('YANDEX_CLIENT_ID') or not current_app.config.get('YANDEX_CLIENT_SECRET'):
        return jsonify({
            'error': 'OAuth not configured',
            'message': 'Yandex OAuth не настроен. Проверьте переменные окружения.'
        }), 500
    
    # Генерируем state токен для защиты от CSRF
    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state
    session['oauth_provider'] = 'yandex'
    
    # Получаем URL для редиректа
    authorize_url = YandexOAuth.get_authorize_url(state)
    
    # Редиректим на Yandex
    return redirect(authorize_url)


@auth_bp.route('/yandex/callback', methods=['GET'])
def yandex_oauth_callback():
    """
    Callback для Yandex OAuth.
    Обрабатывает ответ от Yandex и создаёт/авторизует пользователя.
    """
    # Проверяем state для защиты от CSRF
    state = request.args.get('state')
    stored_state = session.get('oauth_state')
    stored_provider = session.get('oauth_provider')
    
    if not state or state != stored_state or stored_provider != 'yandex':
        return jsonify({
            'error': 'Invalid state',
            'message': 'Неверный state токен. Возможна попытка CSRF атаки.'
        }), 400
    
    # Очищаем state из сессии
    session.pop('oauth_state', None)
    session.pop('oauth_provider', None)
    
    # Получаем authorization code
    code = request.args.get('code')
    error = request.args.get('error')
    
    if error:
        return jsonify({
            'error': 'OAuth error',
            'message': f'Ошибка авторизации: {error}'
        }), 400
    
    if not code:
        return jsonify({
            'error': 'Missing code',
            'message': 'Authorization code не получен'
        }), 400
    
    try:
        # Обмениваем code на токен
        token_data = YandexOAuth.exchange_code_for_token(code)
        access_token = token_data.get('access_token')
        refresh_token = token_data.get('refresh_token')
        expires_in = token_data.get('expires_in')
        
        if not access_token:
            raise ValueError('Access token не получен')
        
        # Получаем информацию о пользователе
        user_info = YandexOAuth.get_user_info(access_token)
        
        # Создаём или связываем пользователя
        user = YandexOAuth.create_or_link_user(
            provider_data=user_info,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in
        )
        
        # Создаём JWT токены
        jwt_access_token = create_access_token(identity=user.id)
        jwt_refresh_token = create_refresh_token(identity=user.id)
        
        # Возвращаем HTML страницу, которая устанавливает токены и редиректит
        # Это безопаснее, чем передавать токены в URL
        frontend_url = current_app.config.get('FRONTEND_URL', '/')
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Авторизация успешна</title>
            <meta charset="UTF-8">
        </head>
        <body>
            <script>
                // Устанавливаем токены в localStorage
                localStorage.setItem('access_token', '{jwt_access_token}');
                localStorage.setItem('refresh_token', '{jwt_refresh_token}');
                
                // Получаем информацию о пользователе
                fetch('/auth/me', {{
                    headers: {{
                        'Authorization': 'Bearer {jwt_access_token}'
                    }}
                }})
                .then(response => response.json())
                .then(userData => {{
                    localStorage.setItem('user_data', JSON.stringify(userData));
                    // Редиректим на главную страницу
                    window.location.href = '{frontend_url}';
                }})
                .catch(error => {{
                    console.error('Error fetching user data:', error);
                    window.location.href = '{frontend_url}';
                }});
            </script>
            <p>Авторизация успешна! Перенаправление...</p>
        </body>
        </html>
        """
        return html
        
    except ValueError as e:
        current_app.logger.error(f'Yandex OAuth error: {e}')
        return jsonify({
            'error': 'OAuth failed',
            'message': str(e)
        }), 400
    except Exception as e:
        current_app.logger.error(f'Yandex OAuth unexpected error: {e}', exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': 'Произошла ошибка при авторизации через Yandex'
        }), 500


@auth_bp.route('/vk', methods=['GET'])
def vk_oauth():
    """
    Инициация VK OAuth авторизации.
    Редиректит пользователя на страницу авторизации VK.
    """
    # Проверяем, настроен ли VK OAuth
    if not current_app.config.get('VK_CLIENT_ID') or not current_app.config.get('VK_CLIENT_SECRET'):
        return jsonify({
            'error': 'OAuth not configured',
            'message': 'VK OAuth не настроен. Проверьте переменные окружения.'
        }), 500
    
    # Генерируем state токен для защиты от CSRF
    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state
    session['oauth_provider'] = 'vk'
    
    # Получаем URL для редиректа
    authorize_url = VKOAuth.get_authorize_url(state)
    
    # Редиректим на VK
    return redirect(authorize_url)


@auth_bp.route('/vk/callback', methods=['GET'])
def vk_oauth_callback():
    """
    Callback для VK OAuth.
    Обрабатывает ответ от VK и создаёт/авторизует пользователя.
    """
    # Проверяем state для защиты от CSRF
    state = request.args.get('state')
    stored_state = session.get('oauth_state')
    stored_provider = session.get('oauth_provider')
    
    if not state or state != stored_state or stored_provider != 'vk':
        return jsonify({
            'error': 'Invalid state',
            'message': 'Неверный state токен. Возможна попытка CSRF атаки.'
        }), 400
    
    # Очищаем state из сессии
    session.pop('oauth_state', None)
    session.pop('oauth_provider', None)
    
    # Получаем authorization code
    code = request.args.get('code')
    error = request.args.get('error')
    
    if error:
        return jsonify({
            'error': 'OAuth error',
            'message': f'Ошибка авторизации: {error}'
        }), 400
    
    if not code:
        return jsonify({
            'error': 'Missing code',
            'message': 'Authorization code не получен'
        }), 400
    
    try:
        # Обмениваем code на токен
        token_data = VKOAuth.exchange_code_for_token(code)
        access_token = token_data.get('access_token')
        user_id = token_data.get('user_id')
        
        if not access_token:
            raise ValueError('Access token не получен')
        
        if not user_id:
            raise ValueError('User ID не получен')
        
        # Получаем информацию о пользователе
        user_info = VKOAuth.get_user_info(access_token, str(user_id))
        
        # Создаём или связываем пользователя
        user = VKOAuth.create_or_link_user(
            provider_data=user_info,
            token_data=token_data
        )
        
        # Создаём JWT токены
        jwt_access_token = create_access_token(identity=user.id)
        jwt_refresh_token = create_refresh_token(identity=user.id)
        
        # Возвращаем HTML страницу, которая устанавливает токены и редиректит
        # Это безопаснее, чем передавать токены в URL
        frontend_url = current_app.config.get('FRONTEND_URL', '/')
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Авторизация успешна</title>
            <meta charset="UTF-8">
        </head>
        <body>
            <script>
                // Устанавливаем токены в localStorage
                localStorage.setItem('access_token', '{jwt_access_token}');
                localStorage.setItem('refresh_token', '{jwt_refresh_token}');
                
                // Получаем информацию о пользователе
                fetch('/auth/me', {{
                    headers: {{
                        'Authorization': 'Bearer {jwt_access_token}'
                    }}
                }})
                .then(response => response.json())
                .then(userData => {{
                    localStorage.setItem('user_data', JSON.stringify(userData));
                    // Редиректим на главную страницу
                    window.location.href = '{frontend_url}';
                }})
                .catch(error => {{
                    console.error('Error fetching user data:', error);
                    window.location.href = '{frontend_url}';
                }});
            </script>
            <p>Авторизация успешна! Перенаправление...</p>
        </body>
        </html>
        """
        return html
        
    except ValueError as e:
        current_app.logger.error(f'VK OAuth error: {e}')
        return jsonify({
            'error': 'OAuth failed',
            'message': str(e)
        }), 400
    except Exception as e:
        current_app.logger.error(f'VK OAuth unexpected error: {e}', exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': 'Произошла ошибка при авторизации через VK'
        }), 500


@auth_bp.route('/google', methods=['GET'])
def google_oauth():
    """
    Инициация Google OAuth авторизации.
    Редиректит пользователя на страницу авторизации Google.
    """
    # Проверяем, настроен ли Google OAuth
    if not current_app.config.get('GOOGLE_CLIENT_ID') or not current_app.config.get('GOOGLE_CLIENT_SECRET'):
        return jsonify({
            'error': 'OAuth not configured',
            'message': 'Google OAuth не настроен. Проверьте переменные окружения.'
        }), 500
    
    # Генерируем state токен для защиты от CSRF
    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state
    session['oauth_provider'] = 'google'
    
    # Получаем URL для редиректа
    authorize_url = GoogleOAuth.get_authorize_url(state)
    
    # Редиректим на Google
    return redirect(authorize_url)


@auth_bp.route('/google/callback', methods=['GET'])
def google_oauth_callback():
    """
    Callback для Google OAuth.
    Обрабатывает ответ от Google и создаёт/авторизует пользователя.
    """
    # Проверяем state для защиты от CSRF
    state = request.args.get('state')
    stored_state = session.get('oauth_state')
    stored_provider = session.get('oauth_provider')
    
    if not state or state != stored_state or stored_provider != 'google':
        return jsonify({
            'error': 'Invalid state',
            'message': 'Неверный state токен. Возможна попытка CSRF атаки.'
        }), 400
    
    # Очищаем state из сессии
    session.pop('oauth_state', None)
    session.pop('oauth_provider', None)
    
    # Получаем authorization code
    code = request.args.get('code')
    error = request.args.get('error')
    
    if error:
        return jsonify({
            'error': 'OAuth error',
            'message': f'Ошибка авторизации: {error}'
        }), 400
    
    if not code:
        return jsonify({
            'error': 'Missing code',
            'message': 'Authorization code не получен'
        }), 400
    
    try:
        # Обмениваем code на токен
        token_data = GoogleOAuth.exchange_code_for_token(code)
        access_token = token_data.get('access_token')
        refresh_token = token_data.get('refresh_token')
        expires_in = token_data.get('expires_in')
        
        if not access_token:
            raise ValueError('Access token не получен')
        
        # Получаем информацию о пользователе
        user_info = GoogleOAuth.get_user_info(access_token)
        
        # Создаём или связываем пользователя
        user = GoogleOAuth.create_or_link_user(
            provider_data=user_info,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in
        )
        
        # Создаём JWT токены
        jwt_access_token = create_access_token(identity=user.id)
        jwt_refresh_token = create_refresh_token(identity=user.id)
        
        # Возвращаем HTML страницу, которая устанавливает токены и редиректит
        # Это безопаснее, чем передавать токены в URL
        frontend_url = current_app.config.get('FRONTEND_URL', '/')
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Авторизация успешна</title>
            <meta charset="UTF-8">
        </head>
        <body>
            <script>
                // Устанавливаем токены в localStorage
                localStorage.setItem('access_token', '{jwt_access_token}');
                localStorage.setItem('refresh_token', '{jwt_refresh_token}');
                
                // Получаем информацию о пользователе
                fetch('/auth/me', {{
                    headers: {{
                        'Authorization': 'Bearer {jwt_access_token}'
                    }}
                }})
                .then(response => response.json())
                .then(userData => {{
                    localStorage.setItem('user_data', JSON.stringify(userData));
                    // Редиректим на главную страницу
                    window.location.href = '{frontend_url}';
                }})
                .catch(error => {{
                    console.error('Error fetching user data:', error);
                    window.location.href = '{frontend_url}';
                }});
            </script>
            <p>Авторизация успешна! Перенаправление...</p>
        </body>
        </html>
        """
        return html
        
    except ValueError as e:
        current_app.logger.error(f'Google OAuth error: {e}')
        return jsonify({
            'error': 'OAuth failed',
            'message': str(e)
        }), 400
    except Exception as e:
        current_app.logger.error(f'Google OAuth unexpected error: {e}', exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': 'Произошла ошибка при авторизации через Google'
        }), 500
