/* ============================================================
   DADEX ETERNIT LIMITED — SHARED UI
   Phase 1 architecture: static, accessible, content-preserving.
   No fabricated product/dealer/news responses.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  await loadSharedComponents();
  initDynamicSiteText();
  initNavigation();
  initFilters();
  initLiteratureSearch();
  initNewsFilter();
  initProjectFilter();
  initFAQ();
  initDealerLocator();
  initMailtoForm();
  setActiveNavigation();
  initProductSectionNav();
  initHeaderState();
  initDEXPERT();
});


async function loadSharedComponents(){
  const mounts=document.querySelectorAll('[data-component]');
  if(!mounts.length) return;
  const base=new URL('.', window.location.href);
  await Promise.all(Array.from(mounts).map(async mount=>{
    const name=mount.getAttribute('data-component');
    if(name!=='header' && name!=='footer') return;
    try{
      const response=await fetch(new URL(`components/${name}.html`, base), {cache:'no-cache'});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      mount.outerHTML=await response.text();
    }catch(error){
      console.error(`Dadex component load failed: ${name}`, error);
      mount.setAttribute('data-component-error', name);
    }
  }));
}

function initDynamicSiteText(){
  const foundedYear=1959;
  const now=new Date();
  const anniversary=new Date(now.getFullYear(),3,13);
  const age=now < anniversary ? now.getFullYear()-foundedYear-1 : now.getFullYear()-foundedYear;
  document.querySelectorAll('[data-current-year]').forEach(el=>{el.textContent=String(now.getFullYear())});
  document.querySelectorAll('[data-company-age]').forEach(el=>{el.textContent=String(age)});
}

function initHeaderState(){
  const header=document.getElementById('siteHeader')||document.querySelector('.site-header');
  if(!header) return;
  const home=document.body.classList.contains('home-page') || window.location.pathname==='/' || window.location.pathname.endsWith('/index.html');
  header.dataset.headerState=home?'home':'internal';
}

/* ------------------------------------------------------------
   NAVIGATION
   ------------------------------------------------------------ */
function initNavigation() {
  const header = document.getElementById('siteHeader') || document.querySelector('.site-header');
  const hamburger = document.querySelector('.hamburger, .menu-toggle');
  const nav = document.getElementById('primaryNav') || document.getElementById('site-navigation');

  const closeMenus = ({ restoreFocus = false } = {}) => {
    document.querySelectorAll('.dropdown-menu.open').forEach(menu => menu.classList.remove('open'));
    document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    if (nav) nav.classList.remove('open');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open navigation');
    }
    document.body.classList.remove('nav-open');
    if (restoreFocus && hamburger) hamburger.focus();
  };

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

  document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
    const menuId = toggle.getAttribute('aria-controls');
    const menu = menuId ? document.getElementById(menuId) : toggle.nextElementSibling;
    if (!menu) return;

    toggle.addEventListener('click', event => {
      if (window.innerWidth <= 980) {
        event.preventDefault();
        const open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      }
    });

    toggle.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  });

  document.querySelectorAll('.nav-menu a, .site-navigation a').forEach(link => {
    link.addEventListener('click', () => closeMenus());
  });

  document.addEventListener('click', event => {
    if (!header || header.contains(event.target)) return;
    closeMenus();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenus({ restoreFocus: true });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) {
      document.body.classList.remove('nav-open');
      if (nav) nav.classList.remove('open');
      if (hamburger) {
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Open navigation');
      }
      document.querySelectorAll('.dropdown-menu.open').forEach(menu => menu.classList.remove('open'));
      document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    }
  }, { passive: true });
}

