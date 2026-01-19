# 🚀 Руководство по деплою UTMka Web Service

**Дата:** 19.01.2026  
**Версия:** Production Ready

---

## 📋 Требования к серверу

### Минимальные требования (для начала)

| Ресурс | Минимум | Рекомендуется |
|--------|---------|---------------|
| **CPU** | 1 ядро | 2+ ядра |
| **RAM** | 1 GB | 2-4 GB |
| **Диск** | 10 GB | 20+ GB SSD |
| **ОС** | Ubuntu 20.04+ / Debian 11+ | Ubuntu 22.04 LTS |
| **Сеть** | 100 Mbps | 1 Gbps |

### Рекомендуемые провайдеры VPS

#### 🇷🇺 Для России:
- **Timeweb Cloud** — от 250₽/мес (1 ядро, 1GB RAM)
- **Selectel** — от 300₽/мес
- **REG.RU** — от 350₽/мес
- **Beget** — от 200₽/мес

#### 🌍 Международные:
- **DigitalOcean** — от $6/мес (1GB RAM)
- **Hetzner** — от €4/мес (2GB RAM)
- **Linode** — от $5/мес
- **Vultr** — от $6/мес

---

## 🛠️ Подготовка сервера

### Шаг 1: Подключение к серверу

```bash
ssh root@ваш_сервер_ip
```

### Шаг 2: Обновление системы

```bash
apt update && apt upgrade -y
```

### Шаг 3: Установка базовых пакетов

```bash
apt install -y \
    python3.10 \
    python3-pip \
    python3-venv \
    postgresql \
    postgresql-contrib \
    nginx \
    certbot \
    python3-certbot-nginx \
    git \
    supervisor \
    curl \
    wget \
    build-essential
```

---

## 🗄️ Настройка PostgreSQL

### 1. Создание базы данных

```bash
sudo -u postgres psql
```

В PostgreSQL консоли:

```sql
-- Создаём пользователя
CREATE USER utmka_user WITH PASSWORD 'ваш_надёжный_пароль';

-- Создаём базу данных
CREATE DATABASE utmka_db OWNER utmka_user;

-- Даём права
GRANT ALL PRIVILEGES ON DATABASE utmka_db TO utmka_user;

-- Выход
\q
```

### 2. Настройка PostgreSQL (опционально)

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Найдите и измените:
```
max_connections = 100
shared_buffers = 256MB
```

Перезапустите PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## 📦 Деплой приложения

### Шаг 1: Создание пользователя для приложения

```bash
adduser --disabled-password --gecos "" utmka
su - utmka
```

### Шаг 2: Клонирование репозитория

```bash
cd /home/utmka
git clone https://github.com/ваш_username/utmKA-2.0-2.git
cd utmKA-2.0-2/web
```

### Шаг 3: Создание виртуального окружения

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Шаг 4: Создание .env файла

```bash
nano .env
```

Содержимое `.env`:

```env
# Flask
FLASK_APP=run.py
FLASK_ENV=production
SECRET_KEY=сгенерируйте_случайную_строку_минимум_32_символа
JWT_SECRET_KEY=другая_случайная_строка_минимум_32_символа

# Database (PostgreSQL)
DATABASE_URL=postgresql://utmka_user:ваш_пароль@localhost:5432/utmka_db

# JWT
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000

# Frontend URL
FRONTEND_URL=https://ваш_домен.ru

# OAuth (если настроены)
YANDEX_CLIENT_ID=ваш_yandex_client_id
YANDEX_CLIENT_SECRET=ваш_yandex_client_secret
YANDEX_REDIRECT_URI=https://ваш_домен.ru/auth/yandex/callback

VK_CLIENT_ID=ваш_vk_client_id
VK_CLIENT_SECRET=ваш_vk_client_secret
VK_REDIRECT_URI=https://ваш_домен.ru/auth/vk/callback

GOOGLE_CLIENT_ID=ваш_google_client_id
GOOGLE_CLIENT_SECRET=ваш_google_client_secret
GOOGLE_REDIRECT_URI=https://ваш_домен.ru/auth/google/callback

# Payment (будет в итерации 12)
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_RETURN_URL=https://ваш_домен.ru/payment/success
```

**Генерация SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Шаг 5: Применение миграций

```bash
flask db upgrade
```

### Шаг 6: Создание директории для логов

```bash
mkdir -p /home/utmka/logs
```

---

## 🔧 Настройка Gunicorn

### Установка Gunicorn

```bash
pip install gunicorn
```

