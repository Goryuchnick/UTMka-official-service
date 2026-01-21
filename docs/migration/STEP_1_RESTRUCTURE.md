# Этап 1: Реструктуризация папок

## Цель

Создать новую структуру папок и перенести существующий код без изменения логики.

## Время: 1-2 дня

---

## Шаг 1.1: Создать структуру папок

```bash
# Создать папки
mkdir -p src/core
mkdir -p src/api/routes
mkdir -p src/api/schemas
mkdir -p src/desktop
mkdir -p frontend/css
mkdir -p frontend/js/components
mkdir -p installers/windows
mkdir -p installers/macos
mkdir -p assets/logo
mkdir -p assets/templates
mkdir -p tests
```

---

## Шаг 1.2: Перенести core логику

### Файл: `src/core/__init__.py`

```python
"""
UTMka Core - общая бизнес-логика
"""
from .models import db, User, History, Template, Subscription
from .services import UTMService
from .config import get_data_dir, Config

__all__ = [
    'db', 'User', 'History', 'Template', 'Subscription',
    'UTMService', 'get_data_dir', 'Config'
]
```

### Файл: `src/core/config.py`

```python
"""
Конфигурация приложения
"""
import os
import sys
from pathlib import Path


def get_data_dir() -> Path:
    """
    Возвращает папку для данных приложения.
    
    Windows: C:\\Users\\<user>\\AppData\\Roaming\\UTMka
    macOS: ~/Library/Application Support/UTMka
    Linux: ~/.local/share/UTMka
    """
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
    db_dir = get_data_dir() / 'databases'
    db_dir.mkdir(parents=True, exist_ok=True)
    return db_dir / 'utmka.db'


def get_exports_dir() -> Path:
    """Папка для экспорта"""
    exports_dir = get_data_dir() / 'exports'
    exports_dir.mkdir(parents=True, exist_ok=True)
    return exports_dir


class Config:
    """Базовая конфигурация"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{get_db_path()}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DesktopConfig(Config):
    """Конфигурация для desktop"""
    DEBUG = False


class DevelopmentConfig(Config):
    """Конфигурация для разработки"""
    DEBUG = True
    SQLALCHEMY_ECHO = True
```

### Файл: `src/core/models.py`

**Действие:** Скопировать модели из `web/app/models/` и объединить в один файл.

```python
"""
SQLAlchemy модели
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """Модель пользователя"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255))
    name = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    history = db.relationship('History', backref='user', lazy='dynamic')
    templates = db.relationship('Template', backref='user', lazy='dynamic')
    
    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class History(db.Model):
    """История UTM-ссылок"""
    __tablename__ = 'history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    base_url = db.Column(db.String(2000), nullable=False)
    full_url = db.Column(db.String(4000), nullable=False)
    utm_source = db.Column(db.String(255))
    utm_medium = db.Column(db.String(255))
    utm_campaign = db.Column(db.String(255))
    utm_content = db.Column(db.String(255))
    utm_term = db.Column(db.String(255))
    short_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'base_url': self.base_url,
            'full_url': self.full_url,
            'utm_source': self.utm_source,
            'utm_medium': self.utm_medium,
            'utm_campaign': self.utm_campaign,
            'utm_content': self.utm_content,
            'utm_term': self.utm_term,
            'short_url': self.short_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Template(db.Model):
    """Шаблоны UTM"""
    __tablename__ = 'templates'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    utm_source = db.Column(db.String(255))
    utm_medium = db.Column(db.String(255))
    utm_campaign = db.Column(db.String(255))
    utm_content = db.Column(db.String(255))
    utm_term = db.Column(db.String(255))
    tag_name = db.Column(db.String(100))
    tag_color = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'utm_source': self.utm_source,
            'utm_medium': self.utm_medium,
            'utm_campaign': self.utm_campaign,
            'utm_content': self.utm_content,
            'utm_term': self.utm_term,
            'tag_name': self.tag_name,
            'tag_color': self.tag_color,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# Для совместимости с текущим кодом (user_email вместо user_id)
class HistoryLegacy(db.Model):
    """Legacy история для совместимости"""
    __tablename__ = 'history_new'
    
    id = db.Column(db.Integer, primary_key=True)
    user_email = db.Column(db.String(255), nullable=False, index=True)
    base_url = db.Column(db.String(2000), nullable=False)
    full_url = db.Column(db.String(4000), nullable=False)
    utm_source = db.Column(db.String(255))
    utm_medium = db.Column(db.String(255))
    utm_campaign = db.Column(db.String(255))
    utm_content = db.Column(db.String(255))
    utm_term = db.Column(db.String(255))
    short_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

---

## Шаг 1.3: Перенести API

**Действие:** Скопировать `web/app/routes/` в `src/api/routes/`

Внести изменения в импорты:

```python
# Было (в web/app/routes/utm.py):
from ..extensions import db
from ..models import History, Template

