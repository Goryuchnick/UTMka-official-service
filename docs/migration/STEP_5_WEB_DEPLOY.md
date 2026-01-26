# Этап 5: Web Deployment

## Цель

Развернуть Web-версию UTMka с OAuth, подписками и PostgreSQL.

## Время: 1-2 недели

## Статус: ⏳ Будущее (после STEP_1-4)

## Предусловия

- [x] STEP_1: Структура папок
- [ ] STEP_1B: SQLAlchemy интеграция
- [ ] STEP_1C: Web-ready модели
- [ ] STEP_2: Frontend модули
- [ ] STEP_3: Windows installer (desktop готов)
- [ ] STEP_4: macOS build (desktop готов)

---

## Компоненты Web-версии

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND                                │
│              (тот же, что и desktop)                        │
│         + Auth UI (login, register, profile)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 NGINX / Cloudflare                          │
│              (SSL, rate limiting, caching)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                GUNICORN + FLASK                             │
│              src/api/ с WebConfig                           │
│         + OAuth routes + Subscription routes                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL                                │
│              (Railway / Supabase / Neon)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Шаг 5.1: Инфраструктура

### Варианты хостинга:

| Сервис | Плюсы | Минусы | Стоимость |
|--------|-------|--------|-----------|
| **Railway** | Простота, PostgreSQL включён | Лимиты на free | $5-20/мес |
| **Render** | Free tier, автодеплой | Холодный старт | $0-25/мес |
| **Fly.io** | Edge, низкая latency | Сложнее setup | $0-20/мес |
| **VPS (Timeweb)** | Контроль, дёшево | Ручной setup | 200-500₽/мес |

### Рекомендация для старта:
**Railway** или **Render** — простой деплой, PostgreSQL включён.

---

## Шаг 5.2: Dockerfile

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn psycopg2-binary

# Copy source
COPY src/ src/
COPY frontend/ frontend/
COPY assets/ assets/
COPY index.html .

# Environment
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Run
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "src.api:create_app('production')"]
```

---

## Шаг 5.3: requirements-web.txt

```txt
# Web-specific dependencies
flask==2.3.3
flask-sqlalchemy==3.1.1
flask-login==0.6.3
flask-cors==4.0.0

# Database
psycopg2-binary==2.9.9
alembic==1.13.1

# OAuth
authlib==1.3.0
python-jose[cryptography]==3.3.0

# Payments
stripe==7.0.0
yookassa==3.0.0

# Server
gunicorn==21.2.0

# Utils
marshmallow==3.20.1
python-dotenv==1.0.0
```

---

## Шаг 5.4: OAuth Implementation

### Google OAuth:

```python
# src/api/routes/auth.py

from flask import Blueprint, redirect, url_for, session
from authlib.integrations.flask_client import OAuth

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
oauth = OAuth()


def init_oauth(app):
    oauth.init_app(app)
    
    oauth.register(
        name='google',
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )
    
    oauth.register(
        name='yandex',
        client_id=app.config['YANDEX_CLIENT_ID'],
        client_secret=app.config['YANDEX_CLIENT_SECRET'],
        authorize_url='https://oauth.yandex.ru/authorize',
        access_token_url='https://oauth.yandex.ru/token',
        userinfo_endpoint='https://login.yandex.ru/info',
        client_kwargs={'scope': 'login:email login:info'}
    )


@auth_bp.route('/google')
def google_login():
    redirect_uri = url_for('auth.google_callback', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)


@auth_bp.route('/google/callback')
def google_callback():
    token = oauth.google.authorize_access_token()
    userinfo = token.get('userinfo')
    
    # Find or create user
    user = User.query.filter_by(google_id=userinfo['sub']).first()
    if not user:
        user = User.query.filter_by(email=userinfo['email']).first()
        if user:
            user.google_id = userinfo['sub']
        else:
            user = User(
                email=userinfo['email'],
                google_id=userinfo['sub'],
                name=userinfo.get('name'),
                avatar_url=userinfo.get('picture')
            )
            db.session.add(user)
    
    user.last_login_at = datetime.utcnow()
    db.session.commit()
    
    # Create JWT token
    access_token = create_access_token(user)
    
    return redirect(f'/?token={access_token}')
```

---

## Шаг 5.5: Subscription Flow

### Stripe Integration:

```python
# src/api/routes/subscription.py

import stripe
from flask import Blueprint, request, jsonify

subscription_bp = Blueprint('subscription', __name__, url_prefix='/api/subscription')


