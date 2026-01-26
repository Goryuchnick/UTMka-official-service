"""
Маршруты для работы с историей UTM-ссылок
"""
import os
import json
import sqlite3
import sys
from flask import Blueprint, request, jsonify, send_from_directory

from src.core.services import UTMService

history_bp = Blueprint('history', __name__)


def get_app_dir() -> str:
    """Получает директорию приложения для хранения данных"""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.abspath(".")


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


@history_bp.route('/history', methods=['GET'])
def get_history():
    """Получает историю пользователя."""
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify([])
    
    conn = get_db_connection()
    try:
        conn.execute('PRAGMA busy_timeout = 1000')
        conn.execute('PRAGMA synchronous = NORMAL')
        
        try:
            history_items = conn.execute(
                '''SELECT id, user_email, base_url, full_url, utm_source, utm_medium, 
                   utm_campaign, utm_content, utm_term, short_url, created_at 
                   FROM history_new WHERE user_email = ? ORDER BY created_at DESC LIMIT 500''',
                (user_email,)
            ).fetchall()
        except sqlite3.OperationalError:
            history_items = conn.execute(
                'SELECT id, user_email, url as full_url, created_at FROM history WHERE user_email = ? ORDER BY created_at DESC LIMIT 500',
                (user_email,)
            ).fetchall()
        
        result = [dict(row) for row in history_items]
        response = jsonify(result)
        response.headers['Cache-Control'] = 'no-cache'
        return response
    except Exception as e:
        print(f"Ошибка при загрузке истории: {e}")
        return jsonify([])
    finally:
        conn.close()


@history_bp.route('/history', methods=['POST'])
def add_history():
    """Добавляет запись в историю."""
    data = request.json
    conn = get_db_connection()
    
    url = data['url']
    base_url = UTMService.extract_base_url(url)
    utm_params = UTMService.parse_utm_params(url)
    
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
    except sqlite3.OperationalError:
        conn.execute('INSERT INTO history (user_email, url) VALUES (?, ?)', (data['user_email'], url))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@history_bp.route('/history/<int:item_id>', methods=['DELETE'])
def delete_history(item_id):
    """Удаляет запись из истории."""
    conn = get_db_connection()
    
    try:
        conn.execute('DELETE FROM history_new WHERE id = ?', (item_id,))
    except sqlite3.OperationalError:
        conn.execute('DELETE FROM history WHERE id = ?', (item_id,))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@history_bp.route('/history/<int:item_id>/short_url', methods=['PUT'])
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


@history_bp.route('/export_history', methods=['POST'])
def export_history():
    """Экспортирует историю пользователя в файл."""
    data = request.json
    user_email = data.get('user_email')
    format_type = data.get('format', 'json')
    
    if not user_email:
        return jsonify({'error': 'user_email is required'}), 400
    
    conn = get_db_connection()
    try:
        history = conn.execute(
            'SELECT * FROM history_new WHERE user_email = ? ORDER BY created_at DESC',
            (user_email,)
        ).fetchall()
    except sqlite3.OperationalError:
        history = conn.execute(
            'SELECT * FROM history WHERE user_email = ? ORDER BY created_at DESC',
            (user_email,)
        ).fetchall()
    conn.close()
    
    history_list = [dict(row) for row in history]
    export_data = []
    for item in history_list:
        export_item = {k: v for k, v in item.items() if k not in ['id', 'user_email', 'created_at']}
        export_data.append(export_item)
    
    downloads_dir = get_downloads_dir()
    
    if format_type == 'json':
        filename = f'utm_history_{user_email.replace("@", "_")}.json'
        filepath = os.path.join(downloads_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
    elif format_type == 'csv':
        import csv
        filename = f'utm_history_{user_email.replace("@", "_")}.csv'
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


@history_bp.route('/import_history', methods=['POST'])
def import_history():
    """Импортирует историю пользователя из списка."""
    data = request.json
    conn = get_db_connection()
    items_to_add = data if isinstance(data, list) else [data]

    imported_count = 0
    for item in items_to_add:
        try:
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
            try:
                conn.execute('INSERT INTO history (user_email, url) VALUES (?, ?)', 
                             (item['user_email'], item.get('full_url') or item.get('url', '')))
                imported_count += 1
            except Exception:
                pass

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'imported_count': imported_count})


@history_bp.route('/download_file/<path:filename>')
def download_file(filename):
    """Скачивает файл из папки downloads."""
    try:
        downloads_dir = get_downloads_dir()
        response = send_from_directory(downloads_dir, filename, as_attachment=True)
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except FileNotFoundError:
        return "File not found", 404