function setActiveNavigation() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  document.querySelectorAll('.nav-menu a, .site-navigation a').forEach(link => { link.classList.remove('nav-active'); link.removeAttribute('aria-current'); });

  const rules = [
    { test: p => p === '/' || p === '/index.html', id: 'nav-home' },
    { test: p => p.includes('/about'), id: 'nav-about' },
    { test: p => p.includes('/history'), id: 'nav-history' },
    { test: p => p.includes('/quality'), id: 'nav-quality' },
    { test: p => p.includes('/products'), id: 'nav-products' },
    { test: p => p.includes('/solutions'), id: 'nav-solutions' },
    { test: p => p.includes('/services'), id: 'nav-services' },
    { test: p => p.includes('/projects'), id: 'nav-projects' },
    { test: p => p.includes('/literature'), id: 'nav-literature' },
    { test: p => p.includes('/faq'), id: 'nav-literature' },
    { test: p => p.includes('/calculators'), id: 'nav-literature' },
    { test: p => p.includes('/news'), id: 'nav-news' },
        { test: p => p.includes('/investors'), id: 'nav-investors' },
        { test: p => p.includes('/dealers'), id: 'nav-dealers' },
    { test: p => p.includes('/careers'), id: 'nav-careers' },
    { test: p => p.includes('/contact'), id: 'nav-contact' }
  ];

  const rule = rules.find(r => r.test(path));
  if (!rule) return;

  // PASS 23: simple global navigation does not use legacy nav IDs.
  const simpleLinks = document.querySelectorAll('.site-navigation a');
  simpleLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const target = new URL(href, window.location.origin).pathname.replace(/\/+$/, '') || '/';
    if (target === path || (target !== '/' && path.startsWith(target + '/'))) {
      link.classList.add('nav-active');
      link.setAttribute('aria-current', 'page');
    }
  });

  const link = document.getElementById(rule.id);
  if (link) { link.classList.add('nav-active'); link.setAttribute('aria-current', 'page'); }

  // PASS 38: apply the same active-state logic to both navigation tiers.
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

  // Keep the relevant parent dropdown visually active.
  document.querySelectorAll('.header-products-row .dropdown').forEach(dropdown => {
    const active = dropdown.querySelector('a.nav-active');
    if (active) dropdown.querySelector('.dropdown-toggle')?.classList.add('nav-parent-active');
  });
}

/* ------------------------------------------------------------
   GENERIC CARD FILTERS
   ------------------------------------------------------------ */
function initFilters() {
  document.querySelectorAll('[data-filter-group]').forEach(group => {
    const buttons = group.querySelectorAll('.filter-btn');
    const selector = group.getAttribute('data-filter-selector');
    if (!buttons.length || !selector) return;

    const cards = document.querySelectorAll(selector);

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        buttons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');

        const value = button.dataset.filter || 'all';
        cards.forEach(card => {
          const show = value === 'all' || card.dataset.category === value || card.dataset.year === value;
          card.hidden = !show;
        });
      });
    });
  });
}


