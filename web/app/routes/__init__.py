"""
Регистрация всех blueprints
"""
from flask import Flask


def register_blueprints(app: Flask):
    """
    Регистрирует все blueprints в приложении.
    
    Args:
        app: Flask приложение
    """
    # Импортируем blueprints
    from .main import main_bp
    from .auth import auth_bp  # Заглушки для тестирования
    from .utm import utm_bp  # Заглушки для тестирования
    # from .payment import payment_bp  # Будет в итерации 12
    
    # Регистрируем blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(utm_bp)
    # app.register_blueprint(payment_bp, url_prefix='/api/v1')
    
    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'healthy'}
