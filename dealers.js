/* ============================================================
   DADEX DEALER & DISTRIBUTOR DIRECTORY
   Page-scoped module. Loaded only from dealers.html.
   Depends on: dealers-data.js (window.DADEX_DEALERS)
   ============================================================ */

(function () {
  'use strict';

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c];
    });
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)))
      .sort(function (a, b) { return String(a).localeCompare(String(b)); });
  }

  function initDealerLocator() {
    var grid = document.getElementById('dealerGrid');
    if (!grid) return;

    var province = document.getElementById('provinceFilter');
    var city = document.getElementById('cityFilter');
    var area = document.getElementById('areaFilter');
    var product = document.getElementById('productFilter');
    var name = document.getElementById('nameSearch');
    var reset = document.getElementById('resetFilters');
    var summary = document.getElementById('resultsSummary');
    var activeSummary = document.getElementById('activeFilterSummary');

    var all = Array.isArray(window.DADEX_DEALERS) ? window.DADEX_DEALERS : [];
    var dealers = all.filter(function (d) { return d && d.active !== false; });

    var params = new URLSearchParams(window.location.search);
    var initial = {
      province: params.get('province') || '',
      city: params.get('city') || '',
      area: params.get('area') || '',
      product: params.get('product') || '',
      name: params.get('name') || ''
    };

    function fill(select, values, placeholder) {
      if (!select) return;
      var current = select.value;
      select.innerHTML = '<option value="">' + placeholder + '</option>'
        + values.map(function (v) {
            return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
          }).join('');
      if (values.indexOf(current) !== -1) select.value = current;
    }

    function refreshCities() {
      fill(
        city,
        unique(dealers
          .filter(function (d) { return !province.value || d.province === province.value; })
          .map(function (d) { return d.city; })),
        'All Cities'
      );
    }

    function refreshAreas() {
      fill(
        area,
        unique(dealers
          .filter(function (d) {
            return (!province.value || d.province === province.value) &&
                   (!city.value || d.city === city.value);
          })
          .map(function (d) { return d.area; })),
        'All Areas'
      );
    }

    function refreshProducts() {
      var scoped = dealers.filter(function (d) {
        return (!province.value || d.province === province.value) &&
               (!city.value || d.city === city.value) &&
               (!area.value || d.area === area.value);
      });
      fill(
        product,
        unique(scoped.reduce(function (acc, d) {
          if (Array.isArray(d.products)) acc = acc.concat(d.products);
          return acc;
        }, [])),
        'All Products'
      );
    }

    function syncUrl() {
      var next = new URLSearchParams();
      if (province.value) next.set('province', province.value);
      if (city.value) next.set('city', city.value);
      if (area.value) next.set('area', area.value);
      if (product.value) next.set('product', product.value);
      if (name.value.trim()) next.set('name', name.value.trim());
      var query = next.toString();
      history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
    }

    function renderActiveFilters() {
      if (!activeSummary) return;
      var items = [
        ['Province', province.value],
        ['City', city.value],
        ['Area', area.value],
        ['Product', product.value],
        ['Dealer', name.value.trim()]
      ].filter(function (pair) { return pair[1]; });

      activeSummary.innerHTML = items
        .map(function (pair) {
          return '<span class="active-filter"><strong>' + esc(pair[0]) + ':</strong> ' + esc(pair[1]) + '</span>';
        })
        .join('');
      activeSummary.hidden = items.length === 0;
    }

    function initFilters() {
      fill(province, unique(dealers.map(function (d) { return d.province; })), 'All Provinces / Regions');
      province.value = initial.province;
      refreshCities();
      city.value = initial.city;
      refreshAreas();
      area.value = initial.area;
      refreshProducts();
      product.value = initial.product;
      name.value = initial.name;
    }

    function matches(d) {
      var q = name.value.trim().toLowerCase();
      var products = Array.isArray(d.products) ? d.products : [];
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

    function render() {
      syncUrl();
      renderActiveFilters();

      var rows = dealers.filter(matches);

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
        var emptyReset = document.getElementById('emptyReset');
        if (emptyReset) emptyReset.addEventListener('click', clearAll);
        return;
      }

      grid.innerHTML = rows.map(function (d) {
        var locationParts = [d.area, d.city, d.province].filter(Boolean);
        var locationLabel = d.location || locationParts.join(', ');
        var contactName = d.contactName ? String(d.contactName).trim() : '';

        var phoneHref = d.phone ? 'tel:' + esc(String(d.phone).replace(/[^+\d]/g, '')) : '';
        var phoneLine = d.phone
          ? '<a href="' + phoneHref + '" class="dealer-contact"><i class="fas fa-phone" aria-hidden="true"></i>' + esc(d.phone) + '</a>'
          : '';

        var emailLine = d.email
          ? '<a href="mailto:' + esc(d.email) + '" class="dealer-contact"><i class="fas fa-envelope" aria-hidden="true"></i>' + esc(d.email) + '</a>'
          : '';

        var tags = (Array.isArray(d.products) && d.products.length)
          ? '<div class="dealer-tags">' + d.products.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>'
          : '';

        var contextLink = product.value
          ? '<a class="dealer-context-link" href="products.html?q=' + encodeURIComponent(product.value) + '">View ' + esc(product.value) + ' <i class="fas fa-arrow-right" aria-hidden="true"></i></a>'
          : '';

        var mapLink = d.mapUrl
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
    if (name) name.addEventListener('input', render);
    if (reset) reset.addEventListener('click', clearAll);

    initFilters();
    render();
  }

  document.addEventListener('DOMContentLoaded', initDealerLocator);
})();
