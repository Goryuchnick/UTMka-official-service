import sqlite3
import hashlib
import json
import os
import sys
# Lazy imports for GUI to avoid crashes in headless mode
tk = None
filedialog = None
IS_HEADLESS = False
from flask import Flask, request, jsonify, render_template, send_from_directory, send_file


def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)

def get_app_dir():
    """Получает директорию приложения для хранения данных (БД, downloads и т.д.)"""
    if getattr(sys, 'frozen', False):
        # Если приложение собрано в exe (PyInstaller)
        # Используем директорию, где находится exe файл
        app_dir = os.path.dirname(sys.executable)
    else:
        # В режиме разработки используем текущую директорию
        app_dir = os.path.abspath(".")
    return app_dir

# --- Инициализация Flask приложения ---
app = Flask(__name__, static_url_path='', static_folder=resource_path('.'), template_folder=resource_path('.'))

# --- Настройка базы данных ---
# База данных должна быть в папке приложения, а не во временной папке PyInstaller
APP_DIR = get_app_dir()
DB_NAME = os.path.join(APP_DIR, 'utm_data.db')
DOWNLOADS_DIR = os.path.join(APP_DIR, 'downloads')


def get_db_connection():
    """Создает соединение с базой данных."""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def select_folder_and_save_file(source_file_path, suggested_filename):
    """Открывает диалог сохранения файла, позволяя выбрать папку и имя."""
    global tk, filedialog, IS_HEADLESS
    try:
        if IS_HEADLESS:
            # В headless режиме просто сохраняем в папку downloads приложения
            folder_path = DOWNLOADS_DIR
            if not os.path.exists(folder_path):
                os.makedirs(folder_path)
            
            destination_path = os.path.join(folder_path, suggested_filename)
            import shutil
            if os.path.abspath(source_file_path) != os.path.abspath(destination_path):
                shutil.copy2(source_file_path, destination_path)
            
            return {
                'success': True,
                'folder_path': folder_path,
                'file_path': destination_path,
                'filename': suggested_filename
            }

        if tk is None:
            import tkinter as tk
            from tkinter import filedialog
            
        # Создаем скрытое окно tkinter
        root = tk.Tk()
        root.withdraw()  # Скрываем главное окно
        root.attributes("-topmost", True) # Выводим диалог на передний план
        
        # Определяем расширение и описание
        ext = os.path.splitext(suggested_filename)[1].lower()
        file_types = [("JSON files", "*.json")] if ext == '.json' else [("CSV files", "*.csv")]
        file_types.append(("All files", "*.*"))

        # Открывает диалог "Сохранить как"
        file_path = filedialog.asksaveasfilename(
            title="Сохранить файл как",
            initialdir=os.path.expanduser("~/Downloads"),
            initialfile=suggested_filename,
            defaultextension=ext,
            filetypes=file_types
        )
        
        root.destroy()
        
        if file_path:
            # Копируем файл в выбранную папку
            import shutil
            shutil.copy2(source_file_path, file_path)
            
            return {
                'success': True,
                'folder_path': os.path.dirname(file_path),
                'file_path': file_path,
                'filename': os.path.basename(file_path)
            }
        else:
            return {
                'success': False,
                'error': 'Сохранение отменено'
            }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def init_db():
    """Инициализирует таблицы в базе данных, если их нет."""
    # Создаем папку для скачивания файлов в папке приложения
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    
    conn = get_db_connection()
    # Оптимизация: отключаем синхронизацию для быстрого создания таблиц
    conn.execute('PRAGMA synchronous = NORMAL')
    conn.execute('PRAGMA journal_mode = WAL')  # Write-Ahead Logging для лучшей производительности
    conn.execute('PRAGMA cache_size = 10000')  # Увеличиваем кэш
    cursor = conn.cursor()
    
    # Таблица пользователей (остается для хранения данных, но без логина)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    
    # Улучшенная таблица истории с отдельными полями для UTM-параметров
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            base_url TEXT NOT NULL,
            full_url TEXT NOT NULL,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            utm_content TEXT,
            utm_term TEXT,
            short_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Миграция: добавляем колонку short_url если её нет
    try:
        cursor.execute('ALTER TABLE history_new ADD COLUMN short_url TEXT')
    except sqlite3.OperationalError:
        pass  # Колонка уже существует
    
    # Таблица шаблонов (уже имеет правильную структуру)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            name TEXT NOT NULL,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            utm_content TEXT,
            utm_term TEXT,
            tag_name TEXT,
            tag_color TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Миграция данных из старой таблицы history в новую history_new ---
    try:
        # Проверяем, существует ли старая таблица history
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='history'")
        old_history_exists = cursor.fetchone() is not None
        
        if old_history_exists:
            # Проверяем, есть ли данные в старой таблице
            cursor.execute("SELECT COUNT(*) FROM history")
            old_count = cursor.fetchone()[0]
            
            if old_count > 0:
                print(f"Migrating {old_count} records from old history table...")
                
                # Получаем данные из старой таблицы
                cursor.execute("SELECT * FROM history")
                old_records = cursor.fetchall()
                
                # Переносим данные в новую таблицу
                for record in old_records:
                    # Парсим URL для извлечения UTM-параметров
                    url = record['url']
                    base_url = url.split('?')[0] if '?' in url else url
                    
                    # Извлекаем UTM-параметры из URL
                    utm_params = {}
                    if '?' in url:
                        params = url.split('?')[1]
                        for param in params.split('&'):
                            if '=' in param:
                                key, value = param.split('=', 1)
                                if key.startswith('utm_'):
                                    utm_params[key] = value
                    
                    # Вставляем в новую таблицу
                    cursor.execute('''
                        INSERT INTO history_new (user_email, base_url, full_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        record['user_email'],
                        base_url,
                        url,
                        utm_params.get('utm_source'),
                        utm_params.get('utm_medium'),
                        utm_params.get('utm_campaign'),
                        utm_params.get('utm_content'),
                        utm_params.get('utm_term'),
                        record['created_at']
                    ))
                
                print(f"Successfully migrated {old_count} records to new history table")
                
                # Переименовываем старую таблицу в backup
                cursor.execute("ALTER TABLE history RENAME TO history_backup")
                print("Old history table renamed to history_backup")
        
        # Проверяем наличие колонок tag_name и tag_color в templates
        cursor.execute("PRAGMA table_info(templates)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'tag_name' not in columns:
            cursor.execute('ALTER TABLE templates ADD COLUMN tag_name TEXT')
        if 'tag_color' not in columns:
            cursor.execute('ALTER TABLE templates ADD COLUMN tag_color TEXT')
            
    except Exception as e:
        print(f"Error during migration: {e}")
    # --- Конец миграции ---

    # Создаем индексы для ускорения запросов (только если их еще нет)
    try:
        # Проверяем существование индексов перед созданием для ускорения
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_history_new_user_email'")
        if cursor.fetchone() is None:
            cursor.execute('CREATE INDEX idx_history_new_user_email ON history_new(user_email)')
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_history_new_created_at'")
        if cursor.fetchone() is None:
            cursor.execute('CREATE INDEX idx_history_new_created_at ON history_new(created_at)')
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_templates_user_email'")
        if cursor.fetchone() is None:
            cursor.execute('CREATE INDEX idx_templates_user_email ON templates(user_email)')
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_templates_created_at'")
        if cursor.fetchone() is None:
            cursor.execute('CREATE INDEX idx_templates_created_at ON templates(created_at)')
    except Exception as e:
        print(f"Ошибка при создании индексов: {e}")

    conn.commit()
    conn.close()


# --- API эндпоинты (маршруты) ---

@app.route('/')
def index():
    """Отдает главный HTML файл."""
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    """Отдает favicon."""
    return send_file(resource_path('logo/logoutm.png'), mimetype='image/png')


# --- История ---
@app.route('/history', methods=['GET'])
def get_history():
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify([])
    
    conn = get_db_connection()
    
    try:
        # Устанавливаем таймаут для запроса
        conn.execute('PRAGMA busy_timeout = 5000')  # 5 секунд
        
        # Используем новую таблицу history_new, если она существует
        try:
            history_items = conn.execute('SELECT * FROM history_new WHERE user_email = ? ORDER BY created_at DESC LIMIT 1000',
                                         (user_email,)).fetchall()
        except:
            # Fallback на старую таблицу history
            history_items = conn.execute('SELECT * FROM history WHERE user_email = ? ORDER BY created_at DESC LIMIT 1000',
                                         (user_email,)).fetchall()
        
        return jsonify([dict(row) for row in history_items])
    except Exception as e:
        print(f"Ошибка при загрузке истории: {e}")
        return jsonify([])
    finally:
        conn.close()


@app.route('/history', methods=['POST'])
def add_history():
    data = request.json
    conn = get_db_connection()
    
    # Парсим URL для извлечения UTM-параметров
    url = data['url']
    base_url = url.split('?')[0] if '?' in url else url
    
    # Извлекаем UTM-параметры из URL
    utm_params = {}
    if '?' in url:
        params = url.split('?')[1]
        for param in params.split('&'):
            if '=' in param:
                key, value = param.split('=', 1)
                if key.startswith('utm_'):
                    utm_params[key] = value
    
    # Пытаемся вставить в новую таблицу
    try:
        conn.execute('''
            INSERT INTO history_new (user_email, base_url, full_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['user_email'],
            base_url,
            url,
            utm_params.get('utm_source'),
            utm_params.get('utm_medium'),
            utm_params.get('utm_campaign'),
            utm_params.get('utm_content'),
            utm_params.get('utm_term')
        ))
    except:
        # Fallback на старую таблицу
        conn.execute('INSERT INTO history (user_email, url) VALUES (?, ?)', (data['user_email'], url))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/history/<int:item_id>', methods=['DELETE'])
