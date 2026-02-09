# UTMka — конструктор UTM-меток для маркетологов и бизнеса

**[English version below](#-utmka--utm-link-generator-for-marketers-and-business)**

**UTMka** — мощный и простой инструмент для маркетологов и владельцев бизнеса, позволяющий:
- **быстро создавать безошибочные UTM-метки**;
- **сохранять их в шаблоны**;
- **вести историю кампаний и проектов**;
- **экспортировать и импортировать** данные.

Интерфейс выполнен в современном стиле (Tailwind, светлая/тёмная тема), но при этом работает как нативное десктоп-приложение.

---

## Скачивание и установка

***Готовые сборки приложений ищите в [последних релизах](https://github.com/Goryuchnick/UTMka-official-service/releases)***

### Windows

#### Способ 1: Установка через установщик (рекомендуется)

1. Скачайте `UTMka-Setup-X.Y.Z.exe` из [релизов](https://github.com/Goryuchnick/UTMka-official-service/releases)
2. Запустите установщик, следуйте инструкциям
3. Откройте UTMka из меню Пуск или с рабочего стола

#### Способ 2: Портативная версия (без установки)

1. Распакуйте архив в любую папку
2. Запустите `UTMka.exe` напрямую

> **Примечание**: Убедитесь, что установлен [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### macOS

В разработке. macOS сборка планируется после стабилизации Windows-версии.

### Автоматические обновления

Начиная с версии 2.2.0, приложение проверяет наличие новых версий при запуске через GitHub Releases. При обнаружении обновления появляется модальное окно с информацией о новой версии и кнопкой установки. Обновление скачивается и устанавливается автоматически.

---

## Быстрый запуск из исходников

```bash
# Клонируйте репозиторий
git clone https://github.com/Goryuchnick/UTMka-official-service.git
cd UTMka-official-service

# Установите зависимости
pip install -r requirements.txt

# Запустите в режиме разработки (браузер)
python run_desktop.py --dev

# Или запустите desktop версию (pywebview окно)
python run_desktop.py
```

> **Для разработчиков**: См. [DEVELOPMENT.md](DEVELOPMENT.md) для подробного руководства.

---

## Сборка приложения для Windows

**Быстрая пересборка** (после изменений):
```bash
python rebuild.py              # Только PyInstaller
python rebuild.py --run        # Пересборка + запуск
```

**Полная сборка** (приложение + установщик):
```bash
python installers/windows/build.py
```

> Версия автоматически берётся из `src/core/version.py` и подставляется во все файлы сборки.

Результат:
- `dist/UTMka/UTMka.exe` — приложение
- `dist/UTMka-Setup-X.Y.Z.exe` — установщик (~30 MB)

> **Требования**: [PyInstaller 6.0+](https://pyinstaller.org/) и [Inno Setup 6](https://jrsoftware.org/isinfo.php)

---

## Основной функционал

- **Конструктор UTM-ссылок**
  - базовый URL + `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`;
  - подсказки по полям, сохранение и повторное использование значений;
  - быстрый копипаст и просмотр полной ссылки;
  - **сокращение ссылок** одним кликом через сервис clck.ru;
  - **генерация QR-кода** для любой ссылки с возможностью скачивания.

- **Шаблоны**
  - сохранение часто используемых наборов UTM-параметров;
  - теги и цветовые метки для группировки по проектам и клиентам;
  - быстрый фильтр и поиск шаблонов.

- **История**
  - автоматическое сохранение всех сгенерированных ссылок;
  - удобный список с датами и действиями (копировать, открыть, удалить);
  - сортировка и фильтрация.

- **Экспорт / импорт**
  - экспорт/импорт **шаблонов** и **истории** в JSON и CSV;
  - встроенные примеры файлов для разных рынков.

- **Автообновления**
  - проверка новых версий через GitHub Releases при запуске;
  - модальное окно с описанием обновления;
  - скачивание и установка в один клик.

---

## Локальная офлайн-версия и её преимущества

- **Все данные хранятся только у вас** — SQLite, без внешних серверов.
- **Никаких логинов и паролей** — готово к работе сразу после установки.
- **Никаких подписок и оплат** — полностью бесплатно.
- **Работает без интернета** — интернет нужен только для сокращения ссылок и проверки обновлений.

---

## Структура проекта

```
utmKA-2.0-2/
├── src/                        # Исходный код
│   ├── core/                   # Бизнес-логика
│   │   ├── models.py           # SQLAlchemy модели
│   │   ├── config.py           # Конфигурации
│   │   ├── services.py         # Бизнес-логика
│   │   ├── version.py          # Единый источник версии
│   │   └── updater.py          # OTA-обновления через GitHub
│   ├── api/                    # Flask API
│   │   ├── __init__.py         # create_app()
│   │   └── routes/             # Blueprints
│   └── desktop/                # Desktop wrapper
│       ├── main.py             # Entry point
│       └── utils.py
│
├── frontend/                   # Frontend (ES6 modules)
│   ├── index.html
│   ├── css/main.css
│   └── js/
│       ├── app.js
│       ├── ui.js
│       ├── api.js
│       ├── translations.js
│       └── utils.js
│
├── installers/                 # Установщики
│   └── windows/
│       ├── UTMka.spec          # PyInstaller config
│       ├── setup.iss           # Inno Setup script
│       └── build.py            # Автоматическая сборка (авто-версия)
│
├── docs/migration/             # Документация миграции
├── run_desktop.py              # Запуск desktop
├── rebuild.py                  # Быстрая пересборка
└── DEVELOPMENT.md              # Руководство разработчика
```

---

## Технологии

### Backend
- **Python 3.12+**, **Flask**, **SQLAlchemy**, **PyWebView**, **SQLite**

### Frontend
- **ES6 Modules**, **Tailwind CSS**, **Lucide Icons**, **Flatpickr**, **QRCode.js**

### Сборка
- **PyInstaller 6.0+** — упаковка в .exe
- **Inno Setup 6** — Windows установщик

---

## Разработчик

UTMka разработана **Александром Прониным**.

- **Сайт**: [alex-pronin.ru](https://alex-pronin.ru)
- **Telegram-канал**: [t.me/pronin_marketing](https://t.me/pronin_marketing)

---

## Предложения и баг-репорты

Используйте раздел **[Issues](https://github.com/Goryuchnick/UTMka-official-service/issues)** на GitHub.

---

## Лицензия

Этот проект распространяется свободно. Используйте его как вам угодно.

---

# UTMka — UTM Link Generator for Marketers and Business

**UTMka** is a powerful and user-friendly tool for marketers and business owners that allows you to:
- **quickly create error-free UTM tags**;
- **save them as templates**;
- **maintain campaign and project history**;
- **export and import** data.

The interface features a modern design (Tailwind, light/dark theme) while functioning as a native desktop application.

---

## Download and Installation

***Find ready-to-use builds in the [latest releases](https://github.com/Goryuchnick/UTMka-official-service/releases)***

### Windows

#### Method 1: Installer (Recommended)

1. Download `UTMka-Setup-X.Y.Z.exe` from [releases](https://github.com/Goryuchnick/UTMka-official-service/releases)
2. Run the installer and follow instructions
3. Open UTMka from Start menu or desktop shortcut

#### Method 2: Portable Version

1. Extract the archive to any folder
2. Run `UTMka.exe` directly

> **Note**: Ensure [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) is installed.

### macOS

Under development. macOS build is planned after Windows version stabilization.

### Automatic Updates

Starting from version 2.2.0, the app checks for new versions on startup via GitHub Releases. When an update is found, a modal shows the new version info with an install button. The update downloads and installs automatically.

---

## Quick Start from Source

```bash
git clone https://github.com/Goryuchnick/UTMka-official-service.git
cd UTMka-official-service
pip install -r requirements.txt
python run_desktop.py --dev      # Dev mode (browser)
python run_desktop.py            # Desktop mode (pywebview)
```

> **For developers**: See [DEVELOPMENT.md](DEVELOPMENT.md) for a detailed guide.

---

## Building for Windows

**Quick rebuild:**
```bash
python rebuild.py              # PyInstaller only
python rebuild.py --run        # Rebuild + launch
```

**Full build (app + installer):**
```bash
python installers/windows/build.py
```

> Version is automatically read from `src/core/version.py` and synced to all build files.

Results:
- `dist/UTMka/UTMka.exe` — application
- `dist/UTMka-Setup-X.Y.Z.exe` — installer (~30 MB)

> **Requirements**: [PyInstaller 6.0+](https://pyinstaller.org/) and [Inno Setup 6](https://jrsoftware.org/isinfo.php)

---

## Core Features

- **UTM Link Constructor** — base URL + all UTM params, field hints, link shortening via clck.ru, QR codes
- **Templates** — save & reuse UTM sets, tags and color labels, search & filter
- **History** — auto-save all generated links, sort & filter, copy/open/delete
- **Export / Import** — JSON and CSV, built-in example files
- **Auto-updates** — checks GitHub Releases on startup, one-click install

---

## Local Offline Version

- All data stored locally in SQLite — no external servers
- No logins, no accounts, no subscriptions
- Works offline — internet only needed for link shortening and update checks

---

## Technologies

**Backend**: Python 3.12+, Flask, SQLAlchemy, PyWebView, SQLite
**Frontend**: ES6 Modules, Tailwind CSS, Lucide Icons, Flatpickr, QRCode.js
**Build**: PyInstaller 6.0+, Inno Setup 6

---

## Developer

UTMka is developed by **Alexander Pronin**.

- **Website**: [alex-pronin.ru](https://alex-pronin.ru)
- **Telegram**: [t.me/pronin_marketing](https://t.me/pronin_marketing)

---

## Suggestions and Bug Reports

Use **[Issues](https://github.com/Goryuchnick/UTMka-official-service/issues)** on GitHub.

---

## Language Support

- Russian
- English

You can switch languages directly in the application interface.

---

## License

This project is distributed freely. Use it as you wish.

---

**Happy working with UTMka!**
