#!/usr/bin/env python3
"""
Быстрая пересборка UTMka (только PyInstaller, без установщика)

Используйте этот скрипт после внесения изменений во frontend или backend
для быстрой проверки изменений в собранном приложении.

Usage:
    python rebuild.py              # Пересборка
    python rebuild.py --clean      # Очистка + пересборка
    python rebuild.py --run        # Пересборка + запуск
"""

import os
import sys
import shutil
import subprocess
import argparse
from pathlib import Path

# Пути
PROJECT_ROOT = Path(__file__).parent
DIST_DIR = PROJECT_ROOT / 'dist'
BUILD_DIR = PROJECT_ROOT / 'build'
SPEC_FILE = PROJECT_ROOT / 'installers' / 'windows' / 'UTMka.spec'

def clean():
    """Очистка предыдущих сборок"""
    print("🧹 Очистка...")

    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
        print(f"  ✓ Удалено: {BUILD_DIR}")

    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
        print(f"  ✓ Удалено: {DIST_DIR}")

    print("✓ Очистка завершена\n")

def build():
    """Сборка с PyInstaller"""
    print("🔨 Сборка PyInstaller...")
    print(f"  Spec: {SPEC_FILE}\n")

    result = subprocess.run([
        sys.executable, '-m', 'PyInstaller',
        '--clean',
        '--noconfirm',
        str(SPEC_FILE)
    ], cwd=PROJECT_ROOT)

    if result.returncode != 0:
        print("\n✗ Ошибка PyInstaller")
        sys.exit(1)

    print("\n✓ PyInstaller завершён")

def check_result():
    """Проверка результата сборки"""
    print("\n📦 Результат сборки:")

    exe_path = DIST_DIR / 'UTMka' / 'UTMka.exe'
    if exe_path.exists():
        size_mb = exe_path.stat().st_size / (1024 * 1024)
        print(f"  ✓ UTMka.exe: {size_mb:.1f} MB")
    else:
        print("  ✗ UTMka.exe не найден!")
        return False

    # Проверка frontend
    frontend_path = DIST_DIR / 'UTMka' / '_internal' / 'frontend'
    if frontend_path.exists():
        print(f"  ✓ Frontend: {frontend_path}")
    else:
        print("  ✗ Frontend не найден!")
        return False

    # Проверка размера
    total_size = sum(f.stat().st_size for f in (DIST_DIR / 'UTMka').rglob('*') if f.is_file())
    total_mb = total_size / (1024 * 1024)
    print(f"  ✓ Общий размер: {total_mb:.1f} MB")

    return True

def run_app():
    """Запуск собранного приложения"""
    exe_path = DIST_DIR / 'UTMka' / 'UTMka.exe'
    if exe_path.exists():
        print(f"\n🚀 Запуск {exe_path}...\n")
        subprocess.Popen([str(exe_path)])
    else:
        print("\n✗ UTMka.exe не найден!")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Быстрая пересборка UTMka')
    parser.add_argument('--clean', action='store_true',
                       help='Очистка перед сборкой')
    parser.add_argument('--run', action='store_true',
                       help='Запустить после сборки')
    args = parser.parse_args()

    print("=" * 60)
    print("UTMka - Быстрая пересборка")
    print("=" * 60)
    print()

    if args.clean:
        clean()

    build()

    if check_result():
        print("\n" + "=" * 60)
        print("✓ Сборка завершена успешно!")
        print("=" * 60)

        if args.run:
            run_app()
        else:
            print(f"\nДля запуска: {DIST_DIR / 'UTMka' / 'UTMka.exe'}")
    else:
        print("\n" + "=" * 60)
        print("✗ Сборка завершена с ошибками")
        print("=" * 60)
        sys.exit(1)

if __name__ == '__main__':
    main()
