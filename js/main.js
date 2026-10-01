/* ============================================================
   DADEX ETERNIT LIMITED — SHARED UI
   - Header and footer injection
   - Navigation behaviour (mobile drawer, dropdowns, active state)
   - Dynamic text (footer year, company age)
   - Project filter
   - Mailto contact form
   - Literature filter
   - Investor panel switcher
   - Site search
   - DEXPERT
   - Back to top
   Page-scoped modules (dealers, etc.) live in their own files.

   MOBILE_NAV_MAX must match the breakpoint used in shell.css
   for `.site-header .menu-toggle` / `.site-navigation` — currently 900px.
   ============================================================ */

const MOBILE_NAV_MAX = 900;

document.addEventListener('DOMContentLoaded', async () => {
  await loadSharedComponents();
  initDynamicSiteText();
  initHeaderState();
  initNavigation();
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
  const base = new URL('.', window.location.href);
  await Promise.all(Array.from(mounts).map(async mount => {
    const name = mount.getAttribute('data-component');
    if (name !== 'header' && name !== 'footer') return;
    try {
      const response = await fetch(new URL(`components/${name}.html`, base), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      mount.outerHTML = await response.text();
    } catch (error) {
      console.error(`Dadex component load failed: ${name}`, error);
      mount.setAttribute('data-component-error', name);
    }
  }));
}


/* ------------------------------------------------------------
   Dynamic text (footer year, company age)
   ------------------------------------------------------------ */
function initDynamicSiteText(){
  const foundedYear = 1959;
  const now = new Date();
  const anniversary = new Date(now.getFullYear(), 3, 13);
  const age = now < anniversary
    ? now.getFullYear() - foundedYear - 1
    : now.getFullYear() - foundedYear;
  document.querySelectorAll('[data-current-year]').forEach(el => {
    el.textContent = String(now.getFullYear());
  });
  document.querySelectorAll('[data-company-age]').forEach(el => {
    el.textContent = String(age);
  });
}


/* ------------------------------------------------------------
   Header state flag (home vs internal)
   ------------------------------------------------------------ */
function initHeaderState(){
  const header = document.getElementById('siteHeader') || document.querySelector('.site-header');
  if (!header) return;
  const path = window.location.pathname;
  const isHome = document.body.classList.contains('home-page')
    || path === '/'
    || path.endsWith('/index.html');
  header.dataset.headerState = isHome ? 'home' : 'internal';
}


/* ------------------------------------------------------------
   Navigation
   ------------------------------------------------------------ */
function initNavigation(){
  const header = document.getElementById('siteHeader') || document.querySelector('.site-header');
  const hamburger = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-navigation');
  const isMobile = () => window.innerWidth <= MOBILE_NAV_MAX;

  const closeMenus = ({ restoreFocus = false } = {}) => {
    document.querySelectorAll('.dropdown-menu.open')
      .forEach(menu => menu.classList.remove('open'));
    document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]')
      .forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    if (nav) nav.classList.remove('open');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open navigation');
    }
    document.body.classList.remove('nav-open');
    if (restoreFocus && hamburger) hamburger.focus();
  };

  /* Hamburger open / close */
  if (hamburger && nav) {
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

  /* Dropdown toggles */
  document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
    const menuId = toggle.getAttribute('aria-controls');
    const menu = menuId ? document.getElementById(menuId) : toggle.nextElementSibling;
    if (!menu) return;

    /* Mobile: tap toggles the dropdown; click on the parent does not navigate. */
    toggle.addEventListener('click', event => {
      if (isMobile()) {
        event.preventDefault();
        event.stopPropagation();
        const open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      }
    });

    /* Desktop: hover opens via CSS; focus-within also opens via CSS.
       Sync aria-expanded with real focus state so assistive tech knows. */
    toggle.addEventListener('focusin', () => {
      if (!isMobile()) toggle.setAttribute('aria-expanded', 'true');
    });
    toggle.addEventListener('focusout', () => {
      if (isMobile()) return;
      /* Let focus settle before deciding whether it left the whole dropdown. */
      setTimeout(() => {
        if (!menu.contains(document.activeElement)) {
          toggle.setAttribute('aria-expanded', 'false');
        }
      }, 0);
    });

    /* Keyboard: Escape closes this dropdown and returns focus to the toggle. */
    toggle.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  });

  /* Closing the mobile drawer when a real navigation link is clicked. */
  document.querySelectorAll('.site-navigation a').forEach(link => {
    link.addEventListener('click', () => {
      /* Skip the toggle itself on mobile — its own handler manages state. */
      if (link.classList.contains('dropdown-toggle') && isMobile()) return;
      closeMenus();
    });
  });

  /* Click outside the header closes menus. */
  document.addEventListener('click', event => {
    if (!header || header.contains(event.target)) return;
    closeMenus();
  });

  /* Global Escape closes everything. */
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenus({ restoreFocus: true });
  });

  /* Reset state when the viewport crosses back to desktop. */
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      document.body.classList.remove('nav-open');
      if (nav) nav.classList.remove('open');
      if (hamburger) {
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Open navigation');
      }
      document.querySelectorAll('.dropdown-menu.open')
        .forEach(menu => menu.classList.remove('open'));
      document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]')
        .forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    }
  }, { passive: true });
}


