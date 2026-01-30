"""
Модуль автоматических обновлений через GitHub Releases
"""
import sys
import os
import tempfile
import subprocess
import requests
from typing import Optional, Callable
from src.core.version import __version__

GITHUB_OWNER = "Goryuchnick"
GITHUB_REPO = "UTMka-official-service"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/latest"

# Путь к скачанному установщику (глобальная переменная для сохранения между запросами)
_installer_path: Optional[str] = None


def compare_versions(current: str, latest: str) -> bool:
    """
    Сравнение версий в формате semver (X.Y.Z).
    Возвращает True, если latest > current.
    """
    try:
        # Убираем префикс 'v' если есть
        current = current.lstrip('v')
        latest = latest.lstrip('v')

        current_parts = tuple(map(int, current.split('.')))
        latest_parts = tuple(map(int, latest.split('.')))

        return latest_parts > current_parts
    except (ValueError, AttributeError):
        return False


def check_for_updates() -> dict:
    """
    Проверяет наличие обновлений через GitHub Releases API.

    Returns:
        dict: {
            'available': bool,
            'current_version': str,
            'latest_version': str,
            'download_url': str,
            'release_url': str,
            'release_notes': str
        }
    """
    try:
        response = requests.get(GITHUB_API_URL, timeout=10)
        response.raise_for_status()
        release_data = response.json()

        latest_version = release_data['tag_name'].lstrip('v')
        is_newer = compare_versions(__version__, latest_version)

        # Ищем установщик в assets
        download_url = None
        platform_suffix = '.exe' if sys.platform == 'win32' else '.dmg'

        for asset in release_data.get('assets', []):
            if asset['name'].endswith(platform_suffix):
                download_url = asset['browser_download_url']
                break

        return {
            'available': is_newer and download_url is not None,
            'current_version': __version__,
            'latest_version': latest_version,
            'download_url': download_url,
            'release_url': release_data['html_url'],
            'release_notes': release_data.get('body', '')[:300]  # Первые 300 символов
        }
    except Exception as e:
        # Молча игнорируем ошибки (нет сети, rate limit и т.д.)
        print(f"Ошибка проверки обновлений: {e}")
        return {
            'available': False,
            'current_version': __version__,
            'latest_version': __version__,
            'download_url': None,
            'release_url': None,
            'release_notes': ''
        }


def download_installer(download_url: str, progress_callback: Optional[Callable[[int, int], None]] = None) -> str:
    """
    Скачивает установщик во временную папку.

    Args:
        download_url: URL для скачивания
        progress_callback: Функция для отслеживания прогресса (downloaded_bytes, total_bytes)

    Returns:
        str: Путь к скачанному файлу
    """
    global _installer_path

    try:
        response = requests.get(download_url, stream=True, timeout=30)
        response.raise_for_status()

        # Определяем расширение файла
        extension = '.exe' if sys.platform == 'win32' else '.dmg'

        # Создаём временный файл
        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
            prefix='UTMka-Setup-'
        )
        temp_path = temp_file.name

        # Скачиваем с отслеживанием прогресса
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0

        with open(temp_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)

                    if progress_callback and total_size > 0:
                        progress_callback(downloaded, total_size)

        _installer_path = temp_path
        return temp_path

    except Exception as e:
        print(f"Ошибка скачивания: {e}")
        raise


def install_update(installer_path: str):
    """
    Запускает установщик и завершает текущее приложение.

    Args:
        installer_path: Путь к скачанному установщику
    """
    try:
        if sys.platform == 'win32':
            # Windows: Inno Setup с тихой установкой
            subprocess.Popen([
                installer_path,
                '/SILENT',              # Без окон
                '/CLOSEAPPLICATIONS',   # Закрыть UTMka если запущена
                '/RESTARTAPPLICATIONS', # Перезапустить после установки
                '/NOCANCEL'             # Без кнопки отмены
            ])
        elif sys.platform == 'darwin':
            # macOS: Открыть DMG (пользователь перетащит в Applications)
            subprocess.Popen(['open', installer_path])

        # Даём установщику время запуститься
        import time
        time.sleep(1)

        # Завершаем текущее приложение
        sys.exit(0)

    except Exception as e:
        print(f"Ошибка запуска установщика: {e}")
        raise


def get_installer_path() -> Optional[str]:
    """Возвращает путь к последнему скачанному установщику."""
    return _installer_path
