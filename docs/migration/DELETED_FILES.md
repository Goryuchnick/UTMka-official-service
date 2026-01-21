# Удалённые файлы

## Дата: Январь 2026

## Причина удаления

В рамках модернизации архитектуры UTMka 3.0 были удалены дублирующиеся и устаревшие файлы.

---

## Удалённые файлы

### QtWebEngine версия (не используется)

| Файл | Размер | Причина |
|------|--------|---------|
| `app_qtwebengine.py` | 31 KB | Дублирует app.py, используем PyWebView |
| `config/setup_qtwebengine.iss` | 3 KB | Установщик для QtWebEngine |
| `scripts/build_qtwebengine.bat` | 1 KB | Скрипт сборки QtWebEngine |
| `scripts/build_qtwebengine.py` | 3 KB | Скрипт сборки QtWebEngine |
| `scripts/build_installer_qtwebengine.bat` | 2 KB | Скрипт установщика QtWebEngine |

### Native версия (упрощённая, не используется)

| Файл | Размер | Причина |
|------|--------|---------|
| `native_app/main.py` | 0.5 KB | Native версия без WebView |
| `native_app/build_native.py` | 0.6 KB | Сборка native |
| `native_app/ui/main_window.py` | 6 KB | UI native версии |
| `native_app/core/db.py` | 4 KB | БД для native |
| `native_app/core/services.py` | 5 KB | Сервисы native |
| `native_app/core/utils.py` | 0.5 KB | Утилиты native |
| `config/setup_native.iss` | 2 KB | Установщик native |

### Дубликаты

| Файл | Размер | Причина |
|------|--------|---------|
| `INSTALL_MACOS.txt` | 10 KB | Дублирует INSTALL_MACOS.md |

---

## Обновления

### requirements.txt

Удалены зависимости:
- `PyQt6==6.7.0` (не используется)
- `PyQt6-WebEngine==6.7.0` (не используется)

Добавлены зависимости:
- `flask-sqlalchemy==3.1.1` (для ORM)
- `marshmallow==3.20.1` (для валидации)

---

## Итоговый размер

**Удалено:** ~65 KB исходного кода

**Оставшаяся структура:**
- `app.py` — основное приложение (PyWebView)
- `web/app/` — Flask API (для web версии)
- `index.html` — Frontend
- `scripts/` — скрипты сборки (только PyWebView)
- `config/setup.iss` — установщик Windows
