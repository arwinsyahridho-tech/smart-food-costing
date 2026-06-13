const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync("assets/js/biya-profile-bridge.js", "utf8");

function loadBridge(consoleOverride = console) {
  const context = { console: consoleOverride };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  return context.BiyaProfileBridge;
}

function createClient(rowsByTable = {}, errorsByTable = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table };
      calls.push(call);
      return {
        select(columns) {
          call.columns = columns;
          return this;
        },
        eq(column, value) {
          call.filter = { column, value };
          return this;
        },
        async maybeSingle() {
          return {
            data: rowsByTable[table] || null,
            error: errorsByTable[table] || null
          };
        }
      };
    }
  };
}

test("mengambil account dan business profile hanya untuk user login", async () => {
  const bridge = loadBridge();
  const client = createClient({
    account_profiles: { full_name: "Arwinsyah Ridho" },
    business_profiles: { business_name: "BIYA Kitchen" }
  });

  assert.equal((await bridge.getAccountProfile(client, "user-a")).full_name, "Arwinsyah Ridho");
  assert.equal((await bridge.getBusinessProfile(client, "user-a")).business_name, "BIYA Kitchen");
  assert.deepEqual(
    client.calls.map((call) => ({ table: call.table, filter: call.filter })),
    [
      { table: "account_profiles", filter: { column: "user_id", value: "user-a" } },
      { table: "business_profiles", filter: { column: "user_id", value: "user-a" } }
    ]
  );
});

test("mapping nama dan subtitle mengikuti prioritas Account Center", () => {
  const bridge = loadBridge();
  const complete = bridge.getDisplayAccountInfo(
    { email: "auth@example.com", user_metadata: { full_name: "Metadata Name" } },
    { full_name: "Arwinsyah Ridho" },
    { business_name: "BIYA Kitchen" }
  );
  assert.deepEqual(
    { displayName: complete.displayName, subtitle: complete.subtitle, hasBusinessName: complete.hasBusinessName },
    { displayName: "Arwinsyah Ridho", subtitle: "BIYA Kitchen", hasBusinessName: true }
  );

  const withoutBusiness = bridge.getDisplayAccountInfo(
    { email: "arwinsyahridho@gmail.com", user_metadata: {} },
    { full_name: "Arwinsyah Ridho" },
    null
  );
  assert.equal(withoutBusiness.displayName, "Arwinsyah Ridho");
  assert.equal(withoutBusiness.subtitle, "Arwinsyah Ridho");

  const emailFallback = bridge.getDisplayAccountInfo(
    { email: "arwinsyahridho@gmail.com", user_metadata: {} },
    null,
    { business_name: "BIYA Kitchen" }
  );
  assert.equal(emailFallback.displayName, "arwinsyahridho");
  assert.equal(emailFallback.subtitle, "BIYA Kitchen");
});

test("kegagalan atau tabel belum tersedia menghasilkan null dan warning", async () => {
  const warnings = [];
  const bridge = loadBridge({ warn: (...args) => warnings.push(args) });
  const client = createClient({}, {
    account_profiles: { code: "42P01" },
    business_profiles: { code: "42P01" }
  });

  assert.equal(await bridge.getAccountProfile(client, "user-a"), null);
  assert.equal(await bridge.getBusinessProfile(client, "user-a"), null);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0][0], /memakai fallback/);
});