def delete_history(item_id):
    conn = get_db_connection()
    
    # Пытаемся удалить из новой таблицы
    try:
        conn.execute('DELETE FROM history_new WHERE id = ?', (item_id,))
    except:
        # Fallback на старую таблицу
        conn.execute('DELETE FROM history WHERE id = ?', (item_id,))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/history/<int:item_id>/short_url', methods=['PUT'])
def update_history_short_url(item_id):
    """Обновляет сокращённую ссылку для записи в истории."""
    data = request.json
    short_url = data.get('short_url')
    
    if not short_url:
        return jsonify({'success': False, 'error': 'short_url is required'}), 400
    
    conn = get_db_connection()
    try:
        conn.execute('UPDATE history_new SET short_url = ? WHERE id = ?', (short_url, item_id))
        conn.commit()
        return jsonify({'success': True, 'short_url': short_url})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()


# --- Шаблоны ---
@app.route('/templates', methods=['GET'])
def get_templates():
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify([])
    
    conn = get_db_connection()
    
    try:
        # Устанавливаем таймаут для запроса
        conn.execute('PRAGMA busy_timeout = 5000')  # 5 секунд
        
        templates = conn.execute('SELECT * FROM templates WHERE user_email = ? ORDER BY created_at DESC LIMIT 500',
                                 (user_email,)).fetchall()
        return jsonify([dict(row) for row in templates])
    except Exception as e:
        print(f"Ошибка при загрузке шаблонов: {e}")
        return jsonify([])
    finally:
        conn.close()


