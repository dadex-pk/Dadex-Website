/* ============================================================
   DADEX ETERNIT LIMITED — SHARED UI  (v5)
   ------------------------------------------------------------
   v5 changes
     · Bootstrap wrapped in try/catch — a failure in one init
       never blocks the rest (DEXPERT, back-to-top, filters)
     · initSiteSearch waits for window.DADEX_SEARCH_INDEX via
       'dadex:search-index-ready' event with a window.load
       fallback — no more "empty search" when the index script
       loads after main.js
     · inert assignment feature-guarded — silently skipped on
       browsers without support (CSS visibility:hidden already
       removes collapsed tiers from the tab order)
     · All init functions have explicit guard clauses
   ============================================================ */

const MOBILE_NAV_MAX = 1024;
const COMPANY_FOUNDED_YEAR = 1959;
const COMPANY_ANNIVERSARY_MONTH = 3;
const COMPANY_ANNIVERSARY_DAY = 13;
const SCROLL_TOP_THRESHOLD = 600;
const HEADER_COLLAPSE_THRESHOLD = 70;

const REMOVED_SEARCH_URLS = new Set([
  'careers.html',
  'faq.html',
  'whistleblowing.html',
  'technical-resources.html',
  'solutions.html'
]);

/* True only when the browser implements the inert property. */
const INERT_SUPPORTED = typeof HTMLElement !== 'undefined'
  && 'inert' in HTMLElement.prototype;

/* ------------------------------------------------------------
   Utilities
   ------------------------------------------------------------ */

