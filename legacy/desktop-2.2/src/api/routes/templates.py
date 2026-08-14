"""
Маршруты для работы с шаблонами UTM
"""
import json
from flask import Blueprint, request, jsonify, send_from_directory

from src.core.models import db, Template
from src.core.config import get_resource_path

templates_bp = Blueprint('templates', __name__)


@templates_bp.route('/templates', methods=['GET'])
def get_templates():
    """Получает шаблоны пользователя."""
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify([])
    
    items = Template.query.filter_by(user_email=user_email)\
                          .order_by(Template.created_at.desc())\
                          .limit(500).all()
    
    response = jsonify([item.to_dict() for item in items])
    response.headers['Cache-Control'] = 'no-cache'
    return response


@templates_bp.route('/templates', methods=['POST'])
def add_template():
    """Добавляет шаблон."""
    data = request.json
    items_to_add = data if isinstance(data, list) else [data]
    
    for item in items_to_add:
        template = Template(
            user_email=item['user_email'],
            name=item['name'],
            utm_source=item.get('utm_source'),
            utm_medium=item.get('utm_medium'),
            utm_campaign=item.get('utm_campaign'),
            utm_content=item.get('utm_content'),
            utm_term=item.get('utm_term'),
            tag_name=item.get('tag_name'),
            tag_color=item.get('tag_color')
        )
        db.session.add(template)
    
    db.session.commit()
    return jsonify({'success': True, 'imported_count': len(items_to_add)})


@templates_bp.route('/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Удаляет шаблон."""
    template = Template.query.get_or_404(template_id)
    db.session.delete(template)
    db.session.commit()
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
    
    resource_dir = get_resource_path('.')
    response = send_from_directory(str(resource_dir), filename, as_attachment=True)
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response


@templates_bp.route('/download_template_with_folder', methods=['POST'])
def download_template_with_folder():
    """Скачивает пример шаблона."""
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
    
    source_path = get_resource_path(filename)

    if not source_path.exists():
        return jsonify({'error': 'File not found'}), 404

    with open(source_path, 'r', encoding='utf-8') as f:
        file_content = f.read()

    return jsonify({
        'success': True,
        'filename': filename,
        'file_content': file_content
    })


@templates_bp.route('/export_templates', methods=['POST'])
def export_templates():
    """Экспортирует шаблоны пользователя в файл."""
    data = request.json
    user_email = data.get('user_email')
    format_type = data.get('format', 'json')
    
    if not user_email:
        return jsonify({'error': 'user_email is required'}), 400
    
    items = Template.query.filter_by(user_email=user_email)\
                          .order_by(Template.created_at.desc()).all()
    
    export_data = []
    for item in items:
        d = item.to_dict()
        for key in ['id', 'user_email', 'created_at']:
            d.pop(key, None)
        export_data.append(d)
    
    if format_type == 'json':
        filename = f'utm_templates_{user_email.replace("@", "_")}.json'
        file_content = json.dumps(export_data, ensure_ascii=False, indent=2)
    elif format_type == 'csv':
        import csv
        import io
        filename = f'utm_templates_{user_email.replace("@", "_")}.csv'
        output = io.StringIO()
        if export_data:
            writer = csv.DictWriter(output, fieldnames=export_data[0].keys())
            writer.writeheader()
            writer.writerows(export_data)
        file_content = output.getvalue()
    else:
        return jsonify({'error': 'Invalid format'}), 400

    return jsonify({
        'success': True,
        'filename': filename,
        'file_content': file_content,
        'count': len(export_data)
    })
