import { state, currentUser, showToast, renderHistory, renderTemplates, renderRecentTemplates, renderAll, switchView } from './ui.js';
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

            setTimeout(() => {
                if (typeof renderHistory === 'function') renderHistory();
                if (typeof renderTemplates === 'function') renderTemplates();
            }, 100);
        });
    }

    // --- Language toggle ---
    const langToggle = document.getElementById('lang-toggle');
    const langToggleLabel = document.getElementById('lang-toggle-label');

    state.lang = localStorage.getItem('utmka_lang') || 'ru';

    function applyTranslations(lang) {
        const dict = translations[lang] || translations.ru;

        const map = [
            ['[data-target="generator"]', 'nav_generator', true],
            ['[data-target="history"]', 'nav_history', true],
            ['[data-target="templates"]', 'nav_templates', true],
            ['[data-target="help"]', 'nav_help', true],
            ['#loader p', 'loader_text', false],
            ['#generatorTitle', 'generator_title', false],
            ['label[data-i18n="label_url"]', 'label_url', false],
            ['label[data-i18n="label_source"]', 'label_source', false],
            ['label[data-i18n="label_medium"]', 'label_medium', false],
            ['label[data-i18n="label_campaign"]', 'label_campaign', false],
            ['label[data-i18n="label_content"]', 'label_content', false],
            ['label[data-i18n="label_term"]', 'label_term', false],
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
        if (historySearch && dict.history_search_ph) historySearch.placeholder = dict.history_search_ph;
        const historyDate = document.getElementById('historyDateRange');
        if (historyDate && dict.history_date_ph) historyDate.placeholder = dict.history_date_ph;
        const templatesSearch = document.getElementById('templatesSearch');
        if (templatesSearch && dict.templates_search_ph) templatesSearch.placeholder = dict.templates_search_ph;
        const modalTemplateSearch = document.getElementById('modalTemplateSearch');
        if (modalTemplateSearch && dict.history_search_ph) modalTemplateSearch.placeholder = dict.history_search_ph;
        const newTemplateNameInput = document.getElementById('newTemplateNameInput');
        if (newTemplateNameInput && dict.template_name_required_ph) newTemplateNameInput.placeholder = dict.template_name_required_ph;
        const newTemplateTagNameInput = document.getElementById('newTemplateTagNameInput');
        if (newTemplateTagNameInput && dict.template_tag_optional_ph) newTemplateTagNameInput.placeholder = dict.template_tag_optional_ph;

        // Buttons and other elements
        const showAllTemplatesBtn = document.getElementById('showAllTemplatesBtn');
        if (showAllTemplatesBtn && dict.btn_open_all) showAllTemplatesBtn.textContent = dict.btn_open_all;
        const importHistoryBtn = document.getElementById('importHistoryBtn');
        if (importHistoryBtn && dict.btn_import) {
            importHistoryBtn.innerHTML = `<i data-lucide="upload" class="w-4 h-4"></i> ${dict.btn_import}`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        const importTemplatesBtn = document.getElementById('importTemplatesBtn');
        if (importTemplatesBtn && dict.btn_import) {
            importTemplatesBtn.innerHTML = `<i data-lucide="upload" class="w-4 h-4"></i> ${dict.btn_import}`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        const templatesLibrary = document.getElementById('templatesLibraryTitle');
        if (templatesLibrary && dict.templates_library) templatesLibrary.textContent = dict.templates_library;
        const footerSubscribe = document.querySelector('footer span');
        if (footerSubscribe && dict.footer_subscribe) footerSubscribe.textContent = dict.footer_subscribe;
        const urlDetailModalTitle = document.querySelector('#urlDetailModal h3');
        if (urlDetailModalTitle && dict.modal_url_details) urlDetailModalTitle.textContent = dict.modal_url_details;
        const closeUrlDetailModal = document.getElementById('closeUrlDetailModal');
        if (closeUrlDetailModal && dict.btn_close) closeUrlDetailModal.textContent = dict.btn_close;
        const deleteUrlBtn = document.getElementById('deleteUrlBtn');
        if (deleteUrlBtn && dict.btn_delete) deleteUrlBtn.textContent = dict.btn_delete;
        const copyFullUrlBtn = document.getElementById('copyFullUrlBtn');
        if (copyFullUrlBtn && dict.btn_copy) copyFullUrlBtn.textContent = dict.btn_copy;
        const shortenUrlModalBtnText = document.getElementById('shortenUrlModalBtnText');
        if (shortenUrlModalBtnText && dict.btn_shorten_short) shortenUrlModalBtnText.textContent = dict.btn_shorten_short;
        const qrCodeModalBtnText = document.getElementById('qrCodeModalBtnText');
        if (qrCodeModalBtnText && dict.btn_qr_code) qrCodeModalBtnText.textContent = dict.btn_qr_code;
        const applyFromModalBtn = document.getElementById('applyFromModalBtn');
        if (applyFromModalBtn && dict.btn_use) applyFromModalBtn.textContent = dict.btn_use;
        const allTemplatesModalTitle = document.querySelector('#allTemplatesModal h3');
        if (allTemplatesModalTitle && dict.modal_all_templates) allTemplatesModalTitle.textContent = dict.modal_all_templates;
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn && dict.btn_close) closeModalBtn.textContent = dict.btn_close;
        const saveTemplateModalTitle = document.querySelector('#saveTemplateModal h3');
        if (saveTemplateModalTitle && dict.modal_save_template) saveTemplateModalTitle.textContent = dict.modal_save_template;
        const cancelSaveTemplate = document.getElementById('cancelSaveTemplate');
        if (cancelSaveTemplate && dict.btn_cancel) cancelSaveTemplate.textContent = dict.btn_cancel;
        const confirmSaveTemplate = document.getElementById('confirmSaveTemplate');
        if (confirmSaveTemplate && dict.btn_save) confirmSaveTemplate.textContent = dict.btn_save;
        const importModalTitle = document.querySelector('#importTemplatesModal h3');
        if (importModalTitle && dict.modal_import) importModalTitle.textContent = dict.modal_import;
        const importDescription = document.querySelector('#importTemplatesModal p');
        if (importDescription && dict.import_description) importDescription.textContent = dict.import_description;
        const downloadJsonTemplate = document.getElementById('downloadJsonTemplate');
        if (downloadJsonTemplate && dict.btn_download_json) downloadJsonTemplate.textContent = dict.btn_download_json;
        const downloadCsvTemplate = document.getElementById('downloadCsvTemplate');
        if (downloadCsvTemplate && dict.btn_download_csv) downloadCsvTemplate.textContent = dict.btn_download_csv;
        const closeImportModal = document.getElementById('closeImportModal');
        if (closeImportModal && dict.btn_cancel) closeImportModal.textContent = dict.btn_cancel;
        const triggerImportFile = document.getElementById('triggerImportFile');
        if (triggerImportFile && dict.btn_select_file) triggerImportFile.textContent = dict.btn_select_file;
        const templateCreatedLabel = document.getElementById('templateDetailCreatedLabel');
        if (templateCreatedLabel && dict.template_created) templateCreatedLabel.textContent = dict.template_created;
        const closeTemplateDetailModalBtn = document.getElementById('closeTemplateDetailModal');
        if (closeTemplateDetailModalBtn && dict.btn_close) closeTemplateDetailModalBtn.textContent = dict.btn_close;
        const applyTemplateBtn = document.getElementById('applyTemplateBtn');
        if (applyTemplateBtn && dict.btn_apply) applyTemplateBtn.textContent = dict.btn_apply;

        // Generator buttons
        const copyButton = document.getElementById('copyButton');
        if (copyButton && dict.btn_copy) copyButton.title = dict.btn_copy;
        const shortenUrlButton = document.getElementById('shortenUrlButton');
        if (shortenUrlButton && dict.btn_shorten) {
            shortenUrlButton.title = dict.btn_shorten;
            const shortenText = shortenUrlButton.querySelector('span');
            if (shortenText && dict.btn_shorten_short) shortenText.textContent = dict.btn_shorten_short;
        }
        const qrCodeButton = document.getElementById('qrCodeButton');
        if (qrCodeButton && dict.btn_qr_code) {
            qrCodeButton.title = dict.btn_qr_code;
            const qrText = qrCodeButton.querySelector('span');
            if (qrText) qrText.textContent = dict.btn_qr_code;
        }

        if (langToggleLabel) langToggleLabel.textContent = lang.toUpperCase();

        // Help view translations
        const helpViewTitle = document.getElementById('helpViewTitle');
        const helpOnboardingBtn = document.getElementById('helpOnboardingBtn');
        const helpTelegramBtn = document.getElementById('helpTelegramBtn');
        const helpWebsiteBtn = document.getElementById('helpWebsiteBtn');
        const helpGithubBtn = document.getElementById('helpGithubBtn');

        if (helpViewTitle && dict.help_view_title) helpViewTitle.textContent = dict.help_view_title;
        if (helpOnboardingBtn && dict.help_onboarding_btn) helpOnboardingBtn.textContent = dict.help_onboarding_btn;
        if (helpTelegramBtn && dict.help_telegram_btn) helpTelegramBtn.textContent = dict.help_telegram_btn;
        if (helpWebsiteBtn && dict.help_website_btn) helpWebsiteBtn.textContent = dict.help_website_btn;
        if (helpGithubBtn && dict.help_github_btn) helpGithubBtn.textContent = dict.help_github_btn;
    }

    if (langToggle) {
        langToggle.addEventListener('click', () => {
            state.lang = state.lang === 'ru' ? 'en' : 'ru';
            localStorage.setItem('utmka_lang', state.lang);
            applyTranslations(state.lang);
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
            if (loader) { loader.classList.add('hidden'); loader.style.display = 'none'; }
            if (mainContent) { mainContent.classList.remove('hidden'); mainContent.style.display = ''; }
            if (navbar) { navbar.classList.remove('hidden'); navbar.style.display = ''; }

            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                try { lucide.createIcons(); } catch (e) { console.error('Lucide icons initialization failed:', e); }
            } else {
                setTimeout(() => { if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons(); }, 1000);
            }

            const footer = document.querySelector('footer');
            if (footer) footer.style.display = '';

            if (typeof initAppForUser === 'function') {
                initAppForUser().catch(e => console.error('Error in initAppForUser:', e));
            }

            setTimeout(() => {
                try {
                    initHelpButton();
                    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
                } catch (e) { console.error('Error reinitializing help button:', e); }
            }, 300);

        } catch (e) {
            console.error('Error in startApp:', e);
            if (loader) loader.classList.add('hidden');
            if (mainContent) mainContent.classList.remove('hidden');
            if (navbar) navbar.classList.remove('hidden');
        }
    }

    // --- Navigation ---
    document.querySelectorAll('[data-target]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.dataset.target;
            switchView(target);
            window.location.hash = target;
        });
    });

    // --- View Mode Buttons ---
    document.querySelectorAll('.history-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.viewMode;
            state.historyViewMode = mode;
            localStorage.setItem('utmka_historyViewMode', mode);
            document.querySelectorAll('.history-view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderHistory();
        });
    });

    document.querySelectorAll('.templates-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.viewMode;
            state.templatesViewMode = mode;
            localStorage.setItem('utmka_templatesViewMode', mode);
            document.querySelectorAll('.templates-view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTemplates();
        });
    });

    // --- Table header sorting ---
    document.addEventListener('click', (e) => {
        const th = e.target.closest('[data-sort]');
        if (!th) return;

        const column = th.dataset.sort;
        const container = th.closest('[data-view]') || th.closest('.glass-card');

        if (container && (container.dataset.view === 'history' || container.querySelector('#historyContainer'))) {
            if (state.historySortColumn === column) {
                state.historySortDirection = state.historySortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.historySortColumn = column;
                state.historySortDirection = 'asc';
            }
            renderHistory();
        } else {
            if (state.templatesSortColumn === column) {
                state.templatesSortDirection = state.templatesSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.templatesSortColumn = column;
                state.templatesSortDirection = 'asc';
            }
            renderTemplates();
        }
    });

    // --- Generator Form ---
    const utmForm = document.getElementById('utmForm');
    const resultUrl = document.getElementById('resultUrl');
    const addToTemplateBtn = document.getElementById('addToTemplateBtn');

    if (utmForm) {
        utmForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let url = document.getElementById('url').value.trim();
            if (!url) { showToast('Введите URL', 'error'); return; }
            if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

            try {
                const urlObj = new URL(url);
                const params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
                params.forEach(p => {
                    const val = document.getElementById(p)?.value?.trim();
                    if (val) urlObj.searchParams.set(p, val);
                });
                const finalUrl = urlObj.toString();
                resultUrl.value = finalUrl;
                if (addToTemplateBtn) addToTemplateBtn.disabled = false;

                // Save to history
                try {
                    await fetch('/history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_email: currentUser.email, url: finalUrl })
                    });
                    await fetchData();
                    renderAll();
                    showToast('Ссылка создана и сохранена!');
                } catch (err) {
                    console.error('Error saving to history:', err);
                    showToast('Ссылка создана!');
                }
            } catch (err) {
                showToast('Некорректный URL', 'error');
            }
        });
    }

    // Clear form
    const clearFormButton = document.getElementById('clearFormButton');
    if (clearFormButton) {
        clearFormButton.addEventListener('click', () => {
            if (utmForm) utmForm.reset();
            if (resultUrl) resultUrl.value = '';
            if (addToTemplateBtn) addToTemplateBtn.disabled = true;
        });
    }

    // Copy button
    const copyButton = document.getElementById('copyButton');
    if (copyButton) {
        copyButton.addEventListener('click', async () => {
            const url = resultUrl?.value;
            if (!url) { showToast('Сначала сгенерируйте ссылку', 'error'); return; }
            try {
                await navigator.clipboard.writeText(url);
                showToast('Скопировано!');
            } catch { showToast('Ошибка копирования', 'error'); }
        });
    }

    // Shorten URL
    const shortenUrlButton = document.getElementById('shortenUrlButton');
    if (shortenUrlButton) {
        shortenUrlButton.addEventListener('click', async () => {
            const url = resultUrl?.value;
            if (!url) { showToast('Сначала сгенерируйте ссылку', 'error'); return; }
            try {
                const res = await fetch(`https://clck.ru/--?url=${encodeURIComponent(url)}`);
                const shortUrl = await res.text();
                if (shortUrl && !shortUrl.includes('error')) {
                    resultUrl.value = shortUrl.trim();
                    await navigator.clipboard.writeText(shortUrl.trim());
                    showToast('Короткая ссылка скопирована!');
                }
            } catch { showToast('Ошибка сокращения ссылки', 'error'); }
        });
    }

    // QR Code
    const qrCodeButton = document.getElementById('qrCodeButton');
    if (qrCodeButton) {
        qrCodeButton.addEventListener('click', () => {
            const url = resultUrl?.value;
            if (!url) { showToast('Сначала сгенерируйте ссылку', 'error'); return; }
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`;
            window.open(qrUrl, '_blank');
        });
    }

    // --- Save as Template Modal ---
    if (addToTemplateBtn) {
        addToTemplateBtn.addEventListener('click', () => {
            const modal = document.getElementById('saveTemplateModal');
            if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
        });
    }

    document.getElementById('cancelSaveTemplate')?.addEventListener('click', () => {
        const modal = document.getElementById('saveTemplateModal');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    });

    document.getElementById('confirmSaveTemplate')?.addEventListener('click', async () => {
        const name = document.getElementById('newTemplateNameInput')?.value?.trim();
        if (!name) { showToast('Введите название шаблона', 'error'); return; }

        const tagName = document.getElementById('newTemplateTagNameInput')?.value?.trim() || '';
        const tagColor = document.getElementById('newTemplateTagColorInput')?.value || '';

        const template = {
            user_email: currentUser.email,
            name,
            utm_source: document.getElementById('utm_source')?.value?.trim() || '',
            utm_medium: document.getElementById('utm_medium')?.value?.trim() || '',
            utm_campaign: document.getElementById('utm_campaign')?.value?.trim() || '',
            utm_content: document.getElementById('utm_content')?.value?.trim() || '',
            utm_term: document.getElementById('utm_term')?.value?.trim() || '',
            tag_name: tagName,
            tag_color: tagColor
        };

        try {
            const res = await fetch('/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(template)
            });
            if (res.ok) {
                await fetchData();
                renderAll();
                showToast('Шаблон сохранён!');
                const modal = document.getElementById('saveTemplateModal');
                if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
                document.getElementById('newTemplateNameInput').value = '';
                document.getElementById('newTemplateTagNameInput').value = '';
                document.getElementById('newTemplateTagColorInput').value = '';
            }
        } catch (err) { showToast('Ошибка сохранения шаблона', 'error'); }
    });

    // --- Template Form (create new) ---
    const templateForm = document.getElementById('templateForm');
    if (templateForm) {
        templateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('template_name')?.value?.trim();
            if (!name) { showToast('Введите название шаблона', 'error'); return; }

            const template = {
                user_email: currentUser.email,
                name,
                utm_source: document.getElementById('template_utm_source')?.value?.trim() || '',
                utm_medium: document.getElementById('template_utm_medium')?.value?.trim() || '',
                utm_campaign: document.getElementById('template_utm_campaign')?.value?.trim() || '',
                utm_content: document.getElementById('template_utm_content')?.value?.trim() || '',
                utm_term: document.getElementById('template_utm_term')?.value?.trim() || '',
                tag_name: document.getElementById('template_tag_name')?.value?.trim() || '',
                tag_color: document.getElementById('template_tag_color')?.value || ''
            };

            try {
                const res = await fetch('/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(template)
                });
                if (res.ok) {
                    templateForm.reset();
                    await fetchData();
                    renderAll();
                    showToast('Шаблон создан!');
                }
            } catch (err) { showToast('Ошибка создания шаблона', 'error'); }
        });
    }

    // --- History Event Delegation ---
    document.addEventListener('click', async (e) => {
        // Delete history
        const deleteBtn = e.target.closest('.delete-history-btn');
        if (deleteBtn) {
            e.stopPropagation();
            const id = deleteBtn.dataset.id;
            try {
                await fetch(`/history/${id}`, { method: 'DELETE' });
                await fetchData();
                renderAll();
                showToast('Запись удалена');
            } catch { showToast('Ошибка удаления', 'error'); }
            return;
        }

        // Copy history URL
        const copyBtn = e.target.closest('.copy-history-btn');
        if (copyBtn) {
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(copyBtn.dataset.url);
                showToast('Скопировано!');
            } catch { showToast('Ошибка копирования', 'error'); }
            return;
        }

        // Shorten history URL
        const shortenBtn = e.target.closest('.shorten-history-btn');
        if (shortenBtn) {
            e.stopPropagation();
            const id = shortenBtn.dataset.id;
            const url = shortenBtn.dataset.url;
            try {
                const res = await fetch(`https://clck.ru/--?url=${encodeURIComponent(url)}`);
                const shortUrl = await res.text();
                if (shortUrl && !shortUrl.includes('error')) {
                    await fetch(`/history/${id}/short_url`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ short_url: shortUrl.trim() })
                    });
                    await navigator.clipboard.writeText(shortUrl.trim());
                    await fetchData();
                    renderAll();
                    showToast('Короткая ссылка скопирована!');
                }
            } catch { showToast('Ошибка сокращения', 'error'); }
            return;
        }

        // QR code for history
        const qrBtn = e.target.closest('.qr-history-btn');
        if (qrBtn) {
            e.stopPropagation();
            const url = qrBtn.dataset.url;
            window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`, '_blank');
            return;
        }

        // Apply history UTM params
        const applyBtn = e.target.closest('.apply-history-btn');
        if (applyBtn) {
            e.stopPropagation();
            const id = applyBtn.dataset.id;
            const item = state.history.find(h => h.id == id);
            if (item) {
                applyTemplateToForm(item);
                switchView('generator');
            }
            return;
        }

        // Open URL detail modal on row click
        const historyItem = e.target.closest('.history-item');
        if (historyItem && !e.target.closest('button')) {
            const id = historyItem.dataset.id;
            const item = state.history.find(h => h.id == id);
            if (item) openUrlDetailModal(item);
            return;
        }

        // Delete template
        const deleteTemplateBtn = e.target.closest('.delete-template-btn');
        if (deleteTemplateBtn) {
            e.stopPropagation();
            const id = deleteTemplateBtn.dataset.id;
            try {
                await fetch(`/templates/${id}`, { method: 'DELETE' });
                await fetchData();
                renderAll();
                showToast('Шаблон удалён');
            } catch { showToast('Ошибка удаления', 'error'); }
            return;
        }

        // Apply template
        const applyTemplateBtn2 = e.target.closest('.apply-template-btn');
        if (applyTemplateBtn2) {
            e.stopPropagation();
            const id = applyTemplateBtn2.dataset.id;
            const template = state.templates.find(t => t.id == id);
            if (template) {
                applyTemplateToForm(template);
                switchView('generator');
            }
            return;
        }

        // View template detail
        const viewTemplateBtn = e.target.closest('.view-template-btn');
        if (viewTemplateBtn) {
            e.stopPropagation();
            const id = viewTemplateBtn.dataset.id;
            const template = state.templates.find(t => t.id == id);
            if (template) openTemplateDetailModal(template);
            return;
        }

        // Recent template buttons
        const recentTemplateBtn = e.target.closest('.recent-template-btn');
        if (recentTemplateBtn) {
            const id = recentTemplateBtn.dataset.templateId;
            const template = state.templates.find(t => t.id == id);
            if (template) {
                applyTemplateToForm(template);
                switchView('generator');
            }
            return;
        }
    });

    // --- Helper: Apply template to form ---
    function applyTemplateToForm(item) {
        const fields = { utm_source: 'utm_source', utm_medium: 'utm_medium', utm_campaign: 'utm_campaign', utm_content: 'utm_content', utm_term: 'utm_term' };
        for (const [key, id] of Object.entries(fields)) {
            const el = document.getElementById(id);
            if (el) el.value = item[key] || '';
        }
        // If it's a history item with a URL, also set the URL field
        if (item.full_url || item.url) {
            try {
                const urlObj = new URL(item.full_url || item.url);
                document.getElementById('url').value = urlObj.host + urlObj.pathname + (urlObj.search ? '' : '');
            } catch {}
        }
    }

    // --- URL Detail Modal ---
    let currentDetailItem = null;

    function openUrlDetailModal(item) {
        currentDetailItem = item;
        const modal = document.getElementById('urlDetailModal');
        document.getElementById('fullUrlText').value = item.full_url || item.url || '';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    document.getElementById('closeUrlDetailModal')?.addEventListener('click', () => {
        document.getElementById('urlDetailModal').classList.add('hidden');
        document.getElementById('urlDetailModal').classList.remove('flex');
        currentDetailItem = null;
    });

    document.getElementById('deleteUrlBtn')?.addEventListener('click', async () => {
        if (!currentDetailItem) return;
        try {
            await fetch(`/history/${currentDetailItem.id}`, { method: 'DELETE' });
            await fetchData();
            renderAll();
            showToast('Удалено');
            document.getElementById('urlDetailModal').classList.add('hidden');
            document.getElementById('urlDetailModal').classList.remove('flex');
            currentDetailItem = null;
        } catch { showToast('Ошибка', 'error'); }
    });

    document.getElementById('copyFullUrlBtn')?.addEventListener('click', async () => {
        const url = document.getElementById('fullUrlText')?.value;
        if (!url) return;
        try { await navigator.clipboard.writeText(url); showToast('Скопировано!'); } catch { showToast('Ошибка', 'error'); }
    });

    document.getElementById('shortenUrlModalBtn')?.addEventListener('click', async () => {
        if (!currentDetailItem) return;
        const url = currentDetailItem.full_url || currentDetailItem.url;
        try {
            const res = await fetch(`https://clck.ru/--?url=${encodeURIComponent(url)}`);
            const shortUrl = await res.text();
            if (shortUrl && !shortUrl.includes('error')) {
                await fetch(`/history/${currentDetailItem.id}/short_url`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ short_url: shortUrl.trim() })
                });
                await navigator.clipboard.writeText(shortUrl.trim());
                await fetchData();
                renderAll();
                showToast('Короткая ссылка скопирована!');
            }
        } catch { showToast('Ошибка сокращения', 'error'); }
    });

    document.getElementById('qrCodeModalBtn')?.addEventListener('click', () => {
        if (!currentDetailItem) return;
        const url = currentDetailItem.short_url || currentDetailItem.full_url || currentDetailItem.url;
        window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`, '_blank');
    });

    document.getElementById('applyFromModalBtn')?.addEventListener('click', () => {
        if (!currentDetailItem) return;
        applyTemplateToForm(currentDetailItem);
        document.getElementById('urlDetailModal').classList.add('hidden');
        document.getElementById('urlDetailModal').classList.remove('flex');
        switchView('generator');
        currentDetailItem = null;
    });

    // --- All Templates Modal ---
    document.getElementById('showAllTemplatesBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('allTemplatesModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        renderModalTemplates('');
    });

    document.getElementById('closeModalBtn')?.addEventListener('click', () => {
        document.getElementById('allTemplatesModal').classList.add('hidden');
        document.getElementById('allTemplatesModal').classList.remove('flex');
    });

    document.getElementById('modalTemplateSearch')?.addEventListener('input', (e) => {
        renderModalTemplates(e.target.value);
    });

    function renderModalTemplates(search) {
        const container = document.getElementById('modalTemplatesList');
        if (!container) return;
        let templates = state.templates;
        if (search) {
            const q = search.toLowerCase();
            templates = templates.filter(t => (t.name || '').toLowerCase().includes(q) || (t.utm_source || '').toLowerCase().includes(q));
        }
        container.innerHTML = templates.map(t => `
            <div class="p-3 border dark:border-slate-700 rounded-lg flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                    <p class="font-medium text-sm">${t.name}</p>
                    <p class="text-xs text-slate-500">${t.utm_source || '-'} / ${t.utm_medium || '-'}</p>
                </div>
                <button data-id="${t.id}" class="modal-apply-template-btn px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500 transition-colors">Применить</button>
            </div>
        `).join('');
    }

    document.getElementById('modalTemplatesList')?.addEventListener('click', (e) => {
        const applyBtn = e.target.closest('.modal-apply-template-btn');
        if (!applyBtn) return;
        const templateId = applyBtn.dataset.id;
        const template = state.templates.find(t => t.id == templateId);
        if (template) {
            applyTemplateToForm(template);
            switchView('generator');
        }
    });

    // --- Template Detail Modal ---
    let currentTemplateDetail = null;

    function openTemplateDetailModal(template) {
        currentTemplateDetail = template;
        document.getElementById('templateDetailName').textContent = template.name;
        document.getElementById('templateDetailSource').textContent = template.utm_source || '-';
        document.getElementById('templateDetailMedium').textContent = template.utm_medium || '-';
        document.getElementById('templateDetailCampaign').textContent = template.utm_campaign || '-';
        document.getElementById('templateDetailContent').textContent = template.utm_content || '-';
        document.getElementById('templateDetailTerm').textContent = template.utm_term || '-';
        document.getElementById('templateDetailCreated').textContent = parseDate(template.created_at).toLocaleString('ru-RU');

        const tagContainer = document.getElementById('templateDetailTag');
        if (template.tag_name) {
            const textColor = getTextColorForBg(template.tag_color);
            tagContainer.innerHTML = `<span class="px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap shadow-sm transition-all duration-200" style="background-color:${template.tag_color || '#f1f5f9'}; color: ${textColor}; margin: 2px;">${template.tag_name}</span>`;
        } else {
            tagContainer.innerHTML = '<span class="text-slate-500">-</span>';
        }

        const modal = document.getElementById('templateDetailModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    document.getElementById('closeTemplateDetailModal')?.addEventListener('click', () => {
        currentTemplateDetail = null;
        document.getElementById('templateDetailModal').classList.add('hidden');
        document.getElementById('templateDetailModal').classList.remove('flex');
    });

    document.getElementById('applyTemplateBtn')?.addEventListener('click', () => {
        if (currentTemplateDetail) {
            applyTemplateToForm(currentTemplateDetail);
            document.getElementById('templateDetailModal').classList.add('hidden');
            document.getElementById('templateDetailModal').classList.remove('flex');
            switchView('generator');
            currentTemplateDetail = null;
        }
    });

    // --- Import/Export Templates ---
    const importFileInput = document.getElementById('importFileInput');
    const importTemplatesModal = document.getElementById('importTemplatesModal');

    document.getElementById('importTemplatesBtn')?.addEventListener('click', () => {
        importTemplatesModal.classList.remove('hidden');
        importTemplatesModal.classList.add('flex');
    });
    document.getElementById('closeImportModal')?.addEventListener('click', () => {
        importTemplatesModal.classList.add('hidden');
        importTemplatesModal.classList.remove('flex');
    });

    document.getElementById('downloadJsonTemplate')?.addEventListener('click', async () => {
        try {
            const response = await fetch('/download_template_with_folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: 'templates_example.json' })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                showToast(`Файл сохранен в: ${result.folder_path}\\${result.filename}`);
            } else { throw new Error(result.error || 'Ошибка при скачивании файла'); }
        } catch (error) { showToast(`Ошибка: ${error.message}`, 'error'); }
    });

    document.getElementById('downloadCsvTemplate')?.addEventListener('click', async () => {
        try {
            const response = await fetch('/download_template_with_folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: 'templates_example.csv' })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                showToast(`Файл сохранен в: ${result.folder_path}\\${result.filename}`);
            } else { throw new Error(result.error || 'Ошибка при скачивании файла'); }
        } catch (error) { showToast(`Ошибка: ${error.message}`, 'error'); }
    });

    document.getElementById('triggerImportFile')?.addEventListener('click', () => {
        importTemplatesModal.classList.add('hidden');
        importTemplatesModal.classList.remove('flex');
        importFileInput.click();
    });

    importFileInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                let templatesToImport;
                if (file.name.endsWith('.json')) {
                    templatesToImport = JSON.parse(e.target.result);
                } else if (file.name.endsWith('.csv')) {
                    templatesToImport = parseCSV(e.target.result);
                } else { throw new Error('Неподдерживаемый формат файла.'); }

                if (!Array.isArray(templatesToImport)) throw new Error('Файл должен содержать массив объектов.');
                if (templatesToImport.length === 0) throw new Error('Файл не содержит данных.');

                const templatesWithUser = templatesToImport.map(t => ({ ...t, user_email: currentUser.email }));

                const response = await fetch('/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(templatesWithUser)
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    await fetchData();
                    renderAll();
                    showToast(`Импортировано ${result.imported_count} шаблонов.`);
                } else { throw new Error(result.error || 'Ошибка импорта'); }
            } catch (error) { showToast(`Ошибка: ${error.message}`, 'error'); }
            finally { importFileInput.value = ''; }
        };
        reader.readAsText(file);
    });

    // Export templates
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => exportData('json'));
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => exportData('csv'));

    async function exportData(format) {
        try {
            const response = await fetch('/export_templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: currentUser.email, format })
            });
            const result = await response.json();
            if (result.success) showToast(`Файл сохранен: ${result.filename}`);
            else showToast(result.error || 'Ошибка экспорта', 'error');
        } catch (error) { showToast(`Ошибка: ${error.message}`, 'error'); }
    }

    // Export history
    document.getElementById('exportHistoryJsonBtn')?.addEventListener('click', () => exportHistoryData('json'));
    document.getElementById('exportHistoryCsvBtn')?.addEventListener('click', () => exportHistoryData('csv'));

    async function exportHistoryData(format) {
        try {
            const response = await fetch('/export_history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: currentUser.email, format })
            });
            const result = await response.json();
            if (result.success) showToast(`Файл сохранен: ${result.filename}`);
            else showToast(result.error || 'Ошибка экспорта', 'error');
        } catch (error) { showToast(`Ошибка: ${error.message}`, 'error'); }
    }

    // Import history
    const importHistoryFileInput = document.getElementById('importHistoryFileInput');
    document.getElementById('importHistoryBtn')?.addEventListener('click', () => { importHistoryFileInput.click(); });

    importHistoryFileInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                let historyToImport;
                if (file.name.endsWith('.json')) historyToImport = JSON.parse(e.target.result);
                else if (file.name.endsWith('.csv')) historyToImport = parseCSV(e.target.result);
                if (!Array.isArray(historyToImport)) throw new Error('Некорректный формат');

                const historyWithUser = historyToImport.map(h => ({ ...h, user_email: currentUser.email }));
                const response = await fetch('/import_history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(historyWithUser)
                });
                const result = await response.json();
                if (result.success) {
                    await fetchData();
                    renderAll();
                    showToast(`Импортировано ${result.imported_count} записей.`);
                }
            } catch (error) { showToast(`Ошибка: ${error.message}`, 'error'); }
            finally { importHistoryFileInput.value = ''; }
        };
        reader.readAsText(file);
    });

    // --- Onboarding ---
    let onboardingStep = 0;
    const totalSteps = 5;
    const onboardingOverlay = document.getElementById('onboardingOverlay');

    function showOnboarding() {
        if (!onboardingOverlay) return;
        onboardingStep = 0;
        onboardingOverlay.classList.remove('hidden');
        updateOnboardingStep();
    }

    function hideOnboarding() {
        if (!onboardingOverlay) return;
        onboardingOverlay.classList.add('hidden');
        localStorage.setItem(ONBOARDING_KEY, 'true');
    }

    function updateOnboardingStep() {
        const dict = translations[state.lang] || translations.ru;
        const stepData = [
            { title: dict.onboarding_step1_title, text: dict.onboarding_step1_text, b1: dict.onboarding_step1_bullet1, b2: dict.onboarding_step1_bullet2 },
            { title: dict.onboarding_step2_title, text: dict.onboarding_step2_text, b1: dict.onboarding_step2_bullet1, b2: dict.onboarding_step2_bullet2 },
            { title: dict.onboarding_step3_title, text: dict.onboarding_step3_text, b1: dict.onboarding_step3_bullet1, b2: dict.onboarding_step3_bullet2 },
            { title: dict.onboarding_step4_title, text: dict.onboarding_step4_text, b1: dict.onboarding_step4_bullet1, b2: dict.onboarding_step4_bullet2 },
            { title: dict.onboarding_step5_title, text: dict.onboarding_step5_text, b1: dict.onboarding_step5_bullet1, b2: dict.onboarding_step5_bullet2 },
        ];

        const data = stepData[onboardingStep];
        document.getElementById('onboardingTitle').textContent = data.title;
        document.getElementById('onboardingText').textContent = data.text;
        document.getElementById('onboardingBullet1').textContent = data.b1;
        document.getElementById('onboardingBullet2').textContent = data.b2;
        document.getElementById('onboardingStepIndicator').textContent = `${onboardingStep + 1} / ${totalSteps}`;

        document.getElementById('onboardingBack').disabled = onboardingStep === 0;
        document.getElementById('onboardingNext').classList.toggle('hidden', onboardingStep === totalSteps - 1);
        document.getElementById('onboardingDone').classList.toggle('hidden', onboardingStep !== totalSteps - 1);

        // Update skip/back/next/done button text
        const skipBtn = document.getElementById('onboardingSkip');
        if (skipBtn) skipBtn.textContent = dict.onboarding_btn_skip;
        const backBtn = document.getElementById('onboardingBack');
        if (backBtn) backBtn.textContent = dict.onboarding_btn_back;
        const nextBtnSpan = document.querySelector('#onboardingNext span');
        if (nextBtnSpan) nextBtnSpan.textContent = dict.onboarding_btn_next;
        const doneBtn = document.getElementById('onboardingDone');
        if (doneBtn) doneBtn.textContent = dict.onboarding_btn_done;

        // Update language label in onboarding
        const onboardingLangLabel = document.getElementById('onboardingLangLabel');
        if (onboardingLangLabel) onboardingLangLabel.textContent = state.lang.toUpperCase();
    }

    document.getElementById('onboardingNext')?.addEventListener('click', () => {
        if (onboardingStep < totalSteps - 1) { onboardingStep++; updateOnboardingStep(); }
    });
    document.getElementById('onboardingBack')?.addEventListener('click', () => {
        if (onboardingStep > 0) { onboardingStep--; updateOnboardingStep(); }
    });
    document.getElementById('onboardingSkip')?.addEventListener('click', hideOnboarding);
    document.getElementById('onboardingDone')?.addEventListener('click', hideOnboarding);
    document.getElementById('openOnboardingFromHelp')?.addEventListener('click', showOnboarding);

    // Onboarding language toggle
    document.getElementById('onboardingLangToggle')?.addEventListener('click', () => {
        state.lang = state.lang === 'ru' ? 'en' : 'ru';
        localStorage.setItem('utmka_lang', state.lang);
        applyTranslations(state.lang);
        updateOnboardingStep();
    });

    // Show onboarding on first visit
    if (!localStorage.getItem(ONBOARDING_KEY)) {
        setTimeout(showOnboarding, 500);
    }

    // --- Help Button ---
    function initHelpButton() {
        try {
            const helpBtn = document.getElementById('help-btn');
            if (!helpBtn) return;
            helpBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                switchView('help');
                window.location.hash = 'help';
                if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
            };
        } catch (e) { console.error('Error initializing help button:', e); }
    }

    // --- App Initialization ---
    function initializeApp() {
        console.log('Инициализация приложения...', new Date().toISOString());

        if (!loader || !mainContent || !navbar) {
            console.error('Критические элементы DOM не найдены!');
            setTimeout(initializeApp, 100);
            return;
        }

        try {
            startApp();

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
        document.addEventListener('DOMContentLoaded', () => setTimeout(initializeApp, 10));
    } else {
        setTimeout(initializeApp, 10);
    }

    // Fallback
    setTimeout(() => {
        if (loader && !loader.classList.contains('hidden')) {
            console.warn('Fallback: принудительное отображение контента');
            if (loader) loader.classList.add('hidden');
            if (mainContent) mainContent.classList.remove('hidden');
            if (navbar) navbar.classList.remove('hidden');
            try { startApp(); } catch (e) { console.error('Fallback error:', e); }
        }
    }, 2000);
});
