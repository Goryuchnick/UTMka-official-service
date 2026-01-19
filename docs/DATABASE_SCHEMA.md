# Database Schema — UTMka Web Service

**Database:** PostgreSQL 15+  
**ORM:** SQLAlchemy 2.0

---

## ER Diagram

```
┌─────────────────┐       ┌─────────────────────┐
│     users       │       │   oauth_accounts    │
├─────────────────┤       ├─────────────────────┤
│ id (PK)         │◄──────│ user_id (FK)        │
│ email           │       │ provider            │
│ password_hash   │       │ provider_user_id    │
│ name            │       │ access_token        │
│ email_verified  │       │ refresh_token       │
│ created_at      │       │ expires_at          │
│ updated_at      │       │ created_at          │
└────────┬────────┘       └─────────────────────┘
         │
         │ 1:1
         ▼
┌─────────────────────┐
│   subscriptions     │
├─────────────────────┤
│ id (PK)             │
│ user_id (FK, UNIQUE)│
│ plan                │
│ status              │
│ trial_used          │
│ started_at          │
│ expires_at          │
│ auto_renew          │
│ created_at          │
│ updated_at          │
└─────────────────────┘
         │
         │ (user_id связь)
         │
┌────────┴────────┐          ┌─────────────────────┐
│                 │          │                     │
▼                 ▼          ▼                     │
┌─────────────────┐  ┌─────────────────┐  ┌───────┴─────────┐
│    history      │  │   templates     │  │    payments     │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ id (PK)         │  │ id (PK)         │  │ id (PK)         │
│ user_id (FK)    │  │ user_id (FK)    │  │ user_id (FK)    │
│ base_url        │  │ name            │  │ external_id     │
│ full_url        │  │ utm_source      │  │ amount          │
│ utm_source      │  │ utm_medium      │  │ currency        │
│ utm_medium      │  │ utm_campaign    │  │ status          │
│ utm_campaign    │  │ utm_content     │  │ plan_id         │
│ utm_content     │  │ utm_term        │  │ provider        │
│ utm_term        │  │ tag_name        │  │ metadata        │
│ short_url       │  │ tag_color       │  │ created_at      │
│ created_at      │  │ created_at      │  │ updated_at      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Tables

### users
Основная таблица пользователей.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),  -- NULL если регистрация через OAuth
    name VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор |
| email | VARCHAR(255) | Email пользователя (уникальный) |
| password_hash | VARCHAR(255) | Хеш пароля (bcrypt/argon2), NULL для OAuth |
| name | VARCHAR(255) | Имя пользователя |
| email_verified | BOOLEAN | Подтверждён ли email |
| email_verification_token | VARCHAR(255) | Токен для подтверждения email |
| password_reset_token | VARCHAR(255) | Токен для сброса пароля |
| password_reset_expires | TIMESTAMP | Срок действия токена сброса |
| created_at | TIMESTAMP | Дата регистрации |
| updated_at | TIMESTAMP | Дата последнего обновления |

---

### oauth_accounts
Связь пользователей с OAuth провайдерами.

```sql
CREATE TABLE oauth_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,  -- 'yandex', 'vk', 'google'
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    provider_data JSONB,  -- Дополнительные данные от провайдера
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(provider, provider_user_id)
);

-- Индексы
CREATE INDEX idx_oauth_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_provider ON oauth_accounts(provider, provider_user_id);
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор |
| user_id | INTEGER | Ссылка на пользователя |
| provider | VARCHAR(50) | Название провайдера (yandex, vk, google) |
| provider_user_id | VARCHAR(255) | ID пользователя у провайдера |
| access_token | TEXT | Access токен OAuth |
| refresh_token | TEXT | Refresh токен OAuth |
| token_expires_at | TIMESTAMP | Срок действия токена |
| provider_data | JSONB | Дополнительные данные (имя, аватар и т.д.) |

---

### subscriptions
Информация о подписках пользователей.

