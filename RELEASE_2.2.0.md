# UTMka 2.2.0 — Автоматические обновления и улучшения

**Дата релиза:** 30 января 2026

---

## Новые возможности

### Автоматические обновления (OTA)
- **Проверка обновлений при запуске**: Приложение автоматически проверяет наличие новой версии через GitHub Releases API
- **Модальное окно обновления**: При обнаружении новой версии появляется компактная модалка с:
  - Номером новой версии
  - Кратким описанием изменений (до 150 символов)
  - Кнопкой «Установить» — скачивание и тихая установка в один клик
  - Кнопкой «Что нового» — переход к полному описанию релиза на GitHub
  - Кнопкой «Позже» — закрыть и продолжить работу
- **Прогресс-бар**: Визуальный индикатор скачивания установщика
- **Тихая установка**: Обновление устанавливается в фоне через Inno Setup `/SILENT`, приложение автоматически перезапускается
- **Отображение версии**: В разделе «Помощь» отображается текущая версия приложения (например, `UTMka v2.2.0`)

### Теги в истории ссылок
- **Автоматическая запись тегов**: При применении шаблона с тегом и генерации ссылки, тег автоматически сохраняется в историю
- **Тег при сохранении**: При сохранении ссылки как шаблон через модальное окно, тег записывается в историю
- **Отображение в UI**: Колонка «Тег» в таблице, теги в grid/list режимах, теги в модальном окне деталей

### Подсказки тегов при создании шаблона
- **Популярные теги**: До 3 самых используемых тегов из существующих шаблонов
- **Недавние теги**: До 3 последних уникальных тегов из истории генераций
- **Быстрое применение**: Клик по тегу-подсказке заполняет название и цвет

### Улучшенный экспорт файлов
- **Нативный диалог «Сохранить как»**: Экспорт истории и шаблонов через системный диалог выбора папки
- **QR-коды в приложении**: Генерация и сохранение QR-кодов в PNG/SVG без открытия браузера

---

## Технические улучшения

### Система версионирования
- **Единый источник версии**: `src/core/version.py` — `__version__` используется бэкендом, фронтендом и системой обновлений
- **Автосинхронизация при сборке**: `build.py` автоматически подставляет версию из `version.py` в `setup.iss` и `version_info.txt`
- **API версии**: `GET /api/version` — возвращает текущую версию приложения

### Бэкенд обновлений
- **`src/core/updater.py`**: Модуль проверки, скачивания и установки обновлений
  - `check_for_updates()` — запрос к GitHub Releases API, сравнение semver
  - `download_installer()` — скачивание .exe во временную папку со стримингом
  - `install_update()` — запуск Inno Setup `/SILENT` + `sys.exit(0)`
- **`src/api/routes/update.py`**: Blueprint с тремя эндпоинтами
  - `GET /api/update/check` — проверка обновлений
  - `POST /api/update/download` — скачивание установщика
  - `POST /api/update/install` — запуск установки

### Установщик
- **Автозапуск после тихой установки**: Inno Setup `skipifnotsilent` — приложение запускается автоматически после OTA-обновления
- **Закрытие при обновлении**: `CloseApplications=force` закрывает старую версию

### База данных
- Добавлены колонки `tag_name` и `tag_color` в таблицу `history_new`
- Автоматическая миграция при запуске
- Поддержка тегов в импорте/экспорте истории

### PyInstaller
- Добавлены hidden imports: `requests`, `urllib3`, `certifi`, `charset_normalizer`, `platformdirs`

---

## Список изменённых файлов

### Новые файлы
- `src/core/version.py` — единый источник версии
- `src/core/updater.py` — логика OTA-обновлений
- `src/api/routes/update.py` — API обновлений

### Изменённые файлы
- `src/api/__init__.py` — регистрация update_bp, миграция БД
- `src/api/routes/main.py` — эндпоинт `/api/version`
- `src/core/models.py` — колонки тегов в History
- `src/api/routes/history.py` — эндпоинты для тегов
- `frontend/index.html` — модалка обновления, версия в Help, контейнер тегов
- `frontend/js/app.js` — логика обновлений, проверка при запуске, загрузка версии
- `frontend/js/ui.js` — функции тегов, рендеринг истории
- `frontend/js/translations.js` — переводы update_*, popular_tags, recent_tags
- `installers/windows/setup.iss` — автозапуск при тихой установке
- `installers/windows/UTMka.spec` — hidden imports для requests/platformdirs
- `installers/windows/build.py` — автосинхронизация версии

---

## Обратная совместимость

- Полная обратная совместимость с версией 2.1.x
- Автоматическая миграция БД при первом запуске
- При отсутствии интернета приложение работает без ошибок — обновления просто не проверяются

---

## Установка

### Windows

#### Обновление с версии 2.1.x
Просто установите новую версию поверх старой — все данные сохранятся.

#### Новая установка
1. Скачайте `UTMka-Setup-2.2.0.exe` из релизов
2. Запустите установщик
3. Следуйте инструкциям

---

## Известные проблемы

Нет критических проблем.

---

**Приятной работы с UTMka!**

---

# UTMka 2.2.0 — Automatic Updates and Improvements

**Release Date:** January 30, 2026

---

## New Features

### Automatic Updates (OTA)
- **Update check on startup**: App automatically checks for new versions via GitHub Releases API
- **Update modal**: Compact dialog with version number, release notes preview (150 chars), Install/What's new/Later buttons
- **Progress bar**: Visual download indicator
- **Silent install**: Updates via Inno Setup `/SILENT`, app auto-restarts
- **Version display**: Current version shown in Help section (e.g., `UTMka v2.2.0`)

### Tags in Link History
- Auto-save tags from templates to history
- Tag column in table, tags in grid/list views and details modal

### Tag Suggestions
- Popular tags (top 3 from templates), Recent tags (last 3 from history)
- One-click apply

### Improved File Export
- Native "Save As" dialog for history/template exports
- In-app QR code generation (PNG/SVG)

---

## Technical Improvements

- **Single version source**: `src/core/version.py` auto-synced to all build files by `build.py`
- **OTA backend**: `src/core/updater.py` — GitHub API check, streamed download, silent install
- **API**: `GET /api/update/check`, `POST /api/update/download`, `POST /api/update/install`, `GET /api/version`
- **Installer**: Auto-launch after silent install (`skipifnotsilent`), `CloseApplications=force`
- **PyInstaller**: Added `requests`, `urllib3`, `certifi`, `charset_normalizer`, `platformdirs` to hidden imports

---

## Installation

### Upgrading from 2.1.x
Install new version over old — all data preserved.

### New Installation
1. Download `UTMka-Setup-2.2.0.exe` from releases
2. Run installer, follow instructions

---

## Backward Compatibility

- Full compatibility with 2.1.x
- Auto DB migration on first launch
- Works offline — updates silently skipped without internet

---

**Happy working with UTMka!**
