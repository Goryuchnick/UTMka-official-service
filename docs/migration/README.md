# UTMka 3.0 Migration Guide

## Обзор

План модернизации проекта UTMka до версии 3.0 с поддержкой:
- **Desktop** (Windows, macOS) — локальная SQLite, без авторизации
- **Web** (будущее) — PostgreSQL, OAuth (Google/Яндекс), подписки

**Стратегия:** Монорепо с общим core и разными конфигурациями.

---

## Содержание папки

| Файл | Описание | Статус |
|------|----------|--------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Целевая архитектура | ✅ Актуально |
| [STEP_1_RESTRUCTURE.md](STEP_1_RESTRUCTURE.md) | Этап 1: Структура папок | ✅ Выполнено |
| [STEP_1B_SQLALCHEMY.md](STEP_1B_SQLALCHEMY.md) | Этап 1B: SQLAlchemy интеграция | ✅ Выполнено |
| [STEP_1C_WEB_READY.md](STEP_1C_WEB_READY.md) | Этап 1C: Подготовка к Web | ⏳ Ожидает |
| [STEP_2_FRONTEND.md](STEP_2_FRONTEND.md) | Этап 2: Разбиение frontend | ⏳ Ожидает |
| [STEP_3_WINDOWS_INSTALLER.md](STEP_3_WINDOWS_INSTALLER.md) | Этап 3: Windows установщик | ⏳ Ожидает |
| [STEP_4_MACOS.md](STEP_4_MACOS.md) | Этап 4: macOS сборка | ⏳ Ожидает |
| [STEP_5_WEB_DEPLOY.md](STEP_5_WEB_DEPLOY.md) | Этап 5: Web deployment | ⏳ Будущее |
| [AI_WORKFLOW.md](AI_WORKFLOW.md) | Гайд по работе с AI | ✅ Актуально |

---

## Порядок выполнения

```
ФАЗА 1: DESKTOP (текущая)
═══════════════════════════════════════════════════════════════
STEP_1 ──► STEP_1B ──► STEP_1C ──► STEP_2 ──► STEP_3 ──► STEP_4
структура  SQLAlchemy  Web-ready   frontend   Windows    macOS
   ✅         ✅          ⏳          ⏳         ⏳         ⏳

ФАЗА 2: WEB (будущее)
═══════════════════════════════════════════════════════════════
STEP_5 ──► OAuth ──► Subscriptions ──► Deploy
  ⏳         ⏳           ⏳              ⏳
```

---

## Архитектура: Desktop vs Web

```
┌─────────────────────────────────────────────────────────────┐
│                      src/core/                              │
│         (общая бизнес-логика для всех платформ)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ models.py│  │services.py│  │ config.py│  │repository│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│    DESKTOP      │       │      WEB        │
│  DesktopConfig  │       │   WebConfig     │
│  SQLite (local) │       │  PostgreSQL     │
│  No auth        │       │  OAuth + Email  │
│  Free           │       │  Subscriptions  │
│  pywebview      │       │  gunicorn       │
└─────────────────┘       └─────────────────┘
```

---

## Текущий статус

### ✅ Выполнено

- [x] Удалены дублирующиеся файлы
- [x] **STEP_1:** Структура папок создана
  - `src/core/` — models, config, services
  - `src/api/` — Flask blueprints
  - `src/desktop/` — pywebview wrapper
  - `assets/`, `frontend/`, `installers/`, `tests/`
- [x] **STEP_1B:** SQLAlchemy интеграция
  - Routes переписаны на SQLAlchemy ORM
  - Пути к БД исправлены (dev: текущая директория, prod: AppData)
  - SQLAlchemy инициализирован с Flask
  - Удалены дублирующиеся функции из routes

### ⏳ Ожидает (STEP_1C)

- [ ] Расширить User модель: OAuth поля (google_id, yandex_id)
- [ ] Добавить модель Subscription
- [ ] Создать WebConfig для PostgreSQL
- [ ] Создать ProductionConfig
- [ ] Добавить auth.py routes (заготовка)
- [ ] Обновить create_app() для web/production конфигов

**Примечание:** Миграция user_email → user_id откладывается до запуска Web-версии

### ⏳ Будущие этапы

- [ ] STEP_2: Frontend модули
- [ ] STEP_3: Windows installer
- [ ] STEP_4: macOS build
- [ ] STEP_5: Web deployment

---

## Рекомендуемые модели AI

| Этап | 🎯 Основная | 💡 Сложные задачи |
|------|-------------|-------------------|
| 1, 1B, 1C | **Sonnet 4** | Opus 4.5 для архитектуры |
| 2 Frontend | **Gemini 3 Flash** | Sonnet 4.5 для компонентов |
| 3, 4 Build | **GPT-5.2 Codex** | Sonnet 4.5 для адаптации |
| 5 Web | **Sonnet 4.5** | Opus 4.5 для безопасности |

---

## Быстрый старт для AI агента

### Контекст для нового чата:

```
Проект: UTMka — генератор UTM-ссылок
Цель: Кроссплатформенное приложение (Desktop + Web)

Текущий этап: STEP_1C — Подготовка к Web версии

Критические файлы:
- docs/migration/STEP_1C_WEB_READY.md — инструкции
- src/core/models.py — расширить User модель (OAuth поля)
- src/core/config.py — добавить WebConfig для PostgreSQL
- src/api/routes/auth.py — создать заготовку для OAuth

Долгосрочные цели:
1. Desktop: Windows + macOS, SQLite, pywebview
2. Web: PostgreSQL, OAuth (Google/Яндекс), подписки
3. Максимальное быстродействие

Ограничения:
- Desktop версия продолжает использовать user_email
- Web версия будет использовать user_id (миграция позже)
- Не ломать совместимость с текущей БД
- Поэтапная миграция
```

---

## Ветвление (опционально)

Если потребуется изоляция:

```bash
main          # стабильная desktop версия
├── develop   # разработка
├── web       # web-версия (после STEP_5)
└── release/* # релизы
```

Пока рекомендуется работать в `main` — разделение не требуется до STEP_5.
