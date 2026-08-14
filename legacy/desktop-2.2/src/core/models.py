"""
SQLAlchemy модели

Desktop версия использует user_email для идентификации пользователя.
Web версия (будущее) будет использовать user_id с FK.
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """Модель пользователя с поддержкой OAuth"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255))

    # OAuth providers
    google_id = db.Column(db.String(255), unique=True, nullable=True, index=True)
    yandex_id = db.Column(db.String(255), unique=True, nullable=True, index=True)

    # Profile
    name = db.Column(db.String(255))
    avatar_url = db.Column(db.String(500))

    # Subscription
    subscription_type = db.Column(db.String(50), default='free')
    subscription_expires_at = db.Column(db.DateTime, nullable=True)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    @property
    def is_premium(self) -> bool:
        """Проверяет, есть ли активная подписка"""
        if self.subscription_type == 'free':
            return False
        if self.subscription_expires_at is None:
            return False
        return self.subscription_expires_at > datetime.utcnow()

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'avatar_url': self.avatar_url,
            'subscription_type': self.subscription_type,
            'is_premium': self.is_premium,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class History(db.Model):
    """История UTM-ссылок (соответствует таблице history_new)"""
    __tablename__ = 'history_new'
    
    id = db.Column(db.Integer, primary_key=True)
    user_email = db.Column(db.String(255), nullable=False, index=True)
    base_url = db.Column(db.String(2000), nullable=False)
    full_url = db.Column(db.String(4000), nullable=False)
    utm_source = db.Column(db.String(255))
    utm_medium = db.Column(db.String(255))
    utm_campaign = db.Column(db.String(255))
    utm_content = db.Column(db.String(255))
    utm_term = db.Column(db.String(255))
    short_url = db.Column(db.String(500))
    tag_name = db.Column(db.String(100))
    tag_color = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_email': self.user_email,
            'base_url': self.base_url,
            'full_url': self.full_url,
            'utm_source': self.utm_source,
            'utm_medium': self.utm_medium,
            'utm_campaign': self.utm_campaign,
            'utm_content': self.utm_content,
            'utm_term': self.utm_term,
            'short_url': self.short_url,
            'tag_name': self.tag_name,
            'tag_color': self.tag_color,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Template(db.Model):
    """Шаблоны UTM"""
    __tablename__ = 'templates'
    
    id = db.Column(db.Integer, primary_key=True)
    user_email = db.Column(db.String(255), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    utm_source = db.Column(db.String(255))
    utm_medium = db.Column(db.String(255))
    utm_campaign = db.Column(db.String(255))
    utm_content = db.Column(db.String(255))
    utm_term = db.Column(db.String(255))
    tag_name = db.Column(db.String(100))
    tag_color = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_email': self.user_email,
            'name': self.name,
            'utm_source': self.utm_source,
            'utm_medium': self.utm_medium,
            'utm_campaign': self.utm_campaign,
            'utm_content': self.utm_content,
            'utm_term': self.utm_term,
            'tag_name': self.tag_name,
            'tag_color': self.tag_color,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Subscription(db.Model):
    """История подписок пользователя"""
    __tablename__ = 'subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # План
    plan_type = db.Column(db.String(50), nullable=False)  # pro, enterprise

    # Период
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)

    # Платёж
    payment_provider = db.Column(db.String(50))  # stripe, yookassa
    payment_id = db.Column(db.String(255))
    amount = db.Column(db.Integer)  # в копейках/центах
    currency = db.Column(db.String(3), default='RUB')

    # Статус
    status = db.Column(db.String(50), default='active')  # active, cancelled, expired
    cancelled_at = db.Column(db.DateTime, nullable=True)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    user = db.relationship('User', backref=db.backref('subscriptions', lazy='dynamic'))

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'plan_type': self.plan_type,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'status': self.status,
            'amount': self.amount,
            'currency': self.currency
        }
