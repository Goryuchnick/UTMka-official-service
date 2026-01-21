import { state, currentUser, showToast, renderHistory, renderTemplates, renderRecentTemplates, renderAll, switchView, applyFiltersAndSorting } from './ui.js';
import { parseCSV, PRESET_COLORS, ONBOARDING_KEY } from './utils.js';
import { translations } from './translations.js';

export async function fetchData() {
    try {
        // Загружаем данные последовательно (не параллельно) с таймаутами
        let historyData = [];
        try {
            const historyController = new AbortController();
            const historyTimeout = setTimeout(() => {
                historyController.abort();
            }, 15000);
            
            const historyRes = await fetch(`/history?user_email=${currentUser.email}`, {
                signal: historyController.signal,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            clearTimeout(historyTimeout);
            
            if (historyRes.ok) {
                historyData = await historyRes.json();
                state.history = historyData;
            } else {
                state.history = [];
            }
        } catch (e) {
            console.error('Ошибка при запросе истории:', e);
            state.history = [];
        }
        
        // Небольшая пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 100));
        
        let templatesData = [];
        try {
            const templatesController = new AbortController();
            const templatesTimeout = setTimeout(() => {
                templatesController.abort();
            }, 15000);
            
            const templatesRes = await fetch(`/templates?user_email=${currentUser.email}`, {
                signal: templatesController.signal,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            clearTimeout(templatesTimeout);
            
            if (templatesRes.ok) {
                templatesData = await templatesRes.json();
                state.templates = templatesData;
            } else {
                state.templates = [];
            }
        } catch (e) {
            console.error('Ошибка при запросе шаблонов:', e);
            state.templates = [];
        }
    } catch (e) {
        console.error('Критическая ошибка в fetchData:', e);
        state.history = [];
        state.templates = [];
    }
}

export async function initAppForUser() {
    try {
        if (!currentUser) {
            return;
        }
        
        // Убеждаемся, что viewMode установлен перед загрузкой данных
        if (!state.templatesViewMode) {
            state.templatesViewMode = localStorage.getItem('utmka_templatesViewMode') || 'table';
        }
        if (!state.historyViewMode) {
            state.historyViewMode = localStorage.getItem('utmka_historyViewMode') || 'table';
        }
        
        await fetchData();
        renderAll();
        
        // Дополнительная перерисовка после небольшой задержки для гарантии
        setTimeout(() => {
            renderAll();
        }, 200);
        
        // Инициализация палитры цветов
        try {
            const templateColorPalette = document.getElementById('templateColorPalette');
            const templateTagColor = document.getElementById('template_tag_color');
            if (templateColorPalette && templateTagColor && typeof initColorPalette === 'function') {
                initColorPalette(templateColorPalette, templateTagColor);
            }
        } catch (e) {
            console.warn('Error initializing color palette:', e);
        }
        
        try {
            const newTemplateColorPalette = document.getElementById('newTemplateColorPalette');
            const newTemplateTagColorInput = document.getElementById('newTemplateTagColorInput');
            if (newTemplateColorPalette && newTemplateTagColorInput && typeof initColorPalette === 'function') {
                initColorPalette(newTemplateColorPalette, newTemplateTagColorInput);
            }
        } catch (e) {
            console.warn('Error initializing new template color palette:', e);
        }
        
        // Переключение на нужную вкладку
        try {
            switchView(window.location.hash.substring(1) || 'generator');
        } catch (e) {
            console.warn('Error switching view:', e);
        }
        
        // Инициализация остальных компонентов
        try {
            if (typeof initDatePickers === 'function') {
                initDatePickers();
            }
        } catch (e) {
            console.warn('Error initializing date pickers:', e);
        }
        
        try {
            if (typeof initHistoryEventListeners === 'function') {
                initHistoryEventListeners();
            }
        } catch (e) {
            console.warn('Error initializing history event listeners:', e);
        }
        
        try {
            if (typeof initTemplatesEventListeners === 'function') {
                initTemplatesEventListeners();
            }
        } catch (e) {
            console.warn('Error initializing templates event listeners:', e);
        }
        
        // Синхронизация кнопок вида с сохранёнными настройками
        try {
            if (typeof syncViewModeButtons === 'function') {
                syncViewModeButtons();
            }
        } catch (e) {
            console.warn('Error syncing view mode buttons:', e);
        }
        
    } catch (e) {
        console.error('Error in initAppForUser:', e);
        throw e; // Пробрасываем ошибку дальше для обработки в startApp
    }
}

function initColorPalette(paletteContainer, colorInput) {
    if (!paletteContainer || !colorInput) return;

    paletteContainer.innerHTML = PRESET_COLORS.map(color =>
        `<div class="color-dot" style="background-color: ${color};" data-color="${color}"></div>`
    ).join('');

    paletteContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (!target.classList.contains('color-dot')) return;

        const isSelected = target.classList.contains('selected');

        paletteContainer.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('selected'));

        if (isSelected) {
            colorInput.value = '';
        } else {
            target.classList.add('selected');
            colorInput.value = target.dataset.color;
        }
    });
}

function initDatePickers() {
    document.querySelectorAll('.date-picker-btn').forEach(button => {
        const input = button.parentElement.querySelector('input');

        // Prevent any form submission when calendar button is clicked
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        try {
            // Проверяем доступность русской локализации
            const locale = (window.flatpickr && window.flatpickr.l10ns && window.flatpickr.l10ns.ru) ? "ru" : null;
            const fp = flatpickr(button, {
                dateFormat: "Y-m-d",
                ...(locale ? { locale: locale } : {}),
            onReady: (_, __, instance) => {
                const container = instance.calendarContainer;
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'flatpickr-custom-buttons';
                buttonContainer.innerHTML = `<button class='flatpickr-custom-btn' type='button'>Сегодня</button>`;

                buttonContainer.children[0].addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    instance.setDate(new Date(), true);
                    instance.close();
                });

                container.appendChild(buttonContainer);
            },
            onChange: (selectedDates, dateStr) => {
                // Эта функция теперь ТОЛЬКО обновляет значение поля
                if (input.value.includes(dateStr)) return;
                input.value = input.value ? `${input.value}_${dateStr}` : dateStr;
            },
            onClose: () => {
                // Ensure no form submission happens when calendar closes
                return false;
            }
            });
        } catch (error) {
            console.warn('Ошибка инициализации flatpickr:', error);
            // Пытаемся с английской локалью
            try {
                flatpickr(button, {
                    dateFormat: "Y-m-d",
                    onChange: (selectedDates, dateStr) => {
                        if (input.value.includes(dateStr)) return;
                        input.value = input.value ? `${input.value}_${dateStr}` : dateStr;
                    }
                });
            } catch (e) {
                console.error('Не удалось инициализировать flatpickr:', e);
            }
        }
    });
}

function initHistoryEventListeners() {
    // Search functionality
    const historySearchEl = document.getElementById('historySearch');
    if (historySearchEl) {
        historySearchEl.addEventListener('input', e => {
            state.historySearch = e.target.value;
            renderHistory();
        });
    }
    // View mode buttons обрабатываются общим обработчиком выше
}

function initTemplatesEventListeners() {
    // Search functionality
    document.getElementById('templatesSearch').addEventListener('input', e => {
        state.templatesSearch = e.target.value;
        renderTemplates();
    });
    // View mode buttons обрабатываются общим обработчиком выше
}

function syncViewModeButtons() {
    // История
    document.querySelectorAll('.history-view-btn').forEach(b => {
        b.classList.remove('active');
        if (b.dataset.viewMode === state.historyViewMode) {
            b.classList.add('active');
        }
    });
    // Шаблоны
    document.querySelectorAll('.templates-view-btn').forEach(b => {
        b.classList.remove('active');
        if (b.dataset.viewMode === state.templatesViewMode) {
            b.classList.add('active');
        }
    });
}
