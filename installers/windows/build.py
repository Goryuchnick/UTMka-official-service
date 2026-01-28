#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт сборки Windows версии UTMka
"""

import os
import sys
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

    clean()
    build_pyinstaller()
    build_installer()

    print("\n" + "=" * 50)
    print("✓ Сборка завершена!")
    print(f"  Установщик: {DIST_DIR / 'UTMka-Setup-2.1.0.exe'}")
    print("=" * 50)

if __name__ == '__main__':
    main()
