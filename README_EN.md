# UTMka — UTM Link Generator for Marketers and Business

[🇷🇺 Русская версия](README.md)

**UTMka** is a powerful and user-friendly tool for marketers and business owners that allows you to:
- **quickly create error-free UTM tags**;
- **save them as templates**;
- **maintain campaign and project history**;
- **export and import** data.

The interface features a modern design (Tailwind, light/dark theme) while functioning as a native desktop application.

---

## 📥 Download and Installation

***Find ready-to-use application builds in the latest releases***

### Windows

#### Method 1: Installation via Installer (Recommended)

1. **Run the installer**:
   - Open `UTMka-Setup-2.1.1.exe`
   - Follow the installation wizard instructions
   - By default, the application will be installed to `C:\Program Files\UTMka`

2. **Launch the application**:
   - Open UTMka from the Start menu or desktop shortcut

#### Method 2: Portable Version (No Installation)

1. **Extract and run**:
   - Extract the archive to any folder (e.g., `C:\Programs\UTMka`)
   - Run `UTMka.exe` directly
   - All data will be stored next to the executable file

> **Note**: For the portable version, ensure you have [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) installed if the application requests it.

### macOS

#### Under Development
macOS build is planned after Windows version stabilization (STEP_4 of migration).

---

## ⚡ Quick Start from Source

If you want to run the application from source code for development or testing:

```bash
# Clone the repository
git clone https://github.com/Goryuchnick/UTMka-official-service.git
cd UTMka-official-service

# Install dependencies
pip install -r requirements.txt

# Run in development mode (browser)
python run_desktop.py --dev

# Or run the desktop version (pywebview window)
python run_desktop.py
```

> **For developers**: See [DEVELOPMENT.md](DEVELOPMENT.md) for a detailed guide on development, building, and testing.

---

## 🔨 Building the Application for Windows

### Modern Modular Architecture (v2.0+)

The project uses modular architecture with separation into core, api, and desktop components:

**Quick rebuild** (after changes):
```bash
python rebuild.py              # PyInstaller only
python rebuild.py --run        # Rebuild + launch
```

**Full build** (application + installer):
```bash
python installers/windows/build.py
```

Results:
- `dist/UTMka/UTMka.exe` — application
- `dist/UTMka-Setup-2.1.1.exe` — installer (~30 MB)

> **Requirements**: [PyInstaller 6.0+](https://pyinstaller.org/) and [Inno Setup 6](https://jrsoftware.org/isinfo.php)

> **Detailed documentation**: See [DEVELOPMENT.md](DEVELOPMENT.md) for complete build guide

---

## 🎯 Core Features

- **UTM Link Constructor**
  - base URL + `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`;
  - field hints, saving and reusing values;
  - quick copy-paste and full link preview;
  - **link shortening** with one click via clck.ru service;
  - **QR code generation** for any link with download capability.

- **Templates**
  - save frequently used UTM parameter sets;
  - tags and color labels for grouping by projects and clients;
  - quick filter and template search.

- **History**
  - automatic saving of all generated links;
  - convenient list with dates and actions (copy, open, delete);
  - sorting and filtering.

- **Export / Import**
  - export/import **templates** and **history** in JSON and CSV formats;
  - built-in example files for different markets:
    - `templates_example.json`, `templates_example.csv` — basic set;
    - `templates_example_ru.json` — examples for Russian-speaking market;
    - `templates_example_en.json` — examples for English-speaking market.

---

## 🔒 Local Offline Version and Its Benefits

UTMka from this repository is a **fully local offline application**:

- **All data is stored only on your device**
  - `utmka.db` database — a regular SQLite file in AppData;
  - history, templates, tags — not sent to external servers and not analyzed by third parties.

- **No logins or passwords required**
  - no registration or accounts;
  - the application is ready to use immediately after installation.

- **No subscriptions or payments**
  - the application is completely free;
  - no limits on number of links, tariffs, API keys, etc.

- **Works without internet**
  - UTM link generation, history, and templates work completely offline;
  - internet is only needed for external fonts/icons (and that's optional).

In the future, a **cloud web version** with accounts and shared database may appear,
but the local edition will remain the **"I store everything myself and don't depend on anyone"** option.

---

## 📂 Project Structure

### Modular Architecture v3.0+

```
utmKA-2.0-2/
├── src/                        # Source code
│   ├── core/                   # Business logic (shared)
│   │   ├── models.py           # SQLAlchemy models
│   │   ├── config.py           # Configurations
│   │   └── services.py         # Business logic
│   ├── api/                    # Flask API
│   │   ├── __init__.py         # create_app()
│   │   └── routes/             # Blueprints
│   └── desktop/                # Desktop wrapper
│       ├── main.py             # Entry point
│       └── utils.py
│
├── frontend/                   # Frontend (ES6 modules)
│   ├── index.html              # HTML (742 lines)
│   ├── css/main.css
│   └── js/                     # JavaScript modules
│       ├── app.js
│       ├── ui.js
│       ├── api.js
│       ├── translations.js
│       └── utils.js
│
├── installers/                 # Installers
│   └── windows/
│       ├── UTMka.spec          # PyInstaller config
│       ├── setup.iss           # Inno Setup script
│       └── build.py            # Automated build
│
├── docs/migration/             # Migration documentation
├── run_desktop.py              # Desktop launcher
├── rebuild.py                  # Quick rebuild
└── DEVELOPMENT.md              # Developer guide
```

> **Detailed documentation**: See [docs/migration/README.md](docs/migration/README.md) for complete architecture description

## 🛠 Technologies

### Backend
- **Python 3.12+** — main language
- **Flask** — REST API server
- **SQLAlchemy** — ORM for database operations
- **PyWebView** — native application window (Windows)
- **SQLite** — local file database

### Frontend
- **ES6 Modules** — modular JavaScript
- **Tailwind CSS** — styles
- **Lucide Icons** — icons
- **Flatpickr** — date picker
- **QRCode.js** — QR code generation

### Build Tools
- **PyInstaller 6.0+** — packaging to .exe/.app
- **Inno Setup 6** — Windows installer

---

## 👤 Developer

UTMka is developed by **Alexander Pronin**.

- **Website**: [alex-pronin.ru](https://alex-pronin.ru)
- **Telegram channel**: [t.me/pronin_marketing](https://t.me/pronin_marketing)

The application footer contains quick links to the website and Telegram with useful materials on marketing and analytics.
If you have ideas to improve UTMka, bug reports, or suggestions — it's best to write there **or create issues on GitHub** (Issues / Discussions) in the project repository.

---

## 🐛 Suggestions and Bug Reports

Use the **Issues** section on GitHub to:
- report a bug;
- suggest an improvement or new feature;
- discuss ideas for application development.

The more detailed you describe the problem (reproduction steps, screenshots, Windows/application version), the easier it will be to fix.

---

## 📄 License

This project is distributed freely. Use it as you wish.

---

## 📚 Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) — Complete developer guide
- [QUICK_START.md](QUICK_START.md) — Quick start cheat sheet
- [docs/migration/](docs/migration/) — Migration documentation and architecture

---

## 🌐 Language Support

The application interface supports:
- 🇷🇺 Russian
- 🇬🇧 English

You can switch languages directly in the application interface.

---

**Happy working with UTMka!** 🚀
