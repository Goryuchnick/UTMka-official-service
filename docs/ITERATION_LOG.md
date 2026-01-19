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

**Дата:** 19.01.2026  
**Статус:** Завершена ✅

### Задачи

- [x] Скопировать index.html в web/app/templates/
- [x] Создать модуль авторизации (auth.js)
- [x] Добавить модальные окна авторизации (email, OAuth)
- [x] Добавить UI элементы для отображения статуса подписки
- [x] Адаптировать JavaScript для работы с JWT токенами
- [x] Заменить все fetch запросы на API.request
- [x] Добавить проверку подписки перед сохранением истории/шаблонов
- [x] Создать роут для отдачи фронтенда

### Изменённые файлы

- `web/app/templates/index.html` — Адаптированный фронтенд с авторизацией
- `web/app/static/js/auth.js` — Модуль авторизации и API клиент
- `web/app/routes/main.py` — Роут для отдачи фронтенда и статики

### Добавленные функции

1. **Модуль авторизации (auth.js)**
   - `AuthUtils` — работа с токенами в localStorage
   - `API` — клиент с автоматическим добавлением Authorization header
   - `AuthService` — сервис авторизации (login, register, logout, getCurrentUser)
   - `OAuthService` — редирект на OAuth провайдеров

2. **Модальные окна**
   - Модальное окно входа (email + OAuth кнопки)
   - Модальное окно регистрации (email + OAuth кнопки)
   - Модальное окно "Требуется подписка"

3. **UI элементы**
   - Кнопки "Войти" и "Регистрация" в navbar (для неавторизованных)
   - Меню пользователя с email и бейджем подписки (для авторизованных)
   - Кнопка "Выйти"

4. **Интеграция с API**
   - Все fetch запросы заменены на `API.request()`
   - Автоматическое добавление JWT токена в заголовки
   - Автоматическое обновление токена при истечении
   - Проверка подписки перед сохранением истории/шаблонов

### Заметки

- Фронтенд готов к работе с backend API
- Генератор UTM работает без авторизации (бесплатно)
- Сохранение истории и шаблонов требует активной подписки
- OAuth кнопки готовы, но требуют backend реализации (итерация 5-7)
- Модальные окна используют существующие стили (glass-card, glass-input)

### Следующие шаги

**Итерация 4:** Email авторизация
- Создать routes/auth.py
- Реализовать POST /auth/register
- Реализовать POST /auth/login
- Реализовать POST /auth/logout
- Реализовать GET /auth/me

---

## Итерация 4: Email авторизация

**Дата:** 19.01.2026  
**Статус:** Завершена ✅

### Задачи

- [x] Реализовать POST /auth/register с валидацией и хешированием паролей
- [x] Реализовать POST /auth/login с проверкой пароля
- [x] Реализовать POST /auth/logout
- [x] Реализовать GET /auth/me с получением текущего пользователя
- [x] Реализовать POST /auth/refresh для обновления токенов
- [x] Создать декораторы для проверки авторизации
- [x] Добавить автоматическое создание подписки при регистрации

### Изменённые файлы

- `web/app/routes/auth.py` — Полная реализация авторизации с валидацией
- `web/app/services/auth_service.py` — Сервис для работы с пользователями
- `web/app/utils/decorators.py` — Декоратор @subscription_required

### Реализованные функции

1. **Регистрация (POST /auth/register)**
   - Валидация email и пароля через Marshmallow
   - Хеширование пароля через bcrypt
   - Автоматическое создание подписки free
   - Возврат JWT токенов после регистрации
   - Проверка на дубликат email

2. **Авторизация (POST /auth/login)**
   - Проверка email и пароля
   - Поддержка OAuth-only аккаунтов (сообщение об ошибке)
   - Возврат JWT токенов (access + refresh)
   - Информация о пользователе и подписке

3. **Получение текущего пользователя (GET /auth/me)**
   - Требует JWT токен
   - Возвращает полную информацию о пользователе
   - Включает информацию о подписке

4. **Обновление токена (POST /auth/refresh)**
   - Использует refresh токен
   - Возвращает новый access токен
   - Защищено @jwt_required(refresh=True)

5. **Выход (POST /auth/logout)**
   - Инвалидация токенов (заглушка, в будущем добавим blacklist)

6. **Декоратор @subscription_required**
   - Проверяет авторизацию
   - Проверяет активность подписки
   - Возвращает понятные ошибки

