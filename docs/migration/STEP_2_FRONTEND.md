# Этап 2: Разбиение Frontend ✅ ВЫПОЛНЕНО

## Цель

Разбить монолитный `index.html` (3590 строк) на модульные компоненты.

## Статус: ВЫПОЛНЕНО

---

## Текущая проблема

```html
<!-- index.html - ВСЁ в одном файле -->
<html>
<head>
    <script src="https://cdn.tailwindcss.com"></script>  <!-- CDN! -->
    <script src="https://unpkg.com/lucide@latest"></script>  <!-- CDN! -->
    <style>/* 500+ строк CSS */</style>
</head>
<body>
    <!-- 1000+ строк HTML -->
    <script>
        // 2000+ строк JavaScript!!!
    </script>
</body>
</html>
```

---

## Целевая структура

```
frontend/
├── index.html              # ~100 строк (только разметка)
├── css/
│   ├── main.css           # Базовые стили
│   ├── components.css     # Стили компонентов
│   └── utilities.css      # Утилиты (вместо Tailwind CDN)
└── js/
    ├── main.js            # Точка входа (~50 строк)
    ├── api.js             # HTTP клиент (~100 строк)
    ├── state.js           # Состояние (~80 строк)
    ├── router.js          # Навигация (~60 строк)
    ├── i18n.js            # Переводы (~200 строк)
    └── components/
        ├── generator.js   # UTM генератор (~300 строк)
        ├── history.js     # История (~250 строк)
        ├── templates.js   # Шаблоны (~300 строк)
        ├── toast.js       # Уведомления (~50 строк)
        └── modal.js       # Модальные окна (~100 строк)
```

---

## Шаг 2.1: Создать базовый HTML

### Файл: `frontend/index.html`

```html
<!DOCTYPE html>
<html lang="ru" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UTMka</title>
    
    <!-- Локальные стили (НЕ CDN!) -->
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/components.css">
    <link rel="stylesheet" href="css/utilities.css">
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/assets/logo/logoutm.png">
</head>
<body class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
    
    <div id="app">
        <!-- Navbar -->
        <nav id="navbar" class="navbar hidden">
            <!-- Содержимое navbar -->
        </nav>
        
        <!-- Loader -->
        <div id="loader" class="loader">
            <div class="loader-spinner"></div>
            <p>Загрузка...</p>
        </div>
        
        <!-- Main Content -->
        <main id="main-content" class="main-content hidden">
            <!-- Generator View -->
            <section data-view="generator" class="view active">
                <div id="generator-container"></div>
            </section>
            
            <!-- History View -->
            <section data-view="history" class="view">
                <div id="history-container"></div>
            </section>
            
            <!-- Templates View -->
            <section data-view="templates" class="view">
                <div id="templates-container"></div>
            </section>
            
            <!-- Help View -->
            <section data-view="help" class="view">
                <div id="help-container"></div>
            </section>
        </main>
        
        <!-- Toast notifications -->
        <div id="toast" class="toast hidden"></div>
    </div>
    
    <!-- Модули JavaScript (ES6) -->
    <script type="module" src="js/main.js"></script>
</body>
</html>
```

---

## Шаг 2.2: Создать API клиент

### Файл: `frontend/js/api.js`

```javascript
/**
 * HTTP клиент для работы с API
 */

const API_BASE = window.location.origin;

/**
 * Базовый fetch с обработкой ошибок
 */
async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
}

// ===== История =====

export async function getHistory(userEmail) {
    return request(`/history?user_email=${encodeURIComponent(userEmail)}`);
}

export async function addHistory(userEmail, url) {
    return request('/history', {
        method: 'POST',
        body: JSON.stringify({ user_email: userEmail, url })
    });
}

export async function deleteHistory(id) {
    return request(`/history/${id}`, { method: 'DELETE' });
}

export async function updateShortUrl(id, shortUrl) {
    return request(`/history/${id}/short_url`, {
        method: 'PUT',
        body: JSON.stringify({ short_url: shortUrl })
    });
}

// ===== Шаблоны =====

export async function getTemplates(userEmail) {
    return request(`/templates?user_email=${encodeURIComponent(userEmail)}`);
}

export async function addTemplate(template) {
    return request('/templates', {
        method: 'POST',
        body: JSON.stringify(template)
    });
}

export async function deleteTemplate(id) {
    return request(`/templates/${id}`, { method: 'DELETE' });
}

// ===== Экспорт =====

export async function exportHistory(userEmail, format = 'json') {
    return request('/export_history', {
        method: 'POST',
        body: JSON.stringify({ user_email: userEmail, format })
    });
}

export async function exportTemplates(userEmail, format = 'json') {
    return request('/export_templates', {
        method: 'POST',
        body: JSON.stringify({ user_email: userEmail, format })
    });
}
```

