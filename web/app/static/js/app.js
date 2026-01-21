import { state, currentUser, showToast, renderHistory, renderTemplates, renderAll, switchView } from './ui.js';
import { translations } from './translations.js';
import { initAppForUser, fetchData } from './api.js';
import { parseDate, getTextColorForBg, parseCSV, ONBOARDING_KEY } from './utils.js';

// Global error handling
window.addEventListener('error', (e) => {
    console.error('Глобальная ошибка:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Необработанное обещание отклонено:', e.reason);
});

// Initialize Russian localization for flatpickr (fallback)
window.addEventListener('load', () => {
    if (typeof flatpickr !== 'undefined' && flatpickr.l10ns && !flatpickr.l10ns.ru) {
        try {
            flatpickr.localize({
                ru: {
                    weekdays: { shorthand: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], longhand: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'] },
                    months: { shorthand: ['Янв', 'Фев', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сент', 'Окт', 'Нояб', 'Дек'], longhand: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'] },
                    firstDayOfWeek: 1,
                    rangeSeparator: ' — ',
                    weekAbbreviation: 'Нед',
                    scrollTitle: 'Прокрутите для увеличения',
                    toggleTitle: 'Нажмите для переключения',
                    amPM: ['ДП', 'ПП'],
                    yearAriaLabel: 'Год',
                    monthAriaLabel: 'Месяц',
                    hourAriaLabel: 'Час',
                    minuteAriaLabel: 'Минута',
                    time_24hr: true
                }
            });
        } catch (e) {
            console.warn('Не удалось загрузить встроенную локализацию flatpickr:', e);
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    } catch (e) {
        console.error('Error initializing lucide icons:', e);
    }

    // --- Theme toggle ---
    const themeToggle = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    // Apply theme on load
    if (savedTheme === 'dark') {
        htmlEl.classList.add('dark');
    } else {
        htmlEl.classList.remove('dark');
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = htmlEl.classList.contains('dark');
            if (isDark) {
                htmlEl.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            } else {
                htmlEl.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
            
            // Redraw data to update dark classes
            setTimeout(() => {
                if (typeof renderHistory === 'function') renderHistory();
                if (typeof renderTemplates === 'function') renderTemplates();
                // renderRecentTemplates is handled inside renderAll -> renderTemplates call chain or separately if needed
            }, 100);
        });
    }

    // Language toggle
    const langToggle = document.getElementById('lang-toggle');
    const langToggleLabel = document.getElementById('lang-toggle-label');
    
    state.lang = localStorage.getItem('utmka_lang') || 'ru';

    function applyTranslations(lang) {
        const dict = translations[lang] || translations.ru;

        const map = [
            ['[data-target=\"generator\"]', 'nav_generator', true],
            ['[data-target=\"history\"]', 'nav_history', true],
            ['[data-target=\"templates\"]', 'nav_templates', true],
            ['[data-target=\"help\"]', 'nav_help', true],
            ['#loader p', 'loader_text', false],
            ['#generatorTitle', 'generator_title', false],
            ['label[data-i18n=\"label_url\"]', 'label_url', false],
            ['label[data-i18n=\"label_source\"]', 'label_source', false],
            ['label[data-i18n=\"label_medium\"]', 'label_medium', false],
            ['label[data-i18n=\"label_campaign\"]', 'label_campaign', false],
            ['label[data-i18n=\"label_content\"]', 'label_content', false],
            ['label[data-i18n=\"label_term\"]', 'label_term', false],
            ['#generateBtn', 'btn_generate', false],
            ['#resultTitle', 'result_title', false],
            ['#saveAsTemplateBtn', 'save_as_template', false],
            ['#quickStartTitle', 'quick_start', false],
            ['#historyTitle', 'section_history', false],
            ['#newTemplateTitle', 'section_templates', false],
        ];

        map.forEach(([selector, key]) => {
            const el = document.querySelector(selector);
            if (el && dict[key]) {
                el.textContent = dict[key];
            }
        });

        // Placeholders
        const historySearch = document.getElementById('historySearch');
        if (historySearch && dict.history_search_ph) {
            historySearch.placeholder = dict.history_search_ph;
        }
        const historyDate = document.getElementById('historyDateRange');
        if (historyDate && dict.history_date_ph) {
            historyDate.placeholder = dict.history_date_ph;
        }
        const templatesSearch = document.getElementById('templatesSearch');
        if (templatesSearch && dict.templates_search_ph) {
            templatesSearch.placeholder = dict.templates_search_ph;
        }
        const modalTemplateSearch = document.getElementById('modalTemplateSearch');
        if (modalTemplateSearch && dict.history_search_ph) {
            modalTemplateSearch.placeholder = dict.history_search_ph;
        }
        const newTemplateNameInput = document.getElementById('newTemplateNameInput');
        if (newTemplateNameInput && dict.template_name_required_ph) {
            newTemplateNameInput.placeholder = dict.template_name_required_ph;
        }
        const newTemplateTagNameInput = document.getElementById('newTemplateTagNameInput');
        if (newTemplateTagNameInput && dict.template_tag_optional_ph) {
            newTemplateTagNameInput.placeholder = dict.template_tag_optional_ph;
        }

        // Buttons and other elements
        const showAllTemplatesBtn = document.getElementById('showAllTemplatesBtn');
        if (showAllTemplatesBtn && dict.btn_open_all) {
            showAllTemplatesBtn.textContent = dict.btn_open_all;
        }
        const importHistoryBtn = document.getElementById('importHistoryBtn');
        if (importHistoryBtn && dict.btn_import) {
            importHistoryBtn.innerHTML = `<i data-lucide="upload" class="w-4 h-4"></i> ${dict.btn_import}`;
            lucide.createIcons();
        }
        const importTemplatesBtn = document.getElementById('importTemplatesBtn');
        if (importTemplatesBtn && dict.btn_import) {
            importTemplatesBtn.innerHTML = `<i data-lucide="upload" class="w-4 h-4"></i> ${dict.btn_import}`;
            lucide.createIcons();
        }
        const templatesLibrary = document.getElementById('templatesLibraryTitle');
        if (templatesLibrary && dict.templates_library) {
            templatesLibrary.textContent = dict.templates_library;
        }
        const footerSubscribe = document.querySelector('footer span');
        if (footerSubscribe && dict.footer_subscribe) {
            footerSubscribe.textContent = dict.footer_subscribe;
        }
        const urlDetailModalTitle = document.querySelector('#urlDetailModal h3');
        if (urlDetailModalTitle && dict.modal_url_details) {
            urlDetailModalTitle.textContent = dict.modal_url_details;
        }
        const closeUrlDetailModal = document.getElementById('closeUrlDetailModal');
        if (closeUrlDetailModal && dict.btn_close) {
            closeUrlDetailModal.textContent = dict.btn_close;
        }
        const deleteUrlBtn = document.getElementById('deleteUrlBtn');
        if (deleteUrlBtn && dict.btn_delete) {
            deleteUrlBtn.textContent = dict.btn_delete;
        }
        const copyFullUrlBtn = document.getElementById('copyFullUrlBtn');
        if (copyFullUrlBtn && dict.btn_copy) {
            copyFullUrlBtn.textContent = dict.btn_copy;
        }
        const shortenUrlModalBtnText = document.getElementById('shortenUrlModalBtnText');
        if (shortenUrlModalBtnText && dict.btn_shorten_short) {
            shortenUrlModalBtnText.textContent = dict.btn_shorten_short;
        }
        const qrCodeModalBtnText = document.getElementById('qrCodeModalBtnText');
        if (qrCodeModalBtnText && dict.btn_qr_code) {
            qrCodeModalBtnText.textContent = dict.btn_qr_code;
        }
        const applyFromModalBtn = document.getElementById('applyFromModalBtn');
        if (applyFromModalBtn && dict.btn_use) {
            applyFromModalBtn.textContent = dict.btn_use;
        }
        const allTemplatesModalTitle = document.querySelector('#allTemplatesModal h3');
        if (allTemplatesModalTitle && dict.modal_all_templates) {
            allTemplatesModalTitle.textContent = dict.modal_all_templates;
        }
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn && dict.btn_close) {
            closeModalBtn.textContent = dict.btn_close;
        }
        const saveTemplateModalTitle = document.querySelector('#saveTemplateModal h3');
        if (saveTemplateModalTitle && dict.modal_save_template) {
            saveTemplateModalTitle.textContent = dict.modal_save_template;
        }
        const cancelSaveTemplate = document.getElementById('cancelSaveTemplate');
        if (cancelSaveTemplate && dict.btn_cancel) {
            cancelSaveTemplate.textContent = dict.btn_cancel;
        }
        const confirmSaveTemplate = document.getElementById('confirmSaveTemplate');
        if (confirmSaveTemplate && dict.btn_save) {
            confirmSaveTemplate.textContent = dict.btn_save;
        }
        const importModalTitle = document.querySelector('#importTemplatesModal h3');
        if (importModalTitle && dict.modal_import) {
            importModalTitle.textContent = dict.modal_import;
        }
        const importDescription = document.querySelector('#importTemplatesModal p');
        if (importDescription && dict.import_description) {
            importDescription.textContent = dict.import_description;
        }
        const downloadJsonTemplate = document.getElementById('downloadJsonTemplate');
        if (downloadJsonTemplate && dict.btn_download_json) {
            downloadJsonTemplate.textContent = dict.btn_download_json;
        }
        const downloadCsvTemplate = document.getElementById('downloadCsvTemplate');
        if (downloadCsvTemplate && dict.btn_download_csv) {
            downloadCsvTemplate.textContent = dict.btn_download_csv;
        }
        const closeImportModal = document.getElementById('closeImportModal');
        if (closeImportModal && dict.btn_cancel) {
            closeImportModal.textContent = dict.btn_cancel;
        }
        const triggerImportFile = document.getElementById('triggerImportFile');
        if (triggerImportFile && dict.btn_select_file) {
            triggerImportFile.textContent = dict.btn_select_file;
        }
        const templateCreatedLabel = document.getElementById('templateDetailCreatedLabel');
        if (templateCreatedLabel && dict.template_created) {
            templateCreatedLabel.textContent = dict.template_created;
        }
        const closeTemplateDetailModal = document.getElementById('closeTemplateDetailModal');
        if (closeTemplateDetailModal && dict.btn_close) {
            closeTemplateDetailModal.textContent = dict.btn_close;
        }
        const applyTemplateBtn = document.getElementById('applyTemplateBtn');
        if (applyTemplateBtn && dict.btn_apply) {
            applyTemplateBtn.textContent = dict.btn_apply;
        }

        // Generator buttons
        const copyButton = document.getElementById('copyButton');
        if (copyButton && dict.btn_copy) {
            copyButton.title = dict.btn_copy;
        }
        const shortenUrlButton = document.getElementById('shortenUrlButton');
        if (shortenUrlButton && dict.btn_shorten) {
            shortenUrlButton.title = dict.btn_shorten;
            const shortenText = shortenUrlButton.querySelector('span');
            if (shortenText && dict.btn_shorten_short) {
                shortenText.textContent = dict.btn_shorten_short;
            }
        }
        const qrCodeButton = document.getElementById('qrCodeButton');
        if (qrCodeButton && dict.btn_qr_code) {
            qrCodeButton.title = dict.btn_qr_code;
            const qrText = qrCodeButton.querySelector('span');
            if (qrText) {
                qrText.textContent = dict.btn_qr_code;
            }
        }

        // Language toggle label
        if (langToggleLabel) {
            langToggleLabel.textContent = lang.toUpperCase();
        }

        // Help view translations
        const helpViewTitle = document.getElementById('helpViewTitle');
        const helpOnboardingBtn = document.getElementById('helpOnboardingBtn');
        const helpTelegramBtn = document.getElementById('helpTelegramBtn');
        const helpWebsiteBtn = document.getElementById('helpWebsiteBtn');
        const helpGithubBtn = document.getElementById('helpGithubBtn');
        
        if (helpViewTitle && dict.help_view_title) {
            helpViewTitle.textContent = dict.help_view_title;
        }
        if (helpOnboardingBtn && dict.help_onboarding_btn) {
            helpOnboardingBtn.textContent = dict.help_onboarding_btn;
        }
        if (helpTelegramBtn && dict.help_telegram_btn) {
            helpTelegramBtn.textContent = dict.help_telegram_btn;
        }
        if (helpWebsiteBtn && dict.help_website_btn) {
            helpWebsiteBtn.textContent = dict.help_website_btn;
        }
        if (helpGithubBtn && dict.help_github_btn) {
            helpGithubBtn.textContent = dict.help_github_btn;
        }
    }

    if (langToggle) {
        langToggle.addEventListener('click', () => {
            state.lang = state.lang === 'ru' ? 'en' : 'ru';
            localStorage.setItem('utmka_lang', state.lang);
            applyTranslations(state.lang);
            // Redraw dynamic content
            if (typeof renderTemplates === 'function') renderTemplates();
            if (typeof renderHistory === 'function') renderHistory();
        });
    }

    // Add data-i18n attributes
    (function initI18nMarkers() {
        const labels = document.querySelectorAll('label');
        labels.forEach(label => {
            const text = label.textContent.trim();
            if (text.startsWith('URL')) label.setAttribute('data-i18n', 'label_url');
            else if (text.startsWith('Источник')) label.setAttribute('data-i18n', 'label_source');
            else if (text.startsWith('Канал')) label.setAttribute('data-i18n', 'label_medium');
            else if (text.startsWith('Кампания')) label.setAttribute('data-i18n', 'label_campaign');
            else if (text.startsWith('Содержание')) label.setAttribute('data-i18n', 'label_content');
            else if (text.startsWith('Ключевое')) label.setAttribute('data-i18n', 'label_term');
        });
    })();

    // Apply translations on start
    try {
        applyTranslations(state.lang);
    } catch (e) {
        console.error('Error applying translations:', e);
    }

    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');
    const navbar = document.getElementById('navbar');

    function startApp() {
        try {
            // Show content first
            if (loader) {
                loader.classList.add('hidden');
                loader.style.display = 'none';
            }
            if (mainContent) {
                mainContent.classList.remove('hidden');
                mainContent.style.display = '';
            }
            if (navbar) {
                navbar.classList.remove('hidden');
                navbar.style.display = '';
            }
            
            // Initialize lucide icons
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                try {
                    lucide.createIcons();
                } catch (e) {
                    console.error('Lucide icons initialization failed:', e);
                }
            } else {
                setTimeout(() => {
                    if (typeof lucide !== 'undefined' && lucide.createIcons) {
                        lucide.createIcons();
                    }
                }, 1000);
            }

            // Ensure footer is visible
            const footer = document.querySelector('footer');
            if (footer) {
                footer.style.display = '';
            }

            // Call initAppForUser
            if (typeof initAppForUser === 'function') {
                initAppForUser().catch(e => {
                    console.error('Error in initAppForUser:', e);
                });
            } else {
                console.error('initAppForUser is not defined!');
            }

            // Initialize history date picker if needed
            if (typeof initHistoryDateRangePicker === 'function') {
                initHistoryDateRangePicker();
            }

            // Initialize help button
            setTimeout(() => {
                try {
                    if (typeof initHelpButton === 'function') {
                        initHelpButton();
                    }
                    if (typeof lucide !== 'undefined' && lucide.createIcons) {
                        lucide.createIcons();
                    }
                } catch (e) {
                    console.error('Error reinitializing help button:', e);
                }
            }, 300);

        } catch (e) {
            console.error('Error in startApp:', e);
            if (loader) loader.classList.add('hidden');
            if (mainContent) mainContent.classList.remove('hidden');
            if (navbar) navbar.classList.remove('hidden');
        }
    }

    // --- Onboarding logic ---
    // (Simplification: keeping onboarding logic mostly inline or moved to a separate file if extremely large, but here it fits within reasonable bounds if we keep it concise. 
    // However, for strict separation, let's keep it here but refactored or move to a separate module if desired.
    // Given the task, I'll keep the structure similar but clean up.)
    
    // Help Button logic
    function initHelpButton() {
        try {
            const helpBtn = document.getElementById('help-btn');
            if (!helpBtn) return;

            helpBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                switchView('help');
                window.location.hash = 'help';
                if (typeof lucide !== 'undefined' && lucide.createIcons) {
                    lucide.createIcons();
                }
            };
        } catch (e) {
            console.error('Error initializing help button:', e);
        }
    }

    // App Initialization Logic
    function initializeApp() {
        console.log('Инициализация приложения...', new Date().toISOString());
        
        const loader = document.getElementById('loader');
        const mainContent = document.getElementById('main-content');
        const navbar = document.getElementById('navbar');
        
        if (!loader || !mainContent || !navbar) {
            console.error('Критические элементы DOM не найдены! Попытка повторной инициализации...');
            setTimeout(initializeApp, 100);
            return;
        }
        
        try {
            startApp();
            
            // Load favicon dynamically
            setTimeout(() => {
                const link = document.createElement('link');
                link.rel = 'icon';
                link.type = 'image/png';
                link.href = '/favicon.ico';
                link.onerror = function() { this.remove(); };
                document.head.appendChild(link);
            }, 1000);
        } catch (e) {
            console.error('Error starting app:', e);
            if (loader) loader.classList.add('hidden');
            if (mainContent) mainContent.classList.remove('hidden');
            if (navbar) navbar.classList.remove('hidden');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeApp, 10);
        });
    } else {
        setTimeout(initializeApp, 10);
    }
    
    // Fallback
    setTimeout(() => {
        const loader = document.getElementById('loader');
        const mainContent = document.getElementById('main-content');
        const navbar = document.getElementById('navbar');
        
        if (loader && !loader.classList.contains('hidden')) {
            console.warn('Fallback: принудительное отображение контента');
            if (loader) loader.classList.add('hidden');
            if (mainContent) mainContent.classList.remove('hidden');
            if (navbar) navbar.classList.remove('hidden');
            
            try {
                startApp();
            } catch (e) {
                console.error('Fallback: ошибка при запуске:', e);
            }
        }
    }, 2000);
});