```sql
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL DEFAULT 'free',  -- 'free', 'trial', 'pro'
    status VARCHAR(50) NOT NULL DEFAULT 'active',  -- 'active', 'expired', 'cancelled'
    trial_used BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP,
    expires_at TIMESTAMP,
    auto_renew BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор |
| user_id | INTEGER | Ссылка на пользователя (1:1) |
| plan | VARCHAR(50) | Тип плана: free, trial, pro |
| status | VARCHAR(50) | Статус: active, expired, cancelled |
| trial_used | BOOLEAN | Был ли использован пробный период |
| started_at | TIMESTAMP | Дата начала подписки |
| expires_at | TIMESTAMP | Дата окончания подписки |
| auto_renew | BOOLEAN | Включено ли автопродление |
| cancelled_at | TIMESTAMP | Дата отмены подписки |

---

### history
История сгенерированных UTM-меток.

```sql
CREATE TABLE history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    base_url TEXT NOT NULL,
    full_url TEXT NOT NULL,
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),
    short_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_history_user_id ON history(user_id);
CREATE INDEX idx_history_created_at ON history(created_at DESC);
CREATE INDEX idx_history_user_created ON history(user_id, created_at DESC);

-- Полнотекстовый поиск (опционально)
CREATE INDEX idx_history_search ON history USING GIN(
    to_tsvector('russian', coalesce(base_url, '') || ' ' || 
                           coalesce(utm_source, '') || ' ' || 
                           coalesce(utm_campaign, ''))
);
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор |
| user_id | INTEGER | Ссылка на пользователя |
| base_url | TEXT | Базовый URL без параметров |
| full_url | TEXT | Полный URL с UTM-метками |
| utm_source | VARCHAR(255) | Источник трафика |
| utm_medium | VARCHAR(255) | Тип трафика (cpc, email, social) |
| utm_campaign | VARCHAR(255) | Название кампании |
| utm_content | VARCHAR(255) | Содержимое (для A/B тестов) |
| utm_term | VARCHAR(255) | Ключевое слово |
| short_url | VARCHAR(500) | Сокращённая ссылка |
| created_at | TIMESTAMP | Дата создания |

---

### templates
Сохранённые шаблоны UTM-меток.

