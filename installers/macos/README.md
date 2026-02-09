# macOS Сборка UTMka

## Быстрый старт

```bash
# Сборка для текущей архитектуры
python installers/macos/build.py
```

Результат:
- `dist/UTMka.app` — приложение
- `dist/UTMka-2.2.0-macOS.dmg` — установщик

## Поддержка архитектур

### Текущая архитектура

Скрипт автоматически определяет архитектуру и собирает для неё:
- **x86_64** (Intel Mac)
- **arm64** (Apple Silicon)

### Universal Binary (опционально)

Для создания universal binary (обе архитектуры в одном файле):

1. **Соберите на Intel Mac:**
   ```bash
   python installers/macos/build.py
   mv dist/UTMka.app dist/UTMka-x86_64.app
   ```

2. **Соберите на Apple Silicon:**
   ```bash
   python installers/macos/build.py
   mv dist/UTMka.app dist/UTMka-arm64.app
   ```

3. **Объедините через lipo:**
   ```bash
   # Копируем arm64 версию как основу
   cp -R dist/UTMka-arm64.app dist/UTMka.app
   
   # Объединяем исполняемые файлы
   lipo -create \
     dist/UTMka-x86_64.app/Contents/MacOS/UTMka \
     dist/UTMka-arm64.app/Contents/MacOS/UTMka \
     -output dist/UTMka.app/Contents/MacOS/UTMka
   
   # Объединяем библиотеки (если есть)
   # ... аналогично для всех .dylib файлов
   ```

**Примечание:** Universal binary требует сборки на обеих архитектурах. Для большинства случаев достаточно собрать отдельные версии.

## Подпись и нотаризация

Для распространения без предупреждений Gatekeeper:

1. Получите Apple Developer ID certificate ($99/год)
2. Заполните переменные в `sign_and_notarize.sh`:
   - `DEVELOPER_ID`
   - `APPLE_ID`
   - `TEAM_ID`
   - `APP_PASSWORD`
3. Запустите:
   ```bash
   ./installers/macos/sign_and_notarize.sh
   ```

## Без подписи

Пользователи увидят предупреждение "неизвестный разработчик". Инструкция для пользователей:

1. **Способ 1 (рекомендуется):**
   - ПКМ на `UTMka.app` → "Открыть"
   - В диалоге нажмите "Открыть"

2. **Способ 2:**
   - Системные настройки → Безопасность
   - "Всё равно открыть" рядом с UTMka

## Автообновления

OTA обновления уже настроены в `src/core/updater.py`:
- Проверка через GitHub Releases API
- Скачивание `.dmg` файла
- Открытие DMG для установки

**Формат релиза:**
- `UTMka-2.2.0-macOS.dmg` — для macOS
- `UTMka-Setup-2.2.0.exe` — для Windows

## Структура файлов

```
installers/macos/
├── UTMka.spec          # PyInstaller spec
├── build.py            # Скрипт сборки
├── sign_and_notarize.sh # Подпись и нотаризация
└── README.md           # Эта инструкция
```

## Требования

- macOS (для сборки)
- Python 3.8+
- PyInstaller
- create-dmg (опционально, для красивого DMG): `brew install create-dmg`

## Данные приложения

Приложение хранит данные в:
```
~/Library/Application Support/UTMka/
├── databases/
│   └── utmka.db
├── exports/
├── logs/
└── config.json
```

## Troubleshooting

### Ошибка: "marshmallow not found"
Игнорируйте — модуль не используется напрямую.

### Ошибка: "icon not found"
Проверьте наличие `assets/logo/logoutm.icns`. Сборка продолжится без иконки.

### DMG не открывается
Проверьте подпись:
```bash
codesign -dv --verbose=4 dist/UTMka.app
```

### Приложение не запускается
Проверьте логи:
```bash
open -a Console
# Или через терминал:
./dist/UTMka.app/Contents/MacOS/UTMka
```
