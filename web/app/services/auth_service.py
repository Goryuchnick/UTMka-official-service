"""
Сервис авторизации
"""
from datetime import datetime
from ..extensions import db
from ..models import User, Subscription


class AuthService:
    """Сервис для работы с авторизацией"""
    
    @staticmethod
    def register_user(email: str, password: str, name: str = None) -> User:
        """
        Регистрирует нового пользователя.
        
        Args:
            email: Email пользователя
            password: Пароль
            name: Имя пользователя (опционально)
        
        Returns:
            User: Созданный пользователь
        
        Raises:
            ValueError: Если email уже зарегистрирован
        """
        # Проверяем, существует ли пользователь
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            raise ValueError('Email уже зарегистрирован')
        
        # Создаём нового пользователя
        user = User(
            email=email,
            name=name or email.split('@')[0],
            email_verified=False  # В будущем добавим подтверждение email
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.flush()  # Получаем ID пользователя
        
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
    
    @staticmethod
    def authenticate_user(email: str, password: str) -> User:
        """
        Аутентифицирует пользователя по email и паролю.
        
        Args:
            email: Email пользователя
            password: Пароль
        
        Returns:
            User: Пользователь, если аутентификация успешна
        
        Raises:
            ValueError: Если email или пароль неверны
        """
        user = User.query.filter_by(email=email).first()
        
        if not user:
            raise ValueError('Неверный email или пароль')
        
        if not user.has_password():
            raise ValueError('Этот аккаунт зарегистрирован через социальную сеть. Используйте вход через OAuth')
        
        if not user.check_password(password):
            raise ValueError('Неверный email или пароль')
        
        return user
    
    @staticmethod
    def get_user_by_id(user_id: int) -> User:
        """
        Получает пользователя по ID.
        
        Args:
            user_id: ID пользователя
        
        Returns:
            User: Пользователь или None
        """
        return User.query.get(user_id)
    
    @staticmethod
    def get_user_by_email(email: str) -> User:
        """
        Получает пользователя по email.
        
        Args:
            email: Email пользователя
        
        Returns:
            User: Пользователь или None
        """
        return User.query.filter_by(email=email).first()
