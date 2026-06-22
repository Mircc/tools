/**
 * Site-wide i18n engine — zh / en-GB / ja
 * Strings live in SiteI18nStrings (site-i18n-strings.js)
 */
(function (global) {
    var LOCALE_KEY = 'site-locale';
    var LANG_ATTR = { zh: 'zh-CN', en: 'en-GB', ja: 'ja' };
    var locale = 'zh';
    var pageId = '';

    function dict() {
        return global.SiteI18nStrings || {};
    }

    function resolve(obj, path) {
        var parts = path.split('.');
        var cur = obj;
        for (var i = 0; i < parts.length; i++) {
            if (cur == null) return null;
            cur = cur[parts[i]];
        }
        return cur;
    }

    function t(key, vars) {
        var entry = resolve(dict(), key);
        if (!entry) return key;
        var text;
        if (typeof entry === 'object' && (entry.zh || entry.en || entry.ja)) {
            text = entry[locale] || entry.en || entry.zh || key;
        } else {
            text = String(entry);
        }
        if (vars) {
            Object.keys(vars).forEach(function (k) {
                text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
            });
        }
        return text;
    }

    function detectLocale() {
        var saved = localStorage.getItem(LOCALE_KEY);
        if (!saved) {
            var legacy = localStorage.getItem('qr-tool-locale');
            if (legacy === 'zh' || legacy === 'en' || legacy === 'ja') {
                saved = legacy;
                localStorage.setItem(LOCALE_KEY, saved);
            }
        }
        if (saved === 'zh' || saved === 'en' || saved === 'ja') return saved;
        var lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        if (lang.indexOf('zh') === 0) return 'zh';
        if (lang.indexOf('ja') === 0) return 'ja';
        return 'en';
    }

    function applyDOM() {
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            el.innerHTML = t(el.getAttribute('data-i18n-html'));
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
        });
        document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
            el.title = t(el.getAttribute('data-i18n-title'));
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
            el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
        });
        var titleKey = document.body && document.body.getAttribute('data-i18n-title-key');
        if (titleKey) document.title = t(titleKey);
        applyMetaDesc();
    }

    function applyMetaDesc() {
        var key = document.body && document.body.getAttribute('data-i18n-desc-key');
        if (!key) return;
        var meta = document.querySelector('meta[name="description"]');
        if (!meta) return;
        if (!meta.dataset.defaultContent) meta.dataset.defaultContent = meta.content;
        if (locale === 'en') {
            var entry = resolve(dict(), key);
            if (entry && entry.en) meta.content = entry.en;
        } else {
            meta.content = meta.dataset.defaultContent;
        }
    }

    function highlightLangBtn() {
        document.querySelectorAll('.site-lang-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.locale === locale);
        });
        var qrBtns = document.querySelectorAll('.lang-btn[data-locale]');
        qrBtns.forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.locale === locale);
        });
    }

    function injectLangSwitcher() {
        if (document.getElementById('site-lang-switcher') || document.getElementById('lang-switcher')) return;
        var container = document.querySelector('.nav-container');
        if (!container) return;
        var wrap = document.createElement('div');
        wrap.className = 'site-lang-switcher';
        wrap.id = 'site-lang-switcher';
        [
            { loc: 'en', label: 'EN' },
            { loc: 'zh', label: '中文' },
            { loc: 'ja', label: '日本語' }
        ].forEach(function (item) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'site-lang-btn';
            btn.dataset.locale = item.loc;
            btn.textContent = item.label;
            btn.addEventListener('click', function () { setLocale(item.loc); });
            wrap.appendChild(btn);
        });
        container.appendChild(wrap);
    }

    function setLocale(loc) {
        if (loc !== 'zh' && loc !== 'en' && loc !== 'ja') return;
        locale = loc;
        localStorage.setItem(LOCALE_KEY, locale);
        document.documentElement.lang = LANG_ATTR[loc] || 'en-GB';
        applyDOM();
        highlightLangBtn();
        document.dispatchEvent(new CustomEvent('site-locale-change', { detail: { locale: loc, page: pageId } }));
        if (typeof global.pageI18nRefresh === 'function') global.pageI18nRefresh();
    }

    function init(id) {
        pageId = id || '';
        locale = detectLocale();
        document.documentElement.lang = LANG_ATTR[locale] || 'en-GB';
        injectLangSwitcher();
        applyDOM();
        highlightLangBtn();
    }

    global.SiteI18n = {
        t: t,
        init: init,
        getLocale: function () { return locale; },
        setLocale: setLocale,
        applyDOM: applyDOM
    };
})(window);
