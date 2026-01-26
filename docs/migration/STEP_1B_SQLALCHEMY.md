# Этап 1B: SQLAlchemy интеграция

## Цель

Переписать routes на SQLAlchemy ORM вместо raw sqlite3, исправить пути к данным.

## Время: 2-3 часа

## Статус: 🔴 В работе

---

## Проблемы для исправления

### Проблема 1: Routes используют raw sqlite3

**Текущий код (НЕПРАВИЛЬНО):**
```python
# src/api/routes/history.py
import sqlite3

def get_db_connection():
    db_path = os.path.join(get_app_dir(), 'utm_data.db')
    conn = sqlite3.connect(db_path)
    return conn

@history_bp.route('/history', methods=['GET'])
def get_history():
    conn = get_db_connection()
    history_items = conn.execute('SELECT * FROM history_new ...').fetchall()
```

**Нужно (ПРАВИЛЬНО):**
```python
# src/api/routes/history.py
from src.core.models import db, History

@history_bp.route('/history', methods=['GET'])
def get_history():
    user_email = request.args.get('user_email')
    items = History.query.filter_by(user_email=user_email)\
                         .order_by(History.created_at.desc())\
                         .limit(500).all()
    return jsonify([item.to_dict() for item in items])
```

---

### Проблема 2: SQLAlchemy не инициализирован

**В `src/api/__init__.py` добавить:**
```python
from src.core.models import db

def create_app(config_name: str = 'development') -> Flask:
    app = Flask(...)
    app.config.from_object(configs.get(config_name, Config))
    
    # ДОБАВИТЬ:
    db.init_app(app)
    
    with app.app_context():
        db.create_all()  # Создаёт таблицы если их нет
    
    # blueprints...
```

---

### Проблема 3: Путь к БД — рядом с exe

**Текущий код (НЕПРАВИЛЬНО):**
```python
def get_app_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)  # ❌ рядом с exe!
```

**Конфиг уже правильный:**
```python
# src/core/config.py — использовать это!
def get_data_dir() -> Path:
    # Windows: AppData/Roaming/UTMka
    # macOS: ~/Library/Application Support/UTMka
```

---

### Проблема 4: Дублирование функций

Функции дублируются в каждом route файле:
- `get_app_dir()`
- `get_db_connection()`
- `get_downloads_dir()`
- `resource_path()`

**Решение:** Удалить из routes, импортировать из `src/core/`.

---

## Шаги выполнения

### Шаг 1B.1: Обновить `src/api/__init__.py`

```python
"""
UTMka API - Flask приложение
"""
import os
import sys
from flask import Flask

from src.core.config import Config, DesktopConfig, DevelopmentConfig
from src.core.models import db


def get_resource_path(relative_path: str) -> str:
    """Путь к ресурсам (работает и в dev, и в PyInstaller)"""
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base_path, relative_path)


def create_app(config_name: str = 'development') -> Flask:
    """
    Фабрика приложений Flask
    """
    static_folder = get_resource_path('.')
    template_folder = get_resource_path('.')
    
    app = Flask(
        __name__,
        static_url_path='',
        static_folder=static_folder,
        template_folder=template_folder
    )
    
    # Загружаем конфигурацию
    configs = {
        'development': DevelopmentConfig,
        'desktop': DesktopConfig,
        'default': Config
    }
    app.config.from_object(configs.get(config_name, Config))
    
    # Инициализируем SQLAlchemy
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
    
    # Регистрируем blueprints
    from src.api.routes.main import main_bp
    from src.api.routes.history import history_bp
    from src.api.routes.templates import templates_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(templates_bp)
    
    return app
```

---

### Шаг 1B.2: Обновить `src/core/config.py`

Добавить функцию `init_db()` для совместимости со старой БД:

