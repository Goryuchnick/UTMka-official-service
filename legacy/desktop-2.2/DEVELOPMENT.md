# UTMka - Руководство разработчика

[🇬🇧 English version](DEVELOPMENT_EN.md)

## Быстрый старт

### 1. Разработка и тестирование

#### Запуск в режиме разработки (с hot reload)

```bash
# Python
python run_desktop.py --dev

# Windows батник (браузер откроется автоматически)
run_dev.bat
```

В dev режиме:
- Flask запускается с `debug=True`
- Открывается в браузере на http://127.0.0.1:5000
- Hot reload при изменении Python кода
- БД создаётся в текущей директории: `./utm_data.db`

#### Запуск desktop версии (pywebview окно)

```bash
# Python
python run_desktop.py

# Windows батник
run_desktop.bat
```

В desktop режиме:
- pywebview окно (нативное приложение)
- БД в AppData: `%AppData%\Roaming\UTMka\databases\utmka.db`
- Поведение идентично собранному приложению

---

## 2. Сборка приложения

### Быстрая пересборка (после правок frontend/backend)

```bash
# Python
python rebuild.py              # Только PyInstaller
python rebuild.py --clean      # Очистка + пересборка
python rebuild.py --run        # Пересборка + запуск

# Windows батник
rebuild.bat
```

Результат: `dist/UTMka/UTMka.exe`

Используйте для быстрой проверки изменений без создания установщика.

### Полная сборка (приложение + установщик)

```bash
# Python
python installers/windows/build.py

# Windows батник (будущее)
installers/windows/build.bat
```

Результат:
- `dist/UTMka/UTMka.exe` — приложение
- `dist/UTMka-Setup-3.0.0.exe` — установщик (32 MB)

Используйте для финальной сборки перед релизом.

---

## 3. Структура проекта

```
utmKA-2.0-2/
├── src/
│   ├── core/               # Бизнес-логика (общая)
│   │   ├── models.py       # SQLAlchemy модели
│   │   ├── config.py       # Конфигурации (Desktop/Web/Dev)
│   │   └── services.py     # Бизнес-логика
│   ├── api/                # Flask API
│   │   ├── __init__.py     # create_app()
│   │   └── routes/         # Blueprints (main, auth, history, templates)
│   └── desktop/            # Desktop wrapper
│       ├── main.py         # Entry point
│       └── utils.py        # Утилиты
│
├── frontend/               # Frontend (ES6 modules)
│   ├── index.html          # HTML (742 строки)
│   ├── css/main.css        # Стили
│   └── js/                 # JavaScript модули
│       ├── app.js          # Entry point + обработчики
│       ├── ui.js           # State management + rendering
│       ├── api.js          # HTTP fetch
│       ├── translations.js # i18n RU/EN
│       └── utils.js        # Helpers
│
├── installers/
│   └── windows/            # Windows сборка
│       ├── UTMka.spec      # PyInstaller конфигурация
│       ├── setup.iss       # Inno Setup скрипт
│       ├── version_info.txt
│       └── build.py        # Автоматическая сборка
│
├── logo/                   # Иконки и логотипы
├── templates_example*.json # Примеры шаблонов
├── run_desktop.py          # Запуск desktop
├── rebuild.py              # Быстрая пересборка
└── DEVELOPMENT.md          # Этот файл
```

---

## 4. Работа с Frontend

### Модульная структура (ES6)

Frontend разбит на модули:

- **app.js** — главный файл, обработчики событий
- **ui.js** — управление состоянием и рендеринг
- **api.js** — HTTP запросы к Flask API
- **translations.js** — переводы RU/EN
- **utils.js** — вспомогательные функции

### Добавление нового функционала

1. Внесите изменения в соответствующий модуль
2. Запустите `python run_desktop.py --dev` для тестирования
3. После проверки: `python rebuild.py --run` для теста в собранной версии

### CDN зависимости

Текущие CDN (сохранены для простоты):
- Tailwind CSS
- Lucide Icons
- Flatpickr
- QRCode.js

Удаление CDN и переход на build tooling (Vite/Webpack) планируется позже.

---

## 5. Работа с Backend

### Конфигурации

Проект поддерживает несколько конфигураций:

