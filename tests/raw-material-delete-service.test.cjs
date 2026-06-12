const assert = require("node:assert/strict");
const {
  checkReferences,
  formatReferenceWarning,
  isDatabaseReferenceError,
} = require("../modules/cost-management/raw-material-delete-service.js");

function createQuery(result) {
  const query = {
    select() {
      return query;
    },
    eq() {
      return query;
    },
    in() {
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return query;
}

function createClient(fixtures, failingTable = null) {
  return {
    from(table) {
      if (table === failingTable) {
        return createQuery({
          data: null,
          error: { code: "NETWORK", message: "offline" },
        });
      }
      return createQuery({ data: fixtures[table] || [], error: null });
    },
  };
}

const scenarios = [
  {
    name: "bahan tidak digunakan",
    fixtures: {},
    expected: { isReferenced: false, preparationNames: [], menuNames: [] },
  },
  {
    name: "digunakan hanya di Preparation",
    fixtures: {
      preparation_items: [{ preparation_id: "prep-1" }],
      preparations: [{ id: "prep-1", nama: "Sambal Dasar" }],
    },
    expected: {
      isReferenced: true,
      preparationNames: ["Sambal Dasar"],
      menuNames: [],
    },
  },
  {
    name: "digunakan hanya di Menu",
    fixtures: {
      menu_items: [{ menu_id: "menu-1" }],
      menus: [{ id: "menu-1", nama: "Nasi Goreng" }],
    },
    expected: {
      isReferenced: true,
      preparationNames: [],
      menuNames: ["Nasi Goreng"],
    },
  },
  {
    name: "digunakan di Preparation dan Menu",
    fixtures: {
      preparation_items: [{ preparation_id: "prep-1" }],
      preparations: [{ id: "prep-1", nama: "Sambal Dasar" }],
      menu_items: [{ menu_id: "menu-1" }],
      menus: [{ id: "menu-1", nama: "Nasi Goreng" }],
    },
    expected: {
      isReferenced: true,
      preparationNames: ["Sambal Dasar"],
      menuNames: ["Nasi Goreng"],
    },
  },
];

(async () => {
  for (const scenario of scenarios) {
    const actual = await checkReferences({
      client: createClient(scenario.fixtures),
      rawMaterialId: "raw-1",
    });
    assert.deepEqual(actual, scenario.expected, scenario.name);
  }

  await assert.rejects(
    checkReferences({
      client: createClient({}, "menu_items"),
      rawMaterialId: "raw-1",
    }),
    (error) =>
      error.code === "NETWORK" && error.referenceCheckContext === "menu_items",
    "error Supabase harus membatalkan pengecekan",
  );
  await assert.rejects(
    checkReferences({ client: createClient({}), rawMaterialId: null }),
    /ID Raw Material tidak tersedia/,
    "ID yang tidak tersedia harus membatalkan penghapusan",
  );

  const warning = formatReferenceWarning(scenarios[3].expected);
  assert.match(warning, /^Bahan baku tidak dapat dihapus/);
  assert.match(warning, /Preparation: Sambal Dasar/);
  assert.match(warning, /Menu: Nasi Goreng/);
  assert.equal(isDatabaseReferenceError({ code: "23503" }), true);
  assert.equal(isDatabaseReferenceError({ code: "OTHER" }), false);
  console.log("Semua skenario deletion guard lulus.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