```python
"""
Конфигурация приложения
"""
import os
import sys
from pathlib import Path


def is_frozen() -> bool:
    """Проверяет, запущено ли из PyInstaller"""
    return getattr(sys, 'frozen', False)


def get_data_dir() -> Path:
    """
    Возвращает папку для данных приложения.
    
    Windows: C:\\Users\\<user>\\AppData\\Roaming\\UTMka
    macOS: ~/Library/Application Support/UTMka
    Linux: ~/.local/share/UTMka
    Dev: текущая директория (для совместимости)
    """
    # В режиме разработки — текущая директория (для совместимости со старой БД)
    if not is_frozen():
        return Path.cwd()
    
    if sys.platform == 'win32':
        base = Path(os.environ.get('APPDATA', Path.home() / 'AppData' / 'Roaming'))
    elif sys.platform == 'darwin':
        base = Path.home() / 'Library' / 'Application Support'
    else:
        base = Path.home() / '.local' / 'share'
    
    data_dir = base / 'UTMka'
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_db_path() -> Path:
    """Путь к базе данных"""
    # В режиме разработки — utm_data.db в текущей директории
    if not is_frozen():
        return Path.cwd() / 'utm_data.db'
    
    db_dir = get_data_dir() / 'databases'
    db_dir.mkdir(parents=True, exist_ok=True)
    return db_dir / 'utmka.db'


def get_exports_dir() -> Path:
    """Папка для экспорта"""
    exports_dir = get_data_dir() / 'exports'
    exports_dir.mkdir(parents=True, exist_ok=True)
    return exports_dir


def get_downloads_dir() -> Path:
    """Папка для загрузок"""
    downloads_dir = get_data_dir() / 'downloads'
    downloads_dir.mkdir(parents=True, exist_ok=True)
    return downloads_dir


def get_resource_path(relative_path: str) -> Path:
    """Путь к ресурсам (работает и в dev, и в PyInstaller)"""
    if is_frozen():
        base_path = Path(sys._MEIPASS)
    else:
        base_path = Path(__file__).parent.parent.parent
    return base_path / relative_path


class Config:
    """Базовая конфигурация"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{get_db_path()}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'connect_args': {'timeout': 30}
    }


class DesktopConfig(Config):
    """Конфигурация для desktop"""
    DEBUG = False


class DevelopmentConfig(Config):
    """Конфигурация для разработки"""
    DEBUG = True
    SQLALCHEMY_ECHO = False  # True для отладки SQL
```

---

### Шаг 1B.3: Переписать `src/api/routes/history.py`

