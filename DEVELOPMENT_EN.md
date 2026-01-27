# UTMka - Developer Guide

[🇷🇺 Русская версия](DEVELOPMENT.md)

## Quick Start

### 1. Development and Testing

#### Run in development mode (with hot reload)

```bash
# Python
python run_desktop.py --dev

# Windows batch (browser opens automatically)
run_desktop.py --dev
```

In dev mode:
- Flask runs with `debug=True`
- Opens in browser at http://127.0.0.1:5000
- Hot reload on Python code changes
- Database created in current directory: `./utm_data.db`

#### Run desktop version (pywebview window)

```bash
# Python
python run_desktop.py

# Windows batch
run_desktop.bat
```

In desktop mode:
- PyWebview window (native application)
- Database in AppData: `%AppData%\Roaming\UTMka\databases\utmka.db`
- Behavior identical to built application

---

## 2. Building the Application

### Quick Rebuild (after frontend/backend changes)

```bash
# Python
python rebuild.py              # PyInstaller only
python rebuild.py --clean      # Clean + rebuild
python rebuild.py --run        # Rebuild + launch

# Windows batch
rebuild.bat
```

Result: `dist/UTMka/UTMka.exe`

Use this for quick verification of changes without creating an installer.

### Full Build (application + installer)

```bash
# Python
python installers/windows/build.py
```

Results:
- `dist/UTMka/UTMka.exe` — application
- `dist/UTMka-Setup-3.0.0.exe` — installer (32 MB)

Use this for final build before release.

---

## 3. Project Structure

```
utmKA-2.0-2/
├── src/
│   ├── core/               # Business logic (shared)
│   │   ├── models.py       # SQLAlchemy models
│   │   ├── config.py       # Configurations (Desktop/Web/Dev)
│   │   └── services.py     # Business logic
│   ├── api/                # Flask API
│   │   ├── __init__.py     # create_app()
│   │   └── routes/         # Blueprints (main, auth, history, templates)
│   └── desktop/            # Desktop wrapper
│       ├── main.py         # Entry point
│       └── utils.py        # Utilities
│
├── frontend/               # Frontend (ES6 modules)
│   ├── index.html          # HTML (742 lines)
│   ├── css/main.css        # Styles
│   └── js/                 # JavaScript modules
│       ├── app.js          # Entry point + event handlers
│       ├── ui.js           # State management + rendering
│       ├── api.js          # HTTP fetch
│       ├── translations.js # i18n RU/EN
│       └── utils.js        # Helpers
│
├── installers/
│   └── windows/            # Windows build
│       ├── UTMka.spec      # PyInstaller configuration
│       ├── setup.iss       # Inno Setup script
│       ├── version_info.txt
│       └── build.py        # Automated build
│
├── logo/                   # Icons and logos
├── templates_example*.json # Template examples
├── run_desktop.py          # Desktop launcher
├── rebuild.py              # Quick rebuild
└── DEVELOPMENT_EN.md       # This file
```

---

## 4. Working with Frontend

### Modular Structure (ES6)

Frontend is split into modules:

- **app.js** — main file, event handlers
- **ui.js** — state management and rendering
- **api.js** — HTTP requests to Flask API
- **translations.js** — RU/EN translations
- **utils.js** — helper functions

### Adding New Functionality

1. Make changes in the appropriate module
2. Run `python run_desktop.py --dev` for testing
3. After verification: `python rebuild.py --run` to test in built version

### CDN Dependencies

Current CDN (kept for simplicity):
- Tailwind CSS
- Lucide Icons
- Flatpickr
- QRCode.js

Removal of CDN and transition to build tooling (Vite/Webpack) is planned for later.

---

## 5. Working with Backend

### Configurations

The project supports multiple configurations:

```python
from src.api import create_app

# Development - SQLite, debug mode
app = create_app('development')

# Desktop - SQLite in AppData, no auth
app = create_app('desktop')

# Web - PostgreSQL, OAuth (future)
app = create_app('web')
```

### Database

#### Development
- Path: `./utm_data.db` (in project root)
- Created automatically on first run

#### Desktop
- Path: `%AppData%\Roaming\UTMka\databases\utmka.db`
- Created on first application launch

### Models (SQLAlchemy)

See [src/core/models.py](src/core/models.py):
- `User` — users
- `History` — UTM link history
- `Template` — UTM tag templates
- `Subscription` — subscriptions (for Web version)

### API Routes

See [src/api/routes/](src/api/routes/):
- `main.py` — main page, favicon
- `auth.py` — authorization (placeholder for Web)
- `history.py` — CRUD for history
- `templates.py` — CRUD for templates

---

## 6. Testing

### Manual Testing

Checklist after changes:

- [ ] `python run_desktop.py --dev` runs without errors
- [ ] Frontend loads correctly
- [ ] All CRUD operations work (create, read, update, delete)
- [ ] UTM link generation works
- [ ] Short links (clck.ru) work
- [ ] QR codes generate
- [ ] Template export/import works
- [ ] Language switching RU/EN works
- [ ] Dark/light theme works

### Testing Built Version

```bash
python rebuild.py --clean --run
```

Check all functions in the built application.

---

## 7. Release

### Preparing for Release

1. Update version in files:
   - `installers/windows/version_info.txt`
   - `installers/windows/setup.iss`

2. Create full build:
   ```bash
   python installers/windows/build.py
   ```

3. Test installer:
   ```bash
   dist/UTMka-Setup-3.0.0.exe
   ```

4. Check all functions after installation

### Changelog

See [docs/migration/README.md](docs/migration/README.md) for change history by stages.

---

## 8. Useful Commands

### Git

```bash
# Status
git status

# Commit changes
git add .
git commit -m "feat: change description"

# View history
git log --oneline
```

### Python

```bash
# Install dependencies
pip install -r requirements.txt

# Update dependencies
pip freeze > requirements.txt

# Check imports
python -c "from src.api import create_app; print('OK')"
```

### PyInstaller

```bash
# Build from spec
pyinstaller --clean --noconfirm installers/windows/UTMka.spec

# Analyze size
du -sh dist/UTMka
```

---

## 9. Troubleshooting

### "Module not found"

```bash
# Make sure you're in project root
cd d:\Programmes projects\utmKA-2.0-2

# Check PYTHONPATH
python -c "import sys; print('\n'.join(sys.path))"
```

### "Port already in use"

```bash
# Development mode uses random free port
python run_desktop.py --dev --port 5001
```

### PyInstaller Build Errors

```bash
# Clear cache
python rebuild.py --clean

# Check spec file
cat installers/windows/UTMka.spec
```

### Database

```bash
# Delete dev DB
rm utm_data.db

# Delete desktop DB (Windows)
rd /s /q %AppData%\Roaming\UTMka
```

---

## 10. Additional Resources

- [docs/migration/README.md](docs/migration/README.md) — migration plan
- [docs/migration/ARCHITECTURE.md](docs/migration/ARCHITECTURE.md) — architecture
- [docs/migration/STEP_3_WINDOWS_INSTALLER.md](docs/migration/STEP_3_WINDOWS_INSTALLER.md) — Windows build
- [src/api/__init__.py](src/api/__init__.py) — Flask configuration
- [src/desktop/main.py](src/desktop/main.py) — Desktop entry point

---

## Contact and Support

For questions and suggestions:
- Issues: [GitHub Issues](https://github.com/yourusername/utmka/issues)
- Documentation: [docs/migration/](docs/migration/)

---

**Happy coding!** 🚀
