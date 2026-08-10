#!/usr/bin/env python3
"""
Локальный запуск UTMka Desktop (модульная версия)

Usage:
    python run_desktop.py          # Запуск с pywebview окном
    python run_desktop.py --dev    # Запуск в dev режиме (browser)
"""
import sys
import argparse

def main():
    parser = argparse.ArgumentParser(description='UTMka Desktop Launcher')
    parser.add_argument('--dev', action='store_true',
                       help='Development mode (открыть в браузере)')
    parser.add_argument('--port', type=int, default=None,
                       help='Порт для Flask (по умолчанию: случайный свободный)')
    args = parser.parse_args()

    if args.dev:
        # Development mode - запуск Flask без pywebview
        from src.api import create_app
        from src.desktop.utils import find_free_port

        port = args.port or find_free_port()
        app = create_app('development')

        print("=" * 50)
        print("UTMka Development Mode")
        print("=" * 50)
        print(f"Frontend: frontend/ (ES6 modules)")
        print(f"URL: http://127.0.0.1:{port}")
        print(f"Database: ./utm_data.db (dev mode)")
        print("=" * 50)
        print()

        app.run(
            host='127.0.0.1',
            port=port,
            debug=True
        )
    else:
        # Desktop mode - запуск с pywebview
        from src.desktop.main import main as desktop_main

        print("=" * 50)
        print("UTMka Desktop")
        print("=" * 50)
        print(f"Entry: src/desktop/main.py")
        print(f"Frontend: frontend/ (ES6 modules)")
        print(f"Database: %AppData%\\Roaming\\UTMka\\databases\\utmka.db")
        print("=" * 50)
        print()

        desktop_main()

if __name__ == '__main__':
    main()
