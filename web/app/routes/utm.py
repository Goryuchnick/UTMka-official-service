"""
Роуты для работы с UTM (заглушки для тестирования фронтенда)
Будет полностью реализовано в итерации 8-9
"""
from flask import Blueprint, jsonify, request

utm_bp = Blueprint('utm', __name__, url_prefix='/api/v1')


@utm_bp.route('/history', methods=['GET'])
def get_history():
    """Заглушка получения истории"""
    return jsonify({
        'items': [],
        'pagination': {
            'page': 1,
            'per_page': 50,
            'total_items': 0,
            'total_pages': 0
        }
    }), 200


@utm_bp.route('/history', methods=['POST'])
def add_history():
    """Заглушка добавления в историю"""
    return jsonify({
        'success': True,
        'id': 1,
        'message': 'Запись добавлена в историю'
    }), 201


@utm_bp.route('/history/<int:item_id>', methods=['DELETE'])
def delete_history(item_id):
    """Заглушка удаления из истории"""
    return jsonify({'success': True, 'message': 'Запись удалена'}), 200


@utm_bp.route('/history/<int:item_id>/short_url', methods=['PUT'])
def update_history_short_url(item_id):
    """Заглушка обновления короткой ссылки"""
    return jsonify({'success': True, 'short_url': request.json.get('short_url')}), 200


@utm_bp.route('/templates', methods=['GET'])
def get_templates():
    """Заглушка получения шаблонов"""
    return jsonify({
        'items': [],
        'pagination': {
            'page': 1,
            'per_page': 50,
            'total_items': 0,
            'total_pages': 0
        }
    }), 200


@utm_bp.route('/templates', methods=['POST'])
def add_template():
    """Заглушка создания шаблона"""
    return jsonify({
        'success': True,
        'id': 1,
        'message': 'Шаблон создан'
    }), 201


@utm_bp.route('/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Заглушка удаления шаблона"""
    return jsonify({'success': True, 'message': 'Шаблон удалён'}), 200


@utm_bp.route('/subscription/status', methods=['GET'])
def get_subscription_status():
    """Заглушка получения статуса подписки"""
    return jsonify({
        'plan': 'free',
        'status': 'active',
        'is_active': False,
        'trial_used': False,
        'started_at': None,
        'expires_at': None,
        'auto_renew': False
    }), 200
