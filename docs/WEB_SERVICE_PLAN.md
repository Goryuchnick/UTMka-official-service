# План разработки веб-сервиса UTMka

## Обзор проекта

**Цель:** Трансформировать портативное desktop-приложение UTMka в полноценный веб-сервис с системой аутентификации, подписками и облачным хранением данных пользователей.

**Ветка разработки:** `web-service-development`

**Дата начала:** 19.01.2026

---

## Требования к веб-сервису

### 1. Функциональные требования

- [ ] **Интерфейс** — точная копия текущего UI (index.html)
- [ ] **Генератор UTM-меток** — тот же функционал, доступен всем пользователям бесплатно
- [ ] **История** — сохранение сгенерированных ссылок (только для подписчиков)
- [ ] **Шаблоны** — создание и хранение шаблонов UTM (только для подписчиков)
- [ ] **Экспорт/Импорт** — JSON/CSV (для подписчиков)

### 2. Система пользователей

- [ ] Регистрация/авторизация через email + пароль
- [ ] OAuth 2.0: Яндекс, VK, Google
- [ ] Защищённое хранение паролей (bcrypt/argon2)
- [ ] JWT токены для сессий
- [ ] Подтверждение email при регистрации

### 3. Система подписок

| Уровень | Возможности | Цена |
|---------|-------------|------|
| **Free** | Генератор UTM (без сохранения) | Бесплатно |
| **Trial** | Полный доступ на 7 дней | Бесплатно |
| **Pro** | История, шаблоны, экспорт | ~99-199 руб/мес |

### 4. База данных

- [ ] PostgreSQL для production
- [ ] Таблицы: users, subscriptions, history, templates, oauth_accounts
- [ ] Миграции через Alembic

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  index.html (адаптированный) + JavaScript                       │
│  - Модальные окна авторизации                                   │
│  - Проверка статуса подписки                                    │
│  - Ограничение доступа к функциям                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Flask/FastAPI)                     │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Auth API    │  │  UTM API     │  │ Payment API  │           │
│  │              │  │              │  │              │           │
│  │ /auth/login  │  │ /history     │  │ /subscribe   │           │
│  │ /auth/register│ │ /templates   │  │ /webhook     │           │
│  │ /auth/oauth  │  │ /generate    │  │ /status      │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
│                      (PostgreSQL)                                │
│                                                                  │
│  users │ oauth_accounts │ subscriptions │ history │ templates   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Структура файлов веб-сервиса

```
utmKA-2.0-2/
├── web/                          # Новая папка для веб-сервиса
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── config.py            # Конфигурация (env variables)
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py          # Модель пользователя
│   │   │   ├── subscription.py  # Модель подписки
│   │   │   ├── history.py       # Модель истории
│   │   │   └── template.py      # Модель шаблонов
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # Авторизация (email, OAuth)
│   │   │   ├── utm.py           # API для UTM (история, шаблоны)
│   │   │   ├── payment.py       # Подписки и оплата
│   │   │   └── main.py          # Главная страница
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py  # Логика авторизации
│   │   │   ├── oauth/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── yandex.py    # Yandex OAuth
│   │   │   │   ├── vk.py        # VK OAuth
│   │   │   │   └── google.py    # Google OAuth
│   │   │   ├── payment_service.py
│   │   │   └── subscription_service.py
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── decorators.py    # @login_required, @subscription_required
│   │   │   ├── jwt_utils.py     # JWT helpers
│   │   │   └── validators.py    # Валидация данных
│   │   └── templates/
│   │       └── index.html       # Адаптированный фронтенд
│   ├── migrations/              # Alembic миграции
│   ├── tests/
│   ├── requirements.txt         # Зависимости веб-версии
│   ├── .env.example             # Пример переменных окружения
│   └── run.py                   # Точка входа
├── app.py                       # Оригинальное desktop-приложение
├── index.html                   # Оригинальный фронтенд
└── docs/
    ├── WEB_SERVICE_PLAN.md      # Этот файл
    ├── API_SPECIFICATION.md     # Спецификация API
    ├── DATABASE_SCHEMA.md       # Схема базы данных
    └── ITERATION_LOG.md         # Журнал итераций разработки
```

---

## Этапы разработки

### Фаза 1: Подготовка инфраструктуры (Итерации 1-3)

**Итерация 1:** Инициализация проекта
- [ ] Создать структуру папок `web/`
- [ ] Настроить Flask app factory
- [ ] Создать config.py с переменными окружения
- [ ] Создать requirements.txt для веб-версии

**Итерация 2:** Настройка базы данных
- [ ] Подключить SQLAlchemy
- [ ] Создать модели: User, Subscription, History, Template, OAuthAccount
- [ ] Настроить Alembic для миграций
- [ ] Создать начальную миграцию

**Итерация 3:** Адаптация фронтенда
- [ ] Скопировать index.html в web/app/templates/
- [ ] Добавить модальные окна авторизации
- [ ] Добавить UI элементы для подписки
- [ ] Адаптировать JavaScript для работы с JWT

### Фаза 2: Система авторизации (Итерации 4-7)

**Итерация 4:** Email авторизация
- [ ] API: POST /auth/register
- [ ] API: POST /auth/login
- [ ] API: POST /auth/logout
- [ ] API: GET /auth/me (текущий пользователь)
- [ ] Хеширование паролей (bcrypt)
- [ ] JWT токены

**Итерация 5:** Yandex OAuth
- [ ] Регистрация приложения в Yandex
- [ ] API: GET /auth/yandex
- [ ] API: GET /auth/yandex/callback
- [ ] Связывание OAuth с пользователем

