const assert = require("node:assert/strict");
const fs = require("node:fs");

const rpcMigration = fs.readFileSync(
  "supabase/migrations/20260612010000_add_get_raw_material_usage_rpc.sql",
  "utf8",
);
const triggerMigration = fs.readFileSync(
  "supabase/migrations/20260612000000_protect_raw_material_deletion.sql",
  "utf8",
);

assert.match(rpcMigration, /pg_catalog\.format_type\(attribute\.atttypid/);
assert.match(
  rpcMigration,
  /CREATE OR REPLACE FUNCTION public\.get_raw_material_usage/,
);
assert.match(rpcMigration, /SECURITY DEFINER/);
assert.match(rpcMigration, /SET search_path = pg_catalog/);
assert.match(rpcMigration, /LANGUAGE sql/);
assert.match(rpcMigration, /STABLE/);
assert.match(rpcMigration, /used_in_preparation boolean/);
assert.match(rpcMigration, /used_in_menu boolean/);
assert.match(rpcMigration, /preparation_count bigint/);
assert.match(rpcMigration, /menu_count bigint/);
assert.match(rpcMigration, /preparation_names text\[\]/);
assert.match(rpcMigration, /menu_names text\[\]/);
assert.match(
  rpcMigration,
  /REVOKE EXECUTE ON FUNCTION public\.get_raw_material_usage\(%s\) FROM PUBLIC/,
);
assert.match(
  rpcMigration,
  /GRANT EXECUTE ON FUNCTION public\.get_raw_material_usage\(%s\) TO anon/,
);
assert.doesNotMatch(rpcMigration, /GRANT EXECUTE[\s\S]*TO authenticated/);
assert.doesNotMatch(rpcMigration, /^\s*(DELETE|UPDATE|INSERT)\b/im);

assert.match(
  triggerMigration,
  /CREATE TRIGGER protect_referenced_raw_material_delete/,
);
assert.match(
  triggerMigration,
  /EXECUTE FUNCTION public\.prevent_referenced_raw_material_delete\(\)/,
);
assert.match(triggerMigration, /ERRCODE = '23503'/);

console.log("Kontrak migration RPC dan trigger proteksi lulus.");
