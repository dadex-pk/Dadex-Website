/* ============================================================
   DADEX ETERNIT LIMITED — SHARED UI
   ============================================================ */

const MOBILE_NAV_MAX = 900;
const COMPANY_FOUNDED_YEAR = 1959;
const COMPANY_ANNIVERSARY_MONTH = 3;
const COMPANY_ANNIVERSARY_DAY = 13;
const SCROLL_TOP_THRESHOLD = 600;
const HEADER_COLLAPSE_THRESHOLD = 70;

const HTML_ESCAPE_MAP = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};

function escapeHTML(value){
  return String(value ?? '').replace(/[&<>"']/g, m => HTML_ESCAPE_MAP[m]);
}

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

document.addEventListener('DOMContentLoaded', async () => {
  await loadSharedComponents();
  const header = document.getElementById('siteHeader') || document.querySelector('.site-header');
  
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

async function loadSharedComponents(){
  const mounts = document.querySelectorAll('[data-component]');
  if (!mounts.length) return;
  const base = new URL('.', window.location.href);
  await Promise.allSettled(Array.from(mounts).map(async mount => {
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

function initDynamicSiteText(){
  const now = new Date();
  const anniversary = new Date(now.getFullYear(), COMPANY_ANNIVERSARY_MONTH, COMPANY_ANNIVERSARY_DAY);
  const age = now < anniversary ? now.getFullYear() - COMPANY_FOUNDED_YEAR - 1 : now.getFullYear() - COMPANY_FOUNDED_YEAR;
  const setText = (selector, value) => {
    document.querySelectorAll(selector).forEach(el => { el.textContent = value; });
  };
  setText('[data-current-year]', String(now.getFullYear()));
  setText('[data-company-age]', String(age));
  setText('[data-company-age-years]', `${age} years`);
  setText('[data-company-age-over]', `over ${age} years`);
  setText('[data-company-age-hyphenated]', `${age}-year-old`);
}

function initHeaderState(header){
  if (!header) return;
  const path = window.location.pathname;
  const isHome = document.body.classList.contains('home-page') || path === '/' || path.endsWith('/index.html');
  header.dataset.headerState = isHome ? 'home' : 'internal';
  let ticking = false;
  const update = () => {
    const scrolled = window.scrollY > HEADER_COLLAPSE_THRESHOLD;
    header.classList.toggle('is-scrolled', scrolled);
    document.body.classList.toggle('header-scrolled', scrolled);
    const utilityBar = header.querySelector('.utility-bar');
    const productsTier = header.querySelector('.header-products-tier');
    if (utilityBar) utilityBar.inert = scrolled;
    if (productsTier) productsTier.inert = scrolled;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });
  update();
}

function initNavigation(header){
  const nav = document.getElementById('site-navigation');
  const hamburger = document.querySelector('.menu-toggle');
  if (!header || !nav) return;

  const isMobile = () => window.innerWidth <= MOBILE_NAV_MAX;
  const closeMenus = ({ restoreFocus = false } = {}) => {
    document.querySelectorAll('.dropdown-menu.open').forEach(menu => menu.classList.remove('open'));
    document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    nav.classList.remove('open');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open navigation');
    }
    document.body.classList.remove('nav-open');
    if (restoreFocus && hamburger) hamburger.focus();
  };

  const anyMenuOpen = () => nav.classList.contains('open') || !!document.querySelector('.dropdown-menu.open');

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
      if (isMobile()) {
        event.preventDefault();
        event.stopPropagation();
        const open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      }
    });
    toggle.addEventListener('focusin', () => { if (!isMobile()) toggle.setAttribute('aria-expanded', 'true'); });
    toggle.addEventListener('focusout', () => {
      if (isMobile()) return;
      setTimeout(() => { if (!menu.contains(document.activeElement)) toggle.setAttribute('aria-expanded', 'false'); }, 0);
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
    document.querySelectorAll('.dropdown-menu.open').forEach(menu => menu.classList.remove('open'));
    document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
  }, 150), { passive: true });
}

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
    cards.forEach(card => { card.hidden = !(value === 'all' || card.dataset.category === value); });
  });
}

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

