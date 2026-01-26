# Целевая архитектура UTMka 3.0

## Текущая структура (проблемы)

```
utmKA-2.0-2/
├── app.py                    # 830 строк - Flask + WebView (всё в одном)
├── index.html                # 3590 строк - HTML + CSS + JS (всё в одном)
├── web/app/                  # Отдельный Flask API (дублирование!)
└── ...
```

**Проблемы:**
1. Дублирование: `app.py` и `web/app/` делают одно и то же
2. Монолитный frontend: весь JS в одном HTML файле
3. Данные рядом с exe: при обновлении теряются

---

## Целевая структура

```
utmka/
├── src/                           # Исходный код
│   ├── core/                      # Бизнес-логика (общая)
│   │   ├── __init__.py
│   │   ├── models.py              # SQLAlchemy модели
│   │   ├── services.py            # Бизнес-логика
│   │   ├── migrations.py          # Миграции БД
│   │   └── config.py              # Конфигурация
│   │
│   ├── api/                       # Flask API
│   │   ├── __init__.py            # create_app()
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── utm.py
│   │   │   └── main.py
│   │   ├── schemas/               # Marshmallow schemas
│   │   └── middleware/
│   │
│   └── desktop/                   # Desktop wrapper
│       ├── __init__.py
│       ├── main.py                # Точка входа
│       └── utils.py               # Платформо-зависимые функции
│
├── frontend/                      # Frontend (модульный)
│   ├── index.html                 # Только разметка
│   ├── css/
│   │   ├── main.css              # Базовые стили
│   │   ├── components.css        # Компоненты
│   │   └── utilities.css         # Tailwind-подобные утилиты
│   └── js/
│       ├── main.js               # Точка входа
│       ├── api.js                # HTTP клиент
│       ├── state.js              # Состояние приложения
│       ├── router.js             # Навигация
│       └── components/
│           ├── generator.js      # UTM генератор
│           ├── history.js        # История
│           ├── templates.js      # Шаблоны
│           ├── toast.js          # Уведомления
│           └── modal.js          # Модальные окна
│
├── installers/                    # Установщики
│   ├── windows/
│   │   ├── setup.iss             # Inno Setup скрипт
│   │   ├── build.py              # Скрипт сборки
│   │   └── UTMka.spec            # PyInstaller spec
│   └── macos/
│       ├── build.py
│       ├── UTMka.spec
│       └── create_dmg.sh
│
├── assets/                        # Статические ресурсы
│   ├── logo/
│   │   ├── logoutm.ico
│   │   ├── logoutm.icns
│   │   └── logoutm.png
│   └── templates/                 # Примеры для импорта
│       ├── templates_example.json
│       └── templates_example.csv
│
├── scripts/                       # Скрипты разработки
│   ├── dev.py                     # Запуск в dev режиме
│   └── build_all.py               # Сборка всех платформ
│
├── tests/                         # Тесты
│   ├── test_api.py
│   ├── test_services.py
│   └── conftest.py
│
├── docs/                          # Документация
│   └── migration/                 # Эти инструкции
│
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## Структура данных пользователя

### Windows
```
C:\Users\<user>\AppData\Roaming\UTMka\
├── databases/
│   └── utmka.db              # SQLite база
├── exports/                  # Экспортированные файлы
├── logs/
│   └── app.log
└── config.json               # Настройки
```

### macOS
```
~/Library/Application Support/UTMka/
├── databases/
│   └── utmka.db
├── exports/
├── logs/
│   └── app.log
└── config.json
```

---

## Поток данных

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│              (index.html + JS модули)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP (localhost:5000)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    src/api/                                  │
│              (Flask REST API)                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   src/core/                                  │
│           (Бизнес-логика, SQLAlchemy)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  SQLite Database                             │
│            (в AppData, НЕ рядом с exe)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Преимущества новой архитектуры

| Аспект | Было | Станет |
|--------|------|--------|
| Код backend | 2 версии (app.py и web/app) | 1 версия в src/api |
| Frontend | 3590 строк в 1 файле | Модули по 100-200 строк |
| Данные | Рядом с exe (теряются) | В AppData (сохраняются) |
| Обновление | Полная переустановка | Только exe, данные целы |
| Тестирование | Невозможно | Unit тесты |

---

## Desktop vs Web архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      src/core/                              │
│              (ОБЩАЯ бизнес-логика)                          │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │ models.py │  │services.py│  │ config.py │               │
│  │           │  │           │  │           │               │
│  │ - User    │  │ - UTM     │  │ - Desktop │               │
│  │ - History │  │   Service │  │ - Web     │               │
│  │ - Template│  │           │  │ - Dev     │               │
│  │ - Sub*    │  │           │  │           │               │
│  └───────────┘  └───────────┘  └───────────┘               │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│    DESKTOP      │       │      WEB        │
│                 │       │                 │
│ DesktopConfig   │       │ WebConfig       │
│ SQLite (local)  │       │ PostgreSQL      │
│ user_email      │       │ user_id + FK    │
│ No auth         │       │ OAuth + JWT     │
│ Free forever    │       │ Subscriptions   │
│ pywebview       │       │ gunicorn        │
│                 │       │                 │
│ Windows + macOS │       │ Cloud hosted    │
└─────────────────┘       └─────────────────┘
```