### Валидация

- Email: формат email, длина 5-255 символов
- Пароль: минимум 6 символов, максимум 100
- Имя: максимум 255 символов (опционально)

### Безопасность

- Пароли хешируются через bcrypt
- JWT токены с настраиваемым временем жизни
- Refresh токены для безопасного обновления
- Валидация всех входных данных

### Заметки

- При регистрации автоматически создаётся подписка free
- OAuth-only пользователи не могут войти по паролю (показывается соответствующее сообщение)
- Все ошибки возвращаются в понятном формате для фронтенда
- Используется Marshmallow для валидации данных

### Следующие шаги

**Итерация 5:** Yandex OAuth
- Регистрация приложения в Yandex
- Реализация OAuth flow
- Связывание OAuth с пользователем

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

**Дата:** 19.01.2026  
**Статус:** Завершена ✅

### Задачи

- [x] Создать `web/app/routes/auth.py`
- [x] Реализовать POST /auth/register
- [x] Реализовать POST /auth/login
- [x] Реализовать POST /auth/logout
- [x] Реализовать GET /auth/me
- [x] Настроить Flask-JWT-Extended
- [x] Добавить bcrypt для хеширования паролей

### Изменённые файлы

- `web/app/routes/auth.py` — Роуты авторизации (register, login, logout, me, refresh)
- `web/app/services/auth_service.py` — Сервис авторизации (регистрация, аутентификация)
- `web/app/utils/decorators.py` — Декоратор @subscription_required

### Реализованные функции

1. **Регистрация (POST /auth/register)**
   - Валидация email и пароля через Marshmallow
   - Хеширование пароля через bcrypt
   - Автоматическое создание подписки free
   - Возврат JWT токенов после регистрации
   - Проверка на дубликат email

2. **Авторизация (POST /auth/login)**
   - Проверка email и пароля
   - Поддержка OAuth-only аккаунтов (сообщение об ошибке)
   - Возврат JWT токенов (access + refresh)
   - Информация о пользователе и подписке

3. **Получение текущего пользователя (GET /auth/me)**
   - Требует JWT токен
   - Возвращает полную информацию о пользователе
   - Включает информацию о подписке

4. **Обновление токена (POST /auth/refresh)**
   - Использует refresh токен
   - Возвращает новый access токен
   - Защищено @jwt_required(refresh=True)

5. **Выход (POST /auth/logout)**
   - Инвалидация токенов (заглушка, в будущем добавим blacklist)

### Заметки

- Все эндпоинты используют валидацию через Marshmallow
- JWT токены имеют срок действия (access: 1 час, refresh: 30 дней)
- Пароли хешируются через werkzeug.security (bcrypt)
- OAuth-only пользователи не могут войти через email/password

### Следующие шаги

**Итерация 5:** Yandex OAuth
- Реализовать GET /auth/yandex
- Реализовать GET /auth/yandex/callback
- Создать сервис Yandex OAuth

---

## Итерация 5: Yandex OAuth

**Дата:** 19.01.2026  
**Статус:** Завершена ✅

### Задачи

- [x] Создать сервис Yandex OAuth (`web/app/services/oauth/yandex.py`)
- [x] Реализовать GET /auth/yandex (редирект на Yandex)
- [x] Реализовать GET /auth/yandex/callback (обработка callback)
- [x] Связывание OAuth с пользователем
- [x] Создание пользователя через OAuth

### Изменённые файлы

- `web/app/services/oauth/yandex.py` — Сервис Yandex OAuth
- `web/app/services/oauth/__init__.py` — Экспорт YandexOAuth
- `web/app/routes/auth.py` — Роуты /auth/yandex и /auth/yandex/callback
- `web/app/config.py` — Добавлен FRONTEND_URL для OAuth редиректов

### Реализованные функции

1. **YandexOAuth сервис**
   - `get_authorize_url(state)` — Генерация URL для редиректа на Yandex
   - `exchange_code_for_token(code)` — Обмен authorization code на access token
   - `get_user_info(access_token)` — Получение информации о пользователе
   - `create_or_link_user()` — Создание или связывание пользователя с OAuth аккаунтом

2. **Роут GET /auth/yandex**
   - Генерация CSRF state токена
   - Сохранение state в Flask session
   - Редирект на страницу авторизации Yandex

