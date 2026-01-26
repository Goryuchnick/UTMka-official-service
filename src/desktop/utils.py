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