@subscription_bp.route('/create-checkout', methods=['POST'])
def create_checkout():
    """Создаёт Stripe Checkout сессию"""
    data = request.json
    user = get_current_user()  # From JWT
    
    plan_prices = {
        'pro_monthly': 'price_xxx',
        'pro_yearly': 'price_yyy',
        'enterprise_monthly': 'price_zzz'
    }
    
    session = stripe.checkout.Session.create(
        customer_email=user.email,
        payment_method_types=['card'],
        line_items=[{
            'price': plan_prices[data['plan']],
            'quantity': 1
        }],
        mode='subscription',
        success_url='https://utmka.app/subscription/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url='https://utmka.app/subscription/cancel',
        metadata={'user_id': user.id}
    )
    
    return jsonify({'checkout_url': session.url})


@subscription_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """Stripe webhook для обработки событий"""
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    event = stripe.Webhook.construct_event(
        payload, sig_header, current_app.config['STRIPE_WEBHOOK_SECRET']
    )
    
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session['metadata']['user_id']
        
        # Активировать подписку
        user = User.query.get(user_id)
        user.subscription_type = 'pro'
        user.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
        
        subscription = Subscription(
            user_id=user_id,
            plan_type='pro',
            payment_provider='stripe',
            payment_id=session['subscription'],
            expires_at=user.subscription_expires_at
        )
        db.session.add(subscription)
        db.session.commit()
    
    return jsonify({'received': True})
```

---

## Шаг 5.6: Database Migration

### Alembic setup:

```bash
# Инициализация
alembic init migrations

# Создать миграцию
alembic revision --autogenerate -m "initial"

# Применить
alembic upgrade head
```

### Миграция с user_email на user_id:

```sql
-- migrations/versions/xxx_add_user_id.py

-- 1. Создать users из уникальных email
INSERT INTO users (email, created_at)
SELECT DISTINCT user_email, MIN(created_at)
FROM history_new
GROUP BY user_email
ON CONFLICT (email) DO NOTHING;

-- 2. Добавить user_id
ALTER TABLE history_new ADD COLUMN user_id INTEGER;
ALTER TABLE templates ADD COLUMN user_id INTEGER;

-- 3. Заполнить user_id
UPDATE history_new SET user_id = (
    SELECT id FROM users WHERE email = history_new.user_email
);
UPDATE templates SET user_id = (
    SELECT id FROM users WHERE email = templates.user_email
);

-- 4. Сделать NOT NULL и FK
ALTER TABLE history_new ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE history_new ADD CONSTRAINT fk_history_user 
    FOREIGN KEY (user_id) REFERENCES users(id);

-- 5. Удалить старые колонки (после проверки)
-- ALTER TABLE history_new DROP COLUMN user_email;
```

---

## Шаг 5.7: Environment Variables

```bash
# .env.production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/utmka

# Security
SECRET_KEY=your-very-long-secret-key-here
JWT_SECRET_KEY=another-secret-key

# OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
YANDEX_CLIENT_ID=xxx
YANDEX_CLIENT_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
MAIL_SERVER=smtp.gmail.com
MAIL_USERNAME=noreply@utmka.app
MAIL_PASSWORD=xxx
```

---

## Чек-лист Web Deploy

- [ ] PostgreSQL развёрнут
- [ ] Dockerfile создан и протестирован
- [ ] OAuth работает (Google, Яндекс)
- [ ] Stripe/ЮКасса интегрирован
- [ ] Миграция БД выполнена
- [ ] SSL настроен
- [ ] Monitoring настроен (Sentry)
- [ ] Backup БД настроен
- [ ] Rate limiting настроен
- [ ] CORS настроен

---

## Стоимость Web-версии

| Компонент | Free tier | Production |
|-----------|-----------|------------|
| Хостинг (Railway) | 500 часов/мес | $5-20/мес |
| PostgreSQL | 1GB | $5-15/мес |
| Домен | - | $10-15/год |
| Email (Resend) | 3000/мес | $20/мес |
| **Итого** | ~$0 | ~$35-70/мес |

---

## Монетизация

### Планы:

| План | Цена | Лимиты |
|------|------|--------|
| **Free** | $0 | 100 записей истории, 10 шаблонов |
| **Pro** | $5/мес или $50/год | 10,000 записей, 1,000 шаблонов |
| **Enterprise** | $20/мес | Без лимитов, приоритетная поддержка |

### Breakeven:
- Расходы: ~$50/мес
- Pro подписчиков для окупаемости: 10-15 человек
