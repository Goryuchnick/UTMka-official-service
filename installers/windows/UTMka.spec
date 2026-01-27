# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec файл для UTMka Windows
"""

import os
import sys

# Пути
PROJECT_ROOT = os.path.abspath(os.path.join(SPECPATH, '..', '..'))
FRONTEND_PATH = os.path.join(PROJECT_ROOT, 'frontend')
LOGO_PATH = os.path.join(PROJECT_ROOT, 'logo')

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
        'webview.platforms.winforms',  # Windows WebView2
        'clr',  # pythonnet для WebView2
        'sqlite3',
        'marshmallow',
        'jaraco.text',  # Для PyInstaller
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
    upx=True,  # Сжатие
    console=False,  # Без консоли
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=os.path.join(PROJECT_ROOT, 'logo', 'logoutm.ico'),
    version='version_info.txt',  # Информация о версии
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='UTMka',
)
