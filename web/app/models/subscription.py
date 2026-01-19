"""
Модель подписки
"""
from datetime import datetime, timedelta
from ..extensions import db


class Subscription(db.Model):
    """Модель подписки пользователя"""
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False, index=True)
    plan = db.Column(db.String(50), nullable=False, default='free')  # 'free', 'trial', 'pro'
    status = db.Column(db.String(50), nullable=False, default='active')  # 'active', 'expired', 'cancelled'
    trial_used = db.Column(db.Boolean, default=False)
    started_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime, index=True)
    auto_renew = db.Column(db.Boolean, default=False)
    cancelled_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def is_active(self) -> bool:
        """Проверяет, активна ли подписка"""
        if self.status != 'active':
            return False
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False
        return True
    
    def activate_trial(self, days: int = 7):
        """Активирует пробный период"""
        self.plan = 'trial'
        self.status = 'active'
        self.trial_used = True
        self.started_at = datetime.utcnow()
        self.expires_at = datetime.utcnow() + timedelta(days=days)
        self.auto_renew = False
    
    def activate_pro(self, months: int = 1):
        """Активирует Pro подписку"""
        self.plan = 'pro'
        self.status = 'active'
        self.started_at = datetime.utcnow()
        self.expires_at = datetime.utcnow() + timedelta(days=months * 30)
        self.auto_renew = True
    
    def cancel(self):
        """Отменяет автопродление"""
        self.auto_renew = False
        self.cancelled_at = datetime.utcnow()
        if self.expires_at and self.expires_at < datetime.utcnow():
            self.status = 'expired'
    
    def to_dict(self) -> dict:
        """Преобразует объект в словарь"""
        return {
            'id': self.id,
            'plan': self.plan,
            'status': self.status,
            'is_active': self.is_active(),
            'trial_used': self.trial_used,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'auto_renew': self.auto_renew,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None
        }
    
    def __repr__(self):
        return f'<Subscription user_id={self.user_id} plan={self.plan} status={self.status}>'
