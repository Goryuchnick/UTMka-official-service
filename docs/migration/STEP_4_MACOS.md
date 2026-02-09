# Этап 4: macOS Сборка

## Цель

Создать .app bundle и DMG установщик для macOS.

## Время: 2-3 дня

---

## Требования

- macOS (для сборки)
- Python 3.8+
- PyInstaller
- create-dmg (опционально)

---

## Важно: Apple Developer Account

| Есть аккаунт ($99/год) | Нет аккаунта |
|------------------------|--------------|
| Подпись и нотаризация | Предупреждение "неизвестный разработчик" |
| Нет предупреждений | Пользователь открывает через ПКМ → "Открыть" |
| App Store (опционально) | Невозможно |

**Рекомендация:** Начните без аккаунта, купите когда появятся пользователи.

---

## Структура .app bundle

```
UTMka.app/
└── Contents/
    ├── Info.plist           # Метаданные приложения
    ├── MacOS/
    │   └── UTMka            # Исполняемый файл
    ├── Resources/
    │   ├── logoutm.icns     # Иконка
    │   ├── frontend/        # Frontend файлы
    │   └── assets/          # Ресурсы
    └── Frameworks/          # Зависимости
```

## Данные приложения

```
~/Library/Application Support/UTMka/
├── databases/
│   └── utmka.db
├── exports/
├── logs/
└── config.json
```

---

## Шаг 4.1: PyInstaller Spec для macOS

### Файл: `installers/macos/UTMka.spec`

```python
# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec файл для UTMka macOS
"""

import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(SPECPATH, '..', '..'))
FRONTEND_PATH = os.path.join(PROJECT_ROOT, 'frontend')
ASSETS_PATH = os.path.join(PROJECT_ROOT, 'assets')

block_cipher = None

a = Analysis(
    [os.path.join(PROJECT_ROOT, 'src', 'desktop', 'main.py')],
    pathex=[PROJECT_ROOT],
    binaries=[],
    datas=[
        (FRONTEND_PATH, 'frontend'),
        (ASSETS_PATH, 'assets'),
    ],
    hiddenimports=[
        'flask',
        'flask_sqlalchemy',
        'webview',
        'webview.platforms.cocoa',  # macOS WebView
        'sqlite3',
        'marshmallow',
        'objc',  # PyObjC для macOS
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
        'PIL',
        'pytest',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='UTMka',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # UPX не работает на macOS ARM
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,  # 'arm64' или 'x86_64' или None для universal
    codesign_identity=None,  # Добавить при наличии сертификата
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='UTMka',
)

app = BUNDLE(
    coll,
    name='UTMka.app',
    icon=os.path.join(ASSETS_PATH, 'logo', 'logoutm.icns'),
    bundle_identifier='ru.utmka.desktop',
    info_plist={
        'CFBundleName': 'UTMka',
        'CFBundleDisplayName': 'UTMka',
        'CFBundleVersion': '3.0.0',
        'CFBundleShortVersionString': '3.0.0',
        'NSHighResolutionCapable': True,
        'LSMinimumSystemVersion': '10.13.0',
        'NSRequiresAquaSystemAppearance': False,  # Поддержка Dark Mode
    },
)
```

---

## Шаг 4.2: Скрипт сборки

### Файл: `installers/macos/build.py`