function initLiteratureFilter(){
  const grid = document.getElementById('resourceGrid');
  if (!grid) return;
  const input = document.getElementById('resourceSearch');
  const typeSelect = document.getElementById('resourceType');
  const clearBtn = document.getElementById('resourceClear');
  const emptyState = document.getElementById('resourceEmpty');
  const emptyReset = document.getElementById('resourceEmptyReset');
  const countLine = document.getElementById('resourceCount');
  const certsCard = document.getElementById('litCertificates');
  const sections = grid.querySelectorAll('.lit-section');
  const cards = grid.querySelectorAll('.lit-card');
  const totalCards = cards.length;

  const applyFilters = () => {
    const query = (input?.value || '').trim().toLowerCase();
    const type = (typeSelect?.value || 'all').toLowerCase();
    let visibleCards = 0;
    cards.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const cardTypes = (card.dataset.types || '').split(/\s+/).filter(Boolean);
      const matchesSearch = !query || name.includes(query);
      const matchesType = type === 'all' || cardTypes.includes(type);
      card.querySelectorAll('.lit-btn[data-type]').forEach(btn => { btn.hidden = type !== 'all' && btn.dataset.type !== type; });
      const show = matchesSearch && matchesType;
      card.hidden = !show;
      if (show) visibleCards++;
    });
    sections.forEach(section => {
      const anyVisible = Array.prototype.some.call(section.querySelectorAll('.lit-card'), c => !c.hidden);
      section.hidden = !anyVisible;
    });
    if (emptyState) emptyState.hidden = visibleCards !== 0;
    if (certsCard) certsCard.hidden = visibleCards === 0;
    if (countLine) {
      if (visibleCards === 0) countLine.textContent = 'No documents match your filters';
      else if (visibleCards === totalCards) countLine.textContent = `Showing all ${totalCards} documents`;
      else countLine.textContent = `Showing ${visibleCards} of ${totalCards} documents`;
    }
    if (clearBtn) clearBtn.hidden = !(query !== '' || type !== 'all');
  };

  const clearAll = () => { if (input) input.value = ''; if (typeSelect) typeSelect.value = 'all'; applyFilters(); };
  if (input) input.addEventListener('input', applyFilters);
  if (typeSelect) typeSelect.addEventListener('change', applyFilters);
  if (clearBtn) clearBtn.addEventListener('click', clearAll);
  if (emptyReset) emptyReset.addEventListener('click', clearAll);
  applyFilters();
}

