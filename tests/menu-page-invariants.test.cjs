const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  "modules/cost-management/menu.html",
  "utf8",
);

assert.match(source, /class="section menu-page-card" id="menuFormSection"/);
assert.match(source, /Kelola menu, resep, harga jual, dan food cost\./);
assert.doesNotMatch(source, />Informasi Menu</);
assert.doesNotMatch(source, /class="menu-subsection"/);
assert.match(source, /<div class="menu-info-grid">/);
assert.match(source, />Kategori<\/label>/);
assert.match(source, />Sub Kategori<\/label>/);
assert.match(source, />Harga Jual<\/label>/);
assert.match(source, />Deskripsi<\/label>/);
assert.match(
  source,
  /<div class="category-control"><select id="menuCategory"[\s\S]*?<button class="category-manage-btn"[^>]*>Kelola Kategori<\/button><\/div>/,
);
assert.match(
  source,
  /<div class="category-control"><select id="menuSubCategory"[\s\S]*?<button class="category-manage-btn"[^>]*>Kelola Sub Kategori<\/button><\/div>/,
);
assert.match(source, /class="menu-recipe-panel"/);
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
assert.match(source, /\.category-control\{flex-direction:column}/);
assert.match(source, /\.category-manage-btn\{width:100%;min-height:50px}/);
assert.match(source, /\.add-row-btn\{width:100%!important/);
assert.match(source, /\.menu-summary\{display:grid!important/);
assert.match(source, /class="section menu-list-card" id="menuListSection"/);
assert.match(source, /id="selectedMenuDetail"/);
assert.match(source, /class="selected-recipe-list"/);
assert.match(source, /class="selected-recipe-item"/);
assert.match(source, /class="selected-recipe-number"/);
assert.match(source, /class="selected-recipe-info"/);
assert.match(source, /class="selected-recipe-total"/);
assert.match(source, /\.action-btn\{min-height:44px!important;padding:0 18px!important;/);
assert.match(source, /border-radius:12px!important;color:#fff;font-size:14px!important/);
assert.match(source, /\.edit-btn\{background:#1677ea!important/);
assert.match(source, /\.delete-btn-2\{background:var\(--menu-danger\)!important/);
assert.match(source, /id="editMenuModal"/);
assert.match(source, /class="edit-menu-dialog"/);
assert.match(source, /id="editRecipeBody"/);
assert.match(source, /async function openEditMenuModal\(id\)[\s\S]*el\.editMenuName\.value=menu\.nama/);
assert.match(source, /async function openEditMenuModal\(id\)[\s\S]*el\.editMenuModal\.classList\.add\("open"\)/);
assert.match(source, /function openEditMenu\(id\)\{return openEditMenuModal\(id\)\}/);
assert.match(source, /function closeEditMenuModal\(\)/);
assert.match(source, /async function saveEditMenu\(\)/);
assert.match(source, /function addEditRecipeRow/);
assert.match(source, /function updateEditRecipeRow/);
assert.match(source, /function updateEditRecipeName/);
assert.match(source, /function calculateEditRecipeRow/);
assert.match(source, /function deleteEditRecipeRow/);
assert.match(source, /function updateEditSummary/);
assert.match(source, /function collectEditRecipe/);
assert.doesNotMatch(source, /window\.scrollTo\(\{top:0/);
assert.doesNotMatch(source, /hideMenuListSection\(\)/);
assert.doesNotMatch(source, /el\.saveMenuBtn\.innerText="Update Menu"/);
assert.match(source, /\.edit-menu-dialog\{[^}]*width:min\(1050px,100%\);max-height:90vh/);
assert.match(source, /@media\(max-width:700px\)\{\.edit-menu-modal\{[^}]*padding:0/);
assert.match(source, /\.edit-menu-dialog\{width:100%;max-height:100dvh;height:100dvh/);
assert.match(source, /async function saveMenu\(\)[\s\S]*from\("menus"\)\.insert\(menuPayload\)/);
assert.match(source, /async function saveEditMenu\(\)[\s\S]*from\("menus"\)\.update\(menuPayload\)/);
assert.match(source, /async function saveEditMenu\(\)[\s\S]*from\("menu_items"\)\.delete\(\)\.eq\("menu_id",menuId\)/);
assert.match(source, /async function saveEditMenu\(\)[\s\S]*from\("menu_items"\)\.insert\(itemPayload\)/);
assert.match(source, /function addRecipeRow/);
assert.match(source, /function updateRecipeRow/);
assert.match(source, /function updateRecipeName/);
assert.match(source, /function calculateRecipeRow/);
assert.match(source, /function deleteRecipeRow/);
assert.match(source, /function updateSummary/);
assert.match(source, /async function saveMenu/);
assert.match(source, /async function deleteMenu\(id\)[\s\S]*const deletingSelected=/);
assert.match(source, /async function deleteMenu\(id\)[\s\S]*scrollToMenuSection\(el\.menuListSection\)/);
assert.match(source, /function handleMenuPhotoChange/);
assert.match(source, /async function uploadMenuPhotoIfNeeded/);
assert.match(source, /function setPhotoPreview/);
assert.match(source, /function renderCategoryOptions/);
assert.match(source, /function renderSubcategoryOptions/);
assert.match(source, /let menus=\[\],editMode=false,editMenuId=null,selectedMenuId=null/);
assert.doesNotMatch(source, /expandedMenuId/);
assert.match(source, /function setMenuDetailMode\(open\)/);
assert.match(source, /function selectMenu\(id\)/);
assert.match(source, /function renderSelectedMenu\(\)/);
assert.match(source, /function backToMenuList\(shouldScroll=true\)/);
assert.match(source, /function toggleMenuDetail\(id\)\{selectMenu\(id\)\}/);
assert.match(source, /function renderMenuList/);
assert.match(source, /← Kembali/);
assert.match(source, /openEditMenuModal\('\$\{escapeHtml\(menu\.id\)\}'\)/);
assert.match(source, /el\.menuFormSection\.classList\.toggle\("hidden",open\)/);
assert.match(source, /el\.menuListSection\.classList\.toggle\("hidden",open\)/);
assert.doesNotMatch(source, /menu-detail\$\{open/);
assert.match(source, /supabaseClient\.from\("menus"\)/);
assert.match(source, /supabaseClient\.from\("menu_items"\)/);
assert.match(source, /supabaseClient\.storage\.from\(MENU_PHOTO_BUCKET\)/);
assert.match(source, /body\{ overflow-x:hidden !important;/);
assert.match(source, /@media\(max-width:390px\)/);

const inlineScripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .filter((script) => script.trim());
assert.ok(inlineScripts.length > 0, "Script inline Menu harus tersedia");
inlineScripts.forEach((script) => {
  assert.doesNotThrow(() => new Function(script));
});

console.log("Invariant redesign dan fungsi Menu lulus.");
