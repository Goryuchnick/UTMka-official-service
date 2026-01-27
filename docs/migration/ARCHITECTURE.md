# Целевая архитектура UTMka 3.0

## Текущая структура (после STEP_1 + STEP_2 + STEP_3)

```
utmKA-2.0-2/
├── src/                          # ✅ Модульный backend
│   ├── core/                     # models.py, config.py, services.py
│   ├── api/                      # Flask create_app() + blueprints
│   └── desktop/                  # pywebview wrapper
├── frontend/                     # ✅ Модульный frontend (ES6)
│   ├── index.html                # 742 строки (чистый HTML)
│   ├── css/main.css              # Стили
│   └── js/                       # app.js, ui.js, api.js, translations.js, utils.js
├── app.py                        # ⚠️ Legacy (для текущих desktop билдов)
├── index.html                    # ⚠️ Legacy (3589 строк, для desktop билдов)
└── web/app/                      # ⚠️ Legacy (будет заменено src/api/)
```

**Решённые проблемы:**
1. ~~Дублирование~~ → Единый `src/api/` для desktop и web ✅
2. ~~Монолитный frontend~~ → ES6 модули в `frontend/js/` ✅
3. ~~Данные рядом с exe~~ → Config с AppData путями (DesktopConfig) ✅
4. ~~PyInstaller spec~~ → Обновлён на `src/desktop/main.py` ✅
5. ~~Windows установщик~~ → Готов (dist/UTMka-Setup-3.0.0.exe) ✅

**Оставшиеся задачи:**
- macOS сборка (STEP_4)
- Удаление CDN зависимостей (требует build tooling)
- Web deployment (STEP_5)

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
├── frontend/                      # Frontend (модульный ES6)
│   ├── index.html                 # 742 строки (HTML, без inline JS)
│   ├── css/
│   │   └── main.css              # Glassmorphism, анимации, утилиты
│   ├── js/
│   │   ├── app.js                # Entry point + обработчики событий (1130 строк)
│   │   ├── ui.js                 # State management + rendering (314 строк)
│   │   ├── api.js                # HTTP fetch + initialization (258 строк)
│   │   ├── translations.js       # i18n RU/EN (210 строк)
│   │   ├── utils.js              # Helpers (128 строк)
│   │   └── components/           # (зарезервировано)
│   └── logo/
│       └── logoutm.png           # Логотип
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

| Аспект | Было | Стало |
|--------|------|-------|
| Код backend | 2 версии (app.py и web/app) | ✅ 1 версия в src/api |
| Frontend | 3590 строк в 1 файле | ✅ 5 ES6 модулей + чистый HTML |
| Данные | Рядом с exe (теряются) | ✅ В AppData (сохраняются) |
| Обновление | Полная переустановка | ✅ Только exe, данные целы |
| Тестирование | Невозможно | ⏳ Структура готова (tests/) |

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