/* ------------------------------------------------------------
   Active navigation (path-based)
   ------------------------------------------------------------ */
function setActiveNavigation(){
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  document.querySelectorAll('.site-navigation a').forEach(link => {
    link.classList.remove('nav-active');
    link.removeAttribute('aria-current');
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    try {
      const target = new URL(href, window.location.origin).pathname.replace(/\/+$/, '') || '/';
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
        const target = url.pathname.replace(/\/+$/, '') || '/';
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
   Project filter (projects.html)
   ------------------------------------------------------------ */
function initProjectFilter(){
  const buttons = document.querySelectorAll('#projectFilter .filter-btn[data-filter]');
  const cards = document.querySelectorAll('.project-card[data-category]');
  if (!buttons.length || !cards.length) return;

  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    const value = button.dataset.filter;
    cards.forEach(card => {
      card.hidden = !(value === 'all' || card.dataset.category === value);
    });
  }));
}


/* ------------------------------------------------------------
   Mailto contact form (contact.html)
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
      window.location.href = `mailto:info@dadex.com.pk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  });
}


/* ------------------------------------------------------------
   Literature filter (literature.html)
   ------------------------------------------------------------ */
function initLiteratureFilter(){
  const grid = document.getElementById('resourceGrid');
  if (!grid) return;
  const input = document.getElementById('resourceSearch');
  const typeSelect = document.getElementById('resourceType');
  const cards = [...grid.querySelectorAll('.resource-card')];

  const render = () => {
    const q = (input?.value || '').trim().toLowerCase();
    const type = (typeSelect?.value || 'all').toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const resource = (card.dataset.resource || '').toLowerCase();
      const text = card.textContent.toLowerCase();
      const show = (type === 'all' || resource === type) &&
                   (!q || text.includes(q));
      card.hidden = !show;
      if (show) visible++;
    });
  };

  if (input) input.addEventListener('input', render);
  if (typeSelect) typeSelect.addEventListener('change', render);
  render();
}


/* ------------------------------------------------------------
   Investor panel switcher (investors.html)
   ------------------------------------------------------------ */
