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
    # Импортируем blueprints (пока заглушки, будут созданы в следующих итерациях)
    # from .auth import auth_bp
    # from .utm import utm_bp
    # from .payment import payment_bp
    # from .main import main_bp
    
    # Регистрируем blueprints
    # app.register_blueprint(auth_bp, url_prefix='/auth')
    # app.register_blueprint(utm_bp, url_prefix='/api')
    # app.register_blueprint(payment_bp, url_prefix='/api')
    # app.register_blueprint(main_bp)
    
    # Временный роут для проверки работы
    @app.route('/')
    def index():
        return {'message': 'UTMka Web Service API', 'status': 'ok', 'version': '1.0.0'}
    
    @app.route('/health')
    def health():
        return {'status': 'healthy'}
