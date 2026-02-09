#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт сборки macOS версии UTMka

Версия читается из src/core/version.py и автоматически
подставляется в UTMka.spec перед сборкой.

Поддерживает сборку для обеих архитектур:
- arm64 (Apple Silicon)
- x86_64 (Intel)
"""

import os
import sys
import re
import shutil
import subprocess
import platform
from pathlib import Path

# Пути
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DIST_DIR = PROJECT_ROOT / 'dist'
BUILD_DIR = PROJECT_ROOT / 'build'
VERSION_FILE = PROJECT_ROOT / 'src' / 'core' / 'version.py'
SPEC_FILE = SCRIPT_DIR / 'UTMka.spec'
ASSETS_PATH = PROJECT_ROOT / 'assets'
LOGO_PATH = ASSETS_PATH / 'logo' / 'logoutm.icns'


def get_version() -> str:
    """Читает версию из src/core/version.py"""
    content = VERSION_FILE.read_text(encoding='utf-8')
    match = re.search(r'__version__\s*=\s*["\']([^"\']+)["\']', content)
    if not match:
        print("✗ Не удалось прочитать версию из version.py!")
        sys.exit(1)
    return match.group(1)


def sync_version(version: str):
    """Синхронизирует версию в UTMka.spec"""
    print(f"Синхронизация версии {version}...")
    
    spec_content = SPEC_FILE.read_text(encoding='utf-8')
    
    # Заменяем версию в info_plist
    spec_content = re.sub(
        r"('CFBundleVersion':\s*')[^']+(')",
        rf'\g<1>{version}\2',
        spec_content
    )
    spec_content = re.sub(
        r"('CFBundleShortVersionString':\s*')[^']+(')",
        rf'\g<1>{version}\2',
        spec_content
    )
    
    SPEC_FILE.write_text(spec_content, encoding='utf-8')
    print(f"  ✓ UTMka.spec → {version}")


def clean():
    """Очистка предыдущих сборок"""
    print("Очистка...")
    
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    
    print("✓ Очистка завершена")


def get_current_arch() -> str:
    """Определяет текущую архитектуру"""
    machine = platform.machine()
    if machine == 'arm64':
        return 'arm64'
    elif machine == 'x86_64':
        return 'x86_64'
    else:
        return machine


def build_app(arch: str = None):
    """Сборка .app для указанной архитектуры"""
    if arch:
        print(f"\nСборка приложения для {arch}...")
    else:
        print("\nСборка приложения...")
    
    spec_file = SCRIPT_DIR / 'UTMka.spec'
    
    # Проверяем наличие иконки
    if not LOGO_PATH.exists():
        print(f"⚠ Иконка не найдена: {LOGO_PATH}")
        print("  Продолжаем без иконки...")
    
    # Собираем с PyInstaller
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--clean',
        '--noconfirm',
        str(spec_file)
    ]
    
    # Если указана архитектура, можно использовать target_arch в spec
    # Но PyInstaller автоматически определяет архитектуру по текущей системе
    # Для universal binary нужна отдельная сборка и lipo
    
    result = subprocess.run(cmd, cwd=PROJECT_ROOT)
    
    if result.returncode != 0:
        print("✗ Ошибка PyInstaller")
        sys.exit(1)
    
    app_path = DIST_DIR / 'UTMka.app'
    if not app_path.exists():
        print("✗ UTMka.app не создан")
        sys.exit(1)
    
    print(f"✓ .app создан: {app_path}")


def build_universal():
    """Создаёт universal binary (arm64 + x86_64)"""
    print("\n" + "=" * 50)
    print("Сборка Universal Binary (arm64 + x86_64)")
    print("=" * 50)
    
    current_arch = get_current_arch()
    print(f"Текущая архитектура: {current_arch}")
    
    # Для universal binary нужно собрать обе версии и объединить через lipo
    # Это сложно без Rosetta 2 или двух машин
    # Пока собираем только для текущей архитектуры
    
    print(f"\n⚠ Universal binary требует сборки на обеих архитектурах")
    print(f"  Сейчас собираем только для {current_arch}")
    print(f"  Для universal binary:")
    print(f"    1. Соберите на Intel Mac → переименуйте в UTMka-x86_64.app")
    print(f"    2. Соберите на Apple Silicon → переименуйте в UTMka-arm64.app")
    print(f"    3. Используйте lipo для объединения исполняемых файлов")
    
    build_app(current_arch)


def create_dmg():
    """Создание DMG"""
    print("\nСоздание DMG...")
    
    app_path = DIST_DIR / 'UTMka.app'
    version = get_version()
    dmg_path = DIST_DIR / f'UTMka-{version}-macOS.dmg'
    
    if not app_path.exists():
        print("✗ UTMka.app не найден")
        sys.exit(1)
    
    # Проверяем наличие create-dmg
    try:
        subprocess.run(['create-dmg', '--version'], 
                      capture_output=True, check=True)
        use_create_dmg = True
    except (subprocess.CalledProcessError, FileNotFoundError):
        use_create_dmg = False
        print("⚠ create-dmg не установлен, используем hdiutil")
        print("  Для лучшего результата установите: brew install create-dmg")
    
    # Удаляем старый DMG
    if dmg_path.exists():
        dmg_path.unlink()
    
    if use_create_dmg:
        # Используем create-dmg для красивого DMG
        result = subprocess.run([
            'create-dmg',
            '--volname', 'UTMka',
            '--volicon', str(LOGO_PATH) if LOGO_PATH.exists() else '',
            '--window-pos', '200', '120',
            '--window-size', '600', '400',
            '--icon-size', '100',
            '--icon', 'UTMka.app', '150', '185',
            '--app-drop-link', '450', '185',
            '--hide-extension', 'UTMka.app',
            '--hdiutil-quiet',
            str(dmg_path),
            str(app_path)
        ])
        
        if result.returncode != 0:
            print("⚠ Ошибка create-dmg, пробуем простой метод...")
            simple_dmg()
        else:
            print("✓ DMG создан (create-dmg)")
    else:
        simple_dmg()


def simple_dmg():
    """Простое создание DMG через hdiutil"""
    app_path = DIST_DIR / 'UTMka.app'
    version = get_version()
    dmg_path = DIST_DIR / f'UTMka-{version}-macOS.dmg'
    temp_dir = DIST_DIR / 'dmg_temp'
    
    # Удаляем старую временную папку если есть
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    
    # Создаём временную папку
    temp_dir.mkdir(exist_ok=True)
    
    try:
        # Копируем .app
        shutil.copytree(app_path, temp_dir / 'UTMka.app')
        
        # Создаём ссылку на Applications
        applications_link = temp_dir / 'Applications'
        if applications_link.exists():
            applications_link.unlink()
        os.symlink('/Applications', str(applications_link))
        
        # Создаём DMG
        subprocess.run([
            'hdiutil', 'create',
            '-volname', 'UTMka',
            '-srcfolder', str(temp_dir),
            '-ov',
            '-format', 'UDZO',
            str(dmg_path)
        ], check=True)
        
        print("✓ DMG создан (hdiutil)")
    finally:
        # Удаляем временную папку
        if temp_dir.exists():
            shutil.rmtree(temp_dir)


def main():
    """Основная функция"""
    print("=" * 50)
    print("Сборка UTMka для macOS")
    print("=" * 50)
    
    # Проверяем что мы на macOS
    if sys.platform != 'darwin':
        print("✗ Этот скрипт работает только на macOS!")
        sys.exit(1)
    
    # Проверяем что мы в правильной директории
    if not (PROJECT_ROOT / 'src').exists():
        print("✗ Запустите из корня проекта!")
        sys.exit(1)
    
    # Читаем и синхронизируем версию
    version = get_version()
    print(f"\nВерсия: {version}")
    sync_version(version)
    
    # Определяем архитектуру
    arch = get_current_arch()
    print(f"Архитектура: {arch}")
    
    # Сборка
    clean()
    build_app(arch)
    create_dmg()
    
    print("\n" + "=" * 50)
    print("✓ Сборка завершена!")
    print(f"  Приложение: {DIST_DIR / 'UTMka.app'}")
    print(f"  DMG: {DIST_DIR / f'UTMka-{version}-macOS.dmg'}")
    print("=" * 50)
    
    print("\n📝 Следующие шаги:")
    print("  1. Протестируйте приложение: open dist/UTMka.app")
    print("  2. Для подписи и нотаризации используйте: installers/macos/sign_and_notarize.sh")
    print("  3. Загрузите DMG в GitHub Releases")


if __name__ == '__main__':
    main()
