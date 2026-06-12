const assert = require("node:assert/strict");
const {
  RAW_MATERIAL_USAGE_RPC,
  REFERENCE_WARNING,
  checkReferences,
  formatReferenceWarning,
  isDatabaseReferenceError,
} = require("../modules/cost-management/raw-material-delete-service.js");

function createClient(result, calls) {
  return {
    async rpc(name, parameters) {
      calls.push({ name, parameters });
      return result;
    },
    from() {
      throw new Error("Pengecekan referensi tidak boleh membaca tabel langsung.");
    },
  };
}

const scenarios = [
  {
    name: "bahan tidak digunakan",
    rpcRow: {
      used_in_preparation: false,
      used_in_menu: false,
      preparation_count: 0,
      menu_count: 0,
      preparation_names: [],
      menu_names: [],
    },
    expectedReferenced: false,
  },
  {
    name: "digunakan hanya di Preparation",
    rpcRow: {
      used_in_preparation: true,
      used_in_menu: false,
      preparation_count: 1,
      menu_count: 0,
      preparation_names: ["Sambal Dasar"],
      menu_names: [],
    },
    expectedReferenced: true,
  },
  {
    name: "digunakan hanya di Menu",
    rpcRow: {
      used_in_preparation: false,
      used_in_menu: true,
      preparation_count: 0,
      menu_count: 1,
      preparation_names: [],
      menu_names: ["Nasi Goreng"],
    },
    expectedReferenced: true,
  },
  {
    name: "digunakan di Preparation dan Menu",
    rpcRow: {
      used_in_preparation: true,
      used_in_menu: true,
      preparation_count: 1,
      menu_count: 1,
      preparation_names: ["Sambal Dasar"],
      menu_names: ["Nasi Goreng"],
    },
    expectedReferenced: true,
  },
];

(async () => {
  for (const scenario of scenarios) {
    const calls = [];
    const actual = await checkReferences({
      client: createClient({ data: [scenario.rpcRow], error: null }, calls),
      rawMaterialId: 42,
    });

    assert.equal(actual.isReferenced, scenario.expectedReferenced, scenario.name);
    assert.equal(actual.preparationCount, scenario.rpcRow.preparation_count);
    assert.equal(actual.menuCount, scenario.rpcRow.menu_count);
    assert.deepEqual(actual.preparationNames, scenario.rpcRow.preparation_names);
    assert.deepEqual(actual.menuNames, scenario.rpcRow.menu_names);
    assert.deepEqual(calls, [
      {
        name: RAW_MATERIAL_USAGE_RPC,
        parameters: { p_raw_material_id: 42 },
      },
    ]);
  }

  await assert.rejects(
    checkReferences({
      client: createClient(
        { data: null, error: { code: "NETWORK", message: "offline" } },
        [],
      ),
      rawMaterialId: 42,
    }),
    (error) =>
      error.code === "NETWORK" &&
      error.referenceCheckContext === RAW_MATERIAL_USAGE_RPC,
    "RPC gagal harus membatalkan pengecekan",
  );
  await assert.rejects(
    checkReferences({
      client: createClient({ data: [], error: null }, []),
      rawMaterialId: 42,
    }),
    (error) => error.code === "RPC_EMPTY_RESULT",
    "hasil RPC kosong harus membatalkan pengecekan",
  );
  await assert.rejects(
    checkReferences({ client: createClient({}, []), rawMaterialId: null }),
    /ID Raw Material tidak tersedia/,
    "ID yang tidak tersedia harus membatalkan penghapusan",
  );

  assert.equal(formatReferenceWarning(), REFERENCE_WARNING);
  assert.equal(isDatabaseReferenceError({ code: "23503" }), true);
  assert.equal(isDatabaseReferenceError({ code: "OTHER" }), false);
  console.log("Semua skenario deletion guard berbasis RPC lulus.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
