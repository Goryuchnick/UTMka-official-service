# UTMka 2.0.0 - Release Notes

## Доступные версии

### macOS

- **UTMka-2.0.0-macOS-ARM.dmg** — для Mac с процессором Apple Silicon (M1, M2, M3 и новее)
  - Размер: ~XX МБ
  - Архитектура: arm64
  
- **UTMka-2.0.0-macOS-Intel.dmg** — для Mac с процессором Intel
  - Размер: ~XX МБ
  - Архитектура: x86_64

### Windows

- **UTMka_Setup.exe** — установщик для Windows
  - Размер: ~XX МБ
  - Поддерживает: Windows 10/11

## Что нового в версии 2.0.0

### ✨ Новые возможности

- **Многоязычная поддержка (i18n)**: Русский и английский интерфейс с возможностью переключения языков
- **Шаблоны для импорта**: Готовые наборы UTM-шаблонов для русскоязычного и англоязычного рынков
- **Кнопка помощи**: Модальное окно с быстрым доступом к онбордингу, Telegram-каналу, сайту и GitHub Issues
- **Онбординг**: Пошаговое руководство для новых пользователей
- **Экспорт в CSV**: Возможность экспорта шаблонов в CSV-формат
- **Поддержка macOS**: Нативные версии для Apple Silicon и Intel

### 🔄 Улучшения

- Оптимизация базы данных с использованием WAL-режима
- Улучшена скорость первого запуска приложения
- Улучшена обработка ошибок для предотвращения белого экрана
- Оптимизирована структура файлов проекта

### 🐛 Исправления

- Исправлена проблема с пропадающим футером приложения
- Исправлена нерабочая кнопка "Помощь"
- Исправлены проблемы с белым экраном при запуске
- Исправлена проблема с затемнением элементов во время онбординга
- Улучшена обработка путей к ресурсам в собранном приложении

## Системные требования

### macOS

- macOS 10.13 (High Sierra) или новее
- Процессор: Apple Silicon (M1/M2/M3) или Intel (x86_64)
- Свободное место на диске: ~200 МБ

### Windows

- Windows 10 или новее
- Microsoft Edge WebView2 Runtime (устанавливается автоматически)
- Свободное место на диске: ~200 МБ

## Установка

### macOS

1. Скачайте DMG файл для вашей архитектуры (ARM или Intel)
2. Откройте DMG файл
3. Перетащите UTMka.app в папку Applications
4. При первом запуске macOS может показать предупреждение о безопасности:
   - Откройте Системные настройки > Безопасность и конфиденциальность
   - Нажмите "Открыть в любом случае"

Подробные инструкции: см. `INSTALL_MACOS.md`

### Windows

1. Запустите установщик `UTMka_Setup.exe`
2. Следуйте инструкциям мастера установки
3. Приложение установится в `C:\Users\<Ваше_имя>\AppData\Local\Programs\UTMka`

## Известные проблемы

- При первом запуске на macOS может потребоваться разрешение на запуск в настройках безопасности
- Некоторые антивирусы могут помечать приложение как подозрительное (ложное срабатывание)

## Поддержка

Если у вас возникли проблемы или вопросы:

1. Проверьте раздел "Решение проблем" в `INSTALL_MACOS.md` (для macOS) или `README.md` (для Windows)
2. Создайте Issue на GitHub: [ссылка на репозиторий]
3. Напишите в Telegram-канал разработчика: [ссылка на канал]

## Благодарности

Спасибо всем, кто тестировал приложение и сообщал об ошибках!

---

## UTMka 2.0.0 - Release Notes (English)

### Available Versions

#### macOS

- **UTMka-2.0.0-macOS-ARM.dmg** — for Macs with Apple Silicon (M1, M2, M3 and newer)
  - Size: ~XX MB
  - Architecture: arm64
  
- **UTMka-2.0.0-macOS-Intel.dmg** — for Macs with Intel processors
  - Size: ~XX MB
  - Architecture: x86_64

#### Windows

- **UTMka_Setup.exe** — Windows installer
  - Size: ~XX MB
  - Supports: Windows 10/11

### What's New in Version 2.0.0

#### ✨ New Features

- **Multilingual support (i18n)**: Russian and English interface with language switching
- **Import templates**: Ready-made UTM template sets for Russian and English markets
- **Help button**: Modal window with quick access to onboarding, Telegram channel, website, and GitHub Issues
- **Onboarding**: Step-by-step guide for new users
- **CSV export**: Ability to export templates to CSV format
- **macOS support**: Native versions for Apple Silicon and Intel

#### 🔄 Improvements

- Database optimization using WAL mode
- Improved first launch speed
- Better error handling to prevent white screen
- Optimized project file structure

#### 🐛 Fixes

- Fixed missing footer issue
- Fixed non-working "Help" button
- Fixed white screen issues on launch
- Fixed element dimming issue during onboarding
- Improved resource path handling in built application

### System Requirements

#### macOS

- macOS 10.13 (High Sierra) or later
- Processor: Apple Silicon (M1/M2/M3) or Intel (x86_64)
- Free disk space: ~200 MB

#### Windows

- Windows 10 or later
- Microsoft Edge WebView2 Runtime (installed automatically)
- Free disk space: ~200 MB

### Installation

#### macOS

1. Download the DMG file for your architecture (ARM or Intel)
2. Open the DMG file
3. Drag UTMka.app to the Applications folder
4. On first launch, macOS may show a security warning:
   - Open System Preferences > Security & Privacy
   - Click "Open Anyway"

Detailed instructions: see `INSTALL_MACOS.md`

#### Windows

1. Run the installer `UTMka_Setup.exe`
2. Follow the installation wizard instructions
3. The app will be installed to `C:\Users\<Your_Name>\AppData\Local\Programs\UTMka`

### Known Issues

- On first launch on macOS, you may need to grant permission to run in security settings
- Some antivirus software may flag the app as suspicious (false positive)

### Support

If you encounter problems or have questions:

1. Check the "Troubleshooting" section in `INSTALL_MACOS.md` (for macOS) or `README.md` (for Windows)
2. Create an Issue on GitHub: [repository link]
3. Write to the developer's Telegram channel: [channel link]

### Acknowledgments

Thanks to everyone who tested the app and reported bugs!

