/* ============================================================
   DADEX ETERNIT LIMITED — SHARED UI
   ------------------------------------------------------------
   - Header/footer injection (root-aware)
   - Header scroll state (collapse on scroll)
   - Navigation behaviour (mobile drawer, dropdowns, active state)
   - Dynamic text (footer year, company age)
   - Project filter (event delegation)
   - Mailto contact form (validated)
   - Literature filter
   - Investor panel switcher
   - Site search (template-driven, debounced)
   - DEXPERT (native <dialog>, template-driven, lazy, retryable)
   - Back to top (inline SVG, no icon-font dependency)

   Page-scoped modules (dealers) live in js/dealers.js.

   IMPORTANT (sticky header — CSS side, not JS):
     1. .site-header must be { position: sticky; top: 0; z-index: … }
        with no later `position: relative` overriding it.
     2. No ancestor may have `overflow` other than `visible`
        — use `overflow-x: clip` instead of `overflow-x: hidden`
        on html/body/wrappers.
     3. The injected <header> must be a direct child of <body>
        (or a wrapper that spans the full page height).
     4. Add `[hidden] { display: none !important; }` to the
        stylesheet — cards filtered here use the hidden attribute.
   ============================================================ */

'use strict';

const MOBILE_NAV_MAX          = 900;
const COMPANY_FOUNDED_YEAR    = 1959;
const COMPANY_ANNIVERSARY_MONTH = 3;   /* April (0-indexed) */
const COMPANY_ANNIVERSARY_DAY   = 13;
const SCROLL_TOP_THRESHOLD      = 600;
const HEADER_COLLAPSE_THRESHOLD = 60;
const SEARCH_DEBOUNCE_MS        = 120;

/* Resolve site root from this script's own URL at parse time,
   so nested pages (/products/foo.html) resolve components correctly.
   Falls back to the origin root if the script src is unavailable. */
const SITE_ROOT = (() => {
  try {
    const src = document.currentScript && document.currentScript.src;
    return src ? new URL('../', src) : new URL('/', location.origin);
  } catch {
    return new URL('/', location.origin);
  }
})();

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

function getScrollTop(){
  return window.scrollY
      ?? document.scrollingElement?.scrollTop
      ?? document.documentElement.scrollTop
      ?? 0;
}

/* Network-aware gate for optional prefetches. */
function isConnectionSlow(){
  const c = navigator.connection;
  if (!c) return false;
  if (c.saveData) return true;
  return /(^|-)2g$/.test(c.effectiveType || '');
}

/* ------------------------------------------------------------
   Bootstrap
   ------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', async () => {
  await loadSharedComponents();

  const header = document.getElementById('siteHeader')
              || document.querySelector('.site-header');

  initDynamicSiteText();
  initHeaderState(header);
  initNavigation(header);
  setActiveNavigation();

  initProjectFilter();
  initMailtoForm();
  initLiteratureFilter();
  initInvestorPanels();
  initSiteSearch();

  initDEXPERT();
  initBackToTop();
});

/* ------------------------------------------------------------
   Shared header / footer injection
   ------------------------------------------------------------ */

async function loadSharedComponents(){
  const mounts = document.querySelectorAll('[data-component]');
  if (!mounts.length) return;

  await Promise.allSettled(Array.from(mounts).map(async mount => {
    const name = mount.getAttribute('data-component');
    if (name !== 'header' && name !== 'footer') return;

    try {
      const url = new URL(`components/${name}.html`, SITE_ROOT);
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      mount.outerHTML = await res.text();
    } catch (error) {
      console.error(`Dadex component load failed: ${name}`, error);
      mount.setAttribute('data-component-error', name);
    }
  }));
}

/* ------------------------------------------------------------
   Dynamic text — current year and company age
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

  setText('[data-current-year]',           String(now.getFullYear()));
  setText('[data-company-age]',             String(age));
  setText('[data-company-age-years]',       `${age} years`);
  setText('[data-company-age-over]',        `over ${age} years`);
  setText('[data-company-age-hyphenated]',  `${age}-year-old`);
}

/* ------------------------------------------------------------
   Header state — home/internal flag + scroll-driven collapse
   ------------------------------------------------------------ */