```python
"""
Маршруты для работы с историей UTM-ссылок
"""
import json
from flask import Blueprint, request, jsonify, send_from_directory

from src.core.models import db, History
from src.core.services import UTMService
from src.core.config import get_downloads_dir

history_bp = Blueprint('history', __name__)


@history_bp.route('/history', methods=['GET'])
def get_history():
    """Получает историю пользователя."""
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify([])
    
    items = History.query.filter_by(user_email=user_email)\
                         .order_by(History.created_at.desc())\
                         .limit(500).all()
    
    response = jsonify([item.to_dict() for item in items])
    response.headers['Cache-Control'] = 'no-cache'
    return response


@history_bp.route('/history', methods=['POST'])
def add_history():
    """Добавляет запись в историю."""
    data = request.json
    
    url = data['url']
    base_url = UTMService.extract_base_url(url)
    utm_params = UTMService.parse_utm_params(url)
    
    history = History(
        user_email=data['user_email'],
        base_url=base_url,
        full_url=url,
        utm_source=utm_params.get('utm_source'),
        utm_medium=utm_params.get('utm_medium'),
        utm_campaign=utm_params.get('utm_campaign'),
        utm_content=utm_params.get('utm_content'),
        utm_term=utm_params.get('utm_term')
    )
    
    db.session.add(history)
    db.session.commit()
    
    return jsonify({'success': True, 'id': history.id})


@history_bp.route('/history/<int:item_id>', methods=['DELETE'])
def delete_history(item_id):
    """Удаляет запись из истории."""
    history = History.query.get_or_404(item_id)
    db.session.delete(history)
    db.session.commit()
    return jsonify({'success': True})


@history_bp.route('/history/<int:item_id>/short_url', methods=['PUT'])
def update_history_short_url(item_id):
    """Обновляет сокращённую ссылку."""
    data = request.json
    short_url = data.get('short_url')
    
    if not short_url:
        return jsonify({'success': False, 'error': 'short_url is required'}), 400
    
    history = History.query.get_or_404(item_id)
    history.short_url = short_url
    db.session.commit()
    
    return jsonify({'success': True, 'short_url': short_url})


@history_bp.route('/export_history', methods=['POST'])
def export_history():
    """Экспортирует историю пользователя в файл."""
    data = request.json
    user_email = data.get('user_email')
    format_type = data.get('format', 'json')
    
    if not user_email:
        return jsonify({'error': 'user_email is required'}), 400
    
    items = History.query.filter_by(user_email=user_email)\
                         .order_by(History.created_at.desc()).all()
    
    export_data = []
    for item in items:
        d = item.to_dict()
        # Убираем служебные поля
        for key in ['id', 'user_email', 'created_at']:
            d.pop(key, None)
        export_data.append(d)
    
    downloads_dir = get_downloads_dir()
    
    if format_type == 'json':
        filename = f'utm_history_{user_email.replace("@", "_")}.json'
        filepath = downloads_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
    elif format_type == 'csv':
        import csv
        filename = f'utm_history_{user_email.replace("@", "_")}.csv'
        filepath = downloads_dir / filename
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            if export_data:
                writer = csv.DictWriter(f, fieldnames=export_data[0].keys())
                writer.writeheader()
                writer.writerows(export_data)
    else:
        return jsonify({'error': 'Invalid format'}), 400
    
    return jsonify({
        'success': True,
        'filename': filename,
        'folder_path': str(downloads_dir),
        'file_path': str(filepath),
        'count': len(export_data)
    })


@history_bp.route('/import_history', methods=['POST'])
def import_history():
    """Импортирует историю пользователя из списка."""
    data = request.json
    items_to_add = data if isinstance(data, list) else [data]
    
    imported_count = 0
    for item in items_to_add:
        try:
            history = History(
                user_email=item['user_email'],
                base_url=item.get('base_url', ''),
                full_url=item.get('full_url') or item.get('url', ''),
                utm_source=item.get('utm_source'),
                utm_medium=item.get('utm_medium'),
                utm_campaign=item.get('utm_campaign'),
                utm_content=item.get('utm_content'),
                utm_term=item.get('utm_term')
            )
            db.session.add(history)
            imported_count += 1
        except Exception as e:
            print(f"Error importing history item: {e}")
    
    db.session.commit()
    return jsonify({'success': True, 'imported_count': imported_count})


@history_bp.route('/download_file/<path:filename>')
def download_file(filename):
    """Скачивает файл из папки downloads."""
    try:
        downloads_dir = get_downloads_dir()
        response = send_from_directory(str(downloads_dir), filename, as_attachment=True)
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response
    except FileNotFoundError:
        return "File not found", 404
```

---

### Шаг 1B.4: Переписать `src/api/routes/templates.py`