---

## Шаг 2.3: Создать State Management

### Файл: `frontend/js/state.js`

```javascript
/**
 * Простое управление состоянием приложения
 */

// Начальное состояние
const initialState = {
    user: {
        email: localStorage.getItem('userEmail') || 'local@utmka.app'
    },
    history: [],
    templates: [],
    currentView: 'generator',
    theme: localStorage.getItem('theme') || 'dark',
    language: localStorage.getItem('language') || 'ru'
};

// Текущее состояние
let state = { ...initialState };

// Подписчики на изменения
const listeners = new Set();

/**
 * Получить текущее состояние
 */
export function getState() {
    return state;
}

/**
 * Обновить состояние
 */
export function setState(updates) {
    state = { ...state, ...updates };
    
    // Сохранить в localStorage
    if (updates.theme) {
        localStorage.setItem('theme', updates.theme);
    }
    if (updates.language) {
        localStorage.setItem('language', updates.language);
    }
    if (updates.user?.email) {
        localStorage.setItem('userEmail', updates.user.email);
    }
    
    // Уведомить подписчиков
    listeners.forEach(listener => listener(state));
}

/**
 * Подписаться на изменения
 */
export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Получить пользователя
 */
export function getUser() {
    return state.user;
}

/**
 * Получить историю
 */
export function getHistoryItems() {
    return state.history;
}

/**
 * Получить шаблоны
 */
export function getTemplateItems() {
    return state.templates;
}
```

---

## Шаг 2.4: Создать компонент генератора

### Файл: `frontend/js/components/generator.js`

```javascript
/**
 * Компонент UTM генератора
 */

import * as api from '../api.js';
import { getState, setState, getUser } from '../state.js';
import { showToast } from './toast.js';
import { t } from '../i18n.js';

/**
 * Инициализация компонента
 */
export function initGenerator() {
    const container = document.getElementById('generator-container');
    if (!container) return;
    
    container.innerHTML = getGeneratorHTML();
    attachEventListeners();
}

/**
 * HTML разметка генератора
 */
function getGeneratorHTML() {
    return `
        <div class="generator-card">
            <div class="card-header">
                <h2>${t('generator_title')}</h2>
            </div>
            
            <form id="utm-form" class="utm-form">
                <!-- URL -->
                <div class="form-group">
                    <label for="url">${t('url_label')} *</label>
                    <div class="input-with-prefix">
                        <span class="prefix">https://</span>
                        <input type="text" id="url" name="url" 
                               placeholder="example.com/page" required>
                    </div>
                </div>
                
                <!-- UTM Source & Medium -->
                <div class="form-row">
                    <div class="form-group">
                        <label for="utm_source">${t('utm_source')}</label>
                        <input type="text" id="utm_source" name="utm_source" 
                               placeholder="google, yandex">
                    </div>
                    <div class="form-group">
                        <label for="utm_medium">${t('utm_medium')}</label>
                        <input type="text" id="utm_medium" name="utm_medium" 
                               placeholder="cpc, banner">
                    </div>
                </div>
                
                <!-- UTM Campaign -->
                <div class="form-group">
                    <label for="utm_campaign">${t('utm_campaign')}</label>
                    <input type="text" id="utm_campaign" name="utm_campaign" 
                           placeholder="summer_sale">
                </div>
                
                <!-- UTM Content & Term -->
                <div class="form-row">
                    <div class="form-group">
                        <label for="utm_content">${t('utm_content')}</label>
                        <input type="text" id="utm_content" name="utm_content" 
                               placeholder="banner_1">
                    </div>
                    <div class="form-group">
                        <label for="utm_term">${t('utm_term')}</label>
                        <input type="text" id="utm_term" name="utm_term" 
                               placeholder="keyword">
                    </div>
                </div>
                
                <!-- Buttons -->
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        ${t('btn_generate')}
                    </button>
                    <button type="button" id="clear-form" class="btn btn-secondary">
                        ${t('btn_clear')}
                    </button>
                </div>
            </form>
            
            <!-- Result -->
            <div id="result-section" class="result-section hidden">
                <label>${t('result_label')}</label>
                <div class="result-input-group">
                    <input type="text" id="result-url" readonly>
                    <button type="button" id="copy-btn" class="btn btn-icon" title="${t('btn_copy')}">
                        📋
                    </button>
                    <button type="button" id="shorten-btn" class="btn btn-icon" title="${t('btn_shorten')}">
                        🔗
                    </button>
                    <button type="button" id="qr-btn" class="btn btn-icon" title="${t('btn_qr')}">
                        📱
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Привязка обработчиков событий
 */