function initLiteratureSearch() {
  const input = document.getElementById('literatureSearch');
  const product = document.getElementById('resourceProduct');
  const application = document.getElementById('resourceApplication');
  const type = document.getElementById('resourceType');
  const reset = document.getElementById('resetResourceFilters');
  const cards = [...document.querySelectorAll('.resource-card')];
  const count = document.getElementById('resourceCount');
  const noResults = document.getElementById('noResults');
  const context = document.getElementById('resourceContext');
  if (!input || !cards.length) return;

  const params = new URLSearchParams(window.location.search);
  const requestedProduct = params.get('product') || '';
  const requestedApplication = params.get('application') || '';
  const requestedType = params.get('type') || '';
  const requestedQuery = params.get('q') || '';

  // PASS 43: Product pages can hand visitors directly into their
  // relevant technical-resource view without creating a second resource system.
  if (requestedQuery) input.value = requestedQuery;
  if (product && requestedProduct && [...product.options].some(o => o.value === requestedProduct)) {
    product.value = requestedProduct;
  }
  if (application && requestedApplication && [...application.options].some(o => o.value === requestedApplication)) {
    application.value = requestedApplication;
  }
  if (type && requestedType && [...type.options].some(o => o.value === requestedType)) {
    type.value = requestedType;
  }

  const syncUrl = () => {
    const next = new URLSearchParams();
    if (input.value.trim()) next.set('q', input.value.trim());
    if (product?.value && product.value !== 'all') next.set('product', product.value);
    if (application?.value && application.value !== 'all') next.set('application', application.value);
    if (type?.value && type.value !== 'all') next.set('type', type.value);
    const query = next.toString();
    history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
  };

  const productLabel = () => product?.selectedOptions?.[0]?.textContent?.trim() || '';
  const applicationLabel = () => application?.selectedOptions?.[0]?.textContent?.trim() || '';

  const renderContext = () => {
    if (!context) return;
    const parts = [];
    if (product?.value && product.value !== 'all') parts.push(`<strong>${escapeHTML(productLabel())}</strong>`);
    if (application?.value && application.value !== 'all') parts.push(`<strong>${escapeHTML(applicationLabel())}</strong>`);
    if (!parts.length) {
      context.hidden = true;
      context.innerHTML = '';
      return;
    }
    context.hidden = false;
    context.innerHTML = `<span>Showing technical resources for ${parts.join(' · ')}.</span><a href="literature.html">Clear context</a>`;
  };

  const apply = () => {
    const q = input.value.toLowerCase().trim();
    const p = product?.value || 'all';
    const a = application?.value || 'all';
    const t = type?.value || 'all';
    let visible = 0;

    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const show = (!q || text.includes(q)) &&
        (p === 'all' || card.dataset.product === p) &&
        (a === 'all' || card.dataset.application === a) &&
        (t === 'all' || card.dataset.type === t);
      card.hidden = !show;
      if (show) visible++;
    });

    if (count) count.textContent = visible;
    if (noResults) noResults.hidden = visible !== 0;
    renderContext();
    syncUrl();

    // Make the empty state useful when a product has no migrated documents yet.
    if (noResults) {
      const heading = noResults.querySelector('h2');
      const text = noResults.querySelector('p');
      if (p !== 'all' && visible === 0) {
        if (heading) heading.textContent = 'No resources currently listed';
        if (text) text.textContent = 'Approved literature for this product has not yet been migrated to the website. Please contact Dadex Technical Support for the latest information.';
      } else {
        if (heading) heading.textContent = 'No matching resources';
        if (text) text.textContent = 'Try a broader search or reset the filters.';
      }
    }
  };

  [input, product, application, type].forEach(el => {
    el?.addEventListener('input', apply);
    el?.addEventListener('change', apply);
  });

  reset?.addEventListener('click', () => {
    input.value = '';
    if (product) product.value = 'all';
    if (application) application.value = 'all';
    if (type) type.value = 'all';
    apply();
    input.focus();
  });

  apply();
}
function initNewsFilter() {
  const buttons = document.querySelectorAll('.filter-btn[data-filter]');
  const cards = document.querySelectorAll('.news-card');
  if (!buttons.length || !cards.length) return;

  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    const value = button.dataset.filter;
    cards.forEach(card => {
      card.hidden = !(value === 'all' || card.dataset.year === value || card.dataset.category === value);
    });
  }));
}

function initProjectFilter() {
  const buttons = document.querySelectorAll('#projectFilter .filter-btn[data-filter]');
  const cards = document.querySelectorAll('.project-card');
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
   FAQ
   ------------------------------------------------------------ */
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(question => {
    const answer = question.nextElementSibling;
    if (!answer) return;
    question.setAttribute('aria-expanded', 'false');
    question.addEventListener('click', () => {
      const open = answer.classList.toggle('open');
      question.classList.toggle('open', open);
      question.setAttribute('aria-expanded', String(open));
    });
  });
}

/* ------------------------------------------------------------
   DEALER LOCATOR
   IMPORTANT: sample dealer data has been removed.
   The production page now uses the explicit "data not connected"
   state until an approved Sales dealer master is supplied.
   ------------------------------------------------------------ */
