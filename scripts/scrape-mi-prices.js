#!/usr/bin/env node
/**
 * mi.com HK 價格爬蟲
 * 用法：PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers node scripts/scrape-mi-prices.js
 * 
 * 從 mi.com/hk 產品頁面抓取最新價格，輸出 JSON。
 * 可配合 cron 定期執行，或手動執行後更新 products.js。
 */
const { chromium } = require('playwright');

const PRODUCTS = [
  { id: 'pad_8_pro', name: 'Xiaomi Pad 8 Pro', url: 'https://www.mi.com/hk/product/xiaomi-pad-8-pro/' },
  { id: 'pad_8', name: 'Xiaomi Pad 8', url: 'https://www.mi.com/hk/product/xiaomi-pad-8/' },
  { id: 'pad_mini', name: 'Xiaomi Pad Mini', url: 'https://www.mi.com/hk/product/xiaomi-pad-mini/' },
  { id: 'redmi_pad_2_pro_5g', name: 'REDMI Pad 2 Pro 5G', url: 'https://www.mi.com/hk/product/redmi-pad-2-pro-5g/' },
  { id: 'redmi_pad_2_pro', name: 'REDMI Pad 2 Pro', url: 'https://www.mi.com/hk/product/redmi-pad-2-pro/' },
  { id: 'redmi_pad_2', name: 'REDMI Pad 2', url: 'https://www.mi.com/hk/product/redmi-pad-2/' },
  { id: 'pad_7_pro', name: 'Xiaomi Pad 7 Pro', url: 'https://www.mi.com/hk/product/xiaomi-pad-7-pro/' },
];

async function scrapePrices() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-HK',
  });
  const page = await context.newPage();

  const results = [];

  for (const product of PRODUCTS) {
    try {
      console.log(`⏳ 正在抓取: ${product.name}...`);
      await page.goto(product.url, { waitUntil: 'networkidle', timeout: 30000 });

      // 等待價格元素載入（mi.com 用 JS 動態渲染價格）
      // 嘗試多種選擇器
      const priceSelectors = [
        '.price-info .price',
        '.product-price .price',
        '[class*="price"] [class*="num"]',
        '.buy-price .price',
        '.sku-price .price',
        '.price-current',
        '[data-price]',
        '.price',
      ];

      let price = null;
      let skuInfo = [];

      for (const selector of priceSelectors) {
        try {
          const el = await page.$(selector);
          if (el) {
            const text = await el.textContent();
            if (text && /\d/.test(text)) {
              price = text.trim();
              console.log(`  ✅ 找到價格: ${price}`);
              break;
            }
          }
        } catch (e) { /* continue */ }
      }

      // 嘗試抓取所有 SKU 價格（不同配置）
      try {
        const skuElements = await page.$$('[class*="sku"] [class*="price"], [class*="spec"] [class*="price"], .buy-items .item');
        for (const sku of skuElements) {
          const text = await sku.textContent();
          if (text && /\d/.test(text)) {
            skuInfo.push(text.trim().replace(/\s+/g, ' '));
          }
        }
      } catch (e) { /* continue */ }

      // 如果首選選擇器沒找到，嘗試從頁面文本中提取
      if (!price) {
        try {
          const bodyText = await page.textContent('body');
          const priceMatch = bodyText.match(/HK\$\s*[\d,]+/);
          if (priceMatch) {
            price = priceMatch[0];
            console.log(`  ✅ 從頁面文本找到價格: ${price}`);
          }
        } catch (e) { /* continue */ }
      }

      // 截圖用於調試
      const screenshotPath = `/tmp/mi-screenshots/${product.id}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});

      results.push({
        id: product.id,
        name: product.name,
        url: product.url,
        price: price || '未找到',
        skuInfo: skuInfo.length > 0 ? skuInfo : undefined,
        scrapedAt: new Date().toISOString(),
      });

    } catch (err) {
      console.error(`  ❌ 抓取失敗: ${product.name} - ${err.message}`);
      results.push({
        id: product.id,
        name: product.name,
        url: product.url,
        price: '抓取失敗',
        error: err.message,
        scrapedAt: new Date().toISOString(),
      });
    }
  }

  await browser.close();
  return results;
}

async function main() {
  console.log('🦞 MIMI 價格爬蟲啟動！');
  console.log(`📅 ${new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' })}`);
  console.log('---');

  const results = await scrapePrices();

  console.log('\n📊 結果匯總:');
  console.log(JSON.stringify(results, null, 2));

  // 寫入 JSON 文件
  const fs = require('fs');
  const outputPath = './data/mi-prices.json';
  fs.mkdirSync('./data', { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 已儲存至 ${outputPath}`);
}

main().catch(console.error);
