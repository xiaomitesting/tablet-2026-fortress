/**
 * 問答數據收集模組
 * localStorage 緩存 + 飛書 Bitable 同步
 */
const QuizData = (() => {
  const STORAGE_KEY = 'mimi_quiz_responses';
  const BITABLE_CONFIG = {
    baseToken: 'XenmbYueGa1lP4sMiEhcTU0YnOg',
    tableId: 'tbl4X2EDh1wYYvrL'
  };

  // --- localStorage 操作 ---

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  }

  function save(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function generateId() {
    return 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * 保存一次問答結果
   * @param {Object} answers - { scenario: [...], budget, size, priority, accessory }
   * @param {Array} results - [{ product: { id, name }, score }]
   * @returns {Object} 創建的記錄
   */
  function saveResponse(answers, results) {
    const records = getAll();
    const topResult = results[0] || {};
    const record = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      answers: JSON.parse(JSON.stringify(answers)),
      results: results.map(r => ({ productId: r.product.id, productName: r.product.name, score: r.score })),
      topProduct: topResult.product ? topResult.product.name : '',
      topScore: topResult.score || 0,
      synced: false,
      deviceInfo: navigator.userAgent.slice(0, 120)
    };
    records.push(record);
    save(records);
    return record;
  }

  /**
   * 獲取未同步的記錄
   */
  function getUnsynced() {
    return getAll().filter(r => !r.synced);
  }

  /**
   * 獲取已同步的記錄
   */
  function getSynced() {
    return getAll().filter(r => r.synced);
  }

  /**
   * 標記指定記錄為已同步
   * @param {string[]} ids - 記錄 ID 陣列
   */
  function markSynced(ids) {
    const records = getAll();
    const idSet = new Set(ids);
    records.forEach(r => {
      if (idSet.has(r.id)) r.synced = true;
    });
    save(records);
  }

  /**
   * 匯出全部數據為 JSON 字串
   */
  function exportJSON() {
    return JSON.stringify(getAll(), null, 2);
  }

  /**
   * 觸發下載 JSON 檔案
   */
  function downloadJSON() {
    const data = exportJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mimi_quiz_data_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 匯出未同步數據為 JSON
   */
  function exportUnsyncedJSON() {
    return JSON.stringify(getUnsynced(), null, 2);
  }

  // --- 本地統計 ---

  function getStats() {
    const records = getAll();
    if (records.length === 0) {
      return { total: 0, synced: 0, unsynced: 0, scenarios: {}, budgets: {}, sizes: {}, priorities: {}, accessories: {}, topProducts: {} };
    }

    const stats = {
      total: records.length,
      synced: records.filter(r => r.synced).length,
      unsynced: records.filter(r => !r.synced).length,
      scenarios: {},
      budgets: {},
      sizes: {},
      priorities: {},
      accessories: {},
      topProducts: {}
    };

    const scenarioLabels = {
      productivity: '辦公/學習', gaming: '遊戲電競', media: '影音娛樂',
      creative: '創意設計', reading: '閱讀', portable: '便攜出行',
      kids: '兒童教育', outdoor: '戶外辦公'
    };
    const budgetLabels = { low: '入門級', mid: '主流級', premium: '旗艦級' };
    const sizeLabels = { compact: '小屏', standard: '標準', large: '大屏' };
    const priorityLabels = {
      performance: '性能', battery: '續航', display: '屏幕',
      price: '性價比', portable: '便攜', stylus: '手寫筆'
    };
    const accessoryLabels = { none: '不需要', stylus: '手寫筆', keyboard: '鍵盤', both: '都要' };

    records.forEach(r => {
      // 場景（多選）
      const scenarios = Array.isArray(r.answers.scenario) ? r.answers.scenario : [r.answers.scenario];
      scenarios.forEach(s => {
        const label = scenarioLabels[s] || s;
        stats.scenarios[label] = (stats.scenarios[label] || 0) + 1;
      });
      // 預算
      if (r.answers.budget) {
        const label = budgetLabels[r.answers.budget] || r.answers.budget;
        stats.budgets[label] = (stats.budgets[label] || 0) + 1;
      }
      // 尺寸
      if (r.answers.size) {
        const label = sizeLabels[r.answers.size] || r.answers.size;
        stats.sizes[label] = (stats.sizes[label] || 0) + 1;
      }
      // 優先級
      if (r.answers.priority) {
        const label = priorityLabels[r.answers.priority] || r.answers.priority;
        stats.priorities[label] = (stats.priorities[label] || 0) + 1;
      }
      // 配件
      if (r.answers.accessory) {
        const label = accessoryLabels[r.answers.accessory] || r.answers.accessory;
        stats.accessories[label] = (stats.accessories[label] || 0) + 1;
      }
      // 推薦產品
      if (r.topProduct) {
        stats.topProducts[r.topProduct] = (stats.topProducts[r.topProduct] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * 獲取 Bitable 配置（供同步模組使用）
   */
  function getBitableConfig() {
    return BITABLE_CONFIG;
  }

  // --- 飛書 Bitable 同步 ---

  // Worker URL：部署 Cloudflare Worker 後填入
  let SYNC_WORKER_URL = '';

  function setSyncWorkerUrl(url) {
    SYNC_WORKER_URL = url;
  }

  function getSyncWorkerUrl() {
    return SYNC_WORKER_URL;
  }

  /**
   * 同步未上傳的記錄到飛書 Bitable
   * @returns {Promise<{success: boolean, count: number, error?: string}>}
   */
  async function syncToFeishu() {
    const unsynced = getUnsynced();
    console.log(`🔍 未同步記錄數: ${unsynced.length}, Worker URL: ${SYNC_WORKER_URL || '未設置'}`);
    if (unsynced.length === 0) {
      return { success: true, count: 0, message: '沒有需要同步的記錄' };
    }
    if (!SYNC_WORKER_URL) {
      console.error('❌ SYNC_WORKER_URL 未配置');
      return { success: false, count: 0, error: 'Worker URL 未配置' };
    }

    try {
      console.log(`📡 正在同步 ${unsynced.length} 條記錄到 ${SYNC_WORKER_URL}`);
      const resp = await fetch(SYNC_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: unsynced }),
      });

      console.log(`📡 Worker 回應: HTTP ${resp.status}`);
      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`❌ Worker 錯誤: ${resp.status}`, errText);
        return { success: false, count: 0, error: `HTTP ${resp.status}: ${errText}` };
      }

      const result = await resp.json();
      console.log('📡 Worker 結果:', JSON.stringify(result));
      if (result.success) {
        markSynced(unsynced.map(r => r.id));
        console.log(`✅ 已標記 ${unsynced.length} 條為已同步`);
        return { success: true, count: unsynced.length };
      } else {
        console.error('❌ Worker 返回失敗:', result.error);
        return { success: false, count: 0, error: result.error || '同步失敗' };
      }
    } catch (err) {
      console.error('❌ 同步異常:', err.message, err);
      return { success: false, count: 0, error: err.message };
    }
  }

  return {
    saveResponse, getUnsynced, getSynced, markSynced,
    exportJSON, downloadJSON, exportUnsyncedJSON, getStats, getBitableConfig, getAll,
    syncToFeishu, setSyncWorkerUrl, getSyncWorkerUrl
  };
})();
