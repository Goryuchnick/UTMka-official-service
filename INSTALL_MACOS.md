# Инструкция по установке UTMka для macOS

## Системные требования

- macOS 10.13 (High Sierra) или новее
- Процессор: Apple Silicon (M1/M2/M3) или Intel (x86_64)
- Свободное место на диске: ~200 МБ

## Выбор версии

Выберите версию в зависимости от вашего Mac:

- **UTMka-2.0.0-macOS-ARM.dmg** — для Mac с процессором Apple Silicon (M1, M2, M3 и новее)
- **UTMka-2.0.0-macOS-Intel.dmg** — для Mac с процессором Intel

Чтобы узнать, какой процессор у вашего Mac:
1. Нажмите на логотип Apple в левом верхнем углу
2. Выберите "Об этом Mac"
3. Посмотрите на строку "Процессор" или "Чип"

## Установка

### Способ 1: Установка через DMG (рекомендуется)

1. **Скачайте DMG файл** для вашей архитектуры
2. **Откройте DMG файл** — он появится в Finder
3. **Перетащите UTMka.app** в папку Applications
   - Или дважды кликните на приложение для запуска без установки
4. **Закройте окно DMG** после установки

### Способ 2: Портативная версия (без установки)

1. **Скачайте DMG файл** для вашей архитектуры
2. **Откройте DMG файл**
3. **Дважды кликните на UTMka.app** для запуска
4. Приложение будет работать из DMG, все данные сохраняются рядом с приложением

## Первый запуск

### Если macOS показывает предупреждение о безопасности

При первом запуске macOS может показать сообщение:
> "UTMka не может быть открыт, так как разработчик не может быть проверен"

**Решение:**

1. Откройте **Системные настройки** (System Preferences)
2. Перейдите в **Безопасность и конфиденциальность** (Security & Privacy)
3. В разделе "Общие" найдите сообщение о UTMka
4. Нажмите **"Открыть в любом случае"** (Open Anyway)
5. Подтвердите действие

### Альтернативный способ (через Terminal)

Если предупреждение не появляется или вы хотите обойти его сразу:

1. Откройте **Terminal** (Терминал)
2. Выполните команду:
   ```bash
   xattr -cr /Applications/UTMka.app
   ```
   (Если приложение не в Applications, укажите полный путь к нему)
3. Запустите приложение

## Запуск приложения

После установки вы можете запустить UTMka следующими способами:

1. **Из папки Applications:**
   - Откройте Finder
   - Перейдите в Applications
   - Найдите и запустите UTMka

2. **Через Spotlight:**
   - Нажмите `Cmd + Space`
   - Введите "UTMka"
   - Нажмите Enter

3. **Из Launchpad:**
   - Откройте Launchpad
   - Найдите UTMka
   - Кликните для запуска

## Удаление приложения

1. Откройте Finder
2. Перейдите в Applications
3. Найдите UTMka.app
4. Перетащите в Корзину или нажмите `Cmd + Delete`
5. Очистите Корзину

**Примечание:** Данные приложения (база данных, шаблоны, история) хранятся в папке приложения. При удалении они также будут удалены. Если хотите сохранить данные, скопируйте файл `utm_data.db` и папку `downloads` перед удалением.

## Решение проблем

### Приложение не запускается

1. Убедитесь, что вы используете правильную версию для вашей архитектуры
2. Проверьте, что macOS 10.13 или новее
3. Попробуйте удалить расширенные атрибуты (см. "Альтернативный способ" выше)

### Приложение работает медленно

1. Убедитесь, что используете версию для вашей архитектуры (ARM для Apple Silicon, Intel для Intel)
2. Закройте другие приложения для освобождения памяти

### Ошибки при первом запуске

1. Убедитесь, что у приложения есть права на запись в папку, где оно находится
2. Проверьте свободное место на диске

## Дополнительная информация

- **Версия:** 2.0.0
- **Разработчик:** UTMka Team
- **Лицензия:** Свободное использование

Для получения поддержки и обновлений посетите:
- GitHub: [ссылка на репозиторий]
- Сайт разработчика: [ссылка на сайт]

---

## Installation Instructions for macOS (English)

### System Requirements

- macOS 10.13 (High Sierra) or later
- Processor: Apple Silicon (M1/M2/M3) or Intel (x86_64)
- Free disk space: ~200 MB

### Choosing the Version

Choose the version based on your Mac:

- **UTMka-2.0.0-macOS-ARM.dmg** — for Macs with Apple Silicon (M1, M2, M3 and newer)
- **UTMka-2.0.0-macOS-Intel.dmg** — for Macs with Intel processors

To find out which processor your Mac has:
1. Click the Apple logo in the top-left corner
2. Select "About This Mac"
3. Look at the "Processor" or "Chip" line

### Installation

#### Method 1: Install via DMG (Recommended)

1. **Download the DMG file** for your architecture
2. **Open the DMG file** — it will appear in Finder
3. **Drag UTMka.app** to the Applications folder
   - Or double-click the app to run without installation
4. **Close the DMG window** after installation

#### Method 2: Portable Version (No Installation)

1. **Download the DMG file** for your architecture
2. **Open the DMG file**
3. **Double-click UTMka.app** to run
4. The app will run from the DMG, all data is saved next to the app

### First Launch

#### If macOS Shows a Security Warning

On first launch, macOS may show a message:
> "UTMka cannot be opened because the developer cannot be verified"

**Solution:**

1. Open **System Preferences**
2. Go to **Security & Privacy**
3. In the "General" section, find the message about UTMka
4. Click **"Open Anyway"**
5. Confirm the action

#### Alternative Method (via Terminal)

If the warning doesn't appear or you want to bypass it immediately:

1. Open **Terminal**
2. Run the command:
   ```bash
   xattr -cr /Applications/UTMka.app
   ```
   (If the app is not in Applications, specify the full path to it)
3. Launch the application

### Launching the Application

After installation, you can launch UTMka in the following ways:

1. **From Applications folder:**
   - Open Finder
   - Go to Applications
   - Find and launch UTMka

2. **Via Spotlight:**
   - Press `Cmd + Space`
   - Type "UTMka"
   - Press Enter

3. **From Launchpad:**
   - Open Launchpad
   - Find UTMka
   - Click to launch

### Uninstalling the Application

1. Open Finder
2. Go to Applications
3. Find UTMka.app
4. Drag to Trash or press `Cmd + Delete`
5. Empty Trash

**Note:** Application data (database, templates, history) is stored in the app folder. When uninstalling, it will also be deleted. If you want to save data, copy the `utm_data.db` file and `downloads` folder before uninstalling.

### Troubleshooting

#### Application Won't Launch

1. Make sure you're using the correct version for your architecture
2. Check that macOS 10.13 or later is installed
3. Try removing extended attributes (see "Alternative Method" above)

#### Application Runs Slowly

1. Make sure you're using the version for your architecture (ARM for Apple Silicon, Intel for Intel)
2. Close other applications to free up memory

#### Errors on First Launch

1. Make sure the app has write permissions in the folder where it's located
2. Check available disk space

### Additional Information

- **Version:** 2.0.0
- **Developer:** UTMka Team
- **License:** Free to use

For support and updates, visit:
- GitHub: [repository link]
- Developer website: [website link]

