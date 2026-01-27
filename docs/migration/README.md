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
| [STEP_1C_WEB_READY.md](STEP_1C_WEB_READY.md) | Этап 1C: Подготовка к Web | ✅ Выполнено |
| [STEP_2_FRONTEND.md](STEP_2_FRONTEND.md) | Этап 2: Разбиение frontend | ✅ Выполнено |
| **[STEP_3_PREPARATION.md](STEP_3_PREPARATION.md)** | **Подготовка к STEP_3** | 📋 **Справка** |
| [STEP_3_WINDOWS_INSTALLER.md](STEP_3_WINDOWS_INSTALLER.md) | Этап 3: Windows установщик | ✅ Выполнено |
| [STEP_4_MACOS.md](STEP_4_MACOS.md) | Этап 4: macOS сборка | ⏳ Будущее |
| [STEP_5_WEB_DEPLOY.md](STEP_5_WEB_DEPLOY.md) | Этап 5: Web deployment | ⏳ Будущее |
| [AI_WORKFLOW.md](AI_WORKFLOW.md) | Гайд по работе с AI | ✅ Актуально |

---

## Порядок выполнения

```
ФАЗА 1: DESKTOP (текущая)
═══════════════════════════════════════════════════════════════
STEP_1 ──► STEP_1B ──► STEP_1C ──► STEP_2 ──► STEP_3 ──► STEP_4
структура  SQLAlchemy  Web-ready   frontend   Windows    macOS
   ✅         ✅          ✅          ✅         ✅         ⏳

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

### ✅ Выполнено (STEP_1C)

- [x] Расширить User модель: OAuth поля (google_id, yandex_id), profile, subscription
- [x] Добавить модель Subscription (план, платёж, статус)
- [x] Создать WebConfig для PostgreSQL
- [x] Создать ProductionConfig (connection pooling)
- [x] Добавить auth.py routes (заготовка: login, OAuth Google/Яндекс, /me)
- [x] Обновить create_app() для web/production конфигов

**Примечание:** Миграция user_email → user_id откладывается до запуска Web-версии

### ✅ Выполнено (STEP_2)

- [x] Монолитный `index.html` (3589 строк) разбит на модули
- [x] `frontend/index.html` — чистый HTML (742 строки, без inline JS)
- [x] ES6 модули: `app.js`, `ui.js`, `api.js`, `translations.js`, `utils.js`
- [x] CSS извлечён в `frontend/css/main.css`
- [x] Backend routing обновлён: web → `frontend/`, desktop → root
- [x] Все API routes протестированы (CRUD history/templates: OK)
- [x] JS import/export консистентность проверена

**Примечание:** CDN зависимости (Tailwind, Lucide, Flatpickr) сохранены — их удаление требует сборщик (Vite/Webpack), выходит за рамки этого этапа

### ✅ Выполнено (STEP_3)

- [x] Исправлен `src/api/__init__.py` — desktop mode использует модульный `frontend/`
- [x] Создана структура сборки в `installers/windows/`
- [x] PyInstaller spec файл с entry point `src/desktop/main.py`
- [x] Inno Setup скрипт (GUID: 0F293E65-2450-42B0-BC01-A90E29F64D0D)
- [x] Автоматизированный скрипт сборки `installers/windows/build.py`
- [x] Собрано приложение: `dist/UTMka/` (95 MB)
- [x] Создан установщик: `dist/UTMka-Setup-3.0.0.exe` (32 MB)

**Результат:** Готовый Windows установщик с автоматическим размещением данных в AppData

### 🔧 Текущий фокус: Отладка Windows Desktop

Перед переходом к macOS и Web необходимо:
- [ ] Исправить ошибки в работе приложения (frontend + backend)
- [ ] Исправить ошибки стилей
- [ ] Собрать обратную связь от пользователей Windows-версии
- [ ] Стабилизировать desktop-версию

### ⏳ Будущие этапы

- [ ] STEP_4: macOS build (после отладки Windows)
- [ ] STEP_5: Web deployment (после решения вопросов и рекомендаций пользователей desktop)

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

Текущий фокус: Отладка Windows Desktop (bugfix frontend + backend)

Приоритеты:
1. Исправить баги и стили в Windows desktop-приложении
2. macOS — только после стабильной Windows-версии
3. Web — только после обратной связи пользователей desktop

Критические файлы для правок:
- frontend/index.html — HTML разметка
- frontend/js/ — app.js, ui.js, api.js, translations.js, utils.js
- frontend/css/main.css — стили
- src/api/routes/ — history.py, templates.py, auth.py
- src/core/models.py — SQLAlchemy модели
- src/core/config.py — конфигурации

Инфраструктура:
- python run_desktop.py --dev  — запуск в браузере (dev)
- python run_desktop.py        — запуск desktop (pywebview)
- python rebuild.py             — пересборка exe
- python rebuild.py --run       — пересборка + запуск

Ограничения:
- Desktop использует user_email (не user_id)
- Не ломать совместимость с текущей БД
- Web будет позже — не вносить breaking changes в API
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
