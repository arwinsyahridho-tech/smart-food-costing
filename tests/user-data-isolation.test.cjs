const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20260613000000_add_user_data_isolation.sql");
const ownedTables = [
  "raw_material",
  "raw_material_categories",
  "preparations",
  "preparation_items",
  "preparation_categories",
  "menus",
  "menu_items",
  "menu_categories",
  "menu_subcategories",
  "cost_settings",
];

for (const table of ownedTables) {
  assert.match(migration, new RegExp(`'${table}'`), `${table} harus diaudit oleh migration`);
}
assert.match(migration, /ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth\.users\(id\)/);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /FOR SELECT TO authenticated USING/);
assert.match(migration, /FOR INSERT TO authenticated WITH CHECK/);
assert.match(migration, /FOR UPDATE TO authenticated USING/);
assert.match(migration, /FOR DELETE TO authenticated USING/);
assert.match(migration, /biya_validate_preparation_item_owner/);
assert.match(migration, /biya_validate_menu_item_owner/);
assert.match(migration, /storage\.foldername\(name\)/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_raw_material_usage[\s\S]*FROM anon/);
assert.doesNotMatch(migration, /service_role/i);

const context = { window: {}, console };
vm.runInNewContext(read("assets/js/biya-data.js"), context);
const userA = { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" };
const userB = { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" };
const clientFor = (user) => ({
  auth: { getUser: async () => ({ data: { user }, error: null }) },
});

(async () => {
  assert.equal(await context.window.BiyaData.getCurrentUserId(clientFor(userA)), userA.id);
  assert.equal(await context.window.BiyaData.getCurrentUserId(clientFor(userB)), userB.id);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.window.BiyaData.ownedPayload({ nama: "Tepung" }, userA.id))),
    { nama: "Tepung", user_id: userA.id },
  );
  assert.equal(
    context.window.BiyaData.storagePath(userB.id, "menu", "foto.png"),
    `${userB.id}/menu/foto.png`,
  );
  await assert.rejects(
    context.window.BiyaData.getCurrentUserId({ auth: { getUser: async () => ({ data: { user: null } }) } }),
    /User belum login/,
  );

  const pages = {
    raw: read("modules/cost-management/rawmaterial.html"),
    preparation: read("modules/cost-management/preparation.html"),
    menu: read("modules/cost-management/menu.html"),
    dashboard: read("modules/cost-management/costdashboard.html"),
    hpp: read("modules/cost-management/producthpp.html"),
  };
  for (const [name, source] of Object.entries(pages)) {
    assert.match(source, /BiyaData\.getCurrentUserId/, `${name} harus memverifikasi user`);
    assert.match(source, /\.eq\("user_id",\s*currentUserId\)/, `${name} harus memfilter query`);
  }
  assert.match(pages.menu, /storagePath\(currentUserId,"menu"/);
  assert.match(pages.menu, /user_id:currentUserId/);
  assert.match(pages.preparation, /user_id:currentUserId/);
  assert.match(pages.raw, /user_id: currentUserId/);

  const exportService = read("modules/cost-management/export-service-center.js");
  assert.match(exportService, /query = query\.eq\("user_id", options\.userId\)/);
  assert.match(exportService, /\.delete\(\)\.eq\("user_id", userId\)/);
  assert.match(exportService, /BiyaData\.ownedRows/);

  console.log("Invariant isolasi data per-user lulus.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
