"""
Desktop приложение UTMka
"""
import sys
import threading
import webview
from src.desktop.utils import find_free_port, wait_for_server
from src.api import create_app


def run_server(app, port: int):
    """Запуск Flask сервера"""
    app.run(
        host='127.0.0.1',
        port=port,
        debug=False,
        use_reloader=False,
        threaded=True
    )


def main():
    """Точка входа"""
    # Создаём Flask приложение
    app = create_app('desktop')
    
    # Находим свободный порт
    port = find_free_port()
    print(f"Используем порт: {port}")
    
    # Запускаем сервер в фоновом потоке
    server_thread = threading.Thread(
        target=run_server,
        args=(app, port),
        daemon=True
    )
    server_thread.start()
    
    # Ждём готовности сервера
    if not wait_for_server(port, timeout=30):
        print("Ошибка: сервер не запустился")
        sys.exit(1)
    
    # Создаём окно
    window = webview.create_window(
        'UTMka - сервис для бизнеса и маркетологов',
        f'http://127.0.0.1:{port}',
        width=1200,
        height=900,
        resizable=True,
        min_size=(800, 600),
        maximized=True
    )
    
    # Запускаем GUI
    webview.start()


if __name__ == '__main__':
    main()