### Создание конфигурации Gunicorn

```bash
nano /home/utmka/utmKA-2.0-2/web/gunicorn_config.py
```

Содержимое:

```python
"""Конфигурация Gunicorn"""
import multiprocessing

# Количество воркеров (рекомендуется: CPU * 2 + 1)
workers = multiprocessing.cpu_count() * 2 + 1

# Тип воркеров
worker_class = 'sync'

# Таймауты
timeout = 120
keepalive = 5

# Логирование
accesslog = '/home/utmka/logs/gunicorn_access.log'
errorlog = '/home/utmka/logs/gunicorn_error.log'
loglevel = 'info'

# Биндинг
bind = '127.0.0.1:5000'

# Перезагрузка при изменении кода (только для dev)
reload = False

# Имя приложения
proc_name = 'utmka_web'
```

---

## 🎯 Настройка Supervisor

Supervisor будет управлять процессом Gunicorn.

### Создание конфигурации

```bash
sudo nano /etc/supervisor/conf.d/utmka.conf
```

Содержимое:

```ini
[program:utmka]
command=/home/utmka/utmKA-2.0-2/web/venv/bin/gunicorn -c /home/utmka/utmKA-2.0-2/web/gunicorn_config.py run:app
directory=/home/utmka/utmKA-2.0-2/web
user=utmka
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/home/utmka/logs/supervisor_error.log
stdout_logfile=/home/utmka/logs/supervisor_access.log
environment=PATH="/home/utmka/utmKA-2.0-2/web/venv/bin"
```

