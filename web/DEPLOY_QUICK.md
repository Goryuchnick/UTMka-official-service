# ⚡ Быстрый деплой — Шпаргалка

## 🎯 Минимальные требования сервера

- **VPS:** 1 CPU, 1GB RAM, 10GB SSD
- **ОС:** Ubuntu 22.04 LTS
- **Стоимость:** от 200-300₽/мес (Timeweb, Beget, REG.RU)

---

## 📝 Команды для быстрого деплоя

### 1. Подключение и обновление

```bash
ssh root@ваш_сервер_ip
apt update && apt upgrade -y
```

### 2. Установка зависимостей

```bash
apt install -y python3.10 python3-pip python3-venv postgresql nginx certbot python3-certbot-nginx git supervisor
```

### 3. Настройка PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE USER utmka_user WITH PASSWORD 'ваш_пароль';
CREATE DATABASE utmka_db OWNER utmka_user;
GRANT ALL PRIVILEGES ON DATABASE utmka_db TO utmka_user;
\q
```

### 4. Деплой приложения

```bash
adduser --disabled-password --gecos "" utmka
su - utmka
cd /home/utmka
git clone https://github.com/ваш_username/utmKA-2.0-2.git
cd utmKA-2.0-2/web
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

### 5. Создание .env

```bash
nano .env
```

```env
FLASK_ENV=production
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
DATABASE_URL=postgresql://utmka_user:ваш_пароль@localhost:5432/utmka_db
FRONTEND_URL=https://ваш_домен.ru
```

### 6. Миграции

```bash
flask db upgrade
mkdir -p /home/utmka/logs
```

### 7. Supervisor

```bash
sudo nano /etc/supervisor/conf.d/utmka.conf
```

```ini
[program:utmka]
command=/home/utmka/utmKA-2.0-2/web/venv/bin/gunicorn -c /home/utmka/utmKA-2.0-2/web/gunicorn_config.py run:app
directory=/home/utmka/utmKA-2.0-2/web
user=utmka
autostart=true
autorestart=true
environment=PATH="/home/utmka/utmKA-2.0-2/web/venv/bin"
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start utmka
```

### 8. Nginx

```bash
sudo nano /etc/nginx/sites-available/utmka
```

```nginx
server {
    listen 80;
    server_name ваш_домен.ru www.ваш_домен.ru;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/utmka /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. SSL

```bash
sudo certbot --nginx -d ваш_домен.ru -d www.ваш_домен.ru
```

### 10. Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## ✅ Проверка

```bash
# Статус сервисов
sudo supervisorctl status utmka
sudo systemctl status nginx
sudo systemctl status postgresql

# Логи
sudo supervisorctl tail utmka
tail -f /home/utmka/logs/gunicorn_error.log
```

---

## 🔄 Обновление

```bash
cd /home/utmka/utmKA-2.0-2
git pull
cd web
source venv/bin/activate
pip install -r requirements.txt
flask db upgrade
sudo supervisorctl restart utmka
```

---

**Время деплоя:** ~30-60 минут  
**Полное руководство:** `docs/DEPLOYMENT_GUIDE.md`