```sql
CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),
    tag_name VARCHAR(100),
    tag_color VARCHAR(20),  -- HEX цвет, например '#FF5733'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX idx_templates_tag ON templates(user_id, tag_name);
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор |
| user_id | INTEGER | Ссылка на пользователя |
| name | VARCHAR(255) | Название шаблона |
| utm_source | VARCHAR(255) | Источник трафика |
| utm_medium | VARCHAR(255) | Тип трафика |
| utm_campaign | VARCHAR(255) | Название кампании |
| utm_content | VARCHAR(255) | Содержимое |
| utm_term | VARCHAR(255) | Ключевое слово |
| tag_name | VARCHAR(100) | Название тега для группировки |
| tag_color | VARCHAR(20) | Цвет тега (HEX) |

---

### payments
История платежей.

```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_id VARCHAR(255) UNIQUE NOT NULL,  -- ID от платёжной системы
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RUB',
    status VARCHAR(50) NOT NULL,  -- 'pending', 'succeeded', 'failed', 'refunded'
    plan_id VARCHAR(50) NOT NULL,  -- 'pro_monthly', 'pro_yearly'
    provider VARCHAR(50) NOT NULL,  -- 'yookassa', 'stripe'
    metadata JSONB,  -- Дополнительные данные от провайдера
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_external_id ON payments(external_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор |
| user_id | INTEGER | Ссылка на пользователя |
| external_id | VARCHAR(255) | ID платежа от провайдера |
| amount | DECIMAL(10,2) | Сумма платежа |
| currency | VARCHAR(3) | Валюта (RUB, USD) |
| status | VARCHAR(50) | Статус платежа |
| plan_id | VARCHAR(50) | ID тарифного плана |
| provider | VARCHAR(50) | Платёжная система |
| metadata | JSONB | Дополнительные данные |

---

### refresh_tokens
Хранение refresh токенов (опционально, для повышенной безопасности).

```sql
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    device_info VARCHAR(500),
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

---

## Миграции (Alembic)

### Начальная миграция

```python
# migrations/versions/001_initial.py

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # Users
    op.create_table('users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255)),
        sa.Column('name', sa.String(255)),
        sa.Column('email_verified', sa.Boolean(), default=False),
        sa.Column('email_verification_token', sa.String(255)),
        sa.Column('password_reset_token', sa.String(255)),
        sa.Column('password_reset_expires', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now())
    )
    
    # OAuth Accounts
    op.create_table('oauth_accounts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('provider_user_id', sa.String(255), nullable=False),
        sa.Column('access_token', sa.Text()),
        sa.Column('refresh_token', sa.Text()),
        sa.Column('token_expires_at', sa.DateTime()),
        sa.Column('provider_data', postgresql.JSONB()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('provider', 'provider_user_id')
    )
    
    # Subscriptions
    op.create_table('subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('plan', sa.String(50), nullable=False, default='free'),
        sa.Column('status', sa.String(50), nullable=False, default='active'),
        sa.Column('trial_used', sa.Boolean(), default=False),
        sa.Column('started_at', sa.DateTime()),
        sa.Column('expires_at', sa.DateTime()),
        sa.Column('auto_renew', sa.Boolean(), default=False),
        sa.Column('cancelled_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now())
    )
    
    # History
    op.create_table('history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('base_url', sa.Text(), nullable=False),
        sa.Column('full_url', sa.Text(), nullable=False),
        sa.Column('utm_source', sa.String(255)),
        sa.Column('utm_medium', sa.String(255)),
        sa.Column('utm_campaign', sa.String(255)),
        sa.Column('utm_content', sa.String(255)),
        sa.Column('utm_term', sa.String(255)),
        sa.Column('short_url', sa.String(500)),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )
    
    # Templates
    op.create_table('templates',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('utm_source', sa.String(255)),
        sa.Column('utm_medium', sa.String(255)),
        sa.Column('utm_campaign', sa.String(255)),
        sa.Column('utm_content', sa.String(255)),
        sa.Column('utm_term', sa.String(255)),
        sa.Column('tag_name', sa.String(100)),
        sa.Column('tag_color', sa.String(20)),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now())
    )
    
    # Payments
    op.create_table('payments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('external_id', sa.String(255), unique=True, nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='RUB'),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('plan_id', sa.String(50), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('metadata', postgresql.JSONB()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now())
    )
    
    # Create indexes
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_oauth_user_id', 'oauth_accounts', ['user_id'])
    op.create_index('idx_subscriptions_user_id', 'subscriptions', ['user_id'])
    op.create_index('idx_subscriptions_expires_at', 'subscriptions', ['expires_at'])
    op.create_index('idx_history_user_id', 'history', ['user_id'])
    op.create_index('idx_history_created_at', 'history', ['created_at'])
    op.create_index('idx_templates_user_id', 'templates', ['user_id'])
    op.create_index('idx_payments_user_id', 'payments', ['user_id'])
    op.create_index('idx_payments_external_id', 'payments', ['external_id'])

def downgrade():
    op.drop_table('payments')
    op.drop_table('templates')
    op.drop_table('history')
    op.drop_table('subscriptions')
    op.drop_table('oauth_accounts')
    op.drop_table('users')
```

---

## Совместимость с текущей структурой

### Текущая структура (SQLite, портативная версия)

```sql
-- Текущая таблица history_new
CREATE TABLE history_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,  -- Используется email вместо user_id
    base_url TEXT NOT NULL,
    full_url TEXT NOT NULL,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    short_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Текущая таблица templates
CREATE TABLE templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,  -- Используется email вместо user_id
    name TEXT NOT NULL,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    tag_name TEXT,
    tag_color TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Ключевые изменения для веб-версии

1. **user_email → user_id** — связь через внешний ключ вместо email
2. **INTEGER → SERIAL** — автоинкремент PostgreSQL
3. **TEXT → VARCHAR/TEXT** — типизация строк
4. **Добавлены таблицы:** users, oauth_accounts, subscriptions, payments
5. **Добавлены индексы** для оптимизации запросов

---

*Последнее обновление: 19.01.2026*