### Конфигурации:

| Конфиг | База данных | Auth | Подписки |
|--------|-------------|------|----------|
| `DesktopConfig` | SQLite (AppData) | email string | Нет |
| `DevelopmentConfig` | SQLite (./utm_data.db) | email string | Нет |
| `WebConfig` | PostgreSQL | OAuth + JWT | Да |
| `ProductionConfig` | PostgreSQL (pool) | OAuth + JWT | Да |

### Один код — разные режимы:

```python
# Desktop
app = create_app('desktop')  # SQLite, no auth

# Web
app = create_app('web')      # PostgreSQL, OAuth

# Dev
app = create_app('development')  # SQLite, debug
```

---

## Модели данных

### Текущее состояние (v2.x):

```
users
├── id
├── email (unique)
└── password_hash

history_new
├── id
├── user_email ← string, not FK!
├── base_url
├── full_url
├── utm_*
├── short_url
└── created_at

templates
├── id
├── user_email ← string, not FK!
├── name
├── utm_*
├── tag_*
└── created_at
```

### Целевое состояние (v3.x Web):

```
users
├── id
├── email (unique)
├── password_hash
├── google_id (nullable)
├── yandex_id (nullable)
├── name
├── avatar_url
├── subscription_type
├── subscription_expires_at
├── created_at
└── last_login_at

history
├── id
├── user_id ← FK to users!
├── base_url
├── full_url
├── utm_*
├── short_url
└── created_at

templates
├── id
├── user_id ← FK to users!
├── name
├── utm_*
├── tag_*
└── created_at

subscriptions
├── id
├── user_id ← FK
├── plan_type
├── started_at
├── expires_at
├── payment_*
└── status
```

---

## Быстродействие

### Принципы:

1. **SQLite для Desktop** — максимально быстрая локальная БД
2. **Connection pooling для Web** — переиспользование подключений
3. **Индексы** — на user_id/user_email, created_at
4. **Лимиты** — LIMIT 500 для списков
5. **Кэширование** — Cache-Control headers
6. **Lazy loading** — данные по требованию

### Оптимизации SQLite (Desktop):

```python
SQLALCHEMY_ENGINE_OPTIONS = {
    'connect_args': {
        'timeout': 30,
        'check_same_thread': False
    }
}

# При инициализации
PRAGMA journal_mode = WAL
PRAGMA synchronous = NORMAL
PRAGMA cache_size = 10000
```

### Оптимизации PostgreSQL (Web):

```python
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 10,
    'pool_recycle': 3600,
    'pool_pre_ping': True
}
```
