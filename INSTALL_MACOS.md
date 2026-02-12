# Установка UTMka для macOS

## 📦 Скачивание

Все установочные файлы доступны в [последних релизах](https://github.com/Goryuchnick/UTMka-official-service/releases).

Выберите версию для вашей архитектуры:
- **UTMka-X.Y.Z-macOS-x86_64.dmg** — для Intel Mac
- **UTMka-X.Y.Z-macOS-arm64.dmg** — для Apple Silicon (M1/M2/M3)

> **Как узнать архитектуру?** Apple → Об этом Mac → посмотрите "Чип" или "Процессор"

---

## 🚀 Установка

### Способ 1: Через DMG (рекомендуется)

1. **Скачайте DMG** для вашей архитектуры из [релизов](https://github.com/Goryuchnick/UTMka-official-service/releases)
2. **Откройте DMG** (двойной клик)
3. **Перетащите UTMka.app** в папку Applications
4. **Закройте окно DMG**

### Способ 2: Автоматическая установка через терминал

Если вы предпочитаете терминал, используйте скрипт:

```bash
# Клонируйте репозиторий или скачайте скрипт
git clone https://github.com/Goryuchnick/UTMka-official-service.git
cd UTMka-official-service

# Запустите скрипт установки
./installers/macos/install_from_dmg.sh /path/to/UTMka-X.Y.Z-macOS-x86_64.dmg
```

Скрипт автоматически:
- Удалит карантин с DMG и приложения
- Установит приложение в `/Applications`
- Предложит запустить приложение

---

## 🔓 Первый запуск (обход предупреждения Gatekeeper)

Приложение не подписано Apple Developer сертификатом, поэтому macOS покажет предупреждение о безопасности. Это нормально — приложение безопасно.

### Вариант 1: Через контекстное меню (самый простой) ⭐

1. Найдите `UTMka.app` в Applications
2. **Кликните правой кнопкой мыши** (или Control+клик)
3. Выберите **"Открыть"**
4. В диалоге нажмите **"Открыть"**

✅ После этого приложение будет запускаться обычным способом

### Вариант 2: Через Системные настройки

1. Попробуйте открыть приложение (появится предупреждение)
2. Откройте **Системные настройки** → **Безопасность и конфиденциальность**
3. В разделе "Общие" найдите: "UTMka заблокирован, так как его не удалось проверить"
4. Нажмите **"Всё равно открыть"**

### Вариант 3: Через терминал (для продвинутых)

**Использование скрипта-лаунчера:**
```bash
# Клонируйте репозиторий или скачайте скрипт
git clone https://github.com/Goryuchnick/UTMka-official-service.git
cd UTMka-official-service

# Запустите скрипт
./installers/macos/launch_utmka.sh
```

**Или вручную через терминал:**
```bash
# Удалить карантин
xattr -d com.apple.quarantine /Applications/UTMka.app

# Запустить приложение
open /Applications/UTMka.app
```

---

## 📍 Где хранятся данные?

Все данные приложения хранятся в:
```
~/Library/Application Support/UTMka/
├── databases/
│   └── utmka.db
├── exports/
├── logs/
└── config.json
```

> **Важно:** При удалении приложения данные сохраняются. Для полного удаления также удалите эту папку.

---

## 🗑️ Удаление

1. Перетащите `UTMka.app` из Applications в Корзину
2. (Опционально) Удалите данные:
   ```bash
   rm -rf ~/Library/Application\ Support/UTMka
   ```

---

## ❓ Решение проблем

### Приложение не запускается

1. **Убедитесь, что используете правильную версию:**
   - x86_64 для Intel Mac
   - arm64 для Apple Silicon (M1/M2/M3)

2. **Удалите карантин через терминал:**
   ```bash
   xattr -d com.apple.quarantine /Applications/UTMka.app
   ```

3. **Проверьте версию macOS:** требуется 10.13 (High Sierra) или новее

### Предупреждение появляется каждый раз

Это означает, что карантин не был удалён. Используйте **Вариант 3** (терминал) для постоянного решения.

### Приложение работает медленно

- Убедитесь, что используете версию для вашей архитектуры
- Закройте другие приложения для освобождения памяти

---

## 📚 Дополнительная информация

- **Системные требования:** macOS 10.13 (High Sierra) или новее
- **Размер:** ~50-55 MB
- **Автообновления:** Приложение автоматически проверяет обновления при запуске
- **Версия:** 2.2.1+

---

## 🔄 Обновление

Приложение автоматически проверяет наличие обновлений при запуске. При обнаружении новой версии появится модальное окно с предложением обновиться.

Также можно обновить вручную:
1. Скачайте новую версию DMG из [релизов](https://github.com/Goryuchnick/UTMka-official-service/releases)
2. Установите поверх старой версии (данные сохранятся)

---

**Нужна помощь?** Создайте [Issue на GitHub](https://github.com/Goryuchnick/UTMka-official-service/issues)

---

# Installation Instructions for macOS (English)

## 📦 Download

All installer files are available in the [latest releases](https://github.com/Goryuchnick/UTMka-official-service/releases).

Choose the version for your architecture:
- **UTMka-X.Y.Z-macOS-x86_64.dmg** — for Intel Mac
- **UTMka-X.Y.Z-macOS-arm64.dmg** — for Apple Silicon (M1/M2/M3)

> **How to check your architecture?** Apple → About This Mac → look at "Chip" or "Processor"

---

## 🚀 Installation

### Method 1: Via DMG (Recommended)

1. **Download DMG** for your architecture from [releases](https://github.com/Goryuchnick/UTMka-official-service/releases)
2. **Open DMG** (double-click)
3. **Drag UTMka.app** to Applications folder
4. **Close DMG window**

### Method 2: Automatic Installation via Terminal

If you prefer terminal, use the script:

```bash
# Clone repository or download script
git clone https://github.com/Goryuchnick/UTMka-official-service.git
cd UTMka-official-service

# Run installation script
./installers/macos/install_from_dmg.sh /path/to/UTMka-X.Y.Z-macOS-x86_64.dmg
```

The script automatically:
- Removes quarantine from DMG and app
- Installs app to `/Applications`
- Offers to launch the app

---

## 🔓 First Launch (Bypassing Gatekeeper Warning)

The app is not signed with an Apple Developer certificate, so macOS will show a security warning. This is normal — the app is safe.

### Option 1: Via Context Menu (Easiest) ⭐

1. Find `UTMka.app` in Applications
2. **Right-click** (or Control+click)
3. Select **"Open"**
4. Click **"Open"** in the dialog

✅ After this, the app will launch normally

### Option 2: Via System Settings

1. Try to open the app (warning will appear)
2. Open **System Settings** → **Privacy & Security**
3. In "General" section, find: "UTMka was blocked because it is from an unidentified developer"
4. Click **"Open Anyway"**

### Option 3: Via Terminal (for advanced users)

**Using launcher script:**
```bash
# Clone repository or download script
git clone https://github.com/Goryuchnick/UTMka-official-service.git
cd UTMka-official-service

# Run script
./installers/macos/launch_utmka.sh
```

**Or manually via terminal:**
```bash
# Remove quarantine
xattr -d com.apple.quarantine /Applications/UTMka.app

# Launch app
open /Applications/UTMka.app
```

---

## 📍 Where Data is Stored

All app data is stored in:
```
~/Library/Application Support/UTMka/
├── databases/
│   └── utmka.db
├── exports/
├── logs/
└── config.json
```

> **Important:** When uninstalling the app, data is preserved. For complete removal, also delete this folder.

---

## 🗑️ Uninstallation

1. Drag `UTMka.app` from Applications to Trash
2. (Optional) Delete data:
   ```bash
   rm -rf ~/Library/Application\ Support/UTMka
   ```

---

## ❓ Troubleshooting

### App Won't Launch

1. **Make sure you're using the correct version:**
   - x86_64 for Intel Mac
   - arm64 for Apple Silicon (M1/M2/M3)

2. **Remove quarantine via terminal:**
   ```bash
   xattr -d com.apple.quarantine /Applications/UTMka.app
   ```

3. **Check macOS version:** requires 10.13 (High Sierra) or later

### Warning Appears Every Time

This means quarantine wasn't removed. Use **Option 3** (terminal) for a permanent solution.

### App Runs Slowly

- Make sure you're using the version for your architecture
- Close other apps to free up memory

---

## 📚 Additional Information

- **System Requirements:** macOS 10.13 (High Sierra) or later
- **Size:** ~50-55 MB
- **Auto-updates:** App automatically checks for updates on startup
- **Version:** 2.2.1+

---

## 🔄 Updating

The app automatically checks for updates on startup. When a new version is found, a modal will appear offering to update.

You can also update manually:
1. Download new DMG version from [releases](https://github.com/Goryuchnick/UTMka-official-service/releases)
2. Install over the old version (data will be preserved)

---

**Need help?** Create an [Issue on GitHub](https://github.com/Goryuchnick/UTMka-official-service/issues)
