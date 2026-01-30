import { state, currentUser, showToast, renderHistory, renderTemplates, renderRecentTemplates, renderAll, switchView } from './ui.js';
import { translations } from './translations.js';
import { initAppForUser, fetchData } from './api.js';
import { parseDate, getTextColorForBg, parseCSV, ONBOARDING_KEY } from './utils.js';

// --- Сохранение файла через нативный диалог или браузерный fallback ---
async function saveFileWithDialog(filename, content) {
    if (window.pywebview && window.pywebview.api) {
        const fileExt = filename.split('.').pop().toLowerCase();
        const fileTypes = fileExt === 'json'
            ? ['JSON files (*.json)', 'All files (*.*)']
            : ['CSV files (*.csv)', 'All files (*.*)'];
        const result = await window.pywebview.api.save_file(filename, content, fileTypes);
        return result;
    }
    // Fallback для dev-режима (браузер)
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true };
}

// --- QR-код: модальное окно с сохранением PNG/SVG ---
let currentQRSvgString = '';

function showQRModal(url) {
    const container = document.getElementById('qrCodeContainer');
    const modal = document.getElementById('qrCodeModal');
    container.innerHTML = '';

    // Генерация QR через qrcode-svg
    // eslint-disable-next-line no-undef
    const qr = new QRCode({ content: url, width: 300, height: 300, padding: 4, color: '#000000', background: '#ffffff', ecl: 'M' });
    currentQRSvgString = qr.svg();
    container.innerHTML = currentQRSvgString;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeQRModal() {
    const modal = document.getElementById('qrCodeModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function saveQRAsSvg() {
    if (!currentQRSvgString) return;
    const svgContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + currentQRSvgString;
    const result = await saveFileWithDialog('qrcode.svg', svgContent);
    if (result.success) showToast('QR-код сохранён как SVG');
    else if (!result.cancelled) showToast(result.error || 'Ошибка сохранения', 'error');
}

async function saveQRAsPng() {
    if (!currentQRSvgString) return;
    try {
        const svgBlob = new Blob([currentQRSvgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 600, 600);
            ctx.drawImage(img, 0, 0, 600, 600);
            URL.revokeObjectURL(svgUrl);

            if (window.pywebview && window.pywebview.api) {
                const dataUrl = canvas.toDataURL('image/png');
                const base64 = dataUrl.split(',')[1];
                const result = await window.pywebview.api.save_binary_file('qrcode.png', base64, ['PNG images (*.png)', 'All files (*.*)']);
                if (result.success) showToast('QR-код сохранён как PNG');
                else if (!result.cancelled) showToast(result.error || 'Ошибка сохранения', 'error');
            } else {
                // Fallback для dev-режима
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = 'qrcode.png';
                a.click();
                showToast('QR-код сохранён как PNG');
            }
        };
        img.src = svgUrl;
    } catch (error) { showToast(`Ошибка: ${error.message}`, 'error'); }
}

// --- Preferences API helpers ---
async function fetchPreferences() {
    try {
        const res = await fetch('/api/preferences', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (res.ok) return await res.json();
    } catch (e) {
        console.warn('Не удалось загрузить настройки с сервера, используем localStorage:', e);
    }
    return null;
}

async function savePreference(key, value) {
    try {
        await fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [key]: value })
        });
    } catch (e) {
        console.warn('Не удалось сохранить настройку:', key, e);
    }
}

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
                savePreference('theme', 'light');
            } else {
                htmlEl.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                savePreference('theme', 'dark');
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

        // Donate translations
        const donateFooterText = document.getElementById('donateFooterText');
        if (donateFooterText && dict.donate_footer) donateFooterText.textContent = dict.donate_footer;
        const helpDonateBtn = document.getElementById('helpDonateBtn');
        if (helpDonateBtn && dict.help_donate_btn) helpDonateBtn.textContent = dict.help_donate_btn;
        const donateNavLink = document.getElementById('donateNavLink');
        if (donateNavLink && dict.donate_btn) donateNavLink.title = dict.donate_btn;
    }

    if (langToggle) {
        langToggle.addEventListener('click', () => {
            state.lang = state.lang === 'ru' ? 'en' : 'ru';
            localStorage.setItem('utmka_lang', state.lang);
            savePreference('lang', state.lang);
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

    // --- Async server preferences (overrides localStorage if available) ---
    fetchPreferences().then(prefs => {
        if (!prefs) return;

        // Theme
        const serverTheme = prefs.theme || 'dark';
        const currentTheme = localStorage.getItem('theme') || 'dark';
        if (serverTheme !== currentTheme) {
            if (serverTheme === 'dark') htmlEl.classList.add('dark');
            else htmlEl.classList.remove('dark');
            localStorage.setItem('theme', serverTheme);
            setTimeout(() => {
                if (typeof renderHistory === 'function') renderHistory();
                if (typeof renderTemplates === 'function') renderTemplates();
            }, 100);
        }

        // Language
        const serverLang = prefs.lang || 'ru';
        if (serverLang !== state.lang) {
            state.lang = serverLang;
            localStorage.setItem('utmka_lang', serverLang);
            applyTranslations(state.lang);
            if (typeof renderTemplates === 'function') renderTemplates();
            if (typeof renderHistory === 'function') renderHistory();
        }

        // Onboarding
        if (prefs.onboarding_done) {
            localStorage.setItem(ONBOARDING_KEY, 'true');
        }
    });

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

            // Проверяем обновления (фоново, не блокируем UI)
            setTimeout(() => checkForUpdates(), 2000);

            setTimeout(() => {
                try {
                    initHelpButton();
                    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

                    // Показать приложение после полной загрузки
                    const app = document.getElementById('app');
                    if (app) app.classList.add('loaded');
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
                    const historyData = { user_email: currentUser.email, url: finalUrl };
                    if (pendingTagFromTemplate) {
                        historyData.tag_name = pendingTagFromTemplate.tag_name;
                        historyData.tag_color = pendingTagFromTemplate.tag_color;
                    }
                    const historyRes = await fetch('/history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(historyData)
                    });
                    if (historyRes.ok) {
                        const historyResult = await historyRes.json();
                        lastHistoryId = historyResult.id || null;
                    }
                    pendingTagFromTemplate = null;
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
            pendingTagFromTemplate = null;
            lastHistoryId = null;
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
            showQRModal(url);
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
                // Обновляем тег в последней записи истории
                if (lastHistoryId && tagName) {
                    try {
                        await fetch(`/history/${lastHistoryId}/tag`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tag_name: tagName, tag_color: tagColor })
                        });
                    } catch (e) {
                        console.warn('Не удалось обновить тег в истории:', e);
                    }
                }
                await fetchData();
                renderAll();
                showToast('Шаблон сохранён!');
                const modal = document.getElementById('saveTemplateModal');
                if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
                document.getElementById('newTemplateNameInput').value = '';
                document.getElementById('newTemplateTagNameInput').value = '';
                document.getElementById('newTemplateTagColorInput').value = '';
                // Сбрасываем палитру цветов в модале
                document.getElementById('newTemplateColorPalette')?.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
            }
        } catch (err) { showToast('Ошибка сохранения шаблона', 'error'); }
    });

    // --- Клик по подсказке тега (популярные/недавние) ---
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.tag-suggestion-btn');
        if (!btn) return;

        const tagName = btn.dataset.tagName;
        const tagColor = btn.dataset.tagColor;
        const targetName = btn.dataset.targetName;
        const targetColor = btn.dataset.targetColor;
        const targetPalette = btn.dataset.targetPalette;

        const nameInput = document.getElementById(targetName);
        const colorInput = document.getElementById(targetColor);
        if (nameInput) nameInput.value = tagName;
        if (colorInput) colorInput.value = tagColor;

        // Выделяем соответствующий цвет в палитре
        const palette = document.getElementById(targetPalette);
        if (palette) {
            palette.querySelectorAll('.color-dot').forEach(dot => {
                dot.classList.toggle('selected', dot.dataset.color === tagColor);
            });
        }
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
            showQRModal(url);
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

    // --- Хранение тега шаблона для записи в историю при генерации ---
    let pendingTagFromTemplate = null;
    let lastHistoryId = null;

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
        // Сохраняем тег шаблона для записи в историю при генерации
        if (item.tag_name) {
            pendingTagFromTemplate = { tag_name: item.tag_name, tag_color: item.tag_color || '' };
        } else {
            pendingTagFromTemplate = null;
        }
    }

    // --- URL Detail Modal ---
    let currentDetailItem = null;

    function openUrlDetailModal(item) {
        currentDetailItem = item;
        const modal = document.getElementById('urlDetailModal');
        document.getElementById('fullUrlText').value = item.full_url || item.url || '';

        // Display tag if exists
        const tagContainer = document.getElementById('urlDetailTag');
        if (tagContainer) {
            if (item.tag_name) {
                const textColor = getTextColorForBg(item.tag_color);
                tagContainer.innerHTML = `<div class="flex items-center gap-2"><span class="text-sm text-slate-500">Тег:</span><span class="px-3 py-1.5 text-sm font-medium rounded-full shadow-sm inline-block" style="background-color:${item.tag_color || '#f1f5f9'}; color: ${textColor};">${item.tag_name}</span></div>`;
            } else {
                tagContainer.innerHTML = '';
            }
        }

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
        showQRModal(url);
    });

    document.getElementById('applyFromModalBtn')?.addEventListener('click', () => {
        if (!currentDetailItem) return;
        applyTemplateToForm(currentDetailItem);
        document.getElementById('urlDetailModal').classList.add('hidden');
        document.getElementById('urlDetailModal').classList.remove('flex');
        switchView('generator');
        currentDetailItem = null;
    });

    // --- QR Code Modal handlers ---
    document.getElementById('closeQrModalX')?.addEventListener('click', closeQRModal);
    document.getElementById('closeQrModalBtn')?.addEventListener('click', closeQRModal);
    document.getElementById('saveQrPng')?.addEventListener('click', saveQRAsPng);
    document.getElementById('saveQrSvg')?.addEventListener('click', saveQRAsSvg);
    document.getElementById('qrCodeModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'qrCodeModal') closeQRModal();
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
            <div class="p-3 border border-slate-200 dark:border-slate-700 rounded-lg flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                    <p class="font-medium text-sm text-slate-900 dark:text-white">${t.name}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">${t.utm_source || '-'} / ${t.utm_medium || '-'}</p>
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
                const saveResult = await saveFileWithDialog(result.filename, result.file_content);
                if (saveResult.success) showToast('Файл сохранён');
                else if (saveResult.cancelled) showToast('Сохранение отменено');
                else throw new Error(saveResult.error || 'Ошибка сохранения');
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
                const saveResult = await saveFileWithDialog(result.filename, result.file_content);
                if (saveResult.success) showToast('Файл сохранён');
                else if (saveResult.cancelled) showToast('Сохранение отменено');
                else throw new Error(saveResult.error || 'Ошибка сохранения');
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
            if (result.success) {
                const saveResult = await saveFileWithDialog(result.filename, result.file_content);
                if (saveResult.success) showToast('Файл сохранён');
                else if (saveResult.cancelled) showToast('Сохранение отменено');
                else showToast(saveResult.error || 'Ошибка сохранения', 'error');
            } else showToast(result.error || 'Ошибка экспорта', 'error');
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
            if (result.success) {
                const saveResult = await saveFileWithDialog(result.filename, result.file_content);
                if (saveResult.success) showToast('Файл сохранён');
                else if (saveResult.cancelled) showToast('Сохранение отменено');
                else showToast(saveResult.error || 'Ошибка сохранения', 'error');
            } else showToast(result.error || 'Ошибка экспорта', 'error');
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
    const onboardingMask = document.getElementById('onboardingMask');
    const onboardingHighlight = document.getElementById('onboardingHighlight');
    const onboardingCard = document.getElementById('onboardingCard');

    // Целевые элементы для каждого шага
    const ONBOARDING_TARGETS = [
        { selector: '#navbar', position: 'below' },
        { selector: '[data-target="generator"]', position: 'below' },
        { selector: '[data-target="history"]', position: 'below' },
        { selector: '[data-target="templates"]', position: 'below' },
        { selector: 'footer', position: 'above' }
    ];

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
        savePreference('onboarding_done', true);
    }

    function updateSpotlight() {
        if (!onboardingMask || !onboardingCard || !onboardingHighlight) return;

        const target = ONBOARDING_TARGETS[onboardingStep];
        const el = document.querySelector(target.selector);

        if (!el) {
            // Если элемент не найден — центрировать карточку, убрать вырезку
            onboardingMask.style.clipPath = '';
            onboardingHighlight.style.display = 'none';
            onboardingCard.style.left = '50%';
            onboardingCard.style.top = '50%';
            onboardingCard.style.bottom = '';
            onboardingCard.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const rect = el.getBoundingClientRect();
        const pad = 8;
        const W = window.innerWidth;
        const H = window.innerHeight;

        // Вырезка в overlay через clip-path polygon
        const x1 = rect.left - pad;
        const y1 = rect.top - pad;
        const x2 = rect.right + pad;
        const y2 = rect.bottom + pad;

        onboardingMask.style.clipPath = `polygon(
            0% 0%, 0% 100%,
            ${x1}px 100%, ${x1}px ${y1}px,
            ${x2}px ${y1}px, ${x2}px ${y2}px,
            ${x1}px ${y2}px, ${x1}px 100%,
            100% 100%, 100% 0%
        )`;

        // Рамка подсветки
        onboardingHighlight.style.display = 'block';
        onboardingHighlight.style.left = (rect.left - pad) + 'px';
        onboardingHighlight.style.top = (rect.top - pad) + 'px';
        onboardingHighlight.style.width = (rect.width + pad * 2) + 'px';
        onboardingHighlight.style.height = (rect.height + pad * 2) + 'px';

        // Позиционирование карточки
        const cardMaxWidth = 420;
        onboardingCard.style.transform = 'none';

        if (target.position === 'below') {
            onboardingCard.style.top = (rect.bottom + 16) + 'px';
            onboardingCard.style.bottom = '';
            onboardingCard.style.left = Math.max(16, Math.min(rect.left, W - cardMaxWidth - 16)) + 'px';
        } else {
            onboardingCard.style.top = '';
            onboardingCard.style.bottom = (H - rect.top + 16) + 'px';
            onboardingCard.style.left = Math.max(16, Math.min(rect.left, W - cardMaxWidth - 16)) + 'px';
        }
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

        // Обновить spotlight
        updateSpotlight();
    }

    // Пересчёт при изменении размера окна
    window.addEventListener('resize', () => {
        if (onboardingOverlay && !onboardingOverlay.classList.contains('hidden')) {
            updateSpotlight();
        }
    });

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
        savePreference('lang', state.lang);
        applyTranslations(state.lang);
        updateOnboardingStep();
    });

    // Show onboarding on first visit (delay for server preferences to load)
    setTimeout(() => {
        if (!localStorage.getItem(ONBOARDING_KEY)) {
            showOnboarding();
        }
    }, 800);

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

    // ============================================
    // Автообновления
    // ============================================

    let updateData = null;

    async function checkForUpdates() {
        try {
            const resp = await fetch('/api/update/check');
            if (!resp.ok) return;

            const data = await resp.json();
            if (data.available) {
                updateData = data;
                showUpdateModal(data);
            }
        } catch (e) {
            // Молча игнорируем ошибки (нет сети и т.д.)
            console.log('Update check failed:', e);
        }
    }

    function showUpdateModal(data) {
        const modal = document.getElementById('updateModal');
        const t = translations[state.lang];

        // Обновляем тексты
        document.getElementById('updateModalTitle').textContent = t.update_available;
        document.getElementById('updateModalVersion').textContent = t.update_version.replace('{version}', data.latest_version);
        document.getElementById('updateModalNotes').textContent = data.release_notes || '';
        document.getElementById('updateWhatsNewLabel').textContent = t.update_whats_new;
        document.getElementById('updateLaterLabel').textContent = t.update_later;
        document.getElementById('updateInstallLabel').textContent = t.update_install;
        document.getElementById('updateProgressLabel').textContent = t.update_downloading;

        // Показываем модалку
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Обновляем иконки
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    function closeUpdateModal() {
        const modal = document.getElementById('updateModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    async function startUpdate() {
        if (!updateData || !updateData.download_url) return;

        const t = translations[state.lang];
        const progressDiv = document.getElementById('updateProgress');
        const progressBar = document.getElementById('updateProgressBar');
        const progressPercent = document.getElementById('updateProgressPercent');
        const progressLabel = document.getElementById('updateProgressLabel');
        const installBtn = document.getElementById('updateInstallBtn');

        try {
            // Показываем прогресс-бар
            progressDiv.classList.remove('hidden');
            installBtn.disabled = true;
            installBtn.classList.add('opacity-50', 'cursor-not-allowed');

            // Скачиваем
            progressLabel.textContent = t.update_downloading;
            const downloadResp = await fetch('/api/update/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: updateData.download_url })
            });

            if (!downloadResp.ok) throw new Error('Download failed');

            const downloadData = await downloadResp.json();

            // Устанавливаем
            progressLabel.textContent = t.update_installing;
            progressBar.style.width = '100%';
            progressPercent.textContent = '100%';

            await fetch('/api/update/install', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: downloadData.installer_path })
            });

            // Приложение будет закрыто sys.exit(0) на бэкенде
        } catch (e) {
            console.error('Update error:', e);
            showToast(t.update_error, 'error');
            progressDiv.classList.add('hidden');
            installBtn.disabled = false;
            installBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    function openWhatsNew() {
        if (!updateData || !updateData.release_url) return;
        // PyWebView автоматически откроет URL в системном браузере
        window.open(updateData.release_url, '_blank');
    }

    // Event listeners для модалки обновления
    document.getElementById('updateLaterBtn')?.addEventListener('click', closeUpdateModal);
    document.getElementById('updateInstallBtn')?.addEventListener('click', startUpdate);
    document.getElementById('updateWhatsNewBtn')?.addEventListener('click', openWhatsNew);
    document.getElementById('updateModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'updateModal') closeUpdateModal();
    });
});
