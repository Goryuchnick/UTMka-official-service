# 🚀 ЗАПУСК СЕРВЕРА — Пошаговая инструкция

## Шаг 1: Подготовка окружения

### 1.1 Откройте PowerShell в папке `web`

```powershell
cd "D:\Programmes projects\utmKA-2.0-2\web"
```

### 1.2 Создайте виртуальное окружение

```powershell
python -m venv venv
```

### 1.3 Активируйте виртуальное окружение

```powershell
.\venv\Scripts\Activate.ps1
```

Если возникает ошибка ExecutionPolicy:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

### 1.4 Установите зависимости

```powershell
pip install -r requirements.txt
```

---

## Шаг 2: Создание .env файла

Создайте файл `.env` в папке `web` со следующим содержимым:

```env
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=dev-secret-key-12345
JWT_SECRET_KEY=dev-jwt-secret-67890
DATABASE_URL=sqlite:///utmka_dev.db
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000
FRONTEND_URL=http://127.0.0.1:5000
```

**В PowerShell:**
```powershell
@"
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=dev-secret-key-12345
JWT_SECRET_KEY=dev-jwt-secret-67890
DATABASE_URL=sqlite:///utmka_dev.db
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000
FRONTEND_URL=http://127.0.0.1:5000
"@ | Out-File -FilePath .env -Encoding UTF8
```

---

## Шаг 3: Инициализация базы данных

```powershell
flask db upgrade
```

**Ожидаемый результат:**
```
INFO  [alembic.runtime.migration] Running upgrade  -> 001_initial_schema
```

Будет создан файл `utmka_dev.db`.

---

## Шаг 4: Запуск сервера

```powershell
python run.py
```

**Ожидаемый вывод:**
```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

---

## Шаг 5: Открытие в браузере

Откройте: **http://127.0.0.1:5000**

---

## ✅ Быстрый тест

### Тест 1: Регистрация

1. Нажмите **"Регистрация"**
2. Email: `test@example.com`
3. Password: `password123`
4. Нажмите **"Зарегистрироваться"**
5. ✅ Вы автоматически войдёте в систему
6. ✅ В правом верхнем углу появится ваш email и бейдж "free"

### Тест 2: Генератор UTM

1. URL: `example.com`
2. Source: `google`
3. Medium: `cpc`
4. Campaign: `test`
5. Нажмите **"Сгенерировать"**
6. ✅ Ссылка сгенерирована

### Тест 3: Активация Trial (через консоль)

Откройте **новый** PowerShell в папке `web`:

```powershell
flask shell
```

В интерактивной консоли:

```python
from app.models import User, Subscription
from app.extensions import db

# Найти пользователя
user = User.query.filter_by(email='test@example.com').first()

# Активировать trial
if user and user.subscription:
    user.subscription.activate_trial(days=7)
    db.session.commit()
    print(f"✅ Trial активирован до {user.subscription.expires_at}")
else:
    print("❌ Пользователь не найден")

# Выход
exit()
```

### Тест 4: Проверка Trial

1. Обновите страницу в браузере (F5)
2. ✅ Бейдж изменился на "trial"
3. Сгенерируйте новую ссылку
4. ✅ Ссылка сохранится в историю
5. Перейдите на вкладку **"История"**
6. ✅ Запись отображается

---

## 🎉 Если всё работает

Поздравляем! Веб-сервис UTMka готов к использованию.

**Что дальше:**
- Ознакомьтесь с [QUICK_START.md](QUICK_START.md) — полное руководство
- Используйте [TEST_CHECKLIST.md](TEST_CHECKLIST.md) — для полного тестирования
- Изучите [API_SPECIFICATION.md](../docs/API_SPECIFICATION.md) — документация API

---

## 🐛 Если что-то пошло не так

### Ошибка: "No module named 'flask'"

```powershell
pip install -r requirements.txt
```

### Ошибка: "cannot import name 'db'"

```powershell
# Переустановка зависимостей
pip uninstall -y -r requirements.txt
pip install -r requirements.txt
```

### Ошибка: "Could not locate a Flask application"

Проверьте, что `.env` создан и содержит `FLASK_APP=run.py`

### База данных не создаётся

```powershell
# Удалите старую БД (если есть)
Remove-Item utmka_dev.db -ErrorAction SilentlyContinue
# Запустите миграции заново
flask db upgrade
```

---

## 📞 Поддержка

Если возникли проблемы, проверьте:
1. Активно ли виртуальное окружение? (в начале строки должно быть `(venv)`)
2. Установлены ли все зависимости? `pip list`
3. Создан ли файл `.env`?
4. Выполнены ли миграции? Есть ли файл `utmka_dev.db`?

---

**Статус:** Готов к запуску ✅  
**Версия:** Итерация 10  
**Дата:** 19.01.2026
