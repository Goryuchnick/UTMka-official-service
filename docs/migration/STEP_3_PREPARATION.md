# STEP 3: Подготовка к сборке Windows

## Текущее состояние проекта (27 января 2026)

### ✅ Выполненные этапы

- **STEP_1:** Структура папок создана (`src/core/`, `src/api/`, `src/desktop/`)
- **STEP_1B:** SQLAlchemy ORM интегрирован, все routes работают
- **STEP_1C:** Модели расширены для Web (OAuth, Subscriptions)
- **STEP_2:** Frontend модульный (ES6 в `frontend/`)

### 📊 Результаты проверки (27.01.2026)

| Тест | Результат |
|------|-----------|
| Python imports (models, config, services) | ✅ OK |
| Flask app creation (development) | ✅ OK |
| Flask app creation (desktop) | ✅ OK |
| API routes (CRUD history/templates) | ✅ OK |
| Frontend ES6 modules | ✅ OK |
| Static file serving | ✅ OK |

### 📁 Текущая структура

```
utmKA-2.0-2/
├── src/
│   ├── core/           # Модели, конфиг, services
│   ├── api/            # Flask blueprints
│   └── desktop/        # pywebview wrapper
│       └── main.py     # ✅ ENTRY POINT для сборки
│
├── frontend/           # ✅ Модульный frontend (ES6)
│   ├── index.html      # 742 строки (чистый HTML)
│   ├── css/main.css
│   └── js/             # app.js, ui.js, api.js, translations.js, utils.js
│
├── logo/               # logoutm.ico, logoutm.png
├── templates_example*.json/csv
│
├── app.py              # ⚠️ LEGACY (старый entry point)
├── index.html          # ⚠️ LEGACY (3589 строк, монолит)
└── UTMka.spec          # ⚠️ LEGACY (указывает на app.py)
```

### ⚠️ Известные ограничения (не блокируют)

1. **Старая БД** (`utm_data.db`) не имеет новых колонок OAuth — не критично для desktop
2. **Старый spec** в корне указывает на `app.py` — нужен новый в `installers/windows/`
3. **CDN зависимости** (Tailwind, Lucide, Flatpickr) — работают, удаление опционально
4. **Нет автотестов** — `tests/` пуст, но CRUD проверен вручную

### 🔧 Что нужно исправить перед сборкой

#### 1. Desktop mode должен использовать `frontend/`

**Файл:** `src/api/__init__.py`

**Текущий код:**
```python
if config_name == 'desktop':
    static_folder = get_resource_path('.')  # ❌ Корень
    template_folder = get_resource_path('.')
else:
    static_folder = get_resource_path('frontend')  # ✅ Модульный
    template_folder = get_resource_path('frontend')
```

**Нужно изменить на:**
```python
# Все режимы используют frontend/ (модульный)
static_folder = get_resource_path('frontend')
template_folder = get_resource_path('frontend')
```

**Примечание:** Старый монолитный `index.html` в корне больше не нужен — все используют `frontend/`

#### 2. Создать новый PyInstaller spec

**Путь:** `installers/windows/UTMka.spec`

**Ключевые изменения:**
- Entry: `src/desktop/main.py` (не `app.py`)
- Datas: `frontend/`, `logo/`, `templates_example*.json`
- Hidden imports: добавить `sqlalchemy.orm`, `werkzeug.security`

#### 3. Протестировать локально

```bash
# Проверить что desktop mode работает с frontend/
python -c "from src.desktop.main import main; main()"

# Должен:
# 1. Запуститься без ошибок
# 2. Открыть окно pywebview
# 3. Загрузить модульный frontend (742 строк HTML)
# 4. Создать БД в %AppData%\Roaming\UTMka\databases\
```

---

## Быстрый старт для следующего чата

```
Проект: UTMka — генератор UTM-ссылок
Текущий этап: STEP_3 — Windows портативная сборка

Выполнено:
- STEP_1/1B/1C: Модульная структура backend (src/)
- STEP_2: Модульный frontend (frontend/)
- Все API routes протестированы

Нужно сделать:
1. Исправить src/api/__init__.py — desktop mode → frontend/
2. Создать installers/windows/UTMka.spec (entry: src/desktop/main.py)
3. Создать installers/windows/build.py
4. Собрать PyInstaller + Inno Setup
5. Протестировать установщик

Критические файлы:
- docs/migration/STEP_3_WINDOWS_INSTALLER.md — полная инструкция
- src/desktop/main.py — entry point
- src/api/__init__.py — routing (нужно исправить)
- UTMka.spec (корень) — LEGACY, не использовать

Текущие пути:
- Entry: src/desktop/main.py
- Frontend: frontend/ (ES6 modules)
- Logo: logo/logoutm.ico
- Templates: templates_example*.json (корень)
- Data dir: %AppData%\Roaming\UTMka\
```

---

## Контрольные вопросы перед сборкой

- [ ] `src/desktop/main.py` запускается локально?
- [ ] `frontend/index.html` загружается (742 строки)?
- [ ] БД создаётся в `%AppData%\Roaming\UTMka\databases\`?
- [ ] Все CRUD операции работают?
- [ ] PyInstaller 6.15+ установлен?
- [ ] Inno Setup 6 установлен?

Если ответ "Да" на все вопросы → готов к STEP_3.
