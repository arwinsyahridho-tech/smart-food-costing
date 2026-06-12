const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  "modules/cost-management/rawmaterial.html",
  "utf8",
);

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
    deleteFunction.indexOf("confirm("),
  "pengecekan referensi harus terjadi sebelum konfirmasi delete",
);
assert.match(deleteFunction, /persistRawMaterials\("delete", item\)/);
assert.doesNotMatch(deleteFunction, /preparation_items.*delete/);
assert.doesNotMatch(deleteFunction, /menu_items.*delete/);
assert.match(deleteFunction, /rawMaterials\.splice\(index, 1\); render\(\);/);

console.log("Invariant filter, sorting, pagination, dan alur delete lulus.");
