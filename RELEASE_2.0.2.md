# UTMka 2.0.2 - macOS Release

## 🎉 Релиз для macOS

Этот релиз полностью посвящен выпуску UTMka для macOS. Теперь пользователи Mac могут использовать UTMka как нативное приложение с полной поддержкой всех функций.

## 📦 Готовые установщики

Для вашего удобства мы подготовили готовые DMG установщики для обеих архитектур macOS:

### 🍎 Apple Silicon (M1, M2, M3 и новее)
- **Файл**: `UTMka-2.0.2-macOS-ARM.dmg`
- **Архитектура**: arm64
- **Размер**: ~150-200 МБ
- **Системные требования**: macOS 10.13 или новее

### 💻 Intel (x86_64)
- **Файл**: `UTMka-2.0.2-macOS-Intel.dmg`
- **Архитектура**: x86_64
- **Размер**: ~150-200 МБ
- **Системные требования**: macOS 10.13 или новее

## 📥 Установка готовых версий

### Быстрая установка

1. **Скачайте DMG файл** для вашей архитектуры:
   - Для Mac с Apple Silicon → `UTMka-2.0.2-macOS-ARM.dmg`
   - Для Mac с Intel → `UTMka-2.0.2-macOS-Intel.dmg`

2. **Откройте DMG файл** — он появится в Finder

3. **Перетащите UTMka.app** в папку Applications
   - Или дважды кликните на приложение для запуска без установки

4. **При первом запуске** macOS может показать предупреждение о безопасности:
   - Откройте **Системные настройки** > **Безопасность и конфиденциальность**
   - Найдите сообщение о UTMka
   - Нажмите **"Открыть в любом случае"**

### Альтернативный способ (через Terminal)

Если предупреждение не появляется или вы хотите обойти его сразу:

```bash
# Удалите расширенные атрибуты
xattr -cr /Applications/UTMka.app

# Или если приложение не в Applications, укажите полный путь
xattr -cr /path/to/UTMka.app
```

Подробные инструкции по установке: см. [INSTALL_MACOS.md](INSTALL_MACOS.md)

## 🔨 Сборка из исходников

Если вы хотите собрать приложение самостоятельно из исходного кода, следуйте этому руководству.

### Шаг 1: Клонирование репозитория

```bash
# Клонируйте репозиторий
git clone https://github.com/your-username/UTMka-official-service.git

# Перейдите в директорию проекта
cd UTMka-official-service
```

### Шаг 2: Установка зависимостей

#### 2.1. Установите Python (если еще не установлен)

```bash
# Проверьте версию Python
python3 --version

# Должна быть версия 3.8 или новее
# Если Python не установлен, установите через Homebrew:
brew install python3
```

#### 2.2. Установите зависимости проекта

```bash
# Установите все зависимости из requirements.txt
pip3 install -r requirements.txt

# Установите PyInstaller для сборки
pip3 install pyinstaller
```

**Основные зависимости:**
- Flask (веб-сервер)
- PyQt6 (GUI фреймворк)
- PyQt6-WebEngine (веб-движок)
- pywebview (окно приложения)
- Другие зависимости из `requirements.txt`

### Шаг 3: Подготовка иконки

Иконка уже должна быть в проекте (`logo/logoutm.icns`), но если её нет, создайте её:

```bash
# Перейдите в директорию проекта
cd UTMka-official-service

# Создайте папку для иконок
mkdir -p logo/logoutm.iconset

# Создайте разные размеры иконок из PNG
sips -z 16 16 logo/logoutm.png --out logo/logoutm.iconset/icon_16x16.png
sips -z 32 32 logo/logoutm.png --out logo/logoutm.iconset/icon_16x16@2x.png
sips -z 32 32 logo/logoutm.png --out logo/logoutm.iconset/icon_32x32.png
sips -z 64 64 logo/logoutm.png --out logo/logoutm.iconset/icon_32x32@2x.png
sips -z 128 128 logo/logoutm.png --out logo/logoutm.iconset/icon_128x128.png
sips -z 256 256 logo/logoutm.png --out logo/logoutm.iconset/icon_128x128@2x.png
sips -z 256 256 logo/logoutm.png --out logo/logoutm.iconset/icon_256x256.png
sips -z 512 512 logo/logoutm.png --out logo/logoutm.iconset/icon_256x256@2x.png
sips -z 512 512 logo/logoutm.png --out logo/logoutm.iconset/icon_512x512.png
sips -z 1024 1024 logo/logoutm.png --out logo/logoutm.iconset/icon_512x512@2x.png

# Создайте .icns файл
iconutil -c icns logo/logoutm.iconset -o logo/logoutm.icns

# Удалите временную папку
rm -rf logo/logoutm.iconset
```

