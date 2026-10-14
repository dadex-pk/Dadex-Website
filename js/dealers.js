/* ============================================================
   DADEX DEALER & DISTRIBUTOR DIRECTORY
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Helpers ---------- */

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)))
      .sort((a, b) => String(a).localeCompare(String(b)));
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* Rebuild a <select>'s options from values, keeping the current
     selection when it still exists in the new list. */
  function fillOptions(select, values, placeholder) {
    if (!select) return;
    const current = select.value;

    const frag = document.createDocumentFragment();

    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.textContent = placeholder;
    frag.appendChild(placeholderOpt);

    for (const v of values) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      frag.appendChild(opt);
    }

    select.replaceChildren(frag);
    if (values.includes(current)) select.value = current;
  }

  /* ---------- Locator ---------- */

  function initDealerLocator() {
    const grid = document.getElementById('dealerGrid');
    if (!grid) return;

    const cardTemplate = document.getElementById('dealerCardTemplate');
    if (!cardTemplate) {
      console.error('dealerCardTemplate not found. Add <template id="dealerCardTemplate"> to dealers.html.');
      return;
    }

    const province = document.getElementById('provinceFilter');
    const city     = document.getElementById('cityFilter');
    const area     = document.getElementById('areaFilter');
    const product  = document.getElementById('productFilter');
    const name     = document.getElementById('nameSearch');
    const reset    = document.getElementById('resetFilters');
    const summary  = document.getElementById('resultsSummary');
    const activeSummary = document.getElementById('activeFilterSummary');

    const all = Array.isArray(window.DADEX_DEALERS) ? window.DADEX_DEALERS : [];
    const dealers = all.filter(d => d && d.active !== false);

    /* ---------- Initial state from URL ---------- */

    const params = new URLSearchParams(window.location.search);
    const initial = {
      province: params.get('province') || '',
      city: params.get('city') || '',
      area: params.get('area') || '',
      product: params.get('product') || '',
      name: params.get('name') || ''
    };

    /* ---------- Option lists ---------- */

    function refreshCities() {
      fillOptions(
        city,
        unique(dealers
          .filter(d => !province.value || d.province === province.value)
          .map(d => d.city)),
        'All Cities'
      );
    }

    function refreshAreas() {
      fillOptions(
        area,
        unique(dealers
          .filter(d =>
            (!province.value || d.province === province.value) &&
            (!city.value || d.city === city.value))
          .map(d => d.area)),
        'All Areas'
      );
    }

    function refreshProducts() {
      const scoped = dealers.filter(d =>
        (!province.value || d.province === province.value) &&
        (!city.value || d.city === city.value) &&
        (!area.value || d.area === area.value)
      );
      fillOptions(
        product,
        unique(scoped.flatMap(d => Array.isArray(d.products) ? d.products : [])),
        'All Products'
      );
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
      history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
    }

    /* ---------- Active filter chips ---------- */

    function renderActiveFilters() {
      if (!activeSummary) return;
      const items = [
        ['Province', province.value],
        ['City', city.value],
        ['Area', area.value],
        ['Product', product.value],
        ['Dealer', name.value.trim()]
      ].filter(pair => pair[1]);

      if (!items.length) {
        activeSummary.replaceChildren();
        activeSummary.hidden = true;
        return;
      }

      const frag = document.createDocumentFragment();
      for (const [label, value] of items) {
        const span = document.createElement('span');
        span.className = 'active-filter';
        const strong = document.createElement('strong');
        strong.textContent = label + ':';
        span.appendChild(strong);
        span.appendChild(document.createTextNode(' ' + value));
        frag.appendChild(span);
      }
      activeSummary.replaceChildren(frag);
      activeSummary.hidden = false;
    }

    /* ---------- Initial options ---------- */

    function initFilters() {
      fillOptions(province, unique(dealers.map(d => d.province)), 'All Provinces / Regions');
      province.value = initial.province;
      refreshCities();
      city.value = initial.city;
      refreshAreas();
      area.value = initial.area;
      refreshProducts();
      product.value = initial.product;
      name.value = initial.name;
    }

    /* ---------- Filter match ---------- */

    function matches(d) {
      const q = name.value.trim().toLowerCase();
      const products = Array.isArray(d.products) ? d.products : [];
      return (!province.value || d.province === province.value) &&
             (!city.value || d.city === city.value) &&
             (!area.value || d.area === area.value) &&
             (!product.value || products.includes(product.value)) &&
             (!q || String(d.name || '').toLowerCase().includes(q));
    }

    /* ---------- Clear ---------- */

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

    /* ---------- Card builder ---------- */

    function buildCard(d) {
      const node = cardTemplate.content.firstElementChild.cloneNode(true);

      const locationParts = [d.area, d.city, d.province].filter(Boolean);
      const locationLabel = d.location || locationParts.join(', ');

      /* Type + name — always present */
      node.querySelector('[data-field="type"]').textContent = d.type || 'Dealer';
      node.querySelector('[data-field="name"]').textContent = d.name || '';

      /* Optional: contact name */
      const contactNameEl = node.querySelector('[data-field="contact-name"]');
      const contactName = d.contactName ? String(d.contactName).trim() : '';
      if (contactName) contactNameEl.textContent = contactName;
      else contactNameEl.remove();

      /* Optional: location */
      const locationEl = node.querySelector('[data-field="location"]');
      if (locationLabel) locationEl.querySelector('span').textContent = locationLabel;
      else locationEl.remove();

      /* Optional: address */
      const addressEl = node.querySelector('[data-field="address"]');
      if (d.address) addressEl.textContent = d.address;
      else addressEl.remove();

      /* Optional: phone */
      const phoneEl = node.querySelector('[data-field="phone"]');
      if (d.phone) {
        phoneEl.href = 'tel:' + String(d.phone).replace(/[^+\d]/g, '');
        phoneEl.querySelector('span').textContent = d.phone;
      } else {
        phoneEl.remove();
      }

      /* Optional: email */
      const emailEl = node.querySelector('[data-field="email"]');
      if (d.email) {
        emailEl.href = 'mailto:' + d.email;
        emailEl.querySelector('span').textContent = d.email;
      } else {
        emailEl.remove();
      }

      /* Optional: product tags */
      const tagsEl = node.querySelector('[data-field="tags"]');
      if (Array.isArray(d.products) && d.products.length) {
        const frag = document.createDocumentFragment();
        for (const p of d.products) {
          const span = document.createElement('span');
          span.textContent = p;
          frag.appendChild(span);
        }
        tagsEl.replaceChildren(frag);
      } else {
        tagsEl.remove();
      }

      /* Optional: context link (only when a product filter is active) */
      const contextLink = node.querySelector('[data-field="context-link"]');
      if (product.value) {
        contextLink.href = 'products.html?q=' + encodeURIComponent(product.value);
        contextLink.querySelector('span').textContent = 'View ' + product.value;
      } else {
        contextLink.remove();
      }

      /* Optional: map link */
      const mapLink = node.querySelector('[data-field="map"]');
      if (d.mapUrl) mapLink.href = d.mapUrl;
      else mapLink.remove();

      return node;
    }

    /* ---------- Status summary ---------- */

    function updateSummary(visibleCount) {
      if (!summary) return;
      if (!dealers.length) {
        summary.textContent = 'The dealer directory is ready for approved Sales data.';
        return;
      }
      summary.replaceChildren();
      summary.appendChild(document.createTextNode('Showing '));
      const a = document.createElement('strong');
      a.textContent = String(visibleCount);
      summary.appendChild(a);
      summary.appendChild(document.createTextNode(' of '));
      const b = document.createElement('strong');
      b.textContent = String(dealers.length);
      summary.appendChild(b);
      summary.appendChild(document.createTextNode(' listings.'));
    }

    /* ---------- Empty states ---------- */

    function renderDirectoryEmpty() {
      const div = document.createElement('div');
      div.className = 'dealer-empty';
      div.innerHTML =
        '<i class="fas fa-store" aria-hidden="true"></i>' +
        '<h3>Dealer &amp; Distributor Directory</h3>' +
        '<p>Dealer and distributor records will appear here once the approved Dadex Sales master is connected.</p>';
      const link = document.createElement('a');
      link.className = 'btn btn-primary btn-sm';
      link.href = 'contact.html';
      link.textContent = 'Contact Dadex';
      div.appendChild(link);
      grid.replaceChildren(div);
    }

    function renderNoMatches() {
      const div = document.createElement('div');
      div.className = 'dealer-empty';
      div.innerHTML =
        '<i class="fas fa-magnifying-glass" aria-hidden="true"></i>' +
        '<h3>No matching listings</h3>' +
        '<p>Try a different province, city, area, product, or dealer name.</p>';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline btn-sm';
      btn.dataset.action = 'clear-filters';
      btn.textContent = 'Clear filters';
      div.appendChild(btn);
      grid.replaceChildren(div);
    }

    /* ---------- Render ---------- */

    function render() {
      syncUrl();
      renderActiveFilters();

      const rows = dealers.filter(matches);
      updateSummary(rows.length);

      if (!dealers.length) {
        renderDirectoryEmpty();
        return;
      }
      if (!rows.length) {
        renderNoMatches();
        return;
      }

      const frag = document.createDocumentFragment();
      for (const d of rows) frag.appendChild(buildCard(d));
      grid.replaceChildren(frag);
    }

    /* ---------- Event binding ---------- */

    const renderDebounced = debounce(render, 120);

    if (province) {
      province.addEventListener('change', () => {
        refreshCities(); city.value = '';
        refreshAreas(); area.value = '';
        refreshProducts(); product.value = '';
        render();
      });
    }
    if (city) {
      city.addEventListener('change', () => {
        refreshAreas(); area.value = '';
        refreshProducts(); product.value = '';
        render();
      });
    }
    if (area) {
      area.addEventListener('change', () => {
        refreshProducts(); product.value = '';
        render();
      });
    }
    if (product) product.addEventListener('change', render);
    if (name) name.addEventListener('input', renderDebounced);
    if (reset) reset.addEventListener('click', clearAll);

    /* Delegated — catches the "Clear filters" button in the empty state. */
    grid.addEventListener('click', event => {
      if (event.target.closest('[data-action="clear-filters"]')) clearAll();
    });

    /* ---------- Init ---------- */

    initFilters();
    render();
  }

  document.addEventListener('DOMContentLoaded', initDealerLocator);
})();
