import { parseDate, getTextColorForBg, escapeCSVValue, convertToCSV, parseCSV, ONBOARDING_KEY } from './utils.js';
import { translations } from './translations.js';

// State management
export let state = {
    history: [], 
    templates: [], 
    historyViewMode: 'table', 
    templatesViewMode: 'table',
    historySearch: '', 
    templatesSearch: '', 
    historySort: 'created_at_desc', 
    templatesSort: 'created_at_desc',
    historyDateRange: [], 
    templatesSortColumn: 'created_at', 
    templatesSortDirection: 'desc',
    historySortColumn: 'created_at', 
    historySortDirection: 'desc',
    lang: 'ru'
};

export let currentUser = { email: 'local_user' };

// --- UI Helpers ---

export function showToast(message, type = 'success') {
    try {
        const toastEl = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        if (toastMessage) {
            toastMessage.textContent = message;
        }
        if (toastEl) {
            toastEl.className = `fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg transition-transform transform z-[60] ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`;
            toastEl.classList.remove('translate-x-[150%]');
            setTimeout(() => {
                if (toastEl) {
                    toastEl.classList.add('translate-x-[150%]');
                }
            }, 3000);
        }
    } catch (e) {
        console.error('Error showing toast:', e);
    }
}

export function switchView(targetId) {
    const navLinks = document.querySelectorAll('.nav-link');
    const allNavLinks = document.querySelectorAll('[data-target]');
    const views = document.querySelectorAll('[data-view]');

    views.forEach(view => view.classList.toggle('active', view.dataset.view === targetId));
    navLinks.forEach(link => {
        const isTarget = link.dataset.target === targetId;
        link.classList.toggle('active', isTarget);
        link.classList.toggle('text-indigo-600', isTarget); link.classList.toggle('dark:text-indigo-400', isTarget);
        link.classList.toggle('bg-slate-100', isTarget); link.classList.toggle('dark:bg-slate-800', isTarget);
    });
    // Обновляем мобильные ссылки
    allNavLinks.forEach(link => {
        const isTarget = link.dataset.target === targetId;
        if (link.classList.contains('nav-link')) return; // Уже обработано выше
        // Для мобильных ссылок
        link.classList.toggle('text-indigo-600', isTarget);
        link.classList.toggle('dark:text-indigo-400', isTarget);
        link.classList.toggle('font-semibold', isTarget);
    });
    
    // Перерисовываем данные при переключении вкладок
    if (targetId === 'templates' && typeof renderTemplates === 'function') {
        setTimeout(() => renderTemplates(), 50);
    } else if (targetId === 'history' && typeof renderHistory === 'function') {
        setTimeout(() => renderHistory(), 50);
    } else if (targetId === 'generator' && typeof renderRecentTemplates === 'function') {
        setTimeout(() => renderRecentTemplates(), 50);
    }
}

// --- Rendering Functions ---

