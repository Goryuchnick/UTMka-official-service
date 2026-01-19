"""
VK OAuth сервис
"""
import requests
from datetime import datetime, timedelta
from flask import current_app
from ..extensions import db
from ...models import User, OAuthAccount, Subscription


class VKOAuth:
    """Сервис для работы с VK OAuth"""
    
    AUTHORIZE_URL = 'https://oauth.vk.com/authorize'
    TOKEN_URL = 'https://oauth.vk.com/access_token'
    API_VERSION = '5.131'  # Версия VK API
    USERINFO_URL = 'https://api.vk.com/method/users.get'
    
    @staticmethod
    def get_authorize_url(state: str) -> str:
        """
        Генерирует URL для редиректа на VK OAuth.
        
        Args:
            state: CSRF токен для защиты от подделки запросов
        
        Returns:
            str: URL для редиректа
        """
        params = {
            'client_id': current_app.config['VK_CLIENT_ID'],
            'redirect_uri': current_app.config['VK_REDIRECT_URI'],
            'response_type': 'code',
            'scope': 'email',  # Запрашиваем email для регистрации
            'state': state,
            'v': VKOAuth.API_VERSION
        }
        
        query_string = '&'.join([f'{k}={v}' for k, v in params.items()])
        return f"{VKOAuth.AUTHORIZE_URL}?{query_string}"
    
    @staticmethod
    def exchange_code_for_token(code: str) -> dict:
        """
        Обменивает authorization code на access token.
        
        Args:
            code: Authorization code от VK
        
        Returns:
            dict: Ответ от VK с токенами и user_id
        
        Raises:
            ValueError: Если обмен не удался
        """
        if not current_app.config.get('VK_CLIENT_ID') or not current_app.config.get('VK_CLIENT_SECRET'):
            raise ValueError('VK OAuth не настроен. Проверьте переменные окружения VK_CLIENT_ID и VK_CLIENT_SECRET')
        
        response = requests.get(
            VKOAuth.TOKEN_URL,
            params={
                'client_id': current_app.config['VK_CLIENT_ID'],
                'client_secret': current_app.config['VK_CLIENT_SECRET'],
                'redirect_uri': current_app.config['VK_REDIRECT_URI'],
                'code': code
            }
        )
        
        if response.status_code != 200:
            error_data = response.json() if response.content else {}
            raise ValueError(f'Не удалось получить токен: {error_data.get("error_description", "Unknown error")}')
        
        data = response.json()
        
        # VK возвращает ошибку в поле 'error' если что-то не так
        if 'error' in data:
            raise ValueError(f'Ошибка VK: {data.get("error_description", data.get("error"))}')
        
        return data
    
    @staticmethod
    def get_user_info(access_token: str, user_id: str = None) -> dict:
        """
        Получает информацию о пользователе от VK.
        
        Args:
            access_token: Access token от VK
            user_id: ID пользователя VK (опционально, если не указан, вернётся текущий пользователь)
        
        Returns:
            dict: Информация о пользователе
        
        Raises:
            ValueError: Если запрос не удался
        """
        params = {
            'access_token': access_token,
            'v': VKOAuth.API_VERSION,
            'fields': 'photo_100,email'  # Запрашиваем дополнительные поля
        }
        
        if user_id:
            params['user_ids'] = user_id
        
        response = requests.get(
            VKOAuth.USERINFO_URL,
            params=params
        )
        
        if response.status_code != 200:
            raise ValueError('Не удалось получить информацию о пользователе')
        
        data = response.json()
        
        # VK API возвращает данные в формате {'response': [{'id': ..., 'first_name': ..., ...}]}
        if 'error' in data:
            raise ValueError(f'Ошибка VK API: {data.get("error", {}).get("error_msg", "Unknown error")}')
        
        if 'response' not in data or not data['response']:
            raise ValueError('Пустой ответ от VK API')
        
        user_data = data['response'][0]
        return user_data
    
    @staticmethod
    def create_or_link_user(provider_data: dict, token_data: dict) -> User:
        """
        Создаёт нового пользователя или связывает OAuth аккаунт с существующим.
        
        Args:
            provider_data: Данные пользователя от VK (из users.get)
            token_data: Данные токена от VK (из access_token, содержит access_token, expires_in, user_id, email)
        
        Returns:
            User: Пользователь (новый или существующий)
        """
        provider_user_id = str(token_data.get('user_id') or provider_data.get('id'))
        access_token = token_data.get('access_token')
        expires_in = token_data.get('expires_in')
        email = token_data.get('email') or provider_data.get('email')
        
        # Формируем имя пользователя
        first_name = provider_data.get('first_name', '')
        last_name = provider_data.get('last_name', '')
        name = f'{first_name} {last_name}'.strip() or email.split('@')[0] if email else 'User'
        
        if not email:
            raise ValueError('Email не найден в данных VK. Убедитесь, что scope "email" запрошен при авторизации.')
        
        # Объединяем данные провайдера
        full_provider_data = {
            **provider_data,
            'email': email,
            'access_token_expires_in': expires_in
        }
        
        # Проверяем, существует ли OAuth аккаунт
        oauth_account = OAuthAccount.query.filter_by(
            provider='vk',
            provider_user_id=provider_user_id
        ).first()
        
        if oauth_account:
            # Обновляем токены
            oauth_account.access_token = access_token
            oauth_account.refresh_token = token_data.get('refresh_token')  # VK может не возвращать refresh_token
            if expires_in:
                oauth_account.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            oauth_account.provider_data = full_provider_data
            oauth_account.updated_at = datetime.utcnow()
            
            db.session.commit()
            return oauth_account.user
        
        # Проверяем, существует ли пользователь с таким email
        user = User.query.filter_by(email=email).first()
        
        if user:
            # Связываем OAuth аккаунт с существующим пользователем
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider='vk',
                provider_user_id=provider_user_id,
                access_token=access_token,
                refresh_token=token_data.get('refresh_token'),
                token_expires_at=datetime.utcnow() + timedelta(seconds=expires_in) if expires_in else None,
                provider_data=full_provider_data
            )
            db.session.add(oauth_account)
        else:
            # Создаём нового пользователя
            user = User(
                email=email,
                name=name,
                email_verified=True,  # VK уже проверил email
                password_hash=None  # OAuth-only пользователь
            )
            db.session.add(user)
            db.session.flush()  # Получаем ID пользователя
            
            # Создаём OAuth аккаунт
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider='vk',
                provider_user_id=provider_user_id,
                access_token=access_token,
                refresh_token=token_data.get('refresh_token'),
                token_expires_at=datetime.utcnow() + timedelta(seconds=expires_in) if expires_in else None,
                provider_data=full_provider_data
            )
            db.session.add(oauth_account)
            
            # Создаём подписку free по умолчанию
            subscription = Subscription(
                user_id=user.id,
                plan='free',
                status='active',
                trial_used=False,
                auto_renew=False
            )
            db.session.add(subscription)
        
        db.session.commit()
        return user
