# 🚀 Быстрый старт UTMka Web Service

## 📋 Предварительные требования

- Python 3.10+ 
- pip
- (Опционально) PostgreSQL для production

---

## 🔧 Установка и настройка

### 1. Создание виртуального окружения

```bash
cd web
python -m venv venv
```

### 2. Активация виртуального окружения

**Windows (PowerShell):**
```powershell
venv\Scripts\activate
```

**Windows (CMD):**
```cmd
venv\Scripts\activate.bat
```

**Linux/macOS:**
```bash
source venv/bin/activate
```

### 3. Установка зависимостей

```bash
pip install -r requirements.txt
```

---

## ⚙️ Настройка переменных окружения

Создайте файл `.env` в папке `web/`:

```env
# Flask
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production

# Database (SQLite для development)
DATABASE_URL=sqlite:///utmka_dev.db

# JWT Tokens
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000

# Frontend URL (для OAuth редиректов)
FRONTEND_URL=http://127.0.0.1:5000

# OAuth (опционально, для тестирования OAuth)
# YANDEX_CLIENT_ID=
# YANDEX_CLIENT_SECRET=
# YANDEX_REDIRECT_URI=http://127.0.0.1:5000/auth/yandex/callback

# VK_CLIENT_ID=
# VK_CLIENT_SECRET=
# VK_REDIRECT_URI=http://127.0.0.1:5000/auth/vk/callback

# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GOOGLE_REDIRECT_URI=http://127.0.0.1:5000/auth/google/callback
```

---

## 🗄️ Инициализация базы данных

### 1. Инициализация Alembic (если не сделано)

```bash
flask db init
```

### 2. Применение миграций

```bash
flask db upgrade
```

Это создаст файл `utmka_dev.db` с необходимыми таблицами.

---

## ▶️ Запуск приложения

```bash
python run.py
```

или

```bash
flask run --debug
```

**Приложение будет доступно по адресу:** http://127.0.0.1:5000

---

## ✅ Что уже работает (Итерации 0-9)

### Авторизация ✅
- [x] **Email регистрация** — POST /auth/register
- [x] **Email вход** — POST /auth/login
- [x] **Выход** — POST /auth/logout
- [x] **Текущий пользователь** — GET /auth/me
- [x] **Обновление токена** — POST /auth/refresh
- [x] **OAuth Yandex** — /auth/yandex, /auth/yandex/callback
- [x] **OAuth VK** — /auth/vk, /auth/vk/callback
- [x] **OAuth Google** — /auth/google, /auth/google/callback

### История UTM-меток ✅
- [x] **Получение истории** — GET /api/v1/history (с пагинацией, поиском, фильтрами)
- [x] **Добавление в историю** — POST /api/v1/history
- [x] **Удаление записи** — DELETE /api/v1/history/:id
- [x] **Обновление короткой ссылки** — PUT /api/v1/history/:id/short_url
- [x] **Экспорт истории** — POST /api/v1/history/export (JSON/CSV)
- [x] **Очистка истории** — DELETE /api/v1/history/clear

### Шаблоны ✅
- [x] **Получение шаблонов** — GET /api/v1/templates (с пагинацией, поиском, фильтрами по тегам)
- [x] **Создание шаблона** — POST /api/v1/templates
- [x] **Обновление шаблона** — PUT /api/v1/templates/:id
- [x] **Удаление шаблона** — DELETE /api/v1/templates/:id
- [x] **Импорт шаблонов** — POST /api/v1/templates/import
- [x] **Экспорт шаблонов** — POST /api/v1/templates/export (JSON/CSV)

### Подписки ✅
- [x] **Статус подписки** — GET /api/v1/subscription/status
- [x] **Список тарифов** — GET /api/v1/subscription/plans
- [x] **Активация trial** — POST /api/v1/subscription/activate-trial
- [x] **Отмена подписки** — POST /api/v1/subscription/cancel

### Фронтенд ✅
- [x] Полностью адаптированный UI с авторизацией
- [x] Модальные окна (вход, регистрация, подписка)
- [x] Интеграция с API через JWT токены
- [x] Проверка подписки перед сохранением

---

## 🧪 Тестирование функционала

### 1. Тест регистрации и авторизации

```bash
# Открыть браузер: http://127.0.0.1:5000
```

1. Нажмите **"Регистрация"**
2. Введите email и пароль
3. После регистрации вы автоматически войдёте
4. В правом верхнем углу появится ваш email и бейдж "free"

