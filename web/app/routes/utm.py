"""
Роуты для работы с UTM — история, шаблоны, подписки
Итерация 8: Полная реализация API
"""
import csv
import json
import io
from datetime import datetime
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from flask import Blueprint, jsonify, request, Response, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import Schema, fields, validate, ValidationError
from ..extensions import db
from ..models import History, Template, User, Subscription
from ..utils.decorators import subscription_required


utm_bp = Blueprint('utm', __name__, url_prefix='/api/v1')


# ============================================================
# Схемы валидации (Marshmallow)
# ============================================================

class HistoryCreateSchema(Schema):
    """Схема для создания записи в истории"""
    base_url = fields.Str(required=True, validate=validate.Length(min=1, max=2000))
    full_url = fields.Str(required=True, validate=validate.Length(min=1, max=4000))
    utm_source = fields.Str(validate=validate.Length(max=255), load_default=None)
    utm_medium = fields.Str(validate=validate.Length(max=255), load_default=None)
    utm_campaign = fields.Str(validate=validate.Length(max=255), load_default=None)
    utm_content = fields.Str(validate=validate.Length(max=255), load_default=None)
    utm_term = fields.Str(validate=validate.Length(max=255), load_default=None)
    short_url = fields.Str(validate=validate.Length(max=500), load_default=None)


class ShortUrlUpdateSchema(Schema):
    """Схема для обновления короткой ссылки"""
    short_url = fields.Str(required=True, validate=validate.Length(min=1, max=500))


