"""
Desktop приложение UTMka
"""
import sys
import base64
import threading
import webview
from src.desktop.utils import find_free_port, wait_for_server
from src.api import create_app


class Api:
    """JS API для взаимодействия фронтенда с нативными диалогами."""

    def __init__(self):
        self._window = None

    def save_file(self, default_filename, content, file_types=None):
        """Открывает системный диалог «Сохранить как» и записывает файл."""
        try:
            result = self._window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=default_filename,
                file_types=file_types or ('All files (*.*)',)
            )
            if result:
                filepath = result if isinstance(result, str) else result[0]
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                return {'success': True, 'path': filepath}
            return {'success': False, 'cancelled': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def save_binary_file(self, default_filename, data_base64, file_types=None):
        """Открывает системный диалог и сохраняет бинарный файл (PNG и др.)."""
        try:
            result = self._window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=default_filename,
                file_types=file_types or ('All files (*.*)',)
            )
            if result:
                filepath = result if isinstance(result, str) else result[0]
                with open(filepath, 'wb') as f:
                    f.write(base64.b64decode(data_base64))
                return {'success': True, 'path': filepath}
            return {'success': False, 'cancelled': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}


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

    # Создаём JS API и окно
    api = Api()
    window = webview.create_window(
        'UTMka - сервис для бизнеса и маркетологов',
        f'http://127.0.0.1:{port}',
        width=1200,
        height=900,
        resizable=True,
        min_size=(800, 600),
        maximized=True,
        js_api=api
    )
    api._window = window

    # Запускаем GUI
    webview.start()


if __name__ == '__main__':
    main()
