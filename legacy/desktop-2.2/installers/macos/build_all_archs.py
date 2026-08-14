#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для сборки UTMka для обеих архитектур macOS

Использование:
1. На Intel Mac: python build_all_archs.py --arch x86_64
2. На Apple Silicon: python build_all_archs.py --arch arm64
3. Или соберите обе версии и объедините через build_universal.py
"""

import sys
import subprocess
import platform
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
BUILD_SCRIPT = SCRIPT_DIR / 'build.py'


def get_current_arch() -> str:
    """Определяет текущую архитектуру"""
    machine = platform.machine()
    if machine == 'arm64':
        return 'arm64'
    elif machine == 'x86_64':
        return 'x86_64'
    else:
        return machine


def main():
    """Основная функция"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Сборка UTMka для macOS')
    parser.add_argument(
        '--arch',
        choices=['x86_64', 'arm64', 'auto'],
        default='auto',
        help='Архитектура для сборки (по умолчанию: auto - текущая)'
    )
    
    args = parser.parse_args()
    
    if args.arch == 'auto':
        arch = get_current_arch()
        print(f"Автоматически определена архитектура: {arch}")
    else:
        arch = args.arch
        current = get_current_arch()
        if arch != current:
            print(f"⚠ Внимание: собираете для {arch}, но текущая архитектура: {current}")
            print(f"  Для нативной сборки {arch} нужен Mac с соответствующей архитектурой")
            response = input("Продолжить? (y/n): ")
            if response.lower() != 'y':
                sys.exit(0)
    
    print(f"\nСборка для архитектуры: {arch}")
    print("=" * 50)
    
    # Запускаем основной скрипт сборки
    result = subprocess.run([sys.executable, str(BUILD_SCRIPT)])
    
    if result.returncode != 0:
        print("✗ Ошибка сборки")
        sys.exit(1)
    
    # Переименовываем результат для указания архитектуры
    import re
    PROJECT_ROOT = SCRIPT_DIR.parent.parent
    VERSION_FILE = PROJECT_ROOT / 'src' / 'core' / 'version.py'
    version_content = VERSION_FILE.read_text(encoding='utf-8')
    version_match = re.search(r'__version__\s*=\s*["\']([^"\']+)["\']', version_content)
    version = version_match.group(1) if version_match else 'unknown'
    
    dist_dir = PROJECT_ROOT / 'dist'
    app_path = dist_dir / 'UTMka.app'
    arch_app_path = dist_dir / f'UTMka-{arch}.app'
    
    if app_path.exists():
        if arch_app_path.exists():
            import shutil
            shutil.rmtree(arch_app_path)
        app_path.rename(arch_app_path)
        print(f"\n✓ Приложение сохранено как: {arch_app_path}")
        print(f"\nДля создания universal binary:")
        print(f"  1. Соберите на другой архитектуре")
        print(f"  2. Используйте lipo для объединения исполняемых файлов")


if __name__ == '__main__':
    main()
