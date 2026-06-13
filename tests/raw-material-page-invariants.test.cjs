const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  "modules/cost-management/rawmaterial.html",
  "utf8",
);

assert.match(source, /class="material-form"/);
assert.doesNotMatch(source, /Raw Material Master/);
assert.doesNotMatch(source, /class="section form-hero"/);
assert.doesNotMatch(source, /class="hero-icon"/);
assert.match(source, /class="action-section" aria-label="Aksi form Raw Material"/);

const materialForm = source.indexOf('class="material-form"');
const identitySection = source.indexOf('class="section form-section identity-section"');
const purchaseSection = source.indexOf('class="section form-section purchase-section"');
const conversionSection = source.indexOf('class="section form-section conversion-section"');
const summarySection = source.indexOf('class="section form-section summary-section"');
const actionSection = source.indexOf('class="action-section"');
const listSection = source.indexOf('class="section list-section"');
assert.ok(
  materialForm < identitySection &&
    identitySection < purchaseSection &&
    purchaseSection < conversionSection &&
    conversionSection < summarySection &&
    summarySection < actionSection &&
    actionSection < listSection,
  "struktur halaman harus langsung dari card utama ke tiga section lanjutan, aksi, lalu list",
);
assert.doesNotMatch(source, /<header class="page-intro">/);
assert.doesNotMatch(source, />Cost Management</);
assert.match(source, /class="section form-section identity-section" aria-labelledby="rawMaterialFormTitle"/);
assert.match(source, /<h1 class="sectionTitle" id="rawMaterialFormTitle">Raw Material<\/h1>/);
assert.match(source, /Kelola bahan baku, pembelian, konversi, dan biaya dasar\.<\/p>/);
assert.match(source, /<h2 class="identity-subheading">Identitas Bahan<\/h2>/);

