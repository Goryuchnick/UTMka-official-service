"""
Модель шаблона UTM-меток
"""
from datetime import datetime
from ..extensions import db


class Template(db.Model):
    """Модель шаблона UTM-меток"""
    __tablename__ = 'templates'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    utm_source = db.Column(db.String(255))
    utm_medium = db.Column(db.String(255))
    utm_campaign = db.Column(db.String(255))
    utm_content = db.Column(db.String(255))
    utm_term = db.Column(db.String(255))
    tag_name = db.Column(db.String(100))
    tag_color = db.Column(db.String(20))  # HEX цвет, например '#FF5733'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Индекс для поиска по тегу
    __table_args__ = (
        db.Index('idx_templates_user_tag', 'user_id', 'tag_name'),
    )
    
    def to_dict(self) -> dict:
        """Преобразует объект в словарь"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'utm_source': self.utm_source,
            'utm_medium': self.utm_medium,
            'utm_campaign': self.utm_campaign,
            'utm_content': self.utm_content,
            'utm_term': self.utm_term,
            'tag_name': self.tag_name,
            'tag_color': self.tag_color,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Template id={self.id} name={self.name} user_id={self.user_id}>'
