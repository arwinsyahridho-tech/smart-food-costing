const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const dashboard = fs.readFileSync('modules/cost-management/costdashboard.html', 'utf8');

function positionOf(text) {
  const position = dashboard.indexOf(text);
  assert.notEqual(position, -1, `Markup wajib tidak ditemukan: ${text}`);
  return position;
}

test('Dashboard mengikuti hierarchy ringkasan bisnis yang diminta', () => {
  const sections = [
    'id="dashboardTitle"',
    'id="dashTotalProduct"',
    'id="businessHealthTitle"',
    'id="smartAlertTitle"',
    'id="productPerformanceTitle"',
    'id="topProfitTitle"',
    'id="categoryPerformanceTitle"',
  ];

  const positions = sections.map(positionOf);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(dashboard, /<section class="dashboard-hero"[^>]*>[\s\S]*id="dashboardTitle"[\s\S]*id="dashTotalProduct"[\s\S]*<\/section>/);
  assert.doesNotMatch(dashboard, /<div class="title">Dashboard<\/div>/);
});

test('KPI dan typography memiliki aturan mobile-first dan desktop', () => {
  assert.match(dashboard, /\.dashboard-kpi-grid\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(dashboard, /@media\(max-width:699px\)[\s\S]*\.dashboard-kpi-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(dashboard, /\.dashboard-title\{[^}]*font-size:28px[^}]*font-weight:800/);
  assert.match(dashboard, /@media\(max-width:699px\)[\s\S]*\.dashboard-title\{font-size:23px/);
  assert.match(dashboard, /\.dashboard-section-title\{[^}]*font-size:24px[^}]*font-weight:800/);
  assert.match(dashboard, /@media\(max-width:699px\)[\s\S]*\.dashboard-section-title\{font-size:20px/);
  assert.match(dashboard, /\.dashboard-kpi \.summary-value\{[^}]*font-size:27px[^}]*font-weight:800/);
});

test('Semua target render dan fungsi dashboard existing tetap tersedia', () => {
  const renderTargets = [
    'dashboardStatus', 'dashTotalProduct', 'dashAverageProfit', 'dashAverageFoodCost',
    'dashPotentialRevenue', 'healthScoreCard', 'quickAlertCard', 'bestProductCard',
    'worstProductCard', 'rankingCard', 'categoryMeta', 'categoryPerformance',
    'lowestMarginCard', 'missingDataList', 'compositionSelect', 'compositionSummary',
    'compositionBars', 'searchHealth', 'filterHealthCategory', 'healthTableBody', 'insightList',
  ];

  renderTargets.forEach((id) => assert.match(dashboard, new RegExp(`id="${id}"`)));
  [
    'loadDashboardFromSupabase', 'renderSummary', 'renderBestWorst', 'renderRankings',
    'renderSmartAlert', 'renderCategoryPerformance', 'formatRupiah', 'formatPercent',
  ].forEach((name) => assert.match(dashboard, new RegExp(`function ${name}\\(`)));
  assert.match(dashboard, /from\("menus"\)\.select\("\*"\)/);
  assert.match(dashboard, /from\("menu_items"\)\.select\("\*"\)/);
});

test('Layout mencegah overflow dan menjaga card produk/ranking responsif', () => {
  assert.match(dashboard, /body\{ overflow-x:hidden !important/);
  assert.match(dashboard, /\.dashboard-product-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(dashboard, /@media\(max-width:699px\)[\s\S]*\.dashboard-product-grid\{grid-template-columns:1fr/);
  assert.ok(dashboard.includes('.dashboard-ranking .ranking-item{grid-template-columns:34px minmax(0,1fr) minmax(100px,auto)'));
  assert.match(dashboard, /\.dashboard-legacy-render-targets\{display:none!important\}/);
});
