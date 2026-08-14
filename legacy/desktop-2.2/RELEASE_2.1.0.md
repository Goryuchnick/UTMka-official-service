# UTMka 2.1.0 — Release Notes

**Дата релиза**: 28 января 2026
**Date Released**: January 28, 2026

---

## 🎉 Новые возможности / New Features

### Onboarding и пользовательские настройки / Onboarding & User Preferences
- **Интерактивное обучение**: добавлен onboarding spotlight с плавными переходами для новых пользователей
- **Interactive onboarding**: added onboarding spotlight with smooth transitions for new users
- **Сохранение настроек**: серверный API для сохранения темы и языка интерфейса
- **Persistent settings**: server-side API for saving theme and language preferences

### Поддержка проекта / Project Support
- **Кнопки поддержки**: интегрированы кнопки для донатов в интерфейсе приложения
- **Donation buttons**: integrated donation buttons in the application UI
- **Новые переводы**: добавлены переводы для элементов UI, связанных с донатами и обучением
- **New translations**: added translations for donation and onboarding UI elements

---

## 🔧 Улучшения / Improvements

### Архитектура / Architecture
- **Модульная структура**: продолжена работа над модульной архитектурой проекта
- **Modular structure**: continued work on modular project architecture
- **Очистка кода**: удалены временные файлы базы данных и устаревшие компоненты
- **Code cleanup**: removed temporary database files and legacy components

### UI/UX
- **Улучшенная анимация**: добавлены CSS-переходы для лучшей видимости и плавности при onboarding
- **Enhanced animations**: added CSS transitions for better visibility and smooth onboarding experience
- **Обновленная подсветка**: улучшена система подсветки элементов во время обучения
- **Updated spotlight**: improved element highlighting system during onboarding

---

## 🐛 Исправления / Bug Fixes

- **Пути к базе данных**: исправлены проблемы с путями в dev и production режимах
- **Database paths**: fixed path issues in dev and production modes
- **Совместимость Windows**: улучшена поддержка Windows 10/11
- **Windows compatibility**: improved Windows 10/11 support
- **Кодировка UTF-8**: исправлены проблемы с выводом в консоль на Windows
- **UTF-8 encoding**: fixed console output issues on Windows

---

## 📦 Технические изменения / Technical Changes

### Backend
- Добавлен `preferences.py` routes для пользовательских настроек
- Added `preferences.py` routes for user preferences
- Обновлена структура API с новыми blueprints
- Updated API structure with new blueprints
- Улучшена инициализация Flask приложения
- Enhanced Flask application initialization

### Frontend
- Расширен `app.js` с функциями onboarding (172+ новых строк)
- Extended `app.js` with onboarding functions (172+ new lines)
- Добавлены новые CSS правила для transitions и spotlight
- Added new CSS rules for transitions and spotlight
- Обновлен `translations.js` с новыми ключами
- Updated `translations.js` with new keys

### Build System
- Обновлены версии в `setup.iss` и `version_info.txt` до 2.1.0
- Updated versions in `setup.iss` and `version_info.txt` to 2.1.0
- Исправлена кодировка в скрипте сборки `build.py`
- Fixed encoding in build script `build.py`
- Улучшен процесс создания установщика
- Improved installer creation process

---

## 📊 Статистика изменений / Change Statistics

- **Файлов изменено / Files changed**: 12
- **Добавлено строк / Lines added**: 446
- **Удалено строк / Lines removed**: 78
- **Новых файлов / New files**: 2 (`preferences.py`, `CLAUDE.md`)

---

## 📥 Установка / Installation

### Windows

**Полная установка / Full Installation**:
1. Скачайте `UTMka-Setup-2.1.0.exe` из раздела Releases
2. Запустите установщик и следуйте инструкциям
3. Приложение установится в `C:\Program Files\UTMka`
4. Данные будут храниться в `%AppData%\Roaming\UTMka`

**Portable версия / Portable version**:
1. Скачайте `UTMka-2.1.0-Portable.zip` из раздела Releases
2. Распакуйте в любую папку
3. Запустите `UTMka.exe`

### macOS
Версия для macOS планируется в следующих релизах.
macOS version is planned for future releases.

---

## 🔄 Миграция с предыдущих версий / Migration from Previous Versions

### С версии 2.0.0 / From version 2.0.0
- **Автоматическая миграция**: при первом запуске база данных будет автоматически обновлена
- **Automatic migration**: database will be automatically updated on first launch
- **Сохранение данных**: вся история и шаблоны будут сохранены
- **Data preservation**: all history and templates will be preserved

### С версии 1.x
- **Ручной экспорт**: рекомендуется экспортировать данные из старой версии
- **Manual export**: recommend exporting data from old version
- **Новая установка**: установите 2.1.0 в отдельную директорию
- **Fresh install**: install 2.1.0 to separate directory
- **Импорт данных**: используйте функцию импорта для переноса шаблонов
- **Import data**: use import function to transfer templates

---

## 🐞 Известные проблемы / Known Issues

1. **PyQt5 warnings**: могут появляться предупреждения о missing modules (sip, pysqlite2, MySQLdb) — они не влияют на работу приложения
   - **PyQt5 warnings**: warnings about missing modules may appear (sip, pysqlite2, MySQLdb) — they don't affect application functionality

2. **First launch delay**: первый запуск может занять несколько секунд из-за инициализации базы данных
   - **First launch delay**: first launch may take a few seconds due to database initialization

---

## 📝 Что дальше / What's Next

### Планируемые функции / Planned Features
- [ ] macOS версия (STEP_4)
- [ ] Web-версия с облачной синхронизацией (STEP_5)
- [ ] Массовая генерация UTM-меток
- [ ] Интеграция с Google Analytics API
- [ ] Расширенная аналитика кампаний

### Улучшения / Improvements
- [ ] Темная тема с более тонкой настройкой
- [ ] Экспорт в Google Sheets
- [ ] Кастомные шаблоны параметров
- [ ] Автоматическая проверка обновлений

---

## 🙏 Благодарности / Acknowledgments

Спасибо всем, кто тестировал приложение и присылал отзывы!
Thanks to everyone who tested the application and sent feedback!

Особая благодарность:
- Пользователям, сообщившим о багах
- Контрибьюторам в Issues и Discussions
- Всем, кто поддерживает проект

Special thanks to:
- Users who reported bugs
- Contributors in Issues and Discussions
- Everyone who supports the project

---

## 📞 Поддержка / Support

- **Issues**: [GitHub Issues](https://github.com/Goryuchnick/UTMka-official-service/issues)
- **Telegram**: [t.me/pronin_marketing](https://t.me/pronin_marketing)
- **Website**: [alex-pronin.ru](https://alex-pronin.ru)

---

## 📄 Лицензия / License

Этот проект распространяется свободно. Используйте его как вам угодно.
This project is distributed freely. Use it as you wish.

---

**Приятной работы с UTMka 2.1.0!** 🚀
**Happy working with UTMka 2.1.0!** 🚀
