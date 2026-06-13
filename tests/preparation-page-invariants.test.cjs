const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  "modules/cost-management/preparation.html",
  "utf8",
);

assert.match(source, /class="ingredients-panel"/);
assert.match(source, /id="ingredientCount"/);
assert.match(source, /id="summaryCostPerUnit"/);
assert.match(source, /:is\(#ingredientTable, #editIngredientTable\) thead \{ display: none; \}/);
assert.match(source, /grid-template-areas: "material material material action" "qty unit total total"/);
assert.doesNotMatch(source, /"qty unit unit" "total total total"/);
assert.match(source, /class="item active"><svg class="biya-icon"[^>]*><use href="#biya-icon-flask-conical"><\/use><\/svg><span>Preparation<\/span>/);
assert.match(source, /class="logo">BIYA<small>BUSINESS IN YOUR HAND<\/small>/);
assert.match(source, /@media \(max-width: 390px\)/);
assert.match(source, /overflow-x: hidden/);
assert.match(source, /function addRow\([\s\S]*aria-label="Hapus bahan"/);
assert.match(source, /function updateSummary\([\s\S]*ingredientCount\.innerText/);
assert.match(source, /function updateSummary\([\s\S]*summaryCostPerUnit\.innerText/);
assert.match(source, /function savePreparation/);
assert.match(source, /id="editPreparationModal"/);
assert.match(source, /id="editTableBody"/);
assert.match(source, /id="updatePreparationBtn"[\s\S]*Update Preparation/);
assert.match(source, /let editingPrepId = null/);
assert.match(source, /function editPreparation\(id\)\{ openEditPreparationModal\(id\); \}/);
assert.match(source, /function openEditPreparationModal/);
assert.match(source, /async function saveEditPreparation/);
assert.match(source, /function addEditIngredientRow/);
assert.match(source, /function updateEditSummary/);
assert.match(source, /from\("preparations"\)\.update\(prepPayload\)/);
assert.match(source, /await deletePreparationItems\(savedRow.id\)/);
assert.match(source, /await savePreparationItems\(savedRow.id, ingredients\)/);
assert.doesNotMatch(source, /let editingId = null/);
assert.doesNotMatch(source, /hidePreparationListSection/);
assert.doesNotMatch(source, /window\.scrollTo\(\{ top:0/);
assert.doesNotMatch(source, /formTitle\.textContent = "Edit Preparation"/);
assert.match(source, /async function deletePreparation/);
assert.match(source, /async function loadPreparations/);
assert.match(source, /id="prepListSection"/);
assert.match(source, /id="prepFormSection"/);
assert.match(source, /id="selectedPreparationSection"/);
assert.match(source, /let selectedPrepId = null/);
assert.match(source, /function setPreparationDetailMode/);
assert.match(source, /function selectPreparation/);
assert.match(source, /function renderSelectedPreparation/);
assert.match(source, /function backToPreparationList/);
assert.match(source, /← Kembali/);
assert.match(source, /Detail Recipe \/ Bahan Preparation/);
assert.match(source, /class="selected-recipe-item"/);
assert.match(source, /\.selected-recipe-grid \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(source, /\.selected-recipe-field\.total \{ grid-column: 1 \/ -1;/);
assert.match(source, /\.selected-recipe-field\.total \.selected-recipe-value \{ color: #65e6a5;/);
assert.match(source, /openEditPreparationModal\('\$\{escapeHtml\(String\(prep\.id\)\)\}'\)/);
assert.match(source, /prepFormSection\.classList\.toggle\("hidden", preparationDetailOpen\)/);
assert.match(source, /prepListSection\.classList\.toggle\("hidden", preparationDetailOpen\)/);
assert.doesNotMatch(source, /let expandedPrepId = null/);
assert.doesNotMatch(source, /supabase\/migrations/);

console.log("Invariant redesign dan fungsi Preparation lulus.");
