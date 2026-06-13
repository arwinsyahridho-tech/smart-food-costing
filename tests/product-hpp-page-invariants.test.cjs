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
assert.match(source, /el\.summarySection\.classList\.toggle\("hidden", open\)/);
assert.match(source, /el\.productFilterSection\.classList\.toggle\("hidden", open\)/);
assert.match(source, /el\.productListSection\.classList\.toggle\("hidden", open\)/);
assert.match(source, /el\.selectedProduct\.classList\.toggle\("hidden", !open\)/);
assert.match(source, />← Kembali<\/button>/);
assert.doesNotMatch(source, /← Kembali ke Daftar Produk/);
assert.doesNotMatch(source, /\.back-btn\{width:100%/);
assert.match(source, /@media\(max-width:700px\)/);
assert.match(source, /\.recipe-table-wrap\{display:none}/);
assert.match(source, /\.recipe-mobile-list\{display:grid;gap:10px}/);
assert.match(source, /\.recipe-mobile-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.doesNotMatch(source, /\.recipe-mobile-grid\{grid-template-columns:1fr}/);
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

function extractFunction(name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(match, `Fungsi ${name} harus tersedia untuk pengujian perilaku`);
  return match[0];
}

function createToggleElement() {
  const classes = new Set();
  return {
    classList: {
      contains: (name) => classes.has(name),
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
    },
  };
}

const detailElements = {
  summarySection: createToggleElement(),
  productFilterSection: createToggleElement(),
  productListSection: createToggleElement(),
  selectedProduct: createToggleElement(),
};
const runSetDetailMode = new Function(
  "el",
  "open",
  `let detailOpen = false; ${extractFunction("setDetailMode")}; setDetailMode(open); return detailOpen;`,
);
assert.equal(runSetDetailMode(detailElements, true), true);
assert.equal(detailElements.summarySection.classList.contains("hidden"), true);
assert.equal(detailElements.productFilterSection.classList.contains("hidden"), true);
assert.equal(detailElements.productListSection.classList.contains("hidden"), true);
assert.equal(detailElements.selectedProduct.classList.contains("hidden"), false);
assert.equal(runSetDetailMode(detailElements, false), false);
assert.equal(detailElements.summarySection.classList.contains("hidden"), false);
assert.equal(detailElements.productFilterSection.classList.contains("hidden"), false);
assert.equal(detailElements.productListSection.classList.contains("hidden"), false);
assert.equal(detailElements.selectedProduct.classList.contains("hidden"), true);

const runNavigationFunctions = new Function(
  "action",
  `
    let selectedMenuId = "menu-awal";
    let detailMode = null;
    let rendered = "";
    let scrolledTo = null;
    const el = {
      searchProduct: { value: "query" },
      menuSelect: { value: "menu-awal" },
      selectedProduct: { innerHTML: "detail" },
      productListSection: { id: "product-list" }
    };
    function setDetailMode(open) { detailMode = open; }
    function renderSelectedProduct() { rendered = "detail"; }
    function renderProductList() { rendered = "list"; }
    function scrollToSection(section) { scrolledTo = section; }
    ${extractFunction("selectMenu")}
    ${extractFunction("backToProductList")}
    if (action === "select") selectMenu("menu-baru");
    else backToProductList();
    return { selectedMenuId, detailMode, rendered, scrolledTo, el };
  `,
);
const selectedState = runNavigationFunctions("select");
assert.equal(selectedState.selectedMenuId, "menu-baru");
assert.equal(selectedState.rendered, "detail");
assert.equal(selectedState.el.searchProduct.value, "");
assert.equal(selectedState.el.menuSelect.value, "");
const listState = runNavigationFunctions("back");
assert.equal(listState.selectedMenuId, "");
assert.equal(listState.detailMode, false);
assert.equal(listState.rendered, "list");
assert.equal(listState.el.selectedProduct.innerHTML, "");
assert.equal(listState.scrolledTo, listState.el.productListSection);

const inlineScripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .filter((script) => script.trim());
assert.ok(inlineScripts.length > 0, "Script inline Product HPP harus tersedia");
inlineScripts.forEach((script) => {
  assert.doesNotThrow(() => new Function(script));
});

console.log("Invariant redesign dan fungsi Product HPP lulus.");
