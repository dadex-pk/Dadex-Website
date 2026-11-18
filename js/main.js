/* ============================================================
   DADEX ETERNIT LIMITED — SHARED UI (v7.2)
   ------------------------------------------------------------
   v7.2 changes (site audit fixes)
     · DEXPERT: ASTM UPVC SWV and HTplus added to product
       catalogue. Minimum query length for "contains product"
       matching raised from 3 to 4 characters to prevent any
       future 3-char query from matching a longer product key.
     · Component error fallback: when the header fails to load,
       a minimal fallback navigation is rendered alongside the
       error banner so users are never left with a blank top of
       page.

   v7.1 changes (code-review fixes)
     · Products: #sewerage-drainage targets the "Sewerage &
       Drainage" group; "Soil, Waste & Vent" gets
       #soil-waste-vent. Hash decoding is guarded; tab clicks
       no longer add duplicate history entries.
     · Mailto form: code-point-safe truncation (no URIError on
       emoji), CRLF line breaks, recipient validated.
     · DEXPERT: word-prefix product matching (unique matches
       only), "Soil, Waste & Vent" intent, site-search fallback,
       guarded template lookups, backdrop click ignores drag-
       selections, aria-controls is set once the dialog exists.
     · Navigation: matchMedia breakpoint; Enter/Space toggles
       an open dropdown on desktop; focusout ignores clicks
       inside the menu.
     · Active nav: an exact #hash match wins over hash-less
       links.
     · Search: removed-page check ignores paths/hashes,
       popular buttons scoped to their container, [hidden]
       replaces inline display styles.
     · Investors: in-page anchors that are not panels are
       left alone.
     · Header offset falls back to a resize listener.

   CSS contract:
     · Dropdown visibility is driven by [aria-expanded="true"]
       (04-header-footer.css) — no .is-open rules are required.
     · Anchors clear the sticky header through scroll-margin-top
       (01-colors-and-fonts.css), fed by --dadex-header-offset.
     · [hidden] must win over component display rules
       (e.g. .search-clear-btn[hidden], .popular-searches[hidden]).
   ============================================================ */

