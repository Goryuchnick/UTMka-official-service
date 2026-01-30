import { parseDate, getTextColorForBg } from './utils.js';
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
        const innerDiv = toastEl?.querySelector('div');
        const icon = toastEl?.querySelector('i');
        if (toastMessage) {
            toastMessage.textContent = message;
        }
        if (toastEl && innerDiv) {
            // Сброс позиции внешнего контейнера
            toastEl.className = 'fixed top-6 right-6 z-[200] transform transition-all duration-300';
            // Стилизация внутреннего контейнера
            const borderColor = type === 'error' ? 'border-red-500' : 'border-green-500';
            const iconColor = type === 'error' ? 'text-red-500' : 'text-green-500';
            innerDiv.className = `glass flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 ${borderColor} shadow-2xl`;
            if (icon) {
                icon.className = `w-5 h-5 ${iconColor}`;
                icon.setAttribute('data-lucide', type === 'error' ? 'alert-circle' : 'check-circle');
                if (window.lucide) lucide.createIcons();
            }
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
    allNavLinks.forEach(link => {
        const isTarget = link.dataset.target === targetId;
        if (link.classList.contains('nav-link')) return;
        link.classList.toggle('text-indigo-600', isTarget);
        link.classList.toggle('dark:text-indigo-400', isTarget);
        link.classList.toggle('font-semibold', isTarget);
    });

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
    let filtered = [...items];

    if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const queryWords = query.split(/\s+/).filter(word => word.length > 0);

        filtered = filtered.filter(item => {
            const searchableText = [
                item.full_url || item.url || '',
                item.base_url || '',
                item.name || '',
                item.tag_name || '',
                item.utm_source || '',
                item.utm_medium || '',
                item.utm_campaign || '',
                item.utm_content || '',
                item.utm_term || ''
            ].join(' ').toLowerCase();

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
        const [key, direction] = sortKey.split('_');

        filtered.sort((a, b) => {
            if (key === 'created_at') {
                const timeA = parseDate(a.created_at).getTime();
                const timeB = parseDate(b.created_at).getTime();
                return direction === 'asc' ? timeA - timeB : timeB - timeA;
            }

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

    if (!state.historyViewMode) {
        state.historyViewMode = localStorage.getItem('utmka_historyViewMode') || 'table';
    }

    const items = applyFiltersAndSorting(state.history, state.historySearch, state.historySort, state.historyDateRange, state.historySortColumn, state.historySortDirection);
    const dict = translations[state.lang] || translations.ru;

    // Helper function to render tags
    const renderTag = (item) => {
        if (!item.tag_name) return '';
        const textColor = getTextColorForBg(item.tag_color);
        return `<span class="px-2 py-1 text-xs font-medium rounded-full shadow-sm inline-block max-w-full truncate transition-all duration-200" style="background-color:${item.tag_color || '#f1f5f9'}; color: ${textColor}; margin: 2px;" title="${item.tag_name}">${item.tag_name}</span>`;
    };

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

        historyContainer.innerHTML = `<div class="overflow-x-auto w-full"><table class="w-full table-auto"><thead class="border-b border-slate-200 dark:border-slate-700"><tr><th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 select-none" data-sort="full_url">URL${getSortIcon('full_url')}</th><th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 select-none" data-sort="short_url">${dict.history_short_url || 'Короткая'}${getSortIcon('short_url')}</th><th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase w-32">Тег</th><th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase w-48 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 select-none" data-sort="created_at">${dict.history_date || 'Дата'}${getSortIcon('created_at')}</th><th class="relative px-6 py-3 w-40"></th></tr></thead><tbody class="divide-y divide-slate-200 dark:divide-slate-800">${items.map(item => `<tr class="history-item cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-id="${item.id}"><td class="px-6 py-4"><div class="text-sm text-slate-900 dark:text-slate-200 selectable-text truncate max-w-xs" title="${item.full_url || item.url}">${item.full_url || item.url}</div></td><td class="px-6 py-4"><div class="text-sm text-emerald-600 dark:text-emerald-400 selectable-text" title="${item.short_url || ''}">${item.short_url || '<span class="text-slate-400">—</span>'}</div></td><td class="px-6 py-4">${renderTag(item) || '<span class="text-slate-400">—</span>'}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 selectable-text">${parseDate(item.created_at).toLocaleString(state.lang === 'en' ? 'en-US' : 'ru-RU')}</td><td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1"><button data-id="${item.id}" data-url="${item.full_url || item.url}" class="shorten-history-btn text-emerald-600 hover:text-emerald-900 p-1" title="${dict.btn_shorten || 'Сократить ссылку'}"><i data-lucide="shrink" class="w-4 h-4"></i></button><button data-url="${item.short_url || item.full_url || item.url}" class="qr-history-btn text-purple-600 hover:text-purple-900 p-1" title="${dict.btn_qr_code || 'QR-код'}"><i data-lucide="qr-code" class="w-4 h-4"></i></button><button data-id="${item.id}" class="apply-history-btn text-green-600 hover:text-green-900 p-1" title="${dict.btn_apply_utm || 'Применить UTM-параметры'}"><i data-lucide="wand-sparkles" class="w-4 h-4"></i></button><button data-url="${item.full_url || item.url}" class="copy-history-btn text-indigo-600 hover:text-indigo-900 p-1" title="${dict.btn_copy_link || 'Копировать ссылку'}"><i data-lucide="copy" class="w-4 h-4"></i></button><button data-id="${item.id}" class="delete-history-btn text-red-600 hover:text-red-900 p-1" title="${dict.btn_delete || 'Удалить'}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>`).join('')}</tbody></table></div>`;
    } else if (state.historyViewMode === 'grid') {
        historyContainer.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${items.map(item => `<div class="history-item cursor-pointer p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 shadow space-y-2" data-id="${item.id}"><p class="text-sm truncate selectable-text" title="${item.full_url || item.url}">${item.full_url || item.url}</p>${item.short_url ? `<p class="text-xs text-emerald-600 dark:text-emerald-400 truncate selectable-text" title="${item.short_url}">${item.short_url}</p>` : ''}${renderTag(item) ? `<div>${renderTag(item)}</div>` : ''}<p class="text-xs text-slate-500 selectable-text">${parseDate(item.created_at).toLocaleString(state.lang === 'en' ? 'en-US' : 'ru-RU')}</p><div class="flex justify-end space-x-1 pt-2"><button data-id="${item.id}" data-url="${item.full_url || item.url}" class="shorten-history-btn text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-400 p-1" title="${dict.btn_shorten || 'Сократить ссылку'}"><i data-lucide="shrink" class="w-4 h-4"></i></button><button data-url="${item.short_url || item.full_url || item.url}" class="qr-history-btn text-purple-600 hover:text-purple-900 dark:hover:text-purple-400 p-1" title="${dict.btn_qr_code || 'QR-код'}"><i data-lucide="qr-code" class="w-4 h-4"></i></button><button data-id="${item.id}" class="apply-history-btn text-green-600 hover:text-green-900 dark:hover:text-green-400 p-1" title="${dict.btn_apply_utm || 'Применить UTM-параметры'}"><i data-lucide="wand-sparkles" class="w-4 h-4"></i></button><button data-url="${item.full_url || item.url}" class="copy-history-btn text-indigo-600 hover:text-indigo-900 dark:hover:text-indigo-400 p-1" title="${dict.btn_copy_link || 'Копировать ссылку'}"><i data-lucide="copy" class="w-4 h-4"></i></button><button data-id="${item.id}" class="delete-history-btn text-red-600 hover:text-red-900 dark:hover:text-red-400 p-1" title="${dict.btn_delete || 'Удалить'}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>`).join('')}</div>`;
    } else {
        historyContainer.innerHTML = `<div class="space-y-2">${items.map(item => `<div class="history-item cursor-pointer p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 shadow flex justify-between items-center gap-4" data-id="${item.id}"><div class="min-w-0 flex-grow"><p class="text-sm truncate selectable-text" title="${item.full_url || item.url}">${item.full_url || item.url}</p>${item.short_url ? `<p class="text-xs text-emerald-600 dark:text-emerald-400 truncate selectable-text">${item.short_url}</p>` : ''}${renderTag(item) ? `<div class="mt-1">${renderTag(item)}</div>` : ''}<p class="text-xs text-slate-500 selectable-text">${parseDate(item.created_at).toLocaleString(state.lang === 'en' ? 'en-US' : 'ru-RU')}</p></div><div class="flex items-center space-x-1 flex-shrink-0"><button data-id="${item.id}" data-url="${item.full_url || item.url}" class="shorten-history-btn text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-400 p-1" title="${dict.btn_shorten || 'Сократить ссылку'}"><i data-lucide="shrink" class="w-4 h-4"></i></button><button data-url="${item.short_url || item.full_url || item.url}" class="qr-history-btn text-purple-600 hover:text-purple-900 dark:hover:text-purple-400 p-1" title="${dict.btn_qr_code || 'QR-код'}"><i data-lucide="qr-code" class="w-4 h-4"></i></button><button data-id="${item.id}" class="apply-history-btn text-green-600 hover:text-green-900 dark:hover:text-green-400 p-1" title="${dict.btn_apply_utm || 'Применить UTM-параметры'}"><i data-lucide="wand-sparkles" class="w-4 h-4"></i></button><button data-url="${item.full_url || item.url}" class="copy-history-btn text-indigo-600 hover:text-indigo-900 dark:hover:text-indigo-400 p-1" title="${dict.btn_copy_link || 'Копировать ссылку'}"><i data-lucide="copy" class="w-4 h-4"></i></button><button data-id="${item.id}" class="delete-history-btn text-red-600 hover:text-red-900 dark:hover:text-red-400 p-1" title="${dict.btn_delete || 'Удалить'}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>`).join('')}</div>`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function renderTemplates() {
    const templatesContainer = document.getElementById('templatesContainer');
    if (!templatesContainer) {
        console.warn('templatesContainer not found');
        return;
    }

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
        templatesContainer.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">${items.map(t => `<div class="p-6 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 shadow-lg hover:shadow-xl transition-shadow duration-200 space-y-4"><div class="space-y-3"><h3 class="font-bold text-lg text-slate-900 dark:text-white truncate selectable-text">${t.name}</h3><div class="space-y-3"><div class="flex items-center gap-2"><div class="flex-1 min-w-0">${renderTag(t)}</div></div><div class="flex gap-1"><button data-id="${t.id}" class="apply-template-btn text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 p-2 rounded-lg transition-colors duration-150" title="${dict.btn_apply_template || 'Применить шаблон'}"><i data-lucide="wand-sparkles" class="w-4 h-4"></i></button><button data-id="${t.id}" class="view-template-btn text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors duration-150" title="${dict.btn_view_template || 'Просмотр шаблона'}"><i data-lucide="eye" class="w-4 h-4"></i></button><button data-id="${t.id}" class="delete-template-btn text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors duration-150" title="${dict.btn_delete_template || 'Удалить шаблон'}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div></div><div class="text-sm text-slate-600 dark:text-slate-300 space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700"><div class="flex justify-between"><span class="font-medium">${dict.grid_source || 'Источник:'}</span><span class="text-slate-900 dark:text-slate-100 truncate ml-2 selectable-text">${t.utm_source || '-'}</span></div><div class="flex justify-between"><span class="font-medium">${dict.grid_medium || 'Канал:'}</span><span class="text-slate-900 dark:text-slate-100 truncate ml-2 selectable-text">${t.utm_medium || '-'}</span></div><div class="flex justify-between"><span class="font-medium">${dict.grid_campaign || 'Кампания:'}</span><span class="text-slate-900 dark:text-slate-100 truncate ml-2 selectable-text">${t.utm_campaign || '-'}</span></div><div class="flex justify-between"><span class="font-medium">${dict.template_created || 'Создан:'}</span><span class="text-slate-900 dark:text-slate-100 truncate ml-2 selectable-text">${parseDate(t.created_at).toLocaleDateString(state.lang === 'en' ? 'en-US' : 'ru-RU')}</span></div></div></div>`).join('')}</div>`;
    } else {
        templatesContainer.innerHTML = `<div class="space-y-2">${items.map(t => `<div class="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 shadow flex justify-between items-center"><div><div class="flex items-center gap-2"><p class="font-bold selectable-text">${t.name}</p>${renderTag(t)}</div><p class="text-xs text-slate-500 truncate selectable-text">source: ${t.utm_source || '-'}, medium: ${t.utm_medium || '-'}, campaign: ${t.utm_campaign || '-'}</p><p class="text-xs text-slate-400 selectable-text">${dict.template_created || 'Создан:'} ${parseDate(t.created_at).toLocaleDateString(state.lang === 'en' ? 'en-US' : 'ru-RU')}</p></div><div class="flex gap-2"><button data-id="${t.id}" class="apply-template-btn text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1" title="${dict.btn_apply_template || 'Применить шаблон'}"><i data-lucide="wand-sparkles" class="w-4 h-4"></i></button><button data-id="${t.id}" class="view-template-btn text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1" title="${dict.btn_view_template || 'Просмотр шаблона'}"><i data-lucide="eye" class="w-4 h-4"></i></button><button data-id="${t.id}" class="delete-template-btn text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1" title="${dict.btn_delete_template || 'Удалить шаблон'}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>`).join('')}</div>`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function renderRecentTemplates() {
    const container = document.getElementById('recentTemplatesContainer');

    if (!container) {
        console.warn('recentTemplatesContainer not found');
        return;
    }

    container.innerHTML = '';

    const sortedTemplates = [...state.templates].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (sortedTemplates.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400">У вас пока нет шаблонов.</p>`;
        return;
    }

    const maxTemplates = 16;
    const templatesToShow = sortedTemplates.slice(0, maxTemplates);

    requestAnimationFrame(() => {
        for (const t of templatesToShow) {
            const button = document.createElement('button');
            button.dataset.templateId = t.id;
            button.className = "recent-template-btn text-sm px-4 py-2 rounded-full font-medium transition-all duration-200 border-0 shadow-sm";
            button.textContent = t.name;

            if (t.tag_color && t.tag_color !== 'null') {
                const textColor = getTextColorForBg(t.tag_color);
                button.style.backgroundColor = t.tag_color;
                button.style.color = textColor;
                button.style.border = 'none';
            } else {
                // Используем CSS-классы вместо inline styles для поддержки переключения темы
                button.classList.add('bg-slate-200', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-200', 'hover:bg-slate-300', 'dark:hover:bg-slate-600');
                button.style.border = 'none';
            }

            container.appendChild(button);
        }
    });
}

export function renderAll() {
    renderHistory();
    renderTemplates();
    renderRecentTemplates();
    renderTagSuggestions('templateTagSuggestions', 'template_tag_name', 'template_tag_color', 'templateColorPalette');
    renderTagSuggestions('modalTagSuggestions', 'newTemplateTagNameInput', 'newTemplateTagColorInput', 'newTemplateColorPalette');
}

/**
 * Возвращает до maxCount самых популярных тегов (по количеству шаблонов).
 */
export function getPopularTags(maxCount = 3) {
    const tagMap = {};
    for (const t of state.templates) {
        if (!t.tag_name) continue;
        const key = t.tag_name;
        if (!tagMap[key]) {
            tagMap[key] = { tag_name: t.tag_name, tag_color: t.tag_color || '', count: 0 };
        }
        tagMap[key].count++;
    }
    return Object.values(tagMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, maxCount);
}

/**
 * Возвращает до maxCount последних использованных тегов из истории.
 * Уникальные по tag_name, отсортированные по дате (история уже desc).
 */
export function getRecentTags(maxCount = 3) {
    const seen = new Set();
    const result = [];
    for (const h of state.history) {
        if (!h.tag_name) continue;
        if (seen.has(h.tag_name)) continue;
        seen.add(h.tag_name);
        result.push({ tag_name: h.tag_name, tag_color: h.tag_color || '' });
        if (result.length >= maxCount) break;
    }
    return result;
}

/**
 * Рендерит подсказки тегов (популярные + недавние) в указанный контейнер.
 */
export function renderTagSuggestions(containerId, tagNameInputId, tagColorInputId, paletteId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const dict = translations[state.lang] || translations.ru;
    const popularTags = getPopularTags(3);
    const recentTags = getRecentTags(3);

    // Показываем все недавние теги без фильтрации от популярных
    if (popularTags.length === 0 && recentTags.length === 0) {
        container.innerHTML = '';
        return;
    }

    const renderRow = (label, tags) => {
        if (tags.length === 0) return '';
        const buttons = tags.map(tag => {
            const textColor = getTextColorForBg(tag.tag_color);
            return `<button type="button" class="tag-suggestion-btn px-2 py-0.5 text-xs font-medium rounded-full cursor-pointer transition-all hover:opacity-80 hover:scale-105"
                style="background-color:${tag.tag_color || '#f1f5f9'};color:${textColor}"
                data-tag-name="${tag.tag_name}" data-tag-color="${tag.tag_color}"
                data-target-name="${tagNameInputId}" data-target-color="${tagColorInputId}" data-target-palette="${paletteId}">${tag.tag_name}</button>`;
        }).join('');
        return `<div class="flex items-center flex-wrap gap-1 mt-2">
            <span class="text-xs text-slate-400 dark:text-slate-500 mr-1">${label}:</span>${buttons}
        </div>`;
    };

    container.innerHTML =
        renderRow(dict.popular_tags || 'Популярные', popularTags) +
        renderRow(dict.recent_tags || 'Недавние', recentTags);
}
