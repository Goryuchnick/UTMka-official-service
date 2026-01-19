"""
Yandex OAuth сервис
"""
import requests
from datetime import datetime, timedelta
from flask import current_app
from ..extensions import db
from ...models import User, OAuthAccount, Subscription


class YandexOAuth:
    """Сервис для работы с Yandex OAuth"""
    
    AUTHORIZE_URL = 'https://oauth.yandex.ru/authorize'
    TOKEN_URL = 'https://oauth.yandex.ru/token'
    USERINFO_URL = 'https://login.yandex.ru/info'
    
    @staticmethod
    def get_authorize_url(state: str) -> str:
        """
        Генерирует URL для редиректа на Yandex OAuth.
        
        Args:
            state: CSRF токен для защиты от подделки запросов
        
        Returns:
            str: URL для редиректа
        """
        params = {
            'response_type': 'code',
            'client_id': current_app.config['YANDEX_CLIENT_ID'],
            'redirect_uri': current_app.config['YANDEX_REDIRECT_URI'],
            'state': state
        }
        
        query_string = '&'.join([f'{k}={v}' for k, v in params.items()])
        return f"{YandexOAuth.AUTHORIZE_URL}?{query_string}"
    
    @staticmethod
    def exchange_code_for_token(code: str) -> dict:
        """
        Обменивает authorization code на access token.
        
        Args:
            code: Authorization code от Yandex
        
        Returns:
            dict: Ответ от Yandex с токенами
        
        Raises:
            ValueError: Если обмен не удался
        """
        if not current_app.config.get('YANDEX_CLIENT_ID') or not current_app.config.get('YANDEX_CLIENT_SECRET'):
            raise ValueError('Yandex OAuth не настроен. Проверьте переменные окружения YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET')
        
        response = requests.post(
            YandexOAuth.TOKEN_URL,
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'client_id': current_app.config['YANDEX_CLIENT_ID'],
                'client_secret': current_app.config['YANDEX_CLIENT_SECRET']
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        if response.status_code != 200:
            error_data = response.json() if response.content else {}
            raise ValueError(f'Не удалось получить токен: {error_data.get("error_description", "Unknown error")}')
        
        return response.json()
    
    @staticmethod
    def get_user_info(access_token: str) -> dict:
        """
        Получает информацию о пользователе от Yandex.
        
        Args:
            access_token: Access token от Yandex
        
        Returns:
            dict: Информация о пользователе
        
        Raises:
            ValueError: Если запрос не удался
        """
        response = requests.get(
            YandexOAuth.USERINFO_URL,
            headers={'Authorization': f'OAuth {access_token}'}
        )
        
        if response.status_code != 200:
            raise ValueError('Не удалось получить информацию о пользователе')
        
        return response.json()
    
    @staticmethod
    def create_or_link_user(provider_data: dict, access_token: str, refresh_token: str = None, expires_in: int = None) -> User:
        """
        Создаёт нового пользователя или связывает OAuth аккаунт с существующим.
        
        Args:
            provider_data: Данные пользователя от Yandex
            access_token: Access token
            refresh_token: Refresh token (опционально)
            expires_in: Время жизни токена в секундах
        
        Returns:
            User: Пользователь (новый или существующий)
        """
        provider_user_id = str(provider_data.get('id'))
        email = provider_data.get('default_email') or provider_data.get('emails', [None])[0]
        name = provider_data.get('real_name') or provider_data.get('first_name', '') + ' ' + provider_data.get('last_name', '')
        name = name.strip() or email.split('@')[0] if email else 'User'
        
        if not email:
            raise ValueError('Email не найден в данных Yandex')
        
        # Проверяем, существует ли OAuth аккаунт
        oauth_account = OAuthAccount.query.filter_by(
            provider='yandex',
            provider_user_id=provider_user_id
        ).first()
        
        if oauth_account:
            # Обновляем токены
            oauth_account.access_token = access_token
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
                provider='yandex',
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
                email_verified=True,  # Yandex уже проверил email
                password_hash=None  # OAuth-only пользователь
            )
            db.session.add(user)
            db.session.flush()  # Получаем ID пользователя
            
            # Создаём OAuth аккаунт
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider='yandex',
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
