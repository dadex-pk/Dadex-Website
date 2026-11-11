/* ============================================================
   DADEX DEALER & DISTRIBUTOR DIRECTORY (v2.0)
   ------------------------------------------------------------
   Requires (in this order on dealers.html):
     <script src="js/dealers-data.js"></script>   → window.DADEX_DEALERS
     <script src="js/dealers.js"></script>

   v2.0 changes
     · Card builder tolerates missing template fields (no crash).
     · Filters cascade and keep still-valid selections.
     · Province aliases normalised (e.g. "Islamabad" → ICT).
     · tel: links converted to international (+92) format.
     · Optional whatsapp / mapUrl fields; URLs restricted to http(s).
     · Name search also matches city and area.
     · Icons / empty states built with DOM APIs (no innerHTML).
     · Results summary announced to screen readers.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Helpers ---------- */

  const PROVINCE_ALIASES = {
    'islamabad': 'Islamabad Capital Territory',
    'ict': 'Islamabad Capital Territory',
    'islamabad capital territory': 'Islamabad Capital Territory',
    'kpk': 'Khyber Pakhtunkhwa',
    'kp': 'Khyber Pakhtunkhwa',
    'khyber pakhtunkhwa': 'Khyber Pakhtunkhwa',
    'ajk': 'Azad Jammu & Kashmir',
    'gb': 'Gilgit-Baltistan'
  };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function normaliseProvince(value) {
    const v = clean(value);
    return PROVINCE_ALIASES[v.toLowerCase()] || v;
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)))
      .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced() {
      const args = arguments;
      const self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(clean(value), window.location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  /* Pakistani local formats (0300-…, 042-…) → +92… */
  function toTelHref(phone) {
    const raw = clean(phone);
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (raw.charAt(0) === '+') return '+' + digits;
    if (digits.indexOf('00') === 0) return '+' + digits.slice(2);
    if (digits.charAt(0) === '0') return '+92' + digits.slice(1);
    if (digits.indexOf('92') === 0 && digits.length >= 11) return '+' + digits;
    return digits;
  }

  function toWhatsAppHref(phone) {
    const tel = toTelHref(phone);
    return tel ? 'https://wa.me/' + tel.replace(/\D/g, '') : '';
  }

  /* Rebuild a <select> from values, keeping the current selection
     when it still exists. Falls back to the placeholder. */
  function fillOptions(select, values, placeholder) {
    if (!select) return;
    const current = select.value;
    const frag = document.createDocumentFragment();

    const first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    frag.appendChild(first);

    values.forEach(function (v) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      frag.appendChild(opt);
    });

    select.replaceChildren(frag);
    select.value = values.indexOf(current) !== -1 ? current : '';
  }

  function setSelect(select, value) {
    if (!select) return;
    const exists = Array.prototype.some.call(
      select.options, function (o) { return o.value === value; }
    );
    select.value = exists ? value : '';
  }

  function icon(className) {
    const i = document.createElement('i');
    i.className = className;
    i.setAttribute('aria-hidden', 'true');
    return i;
  }

  /* ---------- Template field helpers (never throw) ---------- */

  function field(node, name) {
    return node.querySelector('[data-field="' + name + '"]');
  }

  /* Sets text (into an inner <span> if present). Removes the element
     when there is no value. Returns the element or null. */
  function fillField(node, name, value) {
    const el = field(node, name);
    if (!el) return null;
    if (!value) { el.remove(); return null; }
    const target = el.querySelector('span') || el;
    target.textContent = value;
    return el;
  }

  function fillLink(node, name, href, text) {
    if (!href) {
      const el = field(node, name);
      if (el) el.remove();
      return null;
    }
    const el = field(node, name);
    if (!el) return null;
    el.setAttribute('href', href);
    if (text) {
      const target = el.querySelector('span') || el;
      target.textContent = text;
    }
    return el;
  }

  /* ---------- Record normalisation ---------- */

  function normaliseRecord(d) {
    return {
      name: clean(d.name),
      type: clean(d.type) || 'Dealer',
      contactName: clean(d.contactName),
      province: normaliseProvince(d.province),
      city: clean(d.city),
      area: clean(d.area),
      address: clean(d.address),
      phone: clean(d.phone),
      whatsapp: clean(d.whatsapp),
      email: clean(d.email),
      mapUrl: clean(d.mapUrl),
      products: Array.isArray(d.products)
        ? d.products.map(clean).filter(Boolean)
        : []
    };
  }

  /* ---------- Locator ---------- */

  function initDealerLocator() {
    const grid = document.getElementById('dealerGrid');
    if (!grid) return;

    const cardTemplate = document.getElementById('dealerCardTemplate');
    if (!cardTemplate || !cardTemplate.content.firstElementChild) {
      console.error('[Dadex] dealerCardTemplate not found or empty in dealers.html.');
      return;
    }

    const province = document.getElementById('provinceFilter');
    const city = document.getElementById('cityFilter');
    const area = document.getElementById('areaFilter');
    const product = document.getElementById('productFilter');
    const name = document.getElementById('nameSearch');
    const reset = document.getElementById('resetFilters');
    const summary = document.getElementById('resultsSummary');
    const activeSummary = document.getElementById('activeFilterSummary');

    if (!province || !city || !area || !product || !name) {
      console.error('[Dadex] Dealer filter controls are missing from dealers.html.');
      return;
    }

    if (summary) {
      summary.setAttribute('aria-live', 'polite');
      summary.setAttribute('role', 'status');
    }

    const source = Array.isArray(window.DADEX_DEALERS) ? window.DADEX_DEALERS : [];
    const dealers = source
      .filter(function (d) { return d && d.active !== false; })
      .map(normaliseRecord)
      .filter(function (d) { return d.name; })
      .sort(function (a, b) {
        if (a.type !== b.type) return a.type === 'Distributor' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    /* ---------- Initial state from URL ---------- */

    const params = new URLSearchParams(window.location.search);
    const initial = {
      province: normaliseProvince(params.get('province')),
      city: clean(params.get('city')),
      area: clean(params.get('area')),
      product: clean(params.get('product')),
      name: clean(params.get('name'))
    };

    /* ---------- Cascading option lists ---------- */

    const inProvince = function (d) { return !province.value || d.province === province.value; };
    const inCity = function (d) { return !city.value || d.city === city.value; };
    const inArea = function (d) { return !area.value || d.area === area.value; };

    function refreshOptions() {
      fillOptions(province, unique(dealers.map(function (d) { return d.province; })),
        'All Provinces / Regions');

      fillOptions(city,
        unique(dealers.filter(inProvince).map(function (d) { return d.city; })),
        'All Cities');

      fillOptions(area,
        unique(dealers.filter(function (d) { return inProvince(d) && inCity(d); })
          .map(function (d) { return d.area; })),
        'All Areas');

      fillOptions(product,
        unique(dealers
          .filter(function (d) { return inProvince(d) && inCity(d) && inArea(d); })
          .reduce(function (all, d) { return all.concat(d.products); }, [])),
        'All Products');
    }

    function initFilters() {
      fillOptions(province, unique(dealers.map(function (d) { return d.province; })),
        'All Provinces / Regions');
      setSelect(province, initial.province);

      fillOptions(city,
        unique(dealers.filter(inProvince).map(function (d) { return d.city; })),
        'All Cities');
      setSelect(city, initial.city);

      fillOptions(area,
        unique(dealers.filter(function (d) { return inProvince(d) && inCity(d); })
          .map(function (d) { return d.area; })),
        'All Areas');
      setSelect(area, initial.area);

      fillOptions(product,
        unique(dealers
          .filter(function (d) { return inProvince(d) && inCity(d) && inArea(d); })
          .reduce(function (all, d) { return all.concat(d.products); }, [])),
        'All Products');
      setSelect(product, initial.product);

      name.value = initial.name;
    }

    /* ---------- URL sync ---------- */

    function syncUrl() {
      const next = new URLSearchParams();
      if (province.value) next.set('province', province.value);
      if (city.value) next.set('city', city.value);
      if (area.value) next.set('area', area.value);
      if (product.value) next.set('product', product.value);
      if (name.value.trim()) next.set('name', name.value.trim());
      const query = next.toString();
      const url = window.location.pathname + (query ? '?' + query : '') + window.location.hash;
      try { history.replaceState(null, '', url); } catch (_) { /* ignore */ }
    }

    /* ---------- Active filter chips ---------- */

    function renderActiveFilters() {
      if (!activeSummary) return;
      const items = [
        ['Province', province.value],
        ['City', city.value],
        ['Area', area.value],
        ['Product', product.value],
        ['Search', name.value.trim()]
      ].filter(function (pair) { return pair[1]; });

      if (!items.length) {
        activeSummary.replaceChildren();
        activeSummary.hidden = true;
        return;
      }

      const frag = document.createDocumentFragment();
      items.forEach(function (pair) {
        const span = document.createElement('span');
        span.className = 'active-filter';
        const strong = document.createElement('strong');
        strong.textContent = pair[0] + ':';
        span.appendChild(strong);
        span.appendChild(document.createTextNode(' ' + pair[1]));
        frag.appendChild(span);
      });
      activeSummary.replaceChildren(frag);
      activeSummary.hidden = false;
    }

    /* ---------- Filter match ---------- */

    function matches(d, q) {
      return inProvince(d) && inCity(d) && inArea(d) &&
        (!product.value || d.products.indexOf(product.value) !== -1) &&
        (!q || (d.name + ' ' + d.city + ' ' + d.area).toLowerCase().indexOf(q) !== -1);
    }

    /* ---------- Card builder ---------- */

    function buildCard(d) {
      const node = cardTemplate.content.firstElementChild.cloneNode(true);

      const typeEl = field(node, 'type');
      if (typeEl) typeEl.textContent = d.type;
      const nameEl = field(node, 'name');
      if (nameEl) nameEl.textContent = d.name;

      fillField(node, 'contact-name', d.contactName);
      fillField(node, 'address', d.address);

      fillLink(node, 'phone', toTelHref(d.phone) ? 'tel:' + toTelHref(d.phone) : '', d.phone);
      fillLink(node, 'email', EMAIL_RE.test(d.email) ? 'mailto:' + d.email : '', d.email);
      fillLink(node, 'whatsapp', toWhatsAppHref(d.whatsapp), d.whatsapp);

      const mapEl = fillLink(node, 'map', safeHttpUrl(d.mapUrl));
      if (mapEl) {
        mapEl.setAttribute('target', '_blank');
        mapEl.setAttribute('rel', 'noopener noreferrer');
      }

      /* Product tags */
      const tagsEl = field(node, 'tags');
      if (tagsEl) {
        if (d.products.length) {
          const frag = document.createDocumentFragment();
          d.products.forEach(function (p) {
            const span = document.createElement('span');
            span.textContent = p;
            frag.appendChild(span);
          });
          tagsEl.replaceChildren(frag);
        } else {
          tagsEl.remove();
        }
      }

      /* Context link — only when a product filter is active */
      fillLink(
        node, 'context-link',
        product.value ? 'products.html?q=' + encodeURIComponent(product.value) : '',
        product.value ? 'View ' + product.value : ''
      );

      /* Type icon */
      const iconEl = field(node, 'icon');
      if (iconEl) {
        iconEl.replaceChildren(
          icon(d.type === 'Distributor' ? 'fas fa-truck-fast' : 'fas fa-store')
        );
      }

      return node;
    }

    /* ---------- Summary ---------- */

    function updateSummary(visibleCount) {
      if (!summary) return;
      if (!dealers.length) {
        summary.textContent = 'The dealer directory is ready for approved Sales data.';
        return;
      }
      const frag = document.createDocumentFragment();
      frag.appendChild(document.createTextNode('Showing '));
      const a = document.createElement('strong');
      a.textContent = String(visibleCount);
      frag.appendChild(a);
      frag.appendChild(document.createTextNode(' of '));
      const b = document.createElement('strong');
      b.textContent = String(dealers.length);
      frag.appendChild(b);
      frag.appendChild(document.createTextNode(' listings.'));
      summary.replaceChildren(frag);
    }

    /* ---------- Empty states ---------- */

    function emptyState(iconClass, title, text, action) {
      const div = document.createElement('div');
      div.className = 'dealer-empty';
      div.appendChild(icon(iconClass));
      const h3 = document.createElement('h3');
      h3.textContent = title;
      const p = document.createElement('p');
      p.textContent = text;
      div.appendChild(h3);
      div.appendChild(p);
      if (action) div.appendChild(action);
      return div;
    }

    function renderDirectoryEmpty() {
      const link = document.createElement('a');
      link.className = 'btn btn--primary btn-primary btn--sm btn-sm';
      link.href = 'contact.html';
      link.textContent = 'Contact Dadex';
      grid.replaceChildren(emptyState(
        'fas fa-store',
        'Dealer & Distributor Directory',
        'Dealer and distributor records will appear here once the approved Dadex Sales master is connected.',
        link
      ));
    }

    function renderNoMatches() {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--outline btn-outline btn--sm btn-sm';
      btn.dataset.action = 'clear-filters';
      btn.textContent = 'Clear filters';
      grid.replaceChildren(emptyState(
        'fas fa-magnifying-glass',
        'No matching listings',
        'Try a different province, city, area, product, or dealer name.',
        btn
      ));
    }

    /* ---------- Render ---------- */

    function render() {
      syncUrl();
      renderActiveFilters();

      const q = name.value.trim().toLowerCase();
      const rows = dealers.filter(function (d) { return matches(d, q); });
      updateSummary(rows.length);

      if (!dealers.length) { renderDirectoryEmpty(); return; }
      if (!rows.length) { renderNoMatches(); return; }

      const frag = document.createDocumentFragment();
      rows.forEach(function (d) { frag.appendChild(buildCard(d)); });
      grid.replaceChildren(frag);
    }

    function clearAll() {
      province.value = '';
      city.value = '';
      area.value = '';
      product.value = '';
      name.value = '';
      refreshOptions();
      render();
    }

    /* ---------- Events ---------- */

    function onFilterChange() {
      refreshOptions();
      render();
    }

    province.addEventListener('change', onFilterChange);
    city.addEventListener('change', onFilterChange);
    area.addEventListener('change', onFilterChange);
    product.addEventListener('change', render);
    name.addEventListener('input', debounce(render, 120));
    if (reset) reset.addEventListener('click', clearAll);

    /* Delegated: "Clear filters" inside the empty state */
    grid.addEventListener('click', function (event) {
      if (event.target.closest('[data-action="clear-filters"]')) clearAll();
    });

    /* ---------- Init ---------- */

    initFilters();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDealerLocator, { once: true });
  } else {
    initDealerLocator();
  }
})();