class TemplateCreateSchema(Schema):
    """Схема для создания шаблона"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    utm_source = fields.Str(validate=validate.Length(max=255), load_default=None)
    utm_medium = fields.Str(validate=validate.Length(max=255), load_default=None)
    utm_campaign = fields.Str(validate=validate.Length(max=255), load_default=None)
    utm_content = fields.Str(validate=validate.Length(max=255), load_default=None)
    utm_term = fields.Str(validate=validate.Length(max=255), load_default=None)
    tag_name = fields.Str(validate=validate.Length(max=100), load_default=None)
    tag_color = fields.Str(validate=validate.Length(max=20), load_default=None)


class TemplateUpdateSchema(Schema):
    """Схема для обновления шаблона"""
    name = fields.Str(validate=validate.Length(min=1, max=255))
    utm_source = fields.Str(validate=validate.Length(max=255), allow_none=True)
    utm_medium = fields.Str(validate=validate.Length(max=255), allow_none=True)
    utm_campaign = fields.Str(validate=validate.Length(max=255), allow_none=True)
    utm_content = fields.Str(validate=validate.Length(max=255), allow_none=True)
    utm_term = fields.Str(validate=validate.Length(max=255), allow_none=True)
    tag_name = fields.Str(validate=validate.Length(max=100), allow_none=True)
    tag_color = fields.Str(validate=validate.Length(max=20), allow_none=True)


class TemplateImportSchema(Schema):
    """Схема для импорта шаблонов"""
    templates = fields.List(fields.Nested(TemplateCreateSchema), required=True)


class ExportSchema(Schema):
    """Схема для экспорта"""
    format = fields.Str(validate=validate.OneOf(['json', 'csv']), load_default='json')


# Экземпляры схем
history_create_schema = HistoryCreateSchema()
short_url_update_schema = ShortUrlUpdateSchema()
template_create_schema = TemplateCreateSchema()
template_update_schema = TemplateUpdateSchema()
template_import_schema = TemplateImportSchema()
export_schema = ExportSchema()


# ============================================================
# API История
# ============================================================

@utm_bp.route('/history', methods=['GET'])
@subscription_required
def get_history():
    """
    Получение истории UTM-меток пользователя.
    
    Query params:
        - page (int): номер страницы (default: 1)
        - per_page (int): записей на страницу (default: 50, max: 100)
        - search (str): поиск по URL или UTM параметрам
        - date_from (str): фильтр по дате начала (ISO 8601)
        - date_to (str): фильтр по дате окончания (ISO 8601)
    """
    user_id = get_jwt_identity()
    
    # Параметры пагинации
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 100)
    
    # Параметры фильтрации
    search = request.args.get('search', '').strip()
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    # Базовый запрос
    query = History.query.filter_by(user_id=user_id)
    
    # Поиск
    if search:
        search_filter = f'%{search}%'
        query = query.filter(
            db.or_(
                History.base_url.ilike(search_filter),
                History.full_url.ilike(search_filter),
                History.utm_source.ilike(search_filter),
                History.utm_medium.ilike(search_filter),
                History.utm_campaign.ilike(search_filter),
                History.utm_content.ilike(search_filter),
                History.utm_term.ilike(search_filter)
            )
        )
    
    # Фильтр по датам
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.filter(History.created_at >= date_from_dt)
        except ValueError:
            pass
    
    if date_to:
        try:
            date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query = query.filter(History.created_at <= date_to_dt)
        except ValueError:
            pass
    
    # Сортировка и пагинация
    query = query.order_by(History.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'items': [item.to_dict() for item in pagination.items],
        'pagination': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total_items': pagination.total,
            'total_pages': pagination.pages
        }
    }), 200


@utm_bp.route('/history', methods=['POST'])
@subscription_required
def add_history():
    """
    Добавление записи в историю.
    
    Request body:
        - base_url (str): базовый URL
        - full_url (str): полный URL с UTM-метками
        - utm_source, utm_medium, utm_campaign, utm_content, utm_term (str, optional)
        - short_url (str, optional): сокращённая ссылка
    """
    user_id = get_jwt_identity()
    
    try:
        data = history_create_schema.load(request.json or {})
    except ValidationError as err:
        return jsonify({
            'error': 'Validation error',
            'message': 'Неверные данные',
            'errors': err.messages
        }), 400
    
    # Создаём запись
    history_item = History(
        user_id=user_id,
        base_url=data['base_url'],
        full_url=data['full_url'],
        utm_source=data.get('utm_source'),
        utm_medium=data.get('utm_medium'),
        utm_campaign=data.get('utm_campaign'),
        utm_content=data.get('utm_content'),
        utm_term=data.get('utm_term'),
        short_url=data.get('short_url')
    )
    
    try:
        db.session.add(history_item)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'id': history_item.id,
            'message': 'Запись добавлена в историю',
            'item': history_item.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error adding history: {e}')
        return jsonify({
            'error': 'Database error',
            'message': 'Ошибка при сохранении записи'
        }), 500


@utm_bp.route('/history/<int:item_id>', methods=['DELETE'])
@subscription_required
def delete_history(item_id):
    """Удаление записи из истории"""
    user_id = get_jwt_identity()
    
    history_item = History.query.filter_by(id=item_id, user_id=user_id).first()
    
    if not history_item:
        return jsonify({
            'error': 'Not found',
            'message': 'Запись не найдена'
        }), 404
    
    try:
        db.session.delete(history_item)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Запись удалена'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error deleting history: {e}')
        return jsonify({
            'error': 'Database error',
            'message': 'Ошибка при удалении записи'
        }), 500


@utm_bp.route('/history/<int:item_id>/short_url', methods=['PUT'])
@subscription_required
def update_history_short_url(item_id):
    """Обновление короткой ссылки для записи"""
    user_id = get_jwt_identity()
    
    try:
        data = short_url_update_schema.load(request.json or {})
    except ValidationError as err:
        return jsonify({
            'error': 'Validation error',
            'message': 'Неверные данные',
            'errors': err.messages
        }), 400
    
    history_item = History.query.filter_by(id=item_id, user_id=user_id).first()
    
    if not history_item:
        return jsonify({
            'error': 'Not found',
            'message': 'Запись не найдена'
        }), 404
    
    try:
        history_item.short_url = data['short_url']
        db.session.commit()
        
        return jsonify({
            'success': True,
            'short_url': history_item.short_url
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error updating short_url: {e}')
        return jsonify({
            'error': 'Database error',
            'message': 'Ошибка при обновлении записи'
        }), 500


@utm_bp.route('/history/export', methods=['POST'])
@subscription_required
def export_history():
    """
    Экспорт истории в файл.
    
    Request body:
        - format (str): 'json' или 'csv' (default: 'json')
    """
    user_id = get_jwt_identity()
    
    try:
        data = export_schema.load(request.json or {})
    except ValidationError as err:
        return jsonify({
            'error': 'Validation error',
            'errors': err.messages
        }), 400
    
    export_format = data.get('format', 'json')
    
    # Получаем всю историю пользователя
    history_items = History.query.filter_by(user_id=user_id).order_by(History.created_at.desc()).all()
    
    if export_format == 'csv':
        # Экспорт в CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Заголовки
        writer.writerow(['id', 'base_url', 'full_url', 'utm_source', 'utm_medium', 
                        'utm_campaign', 'utm_content', 'utm_term', 'short_url', 'created_at'])
        
        # Данные
        for item in history_items:
            writer.writerow([
                item.id, item.base_url, item.full_url, item.utm_source or '',
                item.utm_medium or '', item.utm_campaign or '', item.utm_content or '',
                item.utm_term or '', item.short_url or '',
                item.created_at.isoformat() if item.created_at else ''
            ])
        
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=history_export_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv'}
        )
    else:
        # Экспорт в JSON
        export_data = {
            'exported_at': datetime.utcnow().isoformat(),
            'total_items': len(history_items),
            'items': [item.to_dict() for item in history_items]
        }
        
        return Response(
            json.dumps(export_data, ensure_ascii=False, indent=2),
            mimetype='application/json',
            headers={'Content-Disposition': f'attachment; filename=history_export_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json'}
        )


@utm_bp.route('/history/clear', methods=['DELETE'])
@subscription_required
def clear_history():
    """Очистка всей истории пользователя"""
    user_id = get_jwt_identity()
    
    try:
        deleted_count = History.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Удалено записей: {deleted_count}',
            'deleted_count': deleted_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error clearing history: {e}')
        return jsonify({
            'error': 'Database error',
            'message': 'Ошибка при очистке истории'
        }), 500


# ============================================================
# API Шаблоны
# ============================================================

@utm_bp.route('/templates', methods=['GET'])
@subscription_required
def get_templates():
    """
    Получение шаблонов пользователя.
    
    Query params:
        - page (int): номер страницы (default: 1)
        - per_page (int): записей на страницу (default: 50, max: 100)
        - search (str): поиск по имени шаблона
        - tag (str): фильтр по тегу
    """
    user_id = get_jwt_identity()
    
    # Параметры пагинации
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 100)
    
    # Параметры фильтрации
    search = request.args.get('search', '').strip()
    tag = request.args.get('tag', '').strip()
    
    # Базовый запрос
    query = Template.query.filter_by(user_id=user_id)
    
    # Поиск
    if search:
        search_filter = f'%{search}%'
        query = query.filter(
            db.or_(
                Template.name.ilike(search_filter),
                Template.utm_source.ilike(search_filter),
                Template.utm_medium.ilike(search_filter),
                Template.utm_campaign.ilike(search_filter)
            )
        )
    
    # Фильтр по тегу
    if tag:
        query = query.filter(Template.tag_name == tag)
    
    # Сортировка и пагинация
    query = query.order_by(Template.updated_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # Получаем уникальные теги для фронтенда
    tags_query = db.session.query(Template.tag_name, Template.tag_color)\
        .filter(Template.user_id == user_id)\
        .filter(Template.tag_name.isnot(None))\
        .distinct().all()
    
    tags = [{'name': t[0], 'color': t[1]} for t in tags_query if t[0]]
    
    return jsonify({
        'items': [item.to_dict() for item in pagination.items],
        'pagination': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total_items': pagination.total,
            'total_pages': pagination.pages
        },
        'tags': tags
    }), 200


@utm_bp.route('/templates', methods=['POST'])
@subscription_required
def add_template():
    """
    Создание шаблона.
    
    Request body:
        - name (str, required): название шаблона
        - utm_source, utm_medium, utm_campaign, utm_content, utm_term (str, optional)
        - tag_name, tag_color (str, optional)
    """
    user_id = get_jwt_identity()
    
    try:
        data = template_create_schema.load(request.json or {})
    except ValidationError as err:
        return jsonify({
            'error': 'Validation error',
            'message': 'Неверные данные',
            'errors': err.messages
        }), 400
    
    # Создаём шаблон
    template = Template(
        user_id=user_id,
        name=data['name'],
        utm_source=data.get('utm_source'),
        utm_medium=data.get('utm_medium'),
        utm_campaign=data.get('utm_campaign'),
        utm_content=data.get('utm_content'),
        utm_term=data.get('utm_term'),
        tag_name=data.get('tag_name'),
        tag_color=data.get('tag_color')
    )
    
    try:
        db.session.add(template)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'id': template.id,
            'message': 'Шаблон создан',
            'item': template.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error creating template: {e}')
        return jsonify({
            'error': 'Database error',
            'message': 'Ошибка при создании шаблона'
        }), 500


@utm_bp.route('/templates/<int:template_id>', methods=['PUT'])
@subscription_required
def update_template(template_id):
    """Обновление шаблона"""
    user_id = get_jwt_identity()
    
    try:
        data = template_update_schema.load(request.json or {})
    except ValidationError as err:
        return jsonify({
            'error': 'Validation error',
            'message': 'Неверные данные',
            'errors': err.messages
        }), 400
    
    template = Template.query.filter_by(id=template_id, user_id=user_id).first()
    
    if not template:
        return jsonify({
            'error': 'Not found',
            'message': 'Шаблон не найден'
        }), 404
    
    try:
        # Обновляем только переданные поля
        for field in ['name', 'utm_source', 'utm_medium', 'utm_campaign', 
                      'utm_content', 'utm_term', 'tag_name', 'tag_color']:
            if field in data:
                setattr(template, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Шаблон обновлён',
            'item': template.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error updating template: {e}')
        return jsonify({
            'error': 'Database error',
            'message': 'Ошибка при обновлении шаблона'
        }), 500


@utm_bp.route('/templates/<int:template_id>', methods=['DELETE'])
@subscription_required
def delete_template(template_id):
    """Удаление шаблона"""
    user_id = get_jwt_identity()
    
    template = Template.query.filter_by(id=template_id, user_id=user_id).first()
    
    if not template:
        return jsonify({
            'error': 'Not found',
            'message': 'Шаблон не найден'
        }), 404
    
    try:
        db.session.delete(template)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Шаблон удалён'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error deleting template: {e}')
        return jsonify({
            'error': 'Database error',
            'message': 'Ошибка при удалении шаблона'
        }), 500


@utm_bp.route('/templates/import', methods=['POST'])
@subscription_required
def import_templates():
    """
    Импорт шаблонов из JSON.
    
    Request body:
        - templates (array): массив шаблонов для импорта
    """
    user_id = get_jwt_identity()
    
    try:
        data = template_import_schema.load(request.json or {})
    except ValidationError as err:
        return jsonify({
            'error': 'Validation error',
            'message': 'Неверные данные',
            'errors': err.messages
        }), 400
    
    templates_data = data.get('templates', [])
    
    if not templates_data:
        return jsonify({
            'error': 'Validation error',
            'message': 'Список шаблонов пуст'
        }), 400
    
    imported_count = 0
    errors = []
    
    try:
        for idx, tpl_data in enumerate(templates_data):
            try:
                template = Template(
                    user_id=user_id,
                    name=tpl_data['name'],
                    utm_source=tpl_data.get('utm_source'),
                    utm_medium=tpl_data.get('utm_medium'),
                    utm_campaign=tpl_data.get('utm_campaign'),
                    utm_content=tpl_data.get('utm_content'),
                    utm_term=tpl_data.get('utm_term'),
                    tag_name=tpl_data.get('tag_name'),
                    tag_color=tpl_data.get('tag_color')
                )
                db.session.add(template)
                imported_count += 1
            except Exception as e:
                errors.append(f'Шаблон #{idx + 1}: {str(e)}')
        
        db.session.commit()
        
        result = {
            'success': True,
            'imported_count': imported_count,
            'message': f'Импортировано шаблонов: {imported_count}'
        }
        
        if errors:
            result['errors'] = errors
        
        return jsonify(result), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error importing templates: {e}')
        return jsonify({
            'error': 'Database error',
            'message': 'Ошибка при импорте шаблонов'
        }), 500


@utm_bp.route('/templates/export', methods=['POST'])
@subscription_required
def export_templates():
    """
    Экспорт шаблонов в файл.
    
    Request body:
        - format (str): 'json' или 'csv' (default: 'json')
    """
    user_id = get_jwt_identity()
    
    try:
        data = export_schema.load(request.json or {})
    except ValidationError as err:
        return jsonify({
            'error': 'Validation error',
            'errors': err.messages
        }), 400
    
    export_format = data.get('format', 'json')
    
    # Получаем все шаблоны пользователя
    templates = Template.query.filter_by(user_id=user_id).order_by(Template.name).all()
    
    if export_format == 'csv':
        # Экспорт в CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Заголовки
        writer.writerow(['id', 'name', 'utm_source', 'utm_medium', 'utm_campaign',
                        'utm_content', 'utm_term', 'tag_name', 'tag_color', 'created_at'])
        
        # Данные
        for tpl in templates:
            writer.writerow([
                tpl.id, tpl.name, tpl.utm_source or '', tpl.utm_medium or '',
                tpl.utm_campaign or '', tpl.utm_content or '', tpl.utm_term or '',
                tpl.tag_name or '', tpl.tag_color or '',
                tpl.created_at.isoformat() if tpl.created_at else ''
            ])
        
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=templates_export_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv'}
        )
    else:
        # Экспорт в JSON (без user_id и id для переносимости)
        export_data = {
            'exported_at': datetime.utcnow().isoformat(),
            'total_items': len(templates),
            'templates': [{
                'name': tpl.name,
                'utm_source': tpl.utm_source,
                'utm_medium': tpl.utm_medium,
                'utm_campaign': tpl.utm_campaign,
                'utm_content': tpl.utm_content,
                'utm_term': tpl.utm_term,
                'tag_name': tpl.tag_name,
                'tag_color': tpl.tag_color
            } for tpl in templates]
        }
        
        return Response(
            json.dumps(export_data, ensure_ascii=False, indent=2),
            mimetype='application/json',
            headers={'Content-Disposition': f'attachment; filename=templates_export_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json'}
        )


# ============================================================
# API Подписка
# ============================================================

@utm_bp.route('/subscription/status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    """Получение статуса подписки текущего пользователя"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({
            'error': 'User not found',
            'message': 'Пользователь не найден'
        }), 404
    
    subscription = user.subscription
    
    if not subscription:
        return jsonify({
            'plan': 'free',
            'status': 'active',
            'is_active': False,
            'trial_used': False,
            'started_at': None,
            'expires_at': None,
            'auto_renew': False,
            'features': {
                'history': False,
                'templates': False,
                'export': False
            }
        }), 200
    
    # Определяем доступные функции
    is_active = subscription.is_active()
    features = {
        'history': is_active,
        'templates': is_active,
        'export': is_active,
        'max_history_items': -1 if is_active else 0,
        'max_templates': -1 if is_active else 0
    }
    
    return jsonify({
        **subscription.to_dict(),
        'features': features
    }), 200