function attachEventListeners() {
    const form = document.getElementById('utm-form');
    const clearBtn = document.getElementById('clear-form');
    const copyBtn = document.getElementById('copy-btn');
    const shortenBtn = document.getElementById('shorten-btn');
    const qrBtn = document.getElementById('qr-btn');
    
    form?.addEventListener('submit', handleSubmit);
    clearBtn?.addEventListener('click', handleClear);
    copyBtn?.addEventListener('click', handleCopy);
    shortenBtn?.addEventListener('click', handleShorten);
    qrBtn?.addEventListener('click', handleQR);
}

/**
 * Генерация UTM ссылки
 */
async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    let url = formData.get('url').trim();
    
    if (!url) {
        showToast(t('error_url_required'), 'error');
        return;
    }
    
    // Добавляем протокол если нет
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    try {
        const urlObj = new URL(url);
        
        // Добавляем UTM параметры
        const params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
        params.forEach(param => {
            const value = formData.get(param)?.trim();
            if (value) {
                urlObj.searchParams.set(param, value);
            }
        });
        
        const finalUrl = urlObj.toString();
        
        // Показываем результат
        const resultSection = document.getElementById('result-section');
        const resultInput = document.getElementById('result-url');
        resultSection.classList.remove('hidden');
        resultInput.value = finalUrl;
        
        // Сохраняем в историю
        const user = getUser();
        await api.addHistory(user.email, finalUrl);
        
        showToast(t('msg_saved_to_history'));
        
    } catch (error) {
        showToast(t('error_invalid_url'), 'error');
    }
}

/**
 * Очистка формы
 */
function handleClear() {
    document.getElementById('utm-form').reset();
    document.getElementById('result-section').classList.add('hidden');
}

/**
 * Копирование в буфер
 */
async function handleCopy() {
    const url = document.getElementById('result-url').value;
    if (!url) return;
    
    try {
        await navigator.clipboard.writeText(url);
        showToast(t('msg_copied'));
    } catch (error) {
        showToast(t('error_copy_failed'), 'error');
    }
}

/**
 * Сокращение ссылки
 */
async function handleShorten() {
    const resultInput = document.getElementById('result-url');
    const url = resultInput.value;
    if (!url) return;
    
    try {
        const response = await fetch(`https://clck.ru/--?url=${encodeURIComponent(url)}`);
        const shortUrl = await response.text();
        
        if (shortUrl && !shortUrl.includes('error')) {
            resultInput.value = shortUrl.trim();
            await navigator.clipboard.writeText(shortUrl.trim());
            showToast(t('msg_shortened_copied'));
        }
    } catch (error) {
        showToast(t('error_shorten_failed'), 'error');
    }
}

/**
 * Генерация QR-кода
 */
