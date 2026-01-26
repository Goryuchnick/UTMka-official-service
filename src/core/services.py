"""
Бизнес-логика UTM сервиса
"""
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from typing import Dict, Optional


class UTMService:
    """Сервис для работы с UTM-параметрами"""
    
    @staticmethod
    def parse_utm_params(url: str) -> Dict[str, Optional[str]]:
        """
        Извлекает UTM-параметры из URL
        
        Args:
            url: URL для парсинга
            
        Returns:
            Словарь с UTM-параметрами
        """
        try:
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            
            return {
                'utm_source': params.get('utm_source', [None])[0],
                'utm_medium': params.get('utm_medium', [None])[0],
                'utm_campaign': params.get('utm_campaign', [None])[0],
                'utm_content': params.get('utm_content', [None])[0],
                'utm_term': params.get('utm_term', [None])[0],
            }
        except Exception:
            return {
                'utm_source': None,
                'utm_medium': None,
                'utm_campaign': None,
                'utm_content': None,
                'utm_term': None,
            }
    
    @staticmethod
    def build_utm_url(base_url: str, utm_params: Dict[str, Optional[str]]) -> str:
        """
        Строит URL с UTM-параметрами
        
        Args:
            base_url: Базовый URL
            utm_params: Словарь с UTM-параметрами
            
        Returns:
            URL с добавленными UTM-параметрами
        """
        try:
            # Убеждаемся, что URL имеет схему
            if not base_url.startswith(('http://', 'https://')):
                base_url = f'https://{base_url}'
            
            parsed = urlparse(base_url)
            existing_params = parse_qs(parsed.query)
            
            # Добавляем только непустые UTM-параметры
            for key, value in utm_params.items():
                if value and value.strip():
                    existing_params[key] = [value.strip()]
            
            # Строим новый query string
            new_query = urlencode(existing_params, doseq=True)
            
            # Собираем URL обратно
            new_parsed = parsed._replace(query=new_query)
            return urlunparse(new_parsed)
        except Exception:
            return base_url
    
    @staticmethod
    def extract_base_url(url: str) -> str:
        """
        Извлекает базовый URL без параметров
        
        Args:
            url: Полный URL
            
        Returns:
            Базовый URL без query параметров
        """
        try:
            if not url.startswith(('http://', 'https://')):
                url = f'https://{url}'
            
            parsed = urlparse(url)
            return urlunparse((parsed.scheme, parsed.netloc, parsed.path, '', '', ''))
        except Exception:
            return url.split('?')[0] if '?' in url else url