const categoryField = source.match(
  /<div class="field"><label for="kategoriInput">Kategori<\/label><select id="kategoriInput"><\/select><button class="category-manage-btn" id="manageCategoryBtn" type="button">Kelola Kategori<\/button><\/div>/,
);
assert.ok(categoryField, "kategori harus berurutan dari label, dropdown, lalu tombol kelola");
assert.match(source, /<label for="buyUnitInput">Satuan Beli<\/label>/);
assert.match(source, /<label for="conversionInput">Jumlah Konversi<\/label>/);
assert.doesNotMatch(source, />Category<\/label>/);
assert.doesNotMatch(source, />Buy Unit<\/label>/);
assert.doesNotMatch(source, />Conversion Qty<\/label>/);
assert.match(source, /\.category-manage-btn \{[^}]*align-self: flex-start;[^}]*min-height: 42px;/s);
assert.match(source, /class="section form-section identity-section"/);
assert.match(source, /class="section form-section purchase-section"/);
assert.match(source, /class="section form-section conversion-section"/);
assert.match(source, /class="section form-section summary-section"/);
assert.match(source, /id="summaryUnitCost"/);
assert.match(source, /id="summaryConversion"/);
assert.match(source, /id="summaryWaste"/);
assert.match(source, /id="summaryStatus"/);
assert.match(source, /id="resetBtn"/);
assert.match(source, /id="rawMaterialListTitle"/);
assert.match(source, /@media \(max-width: 390px\)/);
assert.match(source, /@media \(max-width: 340px\) \{\s*\.summary-grid \{ grid-template-columns: 1fr; \}/s);
assert.match(source, /@media \(max-width: 700px\)[\s\S]*?\.summary-grid \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\);/);
assert.match(source, /class="summary-grid" aria-label="Ringkasan biaya dan status bahan"/);
assert.match(source, /class="summary-value summary-status-value" id="summaryStatus"/);
assert.match(source, /overflow-x: hidden/);
assert.match(source, /--font-page-title-desktop: 28px;/);
assert.match(source, /--font-page-title-mobile: 23px;/);
assert.match(source, /--font-section-title-desktop: 24px;/);
assert.match(source, /--font-section-title-mobile: 20px;/);
assert.match(source, /--font-description-desktop: 14px;/);
assert.match(source, /--font-description-mobile: 13px;/);
assert.match(source, /--font-label: 14px;/);
assert.match(source, /--font-input-desktop: 16px;/);
assert.match(source, /--font-input-mobile: 14px;/);
assert.match(source, /--font-button-primary: 16px;/);
assert.match(source, /--font-button-secondary: 14px;/);
assert.match(source, /h1\.sectionTitle \{ font-size: var\(--font-page-title-desktop\); \}/);
assert.match(source, /h1\.sectionTitle \{ font-size: var\(--font-page-title-mobile\); \}/);
assert.match(source, /\.mobile-logo \{[^}]*font-size: 18px;[^}]*letter-spacing: \.4px;[^}]*line-height: 1\.2;/s);
assert.match(source, /\.mobile-logo small \{[^}]*font-size: 10px;[^}]*letter-spacing: \.9px;/s);
assert.match(source, /\.material-form \{ display: grid; grid-template-columns: repeat\(12,minmax\(0,1fr\)\); gap: 18px; \}/);
assert.match(source, /@media \(max-width: 1180px\) \{[^}]*\.form-section \{ grid-column: 1 \/ -1; \}/s);
assert.match(source, /@media \(max-width: 700px\) \{[\s\S]*?\.material-form \{ display: flex; flex-direction: column; gap: 12px; \}/);
assert.match(source, /\.form-section, \.list-section \{ padding: 16px 14px; border-radius: 21px; \}/);
assert.match(source, /input, select \{ min-height: 52px; padding: 0 14px; font-size: var\(--font-input-mobile\); \}/);
assert.match(source, /\.category-manage-btn \{ width: auto; min-height: 42px; \}/);
assert.match(source, /function updateFormSummary/);
assert.match(source, /status: el\.status\.value \|\| "ACTIVE"/);
assert.match(source, /el\.resetBtn\.addEventListener\("click", clearForm\)/);
assert.doesNotMatch(source, /supabase\/migrations\//);

assert.match(source, /const RAW_MATERIAL_PAGE_SIZE = 10;/);
assert.match(source, /const sorted = \[\.\.\.filtered\]\.sort/);
assert.ok(
  source.indexOf("const sorted = [...filtered].sort") <
    source.indexOf("const pageItems = sorted.slice"),
  "sorting A–Z harus tetap dilakukan sebelum pagination",
);
assert.match(source, /activeCategory = button\.dataset\.category;/);
assert.match(
  source,
  /const keyword = el\.search\.value\.trim\(\)\.toLowerCase\(\);/,
);

const deleteStart = source.indexOf("async function deleteItem(index)");
const deleteEnd = source.indexOf(
  'el.harga.addEventListener("input"',
  deleteStart,
);
const deleteFunction = source.slice(deleteStart, deleteEnd);
assert.ok(deleteStart >= 0 && deleteEnd > deleteStart);
assert.ok(
  deleteFunction.indexOf("checkReferences") <
    deleteFunction.indexOf('confirm("Hapus data bahan ini?")'),
  "pengecekan referensi harus terjadi sebelum konfirmasi delete",
);
assert.match(deleteFunction, /persistRawMaterials\("delete", item\)/);
assert.doesNotMatch(deleteFunction, /\.from\("preparation_items"\)/);
assert.doesNotMatch(deleteFunction, /\.from\("menu_items"\)/);
assert.match(
  deleteFunction,
  /Bahan baku tidak dapat dihapus karena masih digunakan pada resep Preparation atau Menu\./,
);
assert.match(
  deleteFunction,
  /Pengecekan penggunaan bahan baku gagal atau Supabase tidak dapat diakses\. Penghapusan dibatalkan\./,
);
assert.match(deleteFunction, /rawMaterials\.splice\(index, 1\); render\(\);/);

console.log("Invariant filter, sorting, pagination, dan alur delete lulus.");
