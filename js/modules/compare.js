/**
 * 规格对比模块 v2
 * 最多4款 + 高亮最优值 + 导出对比
 */
const Compare = (() => {
  const MAX_COMPARE = 4;
  let selected = [];

  function isSelected(productId) {
    return selected.includes(productId);
  }

  function toggle(productId) {
    const idx = selected.indexOf(productId);
    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      if (selected.length >= MAX_COMPARE) {
        alert(`最多同时对比 ${MAX_COMPARE} 款产品`);
        return;
      }
      selected.push(productId);
    }
    updateDrawer();
  }

  function remove(productId) {
    selected = selected.filter(id => id !== productId);
    updateDrawer();
  }

  function clear() {
    selected = [];
    updateDrawer();
  }

  function updateDrawer() {
    const drawer = document.getElementById('compare-drawer');
    const countEl = document.getElementById('compare-count');
    const chipsEl = document.getElementById('compare-chips');

    countEl.textContent = selected.length;

    if (selected.length > 0) {
      drawer.classList.add('show');
      chipsEl.innerHTML = selected.map(id => {
        const p = PRODUCTS.find(x => x.id === id);
        return `
          <div class="compare-chip">
            ${p.name} · HK$${p.price.toLocaleString()}
            <span class="compare-chip-remove" onclick="Compare.remove('${id}')">✕</span>
          </div>
        `;
      }).join('');
    } else {
      drawer.classList.remove('show');
    }
  }

  function openModal() {
    if (selected.length < 2) {
      alert('请至少选择 2 款产品进行对比');
      return;
    }
    renderModal();
    document.getElementById('compare-modal').classList.add('show');
  }

  function closeModal() {
    document.getElementById('compare-modal').classList.remove('show');
  }

  function renderModal() {
    const products = selected.map(id => PRODUCTS.find(p => p.id === id));
    if (products.length < 2) return;

    const specs = [
      { label: '💰 价格', key: 'price', format: v => `HK$${v.toLocaleString()}`, best: 'min' },
      { label: '📐 屏幕', key: 'sizeLabel' },
      { label: '🖥️ 面板', key: 'panel' },
      { label: '🔄 刷新率', key: 'refreshRate', format: v => `${v}Hz`, best: 'max' },
      { label: '⚡ 处理器', key: 'chip' },
      { label: '🔋 电池', key: 'battery', format: v => `${v}mAh`, best: 'max' },
      { label: '🔌 充电', key: 'charging', format: v => `${v}W`, best: 'max' },
      { label: '🧠 内存', key: 'ram', format: v => `${v}GB`, best: 'max' },
      { label: '💾 存储', key: 'storage', format: v => `${v}GB`, best: 'max' },
      { label: '🔊 扬声器', key: 'speakers', format: v => `${v}个`, best: 'max' },
      { label: '✍️ 手写笔', key: 'stylus', format: v => v ? '✅ 支持' : '❌ 不支持' },
      { label: '⌨️ 键盘', key: 'keyboard', format: v => v ? '✅ 支持' : '❌ 不支持' },
      { label: '⚖️ 重量', key: 'weight', format: v => `${v}g`, best: 'min' },
      { label: '📊 评分', key: 'rating', format: v => `⭐ ${v}`, best: 'max' },
      { label: '🏷️ 标签', key: 'tags', format: v => Array.isArray(v) ? v.join(' · ') : v },
      { label: '🎯 适合', key: 'targetUser' }
    ];

    // 找出最优值
    function getBest(spec) {
      if (!spec.best || !spec.key) return null;
      const values = products.map(p => p[spec.key]).filter(v => typeof v === 'number');
      if (values.length === 0) return null;
      return spec.best === 'max' ? Math.max(...values) : Math.min(...values);
    }

    const headers = products.map(p => `<th style="min-width:180px;text-align:center;">
      <div style="font-weight:700;font-size:15px;">${p.name}</div>
      <div style="font-size:13px;color:var(--mi-orange);font-weight:600;margin-top:4px;">HK$${p.price.toLocaleString()}</div>
    </th>`).join('');

    const rows = specs.map(spec => {
      const bestVal = getBest(spec);
      const cells = products.map(p => {
        let val = spec.key ? p[spec.key] : '';
        let display = spec.format ? spec.format(val, p) : val;
        const isBest = bestVal !== null && spec.key && p[spec.key] === bestVal;
        return `<td style="text-align:center;${isBest ? 'color:var(--mi-orange);font-weight:700;' : ''}">${display} ${isBest ? '👑' : ''}</td>`;
      }).join('');
      return `<tr><th style="text-align:left;white-space:nowrap;">${spec.label}</th>${cells}</tr>`;
    }).join('');

    document.getElementById('compare-table-headers').innerHTML = `<th style="min-width:120px;">规格</th>${headers}`;
    document.getElementById('compare-table-body').innerHTML = rows;
  }

  return { toggle, remove, clear, openModal, closeModal, updateDrawer, isSelected };
})();