### 2. Тест генератора UTM

1. Введите URL сайта (например: `example.com`)
2. Заполните UTM-параметры:
   - Source: `google`
   - Medium: `cpc`
   - Campaign: `test`
3. Нажмите **"Сгенерировать"**
4. Ссылка будет сохранена в историю (если есть подписка)

### 3. Тест trial подписки

1. Перейдите на вкладку **"История"**
2. Если у вас free план, увидите сообщение о необходимости подписки
3. Вернитесь в консоль и выполните:

```bash
# Через Python shell
flask shell
```

```python
from app.models import User, Subscription
from app.extensions import db

# Найти пользователя
user = User.query.filter_by(email='ваш_email@example.com').first()

# Активировать trial
if user and user.subscription:
    user.subscription.activate_trial(days=7)
    db.session.commit()
    print(f"Trial активирован до {user.subscription.expires_at}")
```

4. Обновите страницу — теперь вы можете сохранять историю и шаблоны!

### 4. Тест CRUD операций

**История:**
- ✅ Создать несколько UTM-ссылок
- ✅ Открыть вкладку "История"
- ✅ Попробовать удалить запись
- ✅ Попробовать сократить ссылку (используется clck.ru)
- ✅ Экспортировать историю в JSON/CSV

**Шаблоны:**
- ✅ Создать шаблон с тегом
- ✅ Применить шаблон к генератору
- ✅ Удалить шаблон
- ✅ Экспортировать шаблоны
- ✅ Импортировать шаблоны из JSON

---

## 🐛 Отладка

### Проблемы с миграциями

```bash
# Удалить БД и создать заново
rm utmka_dev.db
flask db upgrade
```

### Проблемы с зависимостями

```bash
pip install --upgrade -r requirements.txt
```

### Просмотр логов

```bash
flask run --debug
```

Логи будут выводиться в консоль.

---

## 📊 Структура БД

После миграций создаются таблицы:
- `users` — пользователи
- `oauth_accounts` — OAuth аккаунты
- `subscriptions` — подписки
- `history` — история UTM-меток
- `templates` — шаблоны
- `payments` — платежи (будет в итерации 12)

---

## 🔐 Тестовые данные

### Создание тестового пользователя с Pro подпиской

```python
flask shell
```

```python
from app.models import User, Subscription
from app.extensions import db
from datetime import datetime, timedelta

# Создать пользователя
user = User(email='test@example.com', name='Test User')
user.set_password('password123')
db.session.add(user)
db.session.commit()

# Создать Pro подписку
sub = Subscription(
    user_id=user.id,
    plan='pro',
    status='active',
    started_at=datetime.utcnow(),
    expires_at=datetime.utcnow() + timedelta(days=30),
    auto_renew=False,
    trial_used=True
)
db.session.add(sub)
db.session.commit()

print(f"✅ Пользователь создан: {user.email}")
print(f"✅ Подписка: {sub.plan} до {sub.expires_at}")
```

---

## 📝 API Endpoints

Полная документация API: `docs/API_SPECIFICATION.md`

**Base URL:** http://127.0.0.1:5000

**Примеры запросов:**

```bash
# Регистрация
curl -X POST http://127.0.0.1:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Вход
curl -X POST http://127.0.0.1:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Получить историю (требуется токен)
curl -X GET http://127.0.0.1:5000/api/v1/history \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🚧 Что будет дальше

### Итерация 11-12: Платежи (ЮKassa)
- Интеграция с ЮKassa
- Создание платежей
- Webhook обработка
- Автопродление подписок

### Итерация 13-15: Production
- Docker контейнеризация
- PostgreSQL вместо SQLite
- Nginx reverse proxy
- SSL сертификаты
- CI/CD через GitHub Actions

---

## 📖 Дополнительные ресурсы

- [WEB_SERVICE_PLAN.md](../docs/WEB_SERVICE_PLAN.md) — план разработки
- [ITERATION_LOG.md](../docs/ITERATION_LOG.md) — журнал итераций
- [API_SPECIFICATION.md](../docs/API_SPECIFICATION.md) — спецификация API
- [DATABASE_SCHEMA.md](../docs/DATABASE_SCHEMA.md) — схема БД

---

**Статус:** Итерации 0-9 завершены ✅  
**Последнее обновление:** 19.01.2026
