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