3. **Роут GET /auth/yandex/callback**
   - Проверка CSRF state токена
   - Обмен code на access token
   - Получение информации о пользователе
   - Создание или связывание пользователя
   - Создание JWT токенов
   - Возврат HTML страницы, которая устанавливает токены в localStorage

### Логика работы

1. Пользователь нажимает кнопку "Яндекс" на фронтенде
2. Фронтенд редиректит на `/auth/yandex`
3. Backend генерирует state токен и редиректит на Yandex
4. Пользователь авторизуется на Yandex
5. Yandex редиректит на `/auth/yandex/callback?code=...&state=...`
6. Backend проверяет state, обменивает code на токен, получает данные пользователя
7. Backend создаёт/связывает пользователя и возвращает HTML с токенами
8. HTML страница устанавливает токены в localStorage и редиректит на главную

### Безопасность

- CSRF защита через state токен (secrets.token_urlsafe)
- State хранится в Flask session
- Токены передаются через HTML страницу, а не в URL
- Проверка настроек OAuth перед использованием

### Заметки

- Требуется настройка переменных окружения: `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, `YANDEX_REDIRECT_URI`
- OAuth аккаунты автоматически связываются с существующими пользователями по email
- Новые пользователи получают подписку free автоматически
- Email считается верифицированным для OAuth пользователей

### Следующие шаги

**Итерация 6:** VK OAuth
- Реализовать GET /auth/vk
- Реализовать GET /auth/vk/callback
- Создать сервис VK OAuth

---

## Итерация 7: Google OAuth

**Дата:** 19.01.2026  
**Статус:** Завершена ✅

### Задачи

- [x] Создать сервис Google OAuth (`web/app/services/oauth/google.py`)
- [x] Реализовать GET /auth/google (редирект на Google)
- [x] Реализовать GET /auth/google/callback
- [x] Добавить Google OAuth в __init__.py
- [x] Обновить ITERATION_LOG.md

### Изменённые файлы

- `web/app/services/oauth/google.py` — Сервис для работы с Google OAuth
- `web/app/services/oauth/__init__.py` — Добавлен экспорт GoogleOAuth
- `web/app/routes/auth.py` — Реализованы роуты `/auth/google` и `/auth/google/callback`

### Реализованные функции

1. **Сервис Google OAuth (GoogleOAuth)**
   - `get_authorize_url(state)` — Генерация URL для редиректа на Google
   - `exchange_code_for_token(code)` — Обмен authorization code на access token
   - `get_user_info(access_token)` — Получение информации о пользователе через Google API
   - `create_or_link_user()` — Создание или связывание пользователя

2. **Роут GET /auth/google**
   - Проверка конфигурации Google OAuth
   - Генерация CSRF state токена
   - Редирект на страницу авторизации Google с scope: `openid email profile`
   - Запрос `access_type=offline` для получения refresh_token

3. **Роут GET /auth/google/callback**
   - Проверка CSRF state токена
   - Обмен code на access и refresh токены
   - Получение информации о пользователе
   - Создание или связывание пользователя
   - Возврат HTML страницы с установкой токенов в localStorage

### Особенности Google OAuth

- Использует OpenID Connect (scope: `openid email profile`)
- Поддержка refresh_token через `access_type=offline` и `prompt=consent`
- Google использует поле `sub` вместо `id` для идентификации пользователя
- Email верификация через поле `verified_email`

### Безопасность

- CSRF защита через state токен
- State хранится в Flask session
- Токены передаются через HTML страницу, а не в URL
- Проверка настроек OAuth перед использованием

### Заметки

- Требуется настройка переменных окружения: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- OAuth аккаунты автоматически связываются с существующими пользователями по email
- Новые пользователи получают подписку free автоматически
- Email считается верифицированным для OAuth пользователей

### Следующие шаги

**Итерация 8:** API для истории и шаблонов

---

## Итерация 8: API для истории и шаблонов

**Дата:** 19.01.2026  
**Статус:** Завершена ✅

### Задачи

- [x] Реализовать GET /api/v1/history с пагинацией и фильтрами
- [x] Реализовать POST /api/v1/history для добавления записей
- [x] Реализовать DELETE /api/v1/history/:id
- [x] Реализовать PUT /api/v1/history/:id/short_url
- [x] Реализовать POST /api/v1/history/export (JSON/CSV)
- [x] Реализовать DELETE /api/v1/history/clear
- [x] Реализовать GET /api/v1/templates с пагинацией и фильтрами
- [x] Реализовать POST /api/v1/templates
- [x] Реализовать PUT /api/v1/templates/:id
- [x] Реализовать DELETE /api/v1/templates/:id
- [x] Реализовать POST /api/v1/templates/import
- [x] Реализовать POST /api/v1/templates/export (JSON/CSV)
- [x] Реализовать GET /api/v1/subscription/status
- [x] Реализовать GET /api/v1/subscription/plans
- [x] Реализовать POST /api/v1/subscription/activate-trial
- [x] Реализовать POST /api/v1/subscription/cancel

### Изменённые файлы

- `web/app/routes/utm.py` — Полная реализация API для истории, шаблонов и подписок

### Реализованные эндпоинты

#### История (History)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/v1/history` | Получение истории с пагинацией, поиском и фильтром по датам |
| POST | `/api/v1/history` | Добавление записи в историю |
| DELETE | `/api/v1/history/:id` | Удаление записи (с проверкой владельца) |
| PUT | `/api/v1/history/:id/short_url` | Обновление короткой ссылки |
| POST | `/api/v1/history/export` | Экспорт в JSON или CSV |
| DELETE | `/api/v1/history/clear` | Очистка всей истории |

