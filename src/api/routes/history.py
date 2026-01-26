"""
Маршруты для работы с историей UTM-ссылок
"""
import json
from flask import Blueprint, request, jsonify, send_from_directory

from src.core.models import db, History
from src.core.services import UTMService
from src.core.config import get_downloads_dir

history_bp = Blueprint('history', __name__)


@history_bp.route('/history', methods=['GET'])
def get_history():
    """Получает историю пользователя."""
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify([])
    
    items = History.query.filter_by(user_email=user_email)\
                         .order_by(History.created_at.desc())\
                         .limit(500).all()
    
    response = jsonify([item.to_dict() for item in items])
    response.headers['Cache-Control'] = 'no-cache'
    return response


@history_bp.route('/history', methods=['POST'])
def add_history():
    """Добавляет запись в историю."""
    data = request.json
    
    url = data['url']
    base_url = UTMService.extract_base_url(url)
    utm_params = UTMService.parse_utm_params(url)
    
    history = History(
        user_email=data['user_email'],
        base_url=base_url,
        full_url=url,
        utm_source=utm_params.get('utm_source'),
        utm_medium=utm_params.get('utm_medium'),
        utm_campaign=utm_params.get('utm_campaign'),
        utm_content=utm_params.get('utm_content'),
        utm_term=utm_params.get('utm_term')
    )
    
    db.session.add(history)
    db.session.commit()
    
    return jsonify({'success': True, 'id': history.id})


@history_bp.route('/history/<int:item_id>', methods=['DELETE'])
def delete_history(item_id):
    """Удаляет запись из истории."""
    history = History.query.get_or_404(item_id)
    db.session.delete(history)
    db.session.commit()
    return jsonify({'success': True})


@history_bp.route('/history/<int:item_id>/short_url', methods=['PUT'])
def update_history_short_url(item_id):
    """Обновляет сокращённую ссылку для записи в истории."""
    data = request.json
    short_url = data.get('short_url')
    
    if not short_url:
        return jsonify({'success': False, 'error': 'short_url is required'}), 400
    
    history = History.query.get_or_404(item_id)
    history.short_url = short_url
    db.session.commit()
    
    return jsonify({'success': True, 'short_url': short_url})


@history_bp.route('/export_history', methods=['POST'])
def export_history():
    """Экспортирует историю пользователя в файл."""
    data = request.json
    user_email = data.get('user_email')
    format_type = data.get('format', 'json')
    
    if not user_email:
        return jsonify({'error': 'user_email is required'}), 400
    
    items = History.query.filter_by(user_email=user_email)\
                         .order_by(History.created_at.desc()).all()
    
    export_data = []
    for item in items:
        d = item.to_dict()
        # Убираем служебные поля
        for key in ['id', 'user_email', 'created_at']:
            d.pop(key, None)
        export_data.append(d)
    
    downloads_dir = get_downloads_dir()
    
    if format_type == 'json':
        filename = f'utm_history_{user_email.replace("@", "_")}.json'
        filepath = downloads_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
    elif format_type == 'csv':
        import csv
        filename = f'utm_history_{user_email.replace("@", "_")}.csv'
        filepath = downloads_dir / filename
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
        'folder_path': str(downloads_dir),
        'file_path': str(filepath),
        'count': len(export_data)
    })


@history_bp.route('/import_history', methods=['POST'])
def import_history():
    """Импортирует историю пользователя из списка."""
    data = request.json
    items_to_add = data if isinstance(data, list) else [data]
    
    imported_count = 0
    for item in items_to_add:
        try:
            history = History(
                user_email=item['user_email'],
                base_url=item.get('base_url', ''),
                full_url=item.get('full_url') or item.get('url', ''),
                utm_source=item.get('utm_source'),
                utm_medium=item.get('utm_medium'),
                utm_campaign=item.get('utm_campaign'),
                utm_content=item.get('utm_content'),
                utm_term=item.get('utm_term')
            )
            db.session.add(history)
            imported_count += 1
        except Exception as e:
            print(f"Error importing history item: {e}")
    
    db.session.commit()
    return jsonify({'success': True, 'imported_count': imported_count})


@history_bp.route('/download_file/<path:filename>')
def download_file(filename):
    """Скачивает файл из папки downloads."""
    try:
        downloads_dir = get_downloads_dir()
        response = send_from_directory(str(downloads_dir), filename, as_attachment=True)
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response
    except FileNotFoundError:
        return "File not found", 404
