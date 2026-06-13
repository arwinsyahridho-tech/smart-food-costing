const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  "modules/cost-management/producthpp.html",
  "utf8",
);

assert.match(source, /class="section" id="productFilterSection"/);
assert.match(source, /class="hero"/);
assert.match(source, /Analisis HPP, food cost, margin, dan rekomendasi harga jual\./);
assert.match(source, />Total Produk</);
assert.match(source, />Rata-rata Food Cost</);
assert.match(source, />Rata-rata Gross Margin</);
assert.match(source, />Produk Terbaik</);
assert.match(source, />Cari Produk</);
assert.match(source, />Kategori</);
assert.match(source, />Sub Kategori</);
assert.match(source, /Semua Kategori/);
assert.match(source, /Semua Sub Kategori/);
assert.match(source, /class="product-list" id="productList"/);
assert.match(source, /class="list-metrics"/);
assert.match(source, /class="section selected-section hidden" id="selectedProduct"/);
assert.match(source, /class="recipe-mobile-item"/);
assert.match(source, /class="recipe-mobile-grid"/);
assert.match(source, /class="recipe-mobile-field total"/);
assert.match(source, /@media\(max-width:700px\)/);
assert.match(source, /\.recipe-table-wrap\{display:none}/);
assert.match(source, /\.recipe-mobile-list\{display:grid;gap:10px}/);
assert.match(source, /overflow-x:hidden/);
assert.match(source, /function scrollToSection\(section\)/);
assert.match(source, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
assert.doesNotMatch(source, /window\.scrollTo/);
assert.doesNotMatch(source, /All Category|All Sub Category|Search Produk/);
assert.match(source, /function normalizeMenu\(/);
assert.match(source, /function normalizeMenuItem\(/);
assert.match(source, /function updateSummaryCards\(/);
assert.match(source, /function filteredMenus\(/);
assert.match(source, /function renderSelectedProduct\(/);
assert.match(source, /function renderRecipeDetail\(/);
assert.match(source, /function renderProductList\(/);
assert.match(source, /function selectMenu\(/);
assert.match(source, /function backToProductList\(/);
assert.match(source, /async function loadMenusFromSupabase\(/);
assert.match(source, /async function loadCostSettings\(/);
assert.match(source, /supabaseClient\.from\("menus"\)/);
assert.match(source, /supabaseClient\.from\("menu_items"\)/);

const inlineScripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .filter((script) => script.trim());
assert.ok(inlineScripts.length > 0, "Script inline Product HPP harus tersedia");
inlineScripts.forEach((script) => {
  assert.doesNotThrow(() => new Function(script));
});

console.log("Invariant redesign dan fungsi Product HPP lulus.");
