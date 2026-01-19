# Руководство по разработке — UTMka Web Service

Технические инструкции для разработки веб-сервиса.

---

## Быстрый старт

### Предварительные требования

- Python 3.10+
- PostgreSQL 15+ (для production)
- Redis (опционально, для кэширования)
- Node.js (опционально, для Tailwind сборки)

### Установка и запуск (development)

```bash
# Перейти в ветку разработки
git checkout web-service-development

# Создать виртуальное окружение
cd web
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Установить зависимости
pip install -r requirements.txt

# Создать .env файл
cp .env.example .env
# Отредактировать .env с вашими настройками

# Инициализировать базу данных
flask db upgrade

# Запустить сервер разработки
flask run --debug
```

---

## Структура проекта

```
web/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── config.py            # Конфигурация из env
│   ├── extensions.py        # Flask extensions (db, jwt, etc.)
│   │
│   ├── models/              # SQLAlchemy модели
│   │   ├── __init__.py      # Экспорт всех моделей
│   │   ├── user.py          # User, OAuthAccount
│   │   ├── subscription.py  # Subscription
│   │   ├── history.py       # History
│   │   └── template.py      # Template
│   │
│   ├── routes/              # API эндпоинты (blueprints)
│   │   ├── __init__.py      # Регистрация blueprints
│   │   ├── auth.py          # /auth/*
│   │   ├── utm.py           # /api/history, /api/templates
│   │   ├── payment.py       # /api/payment, /api/subscription
│   │   └── main.py          # /, статика
│   │
│   ├── services/            # Бизнес-логика
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── subscription_service.py
│   │   ├── payment_service.py
│   │   └── oauth/
│   │       ├── __init__.py
│   │       ├── base.py      # Базовый класс OAuth
│   │       ├── yandex.py
│   │       ├── vk.py
│   │       └── google.py
│   │
│   ├── utils/               # Утилиты
│   │   ├── __init__.py
│   │   ├── decorators.py    # @login_required, @subscription_required
│   │   ├── jwt_utils.py     # JWT helpers
│   │   └── validators.py    # Pydantic/Marshmallow схемы
│   │
│   └── templates/           # Jinja2 шаблоны
│       └── index.html       # Главная страница (адаптированный фронтенд)
│
├── migrations/              # Alembic миграции
│   ├── alembic.ini
│   ├── env.py
│   └── versions/
│
├── tests/                   # Тесты
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_history.py
│   └── test_templates.py
│
├── requirements.txt         # Python зависимости
├── .env.example             # Пример переменных окружения
├── run.py                   # Точка входа
└── Dockerfile               # Docker образ
```

---

## Конфигурация

### Переменные окружения (.env)

```env
# === Flask ===
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=change-this-to-random-string

# === Database ===
# Development (SQLite)
DATABASE_URL=sqlite:///utmka_dev.db

# Production (PostgreSQL)
# DATABASE_URL=postgresql://user:password@localhost:5432/utmka

# === JWT ===
JWT_SECRET_KEY=change-this-to-another-random-string
JWT_ACCESS_TOKEN_EXPIRES=3600      # 1 час
JWT_REFRESH_TOKEN_EXPIRES=2592000  # 30 дней

# === OAuth: Yandex ===
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=
YANDEX_REDIRECT_URI=http://localhost:5000/auth/yandex/callback

# === OAuth: VK ===
VK_CLIENT_ID=
VK_CLIENT_SECRET=
VK_REDIRECT_URI=http://localhost:5000/auth/vk/callback

# === OAuth: Google ===
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# === Payment: YooKassa ===
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_RETURN_URL=http://localhost:5000/payment/success

# === Email (опционально) ===
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_DEFAULT_SENDER=noreply@utmka.ru

# === Redis (опционально) ===
REDIS_URL=redis://localhost:6379/0
```

---

## Основные паттерны кода

### Flask App Factory

```python
# web/app/__init__.py
from flask import Flask
from .config import Config
from .extensions import db, jwt, migrate

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Инициализация extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    
    # Регистрация blueprints
    from .routes import auth_bp, utm_bp, payment_bp, main_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(utm_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(main_bp)
    
    return app
```

### Модель пользователя

```python
# web/app/models/user.py
from datetime import datetime
from ..extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255))
    name = db.Column(db.String(255))
    email_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    subscription = db.relationship('Subscription', backref='user', uselist=False)
    history = db.relationship('History', backref='user', lazy='dynamic')
    templates = db.relationship('Template', backref='user', lazy='dynamic')
    oauth_accounts = db.relationship('OAuthAccount', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'email_verified': self.email_verified,
            'created_at': self.created_at.isoformat(),
            'subscription': self.subscription.to_dict() if self.subscription else None
        }
```

### Декоратор проверки подписки

```python
# web/app/utils/decorators.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from ..models import User

def subscription_required(f):
    """Декоратор для эндпоинтов, требующих активную подписку"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not user.subscription or not user.subscription.is_active:
            return jsonify({
                'error': 'Subscription required',
                'message': 'Для доступа к этой функции требуется активная подписка',
                'subscription_required': True
            }), 403
        
        return f(*args, **kwargs)
    return decorated_function
```

