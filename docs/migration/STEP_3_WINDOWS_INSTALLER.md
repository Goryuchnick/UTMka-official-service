# Этап 3: Windows Установщик

## Цель

Создать профессиональный установщик для Windows с правильным размещением файлов.

## Время: 2-3 дня

---

## Требования

- [Inno Setup](https://jrsoftware.org/isinfo.php) (бесплатный)
- PyInstaller (уже установлен)
- Python 3.8+

---

## Структура после установки

```
C:\Program Files\UTMka\              # Приложение (read-only)
├── UTMka.exe
├── _internal\                       # Зависимости Python
├── frontend\                        # Frontend файлы
│   ├── index.html
│   ├── css\
│   └── js\
└── assets\
    ├── logo\
    └── templates\

C:\Users\<user>\AppData\Roaming\UTMka\   # Данные (read-write)
├── databases\
│   └── utmka.db
├── exports\
├── logs\
└── config.json
```

---

## Шаг 3.1: PyInstaller Spec файл

### Файл: `installers/windows/UTMka.spec`

```python
# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec файл для UTMka Windows
"""

import os
import sys

# Пути
PROJECT_ROOT = os.path.abspath(os.path.join(SPECPATH, '..', '..'))
FRONTEND_PATH = os.path.join(PROJECT_ROOT, 'frontend')
ASSETS_PATH = os.path.join(PROJECT_ROOT, 'assets')

block_cipher = None

a = Analysis(
    [os.path.join(PROJECT_ROOT, 'src', 'desktop', 'main.py')],
    pathex=[PROJECT_ROOT],
    binaries=[],
    datas=[
        # Frontend файлы
        (FRONTEND_PATH, 'frontend'),
        # Ресурсы
        (ASSETS_PATH, 'assets'),
    ],
    hiddenimports=[
        'flask',
        'flask_sqlalchemy',
        'webview',
        'webview.platforms.winforms',  # Windows WebView
        'clr',  # .NET для WebView2
        'sqlite3',
        'marshmallow',
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
    icon=os.path.join(ASSETS_PATH, 'logo', 'logoutm.ico'),
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
```

### Файл: `installers/windows/version_info.txt`

```
VSVersionInfo(
  ffi=FixedFileInfo(
    filevers=(3, 0, 0, 0),
    prodvers=(3, 0, 0, 0),
    mask=0x3f,
    flags=0x0,
    OS=0x40004,
    fileType=0x1,
    subtype=0x0,
    date=(0, 0)
  ),
  kids=[
    StringFileInfo([
      StringTable(
        u'040904B0',
        [
          StringStruct(u'CompanyName', u'UTMka'),
          StringStruct(u'FileDescription', u'UTMka - UTM Link Generator'),
          StringStruct(u'FileVersion', u'3.0.0'),
          StringStruct(u'InternalName', u'UTMka'),
          StringStruct(u'LegalCopyright', u'Copyright (c) 2024 UTMka'),
          StringStruct(u'OriginalFilename', u'UTMka.exe'),
          StringStruct(u'ProductName', u'UTMka'),
          StringStruct(u'ProductVersion', u'3.0.0')
        ]
      )
    ]),
    VarFileInfo([VarStruct(u'Translation', [1033, 1200])])
  ]
)
```

---

## Шаг 3.2: Inno Setup скрипт

### Файл: `installers/windows/setup.iss`

```iss
; UTMka Installer Script
; Inno Setup 6.x

#define MyAppName "UTMka"
#define MyAppVersion "3.0.0"
#define MyAppPublisher "UTMka"
#define MyAppURL "https://utmka.ru"
#define MyAppExeName "UTMka.exe"

[Setup]
; Уникальный ID приложения (генерируется один раз!)
AppId={{YOUR-GUID-HERE}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Пути установки
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Выходной файл
OutputDir=..\..\dist
OutputBaseFilename=UTMka-Setup-{#MyAppVersion}

; Сжатие
Compression=lzma2/ultra64
SolidCompression=yes

; Внешний вид
WizardStyle=modern
SetupIconFile=..\..\assets\logo\logoutm.ico
UninstallDisplayIcon={app}\{#MyAppExeName}

; Требования
MinVersion=10.0
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

; Лицензия (опционально)
; LicenseFile=LICENSE.txt

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Основные файлы приложения
Source: "dist\UTMka\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Ярлыки
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Удалить {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Запустить после установки
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
// Создание папки данных при установке
procedure CurStepChanged(CurStep: TSetupStep);
var
  DataDir: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Создаём папку данных в AppData
    DataDir := ExpandConstant('{userappdata}\UTMka');
    if not DirExists(DataDir) then
    begin
      CreateDir(DataDir);
      CreateDir(DataDir + '\databases');
      CreateDir(DataDir + '\exports');
      CreateDir(DataDir + '\logs');
    end;
  end;
end;

// Удаление данных при полном удалении (опционально)
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir: String;
  RemoveData: Boolean;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    DataDir := ExpandConstant('{userappdata}\UTMka');
    if DirExists(DataDir) then
    begin
      RemoveData := MsgBox('Удалить данные приложения (история, шаблоны)?', 
                           mbConfirmation, MB_YESNO) = IDYES;
      if RemoveData then
        DelTree(DataDir, True, True, True);
    end;
  end;
end;

[Registry]
; Регистрация протокола utmka:// (опционально)
Root: HKCR; Subkey: "utmka"; ValueType: string; ValueData: "URL:UTMka Protocol"; Flags: uninsdeletekey
Root: HKCR; Subkey: "utmka"; ValueName: "URL Protocol"; ValueType: string; ValueData: ""
Root: HKCR; Subkey: "utmka\shell\open\command"; ValueType: string; ValueData: """{app}\{#MyAppExeName}"" ""%1"""
```

---

## Шаг 3.3: Скрипт сборки

### Файл: `installers/windows/build.py`

```python
#!/usr/bin/env python3
"""
Скрипт сборки Windows версии UTMka
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

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
    print(f"  Установщик: {DIST_DIR / 'UTMka-Setup-3.0.0.exe'}")
    print("=" * 50)

if __name__ == '__main__':
    main()
```

---

## Шаг 3.4: Тестирование

### Чек-лист тестирования:

1. **Установка**
   - [ ] Установщик запускается без ошибок
   - [ ] Файлы копируются в Program Files
   - [ ] Папка данных создаётся в AppData
   - [ ] Ярлыки создаются

2. **Работа приложения**
   - [ ] Приложение запускается
   - [ ] База данных создаётся в AppData
   - [ ] История сохраняется
   - [ ] Шаблоны сохраняются

3. **Обновление**
   - [ ] Установка поверх старой версии работает
   - [ ] Данные пользователя сохраняются

4. **Удаление**
   - [ ] Приложение удаляется полностью
   - [ ] Опция удаления данных работает

---

## Чек-лист завершения этапа

- [ ] PyInstaller spec файл создан и работает
- [ ] Inno Setup скрипт создан
- [ ] Установщик создаётся без ошибок
- [ ] Приложение работает после установки
- [ ] Данные хранятся в AppData
