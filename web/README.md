# UTMka Web Service

Веб-версия сервиса для генерации UTM-меток с системой подписок и авторизации.

## Быстрый старт

```bash
# Создать виртуальное окружение
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Установить зависимости
pip install -r requirements.txt

# Создать .env файл
cp .env.example .env
# Отредактировать .env с вашими настройками

# Запустить сервер
python run.py
```

## Структура проекта

```
web/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── config.py            # Конфигурация
│   ├── extensions.py        # Flask extensions
│   ├── models/              # SQLAlchemy модели
│   ├── routes/               # API эндпоинты
│   ├── services/            # Бизнес-логика
│   ├── utils/               # Утилиты
│   └── templates/           # Jinja2 шаблоны
├── migrations/               # Alembic миграции
├── tests/                   # Тесты
├── requirements.txt         # Зависимости
├── .env.example             # Пример .env
└── run.py                   # Точка входа
```

## Документация

Полная документация находится в `../docs/`:
- `WEB_SERVICE_PLAN.md` - План разработки
- `API_SPECIFICATION.md` - Спецификация API
- `DATABASE_SCHEMA.md` - Схема базы данных
- `DEVELOPMENT_GUIDE.md` - Руководство разработчика