(() => {
  'use strict';

  /* ============================================================
     1. CONSTANTS
     ============================================================ */

  const MOBILE_NAV_MAX = 1024;
  const COMPANY_FOUNDED_YEAR = 1959;
  const COMPANY_ANNIVERSARY = { month: 4, day: 13 }; // 1-based month: 13 April
  const SCROLL_TOP_THRESHOLD = 600;
  const HEADER_COLLAPSE_THRESHOLD = 70;
  const DEFAULT_MAIL_TO = 'info@dadex.com.pk';
  const MAILTO_MAX_LENGTH = 1800;

  const PRELOADER_MIN_MS = 1200;
  const PRELOADER_MAX_MS = 5000;

  const SEARCH_MAX_RESULTS = 60;
  const SEARCH_SNIPPET_LENGTH = 160;
  /* File names (lower-case) of pages that no longer exist. */
  const REMOVED_SEARCH_URLS = new Set([
    'faq.html', 'whistleblowing.html',
    'technical-resources.html', 'solutions.html'
  ]);

  const INERT_SUPPORTED =
    typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;

  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), summary, ' +
    '[tabindex]:not([tabindex="-1"])';

  const PRODUCT_HASH_MAP = {
    'water-supply': ['water'],
    'soil-waste-vent': ['swv'],
    'sewerage-drainage': ['drainage'],
    'cable-utility-ducting': ['ducting'],
    'specialised-industrial': ['special'],
    'roofing': ['roofing']
  };

  /* Minimal fallback nav shown when the header component fails
     to load (network error, file:// context, SPA fallback, …). */
  const FALLBACK_NAV_LINKS = [
    ['index.html', 'Home'],
    ['products.html', 'Products'],
    ['about.html', 'About'],
    ['services.html', 'Services'],
    ['projects.html', 'Projects'],
    ['investors.html', 'Investors'],
    ['contact.html', 'Contact']
  ];

  /* ============================================================
     2. UTILITIES
     ============================================================ */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const isVisible = el => !!el && el.getClientRects().length > 0;
  const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function safeRun(label, fn) {
    try {
      const result = fn();
      if (result && typeof result.catch === 'function') {
        result.catch(err => console.error(`[Dadex] ${label} failed:`, err));
      }
    } catch (err) {
      console.error(`[Dadex] ${label} failed:`, err);
    }
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(String(value), document.baseURI);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function scrollBehavior() {
    return reducedMotion() ? 'auto' : 'smooth';
  }

  /* "./pages/Faq.html?x=1#top" -> "faq.html" */
  const urlFileName = u =>
    String(u).split(/[?#]/)[0].split('/').pop().toLowerCase();

  /* ============================================================
     3. BOOT SEQUENCE
     ============================================================ */

  function boot() {
    safeRun('preloader',       initPreloader);
    safeRun('project-filter',  initProjectFilter);
    safeRun('products-filter', initProductsFilter);
    safeRun('product-tabs',    initProductTabs);
    safeRun('mailto-form',     initMailtoForm);
    safeRun('investor-panels', initInvestorPanels);
    safeRun('site-search',     initSiteSearch);
    safeRun('dexpert',         initDEXPERT);
    safeRun('back-to-top',     initBackToTop);
    safeRun('dynamic-text',    initDynamicSiteText);

    /* Header/footer dependent — run after injection. */
    loadSharedComponents()
      .catch(err => console.error('[Dadex] Component injection failed:', err))
      .then(() => {
        const header =
          document.getElementById('siteHeader') ||
          document.querySelector('.site-header');

        safeRun('dynamic-text', initDynamicSiteText); // footer year
        safeRun('header-state', () => initHeaderState(header));
        safeRun('navigation',   () => initNavigation(header));
        safeRun('active-nav',   setActiveNavigation);
        safeRun('hash-scroll',  scrollToInitialHash);

        window.addEventListener('hashchange', () =>
          safeRun('active-nav', setActiveNavigation));
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  function scrollToInitialHash() {
    const raw = location.hash;
    if (!raw || raw.length < 2) return;
    let id = raw.slice(1);
    try { id = decodeURIComponent(id); } catch (_) { /* keep raw */ }
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  /* ============================================================
     4. COMPONENT LOADING (header + footer)
     ============================================================ */

  async function loadSharedComponents() {
    const mounts = $$('[data-component]').filter(m => {
      const n = m.getAttribute('data-component');
      return n === 'header' || n === 'footer';
    });
    if (!mounts.length) return;

    if (!['http:', 'https:'].includes(location.protocol)) {
      mounts.forEach(mount =>
        renderComponentError(mount, {
          name: mount.getAttribute('data-component'),
          reason:
            'The site was opened from a non-HTTP environment (file:// or a WebView). ' +
            'Browsers block file fetches for security. Start a local server, for ' +
            'example "python3 -m http.server 8080", and open http://localhost:8080/.'
        })
      );
      return;
    }

    await Promise.allSettled(mounts.map(loadOneComponent));
  }

  async function loadOneComponent(mount) {
    const name = mount.getAttribute('data-component');
    const fetchUrl = new URL(`components/${name}.html`, document.baseURI);

    try {
      const response = await fetch(fetchUrl, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      if (/^\s*<!DOCTYPE\s+html/i.test(html)) {
        throw new Error(
          'Server returned a full HTML document, not a component fragment ' +
          '(server-side 404 or SPA fallback).'
        );
      }
      mount.outerHTML = html;
    } catch (error) {
      console.error(`[Dadex] Failed to load ${name}.html from ${fetchUrl.href}`, error);
      renderComponentError(mount, {
        name,
        url: fetchUrl.href,
        reason: error.message
      });
    }
  }

  function renderComponentError(mount, { name, url, reason }) {
    mount.setAttribute('data-component-error', name);

    const box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText =
      'padding:14px 20px;background:#fff4f4;color:#8a0000;' +
      'font:600 13px/1.55 system-ui,-apple-system,sans-serif;' +
      'border-bottom:2px solid #e50000;';

    const strong = document.createElement('strong');
    strong.textContent = `Dadex component error — ${name}: `;
    box.appendChild(strong);
    box.appendChild(document.createTextNode(reason || 'Unknown error'));

    if (url) {
      const small = document.createElement('small');
      small.style.cssText = 'display:block;opacity:.75;font-weight:500;';
      small.textContent = `Attempted URL: ${url}`;
      box.appendChild(small);
    }

    /* Header failed → inject a minimal fallback navigation so
       users can still reach the main pages. */
    if (name === 'header') {
      const nav = document.createElement('nav');
      nav.setAttribute('aria-label', 'Fallback navigation');
      nav.style.cssText =
        'display:flex;flex-wrap:wrap;gap:1rem;align-items:center;' +
        'padding:12px 20px;background:#fff;border-bottom:1px solid #e4e7ea;' +
        'font:600 14px/1.5 system-ui,-apple-system,sans-serif;';

      const brand = document.createElement('a');
      brand.href = 'index.html';
      brand.textContent = 'Dadex';
      brand.style.cssText =
        'color:#c90000;font-weight:800;font-size:15px;' +
        'text-decoration:none;margin-right:auto;';
      nav.appendChild(brand);

      FALLBACK_NAV_LINKS.slice(1).forEach(([href, text]) => {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = text;
        a.style.cssText = 'color:#292b2e;text-decoration:none;';
        nav.appendChild(a);
      });

      box.appendChild(nav);
    }

    mount.replaceChildren(box);
  }

  /* ============================================================
     5. PRELOADER
     ============================================================ */

  function initPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    let done = false;
    const hide = () => {
      if (done) return;
      done = true;
      preloader.classList.add('is-hidden');
      setTimeout(() => preloader.remove(), 600);
    };

    const afterLoad = () => {
      const min = reducedMotion() ? 0 : PRELOADER_MIN_MS;
      setTimeout(hide, Math.max(0, min - performance.now()));
    };

    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });

    setTimeout(hide, PRELOADER_MAX_MS); // fail-safe
  }

  /* ============================================================
     6. DYNAMIC TEXT (year, company age)
     ============================================================ */

  function initDynamicSiteText() {
    const now = new Date();
    const anniversary = new Date(
      now.getFullYear(),
      COMPANY_ANNIVERSARY.month - 1,
      COMPANY_ANNIVERSARY.day
    );
    const age =
      now.getFullYear() - COMPANY_FOUNDED_YEAR - (now < anniversary ? 1 : 0);

    const setText = (selector, value) => {
      document.querySelectorAll(selector).forEach(el => {
        el.textContent = value;
      });
    };

    setText('[data-current-year]', String(now.getFullYear()));
    setText('[data-company-age]', String(age));
    setText('[data-company-age-years]', `${age} years`);
    setText('[data-company-age-over]', `over ${age} years`);
    setText('[data-company-age-hyphenated]', `${age}-year-old`);
  }

  /* ============================================================
     7. HEADER STATE (scroll collapse + height variable)
     ============================================================ */

  function initHeaderState(header) {
    if (!header || header.dataset.stateReady === 'true') return;
    header.dataset.stateReady = 'true';

    const file = location.pathname.split('/').pop();
    const isHome =
      document.body.classList.contains('home-page') ||
      file === '' || file === 'index.html' || file === 'index.htm';

    header.dataset.headerState = isHome ? 'home' : 'internal';

    const utilityBar = header.querySelector('.utility-bar');

    const setOffset = () =>
      document.documentElement.style.setProperty(
        '--dadex-header-offset', `${header.offsetHeight}px`
      );
    setOffset();
    if ('ResizeObserver' in window) {
      new ResizeObserver(setOffset).observe(header);
    } else {
      window.addEventListener('resize', debounce(setOffset, 100));
    }

    let ticking = false;
    let lastScrolled = null;

    const update = () => {
      ticking = false;
      const scrolled = window.scrollY > HEADER_COLLAPSE_THRESHOLD;
      if (scrolled === lastScrolled) return;
      lastScrolled = scrolled;

      header.classList.toggle('is-scrolled', scrolled);
      document.body.classList.toggle('header-scrolled', scrolled);
      if (INERT_SUPPORTED && utilityBar) utilityBar.inert = scrolled;
    };

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });

    update();
  }

  /* ============================================================
     8. NAVIGATION (drawer, dropdowns, keyboard, focus trap)
     ============================================================ */

  function initNavigation(header) {
    if (!header || header.dataset.navReady === 'true') return;

    const nav = $('#site-navigation', header);
    if (!nav) return;
    header.dataset.navReady = 'true';

    const hamburger = $('.menu-toggle', header);
    const dropdowns = $$('.dropdown', header).filter(dd => $('.dropdown-toggle', dd));
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

    const LABEL_OPEN = 'Open navigation menu';
    const LABEL_CLOSE = 'Close navigation menu';

    const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_NAV_MAX}px)`);
    const isMobile = () => mobileQuery.matches;
    const isDrawerOpen = () => nav.classList.contains('open');
    const toggleOf = dd => $('.dropdown-toggle', dd);
    const menuOf = dd => $('.dropdown-menu, .mega-menu', dd);

    /* ---------- Dropdown state ---------- */

    const setDropdown = (dd, open) => {
      const t = toggleOf(dd);
      if (!t) return;
      t.setAttribute('aria-expanded', String(open));
      dd.classList.toggle('is-open', open);
    };

    const closeAllDropdowns = except => {
      dropdowns.forEach(dd => { if (dd !== except) setDropdown(dd, false); });
    };

    const openDropdownOf = node =>
      dropdowns.find(dd => dd.contains(node) &&
        toggleOf(dd).getAttribute('aria-expanded') === 'true');

    dropdowns.forEach(dd => setDropdown(dd, false));

    /* ---------- Drawer state ---------- */

    const pageRegions = () =>
      $$('main, .site-footer, .dexpert-fab, .back-to-top');

    const setDrawer = (open, { restoreFocus = false } = {}) => {
      nav.classList.toggle('open', open);
      document.body.classList.toggle('nav-open', open);

      if (hamburger) {
        hamburger.setAttribute('aria-expanded', String(open));
        hamburger.setAttribute('aria-label', open ? LABEL_CLOSE : LABEL_OPEN);
      }

      if (INERT_SUPPORTED) pageRegions().forEach(el => { el.inert = open; });

      if (!open) {
        closeAllDropdowns();
        if (restoreFocus && hamburger && isVisible(hamburger)) hamburger.focus();
      }
    };

    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.addEventListener('click', () => setDrawer(!isDrawerOpen()));
    }

    /* ---------- Dropdown interaction ---------- */

    const menuItems = dd =>
      $$('a[href], button:not([disabled])', menuOf(dd) || dd)
        .filter(isVisible);

    dropdowns.forEach(dd => {
      const toggle = toggleOf(dd);
      let hoverTimer = null;
      let pointerInside = false;

      toggle.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();

        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        /* On hover-capable desktops the menu is usually already open
           from hovering; a click should keep it open, not close it. */
        const hoverDesktop = !isMobile() && canHover.matches;
        /* event.detail === 0 means the click came from the keyboard
           (Enter/Space): that must be able to close the menu again. */
        const viaKeyboard = event.detail === 0;
        const next = hoverDesktop && !viaKeyboard ? true : !isOpen;

        closeAllDropdowns(dd);
        setDropdown(dd, next);
      });

      dd.addEventListener('keydown', event => {
        const open = toggle.getAttribute('aria-expanded') === 'true';

        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setDropdown(dd, false);
          toggle.focus();
          return;
        }

        if (event.target === toggle &&
            (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
          event.preventDefault();
          closeAllDropdowns(dd);
          setDropdown(dd, true);
          const items = menuItems(dd).filter(el => el !== toggle);
          const pick = event.key === 'ArrowDown' ? items[0] : items[items.length - 1];
          if (pick) pick.focus();
          return;
        }

        if (open && event.target !== toggle &&
            ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          const items = menuItems(dd).filter(el => el !== toggle);
          if (!items.length) return;
          event.preventDefault();
          const i = items.indexOf(document.activeElement);
          let next;
          if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = items.length - 1;
          else if (event.key === 'ArrowDown') next = (i + 1) % items.length;
          else next = (i - 1 + items.length) % items.length;
          items[next].focus();
        }
      });

      /* Close when keyboard focus leaves the dropdown (desktop). */
      dd.addEventListener('focusout', event => {
        if (isMobile()) return;
        if (event.relatedTarget && dd.contains(event.relatedTarget)) return;
        if (event.relatedTarget === null &&
            (document.hasFocus() === false || pointerInside)) return;
        setDropdown(dd, false);
      });

      /* Hover keeps aria-expanded truthful on desktop. */
      dd.addEventListener('mouseenter', () => {
        pointerInside = true;
        if (isMobile() || !canHover.matches) return;
        clearTimeout(hoverTimer);
        closeAllDropdowns(dd);
        setDropdown(dd, true);
      });
      dd.addEventListener('mouseleave', () => {
        pointerInside = false;
        if (isMobile() || !canHover.matches) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          if (!dd.contains(document.activeElement)) setDropdown(dd, false);
        }, 150);
      });
    });

    /* ---------- Global interactions ---------- */

    header.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (!link) return;
      closeAllDropdowns();
      if (isMobile() && isDrawerOpen()) setDrawer(false);
    });

    document.addEventListener('click', event => {
      if (header.contains(event.target)) return;
      closeAllDropdowns();
      if (isDrawerOpen()) setDrawer(false);
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;

      if (isDrawerOpen()) {
        setDrawer(false, { restoreFocus: true });
        return;
      }
      const open = openDropdownOf(document.activeElement) ||
        dropdowns.find(dd => toggleOf(dd).getAttribute('aria-expanded') === 'true');
      if (open) {
        const hadFocus = open.contains(document.activeElement);
        setDropdown(open, false);
        if (hadFocus) toggleOf(open).focus();
      }
    });

    window.addEventListener('resize', debounce(() => {
      if (isMobile()) return;
      if (isDrawerOpen()) setDrawer(false);
      closeAllDropdowns();
    }, 150));

    /* ---------- Focus trap (mobile drawer) ---------- */

    const drawerFocusables = () =>
      $$(FOCUSABLE_SELECTOR, header)
        .filter(el => isVisible(el) && !el.closest('[inert]'));

    header.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      if (!isMobile() || !isDrawerOpen()) return;

      const items = drawerFocusables();
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !header.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !header.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* ============================================================
     9. ACTIVE NAVIGATION HIGHLIGHT
     ============================================================ */

  function setActiveNavigation() {
    const normalise = p => {
      const s = String(p || '')
        .replace(/\/+$/, '')
        .replace(/\/index\.html?$/i, '');
      return s || '/';
    };

    const here = normalise(location.pathname);
    const hash = location.hash;

    const links = $$(
      '.site-navigation a, .header-products-row a, .mobile-products-menu a'
    );

    links.forEach(link => {
      link.classList.remove('nav-active');
      link.removeAttribute('aria-current');
    });
    $$('.nav-parent-active').forEach(el => {
      el.classList.remove('nav-parent-active');
      el.removeAttribute('aria-current');
    });

    const candidates = [];
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      let url;
      try { url = new URL(href, document.baseURI); } catch (_) { return; }
      if (url.origin !== location.origin) return;

      const target = normalise(url.pathname);
      const samePath =
        target === here || (target !== '/' && here.startsWith(`${target}/`));
      if (!samePath) return;
      candidates.push({ link, hash: url.hash });
    });

    /* An exact #hash match wins; otherwise the plain page link is active. */
    const exact = hash ? candidates.filter(c => c.hash === hash) : [];
    const active = exact.length ? exact : candidates.filter(c => !c.hash);
    active.forEach(({ link }) => {
      link.classList.add('nav-active');
      link.setAttribute('aria-current', 'page');
    });

    $$('.header-products-row .dropdown, .site-navigation .dropdown').forEach(dd => {
      if (!dd.querySelector('a.nav-active')) return;
      const toggle = dd.querySelector('.dropdown-toggle');
      if (!toggle) return;
      toggle.classList.add('nav-parent-active');
      toggle.setAttribute('aria-current', 'true');
    });
  }

  /* ============================================================
     10. PROJECT FILTER (projects.html)
     ============================================================ */

  function initProjectFilter() {
    const filterGroup = document.getElementById('projectFilter');
    if (!filterGroup) return;

    const buttons = $$('.filter-btn[data-filter]', filterGroup);
    const cards = $$('.project-card[data-category]');
    if (!buttons.length || !cards.length) return;

    buttons.forEach(b =>
      b.setAttribute('aria-pressed', String(b.classList.contains('active'))));

    filterGroup.addEventListener('click', event => {
      const button = event.target.closest('.filter-btn[data-filter]');
      if (!button || !filterGroup.contains(button)) return;

      buttons.forEach(b => {
        const on = b === button;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });

      const value = button.dataset.filter;
      cards.forEach(card => {
        card.hidden = !(value === 'all' || card.dataset.category === value);
      });
    });
  }

  /* ============================================================
     10.1 PRODUCTS FILTER (products.html) + category hash ids
     ============================================================ */

  function initProductsFilter() {
    const filterGroup = document.getElementById('productFilter');
    if (!filterGroup) return;

    const buttons = $$('.filter-btn[data-filter]', filterGroup);
    const groups = $$('.product-category-group');
    if (!buttons.length || !groups.length) return;

    /* Give each category group its hash id if the markup lacks one. */
    Object.entries(PRODUCT_HASH_MAP).forEach(([id, categories]) => {
      if (document.getElementById(id)) return;
      const group = groups.find(g => categories.includes(g.dataset.category));
      if (group) group.id = id;
    });

    const applyFilter = value => {
      buttons.forEach(b => {
        const on = b.dataset.filter === value;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      groups.forEach(group => {
        group.hidden = !(value === 'all' || group.dataset.category === value);
      });
    };

    buttons.forEach(b =>
      b.setAttribute('aria-pressed', String(b.classList.contains('active'))));

    filterGroup.addEventListener('click', event => {
      const button = event.target.closest('.filter-btn[data-filter]');
      if (!button || !filterGroup.contains(button)) return;
      applyFilter(button.dataset.filter);
    });

    /* A category link must never land on a hidden group. */
    window.addEventListener('hashchange', () => {
      let id = location.hash.slice(1);
      try { id = decodeURIComponent(id); } catch (_) { /* keep raw */ }
      const target = id && document.getElementById(id);
      if (!target || !target.classList.contains('product-category-group')) return;
      if (target.hidden) applyFilter('all');
      requestAnimationFrame(() =>
        target.scrollIntoView({ block: 'start', behavior: scrollBehavior() }));
    });
  }

  /* ============================================================
     10.2 PRODUCT TABS (smooth scroll + scroll-spy)
     ============================================================ */

  function initProductTabs() {
    const tabs = $$('.pdp-section-nav a[href^="#"]')
      .filter(a => a.getAttribute('href').length > 1);
    if (!tabs.length) return;

    const entries = tabs
      .map(tab => ({ tab, section: document.getElementById(tab.getAttribute('href').slice(1)) }))
      .filter(e => e.section);
    if (!entries.length) return;

    const setActive = activeTab => {
      tabs.forEach(t => {
        const on = t === activeTab;
        t.classList.toggle('active', on);
        if (on) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
      });
    };

    entries.forEach(({ tab, section }) => {
      tab.addEventListener('click', event => {
        event.preventDefault();
        section.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        if (location.hash !== tab.getAttribute('href')) {
          history.pushState(null, '', tab.getAttribute('href'));
        }
        setActive(tab);
      });
    });

    if ('IntersectionObserver' in window) {
      const byId = new Map(entries.map(e => [e.section.id, e.tab]));
      const observer = new IntersectionObserver(items => {
        items.forEach(item => {
          if (!item.isIntersecting) return;
          const tab = byId.get(item.target.id);
          if (tab) setActive(tab);
        });
      }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
      entries.forEach(e => observer.observe(e.section));
    }

    const lastTab = entries[entries.length - 1].tab;
    window.addEventListener('scroll', debounce(() => {
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 50;
      if (atBottom && !lastTab.classList.contains('active')) setActive(lastTab);
    }, 50), { passive: true });
  }

  /* ============================================================
     11. MAILTO FORM (contact.html)
     ============================================================ */

  function initMailtoForm() {
    $$('[data-mailto-form]').forEach(form => {
      const configured =
        form.dataset.mailtoTo ||
        (form.getAttribute('action') || '').replace(/^mailto:/i, '').split('?')[0];
      /* Only accept something that looks like an address (not "#" etc.). */
      const to = /^[^\s@]+@[^\s@]+$/.test(configured) ? configured : DEFAULT_MAIL_TO;

      let status = $('.form-status', form);
      if (!status) {
        status = document.createElement('p');
        status.className = 'form-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.hidden = true;
        form.appendChild(status);
      }

      const showStatus = message => {
        status.replaceChildren(document.createTextNode(message + ' '));
        const link = document.createElement('a');
        link.href = `mailto:${to}`;
        link.textContent = to;
        status.appendChild(link);
        status.hidden = false;
      };

      form.addEventListener('submit', event => {
        event.preventDefault();

        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const data = new FormData(form);
        const name = String(data.get('name') || '').trim();
        const email = String(data.get('email') || '').trim();
        const subject = String(data.get('subject') || 'General Inquiry').trim();
        let message = String(data.get('message') || '').trim();

        const CRLF = '\r\n';
        const build = msg =>
          `mailto:${to}?subject=${encodeURIComponent(subject)}` +
          `&body=${encodeURIComponent(
            `Name: ${name}${CRLF}Email: ${email}${CRLF}${CRLF}` +
            msg.replace(/\r?\n/g, CRLF)
          )}`;

        let href = build(message);
        let truncated = false;
        /* Trim by code point: slicing UTF-16 units can leave half of an
           emoji behind, and encodeURIComponent then throws a URIError. */
        let chars = Array.from(message);
        while (href.length > MAILTO_MAX_LENGTH && chars.length > 0) {
          chars = chars.slice(0, Math.max(0, chars.length - 100));
          message = chars.join('');
          href = build(message);
          truncated = true;
        }

        window.location.href = href;

        showStatus(
          truncated
            ? 'Your message was too long for an email link and was shortened. ' +
              'Please paste the full text into the email that opens, or write to'
            : 'Your email app should open with your message. If nothing happens, please write to'
        );
      });
    });
  }

  /* ============================================================
     12. INVESTOR PANELS (investors.html)
     ============================================================ */

  function initInvestorPanels() {
    const links = $$('[data-ir]');
    const panels = $$('[data-ir-panel]');
    const tabs = $$('.ir-tab');
    const groups = $$('.ir-side-group');
    if (!links.length || !panels.length) return;

    const panelIds = new Set(panels.map(p => p.dataset.irPanel));

    const groupOfPanel = id => {
      const link = links.find(a => a.dataset.ir === id);
      const group = link && link.closest('.ir-side-group');
      return group ? group.dataset.irGroup || null : null;
    };

    const activate = requested => {
      const target = panelIds.has(requested) ? requested : 'overview';

      links.forEach(a => a.classList.toggle('active', a.dataset.ir === target));
      panels.forEach(p => p.classList.toggle('active', p.dataset.irPanel === target));

      const groupId = groupOfPanel(target);
      groups.forEach(g => g.classList.toggle('is-open', g.dataset.irGroup === groupId));

      tabs.forEach(t => {
        const on = t.dataset.irGroup === groupId;
        t.classList.toggle('active', on);
        if (on) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
      });
    };

    const sync = () => {
      let id = (location.hash || '#overview').slice(1);
      try { id = decodeURIComponent(id); } catch (_) { /* keep raw */ }
      /* A hash that names an ordinary element (not a panel) is a normal
         in-page anchor: leave the active panel alone. */
      if (!panelIds.has(id) && document.getElementById(id)) return;
      activate(id);
    };

    tabs.forEach(t => {
      t.addEventListener('click', event => {
        event.preventDefault();
        const group = groups.find(g => g.dataset.irGroup === t.dataset.irGroup);
        const firstLink = group && group.querySelector('[data-ir]');
        if (!firstLink) return;

        const id = firstLink.dataset.ir;
        history.pushState(null, '', `#${id}`);
        activate(id);
      });
    });

    window.addEventListener('hashchange', sync);
    sync();
  }

  /* ============================================================
     13. SITE SEARCH (search.html)
     ------------------------------------------------------------
     Index rows: [ title, url, category, body ]
     Source: window.DADEX_SEARCH_INDEX (search-index.js),
     with data/search-index.json as a fallback.
     ============================================================ */

  async function loadSearchIndex() {
    let raw = window.DADEX_SEARCH_INDEX;

    if (!Array.isArray(raw)) {
      const res = await fetch(new URL('data/search-index.json', document.baseURI), {
        cache: 'no-cache'
      });
      if (!res.ok) throw new Error(`Search index HTTP ${res.status}`);
      raw = await res.json();
    }

    return raw
      .filter(row => Array.isArray(row) && row.length >= 4)
      .map(row => {
        const title = String(row[0] ?? '').trim();
        const url = String(row[1] ?? '').trim();
        const category = String(row[2] ?? '').trim();
        let body = String(row[3] ?? '').replace(/\s+/g, ' ').trim();

        /* Scraped bodies start with the page title; drop it. */
        if (title && body.startsWith(title)) body = body.slice(title.length).trim();

        return { title, url, category, body };
      })
      .filter(e => e.title && e.url && !REMOVED_SEARCH_URLS.has(urlFileName(e.url)) && safeHttpUrl(e.url))
      .map(e => ({
        ...e,
        titleL: e.title.toLowerCase(),
        catL: e.category.toLowerCase(),
        urlL: e.url.toLowerCase(),
        bodyL: e.body.toLowerCase()
      }));
  }

  function scoreEntry(entry, terms) {
    let score = 0;
    for (const t of terms) {
      let s = 0;
      if (entry.titleL.includes(t)) {
        s += 10;
        if (entry.titleL.startsWith(t) || entry.titleL.includes(` ${t}`)) s += 5;
      }
      if (entry.catL.includes(t)) s += 4;
      if (entry.urlL.includes(t)) s += 3;
      if (entry.bodyL.includes(t)) s += 1;
      if (!s) return 0; // every term must match somewhere
      score += s;
    }
    return score;
  }

  function makeSnippet(entry, terms) {
    if (!entry.body) return '';
    let idx = -1;
    for (const t of terms) {
      const i = entry.bodyL.indexOf(t);
      if (i >= 0 && (idx < 0 || i < idx)) idx = i;
    }
    const start = idx > 60 ? idx - 60 : 0;
    const end = start + SEARCH_SNIPPET_LENGTH;
    return (start > 0 ? '…' : '') +
      entry.body.slice(start, end).trim() +
      (end < entry.body.length ? '…' : '');
  }

  function highlightFragment(text, regex) {
    const frag = document.createDocumentFragment();
    if (!regex) {
      frag.appendChild(document.createTextNode(text));
      return frag;
    }
    text.split(regex).forEach((part, i) => {
      if (!part) return;
      if (i % 2 === 1) {
        const mark = document.createElement('mark');
        mark.textContent = part;
        frag.appendChild(mark);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });
    return frag;
  }

  async function initSiteSearch() {
    const input = document.getElementById('siteSearchInput');
    if (!input) return;

    const grid = document.getElementById('searchResults');
    const empty = document.getElementById('searchEmpty');
    const count = document.getElementById('searchCount');
    const template = document.getElementById('searchResultTemplate');
    const clearBtn = document.getElementById('searchClear');
    const popularSearches = document.getElementById('popularSearches');
    const popularBtns = popularSearches ? $$('[data-query]', popularSearches) : [];

    if (!grid || !template) return;

    if (count) {
      count.setAttribute('aria-live', 'polite');
      count.textContent = 'Loading search index…';
    }

    let index;
    try {
      index = await loadSearchIndex();
    } catch (err) {
      console.warn('[Dadex] Search index failed to load.', err);
      if (count) count.textContent = 'Search is currently unavailable.';
      return;
    }
    if (count) count.textContent = 'Start searching';

    const toggleClearBtn = () => {
      const has = input.value.length > 0;
      if (clearBtn) clearBtn.hidden = !has;
      if (popularSearches) popularSearches.hidden = has;
    };

    const syncUrl = q => {
      try {
        history.replaceState(null, '',
          q ? `${location.pathname}?q=${encodeURIComponent(q)}` : location.pathname);
      } catch (_) { /* ignore */ }
    };

    const render = () => {
      const q = input.value.trim();
      toggleClearBtn();
      syncUrl(q);

      if (!q) {
        grid.replaceChildren();
        if (empty) empty.hidden = true;
        if (count) count.textContent = 'Start searching';
        return;
      }

      const terms = Array.from(new Set(q.toLowerCase().split(/\s+/).filter(Boolean)));
      const regex = new RegExp(
        `(${terms.slice().sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})`,
        'gi'
      );

      const rows = index
        .map(entry => ({ entry, score: scoreEntry(entry, terms) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
        .slice(0, SEARCH_MAX_RESULTS)
        .map(r => r.entry);

      if (count) {
        count.textContent =
          `${rows.length} result${rows.length === 1 ? '' : 's'} found for "${q}"`;
      }

      const frag = document.createDocumentFragment();
      for (const entry of rows) {
        const card = template.content.firstElementChild.cloneNode(true);

        const badge = $('.result-badge', card);
        const title = $('h3', card);
        const desc = $('p', card);
        const link = card.matches('a') ? card : $('a', card);

        if (badge) badge.textContent = entry.category;
        if (title) title.replaceChildren(highlightFragment(entry.title, regex));
        if (desc) desc.replaceChildren(highlightFragment(makeSnippet(entry, terms), regex));
        if (link) link.href = entry.url;

        frag.appendChild(card);
      }

      grid.replaceChildren(frag);
      if (empty) empty.hidden = rows.length !== 0;
    };

    const renderDebounced = debounce(render, 90);

    input.addEventListener('input', renderDebounced);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); render(); }
    });
    if (input.form) {
      input.form.addEventListener('submit', e => { e.preventDefault(); render(); });
    }

    document.addEventListener('keydown', e => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      const typing = el && (
        el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
      );
      if (typing || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      input.focus();
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        render();
        input.focus();
      });
    }

    popularBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.dataset.query || '';
        render();
        input.focus();
      });
    });

    const qParam = new URLSearchParams(location.search).get('q');
    if (qParam) input.value = qParam;
    render();
  }

  /* ============================================================
     14. DEXPERT ASSISTANT
     ============================================================ */

  const DEXPERT_PRODUCTS = [
    ['Aquadex', 'product-aquadex.html'],
    ['T-Flex', 'product-tflex.html'],
    ['Polydex Premium', 'product-polydex-premium.html'],
    ['Polydex', 'product-polydex.html'],
    ['Thermoline', 'product-thermoline.html'],
    ['Flow Line', 'product-flow-line.html'],
    ['Inspection Chambers', 'product-inspection-chambers.html'],
    ['Manholes', 'product-manholes.html'],
    ['Catchpits', 'product-catchpits.html'],
    ['Nikasi', 'product-nikasi.html'],
    ['Polyduct', 'product-polyduct.html'],
    ['ASTM UPVC SWV', 'product-astm.html'],
    ['HTplus', 'product-htplus.html'],
    ['PE Cable Duct', 'product-pe-cable-duct.html'],
    ['Electrical Conduits', 'product-electrical-conduits.html'],
    ['Electroduct', 'product-electroduct.html'],
    ['Corrugated Sheets', 'product-corrugated-sheets.html'],
    ['Non-Return Valves', 'product-non-return-valves.html'],
    ['T-Flex Gas', 'product-tflex-gas.html'],
    ['T-Flex Compressed Air', 'product-tflex-compressed-air.html'],
    ['UPVC Tubewell Casing & Screen Pipes System', 'product-upvc-tubewell.html']
  ];

  const DEXPERT_APPS = [
    ['Water Supply', 'products.html#water-supply'],
    ['Soil, Waste & Vent', 'products.html#soil-waste-vent'],
    ['Sewerage & Drainage', 'products.html#sewerage-drainage'],
    ['Cable & Utility Ducting', 'products.html#cable-utility-ducting'],
    ['Specialised & Industrial', 'products.html#specialised-industrial'],
    ['Roofing', 'products.html#roofing']
  ];

  const dexKey = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

  /* Words too generic to identify a single product on their own. */
  const DEXPERT_GENERIC_WORDS = new Set([
    'pipe', 'pipes', 'system', 'systems', 'duct', 'ducts', 'cable',
    'casing', 'screen', 'electrical', 'compressed', 'return'
  ]);

  const DEXPERT_PRODUCTS_BY_LENGTH = DEXPERT_PRODUCTS
    .map(([name, href]) => ({
      name, href,
      key: dexKey(name),
      words: name.toLowerCase().split(/[^a-z0-9]+/)
        .filter(w => w.length >= 4 && !DEXPERT_GENERIC_WORDS.has(w))
    }))
    .sort((a, b) => b.key.length - a.key.length);

  const DEXPERT_APPS_KEYED = DEXPERT_APPS
    .map(([name, href]) => ({ name, href, key: dexKey(name) }));

  const intent = (re, label, heading, message, href, cta) =>
    ({ re, label, heading, message, href, cta });

  const DEXPERT_INTENTS = [
    intent(/\b(report|annual|financial|investor|shareholder|agm|dividend)\b/,
      'INVESTOR', 'Investor Relations',
      'Find annual reports, financial information and shareholder references.',
      'investors.html#annual', 'Open investor information'),
    intent(/\b(brochure|flyer|leaflet|literature|document|datasheet|certificate|drawing)s?\b/,
      'LITERATURE', 'Literature',
      'Find brochures, flyers, corporate publications and technical documents.',
      'literature.html', 'Open Literature'),
    intent(/\b(video|installation|demonstration)s?\b/,
      'VIDEOS', 'Videos',
      'Installation guides, product overviews and application demonstrations.',
      'videos.html', 'Open Videos'),
    intent(/\b(calculator|pressure drop|flow rate|head loss|sizing)s?\b/,
      'CALCULATORS', 'Calculators',
      'Engineering calculators for pipe selection, hydraulic design and unit conversion.',
      'calculators.html', 'Open Calculators'),
    intent(/\b(dealer|distributor|stockist|retailer|buy|where to)\b/,
      'DEALERS', 'Find a Dealer',
      'Locate Dadex dealers and distributors by province, city, area or product.',
      'dealers.html', 'Open dealer locator'),
    intent(/\b(contact|sales|office|phone|call|quote|quotation|price|pricing|enquiry|inquiry)\b/,
      'CONTACT', 'Contact Dadex',
      'Reach the head office or your nearest sales office.',
      'contact.html', 'Contact Dadex'),
    intent(/\b(swv|soil|ventilation)\b/,
      'APPLICATION', 'Soil, Waste & Vent',
      'Explore the systems listed for this application area.',
      'products.html#soil-waste-vent', 'Explore'),
    intent(/\b(drain\w*|sewer\w*|sewage|manhole|septic)\b/,
      'APPLICATION', 'Sewerage & Drainage',
      'Explore the systems listed for this application area.',
      'products.html#sewerage-drainage', 'Explore'),
    intent(/\b(cable|duct\w*|conduit\w*|wiring|electrical|telecom\w*)\b/,
      'APPLICATION', 'Cable & Utility Ducting',
      'Explore the systems listed for this application area.',
      'products.html#cable-utility-ducting', 'Explore'),
    intent(/\b(gas|compressed air|tubewell|borewell|well|industrial)\b/,
      'APPLICATION', 'Specialised & Industrial',
      'Explore the systems listed for this application area.',
      'products.html#specialised-industrial', 'Explore'),
    intent(/\b(roof\w*|sheet\w*|cladding|shed\w*|warehouse\w*)\b/,
      'APPLICATION', 'Roofing',
      'Explore the systems listed for this application area.',
      'products.html#roofing', 'Explore'),
    intent(/\b(plumb\w*|water|hot|cold|domestic|home|house|housing|bathroom|kitchen|apartment|pressure)\b/,
      'APPLICATION', 'Water Supply',
      'Explore the systems listed for this application area.',
      'products.html#water-supply', 'Explore')
  ];

  function resolveDexpertQuery(query) {
    const q = String(query || '').toLowerCase().trim();
    const qKey = dexKey(q);

    if (!qKey) {
      return {
        label: 'DEXPERT', heading: 'Try a search',
        message: 'Enter a product or application such as Aquadex, water supply or gas.',
        href: 'products.html', cta: 'Browse products'
      };
    }

    const productResult = p => ({
      label: 'PRODUCT', heading: p.name,
      message: 'Open the product page for its approved information.',
      href: p.href, cta: 'Open product'
    });

    // 1. Exact product name
    let product = DEXPERT_PRODUCTS_BY_LENGTH.find(p => p.key === qKey);
    // 2. Query contains a product name (longest first).
    //    Minimum 4 characters so a 3-char query can never accidentally
    //    match a longer product key that happens to contain it.
    if (!product && qKey.length >= 4) {
      product = DEXPERT_PRODUCTS_BY_LENGTH.find(p => qKey.includes(p.key));
    }
    // 3. Query is the start of a word that belongs to exactly one product.
    if (!product && qKey.length >= 4) {
      const hits = DEXPERT_PRODUCTS_BY_LENGTH
        .filter(p => p.words.some(w => w.startsWith(qKey)));
      if (hits.length === 1) product = hits[0];
    }
    if (product) return productResult(product);

    // 4. Application names
    let app = DEXPERT_APPS_KEYED.find(a => a.key === qKey) ||
      (qKey.length >= 4 && DEXPERT_APPS_KEYED.find(a => a.key.includes(qKey) || qKey.includes(a.key)));
    if (app) {
      return {
        label: 'APPLICATION', heading: app.name,
        message: 'Explore the systems listed for this application area.',
        href: app.href, cta: 'Explore'
      };
    }

    // 5. Plain-language intents
    const hit = DEXPERT_INTENTS.find(i => i.re.test(q));
    if (hit) {
      return {
        label: hit.label, heading: hit.heading, message: hit.message,
        href: hit.href, cta: hit.cta
      };
    }

    return {
      label: 'DEXPERT', heading: 'No direct match',
      message: 'Try a product, application or resource term, or search the whole site.',
      href: `search.html?q=${encodeURIComponent(String(query || '').trim())}`,
      cta: 'Search the site'
    };
  }

  function initDEXPERT() {
    if (document.querySelector('.dexpert-fab')) return;

    const fab = document.createElement('button');
    fab.className = 'dexpert-fab';
    fab.type = 'button';
    fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML =
      '<img src="assets/images/Dexpert.png" alt="" aria-hidden="true">' +
      '<span><strong>Ask DEXPERT</strong></span>';
    document.body.appendChild(fab);

    const file = location.pathname.split('/').pop() || 'index.html';
    const isProduct = file.startsWith('product-');
    const isInvestor = /investor|financial-reports/i.test(file);
    const isResources = /literature|calculators|videos|news/i.test(file);

    let dialogPromise = null;

    function loadDialog() {
      if (dialogPromise) return dialogPromise;

      dialogPromise = (async () => {
        const existing = document.getElementById('dexpertDialog');
        const homeExisting = document.getElementById('dexpertHomeTemplate');
        const resultExisting = document.getElementById('dexpertResultTemplate');

        if (existing && homeExisting && resultExisting) {
          if (existing.dataset.wired !== 'true') wireDialog(existing, homeExisting, resultExisting);
          return existing;
        }

        const fetchUrl = new URL('components/dexpert.html', document.baseURI);
        const res = await fetch(fetchUrl, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${fetchUrl.href}`);

        const html = await res.text();
        if (/^\s*<!DOCTYPE\s+html/i.test(html)) {
          throw new Error('Server returned a full HTML document instead of the DEXPERT fragment.');
        }

        const temp = document.createElement('div');
        temp.innerHTML = html;

        const dialog = temp.querySelector('dialog#dexpertDialog');
        const homeTpl = temp.querySelector('template#dexpertHomeTemplate');
        const resultTpl = temp.querySelector('template#dexpertResultTemplate');
        if (!dialog || !homeTpl || !resultTpl) {
          throw new Error('dexpert.html is missing one of the required elements.');
        }

        document.body.append(homeTpl, resultTpl, dialog);
        wireDialog(dialog, homeTpl, resultTpl);
        return dialog;
      })();

      dialogPromise.catch(() => { dialogPromise = null; });
      return dialogPromise;
    }

    function buildActions(container, actions) {
      if (!container) return;
      const frag = document.createDocumentFragment();
      for (const [href, label] of actions) {
        const a = document.createElement('a');
        a.href = href;
        const span = document.createElement('span');
        span.textContent = label;
        const icon = document.createElement('i');
        icon.className = 'fas fa-arrow-right';
        icon.setAttribute('aria-hidden', 'true');
        a.append(span, icon);
        frag.appendChild(a);
      }
      container.replaceChildren(frag);
    }

    function renderHome(dialog, homeTpl) {
      const body = $('#dexpertBody', dialog);
      if (!body) return;

      const node = homeTpl.content.firstElementChild.cloneNode(true);

      let actions;
      if (isProduct) {
        actions = [
          ['#technical', 'Technical information'],
          ['literature.html', 'Literature'],
          ['products.html', 'Related products'],
          ['dealers.html', 'Find a dealer']
        ];
      } else if (isInvestor) {
        actions = [
          ['investors.html', 'Investor Relations'],
          ['investors.html#annual', 'Annual Reports'],
          ['contact.html', 'Investor enquiry']
        ];
      } else if (isResources) {
        actions = [
          ['products.html', 'Find a product'],
          ['literature.html', 'Literature'],
          ['videos.html', 'Videos'],
          ['calculators.html', 'Calculators'],
          ['contact.html', 'Technical support']
        ];
      } else {
        actions = [
          ['products.html', 'Find a product'],
          ['literature.html', 'Literature'],
          ['videos.html', 'Videos'],
          ['calculators.html', 'Calculators'],
          ['dealers.html', 'Find a dealer']
        ];
      }

      buildActions($('.dexpert-actions', node), actions);
      body.replaceChildren(node);
    }

    function renderAnswer(dialog, homeTpl, resultTpl, query) {
      const body = $('#dexpertBody', dialog);
      if (!body) return;

      const r = resolveDexpertQuery(query);
      const node = resultTpl.content.firstElementChild.cloneNode(true);

      const setText = (selector, text) => {
        const el = $(selector, node);
        if (el) el.textContent = text;
      };
      setText('[data-label]', r.label);
      setText('[data-heading]', r.heading);
      setText('[data-message]', r.message);
      setText('[data-cta]', r.cta);

      const link = $('.dexpert-result-link', node) || $('a[href]', node);
      if (link) link.href = r.href;

      body.replaceChildren(node);
      const back = $('.dexpert-back', node);
      if (back) back.addEventListener('click', () => renderHome(dialog, homeTpl));
    }

    function wireDialog(dialog, homeTpl, resultTpl) {
      dialog.dataset.wired = 'true';

      const closeBtn = $('.dexpert-close', dialog);
      if (closeBtn) closeBtn.addEventListener('click', () => dialog.close());

      /* Close on a backdrop click only when the press also started on the
         backdrop, so finishing a text-selection drag outside doesn't close. */
      let pressedOnBackdrop = false;
      dialog.addEventListener('pointerdown', e => {
        pressedOnBackdrop = e.target === dialog;
      });
      dialog.addEventListener('click', e => {
        if (e.target === dialog) {
          if (pressedOnBackdrop) dialog.close();
          pressedOnBackdrop = false;
          return;
        }
        /* Navigating (including same-page #anchors) must dismiss the modal. */
        if (e.target.closest('a[href]')) dialog.close();
      });

      dialog.addEventListener('close', () => {
        fab.setAttribute('aria-expanded', 'false');
      });

      const form = $('.dexpert-ask', dialog);
      const input = $('#expert-input', dialog);
      if (form && input) {
        form.addEventListener('submit', e => {
          e.preventDefault();
          const query = input.value.trim();
          if (!query) return;
          renderAnswer(dialog, homeTpl, resultTpl, query);
          input.value = '';
        });
      }

      renderHome(dialog, homeTpl);
    }

    const open = async () => {
      try {
        const nav = document.getElementById('site-navigation');
        if (nav && nav.classList.contains('open')) {
          const toggle = $('.menu-toggle');
          if (toggle) toggle.click(); // close drawer through its own logic
        }

        const dialog = await loadDialog();
        fab.setAttribute('aria-controls', 'dexpertDialog'); // exists now
        if (dialog.open) return;

        dialog.showModal();
        fab.setAttribute('aria-expanded', 'true');
        setTimeout(() => {
          const input = $('#expert-input', dialog);
          if (input) input.focus();
        }, 60);
      } catch (err) {
        console.error('[Dadex] DEXPERT failed to load:', err);
      }
    };

    /* Warm the dialog up before the first click. */
    const preload = () => { loadDialog().catch(() => {}); };
    fab.addEventListener('pointerenter', preload, { once: true });
    fab.addEventListener('focus', preload, { once: true });

    fab.addEventListener('click', open);

    document.addEventListener('click', e => {
      if (e.target.closest('[data-open-dexpert]')) {
        e.preventDefault();
        open();
      }
    });
  }

  /* ============================================================
     15. BACK TO TOP
     ============================================================ */

  function initBackToTop() {
    if (document.querySelector('.back-to-top')) return;

    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
    document.body.appendChild(btn);

    let ticking = false;
    let visible = null;

    const update = () => {
      ticking = false;
      const next = window.scrollY > SCROLL_TOP_THRESHOLD;
      if (next === visible) return;
      visible = next;
      btn.classList.toggle('is-visible', next);
    };

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
    });
  }
})();