function initMailtoForm() {
  document.querySelectorAll('[data-mailto-form]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const subject = String(data.get('subject') || 'General Question').trim();
      const message = String(data.get('message') || '').trim();
      if (!name || !email) {
        form.reportValidity();
        return;
      }
      const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
      window.location.href = `mailto:info@dadex.com.pk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  });
}

function initDealerLocator() {
  const grid = document.getElementById('dealerGrid');
  if (!grid) return;

  const province = document.getElementById('provinceFilter');
  const city = document.getElementById('cityFilter');
  const area = document.getElementById('areaFilter');
  const product = document.getElementById('productFilter');
  const name = document.getElementById('nameSearch');
  const reset = document.getElementById('resetFilters');
  const summary = document.getElementById('resultsSummary');
  const dealers = Array.isArray(window.DADEX_DEALERS) ? window.DADEX_DEALERS : [];
  const activeSummary = document.getElementById('activeFilterSummary');
  const params = new URLSearchParams(window.location.search);
  const initial = {
    province: params.get('province') || '', city: params.get('city') || '', area: params.get('area') || '',
    product: params.get('product') || '', name: params.get('name') || ''
  };

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const unique = values => [...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const fill = (select, values, placeholder) => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>` + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if (values.includes(current)) select.value = current;
  };

  const scoped = () => dealers.filter(d =>
    (!province.value || d.province === province.value) &&
    (!city.value || d.city === city.value) &&
    (!area.value || d.area === area.value)
  );

  const refreshCities = () => fill(
    city,
    unique(dealers.filter(d => !province.value || d.province === province.value).map(d => d.city)),
    'All Cities'
  );

  const refreshAreas = () => fill(
    area,
    unique(dealers
      .filter(d => (!province.value || d.province === province.value) &&
                   (!city.value || d.city === city.value))
      .map(d => d.area)),
    'All Areas'
  );

  // PASS 35: Product choices follow Province → City → Area.
  // This keeps the finder simple while preventing irrelevant product options.
  const refreshProducts = () => fill(
    product,
    unique(scoped().flatMap(d => Array.isArray(d.products) ? d.products : [])),
    'All Products'
  );

  const syncUrl = () => {
    const next = new URLSearchParams();
    [['province',province.value],['city',city.value],['area',area.value],['product',product.value],['name',name.value.trim()]].forEach(([k,v]) => { if (v) next.set(k,v); });
    const query = next.toString();
    history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
  };

  const renderActiveFilters = () => {
    if (!activeSummary) return;
    const items = [['Province',province.value],['City',city.value],['Area',area.value],['Product',product.value],['Dealer',name.value.trim()]].filter(([,v]) => v);
    activeSummary.innerHTML = items.map(([label,value]) => `<span class="active-filter"><strong>${esc(label)}:</strong> ${esc(value)}</span>`).join('');
    activeSummary.hidden = !items.length;
  };

  const initFilters = () => {
    fill(province, unique(dealers.map(d => d.province)), 'All Provinces / Regions');
    province.value = initial.province;
    refreshCities(); city.value = initial.city;
    refreshAreas(); area.value = initial.area;
    refreshProducts(); product.value = initial.product;
    name.value = initial.name;
  };

  const matches = d => {
    const q = name.value.trim().toLowerCase();
    const products = Array.isArray(d.products) ? d.products : [];
    return (!province.value || d.province === province.value) &&
      (!city.value || d.city === city.value) &&
      (!area.value || d.area === area.value) &&
      (!product.value || products.includes(product.value)) &&
      (!q || String(d.name || '').toLowerCase().includes(q));
  };

  const render = () => {
    syncUrl();
    renderActiveFilters();
    const rows = dealers.filter(matches);
    if (summary) summary.innerHTML = dealers.length
      ? `Showing <strong>${rows.length}</strong> of <strong>${dealers.length}</strong> verified listings.`
      : 'The dealer directory is ready for approved Sales data.';

    if (!dealers.length) {
      grid.innerHTML = `<div class="dealer-empty"><i class="fas fa-store" aria-hidden="true"></i><h3>Dealer &amp; Distributor Directory</h3><p>Verified dealer and distributor records will appear here once the approved Dadex Sales master is connected. No sample records are shown.</p><a class="btn btn-primary btn-sm" href="contact.html">Contact Dadex</a></div>`;
      return;
    }
    if (!rows.length) {
      grid.innerHTML = `<div class="dealer-empty"><i class="fas fa-magnifying-glass" aria-hidden="true"></i><h3>No matching listings</h3><p>Try a different province, city, area, product, or dealer name.</p><button class="btn btn-outline btn-sm" type="button" id="emptyReset">Clear filters</button></div>`;
      document.getElementById('emptyReset')?.addEventListener('click', clearAll);
      return;
    }
    grid.innerHTML = rows.map(d => {
      const locationParts = [d.area, d.city, d.province].filter(Boolean);
      const locationLabel = d.location || locationParts.join(', ');
      return `<article class="dealer-card">
        <div class="dealer-card-top"><span class="dealer-type">${esc(d.type || 'Dealer')}</span><i class="fas fa-store" aria-hidden="true"></i></div>
        <h3>${esc(d.name)}</h3>
        ${locationLabel ? `<p class="dealer-location"><i class="fas fa-location-dot" aria-hidden="true"></i><span>${esc(locationLabel)}</span></p>` : ''}
        ${d.address ? `<p class="dealer-address">${esc(d.address)}</p>` : ''}
        ${d.phone ? `<a href="tel:${esc(d.phone.replace(/[^+\d]/g,''))}" class="dealer-contact"><i class="fas fa-phone" aria-hidden="true"></i>${esc(d.phone)}</a>` : ''}
        ${d.email ? `<a href="mailto:${esc(d.email)}" class="dealer-contact"><i class="fas fa-envelope" aria-hidden="true"></i>${esc(d.email)}</a>` : ''}
        ${Array.isArray(d.products) && d.products.length ? `<div class="dealer-tags">${d.products.map(x=>`<span>${esc(x)}</span>`).join('')}</div>` : ''}
        ${product.value ? `<a class="dealer-context-link" href="products.html?q=${encodeURIComponent(product.value)}">View ${esc(product.value)} <i class="fas fa-arrow-right" aria-hidden="true"></i></a>` : ''}
        ${d.mapUrl ? `<a class="dealer-map" href="${esc(d.mapUrl)}" target="_blank" rel="noopener">View location <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>` : ''}
      </article>`;
    }).join('');
  };

  function clearAll() {
    province.value = '';
    city.value = '';
    area.value = '';
    product.value = '';
    name.value = '';
    refreshCities();
    refreshAreas();
    refreshProducts();
    render();
  }

  province?.addEventListener('change', () => {
    refreshCities();
    city.value = '';
    refreshAreas();
    area.value = '';
    refreshProducts();
    product.value = '';
    render();
  });
  city?.addEventListener('change', () => {
    refreshAreas();
    area.value = '';
    refreshProducts();
    product.value = '';
    render();
  });
  area?.addEventListener('change', () => {
    refreshProducts();
    product.value = '';
    render();
  });
  product?.addEventListener('change', render);
  name?.addEventListener('input', render);
  reset?.addEventListener('click', clearAll);

  initFilters();
  render();
}