### Шаг 4: Сборка приложения

#### Для Apple Silicon (ARM)

Если у вас Mac с Apple Silicon (M1/M2/M3):

```bash
# Сделайте скрипты исполняемыми
chmod +x scripts/build_macos_arm.sh
chmod +x scripts/create_dmg_arm.sh

# Соберите приложение
./scripts/build_macos_arm.sh

# Создайте DMG установщик
./scripts/create_dmg_arm.sh
```

**Результат:**
- Приложение: `dist/UTMka.app`
- DMG установщик: `dist/UTMka-2.0.2-macOS-ARM.dmg`

#### Для Intel (x86_64)

Если у вас Mac с процессором Intel:

```bash
# Сделайте скрипты исполняемыми
chmod +x scripts/build_macos_intel.sh
chmod +x scripts/create_dmg_intel.sh

# Соберите приложение
./scripts/build_macos_intel.sh

# Создайте DMG установщик
./scripts/create_dmg_intel.sh
```

**Результат:**
- Приложение: `dist/UTMka.app`
- DMG установщик: `dist/UTMka-2.0.2-macOS-Intel.dmg`

#### Сборка обеих версий на Mac с Apple Silicon

Если у вас Mac с Apple Silicon, вы можете собрать обе версии:

```bash
# 1. Соберите ARM версию (нативная)
./scripts/build_macos_arm.sh
./scripts/create_dmg_arm.sh
mv dist/UTMka.app dist/UTMka.app.arm
mv dist/UTMka-2.0.2-macOS-ARM.dmg dist/UTMka-2.0.2-macOS-ARM.dmg.backup

# 2. Соберите Intel версию (через Rosetta 2)
arch -x86_64 ./scripts/build_macos_intel.sh
arch -x86_64 ./scripts/create_dmg_intel.sh

# Теперь у вас есть обе версии:
# - dist/UTMka.app.arm (ARM версия)
# - dist/UTMka.app (Intel версия)
# - dist/UTMka-2.0.2-macOS-ARM.dmg.backup
# - dist/UTMka-2.0.2-macOS-Intel.dmg
```

**Примечание:** Для сборки Intel версии на Mac с Apple Silicon требуется Rosetta 2 (обычно устанавливается автоматически при первом использовании).

### Шаг 5: Проверка сборки

Проверьте, что приложение собрано правильно:

```bash
# Проверьте архитектуру собранного приложения
file dist/UTMka.app/Contents/MacOS/UTMka

# Для ARM должно показать: arm64
# Для Intel должно показать: x86_64

# Попробуйте запустить приложение
open dist/UTMka.app
```

## 🔍 Структура проекта

```
UTMka-official-service/
├── app.py                    # Основной файл приложения
├── index.html                # Интерфейс приложения
├── requirements.txt          # Зависимости Python
├── UTMka_macos_arm.spec      # Спецификация PyInstaller для ARM
├── UTMka_macos_intel.spec    # Спецификация PyInstaller для Intel
├── INSTALL_MACOS.md          # Инструкция по установке
├── BUILD_MACOS.md            # Подробная инструкция по сборке
├── scripts/
│   ├── build_macos_arm.sh    # Скрипт сборки для ARM
│   ├── build_macos_intel.sh  # Скрипт сборки для Intel
│   ├── create_dmg_arm.sh     # Создание DMG для ARM
│   └── create_dmg_intel.sh   # Создание DMG для Intel
├── logo/
│   ├── logoutm.png           # Исходная иконка PNG
│   └── logoutm.icns          # Иконка для macOS
└── dist/                     # Результаты сборки
    ├── UTMka.app             # Собранное приложение
    └── *.dmg                 # DMG установщики
```

## 🛠️ Решение проблем при сборке

### Проблема: "PyInstaller не найден"

```bash
pip3 install pyinstaller
```

### Проблема: "Не удалось импортировать PyQt6"

```bash
pip3 install PyQt6 PyQt6-WebEngine
```

### Проблема: Ошибка архитектуры при сборке ARM на Intel Mac

Если вы пытаетесь собрать ARM версию на Intel Mac, это не сработает без специальной настройки. Используйте Mac с Apple Silicon или собирайте только Intel версию.

### Проблема: "sips или iconutil не найдены"

Эти утилиты встроены в macOS. Если они не работают, проверьте целостность системы.

### Проблема: Приложение не запускается после сборки

1. **Проверьте логи:**
   ```bash
   # Запустите из Terminal для просмотра ошибок
   dist/UTMka.app/Contents/MacOS/UTMka
   ```

2. **Проверьте права доступа:**
   ```bash
   chmod +x dist/UTMka.app/Contents/MacOS/UTMka
   ```

