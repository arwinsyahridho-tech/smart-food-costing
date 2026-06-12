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
