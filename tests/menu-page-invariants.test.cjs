const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  "modules/cost-management/menu.html",
  "utf8",
);

assert.match(source, /class="section menu-page-card" id="menuFormSection"/);
assert.match(source, /Kelola menu, resep, harga jual, dan food cost\./);
assert.match(source, />Kategori<\/label>/);
assert.match(source, />Sub Kategori<\/label>/);
assert.match(source, />Harga Jual<\/label>/);
assert.match(source, />Deskripsi<\/label>/);
assert.match(source, /class="recipe-cards" id="recipeBody"/);
assert.doesNotMatch(source, /<table id="recipeTable">/);
assert.match(source, /row\.className="recipe-row"/);
assert.match(source, /recipe-field-type/);
assert.match(source, /recipe-field-ingredient/);
assert.match(source, /recipe-field-qty/);
assert.match(source, /recipe-field-unit/);
assert.match(source, /recipe-field-price/);
assert.match(source, /recipe-field-waste/);
assert.match(source, /recipe-field-total/);
assert.match(source, /aria-label="Hapus bahan"/);
assert.match(source, /@media\(max-width:700px\)/);
assert.match(source, /\.recipe-row\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(source, /\.add-row-btn\{width:100%!important/);
assert.match(source, /\.menu-summary\{display:grid!important/);
assert.match(source, /class="section menu-list-card" id="menuListSection"/);
assert.match(source, /class="recipe-detail-cards"/);
assert.match(source, /\.action-btn\{min-height:44px!important;padding:0 18px!important;border-radius:12px!important/);
assert.match(source, /\.edit-btn\{background:#1677ea!important/);
assert.match(source, /function openEditMenu\(id\)[\s\S]*el\.menuName\.value=menu\.nama/);
assert.match(source, /function openEditMenu\(id\)[\s\S]*el\.saveMenuBtn\.innerText="Update Menu"/);
assert.match(source, /function openEditMenu\(id\)[\s\S]*hideMenuListSection\(\)/);
assert.match(source, /function cancelEditMode\(\)\{resetMenuForm\(\);showMenuListSection\(\)\}/);
assert.doesNotMatch(source, /id="editMenuModal"/);
assert.match(source, /function addRecipeRow/);
assert.match(source, /function updateRecipeRow/);
assert.match(source, /function updateRecipeName/);
assert.match(source, /function calculateRecipeRow/);
assert.match(source, /function deleteRecipeRow/);
assert.match(source, /function updateSummary/);
assert.match(source, /function saveMenu/);

console.log("Invariant redesign dan fungsi Menu lulus.");