```python
from src.api import create_app

# Development - SQLite, debug mode
app = create_app('development')

# Desktop - SQLite в AppData, no auth
app = create_app('desktop')

# Web - PostgreSQL, OAuth (будущее)
app = create_app('web')
```

### База данных

#### Development
- Путь: `./utm_data.db` (в корне проекта)
- Создаётся автоматически при первом запуске

#### Desktop
- Путь: `%AppData%\Roaming\UTMka\databases\utmka.db`
- Создаётся при первом запуске приложения

### Модели (SQLAlchemy)

См. [src/core/models.py](src/core/models.py):
- `User` — пользователи
- `History` — история UTM-ссылок
- `Template` — шаблоны UTM-меток
- `Subscription` — подписки (для Web версии)

### API Routes

См. [src/api/routes/](src/api/routes/):
- `main.py` — главная страница, favicon
- `auth.py` — авторизация (заготовка для Web)
- `history.py` — CRUD для истории
- `templates.py` — CRUD для шаблонов

---

## 6. Тестирование

### Ручное тестирование

Чек-лист после изменений:

- [ ] `python run_desktop.py --dev` запускается без ошибок
- [ ] Frontend загружается корректно
- [ ] Все CRUD операции работают (создание, чтение, обновление, удаление)
- [ ] Генерация UTM-ссылок работает
- [ ] Короткие ссылки (clck.ru) работают
- [ ] QR-коды генерируются
- [ ] Экспорт/импорт шаблонов работает
- [ ] Переключение языка RU/EN работает
- [ ] Темная/светлая тема работает

### Тестирование собранной версии

```bash
python rebuild.py --clean --run
```

Проверьте все функции в собранном приложении.

---

## 7. Релиз

### Подготовка к релизу

1. Обновите версию в файлах:
   - `installers/windows/version_info.txt`
   - `installers/windows/setup.iss`

2. Создайте полную сборку:
   ```bash
   python installers/windows/build.py
   ```

3. Протестируйте установщик:
   ```bash
   dist/UTMka-Setup-3.0.0.exe
   ```

4. Проверьте все функции после установки

### Changelog

См. [docs/migration/README.md](docs/migration/README.md) для истории изменений по этапам.

---

## 8. Полезные команды

### Git

```bash
# Статус
git status

# Коммит изменений
git add .
git commit -m "feat: описание изменений"

# Просмотр истории
git log --oneline
```

### Python

```bash
# Установка зависимостей
pip install -r requirements.txt

# Обновление зависимостей
pip freeze > requirements.txt

# Проверка импортов
python -c "from src.api import create_app; print('OK')"
```

### PyInstaller

```bash
# Сборка из spec
pyinstaller --clean --noconfirm installers/windows/UTMka.spec

# Анализ размера
du -sh dist/UTMka
```

---

## 9. Troubleshooting

### "Module not found"

```bash
# Убедитесь что находитесь в корне проекта
cd d:\Programmes projects\utmKA-2.0-2

# Проверьте PYTHONPATH
python -c "import sys; print('\n'.join(sys.path))"
```

### "Port already in use"

```bash
# Development mode использует случайный свободный порт
python run_desktop.py --dev --port 5001
```

### Ошибки сборки PyInstaller

```bash
# Очистка кэша
python rebuild.py --clean

# Проверка spec файла
cat installers/windows/UTMka.spec
```

### База данных

```bash
# Удалить dev БД
rm utm_data.db

# Удалить desktop БД (Windows)
rd /s /q %AppData%\Roaming\UTMka
```

---

## 10. Дополнительные ресурсы

- [docs/migration/README.md](docs/migration/README.md) — план миграции
- [docs/migration/ARCHITECTURE.md](docs/migration/ARCHITECTURE.md) — архитектура
- [docs/migration/STEP_3_WINDOWS_INSTALLER.md](docs/migration/STEP_3_WINDOWS_INSTALLER.md) — Windows сборка
- [src/api/__init__.py](src/api/__init__.py) — Flask конфигурация
- [src/desktop/main.py](src/desktop/main.py) — Desktop entry point

---

## Контакты и поддержка

Для вопросов и предложений:
- Issues: [GitHub Issues](https://github.com/yourusername/utmka/issues)
- Документация: [docs/migration/](docs/migration/)