### Роут с авторизацией

```python
# web/app/routes/utm.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import History, db
from ..utils.decorators import subscription_required

utm_bp = Blueprint('utm', __name__, url_prefix='/api')

@utm_bp.route('/history', methods=['GET'])
@jwt_required()
@subscription_required
def get_history():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    history = History.query.filter_by(user_id=user_id)\
        .order_by(History.created_at.desc())\
        .paginate(page=page, per_page=per_page)
    
    return jsonify({
        'items': [h.to_dict() for h in history.items],
        'pagination': {
            'page': history.page,
            'per_page': history.per_page,
            'total_items': history.total,
            'total_pages': history.pages
        }
    })
```

---

## Работа с OAuth

### Yandex OAuth

```python
# web/app/services/oauth/yandex.py
import requests
from flask import current_app

class YandexOAuth:
    AUTHORIZE_URL = 'https://oauth.yandex.ru/authorize'
    TOKEN_URL = 'https://oauth.yandex.ru/token'
    USERINFO_URL = 'https://login.yandex.ru/info'
    
    @staticmethod
    def get_authorize_url(state: str) -> str:
        params = {
            'response_type': 'code',
            'client_id': current_app.config['YANDEX_CLIENT_ID'],
            'redirect_uri': current_app.config['YANDEX_REDIRECT_URI'],
            'state': state
        }
        return f"{YandexOAuth.AUTHORIZE_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    
    @staticmethod
    def exchange_code(code: str) -> dict:
        response = requests.post(YandexOAuth.TOKEN_URL, data={
            'grant_type': 'authorization_code',
            'code': code,
            'client_id': current_app.config['YANDEX_CLIENT_ID'],
            'client_secret': current_app.config['YANDEX_CLIENT_SECRET']
        })
        return response.json()
    
    @staticmethod
    def get_user_info(access_token: str) -> dict:
        response = requests.get(YandexOAuth.USERINFO_URL, headers={
            'Authorization': f'OAuth {access_token}'
        })
        return response.json()
```

---

## Работа с платежами (ЮKassa)

### Создание платежа

```python
# web/app/services/payment_service.py
import uuid
from yookassa import Configuration, Payment
from flask import current_app

Configuration.account_id = current_app.config['YOOKASSA_SHOP_ID']
Configuration.secret_key = current_app.config['YOOKASSA_SECRET_KEY']

def create_payment(user_id: int, plan_id: str, amount: float) -> dict:
    idempotence_key = str(uuid.uuid4())
    
    payment = Payment.create({
        'amount': {
            'value': str(amount),
            'currency': 'RUB'
        },
        'confirmation': {
            'type': 'redirect',
            'return_url': current_app.config['YOOKASSA_RETURN_URL']
        },
        'capture': True,
        'description': f'Подписка UTMka Pro ({plan_id})',
        'metadata': {
            'user_id': user_id,
            'plan_id': plan_id
        }
    }, idempotence_key)
    
    return {
        'payment_id': payment.id,
        'confirmation_url': payment.confirmation.confirmation_url,
        'status': payment.status
    }
```

---

## Тестирование

### Запуск тестов

```bash
# Все тесты
pytest

# С покрытием
pytest --cov=app --cov-report=html

# Конкретный файл
pytest tests/test_auth.py

# Verbose
pytest -v
```

### Пример теста

```python
# web/tests/test_auth.py
import pytest
from app import create_app, db
from app.models import User

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

def test_register(client):
    response = client.post('/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123',
        'name': 'Test User'
    })
    assert response.status_code == 201
    assert response.json['success'] == True

def test_login(client):
    # Сначала регистрируем
    client.post('/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    
    # Затем логинимся
    response = client.post('/auth/login', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert response.status_code == 200
    assert 'access_token' in response.json
```

---

## Деплой

### Docker

```dockerfile
# web/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV FLASK_APP=run.py
ENV FLASK_ENV=production

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "run:app"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: ./web
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://utmka:password@db:5432/utmka
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=utmka
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=utmka

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## Полезные команды

```bash
# Flask CLI
flask db init                    # Инициализация Alembic
flask db migrate -m "message"    # Создание миграции
flask db upgrade                 # Применение миграций
flask db downgrade               # Откат миграции
flask shell                      # Python shell с контекстом приложения

# Git
git checkout web-service-development
git add .
git commit -m "feat: description"
git push origin web-service-development

# Docker
docker-compose up -d             # Запуск в фоне
docker-compose logs -f web       # Логи
docker-compose down              # Остановка
```

---

## Чеклист перед коммитом

- [ ] Код проходит линтер (flake8, black)
- [ ] Тесты проходят (pytest)
- [ ] Миграции созданы (если изменились модели)
- [ ] Обновлена документация (если нужно)
- [ ] Обновлён ITERATION_LOG.md

---

*Последнее обновление: 19.01.2026*