### Запуск Supervisor

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start utmka
sudo supervisorctl status utmka
```

**Полезные команды:**
```bash
sudo supervisorctl restart utmka  # Перезапуск
sudo supervisorctl stop utmka     # Остановка
sudo supervisorctl tail utmka      # Просмотр логов
```

---

## 🌐 Настройка Nginx

### Создание конфигурации Nginx

```bash
sudo nano /etc/nginx/sites-available/utmka
```

Содержимое:

```nginx
server {
    listen 80;
    server_name ваш_домен.ru www.ваш_домен.ru;

    # Редирект на HTTPS (будет работать после настройки SSL)
    # return 301 https://$server_name$request_uri;

    # Временно оставляем HTTP для настройки SSL
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Статические файлы (если будут)
    location /static {
        alias /home/utmka/utmKA-2.0-2/web/app/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Максимальный размер загружаемых файлов
    client_max_body_size 10M;
}
```

### Активация конфигурации

```bash
sudo ln -s /etc/nginx/sites-available/utmka /etc/nginx/sites-enabled/
sudo nginx -t  # Проверка конфигурации
sudo systemctl restart nginx
```

---

## 🔒 Настройка SSL (Let's Encrypt)

### Получение SSL сертификата

```bash
sudo certbot --nginx -d ваш_домен.ru -d www.ваш_домен.ru
```

Certbot автоматически:
- Получит сертификат
- Настроит Nginx для HTTPS
- Настроит автообновление

### Обновление конфигурации Nginx для HTTPS

После получения сертификата, Nginx будет автоматически обновлён. Проверьте:

```bash
sudo nano /etc/nginx/sites-available/utmka
```

Должно быть:

```nginx
server {
    listen 80;
    server_name ваш_домен.ru www.ваш_домен.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ваш_домен.ru www.ваш_домен.ru;

    ssl_certificate /etc/letsencrypt/live/ваш_домен.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ваш_домен.ru/privkey.pem;
    
    # SSL настройки безопасности
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /static {
        alias /home/utmka/utmKA-2.0-2/web/app/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 10M;
}
```

Перезапустите Nginx:
```bash
sudo systemctl restart nginx
```

---

## 🔄 Обновление приложения

### Создание скрипта обновления

```bash
nano /home/utmka/update.sh
```

Содержимое:

```bash
#!/bin/bash
cd /home/utmka/utmKA-2.0-2
git pull origin main
cd web
source venv/bin/activate
pip install -r requirements.txt
flask db upgrade
sudo supervisorctl restart utmka
echo "Обновление завершено!"
```

Сделайте скрипт исполняемым:
```bash
chmod +x /home/utmka/update.sh
```

Использование:
```bash
/home/utmka/update.sh
```

---

## 📊 Мониторинг

### Просмотр логов

```bash
# Логи Gunicorn
tail -f /home/utmka/logs/gunicorn_error.log
tail -f /home/utmka/logs/gunicorn_access.log

# Логи Supervisor
sudo supervisorctl tail utmka

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Логи PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Проверка статуса сервисов

```bash
# Supervisor
sudo supervisorctl status

# Nginx
sudo systemctl status nginx

# PostgreSQL
sudo systemctl status postgresql
```

---

## 🔥 Firewall (UFW)

### Настройка firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

---

## 🐳 Docker (альтернативный вариант)

Если хотите использовать Docker, создайте файлы:

### Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода
COPY . .

# Переменные окружения
ENV FLASK_APP=run.py
ENV FLASK_ENV=production

# Порт
EXPOSE 5000

# Запуск через Gunicorn
CMD ["gunicorn", "-c", "gunicorn_config.py", "run:app"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://utmka_user:password@db:5432/utmka_db
    depends_on:
      - db
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=utmka_user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=utmka_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Запуск:
```bash
docker-compose up -d
```

---

## 📈 Оптимизация производительности

### 1. Настройка PostgreSQL

```sql
-- В psql
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
```

Перезапустите PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 2. Настройка Gunicorn

Увеличьте количество воркеров в `gunicorn_config.py`:
```python
workers = 4  # Для 2 CPU
```

### 3. Кэширование (Redis)

Установка Redis:
```bash
sudo apt install redis-server
```

В `.env`:
```env
REDIS_URL=redis://localhost:6379/0
```

---

## 🔐 Безопасность

### 1. Обновление системы

```bash
sudo apt update && apt upgrade -y
```

### 2. Настройка SSH (отключение root)

```bash
sudo nano /etc/ssh/sshd_config
```

Измените:
```
PermitRootLogin no
PasswordAuthentication no  # Используйте только ключи
```

Перезапустите SSH:
```bash
sudo systemctl restart sshd
```

### 3. Регулярные бэкапы

Создайте скрипт бэкапа:

```bash
nano /home/utmka/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/utmka/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Бэкап БД
pg_dump -U utmka_user utmka_db > "$BACKUP_DIR/db_$DATE.sql"

# Бэкап файлов
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" /home/utmka/utmKA-2.0-2

# Удаление старых бэкапов (старше 7 дней)
find $BACKUP_DIR -type f -mtime +7 -delete
```

Добавьте в cron:
```bash
crontab -e
```

```
0 2 * * * /home/utmka/backup.sh
```

---

## ✅ Чек-лист деплоя

- [ ] Сервер настроен (Ubuntu 22.04+)
- [ ] PostgreSQL установлен и настроен
- [ ] Приложение склонировано
- [ ] Виртуальное окружение создано
- [ ] Зависимости установлены
- [ ] `.env` файл создан с правильными настройками
- [ ] Миграции применены (`flask db upgrade`)
- [ ] Gunicorn настроен
- [ ] Supervisor настроен и запущен
- [ ] Nginx настроен
- [ ] SSL сертификат получен (Let's Encrypt)
- [ ] Firewall настроен
- [ ] Домен указывает на сервер (A-запись)
- [ ] Приложение доступно по HTTPS
- [ ] Логи работают
- [ ] Бэкапы настроены

---

## 🚨 Решение проблем

### Приложение не запускается

```bash
# Проверьте логи
sudo supervisorctl tail utmka

# Проверьте статус
sudo supervisorctl status utmka

# Перезапустите
sudo supervisorctl restart utmka
```

### Ошибки базы данных

```bash
# Проверьте подключение
psql -U utmka_user -d utmka_db

# Проверьте миграции
cd /home/utmka/utmKA-2.0-2/web
source venv/bin/activate
flask db current
flask db upgrade
```

### Nginx не работает

```bash
# Проверьте конфигурацию
sudo nginx -t

# Проверьте логи
sudo tail -f /var/log/nginx/error.log

# Перезапустите
sudo systemctl restart nginx
```

---

## 📞 Полезные команды

```bash
# Перезапуск всех сервисов
sudo supervisorctl restart utmka
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Просмотр использования ресурсов
htop
df -h
free -h

# Проверка портов
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

---

## 🎯 Следующие шаги после деплоя

1. **Настроить мониторинг** (UptimeRobot, Pingdom)
2. **Настроить аналитику** (Google Analytics, Яндекс.Метрика)
3. **Настроить CDN** (Cloudflare) для статики
4. **Настроить email** (SendGrid, Mailgun) для уведомлений
5. **Настроить CI/CD** (GitHub Actions) для автоматического деплоя

---

**Статус:** Готово к production деплою ✅  
**Время деплоя:** ~1-2 часа  
**Сложность:** Средняя
