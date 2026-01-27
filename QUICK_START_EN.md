# UTMka - Quick Start Guide

[🇷🇺 Русская версия](QUICK_START.md)

## After Completing STEP_3 (Windows Build)

The project is ready to go! Use this cheat sheet to get started quickly.

---

## 🚀 Quick Start

### Run in Development Mode

```bash
# Opens in browser with hot reload
python run_desktop.py --dev
```

URL: http://127.0.0.1:5000
Database: `./utm_data.db` (in project root)

### Run Desktop Version

```bash
# PyWebView window (like in production)
python run_desktop.py
```

Database: `%AppData%\Roaming\UTMka\databases\utmka.db`

---

## 📝 Making Frontend Changes

### Files to Edit

```
frontend/
├── index.html          # HTML markup
├── css/main.css        # Styles
└── js/
    ├── app.js          # Event handlers, main logic
    ├── ui.js           # State management and rendering
    ├── api.js          # HTTP requests to backend
    ├── translations.js # RU/EN translations
    └── utils.js        # Helper functions
```

### Workflow After Changes

1. **Make changes** in the necessary files
2. **Test in dev mode**:
   ```bash
   python run_desktop.py --dev
   ```
3. **Check in desktop mode**:
   ```bash
   python run_desktop.py
   ```
4. **Quick rebuild** for final check:
   ```bash
   python rebuild.py --run
   ```

---

## 🔨 Building After Changes

### Quick Rebuild (without installer)

```bash
# PyInstaller only
python rebuild.py

# With cleaning
python rebuild.py --clean

# With auto-launch
python rebuild.py --run
```

Result: `dist/UTMka/UTMka.exe`
Time: ~1-2 minutes

### Full Build (with installer)

```bash
python installers/windows/build.py
```

Results:
- `dist/UTMka/UTMka.exe` — application
- `dist/UTMka-Setup-3.0.0.exe` — installer

Time: ~3-5 minutes

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| [QUICK_START_EN.md](QUICK_START_EN.md) | This cheat sheet |
| [DEVELOPMENT_EN.md](DEVELOPMENT_EN.md) | Complete developer guide |
| [README_EN.md](README_EN.md) | General project information |
| [docs/migration/](docs/migration/) | Migration history |

---

## ✅ Testing Checklist

After making changes, verify:

- [ ] Application starts without errors
- [ ] Frontend loads correctly
- [ ] UTM link generation works
- [ ] History is saved and displayed
- [ ] Templates are created and applied
- [ ] Export/import works
- [ ] Short links (clck.ru) work
- [ ] QR codes are generated
- [ ] RU/EN switching works
- [ ] Dark/light theme works

---

## 🐛 Problems?

### Application Won't Start

```bash
# Check dependencies
pip install -r requirements.txt

# Check imports
python -c "from src.api import create_app; print('OK')"
```

### Changes Not Applied

```bash
# Clear build cache
python rebuild.py --clean
```

### Database

```bash
# Delete dev database (to start fresh)
rm utm_data.db

# Delete desktop database
rd /s /q %AppData%\Roaming\UTMka
```

---

## 📦 Ready for Release?

Before releasing a new version:

1. Update version in:
   - `installers/windows/version_info.txt`
   - `installers/windows/setup.iss`

2. Create full build:
   ```bash
   python installers/windows/build.py
   ```

3. Test the installer

4. Create git tag:
   ```bash
   git tag -a v3.0.1 -m "Release v3.0.1"
   git push origin v3.0.1
   ```

---

**Ready! Happy coding!** 🚀