/* ------------------------------------------------------------
   LEGACY-SAFE HELPERS
   ------------------------------------------------------------ */
function filterCards(button, selector) {
  const value = button?.dataset?.filter || 'all';
  document.querySelectorAll(selector).forEach(card => {
    card.hidden = !(value === 'all' || card.dataset.category === value || card.dataset.year === value);
  });
}

console.log('Dadex Website — Phase 1 architecture loaded.');


/* ------------------------------------------------------------
   PRODUCT DETAIL SECTION NAVIGATION — PASS 16
   ------------------------------------------------------------ */
function initProductSectionNav(){
  const nav=document.querySelector('.product-section-nav');
  if(!nav) return;
  const links=[...nav.querySelectorAll('a[href^="#"]')];
  const targets=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const activate=id=>links.forEach(a=>a.classList.toggle('is-current',a.getAttribute('href')==='#'+id));
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(visible) activate(visible.target.id);
  },{rootMargin:'-90px 0px -65% 0px',threshold:[0,.2,.5]});
  targets.forEach(t=>observer.observe(t));
  links.forEach(a=>a.addEventListener('click',()=>activate(a.getAttribute('href').slice(1))));
}


// PASS 25 — Contextual enquiry field
document.addEventListener('DOMContentLoaded', function () {
  const subject = document.getElementById('subject');
  const productField = document.querySelector('[data-product-field]');
  const product = document.getElementById('product');
  if (subject && productField) {
    const syncProductField = () => {
      const show = subject.value === 'Product Inquiry' || subject.value === 'Technical Support' || subject.value === 'Order / Distribution' || subject.value === 'Dealer Inquiry';
      productField.hidden = !show;
      if (!show && product) product.value = '';
    };
    subject.addEventListener('change', syncProductField);
    syncProductField();
  }
});