export function applyFiltersAndSorting(items, searchQuery, sortKey, dateRange, sortColumn = null, sortDirection = null) {
    // Create a copy of the array to avoid mutating the original
    let filtered = [...items];

    if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const queryWords = query.split(/\s+/).filter(word => word.length > 0);

        filtered = filtered.filter(item => {
            // Search in all relevant fields including UTM parameters, tags, and names
            const searchableText = [
                item.full_url || item.url || '',
                item.base_url || '',
                item.name || '', // Template name for templates
                item.tag_name || '', // Tag name for templates
                item.utm_source || '',
                item.utm_medium || '',
                item.utm_campaign || '',
                item.utm_content || '',
                item.utm_term || ''
            ].join(' ').toLowerCase();

            // If query has multiple words, all words must be found
            if (queryWords.length > 1) {
                return queryWords.every(word => searchableText.includes(word));
            } else {
                return searchableText.includes(query);
            }
        });
    }

    if (dateRange && dateRange.length === 2) {
        const [start, end] = dateRange;
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        filtered = filtered.filter(item => {
            const itemDate = parseDate(item.created_at);
            return itemDate >= start && itemDate <= end;
        });
    }

    // Use new sorting system if parameters provided, otherwise use old system
    if (sortColumn && sortDirection) {
        filtered.sort((a, b) => {
            if (sortColumn === 'created_at') {
                const timeA = parseDate(a.created_at).getTime();
                const timeB = parseDate(b.created_at).getTime();
                return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
            }

            let valA, valB;
            if (sortColumn === 'tag_name') {
                valA = a.tag_name || '';
                valB = b.tag_name || '';
            } else if (sortColumn === 'full_url') {
                valA = a.full_url || a.url || '';
                valB = b.full_url || b.url || '';
            } else {
                valA = a[sortColumn] || '';
                valB = b[sortColumn] || '';
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    } else {
        // Old sorting system for history
        const [key, direction] = sortKey.split('_');

        filtered.sort((a, b) => {
            if (key === 'created_at') {
                const timeA = parseDate(a.created_at).getTime();
                const timeB = parseDate(b.created_at).getTime();
                return direction === 'asc' ? timeA - timeB : timeB - timeA;
            }

            // Обрабатываем сортировку по тегу
            let valA, valB;
            if (key === 'tag_name') {
                valA = a.tag_name || '';
                valB = b.tag_name || '';
            } else {
                valA = a[key] || '';
                valB = b[key] || '';
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return filtered;
}

export function renderHistory() {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer) {
        console.warn('historyContainer not found');
        return;
    }
    
    // Убеждаемся, что viewMode установлен
    if (!state.historyViewMode) {
        state.historyViewMode = localStorage.getItem('utmka_historyViewMode') || 'table';
    }
    
    const items = applyFiltersAndSorting(state.history, state.historySearch, state.historySort, state.historyDateRange, state.historySortColumn, state.historySortDirection);
    const dict = translations[state.lang] || translations.ru;
    
    if (items.length === 0) { 
        historyContainer.innerHTML = `<p class="text-center py-10 text-slate-500">${dict.nothing_found || 'Ничего не найдено.'}</p>`; 
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return; 
    }
    
    if (state.historyViewMode === 'table') {
        const getSortIcon = (column) => {
            if (state.historySortColumn !== column) return '';
            return state.historySortDirection === 'asc' ?
                '<i data-lucide="chevron-up" class="w-3 h-3 ml-1"></i>' :
                '<i data-lucide="chevron-down" class="w-3 h-3 ml-1"></i>';
        };

        historyContainer.innerHTML = `<div class="overflow-x-auto w-full"><table class="w-full table-auto"><thead class="border-b border-slate-200 dark:border-slate-700"><tr><th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 select-none" data-sort="full_url">URL${getSortIcon('full_url')}</th><th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 select-none" data-sort="short_url">${dict.history_short_url || 'Короткая'}${getSortIcon('short_url')}</th><th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase w-48 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 select-none" data-sort="created_at">${dict.history_date || 'Дата'}${getSortIcon('created_at')}</th><th class="relative px-6 py-3 w-40"></th></tr></thead><tbody class="divide-y divide-slate-200 dark:divide-slate-800">${items.map(item => `<tr class="history-item cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-id="${item.id}"><td class="px-6 py-4"><div class="text-sm text-slate-900 dark:text-slate-200 selectable-text truncate max-w-xs" title="${item.full_url || item.url}">${item.full_url || item.url}</div></td><td class="px-6 py-4"><div class="text-sm text-emerald-600 dark:text-emerald-400 selectable-text" title="${item.short_url || ''}">${item.short_url || '<span class="text-slate-400">—</span>'}</div></td><td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 selectable-text">${parseDate(item.created_at).toLocaleString(state.lang === 'en' ? 'en-US' : 'ru-RU')}</td><td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1"><button data-id="${item.id}" data-url="${item.full_url || item.url}" class="shorten-history-btn text-emerald-600 hover:text-emerald-900 p-1" title="${dict.btn_shorten || 'Сократить ссылку'}"><i data-lucide="shrink" class="w-4 h-4"></i></button><button data-url="${item.short_url || item.full_url || item.url}" class="qr-history-btn text-purple-600 hover:text-purple-900 p-1" title="${dict.btn_qr_code || 'QR-код'}"><i data-lucide="qr-code" class="w-4 h-4"></i></button><button data-id="${item.id}" class="apply-history-btn text-green-600 hover:text-green-900 p-1" title="${dict.btn_apply_utm || 'Применить UTM-параметры'}"><i data-lucide="wand-sparkles" class="w-4 h-4"></i></button><button data-url="${item.full_url || item.url}" class="copy-history-btn text-indigo-600 hover:text-indigo-900 p-1" title="${dict.btn_copy_link || 'Копировать ссылку'}"><i data-lucide="copy" class="w-4 h-4"></i></button><button data-id="${item.id}" class="delete-history-btn text-red-600 hover:text-red-900 p-1" title="${dict.btn_delete || 'Удалить'}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>`).join('')}</tbody></table></div>`;
    } else if (state.historyViewMode === 'grid') {
        historyContainer.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${items.map(item => `<div class="history-item cursor-pointer p-4 border rounded-lg bg-white dark:bg-slate-800/50 shadow space-y-2" data-id="${item.id}"><p class="text-sm truncate selectable-text" title="${item.full_url || item.url}">${item.full_url || item.url}</p>${item.short_url ? `<p class="text-xs text-emerald-600 dark:text-emerald-400 truncate selectable-text" title="${item.short_url}">${item.short_url}</p>` : ''}<p class="text-xs text-slate-500 selectable-text">${parseDate(item.created_at).toLocaleString(state.lang === 'en' ? 'en-US' : 'ru-RU')}</p><div class="flex justify-end space-x-1 pt-2"><button data-id="${item.id}" data-url="${item.full_url || item.url}" class="shorten-history-btn text-emerald-600 hover:text-emerald-900 p-1" title="${dict.btn_shorten || 'Сократить ссылку'}"><i data-lucide="shrink" class="w-4 h-4"></i></button><button data-url="${item.short_url || item.full_url || item.url}" class="qr-history-btn text-purple-600 hover:text-purple-900 p-1" title="${dict.btn_qr_code || 'QR-код'}"><i data-lucide="qr-code" class="w-4 h-4"></i></button><button data-id="${item.id}" class="apply-history-btn text-green-600 hover:text-green-900 p-1" title="${dict.btn_apply_utm || 'Применить UTM-параметры'}"><i data-lucide="wand-sparkles" class="w-4 h-4"></i></button><button data-url="${item.full_url || item.url}" class="copy-history-btn text-indigo-600 hover:text-indigo-900 p-1" title="${dict.btn_copy_link || 'Копировать ссылку'}"><i data-lucide="copy" class="w-4 h-4"></i></button><button data-id="${item.id}" class="delete-history-btn text-red-600 hover:text-red-900 p-1" title="${dict.btn_delete || 'Удалить'}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>`).join('')}</div>`;
    } else { // List view
        historyContainer.innerHTML = `<div class="space-y-2">${items.map(item => `<div class="history-item cursor-pointer p-3 border rounded-lg bg-white dark:bg-slate-800/50 shadow flex justify-between items-center gap-4" data-id="${item.id}"><div class="min-w-0 flex-grow"><p class="text-sm truncate selectable-text" title="${item.full_url || item.url}">${item.full_url || item.url}</p>${item.short_url ? `<p class="text-xs text-emerald-600 dark:text-emerald-400 truncate selectable-text">${item.short_url}</p>` : ''}<p class="text-xs text-slate-500 selectable-text">${parseDate(item.created_at).toLocaleString(state.lang === 'en' ? 'en-US' : 'ru-RU')}</p></div><div class="flex items-center space-x-1 flex-shrink-0"><button data-id="${item.id}" data-url="${item.full_url || item.url}" class="shorten-history-btn text-emerald-600 hover:text-emerald-900 p-1" title="${dict.btn_shorten || 'Сократить ссылку'}"><i data-lucide="shrink" class="w-4 h-4"></i></button><button data-url="${item.short_url || item.full_url || item.url}" class="qr-history-btn text-purple-600 hover:text-purple-900 p-1" title="${dict.btn_qr_code || 'QR-код'}"><i data-lucide="qr-code" class="w-4 h-4"></i></button><button data-id="${item.id}" class="apply-history-btn text-green-600 hover:text-green-900 p-1" title="${dict.btn_apply_utm || 'Применить UTM-параметры'}"><i data-lucide="wand-sparkles" class="w-4 h-4"></i></button><button data-url="${item.full_url || item.url}" class="copy-history-btn text-indigo-600 hover:text-indigo-900 p-1" title="${dict.btn_copy_link || 'Копировать ссылку'}"><i data-lucide="copy" class="w-4 h-4"></i></button><button data-id="${item.id}" class="delete-history-btn text-red-600 hover:text-red-900 p-1" title="${dict.btn_delete || 'Удалить'}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>`).join('')}</div>`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function renderTemplates() {
    const templatesContainer = document.getElementById('templatesContainer');
    if (!templatesContainer) {
        console.warn('templatesContainer not found');
        return;
    }
    
    // Убеждаемся, что viewMode установлен
    if (!state.templatesViewMode) {
        state.templatesViewMode = localStorage.getItem('utmka_templatesViewMode') || 'table';
    }
    
    const items = applyFiltersAndSorting(state.templates, state.templatesSearch, state.templatesSort, null, state.templatesSortColumn, state.templatesSortDirection);
    const dict = translations[state.lang] || translations.ru;

    if (items.length === 0) {
        templatesContainer.innerHTML = `<p class="text-center py-10 text-slate-500">${dict.nothing_found || 'Ничего не найдено.'}</p>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    const renderTag = (t) => {
        if (!t.tag_name) return '';
        const textColor = getTextColorForBg(t.tag_color);
        return `<span class="px-2 py-1 text-xs font-medium rounded-full shadow-sm inline-block max-w-full truncate transition-all duration-200" style="background-color:${t.tag_color || '#f1f5f9'}; color: ${textColor}; margin: 2px;" title="${t.tag_name}">${t.tag_name}</span>`;
    };

    if (state.templatesViewMode === 'table') {
        const getSortIcon = (column) => {
            if (state.templatesSortColumn !== column) return '';
            return state.templatesSortDirection === 'asc' ?
                '<i data-lucide="chevron-up" class="w-3 h-3 ml-1"></i>' :
                '<i data-lucide="chevron-down" class="w-3 h-3 ml-1"></i>';
        };

        templatesContainer.innerHTML = `<div class="overflow-x-auto w-full"><table class="w-full table-auto"><thead class="border-b border-slate-200 dark:border-slate-700"><tr><th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-20"></th><th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 select-none" data-sort="name">${dict.table_name || 'Название'}${getSortIcon('name')}</th><th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 select-none" data-sort="tag_name">${dict.table_tag || 'Тег'}${getSortIcon('tag_name')}</th><th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 select-none" data-sort="utm_source">${dict.table_source || 'Источник'}${getSortIcon('utm_source')}</th><th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 select-none" data-sort="utm_medium">${dict.table_medium || 'Канал'}${getSortIcon('utm_medium')}</th><th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 select-none" data-sort="utm_campaign">${dict.table_campaign || 'Кампания'}${getSortIcon('utm_campaign')}</th><th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 select-none w-40" data-sort="created_at">${dict.table_created || 'Дата создания'}${getSortIcon('created_at')}</th></tr></thead><tbody class="divide-y divide-slate-200 dark:divide-slate-800">${items.map(t => `<tr><td class="px-4 py-4 text-sm text-left"><div class="flex gap-1"><button data-id="${t.id}" class="view-template-btn text-blue-600 hover:text-blue-900 p-1" title="${dict.btn_view_template || 'Просмотр шаблона'}"><i data-lucide="eye" class="w-4 h-4"></i></button><button data-id="${t.id}" class="apply-template-btn text-green-600 hover:text-green-900 p-1" title="${dict.btn_apply_template || 'Применить шаблон'}"><i data-lucide="wand-sparkles" class="w-4 h-4"></i></button><button data-id="${t.id}" class="delete-template-btn text-red-600 hover:text-red-900 p-1" title="${dict.btn_delete_template || 'Удалить шаблон'}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></td><td class="px-4 py-4 text-sm text-left"><div class="truncate selectable-text" title="${t.name}">${t.name}</div></td><td class="px-4 py-4 text-sm text-left">${t.tag_name ? `<span class="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap shadow-sm transition-all duration-200" style="background-color:${t.tag_color || '#f1f5f9'}; color: ${getTextColorForBg(t.tag_color)}; margin: 2px;">${t.tag_name}</span>` : '-'}</td><td class="px-4 py-4 text-sm text-left"><div class="truncate selectable-text" title="${t.utm_source}">${t.utm_source || '-'}</div></td><td class="px-4 py-4 text-sm text-left"><div class="truncate selectable-text" title="${t.utm_medium}">${t.utm_medium || '-'}</div></td><td class="px-4 py-4 text-sm text-left"><div class="truncate selectable-text" title="${t.utm_campaign}">${t.utm_campaign || '-'}</div></td><td class="px-4 py-4 text-sm text-left whitespace-nowrap text-slate-500 selectable-text">${parseDate(t.created_at).toLocaleString(state.lang === 'en' ? 'en-US' : 'ru-RU')}</td></tr>`).join('')}</tbody></table></div>`;
    } else if (state.templatesViewMode === 'grid') {
        templatesContainer.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">${items.map(t => `<div class="p-6 border rounded-xl bg-white dark:bg-slate-800/50 shadow-lg hover:shadow-xl transition-shadow duration-200 space-y-4"><div class="space-y-3"><h3 class="font-bold text-lg text-slate-900 dark:text-white truncate selectable-text">${t.name}</h3><div class="space-y-3"><div class="flex items-center gap-2"><div class="flex-1 min-w-0">${renderTag(t)}</div></div><div class="flex gap-1"><button data-id="${t.id}" class="apply-template-btn text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 p-2 rounded-lg transition-colors duration-150" title="${dict.btn_apply_template || 'Применить шаблон'}"><i data-lucide="wand-sparkles" class="w-4 h-4"></i></button><button data-id="${t.id}" class="view-template-btn text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors duration-150" title="${dict.btn_view_template || 'Просмотр шаблона'}"><i data-lucide="eye" class="w-4 h-4"></i></button><button data-id="${t.id}" class="delete-template-btn text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors duration-150" title="${dict.btn_delete_template || 'Удалить шаблон'}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div></div><div class="text-sm text-slate-600 dark:text-slate-300 space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700"><div class="flex justify-between"><span class="font-medium">${dict.grid_source || 'Источник:'}</span><span class="text-slate-900 dark:text-slate-100 truncate ml-2 selectable-text">${t.utm_source || '-'}</span></div><div class="flex justify-between"><span class="font-medium">${dict.grid_medium || 'Канал:'}</span><span class="text-slate-900 dark:text-slate-100 truncate ml-2 selectable-text">${t.utm_medium || '-'}</span></div><div class="flex justify-between"><span class="font-medium">${dict.grid_campaign || 'Кампания:'}</span><span class="text-slate-900 dark:text-slate-100 truncate ml-2 selectable-text">${t.utm_campaign || '-'}</span></div><div class="flex justify-between"><span class="font-medium">${dict.template_created || 'Создан:'}</span><span class="text-slate-900 dark:text-slate-100 truncate ml-2 selectable-text">${parseDate(t.created_at).toLocaleDateString(state.lang === 'en' ? 'en-US' : 'ru-RU')}</span></div></div></div>`).join('')}</div>`;
    } else { // list
        templatesContainer.innerHTML = `<div class="space-y-2">${items.map(t => `<div class="p-3 border rounded-lg bg-white dark:bg-slate-800/50 shadow flex justify-between items-center"><div><div class="flex items-center gap-2"><p class="font-bold selectable-text">${t.name}</p>${renderTag(t)}</div><p class="text-xs text-slate-500 truncate selectable-text">source: ${t.utm_source || '-'}, medium: ${t.utm_medium || '-'}, campaign: ${t.utm_campaign || '-'}</p><p class="text-xs text-slate-400 selectable-text">${dict.template_created || 'Создан:'} ${parseDate(t.created_at).toLocaleDateString(state.lang === 'en' ? 'en-US' : 'ru-RU')}</p></div><div class="flex gap-2"><button data-id="${t.id}" class="apply-template-btn text-green-600 hover:text-green-900 p-1" title="${dict.btn_apply_template || 'Применить шаблон'}"><i data-lucide="wand-sparkles" class="w-4 h-4"></i></button><button data-id="${t.id}" class="view-template-btn text-blue-600 hover:text-blue-900 p-1" title="${dict.btn_view_template || 'Просмотр шаблона'}"><i data-lucide="eye" class="w-4 h-4"></i></button><button data-id="${t.id}" class="delete-template-btn text-red-600 hover:text-red-900 p-1" title="${dict.btn_delete_template || 'Удалить шаблон'}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>`).join('')}</div>`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function renderRecentTemplates() {
    const container = document.getElementById('recentTemplatesContainer');
    
    // Проверяем, что контейнер существует
    if (!container) {
        console.warn('recentTemplatesContainer not found');
        return;
    }
    
    container.innerHTML = ''; // Очищаем контейнер

    // Сортируем шаблоны, чтобы последние добавленные были первыми
    const sortedTemplates = [...state.templates].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (sortedTemplates.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400">У вас пока нет шаблонов.</p>`;
        return;
    }

    // Ограничиваем количество шаблонов для отображения (примерно 4 ряда)
    const maxTemplates = 16; // Примерно 4 ряда по 4 шаблона
    const templatesToShow = sortedTemplates.slice(0, maxTemplates);

    // Используем requestAnimationFrame для рендеринга после того, как DOM будет готов
    requestAnimationFrame(() => {
        // Добавляем шаблоны
        for (const t of templatesToShow) {
            const button = document.createElement('button');
            button.dataset.templateId = t.id;
            // Стиль кнопок с полусферическими краями
            button.className = "recent-template-btn text-sm px-4 py-2 rounded-full font-medium transition-all duration-200 border-0 shadow-sm";
            button.textContent = t.name;

            // Применяем цвет на основе тега с улучшенными цветами
            if (t.tag_color && t.tag_color !== 'null') {
                const textColor = getTextColorForBg(t.tag_color);
                button.style.backgroundColor = t.tag_color;
                button.style.color = textColor;
                button.style.border = 'none';
                // Улучшенное ховер-состояние
                button.onmouseover = () => {
                    button.style.transform = 'translateY(-1px)';
                    button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                };
                button.onmouseout = () => {
                    button.style.transform = 'translateY(0)';
                    button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                };
            } else {
                // Стандартный стиль для кнопок без цвета тега - светло-серый
                button.style.backgroundColor = '#f1f5f9';
                button.style.color = '#475569';
                button.style.border = 'none';
                button.onmouseover = () => {
                    button.style.backgroundColor = '#e2e8f0';
                    button.style.transform = 'translateY(-1px)';
                    button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                };
                button.onmouseout = () => {
                    button.style.backgroundColor = '#f1f5f9';
                    button.style.transform = 'translateY(0)';
                    button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                };
            }

            container.appendChild(button);
        }
    });
}

export function renderAll() {
    renderHistory();
    renderTemplates();
    renderRecentTemplates();
}
