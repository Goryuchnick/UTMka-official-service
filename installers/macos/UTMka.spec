# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec файл для UTMka macOS
Поддерживает arm64 (Apple Silicon) и x86_64 (Intel)
"""

import os
import sys

# Пути
PROJECT_ROOT = os.path.abspath(os.path.join(SPECPATH, '..', '..'))
FRONTEND_PATH = os.path.join(PROJECT_ROOT, 'frontend')
LOGO_PATH = os.path.join(PROJECT_ROOT, 'logo')
ASSETS_PATH = os.path.join(PROJECT_ROOT, 'assets')

block_cipher = None

a = Analysis(
    [os.path.join(PROJECT_ROOT, 'src', 'desktop', 'main.py')],
    pathex=[PROJECT_ROOT],
    binaries=[],
    datas=[
        # Frontend модули (ES6)
        (FRONTEND_PATH, 'frontend'),
        # Лого (для favicon route в src/api/routes/main.py)
        (LOGO_PATH, 'logo'),
        # Примеры шаблонов (для download_template route)
        (os.path.join(PROJECT_ROOT, 'templates_example.json'), '.'),
        (os.path.join(PROJECT_ROOT, 'templates_example_ru.json'), '.'),
        (os.path.join(PROJECT_ROOT, 'templates_example_en.json'), '.'),
        (os.path.join(PROJECT_ROOT, 'templates_example.csv'), '.'),
    ],
    hiddenimports=[
        'flask',
        'flask_sqlalchemy',
        'sqlalchemy',
        'sqlalchemy.orm',
        'werkzeug.security',
        'webview',
        'webview.platforms.cocoa',  # macOS WebView
        'objc',  # PyObjC для macOS
        'sqlite3',
        'jaraco.text',  # Для PyInstaller
        'platformdirs',  # Для jaraco.text
        'requests',  # Для автообновлений
        'urllib3',  # Зависимость requests
        'certifi',  # SSL сертификаты
        'charset_normalizer',  # Для requests
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',  # Не используем
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
    console=False,  # Без консоли
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,  # None = текущая архитектура, можно указать 'arm64' или 'x86_64'
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
        'CFBundleVersion': '2.2.1',  # Будет заменено build.py
        'CFBundleShortVersionString': '2.2.1',  # Будет заменено build.py
        'NSHighResolutionCapable': True,
        'LSMinimumSystemVersion': '10.13.0',
        'NSRequiresAquaSystemAppearance': False,  # Поддержка Dark Mode
        'NSHumanReadableCopyright': 'Copyright © 2026 UTMka',
    },
)