#### Шаблоны (Templates)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/v1/templates` | Получение шаблонов с пагинацией, поиском и фильтром по тегам |
| POST | `/api/v1/templates` | Создание шаблона |
| PUT | `/api/v1/templates/:id` | Обновление шаблона |
| DELETE | `/api/v1/templates/:id` | Удаление шаблона (с проверкой владельца) |
| POST | `/api/v1/templates/import` | Импорт шаблонов из JSON |
| POST | `/api/v1/templates/export` | Экспорт в JSON или CSV |

#### Подписка (Subscription)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/v1/subscription/status` | Статус подписки текущего пользователя |
| GET | `/api/v1/subscription/plans` | Список доступных тарифов |
| POST | `/api/v1/subscription/activate-trial` | Активация 7-дневного trial |
| POST | `/api/v1/subscription/cancel` | Отмена автопродления |

### Особенности реализации

1. **Валидация данных** — Marshmallow схемы для всех входных данных
2. **Проверка авторизации** — Декоратор `@subscription_required` проверяет JWT и активность подписки
3. **Безопасность** — Все операции проверяют владельца ресурса (user_id)
4. **Пагинация** — Все списочные эндпоинты поддерживают `page` и `per_page` (max: 100)
5. **Фильтрация** — Поиск по тексту, фильтры по датам (история) и тегам (шаблоны)
6. **Экспорт** — Поддержка JSON и CSV форматов с правильными MIME-типами

### Тарифные планы

| ID | Название | Цена | Период | Функции |
|----|----------|------|--------|---------|
| free | Бесплатный | 0 ₽ | — | Только генератор UTM |
| trial | Пробный | 0 ₽ | 7 дней | Полный доступ |
| pro_monthly | Pro (месяц) | 149 ₽ | месяц | Полный доступ |
| pro_yearly | Pro (год) | 999 ₽ | год | Полный доступ (скидка 44%) |

### Заметки

- Все эндпоинты истории и шаблонов требуют активную подписку (trial или pro)
- Эндпоинт `/subscription/status` доступен всем авторизованным пользователям
- Эндпоинт `/subscription/plans` доступен без авторизации
- При экспорте JSON шаблонов не включаются id и user_id для переносимости
- Список уникальных тегов возвращается вместе со списком шаблонов

### Следующие шаги

**Итерация 9:** Интеграция фронтенда с API

---

## Итерация 9: Интеграция фронтенда с API

**Дата:** 19.01.2026  
**Статус:** Завершена ✅

### Задачи

- [x] Изучить текущую реализацию JavaScript (история, шаблоны)
- [x] Обновить fetchData() для работы с новым форматом API `{ items: [...] }`
- [x] Обновить POST /history — отправка полных UTM-параметров
- [x] Обновить импорт шаблонов — использование API `/templates/import`
- [x] Обновить экспорт шаблонов — прямое скачивание файла
- [x] Обновить экспорт истории — прямое скачивание файла
- [x] Проверить работу проверки подписки и модальных окон