function initHeaderState(header){
  if (!header) return;

  const path = location.pathname;
  const isHome = document.body.classList.contains('home-page')
    || path === '/'
    || /\/index\.html?$/.test(path)
    || path === '';
  header.dataset.headerState = isHome ? 'home' : 'internal';

  let ticking = false;

  const update = () => {
    const scrolled = getScrollTop() > HEADER_COLLAPSE_THRESHOLD;
    header.classList.toggle('is-scrolled', scrolled);
    document.body.classList.toggle('header-scrolled', scrolled);
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}

/* ------------------------------------------------------------
   Navigation
   ------------------------------------------------------------ */

function initNavigation(header){
  const nav = document.getElementById('site-navigation');
  const hamburger = document.querySelector('.menu-toggle');
  if (!header || !nav) return;

  const isMobile = () => window.innerWidth <= MOBILE_NAV_MAX;

  const closeDropdowns = () => {
    document.querySelectorAll('.dropdown-menu.open')
      .forEach(menu => menu.classList.remove('open'));
    document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]')
      .forEach(btn => btn.setAttribute('aria-expanded', 'false'));
  };

  const closeMenus = ({ restoreFocus = false } = {}) => {
    closeDropdowns();
    nav.classList.remove('open');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open navigation');
    }
    document.body.classList.remove('nav-open');
    if (restoreFocus && isMobile() && hamburger) hamburger.focus();
  };

  const anyMenuOpen = () =>
    nav.classList.contains('open') ||
    !!document.querySelector('.dropdown-menu.open');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const open = !nav.classList.contains('open');
      if (open) {
        nav.classList.add('open');
        hamburger.setAttribute('aria-expanded', 'true');
        hamburger.setAttribute('aria-label', 'Close navigation');
        document.body.classList.add('nav-open');
      } else {
        closeMenus();
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

      const willOpen = !menu.classList.contains('open');
      // Close siblings before opening this one.
      if (willOpen) {
        document.querySelectorAll('.dropdown-menu.open').forEach(m => {
          if (m !== menu) m.classList.remove('open');
        });
        document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(b => {
          if (b !== toggle) b.setAttribute('aria-expanded', 'false');
        });
      }
      menu.classList.toggle('open', willOpen);
      toggle.setAttribute('aria-expanded', String(willOpen));
    });

    toggle.addEventListener('focusin', () => {
      if (!isMobile()) toggle.setAttribute('aria-expanded', 'true');
    });

    toggle.addEventListener('focusout', () => {
      if (isMobile()) return;
      setTimeout(() => {
        if (!menu.contains(document.activeElement)) {
          toggle.setAttribute('aria-expanded', 'false');
        }
      }, 0);
    });

    toggle.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  });

  document.querySelectorAll('.site-navigation a').forEach(link => {
    link.addEventListener('click', () => {
      if (link.classList.contains('dropdown-toggle') && isMobile()) return;
      closeMenus();
    });
  });

  document.addEventListener('click', event => {
    if (header.contains(event.target)) return;
    if (event.target.closest('dialog[open]')) return;   // don't fight overlays
    if (event.target.closest('[data-open-dexpert]')) return;
    closeMenus();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!anyMenuOpen()) return;
    closeMenus({ restoreFocus: true });
  });

  window.addEventListener('resize', debounce(() => {
    if (isMobile()) return;
    document.body.classList.remove('nav-open');
    nav.classList.remove('open');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open navigation');
    }
    closeDropdowns();
  }, 150), { passive: true });
}

/* ------------------------------------------------------------
   Active navigation (path-based)
   ------------------------------------------------------------ */