# Стало (в src/api/routes/utm.py):
from src.core.models import db, History, Template
```

---

## Шаг 1.4: Создать desktop wrapper

### Файл: `src/desktop/main.py`

```python
"""
Desktop приложение UTMka
"""
import sys
import threading
import webview
from src.desktop.utils import find_free_port, wait_for_server
from src.api import create_app


def run_server(app, port: int):
    """Запуск Flask сервера"""
    app.run(
        host='127.0.0.1',
        port=port,
        debug=False,
        use_reloader=False,
        threaded=True
    )


def main():
    """Точка входа"""
    # Создаём Flask приложение
    app = create_app('desktop')
    
    # Находим свободный порт
    port = find_free_port()
    print(f"Используем порт: {port}")
    
    # Запускаем сервер в фоновом потоке
    server_thread = threading.Thread(
        target=run_server,
        args=(app, port),
        daemon=True
    )
    server_thread.start()
    
    # Ждём готовности сервера
    if not wait_for_server(port, timeout=30):
        print("Ошибка: сервер не запустился")
        sys.exit(1)
    
    # Создаём окно
    window = webview.create_window(
        'UTMka',
        f'http://127.0.0.1:{port}',
        width=1200,
        height=900,
        resizable=True,
        min_size=(800, 600)
    )
    
    # Запускаем GUI
    webview.start()


if __name__ == '__main__':
    main()
```

### Файл: `src/desktop/utils.py`

```python
"""
Утилиты для desktop приложения
"""
import socket
import time
import sys
from pathlib import Path


def find_free_port(start_port: int = 5000, max_attempts: int = 100) -> int:
    """Находит свободный порт"""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    raise RuntimeError("Не удалось найти свободный порт")


def wait_for_server(port: int, timeout: int = 30) -> bool:
    """Ждёт готовности сервера"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) == 0:
                return True
        time.sleep(0.1)
    return False


def get_resource_path(relative_path: str) -> Path:
    """Путь к ресурсам (работает и в dev, и в PyInstaller)"""
    if getattr(sys, 'frozen', False):
        # PyInstaller создаёт временную папку
        base_path = Path(sys._MEIPASS)
    else:
        base_path = Path(__file__).parent.parent.parent
    return base_path / relative_path
```

---

## Шаг 1.5: Перенести ресурсы

```bash
# Переместить логотипы
mv logo/* assets/logo/

# Переместить примеры шаблонов
mv templates_example*.json assets/templates/
mv templates_example*.csv assets/templates/
```

---

## Чек-лист завершения этапа

- [ ] Создана структура папок
- [ ] `src/core/` содержит модели и конфигурацию
- [ ] `src/api/` содержит Flask приложение
- [ ] `src/desktop/` содержит wrapper
- [ ] Ресурсы перенесены в `assets/`
- [ ] Приложение запускается командой `python -m src.desktop.main`
