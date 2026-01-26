"""
API Routes
"""
from .main import main_bp
from .history import history_bp
from .templates import templates_bp

__all__ = ['main_bp', 'history_bp', 'templates_bp']