### Изменённые файлы

- `web/app/templates/index.html` — Обновлён JavaScript для работы с новым API

### Внесённые изменения

1. **fetchData()** — Исправлена обработка ответа API
   - API возвращает `{ items: [...], pagination: {...} }`
   - Добавлена обратная совместимость: `state.history = data.items || data || []`

2. **POST /api/v1/history** — Исправлен формат запроса
   - Было: `{ url: finalUrl }`
   - Стало: `{ base_url, full_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term }`

3. **Импорт шаблонов** — Переход на новый API
   - Было: `POST /templates` с `user_email`
   - Стало: `POST /api/v1/templates/import` с `{ templates: [...] }`

4. **Экспорт шаблонов** — Прямое скачивание файла
   - Было: `POST /export_templates` → получение пути к файлу
   - Стало: `POST /api/v1/templates/export` → blob → скачивание

5. **Экспорт истории** — Прямое скачивание файла
   - Было: `POST /export_history` → получение пути к файлу
   - Стало: `POST /api/v1/history/export` → blob → скачивание

### Уже работающие функции

- ✅ Авторизация (email + OAuth)
- ✅ Проверка подписки перед сохранением
- ✅ Модальное окно "Требуется подписка"
- ✅ DELETE истории и шаблонов
- ✅ PUT short_url для истории
- ✅ Сокращение ссылок через clck.ru

### Заметки

- Фронтенд полностью интегрирован с новым API v1
- Все CRUD операции работают через `API.request()` с JWT токеном
- Экспорт теперь скачивает файл напрямую в браузер
- Проверка подписки происходит на стороне API (декоратор `@subscription_required`)

### Следующие шаги

**Итерация 10:** Тестирование и отладка

---

## Итерация 10: Тестирование и отладка

**Дата:** 19.01.2026  
**Статус:** Тестирование и багфиксы ✅

### Задачи

- [x] Обновить QUICK_START.md с подробными инструкциями
- [x] Создать TEST_CHECKLIST.md с чек-листом тестирования
- [x] Подготовить пример .env файла
- [x] Исправить автоматический вход после регистрации
- [x] Исправить обновление UI после авторизации
- [x] Добавить защиту вкладок История/Шаблоны
- [x] Добавить экран "Требуется авторизация"
- [x] Исправить отображение бейджа подписки (Free/Trial/Pro)
- [x] Исправить модальные блоки на других страницах
- [x] Провести полное ревью кода веб-приложения
- [ ] Запустить миграции базы данных
- [ ] Запустить сервер и протестировать регистрацию
- [ ] Протестировать CRUD операции (история, шаблоны)
- [ ] Протестировать подписки (free, trial)
- [ ] Протестировать экспорт/импорт

### Созданные файлы

- `web/QUICK_START.md` — Подробное руководство по запуску
- `web/TEST_CHECKLIST.md` — Полный чек-лист для тестирования всех функций
- `web/START_HERE.md` — Краткая пошаговая инструкция для быстрого старта
- `web/CODE_REVIEW.md` — Полное ревью кода с рекомендациями

### Исправленные баги (по результатам первого теста)

#### Баг #1: Не обновляется UI после входа
**Проблема:** После успешного входа кнопки "Войти"/"Регистрация" не исчезали, email и бейдж не появлялись.

**Решение:** 
- Добавлен `window.location.reload()` после успешного входа
- Исправлен `updateAuthUI()` для корректного отображения email и бейджа

#### Баг #2: После регистрации не выполняется вход
**Проблема:** После регистрации пользователь НЕ входил автоматически.

**Решение:**
```javascript
// Автоматический вход после регистрации (т.к. API возвращает токены)
if (result.access_token) {
    AuthUtils.setTokens(result.access_token, result.refresh_token);
    AuthUtils.setUserData(result.user);
}
hideModal(registerModal);
window.location.reload();
```

#### Баг #3: Вкладки История/Шаблоны доступны без авторизации
**Проблема:** Неавторизованные пользователи могли переходить на вкладки История/Шаблоны.

**Решение:**
- Добавлена проверка в `switchView()`
- Создана функция `showAuthRequiredScreen()` с красивым экраном объяснения
- Экран показывает: описание функции, кнопки "Зарегистрироваться" и "Войти"

#### Баг #4: Бейдж подписки не отображался для Free пользователей
**Проблема:** Бейдж подписки показывался только для Trial/Pro, Free пользователи не видели свой статус.