```python
#!/usr/bin/env python3
"""
Скрипт сборки macOS версии UTMka
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DIST_DIR = PROJECT_ROOT / 'dist'
BUILD_DIR = PROJECT_ROOT / 'build'

def clean():
    """Очистка"""
    print("Очистка...")
    
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    
    print("✓ Очистка завершена")

def build_app():
    """Сборка .app"""
    print("\nСборка приложения...")
    
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
    
    print("✓ .app создан")

def create_dmg():
    """Создание DMG"""
    print("\nСоздание DMG...")
    
    app_path = DIST_DIR / 'UTMka.app'
    dmg_path = DIST_DIR / 'UTMka-3.0.0-macOS.dmg'
    
    if not app_path.exists():
        print("✗ UTMka.app не найден")
        sys.exit(1)
    
    # Проверяем наличие create-dmg
    try:
        subprocess.run(['create-dmg', '--version'], 
                      capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠ create-dmg не установлен")
        print("  Установите: brew install create-dmg")
        print("  Или создайте DMG вручную через Disk Utility")
        return
    
    # Удаляем старый DMG
    if dmg_path.exists():
        dmg_path.unlink()
    
    result = subprocess.run([
        'create-dmg',
        '--volname', 'UTMka',
        '--volicon', str(PROJECT_ROOT / 'assets' / 'logo' / 'logoutm.icns'),
        '--window-pos', '200', '120',
        '--window-size', '600', '400',
        '--icon-size', '100',
        '--icon', 'UTMka.app', '150', '185',
        '--app-drop-link', '450', '185',
        '--hide-extension', 'UTMka.app',
        str(dmg_path),
        str(app_path)
    ])
    
    if result.returncode != 0:
        print("⚠ Ошибка create-dmg, пробуем простой метод...")
        simple_dmg()
    else:
        print("✓ DMG создан")

def simple_dmg():
    """Простое создание DMG через hdiutil"""
    app_path = DIST_DIR / 'UTMka.app'
    dmg_path = DIST_DIR / 'UTMka-3.0.0-macOS.dmg'
    temp_dir = DIST_DIR / 'dmg_temp'
    
    # Создаём временную папку
    temp_dir.mkdir(exist_ok=True)
    
    # Копируем .app
    shutil.copytree(app_path, temp_dir / 'UTMka.app')
    
    # Создаём ссылку на Applications
    os.symlink('/Applications', temp_dir / 'Applications')
    
    # Создаём DMG
    subprocess.run([
        'hdiutil', 'create',
        '-volname', 'UTMka',
        '-srcfolder', str(temp_dir),
        '-ov',
        '-format', 'UDZO',
        str(dmg_path)
    ])
    
    # Удаляем временную папку
    shutil.rmtree(temp_dir)
    
    print("✓ DMG создан (простой метод)")

def main():
    """Главная функция"""
    print("=" * 50)
    print("Сборка UTMka для macOS")
    print("=" * 50)
    
    if sys.platform != 'darwin':
        print("✗ Этот скрипт работает только на macOS!")
        sys.exit(1)
    
    clean()
    build_app()
    create_dmg()
    
    print("\n" + "=" * 50)
    print("✓ Сборка завершена!")
    print(f"  Приложение: {DIST_DIR / 'UTMka.app'}")
    print(f"  DMG: {DIST_DIR / 'UTMka-3.0.0-macOS.dmg'}")
    print("=" * 50)

if __name__ == '__main__':
    main()
```

---

## Шаг 4.3: Подпись и нотаризация (если есть аккаунт)

### Файл: `installers/macos/sign_and_notarize.sh`

```bash
#!/bin/bash
# Подпись и нотаризация для Apple Developer Account
# Требует: Apple Developer ID Application certificate

set -e

APP_PATH="dist/UTMka.app"
DMG_PATH="dist/UTMka-3.0.0-macOS.dmg"

# Замените на ваш Developer ID
DEVELOPER_ID="Developer ID Application: Your Name (XXXXXXXXXX)"
APPLE_ID="your@email.com"
TEAM_ID="XXXXXXXXXX"
APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App-specific password

echo "=== Подпись приложения ==="
codesign --deep --force --verify --verbose \
    --sign "$DEVELOPER_ID" \
    --options runtime \
    "$APP_PATH"

echo "=== Проверка подписи ==="
codesign --verify --verbose "$APP_PATH"

echo "=== Нотаризация ==="
# Создаём zip для отправки
ditto -c -k --keepParent "$APP_PATH" "dist/UTMka.zip"

xcrun notarytool submit "dist/UTMka.zip" \
    --apple-id "$APPLE_ID" \
    --team-id "$TEAM_ID" \
    --password "$APP_PASSWORD" \
    --wait

echo "=== Stapling ==="
xcrun stapler staple "$APP_PATH"

echo "=== Готово! ==="
rm "dist/UTMka.zip"
```

