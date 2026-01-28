# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UTMka is a standalone desktop application for building UTM-tagged links, managing campaign templates, and tracking link history. It runs as a Flask web server displayed inside a PyWebView native window. All data is stored locally in SQLite — no accounts or cloud required.

The codebase is written in Russian (comments, docs, git messages). Follow this convention.

## Development Commands

```bash
# Run in dev mode (opens in browser with hot reload)
python run_desktop.py --dev

# Run in desktop mode (PyWebView native window)
python run_desktop.py

# Quick rebuild with PyInstaller (produces dist/UTMka/UTMka.exe)
python rebuild.py

# Clean rebuild
python rebuild.py --clean

# Rebuild and launch the .exe
python rebuild.py --run

# Full build with Windows installer (requires Inno Setup 6)
python installers/windows/build.py
```

No linter, formatter, or test runner is configured. Pytest is in requirements.txt but the `tests/` directory is empty.

## Architecture

### Backend (Python / Flask)

- **Entry point**: `run_desktop.py` — CLI launcher. `--dev` starts Flask directly; without it, launches via PyWebView (`src/desktop/main.py`).
- **App factory**: `src/api/__init__.py` — `create_app(config_name)` builds the Flask app, initializes SQLAlchemy, registers blueprints.
- **Config**: `src/core/config.py` — `DevelopmentConfig` (SQLite, debug), `DesktopConfig` (SQLite, no debug), `WebConfig`/`ProductionConfig` (PostgreSQL, OAuth, payments — future web version).
- **Models**: `src/core/models.py` — SQLAlchemy models: `User`, `History` (table `history_new`), `Template`, `Subscription`. DB auto-created on startup via `db.create_all()`.
- **Services**: `src/core/services.py` — `UTMService` with static methods for parsing/building UTM URLs.
- **API routes** (Blueprints in `src/api/routes/`):
  - `main.py` — serves `index.html` and favicon
  - `history.py` — CRUD for link history
  - `templates.py` — CRUD for templates
  - `auth.py` — auth placeholder for future web version

### Frontend (Vanilla JS / ES6 modules)

Served as static files from `frontend/`. No bundler (no Webpack/Vite).

- `frontend/index.html` — single-page HTML
- `frontend/js/app.js` — main app logic and event handlers (~1130 lines)
- `frontend/js/ui.js` — state management and DOM rendering
- `frontend/js/api.js` — fetch wrapper for REST calls
- `frontend/js/translations.js` — i18n (Russian/English)
- `frontend/js/utils.js` — helper utilities
- `frontend/css/main.css` — Tailwind CSS + custom styles

External libs loaded via CDN: Tailwind CSS, Lucide Icons, Flatpickr, QRCode.js.

### Build & Packaging

- **PyInstaller spec**: `installers/windows/UTMka.spec` — bundles `src/desktop/main.py` as entry, includes `frontend/`, `logo/`, template examples. Excludes tkinter, matplotlib, numpy, pandas.
- **Inno Setup**: `installers/windows/setup.iss` — Windows installer script.
- **Version info**: `installers/windows/version_info.txt`.

### Database Paths

- Dev mode: `./utm_data.db` (project root)
- Desktop (Windows): `%AppData%\Roaming\UTMka\databases\utmka.db`
- Desktop (macOS): `~/Library/Application Support/UTMka/databases/utmka.db`
- Frozen detection: `sys.frozen` attribute (via `is_frozen()` in config)

### Resource Resolution

`get_resource_path()` in `src/core/config.py` resolves paths relative to `sys._MEIPASS` when frozen (PyInstaller) or relative to project root in dev mode. Use this for any file that must be accessible in both dev and packaged builds.

## Key Patterns

- Flask app factory pattern — always use `create_app()` with the appropriate config name.
- All API endpoints return JSON. Frontend communicates via fetch calls in `api.js`.
- History and templates are capped at 500 items per user.
- Link shortening uses the external clck.ru API — the only feature requiring network access.
- QR codes are generated client-side with QRCode.js.