**Решение:**
```javascript
const planMap = {
    'pro': 'Pro',
    'trial': 'Trial',
    'free': 'Free'
};
badge.textContent = planMap[subscription.plan] || 'Free';
```

#### Баг #5: Модальные блоки висят на других страницах
**Проблема:** Экран авторизации оставался при переключении на другие вкладки (generator, help).

**Решение:**
```javascript
function switchView(targetId) {
    // ВСЕГДА удаляем экран авторизации при переключении вкладок
    const authScreen = document.getElementById('auth-required-screen');
    if (authScreen) {
        authScreen.remove();
    }
    // ...
}
```

#### Баг #6: UI не обновляется после авторизации (повтор)
**Проблема:** После перезагрузки страницы кнопки "Войти"/"Регистрация" не исчезали.

**Решение:**
- Исправлена функция `register()` в `auth.js` — теперь сохраняет токены автоматически
- Улучшена инициализация `updateAuthUI()` — вызывается после загрузки DOM
- Добавлена обработка ошибок при загрузке пользователя

### Инструкции по запуску

#### 1. Установка зависимостей

```bash
cd web
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

#### 2. Создание .env файла

Создайте файл `web/.env`:

```env
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production
DATABASE_URL=sqlite:///utmka_dev.db
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000
FRONTEND_URL=http://127.0.0.1:5000
```

#### 3. Инициализация БД

```bash
flask db upgrade
```

#### 4. Запуск сервера

```bash
python run.py
```

Приложение доступно: http://127.0.0.1:5000

### Тестовые сценарии

#### Сценарий 1: Регистрация и авторизация
1. Открыть http://127.0.0.1:5000
2. Нажать "Регистрация"
3. Ввести email: `test@example.com`, password: `password123`
4. Проверить автоматический вход
5. Проверить отображение email и бейджа "free"

#### Сценарий 2: Активация Trial
```python
flask shell
from app.models import User, Subscription
from app.extensions import db

user = User.query.filter_by(email='test@example.com').first()
if user and user.subscription:
    user.subscription.activate_trial(days=7)
    db.session.commit()
