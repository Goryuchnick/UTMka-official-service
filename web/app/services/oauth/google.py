"""
Google OAuth сервис
"""
import requests
from datetime import datetime, timedelta
from flask import current_app
from ..extensions import db
from ...models import User, OAuthAccount, Subscription


class GoogleOAuth:
    """Сервис для работы с Google OAuth"""
    
    AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
    TOKEN_URL = 'https://oauth2.googleapis.com/token'
    USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
    
    @staticmethod
    def get_authorize_url(state: str) -> str:
        """
        Генерирует URL для редиректа на Google OAuth.
        
        Args:
            state: CSRF токен для защиты от подделки запросов
        
        Returns:
            str: URL для редиректа
        """
        params = {
            'client_id': current_app.config['GOOGLE_CLIENT_ID'],
            'redirect_uri': current_app.config['GOOGLE_REDIRECT_URI'],
            'response_type': 'code',
            'scope': 'openid email profile',  # Запрашиваем email и профиль
            'state': state,
            'access_type': 'offline',  # Для получения refresh_token
            'prompt': 'consent'  # Всегда запрашивать согласие для получения refresh_token
        }
        
        query_string = '&'.join([f'{k}={requests.utils.quote(str(v))}' for k, v in params.items()])
        return f"{GoogleOAuth.AUTHORIZE_URL}?{query_string}"
    
    @staticmethod
    def exchange_code_for_token(code: str) -> dict:
        """
        Обменивает authorization code на access token.
        
        Args:
            code: Authorization code от Google
        
        Returns:
            dict: Ответ от Google с токенами
        
        Raises:
            ValueError: Если обмен не удался
        """
        if not current_app.config.get('GOOGLE_CLIENT_ID') or not current_app.config.get('GOOGLE_CLIENT_SECRET'):
            raise ValueError('Google OAuth не настроен. Проверьте переменные окружения GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET')
        
        response = requests.post(
            GoogleOAuth.TOKEN_URL,
            data={
                'code': code,
                'client_id': current_app.config['GOOGLE_CLIENT_ID'],
                'client_secret': current_app.config['GOOGLE_CLIENT_SECRET'],
                'redirect_uri': current_app.config['GOOGLE_REDIRECT_URI'],
                'grant_type': 'authorization_code'
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        if response.status_code != 200:
            error_data = response.json() if response.content else {}
            error_description = error_data.get('error_description', error_data.get('error', 'Unknown error'))
            raise ValueError(f'Не удалось получить токен: {error_description}')
        
        return response.json()
    
    @staticmethod
    def get_user_info(access_token: str) -> dict:
        """
        Получает информацию о пользователе от Google.
        
        Args:
            access_token: Access token от Google
        
        Returns:
            dict: Информация о пользователе
        
        Raises:
            ValueError: Если запрос не удался
        """
        response = requests.get(
            GoogleOAuth.USERINFO_URL,
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if response.status_code != 200:
            error_data = response.json() if response.content else {}
            error_description = error_data.get('error_description', error_data.get('error', 'Unknown error'))
            raise ValueError(f'Не удалось получить информацию о пользователе: {error_description}')
        
        return response.json()
    
    @staticmethod
    def create_or_link_user(provider_data: dict, access_token: str, refresh_token: str = None, expires_in: int = None) -> User:
        """
        Создаёт нового пользователя или связывает OAuth аккаунт с существующим.
        
        Args:
            provider_data: Данные пользователя от Google
            access_token: Access token
            refresh_token: Refresh token (опционально)
            expires_in: Время жизни токена в секундах
        
        Returns:
            User: Пользователь (новый или существующий)
        """
        provider_user_id = str(provider_data.get('id') or provider_data.get('sub'))  # Google использует 'sub' в OpenID Connect
        email = provider_data.get('email')
        name = provider_data.get('name') or f"{provider_data.get('given_name', '')} {provider_data.get('family_name', '')}".strip()
        name = name or email.split('@')[0] if email else 'User'
        
        if not email:
            raise ValueError('Email не найден в данных Google')
        
        # Проверяем, существует ли OAuth аккаунт
        oauth_account = OAuthAccount.query.filter_by(
            provider='google',
            provider_user_id=provider_user_id
        ).first()
        
        if oauth_account:
            # Обновляем токены
            oauth_account.access_token = access_token
            if refresh_token:
                oauth_account.refresh_token = refresh_token
            if expires_in:
                oauth_account.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            oauth_account.provider_data = provider_data
            oauth_account.updated_at = datetime.utcnow()
            
            db.session.commit()
            return oauth_account.user
        
        # Проверяем, существует ли пользователь с таким email
        user = User.query.filter_by(email=email).first()
        
        if user:
            # Связываем OAuth аккаунт с существующим пользователем
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider='google',
                provider_user_id=provider_user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                token_expires_at=datetime.utcnow() + timedelta(seconds=expires_in) if expires_in else None,
                provider_data=provider_data
            )
            db.session.add(oauth_account)
        else:
            # Создаём нового пользователя
            user = User(
                email=email,
                name=name,
                email_verified=provider_data.get('verified_email', True),  # Google проверяет email
                password_hash=None  # OAuth-only пользователь
            )
            db.session.add(user)
            db.session.flush()  # Получаем ID пользователя
            
            # Создаём OAuth аккаунт
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider='google',
                provider_user_id=provider_user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                token_expires_at=datetime.utcnow() + timedelta(seconds=expires_in) if expires_in else None,
                provider_data=provider_data
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
