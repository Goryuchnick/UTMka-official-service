"""
Модель истории UTM-меток
"""
from datetime import datetime
from ..extensions import db


class History(db.Model):
    """Модель истории сгенерированных UTM-меток"""
    __tablename__ = 'history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    base_url = db.Column(db.Text, nullable=False)
    full_url = db.Column(db.Text, nullable=False)
    utm_source = db.Column(db.String(255))
    utm_medium = db.Column(db.String(255))
    utm_campaign = db.Column(db.String(255))
    utm_content = db.Column(db.String(255))
    utm_term = db.Column(db.String(255))
    short_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Составной индекс для быстрого поиска по пользователю и дате
    __table_args__ = (
        db.Index('idx_history_user_created', 'user_id', 'created_at'),
    )
    
    def to_dict(self) -> dict:
        """Преобразует объект в словарь"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'base_url': self.base_url,
            'full_url': self.full_url,
            'utm_source': self.utm_source,
            'utm_medium': self.utm_medium,
            'utm_campaign': self.utm_campaign,
            'utm_content': self.utm_content,
            'utm_term': self.utm_term,
            'short_url': self.short_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<History id={self.id} user_id={self.user_id} url={self.base_url[:50]}>'