function initInvestorPanels(){
  const links = [...document.querySelectorAll('[data-ir]')];
  const panels = [...document.querySelectorAll('[data-ir-panel]')];
  if (!links.length || !panels.length) return;

  const groups = [...document.querySelectorAll('.ir-side-group')];
  const isMobile = () => window.matchMedia('(max-width:900px)').matches;

  const openGroupFor = id => {
    if (!isMobile()) return;
    groups.forEach(g => {
      const link = g.querySelector(`[data-ir="${CSS.escape(id)}"]`);
      g.classList.toggle('is-open', !!link);
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
  window.addEventListener('resize', sync);
  sync();
}


/* ------------------------------------------------------------
   Site search (search.html)
   ------------------------------------------------------------ */
function initSiteSearch(){
  const input = document.getElementById('siteSearchInput');
  if (!input) return;
  const button = document.getElementById('siteSearchButton');
  const clear = document.getElementById('searchClear');
  const grid = document.getElementById('searchResults');
  const empty = document.getElementById('searchEmpty');
  const count = document.getElementById('searchCount');
  const pages = Array.isArray(window.DADEX_SEARCH_INDEX) ? window.DADEX_SEARCH_INDEX : [];

  const render = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      grid.innerHTML = '';
      empty.hidden = true;
      count.textContent = 'Start searching';
      return;
    }
    const terms = q.split(/\s+/).filter(Boolean);
    const rows = pages
      .filter(p => terms.every(t => p.join(' ').toLowerCase().includes(t)))
      .slice(0, 60);
    count.textContent = `${rows.length} result${rows.length === 1 ? '' : 's'} found`;
    grid.innerHTML = rows.map(p => `
      <article class="search-result-card">
        <span class="result-type">${p[2]}</span>
        <h3>${p[0]}</h3>
        <p>${p[3]}</p>
        <a href="${p[1]}">Open page <i class="fas fa-arrow-right"></i></a>
      </article>`).join('');
    empty.hidden = rows.length !== 0;
  };

  if (button) button.addEventListener('click', render);
  input.addEventListener('input', render);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') render(); });
  if (clear) clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });

  const q = new URLSearchParams(location.search).get('q');
  if (q) { input.value = q; render(); }
}


/* ------------------------------------------------------------
   DEXPERT — persistent guide
   ------------------------------------------------------------ */
