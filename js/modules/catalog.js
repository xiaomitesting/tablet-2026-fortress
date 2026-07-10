/**
 * 产品目录 & 筛选 v2
 * 多维筛选 + 排序 + 产品详情弹窗
 */
const Catalog = (() => {
  let currentFilter = 'all';
  let sortBy = 'price-asc';
  let viewMode = 'grid';

  function render(container) {
    let filtered = currentFilter === 'all'
      ? [...PRODUCTS]
      : PRODUCTS.filter(p => p.series === currentFilter);

    filtered = sortProducts(filtered, sortBy);

    container.innerHTML = `
      <div class="catalog-toolbar mb-4">
        <div class="flex flex-wrap items-center gap-3">
          <span style="font-size:14px;font-weight:600;color:var(--mi-gray-500);">系列：</span>
          <button onclick="Catalog.filter('all')" class="nav-tab ${currentFilter === 'all' ? 'active' : ''}" style="font-size:13px;padding:6px 14px;">全部 (${PRODUCTS.length})</button>
          <button onclick="Catalog.filter('Xiaomi')" class="nav-tab ${currentFilter === 'Xiaomi' ? 'active' : ''}" style="font-size:13px;padding:6px 14px;">Xiaomi 旗舰 (${PRODUCTS.filter(p=>p.series==='Xiaomi').length})</button>
          <button onclick="Catalog.filter('Redmi')" class="nav-tab ${currentFilter === 'Redmi' ? 'active' : ''}" style="font-size:13px;padding:6px 14px;">Redmi 性价比 (${PRODUCTS.filter(p=>p.series==='Redmi').length})</button>
        </div>
        <div class="flex items-center gap-3">
          <select onchange="Catalog.sort(this.value)" style="padding:6px 12px;border-radius:var(--radius-sm);border:1px solid var(--mi-gray-200);font-size:13px;background:white;">
            <option value="price-asc" ${sortBy === 'price-asc' ? 'selected' : ''}>价格 低→高</option>
            <option value="price-desc" ${sortBy === 'price-desc' ? 'selected' : ''}>价格 高→低</option>
            <option value="rating" ${sortBy === 'rating' ? 'selected' : ''}>评分最高</option>
            <option value="screen" ${sortBy === 'screen' ? 'selected' : ''}>屏幕最大</option>
            <option value="battery" ${sortBy === 'battery' ? 'selected' : ''}>电池最大</option>
          </select>
        </div>
      </div>
      <div class="products-grid">
        ${filtered.map(p => renderCard(p)).join('')}
      </div>
    `;
  }

  function renderCard(product) {
    const isFav = Favorites.has(product.id);
    const isCompare = Compare.isSelected ? Compare.isSelected(product.id) : false;
    return `
      <div class="product-card fade-in" data-id="${product.id}">
        <div class="product-card-image">
          <span style="font-size:64px;">📱</span>
        </div>
        <div class="product-card-body">
          <div class="product-card-series">${product.series}</div>
          <div class="product-card-name">${product.name}</div>
          <div class="product-card-tag">${product.tag}</div>
          <div style="font-size:13px;color:var(--mi-gray-500);margin-bottom:8px;line-height:1.5;">
            ${product.highlight}
          </div>
          <div class="product-card-price">
            HK$${product.price.toLocaleString()}
            <small>/起</small>
          </div>
          <div class="product-card-specs">
            <span class="product-card-spec">${product.sizeLabel}</span>
            <span class="product-card-spec">${product.panel}</span>
            <span class="product-card-spec">${product.chip.split(' ').slice(-1)[0]}</span>
            <span class="product-card-spec">${product.ram}GB+${product.storage}GB</span>
            <span class="product-card-spec">⭐${product.rating}</span>
            ${product.stylus ? '<span class="product-card-spec" style="color:#059669;">✍️手写笔</span>' : ''}
          </div>
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--mi-gray-100);">
            <div style="font-size:12px;color:var(--mi-gray-500);">
              <strong>优点：</strong>${product.pros.slice(0, 2).join(' · ')}
            </div>
            <div style="font-size:12px;color:#D97706;margin-top:4px;">
              <strong>注意：</strong>${product.cons[0]}
            </div>
          </div>
        </div>
        <div class="product-card-actions">
          <a href="${product.buyLink}" target="_blank" class="btn-primary" style="text-decoration:none;">购买 →</a>
          <button class="btn-outline" onclick="event.stopPropagation();Favorites.toggle('${product.id}')">
            ${isFav ? '❤️' : '🤍'}
          </button>
          <button class="btn-outline" onclick="event.stopPropagation();Compare.toggle('${product.id}')" style="font-size:12px;">
            ⚖️
          </button>
        </div>
      </div>
    `;
  }

  function filter(series) {
    currentFilter = series;
    render(document.getElementById('catalog-grid'));
  }

  function sort(products, key) {
    return sortProducts(products, key);
  }

  function sortProducts(products, key) {
    const sorted = [...products];
    switch (key) {
      case 'price-asc': return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc': return sorted.sort((a, b) => b.price - a.price);
      case 'rating': return sorted.sort((a, b) => b.rating - a.rating);
      case 'screen': return sorted.sort((a, b) => b.size - a.size);
      case 'battery': return sorted.sort((a, b) => b.battery - a.battery);
      default: return sorted;
    }
  }

  return { render, filter, sort, renderCard };
})();