---

## Обход предупреждения без аккаунта

Пользователи macOS увидят: "UTMka не может быть открыто, так как его не удалось проверить."

**Инструкция для пользователей:**

1. **Способ 1 (рекомендуется):**
   - Кликните правой кнопкой мыши на UTMka.app
   - Выберите "Открыть"
   - В диалоге нажмите "Открыть"

2. **Способ 2:**
   - Откройте Системные настройки → Безопасность
   - Нажмите "Всё равно открыть" рядом с UTMka

---

## Шаг 4.4: Автообновления для macOS

### Подход 1: Sparkle Framework (рекомендуется)

**Sparkle** — стандартное решение для автообновлений в macOS.

**Установка:**
```bash
# Добавить Sparkle в .app bundle
# Скачать: https://sparkle-project.org/
```

**Интеграция:**
1. Встроить Sparkle.framework в `UTMka.app/Contents/Frameworks/`
2. Создать `appcast.xml` с информацией о релизах
3. Хостить appcast.xml на GitHub Pages или CDN
4. Sparkle автоматически проверяет обновления при запуске

**Преимущества:**
- Автоматическая проверка и установка
- Подпись обновлений для безопасности
- Нативный UI macOS

### Подход 2: Ручной DMG (проще, без Sparkle)

Использовать существующую логику в `src/core/updater.py`:

```python
# updater.py уже содержит платформу-специфичный код:
if sys.platform == 'darwin':
    # Скачать .dmg из GitHub Releases
    # subprocess.Popen(['open', dmg_path])
    # Показать инструкцию в модалке
```

**Модалка для macOS** (frontend):
```
"Скачано обновление UTMka-3.0.1.dmg
1. Откройте DMG
2. Перетащите UTMka.app в Applications
3. Перезапустите приложение"
```

### Изменения в `src/core/updater.py`

Функция `check_for_updates()` уже ищет `.dmg` для macOS:
```python
platform_suffix = '.exe' if sys.platform == 'win32' else '.dmg'
```

Функция `install_update()` уже поддерживает macOS:
```python
elif sys.platform == 'darwin':
    subprocess.Popen(['open', installer_path])
```

### GitHub Releases формат

При создании релиза включать оба файла:
- `UTMka-Setup-3.0.1.exe` (Windows)
- `UTMka-3.0.1-macOS.dmg` (macOS)

---

## Чек-лист завершения этапа

- [x] .app bundle создаётся
- [x] Приложение запускается на macOS
- [x] DMG создаётся
- [x] Данные хранятся в ~/Library/Application Support/
- [x] Инструкция по обходу Gatekeeper написана
- [x] Автообновления работают (ручной DMG через updater.py)

## Статус выполнения

✅ **Этап 4 выполнен**

Созданы файлы:
- `installers/macos/UTMka.spec` — PyInstaller spec для macOS
- `installers/macos/build.py` — скрипт сборки с автосинхронизацией версии
- `installers/macos/sign_and_notarize.sh` — скрипт подписи и нотаризации
- `installers/macos/README.md` — документация по сборке
- `installers/macos/build_all_archs.py` — скрипт для сборки обеих архитектур

**Особенности:**
- Поддержка arm64 (Apple Silicon) и x86_64 (Intel)
- Автоматическая синхронизация версии из `src/core/version.py`
- Создание DMG через `hdiutil` (с опциональной поддержкой `create-dmg`)
- Интеграция с OTA обновлениями (уже реализовано в `src/core/updater.py`)
- Скрипт подписи и нотаризации для Apple Developer Account

**Использование:**
```bash
# Сборка для текущей архитектуры
python installers/macos/build.py

# Результат:
# - dist/UTMka.app
# - dist/UTMka-2.2.0-macOS.dmg
```
