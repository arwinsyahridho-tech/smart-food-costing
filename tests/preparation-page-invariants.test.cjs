const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  "modules/cost-management/preparation.html",
  "utf8",
);

assert.match(source, /class="ingredients-panel"/);
assert.match(source, /id="ingredientCount"/);
assert.match(source, /id="summaryCostPerUnit"/);
assert.match(source, /#ingredientTable thead \{ display: none; \}/);
assert.match(source, /grid-template-areas: "material material material action" "qty unit total total"/);
assert.doesNotMatch(source, /grid-template-areas: "material material action" "qty unit unit" "total total total"/);
assert.match(source, /\.sidebar \{[^}]*background: #102766;/);
assert.match(source, /\.item\.active \{[^}]*background: #2563eb;/);
assert.match(source, /<div class="logo">BIYA<small>BUSINESS IN YOUR HAND<\/small><\/div>/);
assert.match(source, /class="item active"><svg class="biya-icon"/);
assert.match(source, /@media \(max-width: 390px\)/);
assert.match(source, /overflow-x: hidden/);
assert.match(source, /function addRow\([\s\S]*aria-label="Hapus bahan"/);
assert.match(source, /function updateSummary\([\s\S]*ingredientCount\.innerText/);
assert.match(source, /function updateSummary\([\s\S]*summaryCostPerUnit\.innerText/);
assert.match(source, /function savePreparation/);
assert.match(source, /function editPreparation/);
assert.match(source, /async function deletePreparation/);
assert.match(source, /async function loadPreparations/);
assert.match(source, /id="prepListSection"/);
assert.doesNotMatch(source, /supabase\/migrations/);

console.log("Invariant redesign dan fungsi Preparation lulus.");
