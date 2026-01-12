# Описание скриптов сборки UTMka

Этот документ описывает скрипты для сборки приложения UTMka и создания установщиков.

## Структура проекта

Проект поддерживает две версии приложения:
- **PyWebView версия** (`app.py`) - использует библиотеку PyWebView для отображения интерфейса
- **QtWebEngine версия** (`app_qtwebengine.py`) - использует PyQt6 с QtWebEngine для отображения интерфейса

## Скрипты сборки

### 1. `build_exe.bat` - Сборка PyWebView версии
**Назначение:** Собирает исполняемый файл `UTMka.exe` из `app.py` используя PyInstaller.

**Что делает:**
- Проверяет наличие Python и PyInstaller
- Запускает скрипт `scripts/build.py`
- Создает исполняемый файл в папке `dist/UTMka.exe`
- Выводит информацию о результате сборки

**Использование:**
```batch
scripts\build_exe.bat
```

**Требования:**
- Python 3.x
- Установленные зависимости: `pip install -r requirements.txt`
- PyInstaller

---

### 2. `build_qtwebengine.bat` - Сборка QtWebEngine версии
**Назначение:** Собирает исполняемый файл `UTMka_QtWebEngine.exe` из `app_qtwebengine.py`.

**Что делает:**
- Проверяет наличие Python, PyInstaller и PyQt6
- Запускает скрипт `scripts/build_qtwebengine.py`
- Создает исполняемый файл в папке `dist_qtwebengine/UTMka_QtWebEngine.exe`
- Выводит информацию о результате сборки

**Использование:**
```batch
scripts\build_qtwebengine.bat
```

**Требования:**
- Python 3.x
- Установленные зависимости: `pip install -r requirements.txt`
- PyInstaller
- PyQt6 и PyQt6-WebEngine

---

### 3. `build_app.bat` - Упрощенная сборка PyWebView версии
**Назначение:** Упрощенная версия сборки без детальной проверки результатов.

**Что делает:**
- Запускает скрипт `scripts/build.py`
- Создает исполняемый файл в папке `dist/UTMka.exe`

**Использование:**
```batch
scripts\build_app.bat
```

---

### 4. `build_installer.bat` - Создание установщика
**Назначение:** Компилирует установочный файл (.exe) используя Inno Setup.

**Что делает:**
- Проверяет наличие собранного exe файла
- Ищет Inno Setup Compiler (ISCC.exe) в стандартных путях
- Компилирует установщик из .iss файла
- Создает установочный файл в корне проекта

**Использование:**

Для PyWebView версии:
```batch
scripts\build_installer.bat
```
или
```batch
scripts\build_installer.bat standard
```

Для QtWebEngine версии:
```batch
scripts\build_installer.bat qtwebengine
```

**Требования:**
- Inno Setup 6 (установлен в одном из стандартных путей):
  - `C:\Program Files (x86)\Inno Setup 6\ISCC.exe`
  - `C:\Program Files\Inno Setup 6\ISCC.exe`
- Предварительно собранный exe файл:
  - `dist/UTMka.exe` (для стандартной версии)
  - `dist_qtwebengine/UTMka_QtWebEngine.exe` (для QtWebEngine версии)

**Результат:**
- `UTMka_Setup.exe` - установщик для PyWebView версии
- `UTMka_QtWebEngine_Setup.exe` - установщик для QtWebEngine версии

---

## Python скрипты сборки

### `scripts/build.py`
Скрипт для сборки PyWebView версии приложения. Использует PyInstaller для создания единого исполняемого файла.

**Параметры сборки:**
- `--onefile` - создает один исполняемый файл
- `--noconsole` - скрывает консольное окно
- Включает все необходимые данные: шаблоны, HTML, логотипы
- Добавляет скрытые импорты для всех зависимостей

### `scripts/build_qtwebengine.py`
Скрипт для сборки QtWebEngine версии приложения. Аналогичен `build.py`, но:
- Использует `app_qtwebengine.py` как точку входа
- Создает файл `UTMka_QtWebEngine.exe`
- Сохраняет результат в `dist_qtwebengine/`
- Включает импорты PyQt6 и QtWebEngine

---

## Конфигурационные файлы Inno Setup

### `config/setup.iss`
Скрипт для создания установщика PyWebView версии.

### `config/setup_qtwebengine.iss`
Скрипт для создания установщика QtWebEngine версии.

---

## Типичный процесс сборки

### Вариант 1: PyWebView версия
```batch
REM 1. Собрать exe файл
scripts\build_exe.bat

REM 2. Создать установщик
scripts\build_installer.bat
```

### Вариант 2: QtWebEngine версия
```batch
REM 1. Собрать exe файл
scripts\build_qtwebengine.bat

REM 2. Создать установщик
scripts\build_installer.bat qtwebengine
```

---

## Устранение проблем

### Ошибка "Python не найден"
- Убедитесь, что Python установлен и добавлен в PATH
- Проверьте: `python --version`

### Ошибка "PyInstaller не установлен"
- Установите зависимости: `pip install -r requirements.txt`

### Ошибка "Inno Setup не найден"
- Установите Inno Setup 6
- Или укажите путь к ISCC.exe в `build_installer.bat`

### Ошибка "exe файл не найден"
- Сначала запустите соответствующий скрипт сборки:
  - `build_exe.bat` для стандартной версии
  - `build_qtwebengine.bat` для QtWebEngine версии

---

## Примечания

- Все скрипты автоматически переключаются в корневую директорию проекта
- Перед сборкой автоматически очищаются папки `build` и `dist` (или `dist_qtwebengine`)
- Скрипты проверяют наличие необходимых инструментов перед запуском
- Используется кодировка UTF-8 (chcp 65001) для корректного отображения русских символов