function setActiveNavigation(){
  const path = location.pathname.replace(/\/+$/, '') || '/';

  document.querySelectorAll('.site-navigation a').forEach(link => {
    link.classList.remove('nav-active');
    link.removeAttribute('aria-current');
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    try {
      const target = new URL(href, location.href).pathname.replace(/\/+$/, '') || '/';
      if (target === path || (target !== '/' && path.startsWith(target + '/'))) {
        link.classList.add('nav-active');
        link.setAttribute('aria-current', 'page');
      }
    } catch { /* ignore malformed hrefs */ }
  });

  const markMatchingLinks = selector => {
    document.querySelectorAll(selector).forEach(item => {
      const href = item.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      try {
        const url = new URL(href, location.href);
        const target = url.pathname.replace(/\/+$/, '') || '/';
        const samePath = target === path || (target !== '/' && path.startsWith(target + '/'));
        const hashMatches = !url.hash || url.hash === location.hash;
        if (samePath && hashMatches) {
          item.classList.add('nav-active');
          if (item.tagName === 'A') item.setAttribute('aria-current', 'page');
        }
      } catch { /* ignore malformed hrefs */ }
    });
  };
  markMatchingLinks('.header-products-row a, .mobile-products-menu a');

  document.querySelectorAll('.header-products-row .dropdown').forEach(dropdown => {
    if (dropdown.querySelector('a.nav-active')) {
      dropdown.querySelector('.dropdown-toggle')?.classList.add('nav-parent-active');
    }
  });
}

/* ------------------------------------------------------------
   Project filter (projects.html)
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
   Mailto contact form (contact.html)
   ------------------------------------------------------------ */