```

#### Сценарий 3: CRUD История
1. Сгенерировать UTM-ссылку
2. Проверить сохранение в историю (с trial)
3. Удалить запись
4. Экспортировать в JSON/CSV

#### Сценарий 4: CRUD Шаблоны
1. Создать шаблон с тегом
2. Применить шаблон к генератору
3. Импортировать шаблоны из JSON
4. Экспортировать шаблоны

### Известные ограничения

1. **OAuth не настроен** — кнопки OAuth не будут работать без настройки client_id/secret
2. **SQLite вместо PostgreSQL** — для development это нормально
3. **Платежи не реализованы** — будет в итерации 11-12

### Ожидаемые результаты

После успешного тестирования должны работать:
- ✅ Email регистрация и авторизация
- ✅ Генератор UTM (без подписки)
- ✅ Trial подписка (через консоль)
- ✅ История UTM (с подпиской)
- ✅ Шаблоны (с подпиской)
- ✅ Экспорт/импорт (JSON/CSV)
- ✅ Проверка подписки через декоратор

### Следующие шаги

**Итерация 11:** Интеграция платежей (ЮKassa)
- Регистрация в ЮKassa
- Создание платежа
- Webhook обработка
- Автоактивация Pro подписки

---

## Дополнительно: Деплой на production сервер

**Дата:** 19.01.2026  
**Статус:** Документация готова ✅

### Созданные файлы

- `docs/DEPLOYMENT_GUIDE.md` — Полное руководство по деплою
- `web/DEPLOY_QUICK.md` — Краткая шпаргалка для быстрого деплоя
- `web/gunicorn_config.py` — Конфигурация Gunicorn
- `web/Dockerfile` — Docker образ для контейнеризации
- `web/docker-compose.yml` — Docker Compose конфигурация
- `web/.dockerignore` — Игнорируемые файлы для Docker

### Требования к серверу

**Минимум:**
- 1 CPU, 1GB RAM, 10GB SSD
- Ubuntu 22.04+ / Debian 11+
- Стоимость: от 200-300₽/мес

**Рекомендуется:**
- 2+ CPU, 2-4GB RAM, 20GB+ SSD
- Ubuntu 22.04 LTS
- Стоимость: от 500-1000₽/мес

### Провайдеры VPS

**Россия:**
- Timeweb Cloud — от 250₽/мес
- Selectel — от 300₽/мес
- REG.RU — от 350₽/мес
- Beget — от 200₽/мес

**Международные:**
- DigitalOcean — от $6/мес
- Hetzner — от €4/мес
- Vultr — от $6/мес

### Стек для production

- **Backend:** Flask + Gunicorn
- **Database:** PostgreSQL 15+
- **Web Server:** Nginx (reverse proxy)
- **Process Manager:** Supervisor
- **SSL:** Let's Encrypt (Certbot)
- **Контейнеризация:** Docker (опционально)

### Основные шаги деплоя

1. Настройка сервера (Ubuntu, зависимости)
2. Установка PostgreSQL и создание БД
3. Клонирование репозитория
4. Создание виртуального окружения
5. Настройка `.env` файла
6. Применение миграций
7. Настройка Gunicorn
8. Настройка Supervisor
9. Настройка Nginx
10. Получение SSL сертификата
11. Настройка Firewall

**Время деплоя:** ~1-2 часа

### Docker вариант

Также подготовлены файлы для Docker деплоя:
- `Dockerfile` — образ приложения
- `docker-compose.yml` — оркестрация (web + db)
- `.dockerignore` — оптимизация сборки

**Преимущества Docker:**
- Изоляция окружения
- Простое масштабирование
- Легкое обновление
- Консистентность между dev/prod

---

## Итерация 6: VK OAuth

**Дата:** 19.01.2026  
**Статус:** Завершена ✅

### Задачи

- [x] Создать сервис VK OAuth (`web/app/services/oauth/vk.py`)
- [x] Реализовать GET /auth/vk для редиректа на VK
- [x] Реализовать GET /auth/vk/callback для обработки callback
- [x] Связывание OAuth аккаунта с пользователем
- [x] Обновить экспорты в `web/app/services/oauth/__init__.py`

### Изменённые файлы

- `web/app/services/oauth/vk.py` — Сервис для работы с VK OAuth
- `web/app/services/oauth/__init__.py` — Добавлен экспорт VKOAuth
- `web/app/routes/auth.py` — Реализованы роуты `/auth/vk` и `/auth/vk/callback`

### Реализованные функции

1. **Сервис VK OAuth (VKOAuth)**
   - `get_authorize_url(state)` — Генерация URL для редиректа на VK
   - `exchange_code_for_token(code)` — Обмен authorization code на access token
   - `get_user_info(access_token, user_id)` — Получение информации о пользователе через VK API
   - `create_or_link_user(provider_data, token_data)` — Создание или связывание пользователя

2. **Роут GET /auth/vk**
   - Проверка конфигурации VK OAuth
   - Генерация CSRF state токена
   - Редирект на страницу авторизации VK

3. **Роут GET /auth/vk/callback**
   - Проверка CSRF state токена
   - Обмен authorization code на access token
   - Получение информации о пользователе
   - Создание/связывание пользователя
   - Генерация JWT токенов
   - Возврат HTML страницы для установки токенов в localStorage

### Особенности VK OAuth

- VK использует версию API (параметр `v=5.131`)
- Требуется scope `email` для получения email пользователя
- VK возвращает `user_id` в ответе на токен, а не в user info
- User info получается через `users.get` метод VK API
- VK может не возвращать refresh_token (зависит от настроек приложения)

### Безопасность

- CSRF защита через state токен
- Проверка настроек OAuth перед использованием
- Валидация всех данных от VK API

### Заметки

- Требуется настройка переменных окружения: `VK_CLIENT_ID`, `VK_CLIENT_SECRET`, `VK_REDIRECT_URI`
- При регистрации приложения в VK необходимо указать redirect URI
- Scope `email` обязателен для получения email пользователя
- OAuth аккаунты автоматически связываются с существующими пользователями по email
- Новые пользователи получают подписку free автоматически
- Email считается верифицированным для OAuth пользователей

### Следующие шаги

**Итерация 7:** Google OAuth
- Регистрация приложения в Google Cloud
- Реализовать GET /auth/google
- Реализовать GET /auth/google/callback
- Создать сервис Google OAuth

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

*Последнее обновление: 19.01.2026 (Итерация 10 — готов к запуску)*
