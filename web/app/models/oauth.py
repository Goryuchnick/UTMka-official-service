"""
Модель OAuth аккаунта
"""
from datetime import datetime
from ..extensions import db


class OAuthAccount(db.Model):
    """Модель связи пользователя с OAuth провайдером"""
    __tablename__ = 'oauth_accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    provider = db.Column(db.String(50), nullable=False)  # 'yandex', 'vk', 'google'
    provider_user_id = db.Column(db.String(255), nullable=False)
    access_token = db.Column(db.Text)
    refresh_token = db.Column(db.Text)
    token_expires_at = db.Column(db.DateTime)
    provider_data = db.Column(db.JSON)  # Дополнительные данные от провайдера
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Уникальность комбинации провайдера и ID пользователя у провайдера
    __table_args__ = (
        db.UniqueConstraint('provider', 'provider_user_id', name='uq_oauth_provider_user'),
        db.Index('idx_oauth_provider_user', 'provider', 'provider_user_id'),
    )
    
    def to_dict(self) -> dict:
        """Преобразует объект в словарь (без токенов)"""
        return {
            'id': self.id,
            'provider': self.provider,
            'provider_user_id': self.provider_user_id,
            'token_expires_at': self.token_expires_at.isoformat() if self.token_expires_at else None,
            'provider_data': self.provider_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<OAuthAccount user_id={self.user_id} provider={self.provider}>'