function initDEXPERT(){
  if (document.querySelector('.dexpert-fab')) return;

  const fab = document.createElement('button');
  fab.className = 'dexpert-fab';
  fab.type = 'button';
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'dexpertDialog');
  fab.innerHTML = '<img src="assets/images/Dexpert.png" alt="" aria-hidden="true"><span>Ask DEXPERT</span>';

  const dialog = document.createElement('section');
  dialog.className = 'dexpert-dialog';
  dialog.id = 'dexpertDialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'false');
  dialog.setAttribute('aria-label', 'DEXPERT Dadex digital guide');
  dialog.innerHTML = `
    <div class="dexpert-head">
      <div class="dexpert-brand"><strong>DEXPERT</strong><span>Dadex digital guide</span></div>
      <button class="dexpert-close" type="button" aria-label="Close DEXPERT">×</button>
    </div>
    <div class="dexpert-body" id="dexpertBody"></div>`;

  document.body.appendChild(fab);
  document.body.appendChild(dialog);

  const body = dialog.querySelector('#dexpertBody');
  const title = (document.querySelector('main h1')?.textContent
    || document.title.replace(/\s*[|–-].*$/, '')).trim();
  const path = window.location.pathname.split('/').pop() || 'index.html';

  const productLinks = [
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

  const apps = [
    ['Water Supply', 'products.html#water-supply'],
    ['Sewerage & Drainage', 'products.html#sewerage-drainage'],
    ['Cable & Utility Ducting', 'products.html#cable-utility-ducting'],
    ['Specialised & Industrial', 'products.html#specialised-industrial'],
    ['Roofing', 'products.html#roofing']
  ];

  const isProduct = path.startsWith('product') && path !== 'products.html' && path !== 'product-pe-gas.html';
  const isInvestor = /investor|financial-reports/i.test(path);
  const isResources = /literature|calculators|news/i.test(path);
  const currentProduct = isProduct ? title : '';

  const link = (href, label) => `<a href="${href}">${label}</a>`;

  function home(){
    let intro = 'What do you need?';
    let actions = [];
    if (isProduct) {
      intro = `<strong>${escapeHTML(currentProduct)}</strong>`;
      actions = [
        link('#technical', 'Technical information'),
        link('technical-resources.html', 'Technical resources'),
        link('products.html', 'Related products'),
        link('dealers.html', 'Find a dealer')
      ];
    } else if (isInvestor) {
      intro = 'Investor information';
      actions = [
        link('investors.html', 'Investor Relations'),
        link('investors.html#annual', 'Annual Reports'),
        link('contact.html', 'Investor enquiry')
      ];
    } else if (isResources) {
      intro = 'Dadex Resources';
      actions = [
        link('products.html', 'Find a product'),
        link('technical-resources.html', 'Technical resources'),
        link('calculators.html', 'Technical calculators'),
        link('contact.html', 'Technical support')
      ];
    } else {
      actions = [
        link('products.html', 'Find a product'),
        link('solutions.html', 'Find a solution'),
        link('technical-resources.html', 'Technical resources'),
        link('dealers.html', 'Find a dealer')
      ];
    }
    body.innerHTML = `
      <div class="dexpert-context"><span>Current page</span><strong>${escapeHTML(title)}</strong></div>
      <p class="dexpert-intro">${intro}</p>
      <div class="dexpert-actions">${actions.join('')}</div>
      <div class="dexpert-ask">
        <label for="dexpertQuery">Search Dadex</label>
        <div>
          <input id="dexpertQuery" type="search" placeholder="Product or application" autocomplete="off">
          <button type="button" id="dexpertAskBtn">Ask</button>
        </div>
      </div>
      <p class="dexpert-note">Uses approved Dadex website information.</p>`;

    const q = body.querySelector('#dexpertQuery');
    const ask = body.querySelector('#dexpertAskBtn');
    const run = () => answer(q.value.trim());
    ask.addEventListener('click', run);
    q.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  }

  function result(label, heading, message, href, cta){
    body.innerHTML = `
      <button class="dexpert-back" type="button">← Back</button>
      <div class="dexpert-result">
        <span>${label}</span>
        <h4>${heading}</h4>
        <p>${message}</p>
        <a class="dexpert-result-link" href="${href}">${cta} →</a>
      </div>`;
    body.querySelector('.dexpert-back').addEventListener('click', home);
  }

  function answer(query){
    const q = query.toLowerCase();
    if (!q) {
      result('DEXPERT', 'Try a search',
        'Enter a product or application such as Aquadex, water supply or gas.',
        'products.html', 'Browse products');
      return;
    }
    const product = productLinks.find(p =>
      q.includes(p[0].toLowerCase()) || p[0].toLowerCase().includes(q));
    if (product) {
      result('PRODUCT', escapeHTML(product[0]),
        'Open the product page for its approved information.',
        product[1], 'Open product');
      return;
    }
    const app = apps.find(a =>
      q.includes(a[0].toLowerCase()) || a[0].toLowerCase().includes(q));
    if (app) {
      result('APPLICATION', escapeHTML(app[0]),
        'Explore the systems listed for this application area.',
        app[1], 'Explore');
      return;
    }
    if (/report|annual|financial|investor|shareholder|agm/.test(q)) {
      result('INVESTOR', 'Investor Relations',
        'Find annual reports, financial information and shareholder references.',
        'investors.html#annual', 'Open investor information');
      return;
    }
    if (/document|brochure|datasheet|certificate|technical|literature|drawing/.test(q)) {
      result('RESOURCES', 'Technical Resources',
        'Find approved technical information and support routes.',
        'technical-resources.html', 'Open technical resources');
      return;
    }
    result('DEXPERT', 'No direct match',
      'Try a product, application or technical-resource term.',
      'products.html', 'Browse products');
  }

  home();

  const close = () => {
    dialog.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    dialog.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    setTimeout(() => dialog.querySelector('#dexpertQuery')?.focus(), 60);
  };

  fab.addEventListener('click', () => dialog.classList.contains('open') ? close() : open());
  dialog.querySelector('.dexpert-close').addEventListener('click', close);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); fab.focus(); }
  });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-dexpert]')) { e.preventDefault(); open(); return; }
    if (dialog.classList.contains('open') && !dialog.contains(e.target) && !fab.contains(e.target)) close();
  });
}

function escapeHTML(value){
  return String(value).replace(/[&<>"']/g, m => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
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

  const threshold = 600;
  const update = () => {
    btn.classList.toggle('is-visible', window.scrollY > threshold);
  };

  window.addEventListener('scroll', update, { passive: true });
  update();

  btn.addEventListener('click', () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  });
}
