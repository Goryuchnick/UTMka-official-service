"""
SQLAlchemy модели

Текущая версия использует user_email для идентификации пользователя.
Модели соответствуют существующей структуре БД в app.py.
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """Модель пользователя"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255))
    
    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'email': self.email,
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