3. **Проверьте Console.app** для системных логов

4. **Удалите расширенные атрибуты:**
   ```bash
   xattr -cr dist/UTMka.app
   ```

## 📝 Дополнительная информация

### Подписание приложения (опционально)

Для распространения через App Store или для обхода предупреждений безопасности:

```bash
# Подпишите приложение (требуется Developer ID)
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" dist/UTMka.app

# Проверьте подпись
codesign --verify --verbose dist/UTMka.app
```

### Нотаризация (опционально)

Для распространения вне App Store рекомендуется нотаризация:

```bash
# Создайте zip архив для нотаризации
ditto -c -k --keepParent dist/UTMka.app dist/UTMka.zip

# Отправьте на нотаризацию
xcrun notarytool submit dist/UTMka.zip \
  --apple-id "your@email.com" \
  --team-id "YOUR_TEAM_ID" \
  --password "app-specific-password" \
  --wait

# После успешной нотаризации, добавьте тикет
xcrun stapler staple dist/UTMka.app
```

## 📊 Технические детали

- **Размер приложения**: ~150-200 МБ
- **Размер DMG**: ~100-150 МБ (сжатие)
- **Минимальная версия macOS**: 10.13 (High Sierra)
- **Поддерживаемые архитектуры**: arm64 (Apple Silicon), x86_64 (Intel)
- **Языки интерфейса**: Русский, Английский

## 🙏 Благодарности

Спасибо всем, кто тестировал приложение и сообщал об ошибках!

---

## 🎉 UTMka 2.0.2 - macOS Release (English)

## 🎉 macOS Release

This release is fully dedicated to the release of UTMka for macOS. Mac users can now use UTMka as a native application with full support for all features.

## 📦 Ready-to-Use Installers

For your convenience, we have prepared ready-to-use DMG installers for both macOS architectures:

### 🍎 Apple Silicon (M1, M2, M3 and newer)
- **File**: `UTMka-2.0.2-macOS-ARM.dmg`
- **Architecture**: arm64
- **Size**: ~150-200 MB
- **System Requirements**: macOS 10.13 or later

### 💻 Intel (x86_64)
- **File**: `UTMka-2.0.2-macOS-Intel.dmg`
- **Architecture**: x86_64
- **Size**: ~150-200 MB
- **System Requirements**: macOS 10.13 or later

## 📥 Installing Ready Versions

### Quick Installation

1. **Download the DMG file** for your architecture:
   - For Mac with Apple Silicon → `UTMka-2.0.2-macOS-ARM.dmg`
   - For Mac with Intel → `UTMka-2.0.2-macOS-Intel.dmg`

2. **Open the DMG file** — it will appear in Finder

3. **Drag UTMka.app** to the Applications folder
   - Or double-click the app to run without installation

4. **On first launch**, macOS may show a security warning:
   - Open **System Preferences** > **Security & Privacy**
   - Find the message about UTMka
   - Click **"Open Anyway"**

### Alternative Method (via Terminal)

If the warning doesn't appear or you want to bypass it immediately:

```bash
# Remove extended attributes
xattr -cr /Applications/UTMka.app

# Or if the app is not in Applications, specify the full path
xattr -cr /path/to/UTMka.app
```

Detailed installation instructions: see [INSTALL_MACOS.md](INSTALL_MACOS.md)

## 🔨 Building from Source

If you want to build the application yourself from source code, follow this guide.

### Step 1: Cloning the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/UTMka-official-service.git

# Navigate to the project directory
cd UTMka-official-service
```

### Step 2: Installing Dependencies

#### 2.1. Install Python (if not already installed)

```bash
# Check Python version
python3 --version

# Should be version 3.8 or newer
# If Python is not installed, install via Homebrew:
brew install python3
```

#### 2.2. Install Project Dependencies

```bash
# Install all dependencies from requirements.txt
pip3 install -r requirements.txt

# Install PyInstaller for building
pip3 install pyinstaller
```

**Main dependencies:**
- Flask (web server)
- PyQt6 (GUI framework)
- PyQt6-WebEngine (web engine)
- pywebview (application window)
- Other dependencies from `requirements.txt`

### Step 3: Preparing the Icon

The icon should already be in the project (`logo/logoutm.icns`), but if it's not, create it:

```bash
# Navigate to the project directory
cd UTMka-official-service

# Create iconset directory
mkdir -p logo/logoutm.iconset

