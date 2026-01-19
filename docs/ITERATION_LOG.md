# Журнал итераций — UTMka Web Service

Этот документ содержит подробный лог всех итераций разработки веб-сервиса.

---

## Итерация 0: Планирование и подготовка документации

**Дата:** 19.01.2026  
**Статус:** Завершена

### Выполненные задачи

- [x] Анализ структуры существующего проекта
- [x] Создание ветки разработки `web-service-development`
- [x] Создание плана разработки (`WEB_SERVICE_PLAN.md`)
- [x] Создание спецификации API (`API_SPECIFICATION.md`)
- [x] Создание схемы базы данных (`DATABASE_SCHEMA.md`)
- [x] Создание журнала итераций (`ITERATION_LOG.md`)

### Анализ текущего проекта

**Структура:**
```
utmKA-2.0-2/
├── app.py                 # Flask backend + PyWebView (Windows)
├── app_qtwebengine.py     # PyQt6 + QtWebEngine (macOS)
├── index.html             # Фронтенд (~225KB, полный SPA)
├── native_app/            # Нативная PyQt версия
├── scripts/               # Скрипты сборки
├── logo/                  # Логотипы и иконки
├── config/                # Конфиги Inno Setup
└── templates_example*.json # Примеры шаблонов
```

**Текущий функционал:**
1. Генератор UTM-меток с валидацией
2. Сокращение ссылок через clck.ru
3. Генерация QR-кодов
4. История сгенерированных ссылок (локальная SQLite)
5. Шаблоны с тегами и цветами
6. Экспорт/импорт в JSON и CSV
7. Тёмная/светлая тема
8. Локализация (RU/EN интерфейс)

**Текущая БД (SQLite):**
- `history_new` — история (привязка по user_email)
- `templates` — шаблоны (привязка по user_email)
- `users` — пользователи (не используется активно)

**Особенности фронтенда:**
- Монолитный HTML файл (~225KB)
- Tailwind CSS через CDN
- Lucide Icons
- Flatpickr для дат
- Vanilla JavaScript (без фреймворков)
- SPA-архитектура с переключением views

### Ключевые решения

1. **Backend:** Оставить Flask (уже используется), добавить Flask-JWT-Extended, Authlib
2. **Database:** PostgreSQL для production, SQLite для development
3. **OAuth:** Начать с Yandex (самый популярный в РФ), затем VK, Google
4. **Платежи:** ЮKassa как основная система (РФ)
5. **Фронтенд:** Минимальные изменения в существующем index.html

### Следующие шаги

**Итерация 1:** Инициализация структуры веб-проекта
- Создать папку `web/`
- Настроить Flask app factory
- Создать базовую структуру файлов

---

## Итерация 1: Инициализация структуры проекта

**Дата:** 19.01.2026  
**Статус:** Завершена ✅

### Задачи

- [x] Создать структуру папок `web/app/`
- [x] Создать `web/app/__init__.py` с Flask app factory
- [x] Создать `web/app/config.py` с конфигурацией
- [x] Создать `web/app/extensions.py` для Flask extensions
- [x] Создать `web/requirements.txt`
- [x] Создать `web/.env.example`
- [x] Создать `web/run.py`
- [x] Создать базовую структуру папок (models, routes, services, utils, oauth)

### Изменённые файлы

- `web/app/__init__.py` — Flask app factory с инициализацией расширений
- `web/app/config.py` — Конфигурация из переменных окружения (Development, Production, Testing)
- `web/app/extensions.py` — Инициализация SQLAlchemy, JWT, Migrate
- `web/app/routes/__init__.py` — Регистрация blueprints (пока заглушка с health check)
- `web/requirements.txt` — Все необходимые зависимости (Flask, SQLAlchemy, JWT, OAuth, Payment)
- `web/.env.example` — Пример переменных окружения
- `web/run.py` — Точка входа для запуска приложения
- `web/.gitignore` — Игнорирование venv, .env, БД файлов
- `web/README.md` — Краткая документация по запуску

### Структура создана

```
web/
├── app/
│   ├── __init__.py          ✅ Flask app factory
│   ├── config.py            ✅ Конфигурация
│   ├── extensions.py        ✅ Flask extensions
│   ├── models/              ✅ (заглушка)
│   ├── routes/              ✅ (заглушка с health check)
│   ├── services/            ✅ (заглушка)
│   │   └── oauth/           ✅ (заглушка)
│   ├── utils/               ✅ (заглушка)
│   └── templates/           ⏳ (будет в итерации 3)
├── migrations/              ⏳ (будет в итерации 2)
├── tests/                   ⏳ (будет позже)
├── requirements.txt         ✅
├── .env.example             ✅
├── .gitignore               ✅
├── README.md                ✅
└── run.py                   ✅
```

### Заметки

- Flask app factory настроен и готов к расширению
- Конфигурация поддерживает Development, Production, Testing режимы
- Все зависимости указаны в requirements.txt
- Базовая структура папок создана с заглушками для будущих модулей
- Health check endpoint (`/health`) добавлен для проверки работы сервера
- Главный endpoint (`/`) возвращает информацию о версии API

### Следующие шаги

**Итерация 2:** Настройка базы данных
- Подключить SQLAlchemy модели
- Настроить Alembic
- Создать начальную миграцию