@utm_bp.route('/subscription/plans', methods=['GET'])
def get_subscription_plans():
    """Получение списка доступных тарифов"""
    plans = [
        {
            'id': 'free',
            'name': 'Бесплатный',
            'price': 0,
            'currency': 'RUB',
            'period': None,
            'features': {
                'utm_generator': True,
                'qr_generator': True,
                'url_shortener': True,
                'history': False,
                'templates': False,
                'export': False
            },
            'description': 'Генератор UTM-меток без сохранения истории'
        },
        {
            'id': 'trial',
            'name': 'Пробный период',
            'price': 0,
            'currency': 'RUB',
            'period': '7 дней',
            'features': {
                'utm_generator': True,
                'qr_generator': True,
                'url_shortener': True,
                'history': True,
                'templates': True,
                'export': True
            },
            'description': 'Полный доступ на 7 дней'
        },
        {
            'id': 'pro_monthly',
            'name': 'Pro (месяц)',
            'price': 149,
            'currency': 'RUB',
            'period': 'месяц',
            'features': {
                'utm_generator': True,
                'qr_generator': True,
                'url_shortener': True,
                'history': True,
                'templates': True,
                'export': True
            },
            'description': 'Полный доступ на месяц'
        },
        {
            'id': 'pro_yearly',
            'name': 'Pro (год)',
            'price': 999,
            'currency': 'RUB',
            'period': 'год',
            'discount': '44%',
            'features': {
                'utm_generator': True,
                'qr_generator': True,
                'url_shortener': True,
                'history': True,
                'templates': True,
                'export': True
            },
            'description': 'Полный доступ на год со скидкой'
        }
    ]
    
    return jsonify({'plans': plans}), 200


