"""
API эндпоинты для автообновлений
"""
from flask import Blueprint, request, jsonify
from src.core import updater

update_bp = Blueprint('update', __name__, url_prefix='/api/update')


@update_bp.route('/check', methods=['GET'])
def check_updates():
    """
    Проверяет наличие обновлений на GitHub Releases.

    Returns:
        JSON: {
            available, current_version, latest_version,
            download_url, release_url, release_notes
        }
    """
    result = updater.check_for_updates()
    return jsonify(result)


@update_bp.route('/download', methods=['POST'])
def download_update():
    """
    Скачивает установщик обновления.

    Expects JSON: { "url": "download_url" }

    Returns:
        JSON: { success, installer_path } или { error }
    """
    try:
        data = request.get_json()
        download_url = data.get('url')

        if not download_url:
            return jsonify({'error': 'URL not provided'}), 400

        installer_path = updater.download_installer(download_url)

        return jsonify({
            'success': True,
            'installer_path': installer_path
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@update_bp.route('/install', methods=['POST'])
def install_update():
    """
    Запускает установщик и завершает приложение.

    Expects JSON: { "path": "installer_path" } или использует сохранённый путь

    Returns:
        JSON: { success } или { error }
    """
    try:
        data = request.get_json() or {}
        installer_path = data.get('path') or updater.get_installer_path()

        if not installer_path:
            return jsonify({'error': 'Installer path not found'}), 400

        # Запускаем установщик (эта функция вызовет sys.exit)
        updater.install_update(installer_path)

        # Этот return никогда не выполнится, так как sys.exit() выше
        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'error': str(e)}), 500