/* ------------------------------------------------------------
   BUILD 06 — DEXPERT
   Persistent Dadex digital advisor / concierge.
   This is a deterministic front-end guide using approved site content;
   it does not invent technical, financial, certification or dealer data.
   ------------------------------------------------------------ */
function initDEXPERT(){
  if(document.querySelector('.dexpert-fab')) return;
  const fab=document.createElement('button');
  fab.className='dexpert-fab'; fab.type='button'; fab.setAttribute('aria-expanded','false'); fab.setAttribute('aria-controls','dexpertDialog');
  fab.innerHTML='<img src="assets/images/Dexpert.png" alt="" aria-hidden="true"><span>Ask DEXPERT</span>';
  const dialog=document.createElement('section');
  dialog.className='dexpert-dialog'; dialog.id='dexpertDialog'; dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','false'); dialog.setAttribute('aria-label','DEXPERT Dadex digital guide');
  dialog.innerHTML='<div class="dexpert-head"><div class="dexpert-brand"><strong>DEXPERT</strong><span>Dadex digital guide</span></div><button class="dexpert-close" type="button" aria-label="Close DEXPERT">×</button></div><div class="dexpert-body" id="dexpertBody"></div>';
  document.body.appendChild(fab); document.body.appendChild(dialog);
  const body=dialog.querySelector('#dexpertBody');
  const title=(document.querySelector('main h1')?.textContent||document.title.replace(/\s*[|–-].*$/,'')).trim();
  const path=window.location.pathname.split('/').pop()||'index.html';
  const productLinks=[
    ['Aquadex','product.html'],['T-Flex','product-tflex.html'],['Polydex Premium','product-polydex-premium.html'],['Polydex','product-polydex.html'],['Thermoline','product-thermoline.html'],
    ['Flow Line','product-flow-line.html'],['Inspection Chambers','product-inspection-chambers.html'],['Manholes','product-manholes.html'],['Catchpits','product-catchpits.html'],['Nikasi','product-nikasi.html'],['Polyduct','product-polyduct.html'],
    ['PE Cable Duct','product-pe-cable-duct.html'],['Electrical Conduits','product-electrical-conduits.html'],['Electroduct','product-electroduct.html'],['Corrugated Sheets','product-corrugated-sheets.html'],
    ['Non-Return Valves','product-non-return-valves.html'],['T-Flex Gas','product-tflex-gas.html'],['T-Flex Compressed Air','product-tflex-compressed-air.html'],['UPVC Tubewell Casing & Screen Pipes System','product-upvc-tubewell.html']
  ];
  const apps=[['Water Supply','products.html#water-supply'],['Sewerage & Drainage','products.html#sewerage-drainage'],['Cable & Utility Ducting','products.html#cable-utility-ducting'],['Specialised & Industrial','products.html#specialised-industrial'],['Roofing','products.html#roofing']];
  const isProduct=path.startsWith('product') && path!=='products.html' && path!=='product-pe-gas.html';
  const isInvestor=/investor|financial-reports/i.test(path);
  const isResources=/literature|faq|calculators|news/i.test(path);
  const currentProduct=isProduct ? title : '';
  function link(href,label){return '<a href="'+href+'">'+label+'</a>'}
  function home(){
    let intro='What do you need?'; let actions=[];
    if(isProduct){
      intro='<strong>'+escapeHTML(currentProduct)+'</strong>';
      actions=[link('#technical','Technical information'),link('technical-resources.html','Technical resources'),link('products.html','Related products'),link('dealers.html','Find a dealer')];
    }else if(isInvestor){
      intro='Investor information';
      actions=[link('investors.html','Investor Relations'),link('investors.html#annual','Annual Reports'),link('contact.html','Investor enquiry')];
    }else if(isResources){
      intro='Dadex Resources';
      actions=[link('products.html','Find a product'),link('technical-resources.html','Technical resources'),link('faq.html','FAQs'),link('contact.html','Technical support')];
    }else{
      actions=[link('products.html','Find a product'),link('solutions.html','Find a solution'),link('technical-resources.html','Technical resources'),link('dealers.html','Find a dealer')];
    }
    body.innerHTML='<div class="dexpert-context"><span>Current page</span><strong>'+escapeHTML(title)+'</strong></div><p class="dexpert-intro">'+intro+'</p><div class="dexpert-actions">'+actions.join('')+'</div><div class="dexpert-ask"><label for="dexpertQuery">Search Dadex</label><div><input id="dexpertQuery" type="search" placeholder="Product or application" autocomplete="off"><button type="button" id="dexpertAskBtn">Ask</button></div></div><p class="dexpert-note">Uses approved Dadex website information.</p>';
    const q=body.querySelector('#dexpertQuery'), ask=body.querySelector('#dexpertAskBtn');
    const run=()=>answer(q.value.trim()); ask.addEventListener('click',run); q.addEventListener('keydown',e=>{if(e.key==='Enter')run()});
  }
  function result(back,label,heading,message,href,cta){
    body.innerHTML='<button class="dexpert-back" type="button">← Back</button><div class="dexpert-result"><span>'+label+'</span><h4>'+heading+'</h4><p>'+message+'</p><a class="dexpert-result-link" href="'+href+'">'+cta+' →</a></div>';
    body.querySelector('.dexpert-back').addEventListener('click',home);
  }
  function answer(query){
    const q=query.toLowerCase();
    if(!q){result(true,'DEXPERT','Try a search','Enter a product or application such as Aquadex, water supply or gas.','products.html','Browse products');return}
    const product=productLinks.find(p=>q.includes(p[0].toLowerCase())||p[0].toLowerCase().includes(q));
    if(product){result(true,'PRODUCT',escapeHTML(product[0]),'Open the product page for its approved information.',product[1],'Open product');return}
    const app=apps.find(a=>q.includes(a[0].toLowerCase())||a[0].toLowerCase().includes(q));
    if(app){result(true,'APPLICATION',escapeHTML(app[0]),'Explore the systems listed for this application area.',app[1],'Explore');return}
    if(/report|annual|financial|investor|shareholder|agm/.test(q)){result(true,'INVESTOR','Investor Relations','Find annual reports, financial information and shareholder references.','investors.html#annual','Open investor information');return}
    if(/document|brochure|datasheet|certificate|technical|literature|drawing/.test(q)){result(true,'RESOURCES','Technical Resources','Find approved technical information and support routes.','technical-resources.html','Open technical resources');return}
    result(true,'DEXPERT','No direct match','Try a product, application or technical-resource term.', 'products.html','Browse products');
  }
  home();
  const close=()=>{dialog.classList.remove('open');fab.setAttribute('aria-expanded','false')};
  const open=()=>{dialog.classList.add('open');fab.setAttribute('aria-expanded','true');setTimeout(()=>dialog.querySelector('#dexpertQuery')?.focus(),60)};
  fab.addEventListener('click',()=>dialog.classList.contains('open')?close():open());
  dialog.querySelector('.dexpert-close').addEventListener('click',close);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();fab.focus()}});
  document.addEventListener('click',e=>{if(e.target.closest('[data-open-dexpert]')){e.preventDefault();open();return} if(dialog.classList.contains('open') && !dialog.contains(e.target) && !fab.contains(e.target)) close()});
}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}