@app.route('/templates', methods=['POST'])
def add_template():
    data = request.json
    conn = get_db_connection()
    # Пакетный импорт или одиночное добавление
    items_to_add = data if isinstance(data, list) else [data]

    for item in items_to_add:
        conn.execute(
            'INSERT INTO templates (user_email, name, utm_source, utm_medium, utm_campaign, utm_content, utm_term, tag_name, tag_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                item['user_email'],
                item['name'],
                item.get('utm_source'),
                item.get('utm_medium'),
                item.get('utm_campaign'),
                item.get('utm_content'),
                item.get('utm_term'),
                item.get('tag_name'),
                item.get('tag_color')
            )
        )

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'imported_count': len(items_to_add)})


@app.route('/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM templates WHERE id = ?', (template_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/download_template/<path:filename>')
def download_template(filename):
    """Отдает файлы-шаблоны для импорта."""
    if filename not in ['templates_example.json', 'templates_example.csv']:
        return "File not found", 404
    
    response = send_from_directory(resource_path('.'), filename, as_attachment=True)
    # Добавляем заголовки для принудительного скачивания
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


@app.route('/download_template_with_folder', methods=['POST'])
def download_template_with_folder():
    """Скачивает пример шаблона с выбором папки."""
    data = request.json
    filename = data.get('filename')
    
    if filename not in ['templates_example.json', 'templates_example.csv']:
        return jsonify({'error': 'Invalid filename'}), 400
    
    source_file_path = resource_path(filename)
    
    if not os.path.exists(source_file_path):
        return jsonify({'error': 'File not found'}), 404
    
    # Открываем диалог выбора папки и сохраняем файл
    result = select_folder_and_save_file(source_file_path, filename)
    
    if result['success']:
        return jsonify({
            'success': True,
            'filename': result['filename'],
            'folder_path': result['folder_path'],
            'file_path': result['file_path']
        })
    else:
        return jsonify({
            'success': False,
            'error': result['error']
        }), 400


@app.route('/export_templates', methods=['POST'])
def export_templates():
    """Экспортирует шаблоны пользователя в файл."""
    data = request.json
    user_email = data.get('user_email')
    format_type = data.get('format', 'json')
    
    if not user_email:
        return jsonify({'error': 'user_email is required'}), 400
    
    conn = get_db_connection()
    templates = conn.execute('SELECT * FROM templates WHERE user_email = ? ORDER BY created_at DESC',
                             (user_email,)).fetchall()
    conn.close()
    
    # Преобразуем в список словарей
    templates_list = [dict(row) for row in templates]
    
    # Убираем служебные поля
    export_data = []
    for template in templates_list:
        export_template = {k: v for k, v in template.items() 
                         if k not in ['id', 'user_email', 'created_at']}
        export_data.append(export_template)
    
    # Создаем временный файл
    if format_type == 'json':
        filename = f'utm_templates_{user_email.replace("@", "_")}.json'
        temp_filepath = os.path.join(DOWNLOADS_DIR, filename)
        with open(temp_filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
    elif format_type == 'csv':
        filename = f'utm_templates_{user_email.replace("@", "_")}.csv'
        temp_filepath = os.path.join(DOWNLOADS_DIR, filename)
        import csv
        with open(temp_filepath, 'w', encoding='utf-8', newline='') as f:
            if export_data:
                writer = csv.DictWriter(f, fieldnames=export_data[0].keys())
                writer.writeheader()
                writer.writerows(export_data)
    else:
        return jsonify({'error': 'Invalid format'}), 400
    
    # Открываем диалог выбора папки и сохраняем файл
    result = select_folder_and_save_file(temp_filepath, filename)
    
    if result['success']:
        return jsonify({
            'success': True,
            'filename': result['filename'],
            'folder_path': result['folder_path'],
            'file_path': result['file_path'],
            'count': len(export_data)
        })
    else:
        return jsonify({
            'success': False,
            'error': result['error']
        }), 400


@app.route('/export_history', methods=['POST'])
def export_history():
    """Экспортирует историю пользователя в файл."""
    data = request.json
    user_email = data.get('user_email')
    format_type = data.get('format', 'json')
    
    if not user_email:
        return jsonify({'error': 'user_email is required'}), 400
    
    conn = get_db_connection()
    try:
        # Пытаемся получить из новой таблицы
        history = conn.execute('SELECT * FROM history_new WHERE user_email = ? ORDER BY created_at DESC',
                                 (user_email,)).fetchall()
    except:
        # Fallback на старую
        history = conn.execute('SELECT * FROM history WHERE user_email = ? ORDER BY created_at DESC',
                                 (user_email,)).fetchall()
    conn.close()
    
    # Преобразуем в список словарей
    history_list = [dict(row) for row in history]
    
    # Убираем служебные поля
    export_data = []
    for item in history_list:
        export_item = {k: v for k, v in item.items() 
                        if k not in ['id', 'user_email', 'created_at']}
        export_data.append(export_item)
    
    # Создаем временный файл
    if format_type == 'json':
        filename = f'utm_history_{user_email.replace("@", "_")}.json'
        temp_filepath = os.path.join(DOWNLOADS_DIR, filename)
        with open(temp_filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
    elif format_type == 'csv':
        filename = f'utm_history_{user_email.replace("@", "_")}.csv'
        temp_filepath = os.path.join(DOWNLOADS_DIR, filename)
        import csv
        with open(temp_filepath, 'w', encoding='utf-8', newline='') as f:
            if export_data:
                writer = csv.DictWriter(f, fieldnames=export_data[0].keys())
                writer.writeheader()
                writer.writerows(export_data)
    else:
        return jsonify({'error': 'Invalid format'}), 400
    
    # Открываем диалог выбора папки и сохраняем файл
    result = select_folder_and_save_file(temp_filepath, filename)
    
    if result['success']:
        return jsonify({
            'success': True,
            'filename': result['filename'],
            'folder_path': result['folder_path'],
            'file_path': result['file_path'],
            'count': len(export_data)
        })
    else:
        return jsonify({
            'success': False,
            'error': result['error']
        }), 400


@app.route('/import_history', methods=['POST'])
def import_history():
    """Импортирует историю пользователя из списка."""
    data = request.json
    conn = get_db_connection()
    items_to_add = data if isinstance(data, list) else [data]

    imported_count = 0
    for item in items_to_add:
        try:
            # Пытаемся вставить в новую таблицу
            conn.execute('''
                INSERT INTO history_new (user_email, base_url, full_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                item['user_email'],
                item.get('base_url', ''),
                item.get('full_url') or item.get('url', ''),
                item.get('utm_source'),
                item.get('utm_medium'),
                item.get('utm_campaign'),
                item.get('utm_content'),
                item.get('utm_term')
            ))
            imported_count += 1
        except Exception as e:
            print(f"Error importing history item: {e}")
            # Fallback на старую (если новая не работает по какой-то причине)
            try:
                conn.execute('INSERT INTO history (user_email, url) VALUES (?, ?)', 
                             (item['user_email'], item.get('full_url') or item.get('url', '')))
                imported_count += 1
            except:
                pass

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'imported_count': imported_count})


@app.route('/download_file/<path:filename>')
def download_file(filename):
    """Скачивает файл из папки downloads."""
    try:
        response = send_from_directory(DOWNLOADS_DIR, filename, as_attachment=True)
        # Добавляем заголовки для принудительного скачивания
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except FileNotFoundError:
        return "File not found", 404




# --- Запуск приложения ---
if __name__ == '__main__':
    import sys
    IS_HEADLESS = '--headless' in sys.argv
    
    init_db()  # Убедимся, что база данных и таблицы созданы
    
    if IS_HEADLESS:
        print("Запуск в режиме без GUI...")
        app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
        sys.exit(0)
    
    
    # Импортируем Qt компоненты
    from PyQt6.QtWidgets import QApplication, QMainWindow
    from PyQt6.QtWebEngineWidgets import QWebEngineView
    from PyQt6.QtCore import QUrl, Qt
    from PyQt6.QtGui import QIcon
    
    # Запускаем Flask в отдельном потоке
    import threading
    import time
    import requests
    
    def run_flask():
        try:
            app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
        except Exception as e:
            print(f"Ошибка запуска Flask: {e}")
    
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    
    # Ждем, пока Flask сервер запустится
    print("Запуск сервера...")
    max_attempts = 30
    server_ready = False
    for i in range(max_attempts):
        try:
            response = requests.get('http://127.0.0.1:5000', timeout=1)
            if response.status_code == 200:
                print("Сервер запущен успешно!")
                server_ready = True
                break
        except:
            pass
        time.sleep(0.1)
    
    if not server_ready:
        print("Не удалось запустить сервер!")
        sys.exit(1)
    
    # Создаем Qt приложение
    try:
        print("Создание Qt приложения...")
        qt_app = QApplication(sys.argv)
        qt_app.setApplicationName("UTMka")
        qt_app.setApplicationDisplayName("UTMka - сервис для бизнеса и маркетологов")
        
        # Пытаемся установить иконку
        try:
            icon_path = resource_path('logo/logoutm.ico')
            if os.path.exists(icon_path):
                qt_app.setWindowIcon(QIcon(icon_path))
        except:
            pass
        
        # Создаем главное окно
        main_window = QMainWindow()
        main_window.setWindowTitle("UTMka - сервис для бизнеса и маркетологов")
        main_window.resize(1200, 900)
        
        # Создаем WebEngineView для отображения HTML
        web_view = QWebEngineView()
        web_view.setUrl(QUrl("http://127.0.0.1:5000"))
        
        # Устанавливаем WebView как центральный виджет
        main_window.setCentralWidget(web_view)
        
        # Показываем окно на весь экран
        main_window.showMaximized()
        
        print("Запуск Qt приложения...")
        sys.exit(qt_app.exec())
        
    except Exception as e:
        print(f"Ошибка создания Qt приложения: {e}")
        print("---")
        print("КРИТИЧЕСКАЯ ОШИБКА: Не удалось запустить графический интерфейс (QtWebEngine).")
        print("Убедитесь, что установлен PyQt6 с поддержкой WebEngine:")
        print("  pip install PyQt6 PyQt6-WebEngine")
        print("---")
        input("Нажмите Enter для выхода...")
        sys.exit(1)

