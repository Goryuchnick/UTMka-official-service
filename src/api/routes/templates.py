"""
Маршруты для работы с шаблонами UTM
"""
import os
import json
import sqlite3
import sys
import shutil
from flask import Blueprint, request, jsonify, send_from_directory

templates_bp = Blueprint('templates', __name__)


def get_app_dir() -> str:
    """Получает директорию приложения для хранения данных"""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.abspath(".")


def resource_path(relative_path: str) -> str:
    """Путь к ресурсам (работает и в dev, и в PyInstaller)"""
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)


def get_db_connection():
    """Создает соединение с базой данных."""
    db_path = os.path.join(get_app_dir(), 'utm_data.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def get_downloads_dir() -> str:
    """Получает папку для загрузок"""
    downloads_dir = os.path.join(get_app_dir(), 'downloads')
    os.makedirs(downloads_dir, exist_ok=True)
    return downloads_dir


@templates_bp.route('/templates', methods=['GET'])
def get_templates():
    """Получает шаблоны пользователя."""
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify([])
    
    conn = get_db_connection()
    try:
        conn.execute('PRAGMA busy_timeout = 1000')
        conn.execute('PRAGMA synchronous = NORMAL')
        
        templates = conn.execute(
            '''SELECT id, user_email, name, utm_source, utm_medium, utm_campaign, 
               utm_content, utm_term, tag_name, tag_color, created_at 
               FROM templates WHERE user_email = ? ORDER BY created_at DESC LIMIT 500''',
            (user_email,)
        ).fetchall()
        result = [dict(row) for row in templates]
        response = jsonify(result)
        response.headers['Cache-Control'] = 'no-cache'
        return response
    except Exception as e:
        print(f"Ошибка при загрузке шаблонов: {e}")
        return jsonify([])
    finally:
        conn.close()


@templates_bp.route('/templates', methods=['POST'])
def add_template():
    """Добавляет шаблон."""
    data = request.json
    conn = get_db_connection()
    items_to_add = data if isinstance(data, list) else [data]

    for item in items_to_add:
        conn.execute(
            '''INSERT INTO templates (user_email, name, utm_source, utm_medium, 
               utm_campaign, utm_content, utm_term, tag_name, tag_color) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
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


@templates_bp.route('/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Удаляет шаблон."""
    conn = get_db_connection()
    conn.execute('DELETE FROM templates WHERE id = ?', (template_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@templates_bp.route('/download_template/<path:filename>')
def download_template(filename):
    """Отдает файлы-шаблоны для импорта."""
    allowed_templates = [
        'templates_example.json',
        'templates_example.csv',
        'templates_example_ru.json',
        'templates_example_en.json'
    ]
    if filename not in allowed_templates:
        return "File not found", 404
    
    response = send_from_directory(resource_path('.'), filename, as_attachment=True)
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


@templates_bp.route('/download_template_with_folder', methods=['POST'])
def download_template_with_folder():
    """Скачивает пример шаблона с выбором папки."""
    data = request.json
    filename = data.get('filename')
    
    allowed_templates = [
        'templates_example.json',
        'templates_example.csv',
        'templates_example_ru.json',
        'templates_example_en.json'
    ]
    if filename not in allowed_templates:
        return jsonify({'error': 'Invalid filename'}), 400
    
    source_file_path = resource_path(filename)
    
    if not os.path.exists(source_file_path):
        return jsonify({'error': 'File not found'}), 404
    
    # В headless режиме сохраняем в папку downloads
    downloads_dir = get_downloads_dir()
    destination_path = os.path.join(downloads_dir, filename)
    
    if os.path.abspath(source_file_path) != os.path.abspath(destination_path):
        shutil.copy2(source_file_path, destination_path)
    
    return jsonify({
        'success': True,
        'filename': filename,
        'folder_path': downloads_dir,
        'file_path': destination_path
    })


@templates_bp.route('/export_templates', methods=['POST'])
def export_templates():
    """Экспортирует шаблоны пользователя в файл."""
    data = request.json
    user_email = data.get('user_email')
    format_type = data.get('format', 'json')
    
    if not user_email:
        return jsonify({'error': 'user_email is required'}), 400
    
    conn = get_db_connection()
    templates = conn.execute(
        'SELECT * FROM templates WHERE user_email = ? ORDER BY created_at DESC',
        (user_email,)
    ).fetchall()
    conn.close()
    
    templates_list = [dict(row) for row in templates]
    export_data = []
    for template in templates_list:
        export_template = {k: v for k, v in template.items() if k not in ['id', 'user_email', 'created_at']}
        export_data.append(export_template)
    
    downloads_dir = get_downloads_dir()
    
    if format_type == 'json':
        filename = f'utm_templates_{user_email.replace("@", "_")}.json'
        filepath = os.path.join(downloads_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
    elif format_type == 'csv':
        import csv
        filename = f'utm_templates_{user_email.replace("@", "_")}.csv'
        filepath = os.path.join(downloads_dir, filename)
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            if export_data:
                writer = csv.DictWriter(f, fieldnames=export_data[0].keys())
                writer.writeheader()
                writer.writerows(export_data)
    else:
        return jsonify({'error': 'Invalid format'}), 400
    
    return jsonify({
        'success': True,
        'filename': filename,
        'folder_path': downloads_dir,
        'file_path': filepath,
        'count': len(export_data)
    })
