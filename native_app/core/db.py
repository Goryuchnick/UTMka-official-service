import os
import sqlite3
from pathlib import Path


APP_NAME = "UTMka"


def get_app_data_dir() -> Path:
    """
    Возвращает директорию для хранения данных приложения.
    На Windows это обычно %APPDATA%\\UTMka.
    """
    base = Path(os.getenv("APPDATA", Path.home() / "AppData" / "Roaming"))
    app_dir = base / APP_NAME
    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir


DB_PATH = get_app_data_dir() / "utm_data.db"


def get_connection() -> sqlite3.Connection:
    """Создает соединение с локальной базой данных."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """
    Инициализирует базу данных.
    Структура максимально повторяет текущую структуру из app.py,
    но без миграции со старой таблицы history.
    """
    conn = get_connection()
    # Небольшие настройки производительности (безопасные по умолчанию)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA cache_size = 10000")

    cursor = conn.cursor()

    # Таблица пользователей
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
        """
    )

    # Таблица истории
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS history_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            base_url TEXT NOT NULL,
            full_url TEXT NOT NULL,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            utm_content TEXT,
            utm_term TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # Таблица шаблонов
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            name TEXT NOT NULL,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            utm_content TEXT,
            utm_term TEXT,
            tag_name TEXT,
            tag_color TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # Индексы
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_history_new_user_email "
        "ON history_new(user_email)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_history_new_created_at "
        "ON history_new(created_at)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_templates_user_email "
        "ON templates(user_email)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_templates_created_at "
        "ON templates(created_at)"
    )

    conn.commit()
    conn.close()


