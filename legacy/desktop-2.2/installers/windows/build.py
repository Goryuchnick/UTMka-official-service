#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт сборки Windows версии UTMka

Версия читается из src/core/version.py и автоматически
подставляется в setup.iss и version_info.txt перед сборкой.
"""

import os
import sys
import re
import shutil
import subprocess
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Пути
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DIST_DIR = PROJECT_ROOT / 'dist'
BUILD_DIR = PROJECT_ROOT / 'build'
VERSION_FILE = PROJECT_ROOT / 'src' / 'core' / 'version.py'
SETUP_ISS = SCRIPT_DIR / 'setup.iss'
VERSION_INFO = SCRIPT_DIR / 'version_info.txt'


def get_version() -> str:
    """Читает версию из src/core/version.py"""
    content = VERSION_FILE.read_text(encoding='utf-8')
    match = re.search(r'__version__\s*=\s*["\']([^"\']+)["\']', content)
    if not match:
        print("✗ Не удалось прочитать версию из version.py!")
        sys.exit(1)
    return match.group(1)


def sync_version(version: str):
    """Синхронизирует версию в setup.iss и version_info.txt"""
    print(f"Синхронизация версии {version}...")

    # --- setup.iss ---
    iss_content = SETUP_ISS.read_text(encoding='utf-8')
    iss_content = re.sub(
        r'(#define MyAppVersion\s+")[^"]+(")',
        rf'\g<1>{version}\2',
        iss_content
    )
    SETUP_ISS.write_text(iss_content, encoding='utf-8')
    print(f"  ✓ setup.iss → {version}")

    # --- version_info.txt ---
    parts = version.split('.')
    while len(parts) < 4:
        parts.append('0')
    ver_tuple = ', '.join(parts[:4])  # "2, 2, 0, 0"

    vi_content = VERSION_INFO.read_text(encoding='utf-8')
    vi_content = re.sub(r"filevers=\([^)]+\)", f"filevers=({ver_tuple})", vi_content)
    vi_content = re.sub(r"prodvers=\([^)]+\)", f"prodvers=({ver_tuple})", vi_content)
    vi_content = re.sub(
        r"(StringStruct\(u'FileVersion',\s*u')[^']+(')",
        rf"\g<1>{version}\2",
        vi_content
    )
    vi_content = re.sub(
        r"(StringStruct\(u'ProductVersion',\s*u')[^']+(')",
        rf"\g<1>{version}\2",
        vi_content
    )
    VERSION_INFO.write_text(vi_content, encoding='utf-8')
    print(f"  ✓ version_info.txt → {version}")


def clean():
    """Очистка предыдущих сборок"""
    print("Очистка...")

    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)

    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)

    print("✓ Очистка завершена")


def build_pyinstaller():
    """Сборка с PyInstaller"""
    print("\nСборка PyInstaller...")

    spec_file = SCRIPT_DIR / 'UTMka.spec'

    result = subprocess.run([
        sys.executable, '-m', 'PyInstaller',
        '--clean',
        '--noconfirm',
        str(spec_file)
    ], cwd=PROJECT_ROOT)

    if result.returncode != 0:
        print("✗ Ошибка PyInstaller")
        sys.exit(1)

    print("✓ PyInstaller завершён")


def build_installer():
    """Сборка установщика Inno Setup"""
    print("\nСборка установщика...")

    # Путь к Inno Setup (стандартный)
    iscc_paths = [
        r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        r"C:\Program Files\Inno Setup 6\ISCC.exe",
    ]

    iscc = None
    for path in iscc_paths:
        if os.path.exists(path):
            iscc = path
            break

    if not iscc:
        print("✗ Inno Setup не найден!")
        print("  Скачайте: https://jrsoftware.org/isdl.php")
        sys.exit(1)

    setup_file = SCRIPT_DIR / 'setup.iss'

    result = subprocess.run([iscc, str(setup_file)])

    if result.returncode != 0:
        print("✗ Ошибка Inno Setup")
        sys.exit(1)

    print("✓ Установщик создан")


def main():
    """Основная функция"""
    print("=" * 50)
    print("Сборка UTMka для Windows")
    print("=" * 50)

    # Проверяем что мы в правильной директории
    if not (PROJECT_ROOT / 'src').exists():
        print("✗ Запустите из корня проекта!")
        sys.exit(1)

    # Читаем и синхронизируем версию
    version = get_version()
    print(f"\nВерсия: {version}")
    sync_version(version)

    clean()
    build_pyinstaller()
    build_installer()

    print("\n" + "=" * 50)
    print("✓ Сборка завершена!")
    print(f"  Установщик: {DIST_DIR / f'UTMka-Setup-{version}.exe'}")
    print("=" * 50)

if __name__ == '__main__':
    main()
