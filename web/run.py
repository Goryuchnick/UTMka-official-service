"""
Точка входа для запуска веб-сервиса UTMka
"""
import os
from dotenv import load_dotenv
from app import create_app
from app.config import config

# Загружаем переменные окружения из .env файла
load_dotenv()

# Определяем конфигурацию из переменной окружения
config_name = os.environ.get('FLASK_ENV', 'development')
app = create_app(config.get(config_name, config['default']))

if __name__ == '__main__':
    # Запуск в режиме разработки
    app.run(
        host=os.environ.get('FLASK_HOST', '127.0.0.1'),
        port=int(os.environ.get('FLASK_PORT', 5000)),
        debug=os.environ.get('FLASK_ENV') == 'development'
    )