function handleQR() {
    const url = document.getElementById('result-url').value;
    if (!url) return;
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`;
    
    // Открываем модальное окно с QR
    // TODO: использовать компонент modal.js
    window.open(qrUrl, '_blank');
}
```

---

## Шаг 2.5: Извлечь CSS

### Файл: `frontend/css/main.css`

```css
/* ===== Reset & Base ===== */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    font-size: 16px;
    line-height: 1.5;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    transition: background-color 0.3s, color 0.3s;
}

/* ===== CSS Variables ===== */
:root {
    /* Light theme */
    --bg-primary: #ffffff;
    --bg-secondary: #f8fafc;
    --bg-card: #ffffff;
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --border-color: #e2e8f0;
    --accent-color: #6366f1;
    --accent-hover: #4f46e5;
}

.dark {
    /* Dark theme */
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-card: #1e293b;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --border-color: #334155;
    --accent-color: #818cf8;
    --accent-hover: #6366f1;
}

/* ===== Typography ===== */
h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.25;
}

h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }

/* ===== Forms ===== */
input, textarea, select {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 0.875rem;
    transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* ===== Buttons ===== */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-primary {
    background-color: var(--accent-color);
    color: white;
}

.btn-primary:hover {
    background-color: var(--accent-hover);
}

.btn-secondary {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

.btn-secondary:hover {
    background-color: var(--border-color);
}

.btn-icon {
    padding: 0.5rem;
    background: transparent;
    border: 1px solid var(--border-color);
}

/* ===== Cards ===== */
.card {
    background-color: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 1.5rem;
    padding: 1.5rem;
}

/* ===== Utilities ===== */
.hidden { display: none !important; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: 0.5rem; }
.gap-4 { gap: 1rem; }
.mt-4 { margin-top: 1rem; }
.mb-4 { margin-bottom: 1rem; }
```

---

## Процесс извлечения из index.html

### Как извлекать код:

1. **Найти блок кода** в текущем `index.html`
2. **Скопировать** в соответствующий модуль
3. **Адаптировать** (заменить глобальные переменные на импорты)
4. **Проверить** что работает
5. **Удалить** из `index.html`

### Порядок извлечения:

1. CSS стили → `frontend/css/`
2. Переводы → `frontend/js/i18n.js`
3. API функции → `frontend/js/api.js`
4. Состояние → `frontend/js/state.js`
5. Компоненты → `frontend/js/components/`
6. HTML разметка → очистить `index.html`

---

## Чек-лист завершения этапа

- [x] CSS извлечён в отдельные файлы (`frontend/css/main.css`)
- [x] JavaScript разбит на ES6 модули (`app.js`, `ui.js`, `api.js`, `translations.js`, `utils.js`)
- [x] Модули работают с корректными import/export
- [ ] Tailwind CDN удалён — **отложено** (требует npm + build tooling)
- [ ] Lucide CDN удалён — **отложено** (требует локальные иконки)
- [ ] Flatpickr CDN удалён — **отложено**
- [x] `frontend/index.html` — 742 строки чистого HTML (было 3589)
- [x] Backend routing: `src/api/__init__.py` обновлён (web → `frontend/`, desktop → root)
- [x] Все API routes протестированы через Flask test client

## Реализованная структура

```
frontend/
├── index.html              # 742 строк (чистый HTML, без inline JS)
├── css/
│   └── main.css            # 186 строк (glassmorphism, animations)
├── js/
│   ├── app.js              # 1130 строк (entry point + все обработчики)
│   ├── ui.js               # 314 строк (state, rendering)
│   ├── api.js              # 258 строк (fetch, initialization)
│   ├── translations.js     # 210 строк (i18n RU/EN)
│   ├── utils.js            # 128 строк (helpers)
│   └── components/         # (зарезервировано для будущего разбиения)
└── logo/
    └── logoutm.png         # Логотип
```

## Отличия от первоначального плана

Вместо создания отдельных component файлов (generator.js, onboarding.js, modals.js, history.js, templates.js), все обработчики событий консолидированы в `app.js`. Причина: обработчики тесно связаны через общий state и перекрёстные вызовы, разделение привело бы к циклическим зависимостям.

CDN зависимости (Tailwind, Lucide, Flatpickr) сохранены — их удаление требует npm + build tooling (Vite/Webpack), что выходит за рамки этого этапа.