/* Build 06 — technical resource filter */
document.addEventListener('DOMContentLoaded',()=>{
  const grid=document.getElementById('resourceGrid');
  if(!grid) return;
  const cards=[...grid.querySelectorAll('.rx-resource-card')];
  const empty=document.getElementById('resourceEmpty');
  const input=document.getElementById('resourceSearch');
  let filter='all';
  const render=()=>{
    const q=(input?.value||'').trim().toLowerCase(); let visible=0;
    cards.forEach(card=>{const okFilter=filter==='all'||card.dataset.resource===filter;const okSearch=!q||(card.dataset.search||'').toLowerCase().includes(q);const show=okFilter&&okSearch;card.hidden=!show;if(show)visible++});
    if(empty) empty.hidden=visible!==0;
  };
  document.querySelectorAll('[data-resource-filter]').forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.resourceFilter;document.querySelectorAll('[data-resource-filter]').forEach(b=>b.classList.toggle('is-active',b===btn));render()}));
  input?.addEventListener('input',render); render();
});


/* BUILD 07 — Investor Relations sidebar */
function initInvestorPanels(){const links=[...document.querySelectorAll('[data-ir]')], panels=[...document.querySelectorAll('[data-ir-panel]')]; if(!links.length)return; const groups=[...document.querySelectorAll('.ir-side-group')]; const mobile=()=>window.matchMedia('(max-width:900px)').matches; const openGroupFor=id=>{if(!mobile())return; groups.forEach(g=>g.classList.toggle('is-open',!!g.querySelector(`[data-ir="${CSS.escape(id)}"]`)));}; const activate=id=>{const target=id||'overview';links.forEach(a=>a.classList.toggle('active',a.dataset.ir===target));panels.forEach(p=>p.classList.toggle('active',p.dataset.irPanel===target));openGroupFor(target);}; const sync=()=>activate((location.hash||'#overview').slice(1)); groups.forEach(group=>{const title=group.querySelector('.ir-side-title'); if(title){title.setAttribute('role','button');title.setAttribute('tabindex','0');title.setAttribute('aria-expanded','false'); const toggle=()=>{if(!mobile())return; const open=!group.classList.contains('is-open'); groups.forEach(g=>g.classList.remove('is-open')); group.classList.toggle('is-open',open); title.setAttribute('aria-expanded',String(open));}; title.addEventListener('click',toggle); title.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}})}}); links.forEach(a=>a.addEventListener('click',()=>setTimeout(sync,0))); window.addEventListener('hashchange',sync); window.addEventListener('resize',sync); sync();} document.addEventListener('DOMContentLoaded',initInvestorPanels);

