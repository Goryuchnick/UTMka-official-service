from __future__ import annotations

import os
from pathlib import Path


def get_downloads_dir() -> Path:
    """
    Возвращает директорию для сохранения скачанных файлов.
    Создает директорию, если её нет.
    """
    app_data_dir = Path(os.getenv("APPDATA", Path.home() / "AppData" / "Roaming")) / "UTMka"
    downloads_dir = app_data_dir / "downloads"
    downloads_dir.mkdir(parents=True, exist_ok=True)
    return downloads_dir


