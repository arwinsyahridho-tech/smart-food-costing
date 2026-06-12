(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RawMaterialDeletionGuard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_SCHEMA = Object.freeze({
    preparationItemsTable: "preparation_items",
    preparationTable: "preparations",
    menuItemsTable: "menu_items",
    menuTable: "menus",
  });

  function unique(values) {
    return [...new Set(values.filter(Boolean).map(String))];
  }

  async function runQuery(query, context) {
    const { data, error } = await query;
    if (error) {
      const wrappedError = new Error(
        error.message || `Query ${context} gagal.`,
      );
      Object.assign(wrappedError, error, { referenceCheckContext: context });
      throw wrappedError;
    }
    return data || [];
  }

  async function loadRecipeNames(client, table, ids, context) {
    if (!ids.length) return [];
    const rows = await runQuery(
      client.from(table).select("id,nama").in("id", ids),
      context,
    );
    const namesById = new Map(
      rows.map((row) => [String(row.id), row.nama || String(row.id)]),
    );
    return ids.map((id) => namesById.get(String(id)) || String(id));
  }

  async function checkReferences({
    client,
    rawMaterialId,
    schema = DEFAULT_SCHEMA,
  }) {
    if (!client) throw new Error("Supabase client tidak tersedia.");
    if (!rawMaterialId) throw new Error("ID Raw Material tidak tersedia.");

    const [preparationItems, menuItems] = await Promise.all([
      runQuery(
        client
          .from(schema.preparationItemsTable)
          .select("preparation_id")
          .eq("raw_material_id", rawMaterialId),
        "preparation_items",
      ),
      runQuery(
        client
          .from(schema.menuItemsTable)
          .select("menu_id")
          .eq("ingredient_type", "raw_material")
          .eq("ingredient_id", rawMaterialId),
        "menu_items",
      ),
    ]);

    const preparationIds = unique(
      preparationItems.map((row) => row.preparation_id),
    );
    const menuIds = unique(menuItems.map((row) => row.menu_id));
    const [preparationNames, menuNames] = await Promise.all([
      loadRecipeNames(
        client,
        schema.preparationTable,
        preparationIds,
        "preparations",
      ),
      loadRecipeNames(client, schema.menuTable, menuIds, "menus"),
    ]);

    return {
      isReferenced: preparationIds.length > 0 || menuIds.length > 0,
      preparationNames,
      menuNames,
    };
  }

  function formatReferenceWarning(references) {
    const lines = [
      "Bahan baku tidak dapat dihapus karena masih digunakan pada resep Preparation atau Menu.",
    ];
    const details = [];
    if (references.preparationNames.length) {
      details.push(`Preparation: ${references.preparationNames.join(", ")}`);
    }
    if (references.menuNames.length) {
      details.push(`Menu: ${references.menuNames.join(", ")}`);
    }
    if (details.length) lines.push("", "Detail resep terkait:", ...details);
    return lines.join("\n");
  }

  function isDatabaseReferenceError(error) {
    const message =
      `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
    return (
      error?.code === "23503" ||
      message.includes("raw material masih digunakan") ||
      message.includes("foreign key constraint")
    );
  }

  return {
    DEFAULT_SCHEMA,
    checkReferences,
    formatReferenceWarning,
    isDatabaseReferenceError,
  };
});