function initMailtoForm(){
  document.querySelectorAll('[data-mailto-form]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();

      // Clear any prior custom validity.
      form.querySelectorAll(':invalid').forEach(el => el.setCustomValidity(''));

      const data = new FormData(form);
      const name    = String(data.get('name')    || '').trim();
      const email   = String(data.get('email')   || '').trim();
      const subject = String(data.get('subject') || 'General Question').trim();
      const message = String(data.get('message') || '').trim();

      let invalid = null;
      if (!name)  invalid = form.elements.name;
      else if (!email) invalid = form.elements.email;

      if (invalid) {
        invalid.setCustomValidity('Please complete this field.');
        invalid.addEventListener('input', () => invalid.setCustomValidity(''), { once: true });
        invalid.reportValidity();
        return;
      }

      const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
      location.href =
        `mailto:info@dadex.com.pk?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;
    });
  });
}

/* ------------------------------------------------------------
   Literature filter (literature.html)
   ------------------------------------------------------------ */

function initLiteratureFilter(){
  const grid = document.getElementById('resourceGrid');
  if (!grid) return;

  const input      = document.getElementById('resourceSearch');
  const typeSelect = document.getElementById('resourceType');
  const clearBtn   = document.getElementById('resourceClear');
  const emptyState = document.getElementById('resourceEmpty');
  const emptyReset = document.getElementById('resourceEmptyReset');
  const countLine  = document.getElementById('resourceCount');
  const certsCard  = document.getElementById('litCertificates');

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

    if (clearBtn) clearBtn.hidden = !(query !== '' || type !== 'all');
  };

  const clearAll = () => {
    if (input) input.value = '';
    if (typeSelect) typeSelect.value = 'all';
    applyFilters();
  };

  input?.addEventListener('input', applyFilters);
  typeSelect?.addEventListener('change', applyFilters);
  clearBtn?.addEventListener('click', clearAll);
  emptyReset?.addEventListener('click', clearAll);

  applyFilters();
}

/* ------------------------------------------------------------
   Investor panel switcher (investors.html)
   ------------------------------------------------------------ */

function initInvestorPanels(){
  const links  = [...document.querySelectorAll('[data-ir]')];
  const panels = [...document.querySelectorAll('[data-ir-panel]')];
  if (!links.length || !panels.length) return;

  const groups   = [...document.querySelectorAll('.ir-side-group')];
  const isMobile = () => window.matchMedia(`(max-width:${MOBILE_NAV_MAX}px)`).matches;

  const openGroupFor = id => {
    if (!isMobile()) return;
    groups.forEach(g => {
      const link = g.querySelector(`[data-ir="${CSS.escape(id)}"]`);
      const open = !!link;
      g.classList.toggle('is-open', open);
      g.querySelector('.ir-side-title')?.setAttribute('aria-expanded', String(open));
    });
  };

  const activate = id => {
    const known = id && panels.some(p => p.dataset.irPanel === id);
    const target = known ? id : 'overview';
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
      groups.forEach(g => {
        g.classList.remove('is-open');
        g.querySelector('.ir-side-title')?.setAttribute('aria-expanded', 'false');
      });
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
   Site search (search.html)
   ------------------------------------------------------------ */

function initSiteSearch(){
  const input = document.getElementById('siteSearchInput');
  if (!input) return;

  const button   = document.getElementById('siteSearchButton');
  const clear    = document.getElementById('searchClear');
  const grid     = document.getElementById('searchResults');
  const empty    = document.getElementById('searchEmpty');
  const count    = document.getElementById('searchCount');
  const template = document.getElementById('searchResultTemplate');

  if (!grid || !template || !count || !empty) return;

  const pages = Array.isArray(window.DADEX_SEARCH_INDEX) ? window.DADEX_SEARCH_INDEX : [];

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
      card.querySelector('p').textContent = p[3];
      card.querySelector('a').href = p[1];
      frag.appendChild(card);
    }
    grid.replaceChildren(frag);
    empty.hidden = rows.length !== 0;
  };

  const debouncedRender = debounce(render, SEARCH_DEBOUNCE_MS);

  button?.addEventListener('click', render);
  input.addEventListener('input', debouncedRender);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); render(); }
  });
  clear?.addEventListener('click', () => { input.value = ''; render(); input.focus(); });

  const q = new URLSearchParams(location.search).get('q');
  if (q) { input.value = q; render(); }
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

/* Normalise for matching: lowercase, collapse punctuation to spaces. */
function dxNorm(s){
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/* Resolution order:
   1. exact name match
   2. query contains the name  → pick the LONGEST name (most specific)
   3. name contains the query  → pick the SHORTEST name (least generic)
   Requires query length >= 3 to avoid noise matches. */
function findBestMatch(list, query){
  const q = dxNorm(query);
  if (q.length < 3) return null;

  let contained = null;   // query contains name
  let contains  = null;   // name contains query

  for (const entry of list){
    const name = dxNorm(entry[0]);
    if (!name) continue;
    if (name === q) return entry;

    if (q.includes(name)) {
      if (!contained || name.length > dxNorm(contained[0]).length) contained = entry;
    }
    if (name.includes(q)) {
      if (!contains || name.length < dxNorm(contains[0]).length) contains = entry;
    }
  }
  return contained || contains;
}

function initDEXPERT(){
  if (document.querySelector('.dexpert-fab')) return;

  const fab = document.createElement('button');
  fab.className = 'dexpert-fab';
  fab.type = 'button';
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'dexpertDialog');
  fab.innerHTML = '<img src="assets/images/Dexpert.png" alt="" aria-hidden="true"><span>Ask DEXPERT</span>';
  document.body.appendChild(fab);

  const title = (document.querySelector('main h1')?.textContent
    || document.title.replace(/\s*[|–—-].*$/, '')).trim();
  const file = location.pathname.split('/').pop() || 'index.html';
  const isProduct   = /^product-/.test(file);
  const isInvestor  = /investor|financial-reports/i.test(file);
  const isResources = /literature|calculators|videos|news/i.test(file);
  const currentProduct = isProduct ? title : '';

  let dialogPromise = null;

  function loadDialog(){
    if (dialogPromise) return dialogPromise;
    dialogPromise = (async () => {
      const res = await fetch(new URL('components/dexpert.html', SITE_ROOT),
        { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      const temp = document.createElement('div');
      temp.innerHTML = html;

      const dialog    = temp.querySelector('dialog#dexpertDialog');
      const homeTpl   = temp.querySelector('template#dexpertHomeTemplate');
      const resultTpl = temp.querySelector('template#dexpertResultTemplate');
      const actionTpl = temp.querySelector('template#dexpertActionTemplate');

      if (!dialog || !homeTpl || !resultTpl) {
        throw new Error('DEXPERT template markup incomplete');
      }

      document.body.appendChild(homeTpl);
      document.body.appendChild(resultTpl);
      if (actionTpl) document.body.appendChild(actionTpl);
      document.body.appendChild(dialog);

      wireDialog(dialog, homeTpl, resultTpl);
      return dialog;
    })().catch(err => {
      // Allow retry on next open instead of caching the failure.
      dialogPromise = null;
      throw err;
    });
    return dialogPromise;
  }

  function buildActions(container, actions){
    const frag = document.createDocumentFragment();
    for (const [href, label] of actions) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      frag.appendChild(a);
    }
    container.replaceChildren(frag);
  }

  function renderHome(dialog, homeTpl){
    const body = dialog.querySelector('#dexpertBody');
    const node = homeTpl.content.firstElementChild.cloneNode(true);

    let introText, actions;
    if (isProduct) {
      introText = `Open the ${currentProduct} page`;
      actions = [
        ['#technical', 'Technical information'],
        ['literature.html', 'Literature'],
        ['products.html', 'Related products'],
        ['dealers.html', 'Find a dealer']
      ];
    } else if (isInvestor) {
      introText = 'Investor information';
      actions = [
        ['investors.html', 'Investor Relations'],
        ['investors.html#annual', 'Annual Reports'],
        ['contact.html', 'Investor enquiry']
      ];
    } else if (isResources) {
      introText = 'Dadex Resources';
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

    node.querySelector('.dexpert-context strong').textContent = title;
    node.querySelector('.dexpert-intro').textContent = introText || 'What do you need?';
    buildActions(node.querySelector('.dexpert-actions'), actions);

    body.replaceChildren(node);

    const q = body.querySelector('#dexpertQuery');
    const ask = body.querySelector('#dexpertAskBtn');
    const run = () => renderAnswer(dialog, homeTpl, resultTpl, q.value.trim());
    ask.addEventListener('click', run);
    q.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  }

  function renderAnswer(dialog, homeTpl, resultTpl, query){
    const body = dialog.querySelector('#dexpertBody');
    const q = query.toLowerCase();
    let label, heading, message, href, cta;

    if (!q) {
      [label, heading, message, href, cta] = ['DEXPERT', 'Try a search',
        'Enter a product or application such as Aquadex, water supply or gas.',
        'products.html', 'Browse products'];
    } else {
      const product = findBestMatch(DEXPERT_PRODUCTS, q);
      const app = !product && findBestMatch(DEXPERT_APPS, q);

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
    node.querySelector('[data-label]').textContent   = label;
    node.querySelector('[data-heading]').textContent = heading;
    node.querySelector('[data-message]').textContent = message;
    node.querySelector('a').href = href;
    node.querySelector('[data-cta]').textContent = cta;

    body.replaceChildren(node);
    node.querySelector('.dexpert-back').addEventListener('click',
      () => renderHome(dialog, homeTpl));
  }

  function wireDialog(dialog, homeTpl, resultTpl){
    dialog.querySelector('.dexpert-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      fab.setAttribute('aria-expanded', 'false');
    });

    renderHome(dialog, homeTpl, resultTpl);
  }

  const open = async () => {
    try {
      const dialog = await loadDialog();
      if (dialog.open) return;
      dialog.showModal();
      fab.setAttribute('aria-expanded', 'true');
      setTimeout(() => dialog.querySelector('#dexpertQuery')?.focus(), 60);
    } catch (err) {
      console.error('DEXPERT failed to load', err);
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

  // Prefetch only when the connection is reasonable.
  if (!isConnectionSlow()) {
    scheduleIdle(() => { loadDialog().catch(() => {}); });
  }
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
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"
         fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 19V5"/>
      <path d="M5 12l7-7 7 7"/>
    </svg>`;
  document.body.appendChild(btn);

  const update = () => {
    btn.classList.toggle('is-visible', getScrollTop() > SCROLL_TOP_THRESHOLD);
  };

  window.addEventListener('scroll', update, { passive: true });
  update();

  btn.addEventListener('click', () => {
    const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  });
}