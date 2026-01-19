"""
Модель платежа
"""
from datetime import datetime
from decimal import Decimal
from ..extensions import db


class Payment(db.Model):
    """Модель платежа"""
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    external_id = db.Column(db.String(255), unique=True, nullable=False, index=True)  # ID от платёжной системы
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='RUB', nullable=False)
    status = db.Column(db.String(50), nullable=False, index=True)  # 'pending', 'succeeded', 'failed', 'refunded'
    plan_id = db.Column(db.String(50), nullable=False)  # 'pro_monthly', 'pro_yearly'
    provider = db.Column(db.String(50), nullable=False)  # 'yookassa', 'stripe'
    payment_metadata = db.Column(db.JSON)  # Дополнительные данные от провайдера (переименовано из metadata, т.к. конфликт с SQLAlchemy)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self) -> dict:
        """Преобразует объект в словарь"""
        return {
            'id': self.id,
            'external_id': self.external_id,
            'amount': float(self.amount) if self.amount else None,
            'currency': self.currency,
            'status': self.status,
            'plan_id': self.plan_id,
            'provider': self.provider,
            'metadata': self.payment_metadata,  # Возвращаем как metadata для API совместимости
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Payment id={self.id} external_id={self.external_id} status={self.status}>'