# Create different icon sizes from PNG
sips -z 16 16 logo/logoutm.png --out logo/logoutm.iconset/icon_16x16.png
sips -z 32 32 logo/logoutm.png --out logo/logoutm.iconset/icon_16x16@2x.png
sips -z 32 32 logo/logoutm.png --out logo/logoutm.iconset/icon_32x32.png
sips -z 64 64 logo/logoutm.png --out logo/logoutm.iconset/icon_32x32@2x.png
sips -z 128 128 logo/logoutm.png --out logo/logoutm.iconset/icon_128x128.png
sips -z 256 256 logo/logoutm.png --out logo/logoutm.iconset/icon_128x128@2x.png
sips -z 256 256 logo/logoutm.png --out logo/logoutm.iconset/icon_256x256.png
sips -z 512 512 logo/logoutm.png --out logo/logoutm.iconset/icon_256x256@2x.png
sips -z 512 512 logo/logoutm.png --out logo/logoutm.iconset/icon_512x512.png
sips -z 1024 1024 logo/logoutm.png --out logo/logoutm.iconset/icon_512x512@2x.png

# Create .icns file
iconutil -c icns logo/logoutm.iconset -o logo/logoutm.icns

# Remove temporary directory
rm -rf logo/logoutm.iconset
```

### Step 4: Building the Application

#### For Apple Silicon (ARM)

If you have a Mac with Apple Silicon (M1/M2/M3):

```bash
# Make scripts executable
chmod +x scripts/build_macos_arm.sh
chmod +x scripts/create_dmg_arm.sh

# Build the application
./scripts/build_macos_arm.sh

# Create DMG installer
./scripts/create_dmg_arm.sh
```

**Result:**
- Application: `dist/UTMka.app`
- DMG installer: `dist/UTMka-2.0.2-macOS-ARM.dmg`

#### For Intel (x86_64)

If you have a Mac with Intel processor:

```bash
# Make scripts executable
chmod +x scripts/build_macos_intel.sh
chmod +x scripts/create_dmg_intel.sh

# Build the application
./scripts/build_macos_intel.sh

# Create DMG installer
./scripts/create_dmg_intel.sh
```

**Result:**
- Application: `dist/UTMka.app`
- DMG installer: `dist/UTMka-2.0.2-macOS-Intel.dmg`

#### Building Both Versions on Mac with Apple Silicon

If you have a Mac with Apple Silicon, you can build both versions:

```bash
# 1. Build ARM version (native)
./scripts/build_macos_arm.sh
./scripts/create_dmg_arm.sh
mv dist/UTMka.app dist/UTMka.app.arm
mv dist/UTMka-2.0.2-macOS-ARM.dmg dist/UTMka-2.0.2-macOS-ARM.dmg.backup

# 2. Build Intel version (via Rosetta 2)
arch -x86_64 ./scripts/build_macos_intel.sh
arch -x86_64 ./scripts/create_dmg_intel.sh

# Now you have both versions:
# - dist/UTMka.app.arm (ARM version)
# - dist/UTMka.app (Intel version)
# - dist/UTMka-2.0.2-macOS-ARM.dmg.backup
# - dist/UTMka-2.0.2-macOS-Intel.dmg
```

**Note:** Building Intel version on Mac with Apple Silicon requires Rosetta 2 (usually installed automatically on first use).

### Step 5: Verifying the Build

Check that the application is built correctly:

```bash
# Check the architecture of the built application
file dist/UTMka.app/Contents/MacOS/UTMka

# For ARM should show: arm64
# For Intel should show: x86_64

# Try to launch the application
open dist/UTMka.app
```

## 🛠️ Troubleshooting Build Issues

### Issue: "PyInstaller not found"

```bash
pip3 install pyinstaller
```

### Issue: "Failed to import PyQt6"

```bash
pip3 install PyQt6 PyQt6-WebEngine
```

### Issue: Architecture error when building ARM on Intel Mac

If you're trying to build ARM version on Intel Mac, it won't work without special setup. Use a Mac with Apple Silicon or build only Intel version.

### Issue: "sips or iconutil not found"

These utilities are built into macOS. If they don't work, check system integrity.

### Issue: Application won't launch after build

1. **Check logs:**
   ```bash
   # Run from Terminal to see errors
   dist/UTMka.app/Contents/MacOS/UTMka
   ```

2. **Check permissions:**
   ```bash
   chmod +x dist/UTMka.app/Contents/MacOS/UTMka
   ```

3. **Check Console.app** for system logs

4. **Remove extended attributes:**
   ```bash
   xattr -cr dist/UTMka.app
   ```

## 📊 Technical Details

- **Application size**: ~150-200 MB
- **DMG size**: ~100-150 MB (compressed)
- **Minimum macOS version**: 10.13 (High Sierra)
- **Supported architectures**: arm64 (Apple Silicon), x86_64 (Intel)
- **Interface languages**: Russian, English

## 🙏 Acknowledgments

Thanks to everyone who tested the app and reported bugs!
