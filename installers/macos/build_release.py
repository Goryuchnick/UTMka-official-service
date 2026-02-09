#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для сборки релизных версий UTMka для обеих архитектур macOS

Создает:
- UTMka-2.2.0-macOS-x86_64.dmg (Intel)
- UTMka-2.2.0-macOS-arm64.dmg (Apple Silicon)
"""

import os
import sys
import re
import shutil
import subprocess
import platform
from pathlib import Path

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
    spec_content = SPEC_FILE.read_text(encoding='utf-8')
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


def clean():
    """Очистка предыдущих сборок"""
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)


def build_app_for_arch(arch: str) -> Path:
    """Сборка .app для указанной архитектуры"""
    print(f"\n{'='*60}")
    print(f"Сборка для архитектуры: {arch}")
    print(f"{'='*60}")
    
    # Модифицируем spec для указанной архитектуры
    spec_content = SPEC_FILE.read_text(encoding='utf-8')
    
    # Заменяем target_arch в spec
    if arch == 'arm64':
        spec_content = re.sub(
            r"target_arch=None,",
            "target_arch='arm64',",
            spec_content
        )
    elif arch == 'x86_64':
        spec_content = re.sub(
            r"target_arch=None,",
            "target_arch='x86_64',",
            spec_content
        )
    
    # Сохраняем временный spec
    temp_spec = SCRIPT_DIR / f'UTMka-{arch}.spec'
    temp_spec.write_text(spec_content, encoding='utf-8')
    
    try:
        # Собираем
        result = subprocess.run([
            sys.executable, '-m', 'PyInstaller',
            '--clean',
            '--noconfirm',
            str(temp_spec)
        ], cwd=PROJECT_ROOT)
        
        if result.returncode != 0:
            print(f"✗ Ошибка PyInstaller для {arch}")
            return None
        
        app_path = DIST_DIR / 'UTMka.app'
        if not app_path.exists():
            print(f"✗ UTMka.app не создан для {arch}")
            return None
        
        # Переименовываем с указанием архитектуры
        arch_app_path = DIST_DIR / f'UTMka-{arch}.app'
        if arch_app_path.exists():
            shutil.rmtree(arch_app_path)
        app_path.rename(arch_app_path)
        
        print(f"✓ .app создан: {arch_app_path}")
        return arch_app_path
        
    finally:
        # Удаляем временный spec
        if temp_spec.exists():
            temp_spec.unlink()


def create_dmg_for_arch(arch: str, app_path: Path, version: str):
    """Создание DMG для указанной архитектуры"""
    print(f"\nСоздание DMG для {arch}...")
    
    dmg_path = DIST_DIR / f'UTMka-{version}-macOS-{arch}.dmg'
    
    # Удаляем старый DMG
    if dmg_path.exists():
        dmg_path.unlink()
    
    temp_dir = DIST_DIR / f'dmg_temp_{arch}'
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    
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
        
        print(f"✓ DMG создан: {dmg_path}")
        return dmg_path
        
    finally:
        if temp_dir.exists():
            shutil.rmtree(temp_dir)


def main():
    """Основная функция"""
    print("=" * 60)
    print("Сборка релизных версий UTMka для macOS")
    print("=" * 60)
    
    if sys.platform != 'darwin':
        print("✗ Этот скрипт работает только на macOS!")
        sys.exit(1)
    
    if not (PROJECT_ROOT / 'src').exists():
        print("✗ Запустите из корня проекта!")
        sys.exit(1)
    
    version = get_version()
    print(f"\nВерсия: {version}")
    sync_version(version)
    
    current_arch = platform.machine()
    print(f"Текущая архитектура: {current_arch}")
    
    # Очистка
    print("\nОчистка...")
    clean()
    print("✓ Очистка завершена")
    
    # Собираем для обеих архитектур
    architectures = ['x86_64', 'arm64']
    built_apps = {}
    
    for arch in architectures:
        app_path = build_app_for_arch(arch)
        if app_path:
            built_apps[arch] = app_path
            # Создаём DMG сразу после сборки
            create_dmg_for_arch(arch, app_path, version)
        else:
            print(f"⚠ Не удалось собрать для {arch}")
            if arch == current_arch:
                print(f"  Это странно, так как текущая архитектура: {current_arch}")
            else:
                print(f"  Для нативной сборки {arch} нужен Mac с соответствующей архитектурой")
                print(f"  Или используйте Rosetta 2 для эмуляции")
    
    # Итоги
    print("\n" + "=" * 60)
    print("✓ Сборка завершена!")
    print("=" * 60)
    
    for arch in architectures:
        dmg_path = DIST_DIR / f'UTMka-{version}-macOS-{arch}.dmg'
        if dmg_path.exists():
            size_mb = dmg_path.stat().st_size / (1024 * 1024)
            print(f"  {arch}: {dmg_path.name} ({size_mb:.1f} MB)")
        else:
            print(f"  {arch}: не собрано")
    
    print("\n📝 Следующие шаги:")
    print("  1. Протестируйте оба DMG")
    print("  2. Загрузите в GitHub Releases с тегом v" + version)
    print("  3. Для подписи используйте: ./installers/macos/sign_and_notarize.sh")


if __name__ == '__main__':
    main()
