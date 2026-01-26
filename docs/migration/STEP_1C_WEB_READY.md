# Этап 1C: Подготовка к Web версии

## Цель

Расширить модели и конфигурацию для поддержки Web-версии с OAuth и подписками.

## Время: 2-4 часа

## Статус: ⏳ Ожидает (после STEP_1B)

## Предусловия

- [x] STEP_1 выполнен
- [ ] STEP_1B выполнен (SQLAlchemy интеграция)

---

## Обзор изменений

### Что добавляем:

1. **User модель** — OAuth поля (Google, Яндекс, Email)
2. **Subscription модель** — подписки пользователей
3. **WebConfig** — конфигурация для PostgreSQL
4. **Foreign Keys** — связь user_id вместо user_email (опционально, с миграцией)

---

## Шаг 1C.1: Расширить модель User

```python
# src/core/models.py

class User(db.Model):
    """Модель пользователя с поддержкой OAuth"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255))  # Для email auth
    
    # OAuth providers
    google_id = db.Column(db.String(255), unique=True, nullable=True, index=True)
    yandex_id = db.Column(db.String(255), unique=True, nullable=True, index=True)
    
    # Profile
    name = db.Column(db.String(255))
    avatar_url = db.Column(db.String(500))
    
    # Subscription
    subscription_type = db.Column(db.String(50), default='free')  # free, pro, enterprise
    subscription_expires_at = db.Column(db.DateTime, nullable=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships (для будущей миграции на user_id)
    # history = db.relationship('History', backref='user', lazy='dynamic')
    # templates = db.relationship('Template', backref='user', lazy='dynamic')
    
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
```

---

## Шаг 1C.2: Добавить модель Subscription

```python
# src/core/models.py

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
    payment_provider = db.Column(db.String(50))  # stripe, yookassa, etc
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
```

---

## Шаг 1C.3: Добавить WebConfig

```python
# src/core/config.py

import os

class WebConfig(Config):
    """Конфигурация для Web версии"""
    DEBUG = False
    
    # PostgreSQL
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://localhost/utmka')
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY')  # Обязательно из env!
    
    # OAuth
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    YANDEX_CLIENT_ID = os.environ.get('YANDEX_CLIENT_ID')
    YANDEX_CLIENT_SECRET = os.environ.get('YANDEX_CLIENT_SECRET')
    
    # Email (для magic links)
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    
    # Payments
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    YOOKASSA_SHOP_ID = os.environ.get('YOOKASSA_SHOP_ID')
    YOOKASSA_SECRET_KEY = os.environ.get('YOOKASSA_SECRET_KEY')
    
    # Limits
    FREE_HISTORY_LIMIT = 100
    FREE_TEMPLATES_LIMIT = 10
    PRO_HISTORY_LIMIT = 10000
    PRO_TEMPLATES_LIMIT = 1000


class ProductionConfig(WebConfig):
    """Конфигурация для production"""
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
    }
```

---

## Шаг 1C.4: Обновить create_app()

```python
# src/api/__init__.py

def create_app(config_name: str = 'development') -> Flask:
    """
    Фабрика приложений Flask
    
    config_name: 'development', 'desktop', 'web', 'production'
    """
    # ... existing code ...
    
    configs = {
        'development': DevelopmentConfig,
        'desktop': DesktopConfig,
        'web': WebConfig,
        'production': ProductionConfig,
        'default': Config
    }
    
    # ... rest of code ...
```

---

## Шаг 1C.5: Добавить auth routes (заготовка)

```python
# src/api/routes/auth.py

"""
Маршруты аутентификации (заготовка для Web)
"""
from flask import Blueprint, request, jsonify

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    """Email + password login"""
    # TODO: Implement for web version
    return jsonify({'error': 'Not implemented for desktop'}), 501


@auth_bp.route('/oauth/google', methods=['POST'])
def google_oauth():
    """Google OAuth callback"""
    # TODO: Implement for web version
    return jsonify({'error': 'Not implemented for desktop'}), 501


@auth_bp.route('/oauth/yandex', methods=['POST'])
def yandex_oauth():
    """Yandex OAuth callback"""
    # TODO: Implement for web version
    return jsonify({'error': 'Not implemented for desktop'}), 501


@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Получить текущего пользователя"""
    # TODO: Implement JWT/session auth
    return jsonify({'error': 'Not implemented for desktop'}), 501
```

---

## Миграция user_email → user_id (Опционально)

### Когда делать:
- После запуска Web-версии
- При переходе на PostgreSQL
- Когда появятся реальные пользователи с accounts

### Как делать:

```python
# scripts/migrate_user_email_to_user_id.py

"""
Миграция с user_email на user_id
Запускать ОДИН раз при переходе на Web
"""

def migrate():
    # 1. Создать users из уникальных email
    unique_emails = db.session.query(History.user_email).distinct().all()
    
    for (email,) in unique_emails:
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(email=email)
            db.session.add(user)
    
    db.session.commit()
    
    # 2. Добавить user_id в History и Template
    # (требует ALTER TABLE)
    
    # 3. Заполнить user_id по user_email
    # UPDATE history SET user_id = (SELECT id FROM users WHERE email = history.user_email)
    
    # 4. Сделать user_id NOT NULL
    # 5. Удалить user_email
```

---

## Чек-лист завершения

- [ ] User модель расширена (OAuth поля)
- [ ] Subscription модель добавлена
- [ ] WebConfig добавлен в config.py
- [ ] ProductionConfig добавлен
- [ ] auth.py routes добавлены (заготовка)
- [ ] create_app() обновлён для web/production
- [ ] Документация обновлена

---

## Важно

### Desktop версия:
- Продолжает использовать `user_email`
- SQLite локально
- Без OAuth (просто email как идентификатор)
- Без подписок (всё бесплатно)

### Web версия (будущее):
- OAuth через Google/Яндекс
- PostgreSQL
- Подписки через Stripe/ЮКасса
- Лимиты для free пользователей

### Обратная совместимость:
- Desktop и Web используют один и тот же `src/core/`
- Конфиг определяет поведение
- Миграция user_email → user_id откладывается
