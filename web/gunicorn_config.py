"""Конфигурация Gunicorn для production"""
import multiprocessing
import os

# Количество воркеров (рекомендуется: CPU * 2 + 1)
# Для production можно задать фиксированное значение
workers = int(os.environ.get('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))

# Тип воркеров
worker_class = 'sync'

# Таймауты (в секундах)
timeout = 120
keepalive = 5
graceful_timeout = 30

# Логирование
accesslog = os.environ.get('GUNICORN_ACCESS_LOG', '/home/utmka/logs/gunicorn_access.log')
errorlog = os.environ.get('GUNICORN_ERROR_LOG', '/home/utmka/logs/gunicorn_error.log')
loglevel = os.environ.get('GUNICORN_LOG_LEVEL', 'info')

# Биндинг (слушаем только localhost, Nginx будет проксировать)
bind = os.environ.get('GUNICORN_BIND', '127.0.0.1:5000')

# Перезагрузка при изменении кода (только для dev)
reload = os.environ.get('FLASK_ENV') == 'development'

# Имя процесса
proc_name = 'utmka_web'

# Максимальное количество запросов на воркер перед перезапуском (для предотвращения утечек памяти)
max_requests = 1000
max_requests_jitter = 50

# Preload приложения (ускоряет запуск воркеров)
preload_app = True

# Пользователь и группа (если запускается от root)
# user = 'utmka'
# group = 'utmka'
