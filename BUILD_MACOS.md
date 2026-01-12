# Инструкция по сборке UTMka для macOS

## Требования

- macOS 10.13 или новее
- Python 3.8 или новее
- PyInstaller
- Все зависимости из `requirements.txt`

## Подготовка

1. **Установите зависимости**:
   ```bash
   pip3 install -r requirements.txt
   pip3 install pyinstaller
   ```

2. **Создайте иконку .icns** (если еще не создана):
   ```bash
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

## Сборка для Apple Silicon (ARM)

1. **Запустите скрипт сборки**:
   ```bash
   chmod +x scripts/build_macos_arm.sh
   ./scripts/build_macos_arm.sh
   ```

2. **Создайте DMG установщик**:
   ```bash
   chmod +x scripts/create_dmg_arm.sh
   ./scripts/create_dmg_arm.sh
   ```

3. **Результат**:
   - Приложение: `dist/UTMka.app`
   - DMG установщик: `dist/UTMka-2.0.0-macOS-ARM.dmg`

## Сборка для Intel (x86_64)

1. **Запустите скрипт сборки**:
   ```bash
   chmod +x scripts/build_macos_intel.sh
   ./scripts/build_macos_intel.sh
   ```

2. **Создайте DMG установщик**:
   ```bash
   chmod +x scripts/create_dmg_intel.sh
   ./scripts/create_dmg_intel.sh
   ```

3. **Результат**:
   - Приложение: `dist/UTMka.app`
   - DMG установщик: `dist/UTMka-2.0.0-macOS-Intel.dmg`

## Сборка для обеих архитектур

Если у вас Mac с Apple Silicon, вы можете собрать обе версии:

1. **Соберите ARM версию** (нативная):
   ```bash
   ./scripts/build_macos_arm.sh
   ./scripts/create_dmg_arm.sh
   mv dist/UTMka.app dist/UTMka.app.arm
   ```

2. **Соберите Intel версию** (через Rosetta 2):
   ```bash
   arch -x86_64 ./scripts/build_macos_intel.sh
   arch -x86_64 ./scripts/create_dmg_intel.sh
   ```

## Подписание приложения (опционально)

Для распространения через App Store или для обхода предупреждений безопасности:

```bash
# Подпишите приложение
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" dist/UTMka.app

# Проверьте подпись
codesign --verify --verbose dist/UTMka.app
```

## Нотаризация (опционально)

Для распространения вне App Store рекомендуется нотаризация:

```bash
# Создайте zip архив для нотаризации
ditto -c -k --keepParent dist/UTMka.app dist/UTMka.zip

# Отправьте на нотаризацию
xcrun notarytool submit dist/UTMka.zip --apple-id "your@email.com" --team-id "YOUR_TEAM_ID" --password "app-specific-password" --wait

# После успешной нотаризации, добавьте тикет
xcrun stapler staple dist/UTMka.app
```

## Проверка архитектуры

Проверьте, для какой архитектуры собрано приложение:

```bash
# Для ARM
file dist/UTMka.app/Contents/MacOS/UTMka

# Должно показать: arm64

# Для Intel
file dist/UTMka.app/Contents/MacOS/UTMka

# Должно показать: x86_64
```

## Решение проблем

### Ошибка: "PyInstaller не найден"
```bash
pip3 install pyinstaller
```

### Ошибка: "Не удалось импортировать PyQt6"
```bash
pip3 install PyQt6 PyQt6-WebEngine
```

### Ошибка при создании .icns
Убедитесь, что у вас есть `sips` и `iconutil` (встроены в macOS).

### Приложение не запускается после сборки
1. Проверьте логи в Console.app
2. Попробуйте запустить из Terminal:
   ```bash
   dist/UTMka.app/Contents/MacOS/UTMka
   ```
3. Проверьте права доступа:
   ```bash
   chmod +x dist/UTMka.app/Contents/MacOS/UTMka
   ```

## Структура файлов

```
UTMka_macos_arm.spec      # Спецификация PyInstaller для ARM
UTMka_macos_intel.spec    # Спецификация PyInstaller для Intel
INSTALL_MACOS.txt         # Текстовая инструкция по установке (включается в DMG)
scripts/
  ├── build_macos_arm.sh   # Скрипт сборки для ARM
  ├── build_macos_intel.sh # Скрипт сборки для Intel
  ├── create_dmg_arm.sh    # Создание DMG для ARM
  └── create_dmg_intel.sh  # Создание DMG для Intel
```

**Примечание:** Файл `INSTALL_MACOS.txt` автоматически копируется в DMG при создании установщика. Пользователь увидит его при открытии DMG файла.

## Примечания

- Для сборки Intel версии на Mac с Apple Silicon требуется Rosetta 2
- Размер финального .app bundle обычно составляет ~150-200 МБ
- Размер DMG файла обычно составляет ~100-150 МБ (сжатие)
- Все данные приложения (БД, downloads) хранятся внутри .app bundle