---

## Итерация 2: Настройка базы данных

**Дата:** 19.01.2026  
**Статус:** Завершена ✅

### Задачи

- [x] Создать модель User
- [x] Создать модель OAuthAccount
- [x] Создать модель Subscription
- [x] Создать модель History
- [x] Создать модель Template
- [x] Создать модель Payment
- [x] Настроить Alembic
- [x] Создать начальную миграцию

### Изменённые файлы

- `web/app/models/user.py` — Модель пользователя с методами работы с паролями
- `web/app/models/oauth.py` — Модель OAuth аккаунтов (Yandex, VK, Google)
- `web/app/models/subscription.py` — Модель подписок с логикой активации trial/pro
- `web/app/models/history.py` — Модель истории UTM-меток
- `web/app/models/template.py` — Модель шаблонов UTM-меток
- `web/app/models/payment.py` — Модель платежей
- `web/app/models/__init__.py` — Экспорт всех моделей
- `web/app/__init__.py` — Импорт моделей для Alembic
- `web/migrations/env.py` — Конфигурация Alembic
- `web/migrations/alembic.ini` — Настройки Alembic
- `web/migrations/script.py.mako` — Шаблон для миграций
- `web/migrations/versions/001_initial_schema.py` — Начальная миграция

### Созданные модели

1. **User** — Пользователи
   - Email, пароль (bcrypt), имя
   - Email верификация, сброс пароля
   - Relationships: subscription, history, templates, oauth_accounts, payments

2. **OAuthAccount** — OAuth аккаунты
   - Поддержка Yandex, VK, Google
   - Хранение токенов и данных провайдера
   - Уникальность по комбинации provider + provider_user_id

3. **Subscription** — Подписки
   - Планы: free, trial, pro
   - Статусы: active, expired, cancelled
   - Методы: activate_trial(), activate_pro(), cancel(), is_active()

4. **History** — История UTM-меток
   - base_url, full_url
   - Все UTM параметры отдельными полями
   - short_url для сокращённых ссылок

5. **Template** — Шаблоны UTM-меток
   - Все UTM параметры
   - Теги и цвета для группировки

6. **Payment** — Платежи
   - Связь с платёжными системами (external_id)
   - Статусы: pending, succeeded, failed, refunded
   - Метаданные в JSON

### Миграции

- Настроен Alembic для управления миграциями
- Создана начальная миграция `001_initial_schema.py`
- Поддержка SQLite (development) и PostgreSQL (production)
- Все индексы созданы согласно схеме

### Заметки

- Все модели имеют методы `to_dict()` для сериализации
- Relationships настроены с каскадным удалением (CASCADE)
- Индексы созданы для оптимизации запросов
- Модель Subscription имеет удобные методы для работы с подписками
- User модель поддерживает как email/password, так и OAuth-only регистрацию

### Следующие шаги

**Итерация 3:** Адаптация фронтенда
- Скопировать index.html в web/app/templates/
- Добавить модальные окна авторизации
- Добавить UI элементы для подписки

---

## Итерация 3: Адаптация фронтенда

**Дата:** [Pending]  
**Статус:** Не начата

### Задачи

- [ ] Скопировать index.html в web/app/templates/
- [ ] Добавить модальное окно авторизации
- [ ] Добавить UI для отображения статуса пользователя
- [ ] Добавить кнопки OAuth
- [ ] Модифицировать JavaScript для работы с JWT

### Заметки

_Будут добавлены после выполнения_

---

## Итерация 4: Email авторизация

**Дата:** [Pending]  
**Статус:** Не начата

### Задачи

- [ ] Создать `web/app/routes/auth.py`
- [ ] Реализовать POST /auth/register
- [ ] Реализовать POST /auth/login
- [ ] Реализовать POST /auth/logout
- [ ] Реализовать GET /auth/me
- [ ] Настроить Flask-JWT-Extended
- [ ] Добавить bcrypt для хеширования паролей

### Заметки

_Будут добавлены после выполнения_

---

## Шаблон для будущих итераций

```markdown
## Итерация N: [Название]

**Дата:** [DD.MM.YYYY]  
**Статус:** [Не начата / В работе / Завершена]

### Задачи

- [ ] Задача 1
- [ ] Задача 2
- [ ] Задача 3

### Изменённые файлы

- `path/to/file1.py` — описание изменений
- `path/to/file2.py` — описание изменений

### Проблемы и решения

**Проблема:** Описание проблемы
**Решение:** Как была решена

### Заметки

Дополнительные заметки, идеи, TODO на будущее

### Следующие шаги

Что делать в следующей итерации
```

---

## Важные ссылки и ресурсы

### OAuth документация
- [Yandex OAuth](https://yandex.ru/dev/oauth/)
- [VK OAuth](https://dev.vk.com/api/access-token/authcode-flow-user)
- [Google OAuth](https://developers.google.com/identity/protocols/oauth2)

### Платёжные системы
- [ЮKassa API](https://yookassa.ru/developers)
- [Stripe API](https://stripe.com/docs/api)

### Flask extensions
- [Flask-JWT-Extended](https://flask-jwt-extended.readthedocs.io/)
- [Authlib](https://docs.authlib.org/en/latest/)
- [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/)

---

*Последнее обновление: 19.01.2026*