function debounce(fn, wait){
  let timer = null;
  return function debounced(...args){
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

const scheduleIdle = (typeof requestIdleCallback === 'function')
  ? cb => requestIdleCallback(cb, { timeout: 2000 })
  : cb => setTimeout(cb, 200);

/* ------------------------------------------------------------
   Bootstrap
   Each initializer runs independently. A throw in one does not
   prevent the next from running.
   ------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadSharedComponents();
  } catch (err) {
    console.error('[Dadex] Component injection failed:', err);
  }

  const header = document.getElementById('siteHeader')
              || document.querySelector('.site-header');

  const run = (label, fn) => {
    try { fn(); }
    catch (err) { console.error(`[Dadex] init ${label} failed:`, err); }
  };

  run('dynamic-text', initDynamicSiteText);
  run('header-state', () => initHeaderState(header));
  run('navigation', () => initNavigation(header));
  run('active-nav', setActiveNavigation);

  run('project-filter', initProjectFilter);
  run('mailto-form', initMailtoForm);
  run('literature-filter', initLiteratureFilter);
  run('investor-panels', initInvestorPanels);
  run('site-search', initSiteSearch);

  run('dexpert', initDEXPERT);
  run('back-to-top', initBackToTop);
});

/* ------------------------------------------------------------
   Shared header / footer injection
   ------------------------------------------------------------ */

async function loadSharedComponents(){
  const mounts = Array.from(document.querySelectorAll('[data-component]'))
    .filter(m => {
      const n = m.getAttribute('data-component');
      return n === 'header' || n === 'footer';
    });
  if (!mounts.length) return;

  if (location.protocol === 'file:') {
    mounts.forEach(mount => renderComponentError(mount, {
      name: mount.getAttribute('data-component'),
      reason:
        'The site was opened directly from disk (file:// protocol). ' +
        'Browsers block file fetches for security. ' +
        'Start a local server — for example ' +
        '<code>python3 -m http.server 8080</code> — and open ' +
        '<code>http://localhost:8080/</code>.'
    }));
    return;
  }

  const base = new URL('.', location.href);
  console.log('[Dadex] Component base URL:', new URL('components/', base).href);

  await Promise.allSettled(mounts.map(mount => loadOneComponent(mount, base)));
}

async function loadOneComponent(mount, base){
  const name = mount.getAttribute('data-component');
  const fetchUrl = new URL(`components/${name}.html`, base);

  try {
    const response = await fetch(fetchUrl, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const html = await response.text();

    if (/^\s*<!DOCTYPE\s+html/i.test(html)) {
      throw new Error(
        'Server returned a full HTML document, not a component fragment. ' +
        'Likely a server-side 404 or SPA fallback.'
      );
    }

    mount.outerHTML = html;
  } catch (error) {
    console.error(
      `[Dadex] Failed to load ${name}.html from ${fetchUrl.href}`,
      error
    );
    renderComponentError(mount, {
      name,
      url: fetchUrl.href,
      reason: error.message
    });
  }
}

function renderComponentError(mount, { name, url, reason }){
  mount.setAttribute('data-component-error', name);
  mount.innerHTML = `
    <div style="
      padding:14px 20px;
      background:#fff4f4;
      color:#8a0000;
      font:600 13px/1.55 system-ui,-apple-system,sans-serif;
      border-bottom:2px solid #e50000;
    ">
      <strong>Dadex component error — ${name}:</strong>
      ${reason}
      ${url ? `<br><small style="opacity:.75;font-weight:500;">
        Attempted URL: <code>${url}</code>
      </small>` : ''}
    </div>
  `;
}

/* ------------------------------------------------------------
   Dynamic text — current year, company age
   ------------------------------------------------------------ */

function initDynamicSiteText(){
  const now = new Date();
  const anniversary = new Date(
    now.getFullYear(),
    COMPANY_ANNIVERSARY_MONTH,
    COMPANY_ANNIVERSARY_DAY
  );
  const age = now < anniversary
    ? now.getFullYear() - COMPANY_FOUNDED_YEAR - 1
    : now.getFullYear() - COMPANY_FOUNDED_YEAR;

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

/* ------------------------------------------------------------
   Header state — home/internal flag + scroll-driven collapse
   ------------------------------------------------------------ */

function initHeaderState(header){
  if (!header) return;

  const path = window.location.pathname;
  const isHome = document.body.classList.contains('home-page')
    || path === '/'
    || path.endsWith('/index.html');
  header.dataset.headerState = isHome ? 'home' : 'internal';

  let ticking = false;

  const update = () => {
    const scrolled = window.scrollY > HEADER_COLLAPSE_THRESHOLD;
    header.classList.toggle('is-scrolled', scrolled);
    document.body.classList.toggle('header-scrolled', scrolled);

    /* Collapsed tiers are already hidden by CSS visibility:hidden;
       inert is an optional enhancement that removes them from AT
       and blocks pointer events. Skipped on browsers without it. */
    if (INERT_SUPPORTED) {
      const utilityBar = header.querySelector('.utility-bar');
      const productsTier = header.querySelector('.header-products-tier');
      if (utilityBar) utilityBar.inert = scrolled;
      if (productsTier) productsTier.inert = scrolled;
    }

    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });

  update();
}

/* ------------------------------------------------------------
   Navigation
   ------------------------------------------------------------ */

function initNavigation(header){
  if (!header) return;

  const nav = document.getElementById('site-navigation');
  const hamburger = document.querySelector('.menu-toggle');
  if (!nav) return;

  const isMobile = () => window.innerWidth <= MOBILE_NAV_MAX;

  const closeAllDropdowns = () => {
    document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]')
      .forEach(btn => btn.setAttribute('aria-expanded', 'false'));
  };

  const closeDrawer = ({ restoreFocus = false } = {}) => {
    closeAllDropdowns();
    nav.classList.remove('open');
    document.body.classList.remove('nav-open');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open navigation');
    }
    if (restoreFocus && hamburger) hamburger.focus();
  };

  const anyMenuOpen = () =>
    nav.classList.contains('open') ||
    !!document.querySelector('.dropdown-toggle[aria-expanded="true"]');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const open = !nav.classList.contains('open');
      if (open) {
        nav.classList.add('open');
        document.body.classList.add('nav-open');
        hamburger.setAttribute('aria-expanded', 'true');
        hamburger.setAttribute('aria-label', 'Close navigation');
      } else {
        closeDrawer();
      }
    });
  }

  document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
    const menuId = toggle.getAttribute('aria-controls');
    const menu = menuId ? document.getElementById(menuId) : toggle.nextElementSibling;
    if (!menu) return;

    toggle.addEventListener('click', event => {
      if (!isMobile()) return;
      event.preventDefault();
      event.stopPropagation();
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      closeAllDropdowns();
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });

    toggle.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        toggle.setAttribute('aria-expanded', 'true');
        const first = menu.querySelector('a, button');
        if (first) first.focus();
      }
    });
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (link.classList.contains('dropdown-toggle') && isMobile()) return;
      if (isMobile()) closeDrawer({ restoreFocus: false });
      closeAllDropdowns();
    });
  });

  document.addEventListener('click', event => {
    if (header.contains(event.target)) return;
    closeDrawer();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!anyMenuOpen()) return;
    closeDrawer({ restoreFocus: true });
  });

  window.addEventListener('resize', debounce(() => {
    if (isMobile()) return;
    document.body.classList.remove('nav-open');
    nav.classList.remove('open');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open navigation');
    }
    closeAllDropdowns();
  }, 150), { passive: true });

  const FOCUSABLE_SELECTOR =
    'a[href]:not([disabled]), button:not([disabled]), ' +
    'input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

  const getDrawerFocusables = () =>
    Array.from(nav.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(el => !el.hasAttribute('inert'));

  nav.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    if (!isMobile() || !nav.classList.contains('open')) return;
    const items = getDrawerFocusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

/* ------------------------------------------------------------
   Active navigation
   ------------------------------------------------------------ */

function setActiveNavigation(){
  const normalisePath = p => {
    const norm = String(p || '').replace(/\/+$/, '') || '/';
    return (norm === '/index.html' || norm === '/index.htm') ? '/' : norm;
  };

  const path = normalisePath(window.location.pathname);

  document.querySelectorAll('.site-navigation a').forEach(link => {
    link.classList.remove('nav-active');
    link.removeAttribute('aria-current');
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    try {
      const target = normalisePath(new URL(href, window.location.origin).pathname);
      if (target === path || (target !== '/' && path.startsWith(target + '/'))) {
        link.classList.add('nav-active');
        link.setAttribute('aria-current', 'page');
      }
    } catch (_) {}
  });

  const markMatchingLinks = selector => {
    document.querySelectorAll(selector).forEach(item => {
      const href = item.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      try {
        const url = new URL(href, window.location.href);
        const target = normalisePath(url.pathname);
        const samePath = target === path || (target !== '/' && path.startsWith(target + '/'));
        const hashMatches = !url.hash || url.hash === window.location.hash;
        if (samePath && hashMatches) {
          item.classList.add('nav-active');
          if (item.tagName === 'A') item.setAttribute('aria-current', 'page');
        }
      } catch (_) {}
    });
  };
  markMatchingLinks('.header-products-row a, .mobile-products-menu a');

  document.querySelectorAll('.header-products-row .dropdown').forEach(dropdown => {
    const active = dropdown.querySelector('a.nav-active');
    if (active) {
      const toggle = dropdown.querySelector('.dropdown-toggle');
      if (toggle) toggle.classList.add('nav-parent-active');
    }
  });
}

/* ------------------------------------------------------------
   Project filter
   ------------------------------------------------------------ */

function initProjectFilter(){
  const filterGroup = document.getElementById('projectFilter');
  if (!filterGroup) return;

  const buttons = filterGroup.querySelectorAll('.filter-btn[data-filter]');
  const cards = document.querySelectorAll('.project-card[data-category]');
  if (!buttons.length || !cards.length) return;

  filterGroup.addEventListener('click', event => {
    const button = event.target.closest('.filter-btn[data-filter]');
    if (!button || !filterGroup.contains(button)) return;

    buttons.forEach(b => b.classList.toggle('active', b === button));

    const value = button.dataset.filter;
    cards.forEach(card => {
      card.hidden = !(value === 'all' || card.dataset.category === value);
    });
  });
}

/* ------------------------------------------------------------
   Mailto contact form
   ------------------------------------------------------------ */

function initMailtoForm(){
  document.querySelectorAll('[data-mailto-form]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const subject = String(data.get('subject') || 'General Question').trim();
      const message = String(data.get('message') || '').trim();
      if (!name || !email) { form.reportValidity(); return; }
      const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
      window.location.href =
        `mailto:info@dadex.com.pk?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;
    });
  });
}

/* ------------------------------------------------------------
   Literature filter
   ------------------------------------------------------------ */

function initLiteratureFilter(){
  const grid = document.getElementById('resourceGrid');
  if (!grid) return;

  const input       = document.getElementById('resourceSearch');
  const typeSelect  = document.getElementById('resourceType');
  const clearBtn    = document.getElementById('resourceClear');
  const emptyState  = document.getElementById('resourceEmpty');
  const emptyReset  = document.getElementById('resourceEmptyReset');
  const countLine   = document.getElementById('resourceCount');
  const certsCard   = document.getElementById('litCertificates');

  const sections   = grid.querySelectorAll('.lit-section');
  const cards      = grid.querySelectorAll('.lit-card');
  const totalCards = cards.length;

  const applyFilters = () => {
    const query = (input?.value || '').trim().toLowerCase();
    const type  = (typeSelect?.value || 'all').toLowerCase();
    let visibleCards = 0;

    cards.forEach(card => {
      const name      = (card.dataset.name || '').toLowerCase();
      const cardTypes = (card.dataset.types || '').split(/\s+/).filter(Boolean);

      const matchesSearch = !query || name.includes(query);
      const matchesType   = type === 'all' || cardTypes.includes(type);

      card.querySelectorAll('.lit-btn[data-type]').forEach(btn => {
        btn.hidden = type !== 'all' && btn.dataset.type !== type;
      });

      const show = matchesSearch && matchesType;
      card.hidden = !show;
      if (show) visibleCards++;
    });

    sections.forEach(section => {
      const anyVisible = Array.prototype.some.call(
        section.querySelectorAll('.lit-card'),
        c => !c.hidden
      );
      section.hidden = !anyVisible;
    });

    if (emptyState) emptyState.hidden = visibleCards !== 0;
    if (certsCard)  certsCard.hidden  = visibleCards === 0;

    if (countLine) {
      if (visibleCards === 0) {
        countLine.textContent = 'No documents match your filters';
      } else if (visibleCards === totalCards) {
        countLine.textContent = `Showing all ${totalCards} documents`;
      } else {
        countLine.textContent = `Showing ${visibleCards} of ${totalCards} documents`;
      }
    }

    if (clearBtn) {
      clearBtn.hidden = !(query !== '' || type !== 'all');
    }
  };

  const clearAll = () => {
    if (input) input.value = '';
    if (typeSelect) typeSelect.value = 'all';
    applyFilters();
  };

  if (input)      input.addEventListener('input', applyFilters);
  if (typeSelect) typeSelect.addEventListener('change', applyFilters);
  if (clearBtn)   clearBtn.addEventListener('click', clearAll);
  if (emptyReset) emptyReset.addEventListener('click', clearAll);

  applyFilters();
}

/* ------------------------------------------------------------
   Investor panel switcher
   ------------------------------------------------------------ */

function initInvestorPanels(){
  const links  = [...document.querySelectorAll('[data-ir]')];
  const panels = [...document.querySelectorAll('[data-ir-panel]')];
  if (!links.length || !panels.length) return;

  const groups = [...document.querySelectorAll('.ir-side-group')];
  const isMobile = () => window.matchMedia(`(max-width:${MOBILE_NAV_MAX}px)`).matches;

  const openGroupFor = id => {
    if (!isMobile()) return;
    groups.forEach(g => {
      const hasLink = [...g.querySelectorAll('[data-ir]')]
        .some(a => a.dataset.ir === id);
      g.classList.toggle('is-open', hasLink);
    });
  };

  const activate = id => {
    const target = id || 'overview';
    links.forEach(a => a.classList.toggle('active', a.dataset.ir === target));
    panels.forEach(p => p.classList.toggle('active', p.dataset.irPanel === target));
    openGroupFor(target);
  };

  const sync = () => activate((location.hash || '#overview').slice(1));

  groups.forEach(group => {
    const title = group.querySelector('.ir-side-title');
    if (!title) return;
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    title.setAttribute('aria-expanded', 'false');
    const toggle = () => {
      if (!isMobile()) return;
      const open = !group.classList.contains('is-open');
      groups.forEach(g => g.classList.remove('is-open'));
      group.classList.toggle('is-open', open);
      title.setAttribute('aria-expanded', String(open));
    };
    title.addEventListener('click', toggle);
    title.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  links.forEach(a => a.addEventListener('click', () => setTimeout(sync, 0)));
  window.addEventListener('hashchange', sync);
  window.addEventListener('resize', debounce(sync, 150));
  sync();
}

/* ------------------------------------------------------------
   Site search
   Waits for window.DADEX_SEARCH_INDEX if the index script has
   not yet executed. Listens for 'dadex:search-index-ready' and
   falls back to window.load.
   ------------------------------------------------------------ */

function initSiteSearch(){
  const input = document.getElementById('siteSearchInput');
  if (!input) return;

  const button   = document.getElementById('searchButton')
                || document.getElementById('siteSearchButton');
  const clear    = document.getElementById('searchClear');
  const grid     = document.getElementById('searchResults');
  const empty    = document.getElementById('searchEmpty');
  const count    = document.getElementById('searchCount');
  const template = document.getElementById('searchResultTemplate');

  if (!grid || !template) return;

  let bound = false;

  const bind = () => {
    if (bound) return;
    if (!Array.isArray(window.DADEX_SEARCH_INDEX)) return;
    bound = true;

    const normaliseSearchUrl = raw =>
      String(raw || '').replace(/^(?:https?:\/\/[^/]+)?\/+/, '');

    const pages = window.DADEX_SEARCH_INDEX.filter(p => {
      if (!p || !p[1]) return false;
      return !REMOVED_SEARCH_URLS.has(normaliseSearchUrl(p[1]));
    });

    const truncatePreview = (text, max = 160) => {
      const clean = String(text || '').replace(/\s+/g, ' ').trim();
      if (clean.length <= max) return clean;
      const cut = clean.slice(0, max);
      const lastSpace = cut.lastIndexOf(' ');
      return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
    };

    const render = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        grid.replaceChildren();
        empty.hidden = true;
        count.textContent = 'Start searching';
        return;
      }
      const terms = q.split(/\s+/).filter(Boolean);
      const rows = pages
        .filter(p => terms.every(t => p.join(' ').toLowerCase().includes(t)))
        .slice(0, 60);

      count.textContent = `${rows.length} result${rows.length === 1 ? '' : 's'} found`;

      const frag = document.createDocumentFragment();
      for (const p of rows) {
        const card = template.content.firstElementChild.cloneNode(true);
        card.querySelector('.result-type').textContent = p[2];
        card.querySelector('h3').textContent = p[0];
        card.querySelector('p').textContent = truncatePreview(p[3]);
        card.querySelector('a').href = p[1];
        frag.appendChild(card);
      }
      grid.replaceChildren(frag);
      empty.hidden = rows.length !== 0;
    };

    if (button) button.addEventListener('click', render);
    input.addEventListener('input', render);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') render(); });
    if (clear) clear.addEventListener('click', () => {
      input.value = '';
      render();
      input.focus();
      if (location.search) {
        try { history.replaceState(null, '', location.pathname); } catch (_) {}
      }
    });

    const q = new URLSearchParams(location.search).get('q');
    if (q) { input.value = q; render(); }
  };

  if (Array.isArray(window.DADEX_SEARCH_INDEX)) {
    bind();
  } else {
    window.addEventListener('dadex:search-index-ready', bind, { once: true });
    window.addEventListener('load', bind, { once: true });
  }
}

/* ------------------------------------------------------------
   DEXPERT — floating assistant
   ------------------------------------------------------------ */

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
  ['Sewerage & Drainage', 'products.html#sewerage-drainage'],
  ['Cable & Utility Ducting', 'products.html#cable-utility-ducting'],
  ['Specialised & Industrial', 'products.html#specialised-industrial'],
  ['Roofing', 'products.html#roofing']
];

function initDEXPERT(){
  if (document.querySelector('.dexpert-fab')) return;

  const fab = document.createElement('button');
  fab.className = 'dexpert-fab';
  fab.type = 'button';
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'dexpertDialog');

  fab.innerHTML = `
    <img src="assets/images/Dexpert.png" alt="" aria-hidden="true">
    <span>
      <strong>Ask DEXPERT</strong>
    </span>
  `;
  document.body.appendChild(fab);

  const path = window.location.pathname.split('/').pop() || 'index.html';
  const isProduct   = path.startsWith('product') && path !== 'products.html';
  const isInvestor  = /investor|financial-reports/i.test(path);
  const isResources = /literature|calculators|videos|news/i.test(path);

  let dialogPromise = null;

  function loadDialog(){
    if (dialogPromise) return dialogPromise;

    dialogPromise = (async () => {
      const base = new URL('.', location.href);
      const fetchUrl = new URL('components/dexpert.html', base);

      const res = await fetch(fetchUrl, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText} — ${fetchUrl.href}`);
      }
      const html = await res.text();

      if (/^\s*<!DOCTYPE\s+html/i.test(html)) {
        throw new Error(
          'Server returned a full HTML document instead of the DEXPERT fragment. ' +
          'Likely a server-side 404 or SPA fallback.'
        );
      }

      const temp = document.createElement('div');
      temp.innerHTML = html;

      const dialog = temp.querySelector('dialog#dexpertDialog');
      const homeTpl = temp.querySelector('template#dexpertHomeTemplate');
      const resultTpl = temp.querySelector('template#dexpertResultTemplate');

      if (!dialog || !homeTpl || !resultTpl) {
        throw new Error('dexpert.html is missing one of the required elements.');
      }

      document.body.appendChild(homeTpl);
      document.body.appendChild(resultTpl);
      document.body.appendChild(dialog);

      wireDialog(dialog, homeTpl, resultTpl);
      return dialog;
    })();

    dialogPromise.catch(() => { dialogPromise = null; });

    return dialogPromise;
  }

  function buildActions(container, actions){
    if (!container) return;
    const frag = document.createDocumentFragment();
    for (const [href, label] of actions) {
      const a = document.createElement('a');
      a.href = href;
      a.innerHTML = `<span>${label}</span><i class="fas fa-arrow-right"></i>`;
      frag.appendChild(a);
    }
    container.replaceChildren(frag);
  }

  function renderHome(dialog, homeTpl){
    const body = dialog.querySelector('#dexpertBody');
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

    buildActions(node.querySelector('.dexpert-actions'), actions);
    body.replaceChildren(node);
  }

  function renderAnswer(dialog, homeTpl, resultTpl, query){
    const body = dialog.querySelector('#dexpertBody');
    if (!body) return;
    const q = query.toLowerCase();
    let label, heading, message, href, cta;

    if (!q) {
      [label, heading, message, href, cta] = ['DEXPERT', 'Try a search',
        'Enter a product or application such as Aquadex, water supply or gas.',
        'products.html', 'Browse products'];
    } else {
      const product = DEXPERT_PRODUCTS.find(p =>
        q.includes(p[0].toLowerCase()) || p[0].toLowerCase().includes(q));
      const app = !product && DEXPERT_APPS.find(a =>
        q.includes(a[0].toLowerCase()) || a[0].toLowerCase().includes(q));

      if (product) {
        [label, heading, message, href, cta] = ['PRODUCT', product[0],
          'Open the product page for its approved information.',
          product[1], 'Open product'];
      } else if (app) {
        [label, heading, message, href, cta] = ['APPLICATION', app[0],
          'Explore the systems listed for this application area.',
          app[1], 'Explore'];
      } else if (/report|annual|financial|investor|shareholder|agm/.test(q)) {
        [label, heading, message, href, cta] = ['INVESTOR', 'Investor Relations',
          'Find annual reports, financial information and shareholder references.',
          'investors.html#annual', 'Open investor information'];
      } else if (/brochure|flyer|leaflet|literature|document|datasheet|certificate|drawing/.test(q)) {
        [label, heading, message, href, cta] = ['LITERATURE', 'Literature',
          'Find brochures, flyers, corporate publications and technical documents.',
          'literature.html', 'Open Literature'];
      } else if (/video|installation|demonstration/.test(q)) {
        [label, heading, message, href, cta] = ['VIDEOS', 'Videos',
          'Installation guides, product overviews and application demonstrations.',
          'videos.html', 'Open Videos'];
      } else if (/calculator|pressure drop|flow|head loss|sizing/.test(q)) {
        [label, heading, message, href, cta] = ['CALCULATORS', 'Calculators',
          'Engineering calculators for pipe selection, hydraulic design and unit conversion.',
          'calculators.html', 'Open Calculators'];
      } else {
        [label, heading, message, href, cta] = ['DEXPERT', 'No direct match',
          'Try a product, application or resource term.',
          'products.html', 'Browse products'];
      }
    }

    const node = resultTpl.content.firstElementChild.cloneNode(true);
    node.querySelector('[data-label]').textContent = label;
    node.querySelector('[data-heading]').textContent = heading;
    node.querySelector('[data-message]').textContent = message;
    node.querySelector('a').href = href;
    node.querySelector('[data-cta]').textContent = cta;

    body.replaceChildren(node);
    node.querySelector('.dexpert-back').addEventListener('click',
      () => renderHome(dialog, homeTpl));
  }

  function wireDialog(dialog, homeTpl, resultTpl){
    dialog.querySelector('.dexpert-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      fab.setAttribute('aria-expanded', 'false');
    });

    const form = dialog.querySelector('.dexpert-ask');
    const input = dialog.querySelector('#expert-input');

    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = input.value.trim();
        if (query) {
          renderAnswer(dialog, homeTpl, resultTpl, query);
          input.value = '';
        }
      });
    }

    renderHome(dialog, homeTpl);
  }

  const open = async () => {
    try {
      const dialog = await loadDialog();
      if (dialog.open) return;
      dialog.showModal();
      fab.setAttribute('aria-expanded', 'true');
      setTimeout(() => dialog.querySelector('#expert-input')?.focus(), 60);
    } catch (err) {
      console.error('[Dadex] DEXPERT failed to load:', err);
    }
  };

  fab.addEventListener('click', () => {
    if (fab.getAttribute('aria-expanded') === 'true') {
      document.getElementById('dexpertDialog')?.close();
    } else {
      open();
    }
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-dexpert]')) {
      e.preventDefault();
      open();
    }
  });

  scheduleIdle(() => loadDialog().catch(() => {}));
}

/* ------------------------------------------------------------
   Back to top — floating button, injected site-wide
   ------------------------------------------------------------ */

function initBackToTop(){
  if (document.querySelector('.back-to-top')) return;

  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
  document.body.appendChild(btn);

  const update = () => {
    btn.classList.toggle('is-visible', window.scrollY > SCROLL_TOP_THRESHOLD);
  };

  window.addEventListener('scroll', update, { passive: true });
  update();

  btn.addEventListener('click', () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  });
}
