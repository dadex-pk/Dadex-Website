/* ============================================================
   DADEX DEALER & DISTRIBUTOR DIRECTORY
   Page-scoped module. Loaded only from dealers.html.
   Depends on: dealers-data.js (window.DADEX_DEALERS)
   ============================================================ */

(function () {
  'use strict';

  /* Hoisted so the map is not recreated on every replace call. */
  const ESC_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ESC_MAP[c]);
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)))
      .sort(function (a, b) { return String(a).localeCompare(String(b)); });
  }

  /* Trailing-edge debounce for filter inputs that rebuild the grid. */
  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function initDealerLocator() {
    const grid = document.getElementById('dealerGrid');
    if (!grid) return;

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

    const params = new URLSearchParams(window.location.search);
    const initial = {
      province: params.get('province') || '',
      city: params.get('city') || '',
      area: params.get('area') || '',
      product: params.get('product') || '',
      name: params.get('name') || ''
    };

    /* ---------- Option list helpers ---------- */

    function fill(select, values, placeholder) {
      if (!select) return;
      const current = select.value;
      select.innerHTML = '<option value="">' + placeholder + '</option>'
        + values.map(v => '<option value="' + esc(v) + '">' + esc(v) + '</option>').join('');
      if (values.indexOf(current) !== -1) select.value = current;
    }

    function refreshCities() {
      fill(
        city,
        unique(dealers
          .filter(d => !province.value || d.province === province.value)
          .map(d => d.city)),
        'All Cities'
      );
    }

    function refreshAreas() {
      fill(
        area,
        unique(dealers
          .filter(d =>
            (!province.value || d.province === province.value) &&
            (!city.value || d.city === city.value)
          )
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
      fill(
        product,
        unique(scoped.reduce((acc, d) => {
          if (Array.isArray(d.products)) acc = acc.concat(d.products);
          return acc;
        }, [])),
        'All Products'
      );
    }

    /* ---------- URL state ---------- */

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

    function renderActiveFilters() {
      if (!activeSummary) return;
      const items = [
        ['Province', province.value],
        ['City', city.value],
        ['Area', area.value],
        ['Product', product.value],
        ['Dealer', name.value.trim()]
      ].filter(pair => pair[1]);

      activeSummary.innerHTML = items
        .map(pair =>
          '<span class="active-filter"><strong>' + esc(pair[0]) + ':</strong> ' + esc(pair[1]) + '</span>')
        .join('');
      activeSummary.hidden = items.length === 0;
    }

    /* ---------- Init ---------- */

    function initFilters() {
      fill(province, unique(dealers.map(d => d.province)), 'All Provinces / Regions');
      province.value = initial.province;
      refreshCities();
      city.value = initial.city;
      refreshAreas();
      area.value = initial.area;
      refreshProducts();
      product.value = initial.product;
      name.value = initial.name;
    }

    /* ---------- Filtering ---------- */

    function matches(d) {
      const q = name.value.trim().toLowerCase();
      const products = Array.isArray(d.products) ? d.products : [];
      return (!province.value || d.province === province.value) &&
             (!city.value || d.city === city.value) &&
             (!area.value || d.area === area.value) &&
             (!product.value || products.indexOf(product.value) !== -1) &&
             (!q || String(d.name || '').toLowerCase().indexOf(q) !== -1);
    }

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

    /* ---------- Render ---------- */

    function render() {
      syncUrl();
      renderActiveFilters();

      const rows = dealers.filter(matches);

      if (summary) {
        summary.innerHTML = dealers.length
          ? 'Showing <strong>' + rows.length + '</strong> of <strong>' + dealers.length + '</strong> listings.'
          : 'The dealer directory is ready for approved Sales data.';
      }

      if (!dealers.length) {
        grid.innerHTML =
          '<div class="dealer-empty">' +
            '<i class="fas fa-store" aria-hidden="true"></i>' +
            '<h3>Dealer &amp; Distributor Directory</h3>' +
            '<p>Dealer and distributor records will appear here once the approved Dadex Sales master is connected.</p>' +
            '<a class="btn btn-primary btn-sm" href="contact.html">Contact Dadex</a>' +
          '</div>';
        return;
      }

      if (!rows.length) {
        grid.innerHTML =
          '<div class="dealer-empty">' +
            '<i class="fas fa-magnifying-glass" aria-hidden="true"></i>' +
            '<h3>No matching listings</h3>' +
            '<p>Try a different province, city, area, product, or dealer name.</p>' +
            '<button class="btn btn-outline btn-sm" type="button" id="emptyReset">Clear filters</button>' +
          '</div>';
        const emptyReset = document.getElementById('emptyReset');
        if (emptyReset) emptyReset.addEventListener('click', clearAll);
        return;
      }

      grid.innerHTML = rows.map(d => {
        const locationParts = [d.area, d.city, d.province].filter(Boolean);
        const locationLabel = d.location || locationParts.join(', ');
        const contactName = d.contactName ? String(d.contactName).trim() : '';

        const phoneHref = d.phone ? 'tel:' + esc(String(d.phone).replace(/[^+\d]/g, '')) : '';
        const phoneLine = d.phone
          ? '<a href="' + phoneHref + '" class="dealer-contact"><i class="fas fa-phone" aria-hidden="true"></i>' + esc(d.phone) + '</a>'
          : '';

        const emailLine = d.email
          ? '<a href="mailto:' + esc(d.email) + '" class="dealer-contact"><i class="fas fa-envelope" aria-hidden="true"></i>' + esc(d.email) + '</a>'
          : '';

        const tags = (Array.isArray(d.products) && d.products.length)
          ? '<div class="dealer-tags">' + d.products.map(x => '<span>' + esc(x) + '</span>').join('') + '</div>'
          : '';

        const contextLink = product.value
          ? '<a class="dealer-context-link" href="products.html?q=' + encodeURIComponent(product.value) + '">View ' + esc(product.value) + ' <i class="fas fa-arrow-right" aria-hidden="true"></i></a>'
          : '';

        const mapLink = d.mapUrl
          ? '<a class="dealer-map" href="' + esc(d.mapUrl) + '" target="_blank" rel="noopener">View location <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>'
          : '';

        return '<article class="dealer-card">' +
          '<div class="dealer-card-top">' +
            '<span class="dealer-type">' + esc(d.type || 'Dealer') + '</span>' +
            '<i class="fas fa-store" aria-hidden="true"></i>' +
          '</div>' +
          '<h3>' + esc(d.name) + '</h3>' +
          (contactName ? '<p class="dealer-contact-name">' + esc(contactName) + '</p>' : '') +
          (locationLabel ? '<p class="dealer-location"><i class="fas fa-location-dot" aria-hidden="true"></i><span>' + esc(locationLabel) + '</span></p>' : '') +
          (d.address ? '<p class="dealer-address">' + esc(d.address) + '</p>' : '') +
          phoneLine +
          emailLine +
          tags +
          contextLink +
          mapLink +
        '</article>';
      }).join('');
    }

    /* ---------- Event binding ---------- */

    /* Name search debounced — one rebuild per keystroke burst. */
    const renderDebounced = debounce(render, 120);

    if (province) {
      province.addEventListener('change', function () {
        refreshCities(); city.value = '';
        refreshAreas(); area.value = '';
        refreshProducts(); product.value = '';
        render();
      });
    }
    if (city) {
      city.addEventListener('change', function () {
        refreshAreas(); area.value = '';
        refreshProducts(); product.value = '';
        render();
      });
    }
    if (area) {
      area.addEventListener('change', function () {
        refreshProducts(); product.value = '';
        render();
      });
    }
    if (product) product.addEventListener('change', render);
    if (name) name.addEventListener('input', renderDebounced);
    if (reset) reset.addEventListener('click', clearAll);

    initFilters();
    render();
  }

  document.addEventListener('DOMContentLoaded', initDealerLocator);
})();
