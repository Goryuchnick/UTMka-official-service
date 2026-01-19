"""
Модель пользователя
"""
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from ..extensions import db


class User(db.Model):
    """Модель пользователя"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255))  # NULL если регистрация через OAuth
    name = db.Column(db.String(255))
    email_verified = db.Column(db.Boolean, default=False)
    email_verification_token = db.Column(db.String(255), index=True)
    password_reset_token = db.Column(db.String(255))
    password_reset_expires = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    subscription = db.relationship('Subscription', backref='user', uselist=False, cascade='all, delete-orphan')
    history = db.relationship('History', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    templates = db.relationship('Template', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    oauth_accounts = db.relationship('OAuthAccount', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    payments = db.relationship('Payment', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password: str):
        """Устанавливает хеш пароля"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        """Проверяет пароль"""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    def has_password(self) -> bool:
        """Проверяет, есть ли у пользователя пароль (не OAuth-only)"""
        return self.password_hash is not None
    
    def to_dict(self, include_subscription: bool = True) -> dict:
        """Преобразует объект в словарь"""
        data = {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'email_verified': self.email_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'oauth_providers': [acc.provider for acc in self.oauth_accounts.all()]
        }
        
        if include_subscription and self.subscription:
            data['subscription'] = self.subscription.to_dict()
        
        return data
    
    def __repr__(self):
        return f'<User {self.email}>'