@utm_bp.route('/subscription/activate-trial', methods=['POST'])
@jwt_required()
def activate_trial():
    """Активация пробного периода"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({
            'error': 'User not found',
            'message': 'Пользователь не найден'
        }), 404
    
    subscription = user.subscription
    
    # Создаём подписку, если её нет
    if not subscription:
        subscription = Subscription(user_id=user_id, plan='free')
        db.session.add(subscription)
    
    # Проверяем, был ли уже использован trial
    if subscription.trial_used:
        return jsonify({
            'error': 'Trial already used',
            'message': 'Пробный период уже был использован'
        }), 400
    
    try:
        subscription.activate_trial(days=7)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Пробный период активирован на 7 дней',
            'expires_at': subscription.expires_at.isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error activating trial: {e}')
        return jsonify({
            'error': 'Database error',
            'message': 'Ошибка при активации пробного периода'
        }), 500


@utm_bp.route('/subscription/cancel', methods=['POST'])
@jwt_required()
def cancel_subscription():
    """Отмена автопродления подписки"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({
            'error': 'User not found',
            'message': 'Пользователь не найден'
        }), 404
    
    subscription = user.subscription
    
    if not subscription or subscription.plan == 'free':
        return jsonify({
            'error': 'No subscription',
            'message': 'У вас нет активной подписки'
        }), 400
    
    try:
        subscription.cancel()
        db.session.commit()
        
        expires_msg = ''
        if subscription.expires_at:
            expires_msg = f'. Подписка активна до {subscription.expires_at.strftime("%d.%m.%Y")}'
        
        return jsonify({
            'success': True,
            'message': f'Автопродление отменено{expires_msg}'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error cancelling subscription: {e}')
        return jsonify({
            'error': 'Database error',
            'message': 'Ошибка при отмене подписки'
        }), 500