/* BUILD 11 — Global site search */
function initSiteSearch(){
  const input=document.getElementById('siteSearchInput'); if(!input)return;
  const button=document.getElementById('siteSearchButton'), clear=document.getElementById('searchClear'), grid=document.getElementById('searchResults'), empty=document.getElementById('searchEmpty'), count=document.getElementById('searchCount');
  const pages=Array.isArray(window.DADEX_SEARCH_INDEX)?window.DADEX_SEARCH_INDEX:[];
  const render=()=>{const q=input.value.trim().toLowerCase(); if(!q){grid.innerHTML='';empty.hidden=true;count.textContent='Start searching';return;} const terms=q.split(/\s+/).filter(Boolean); const rows=pages.filter(p=>terms.every(t=>p.join(' ').toLowerCase().includes(t))).slice(0,60); count.textContent=`${rows.length} result${rows.length===1?'':'s'} found`; grid.innerHTML=rows.map(p=>`<article class="search-result-card"><span class="result-type">${p[2]}</span><h3>${p[0]}</h3><p>${p[3]}</p><a href="${p[1]}">Open page <i class="fas fa-arrow-right"></i></a></article>`).join(''); empty.hidden=rows.length!==0;};
  button?.addEventListener('click',render); input.addEventListener('input',render); input.addEventListener('keydown',e=>{if(e.key==='Enter')render()}); clear?.addEventListener('click',()=>{input.value='';render();input.focus()});
  const q=new URLSearchParams(location.search).get('q'); if(q){input.value=q;render()}
}
document.addEventListener('DOMContentLoaded',initSiteSearch);
