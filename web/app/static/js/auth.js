/**
 * Модуль авторизации и работы с API
 */

// Конфигурация API
const API_BASE_URL = '/api/v1';
const AUTH_BASE_URL = '/auth';

// Утилиты для работы с токенами
const AuthUtils = {
    getAccessToken() {
        return localStorage.getItem('access_token');
    },
    
    getRefreshToken() {
        return localStorage.getItem('refresh_token');
    },
    
    setTokens(accessToken, refreshToken) {
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
    },
    
    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
    },
    
    getUserData() {
        const data = localStorage.getItem('user_data');
        return data ? JSON.parse(data) : null;
    },
    
    setUserData(userData) {
        localStorage.setItem('user_data', JSON.stringify(userData));
    },
    
    isAuthenticated() {
        return !!this.getAccessToken();
    }
};

// API клиент с автоматической обработкой токенов
const API = {
    async request(url, options = {}) {
        const token = AuthUtils.getAccessToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        // Если токен истёк, пытаемся обновить
        if (response.status === 401 && token) {
            const refreshed = await this.refreshToken();
            if (refreshed) {
                // Повторяем запрос с новым токеном
                headers['Authorization'] = `Bearer ${AuthUtils.getAccessToken()}`;
                return fetch(url, { ...options, headers });
            } else {
                // Не удалось обновить - разлогиниваем
                AuthUtils.clearTokens();
                window.location.reload();
                throw new Error('Session expired');
            }
        }
        
        return response;
    },
    
    async refreshToken() {
        const refreshToken = AuthUtils.getRefreshToken();
        if (!refreshToken) return false;
        
        try {
            const response = await fetch(`${AUTH_BASE_URL}/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });
            
            if (response.ok) {
                const data = await response.json();
                AuthUtils.setTokens(data.access_token, null);
                return true;
            }
        } catch (e) {
            console.error('Token refresh failed:', e);
        }
        
        return false;
    }
};

// Сервис авторизации
const AuthService = {
    async login(email, password) {
        const response = await fetch(`${AUTH_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка авторизации');
        }
        
        const data = await response.json();
        AuthUtils.setTokens(data.access_token, data.refresh_token);
        AuthUtils.setUserData(data.user);
        return data.user;
    },
    
    async register(email, password, name) {
        const response = await fetch(`${AUTH_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка регистрации');
        }
        
        const data = await response.json();
        // Сохраняем токены и данные пользователя (API возвращает их при регистрации)
        if (data.access_token && data.user) {
            AuthUtils.setTokens(data.access_token, data.refresh_token);
            AuthUtils.setUserData(data.user);
        }
        return data;
    },
    
    async logout() {
        try {
            await API.request(`${AUTH_BASE_URL}/logout`, { method: 'POST' });
        } catch (e) {
            console.error('Logout error:', e);
        } finally {
            AuthUtils.clearTokens();
            window.location.reload();
        }
    },
    
    async getCurrentUser() {
        if (!AuthUtils.isAuthenticated()) return null;
        
        try {
            const response = await API.request(`${AUTH_BASE_URL}/me`);
            if (response.ok) {
                const user = await response.json();
                AuthUtils.setUserData(user);
                return user;
            }
        } catch (e) {
            console.error('Get current user error:', e);
        }
        
        return null;
    },
    
    async getSubscriptionStatus() {
        try {
            const response = await API.request(`${API_BASE_URL}/subscription/status`);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.error('Get subscription status error:', e);
        }
        return null;
    }
};

// OAuth авторизация
const OAuthService = {
    redirectToProvider(provider) {
        window.location.href = `${AUTH_BASE_URL}/${provider}`;
    }
};

// Экспорт для использования в основном скрипте
window.AuthUtils = AuthUtils;
window.API = API;
window.AuthService = AuthService;
window.OAuthService = OAuthService;