function initInvestorPanels(){
  const links = [...document.querySelectorAll('[data-ir]')];
  const panels = [...document.querySelectorAll('[data-ir-panel]')];
  if (!links.length || !panels.length) return;
  const groups = [...document.querySelectorAll('.ir-side-group')];
  const isMobile = () => window.matchMedia('(max-width:900px)').matches;
  const openGroupFor = id => {
    if (!isMobile()) return;
    groups.forEach(g => {
      const hasLink = [...g.querySelectorAll('[data-ir]')].some(a => a.dataset.ir === id);
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
    title.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
  links.forEach(a => a.addEventListener('click', () => setTimeout(sync, 0)));
  window.addEventListener('hashchange', sync);
  window.addEventListener('resize', debounce(sync, 150));
  sync();
}

function initSiteSearch(){
  const input = document.getElementById('siteSearchInput');
  if (!input) return;
  const button = document.getElementById('siteSearchButton');
  const clear = document.getElementById('searchClear');
  const grid = document.getElementById('searchResults');
  const empty = document.getElementById('searchEmpty');
  const count = document.getElementById('searchCount');
  const template = document.getElementById('searchResultTemplate');
  if (!grid || !template) return;
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
    const rows = pages.filter(p => terms.every(t => p.join(' ').toLowerCase().includes(t))).slice(0, 60);
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
  if (button) button.addEventListener('click', render);
  input.addEventListener('input', render);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') render(); });
  if (clear) clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  const q = new URLSearchParams(location.search).get('q');
  if (q) { input.value = q; render(); }
}

const DEXPERT_PRODUCTS = [
  ['Aquadex', 'product-aquadex.html'], ['T-Flex', 'product-tflex.html'], ['Polydex Premium', 'product-polydex-premium.html'],
  ['Polydex', 'product-polydex.html'], ['Thermoline', 'product-thermoline.html'], ['Flow Line', 'product-flow-line.html'],
  ['Inspection Chambers', 'product-inspection-chambers.html'], ['Manholes', 'product-manholes.html'], ['Catchpits', 'product-catchpits.html'],
  ['Nikasi', 'product-nikasi.html'], ['Polyduct', 'product-polyduct.html'], ['PE Cable Duct', 'product-pe-cable-duct.html'],
  ['Electrical Conduits', 'product-electrical-conduits.html'], ['Electroduct', 'product-electroduct.html'], ['Corrugated Sheets', 'product-corrugated-sheets.html'],
  ['Non-Return Valves', 'product-non-return-valves.html'], ['T-Flex Gas', 'product-tflex-gas.html'], ['T-Flex Compressed Air', 'product-tflex-compressed-air.html'],
  ['UPVC Tubewell Casing & Screen Pipes System', 'product-upvc-tubewell.html']
];

const DEXPERT_APPS = [
  ['Water Supply', 'products.html#water-supply'], ['Sewerage & Drainage', 'products.html#sewerage-drainage'],
  ['Cable & Utility Ducting', 'products.html#cable-utility-ducting'], ['Specialised & Industrial', 'products.html#specialised-industrial'],
  ['Roofing', 'products.html#roofing']
];

function initDEXPERT(){
  if (document.querySelector('.dexpert-fab')) return;

  const fab = document.createElement('button');
  fab.className = 'dexpert-fab';
  fab.type = 'button';
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'dexpertDialog');
  fab.innerHTML = '<span class="dexpert-fab-icon"><svg><use href="#spark"/></svg></span><span class="dexpert-fab-text"><strong>Ask DEXPERT</strong><small>Your building solutions guide</small></span><span class="fab-dot"></span>';
  document.body.appendChild(fab);

  const title = (document.querySelector('main h1')?.textContent || document.title.replace(/\s*[|–-].*$/, '')).trim();
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const isProduct = path.startsWith('product') && path !== 'products.html';
  const isInvestor = /investor|financial-reports/i.test(path);
  const isResources = /literature|calculators|videos|news/i.test(path);
  const currentProduct = isProduct ? title : '';

  let dialogPromise = null;

  function loadDialog(){
    if (dialogPromise) return dialogPromise;
    dialogPromise = (async () => {
      const res = await fetch('components/dexpert.html', { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const dialog = temp.querySelector('dialog#dexpertDialog');
      const homeTpl = temp.querySelector('template#dexpertHomeTemplate');
      const resultTpl = temp.querySelector('template#dexpertResultTemplate');
      
      document.body.appendChild(homeTpl);
      document.body.appendChild(resultTpl);
      document.body.appendChild(dialog);

      wireDialog(dialog, homeTpl, resultTpl);
      return dialog;
    })();
    return dialogPromise;
  }

  function buildActions(container, actions, onSelect){
    const frag = document.createDocumentFragment();
    for (const [href, label, subtitle] of actions) {
      const isBtn = href.startsWith('#');
      const el = document.createElement(isBtn ? 'button' : 'a');
      
      if (isBtn) {
        el.type = 'button';
        const keyword = href.replace('#', '');
        el.onclick = () => onSelect(keyword);
      } else {
        el.href = href;
      }
      
      el.innerHTML = `<span>${label}${subtitle ? `<small>${subtitle}</small>` : ''}</span><svg><use href="#arrow"/></svg>`;
      frag.appendChild(el);
    }
    container.replaceChildren(frag);
  }

  function renderHome(dialog, homeTpl, resultTpl){
    const body = dialog.querySelector('#dexpertBody');
    const node = homeTpl.content.firstElementChild.cloneNode(true);

    let introText, actions;
    if (isProduct) {
      introText = `Let’s point you towards the right Dadex solution for ${currentProduct}.`;
      actions = [
        ['#technical', 'Technical information', 'Specs and installation'],
        ['literature.html', 'Literature', 'Brochures and documents'],
        ['products.html', 'Related products', 'Explore similar solutions'],
        ['dealers.html', 'Find a dealer', 'Locate a nearby partner']
      ];
    } else if (isInvestor) {
      introText = 'Find annual reports, financial information and shareholder references.';
      actions = [
        ['investors.html', 'Investor Relations', 'Overview and updates'],
        ['investors.html#annual', 'Annual Reports', 'Financial performance'],
        ['contact.html', 'Investor enquiry', 'Talk to our team']
      ];
    } else if (isResources) {
      introText = 'Find the resources and tools you need for your next project.';
      actions = [
        ['products.html', 'Find a product', 'Browse our systems'],
        ['literature.html', 'Literature', 'Brochures and guides'],
        ['videos.html', 'Videos', 'Installation and overviews'],
        ['calculators.html', 'Calculators', 'Engineering tools']
      ];
    } else {
      introText = 'Let’s point you towards the right Dadex solution. Choose a starting point below.';
      actions = [
        ['#home', 'A home or residential project', 'Plumbing, interiors and more'],
        ['#commercial', 'A commercial or industrial space', 'Roofing, cladding and building systems'],
        ['#infrastructure', 'Infrastructure or agriculture', 'Water supply, drainage and irrigation']
      ];
    }

    node.querySelector('.dexpert-intro').textContent = introText;
    buildActions(node.querySelector('.dexpert-actions'), actions, (keyword) => {
      renderAnswer(dialog, homeTpl, resultTpl, keyword);
    });

    body.replaceChildren(node);
  }

  function renderAnswer(dialog, homeTpl, resultTpl, query){
    const body = dialog.querySelector('#dexpertBody');
    const q = query.toLowerCase();
    let label, heading, message, href, cta;

    if (!q) {
      [label, heading, message, href, cta] = ['DEXPERT', 'Try a search', 'Enter a product or application such as Aquadex, water supply or gas.', 'products.html', 'Browse products'];
    } else {
      const product = DEXPERT_PRODUCTS.find(p => q.includes(p[0].toLowerCase()) || p[0].toLowerCase().includes(q));
      const app = !product && DEXPERT_APPS.find(a => q.includes(a[0].toLowerCase()) || a[0].toLowerCase().includes(q));

      if (product) {
        [label, heading, message, href, cta] = ['PRODUCT', product[0], 'Open the product page for its approved information.', product[1], 'Open product'];
      } else if (app) {
        [label, heading, message, href, cta] = ['APPLICATION', app[0], 'Explore the systems listed for this application area.', app[1], 'Explore'];
      } else if (q === 'home' || q === 'residential') {
        [label, heading, message, href, cta] = ['HOME', 'Residential Solutions', 'Explore PPR-C for hot and cold water, and uPVC for soil, waste and ventilation. Your installer should confirm sizes and ratings.', 'products.html#water-supply', 'Explore Home Systems'];
      } else if (q === 'commercial' || q === 'industrial') {
        [label, heading, message, href, cta] = ['COMMERCIAL', 'Commercial & Industrial', 'Explore roofing and cladding for your building envelope, with piping and interior systems to complete the project.', 'products.html#roofing', 'Explore Building Envelope'];
      } else if (q === 'infrastructure' || q === 'agriculture') {
        [label, heading, message, href, cta] = ['INFRASTRUCTURE', 'Infrastructure & Agriculture', 'Explore HDPE and uPVC piping solutions for water supply, drainage and irrigation.', 'products.html#water-supply', 'Explore Infrastructure'];
      } else if (/report|annual|financial|investor|shareholder|agm/.test(q)) {
        [label, heading, message, href, cta] = ['INVESTOR', 'Investor Relations', 'Find annual reports, financial information and shareholder references.', 'investors.html#annual', 'Open investor information'];
      } else if (/brochure|flyer|leaflet|literature|document|datasheet|certificate|drawing/.test(q)) {
        [label, heading, message, href, cta] = ['LITERATURE', 'Literature', 'Find brochures, flyers, corporate publications and technical documents.', 'literature.html', 'Open Literature'];
      } else if (/video|installation|demonstration/.test(q)) {
        [label, heading, message, href, cta] = ['VIDEOS', 'Videos', 'Installation guides, product overviews and application demonstrations.', 'videos.html', 'Open Videos'];
      } else if (/calculator|pressure drop|flow|head loss|sizing/.test(q)) {
        [label, heading, message, href, cta] = ['CALCULATORS', 'Calculators', 'Engineering calculators for pipe selection, hydraulic design and unit conversion.', 'calculators.html', 'Open Calculators'];
      } else {
        [label, heading, message, href, cta] = ['DEXPERT', 'No direct match', 'Try a product, application or resource term.', 'products.html', 'Browse products'];
      }
    }

    const node = resultTpl.content.firstElementChild.cloneNode(true);
    node.querySelector('[data-label]').textContent = label;
    node.querySelector('[data-heading]').textContent = heading;
    node.querySelector('[data-message]').textContent = message;
    node.querySelector('a').href = href;
    node.querySelector('[data-cta]').textContent = cta;

    body.replaceChildren(node);
    node.querySelector('.dexpert-back').addEventListener('click', () => renderHome(dialog, homeTpl, resultTpl));
  }

  function wireDialog(dialog, homeTpl, resultTpl){
    dialog.querySelector('.dexpert-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { fab.setAttribute('aria-expanded', 'false'); });
    renderHome(dialog, homeTpl, resultTpl);

    const form = dialog.querySelector('.dexpert-ask');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = form.querySelector('input');
      const q = input.value.trim();
      if (!q) return;
      renderAnswer(dialog, homeTpl, resultTpl, q);
      input.value = '';
    });
  }

  const open = async () => {
    try {
      const dialog = await loadDialog();
      if (dialog.open) return;
      dialog.showModal();
      fab.setAttribute('aria-expanded', 'true');
      setTimeout(() => dialog.querySelector('#expert-input')?.focus(), 60);
    } catch (err) {
      console.error('DEXPERT failed to load', err);
    }
  };

  fab.addEventListener('click', () => {
    if (fab.getAttribute('aria-expanded') === 'true') document.getElementById('dexpertDialog')?.close();
    else open();
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-dexpert]')) { e.preventDefault(); open(); }
  });

  scheduleIdle(() => loadDialog().catch(() => {}));
}

function initBackToTop(){
  if (document.querySelector('.back-to-top')) return;
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
  document.body.appendChild(btn);
  const update = () => { btn.classList.toggle('is-visible', window.scrollY > SCROLL_TOP_THRESHOLD); };
  window.addEventListener('scroll', update, { passive: true });
  update();
  btn.addEventListener('click', () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  });
}