```python
"""
Маршруты для работы с шаблонами UTM
"""
import json
import shutil
from flask import Blueprint, request, jsonify, send_from_directory

from src.core.models import db, Template
from src.core.config import get_downloads_dir, get_resource_path

templates_bp = Blueprint('templates', __name__)


@templates_bp.route('/templates', methods=['GET'])
def get_templates():
    """Получает шаблоны пользователя."""
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify([])
    
    items = Template.query.filter_by(user_email=user_email)\
                          .order_by(Template.created_at.desc())\
                          .limit(500).all()
    
    response = jsonify([item.to_dict() for item in items])
    response.headers['Cache-Control'] = 'no-cache'
    return response


@templates_bp.route('/templates', methods=['POST'])
def add_template():
    """Добавляет шаблон."""
    data = request.json
    items_to_add = data if isinstance(data, list) else [data]
    
    for item in items_to_add:
        template = Template(
            user_email=item['user_email'],
            name=item['name'],
            utm_source=item.get('utm_source'),
            utm_medium=item.get('utm_medium'),
            utm_campaign=item.get('utm_campaign'),
            utm_content=item.get('utm_content'),
            utm_term=item.get('utm_term'),
            tag_name=item.get('tag_name'),
            tag_color=item.get('tag_color')
        )
        db.session.add(template)
    
    db.session.commit()
    return jsonify({'success': True, 'imported_count': len(items_to_add)})


@templates_bp.route('/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Удаляет шаблон."""
    template = Template.query.get_or_404(template_id)
    db.session.delete(template)
    db.session.commit()
    return jsonify({'success': True})


@templates_bp.route('/download_template/<path:filename>')
def download_template(filename):
    """Отдает файлы-шаблоны для импорта."""
    allowed_templates = [
        'templates_example.json',
        'templates_example.csv',
        'templates_example_ru.json',
        'templates_example_en.json'
    ]
    if filename not in allowed_templates:
        return "File not found", 404
    
    resource_dir = get_resource_path('.')
    response = send_from_directory(str(resource_dir), filename, as_attachment=True)
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response


@templates_bp.route('/download_template_with_folder', methods=['POST'])
def download_template_with_folder():
    """Скачивает пример шаблона."""
    data = request.json
    filename = data.get('filename')
    
    allowed_templates = [
        'templates_example.json',
        'templates_example.csv',
        'templates_example_ru.json',
        'templates_example_en.json'
    ]
    if filename not in allowed_templates:
        return jsonify({'error': 'Invalid filename'}), 400
    
    source_path = get_resource_path(filename)
    
    if not source_path.exists():
        return jsonify({'error': 'File not found'}), 404
    
    downloads_dir = get_downloads_dir()
    destination_path = downloads_dir / filename
    
    if source_path.resolve() != destination_path.resolve():
        shutil.copy2(source_path, destination_path)
    
    return jsonify({
        'success': True,
        'filename': filename,
        'folder_path': str(downloads_dir),
        'file_path': str(destination_path)
    })


@templates_bp.route('/export_templates', methods=['POST'])
def export_templates():
    """Экспортирует шаблоны пользователя в файл."""
    data = request.json
    user_email = data.get('user_email')
    format_type = data.get('format', 'json')
    
    if not user_email:
        return jsonify({'error': 'user_email is required'}), 400
    
    items = Template.query.filter_by(user_email=user_email)\
                          .order_by(Template.created_at.desc()).all()
    
    export_data = []
    for item in items:
        d = item.to_dict()
        for key in ['id', 'user_email', 'created_at']:
            d.pop(key, None)
        export_data.append(d)
    
    downloads_dir = get_downloads_dir()
    
    if format_type == 'json':
        filename = f'utm_templates_{user_email.replace("@", "_")}.json'
        filepath = downloads_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
    elif format_type == 'csv':
        import csv
        filename = f'utm_templates_{user_email.replace("@", "_")}.csv'
        filepath = downloads_dir / filename
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            if export_data:
                writer = csv.DictWriter(f, fieldnames=export_data[0].keys())
                writer.writeheader()
                writer.writerows(export_data)
    else:
        return jsonify({'error': 'Invalid format'}), 400
    
    return jsonify({
        'success': True,
        'filename': filename,
        'folder_path': str(downloads_dir),
        'file_path': str(filepath),
        'count': len(export_data)
    })
```

---

## Чек-лист завершения

- [ ] `src/api/__init__.py` — добавлен `db.init_app(app)`
- [ ] `src/core/config.py` — обновлены пути для dev/prod
- [ ] `src/api/routes/history.py` — переписан на SQLAlchemy
- [ ] `src/api/routes/templates.py` — переписан на SQLAlchemy
- [ ] Удалены дублирующиеся функции из routes
- [ ] Проверка: `python -c "from src.api import create_app; create_app()"`
- [ ] Проверка: приложение работает с существующей БД

---

## Тестирование

```bash
# Проверить импорты
python -c "from src.api import create_app; app = create_app(); print('OK')"

# Запустить в dev режиме
python -c "
from src.api import create_app
app = create_app('development')
app.run(debug=True, port=5000)
"

# Открыть http://localhost:5000 и проверить:
# - История загружается
# - Шаблоны загружаются
# - Создание/удаление работает
```

---

## Важно: Совместимость

Код сохраняет совместимость со старой БД (`utm_data.db`):
- Таблица `history_new` (не `history`)
- Поле `user_email` (не `user_id`)
- В dev режиме БД в текущей директории