**Итерация 6:** VK OAuth
- [ ] Регистрация приложения в VK
- [ ] API: GET /auth/vk
- [ ] API: GET /auth/vk/callback
- [ ] Связывание OAuth с пользователем

**Итерация 7:** Google OAuth
- [ ] Регистрация приложения в Google Cloud
- [ ] API: GET /auth/google
- [ ] API: GET /auth/google/callback
- [ ] Связывание OAuth с пользователем

### Фаза 3: Основной функционал (Итерации 8-10)

**Итерация 8:** API истории
- [ ] GET /api/history — получить историю (с проверкой подписки)
- [ ] POST /api/history — добавить в историю
- [ ] DELETE /api/history/:id — удалить запись
- [ ] PUT /api/history/:id/short_url — обновить короткую ссылку

**Итерация 9:** API шаблонов
- [ ] GET /api/templates — получить шаблоны (с проверкой подписки)
- [ ] POST /api/templates — создать шаблон
- [ ] DELETE /api/templates/:id — удалить шаблон
- [ ] POST /api/templates/import — импорт шаблонов
- [ ] GET /api/templates/export — экспорт шаблонов

**Итерация 10:** Интеграция фронтенда
- [ ] Подключить авторизацию к UI
- [ ] Ограничить доступ к истории/шаблонам без подписки
- [ ] Добавить уведомления о необходимости подписки
- [ ] Тестирование всего потока

### Фаза 4: Система подписок и оплаты (Итерации 11-14)

**Итерация 11:** Модель подписок
- [ ] API: GET /api/subscription/status
- [ ] Логика проверки активности подписки
- [ ] Пробный период (7 дней)

**Итерация 12:** Интеграция платёжной системы
- [ ] Выбор платёжной системы (ЮKassa, Stripe, Тинькофф)
- [ ] API: POST /api/payment/create
- [ ] Webhook для подтверждения оплаты

**Итерация 13:** Страница оплаты
- [ ] UI для выбора тарифа
- [ ] Форма оплаты
- [ ] Обработка успешной/неуспешной оплаты

**Итерация 14:** Продление и отмена подписки
- [ ] Автопродление (если поддерживается)
- [ ] Уведомления об окончании подписки
- [ ] Отмена подписки

### Фаза 5: Безопасность и производительность (Итерации 15-17)

**Итерация 15:** Безопасность
- [ ] HTTPS (Let's Encrypt)
- [ ] Rate limiting
- [ ] CORS настройка
- [ ] SQL injection защита (SQLAlchemy)
- [ ] XSS защита
- [ ] CSRF токены

**Итерация 16:** Оптимизация
- [ ] Redis для кэширования сессий
- [ ] Оптимизация запросов к БД
- [ ] Gzip сжатие
- [ ] CDN для статики

**Итерация 17:** Мониторинг и логирование
- [ ] Sentry для ошибок
- [ ] Логирование действий пользователей
- [ ] Метрики (Prometheus/Grafana)

### Фаза 6: Деплой (Итерации 18-20)

**Итерация 18:** Подготовка к деплою
- [ ] Dockerfile
- [ ] docker-compose.yml
- [ ] CI/CD pipeline (GitHub Actions)

**Итерация 19:** Деплой на сервер
- [ ] Выбор хостинга (VPS/Cloud)
- [ ] Настройка Nginx
- [ ] Настройка PostgreSQL
- [ ] SSL сертификаты

**Итерация 20:** Запуск и тестирование
- [ ] Smoke тесты на production
- [ ] Нагрузочное тестирование
- [ ] Документация для пользователей

---

## Технологический стек

### Backend
- **Framework:** Flask 2.3+ или FastAPI
- **ORM:** SQLAlchemy 2.0
- **Миграции:** Alembic
- **Аутентификация:** Flask-JWT-Extended, Authlib (OAuth)
- **Валидация:** Pydantic или Marshmallow

### Database
- **Production:** PostgreSQL 15+
- **Development:** SQLite (для простоты)
- **Кэш:** Redis

### Frontend
- Существующий index.html
- Tailwind CSS
- Lucide Icons
- Vanilla JavaScript (адаптированный)

### DevOps
- Docker & Docker Compose
- Nginx (reverse proxy)
- GitHub Actions (CI/CD)
- Let's Encrypt (SSL)

### Платежи
- ЮKassa (Россия)
- Stripe (международные платежи, опционально)

---

## Переменные окружения (.env)

```env
# Flask
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your-secret-key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/utmka

# JWT
JWT_SECRET_KEY=your-jwt-secret
JWT_ACCESS_TOKEN_EXPIRES=3600

# OAuth - Yandex
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=
YANDEX_REDIRECT_URI=

# OAuth - VK
VK_CLIENT_ID=
VK_CLIENT_SECRET=
VK_REDIRECT_URI=

# OAuth - Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Payment (ЮKassa)
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_WEBHOOK_SECRET=

# Email (для подтверждения регистрации)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
```

---

## Риски и митигация

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Сложность OAuth интеграции | Средняя | Высокое | Использовать Authlib, начать с одного провайдера |
| Проблемы с платежами | Средняя | Высокое | Тестировать в sandbox, иметь резервную систему |
| Производительность при нагрузке | Низкая | Среднее | Кэширование, оптимизация запросов |
| Безопасность данных | Средняя | Критическое | Аудит безопасности, шифрование, регулярные бэкапы |

---

## Текущий статус

**Фаза:** Подготовка  
**Итерация:** 0 (Планирование)  
**Следующий шаг:** Итерация 1 — Инициализация структуры проекта

---

*Последнее обновление: 19.01.2026*
