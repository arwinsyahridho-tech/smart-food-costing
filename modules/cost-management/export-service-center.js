(function (global) {
  "use strict";

  const TABLES = [
    "raw_material",
    "raw_material_categories",
    "preparations",
    "preparation_items",
    "preparation_categories",
    "menus",
    "menu_items",
    "menu_categories",
    "menu_subcategories",
    "cost_settings"
  ];
  const OPTIONAL_TABLES = new Set([
    "raw_material_categories",
    "preparation_categories",
    "menu_categories",
    "menu_subcategories"
  ]);
  const PAGE_SIZE = 1000;
  const INSERT_BATCH_SIZE = 500;
  const DELETE_ORDER = [
    "menu_items",
    "preparation_items",
    "menus",
    "preparations",
    "raw_material",
    "menu_subcategories",
    "menu_categories",
    "preparation_categories",
    "raw_material_categories"
  ];
  const INSERT_ORDER = [
    "raw_material_categories",
    "preparation_categories",
    "menu_categories",
    "menu_subcategories",
    "raw_material",
    "preparations",
    "preparation_items",
    "menus",
    "menu_items"
  ];

  function logError(context, error, extra) {
    console.error("[Export Center] " + context, {
      error,
      message: error && error.message,
      details: error && error.details,
      hint: error && error.hint,
      code: error && error.code,
      ...(extra || {})
    });
  }

  function isMissingTable(error) {
    const message = String((error && (error.message || error.details)) || "").toLowerCase();
    return Boolean(error) && (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      message.includes("does not exist") ||
      message.includes("schema cache")
    );
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function latestTimestamp(rows) {
    let latest = "";
    (rows || []).forEach(row => {
      const value = row && (row.updated_at || row.created_at);
      if (value && (!latest || new Date(value).getTime() > new Date(latest).getTime())) latest = value;
    });
    return latest;
  }

  async function fetchTable(client, table, options) {
    const rows = [];
    let from = 0;
    while (true) {
      let query = client.from(table).select("*");
      if (!options || !options.userId) throw new Error("User belum login.");
      query = query.eq("user_id", options.userId);
      query = query.range(from, from + PAGE_SIZE - 1);
      const { data, error } = await query;
      if (error) {
        if (OPTIONAL_TABLES.has(table) && isMissingTable(error)) {
          console.warn("[Export Center] Tabel optional tidak tersedia", { table, error });
          return { rows: [], warning: "Tabel " + table + " tidak tersedia." };
        }
        logError("Load " + table + " gagal", error, { table, from });
        throw error;
      }
      const page = data || [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return { rows, warning: "" };
  }

  async function loadAll(client, settingsService) {
    if (!client) throw new Error("Supabase client belum tersedia.");
    const scope = settingsService
      ? await settingsService.resolveScope(client)
      : await (async function () { const user = await global.BiyaData.getCurrentUser(client); return { user, userId: user.id, businessId: user.id, storageKey: user.id }; })();
    const results = await Promise.all(TABLES.map(table => fetchTable(client, table, {
      businessId: scope.businessId,
      userId: scope.userId
    })));
    const tables = {};
    const warnings = [];
    TABLES.forEach((table, index) => {
      tables[table] = results[index].rows;
      if (results[index].warning) warnings.push(results[index].warning);
    });
    const settingRow = tables.cost_settings[0] || {};
    const settings = settingsService ? settingsService.normalize(settingRow) : settingRow;
    return {
      format: "biya-cost-management-backup",
      version: 2,
      exported_at: new Date().toISOString(),
      source: "supabase",
      scope: { business_id: scope.businessId, user_id: scope.userId },
      settings,
      tables,
      warnings
    };
  }

  function parseLocal(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (error) {
      logError("Fallback localStorage " + key + " gagal dibaca", error);
      return fallback;
    }
  }

  function loadLocalFallback(settingsService) {
    const legacySettings = parseLocal("biya_settings", {});
    const raw = parseLocal("biya_rawMaterials", []);
    const preparations = parseLocal("biya_preparations", []);
    const menus = parseLocal("biya_menus", []);
    const preparationRows = preparations.map((row, index) => ({
      id: row.id || row.preparationId || "legacy-preparation-" + index,
      nama: row.nama || row.name || "",
      category: row.category || "",
      status: row.status || "ACTIVE",
      yield_qty: number(row.yield_qty ?? row.yieldQty),
      yield_unit: row.yield_unit || row.yieldUnit || "",
      total_cost: number(row.total_cost ?? row.total),
      cost_per_unit: number(row.cost_per_unit ?? row.costPerYield)
    }));
    const preparationItems = preparations.flatMap((row, preparationIndex) =>
      (row.ingredients || []).map((item, itemIndex) => ({
        id: item.id || "legacy-preparation-item-" + preparationIndex + "-" + itemIndex,
        preparation_id: preparationRows[preparationIndex].id,
        raw_material_id: item.raw_material_id || item.rawMaterialId || null,
        nama_bahan: item.nama_bahan || item.material || item.name || "",
        qty: number(item.qty),
        unit: item.unit || "",
        cost: number(item.cost ?? item.total)
      }))
    );
    const menuRows = menus.map((row, index) => ({
      id: row.id || "legacy-menu-" + index,
      nama: row.nama || row.name || "",
      category: row.category || "",
      sub_category: row.sub_category || row.subCategory || "",
      selling_price: number(row.selling_price ?? row.sellingPrice),
      status: row.status || "ACTIVE",
      description: row.description || "",
      photo_url: row.photo_url || row.photoUrl || ""
    }));
    const menuItems = menus.flatMap((row, menuIndex) =>
      (row.items || row.ingredients || []).map((item, itemIndex) => ({
        id: item.id || "legacy-menu-item-" + menuIndex + "-" + itemIndex,
        menu_id: menuRows[menuIndex].id,
        ingredient_type: item.ingredient_type || item.ingredientType || "raw_material",
        ingredient_id: item.ingredient_id || item.ingredientId || null,
        ingredient_name: item.ingredient_name || item.ingredient || item.name || "",
        qty: number(item.qty),
        unit: item.unit || "",
        price_per_unit: number(item.price_per_unit ?? item.pricePerUnit),
        waste_percent: number(item.waste_percent ?? item.waste),
        total: number(item.total)
      }))
    );
    const tables = {
      raw_material: raw,
      raw_material_categories: [],
      preparations: preparationRows,
      preparation_items: preparationItems,
      preparation_categories: [],
      menus: menuRows,
      menu_items: menuItems,
      menu_categories: [],
      menu_subcategories: [],
      cost_settings: legacySettings && Object.keys(legacySettings).length ? [legacySettings] : []
    };
    return {
      format: "biya-cost-management-backup",
      version: 2,
      exported_at: new Date().toISOString(),
      source: "localStorage-fallback",
      scope: { business_id: "legacy" },
      settings: settingsService ? settingsService.normalize({
        business_name: legacySettings.business_name || legacySettings.businessName,
        business_type: legacySettings.business_type || legacySettings.businessType,
        owner_name: legacySettings.owner_name || legacySettings.ownerName,
        phone: legacySettings.phone,
        email: legacySettings.email,
        address: legacySettings.address,
        logo_url: legacySettings.logo_url || legacySettings.logoUrl,
        food_cost_target: legacySettings.food_cost_target || legacySettings.foodCostTarget,
        profit_target: legacySettings.profit_target || legacySettings.profitTarget,
        currency: legacySettings.currency,
        date_format: legacySettings.date_format || legacySettings.dateFormat,
        auto_capitalize: legacySettings.auto_capitalize || legacySettings.autoCapitalize,
        default_status: legacySettings.default_status || legacySettings.defaultStatus
      }) : legacySettings,
      tables,
      warnings: ["Supabase gagal dimuat. Data fallback localStorage digunakan sementara."]
    };
  }

  function rawMaterialUnitCost(row) {
    const conversion = number(row.convertion_qty ?? row.conversion_qty ?? row.conversion_hasil) || 1;
    return number(row.harga_unit ?? row.unit_cost ?? row.price_per_unit) ||
      (number(row.harga_beli) / conversion);
  }

  function preparationUnitCost(row) {
    const yieldQty = number(row.yield_qty ?? row.yield) || 1;
    return number(row.cost_per_unit ?? row.price_per_unit) || (number(row.total_cost) / yieldQty);
  }

  function buildProductHpp(dataset) {
    const tables = dataset.tables || {};
    const rawById = new Map((tables.raw_material || []).map(row => [String(row.id || row.raw_id), row]));
    const rawByName = new Map((tables.raw_material || []).map(row => [String(row.nama || row.name || "").toLowerCase(), row]));
    const preparationById = new Map((tables.preparations || []).map(row => [String(row.id), row]));
    const preparationByName = new Map((tables.preparations || []).map(row => [String(row.nama || row.name || "").toLowerCase(), row]));
    const itemsByMenu = new Map();
    (tables.menu_items || []).forEach(item => {
      const key = String(item.menu_id || "");
      if (!itemsByMenu.has(key)) itemsByMenu.set(key, []);
      itemsByMenu.get(key).push(item);
    });
    return (tables.menus || []).map(menu => {
      const items = itemsByMenu.get(String(menu.id)) || [];
      const recipeCost = items.reduce((sum, item) => {
        const type = String(item.ingredient_type || "raw_material").toLowerCase();
        const source = type === "preparation"
          ? preparationById.get(String(item.ingredient_id || "")) || preparationByName.get(String(item.ingredient_name || "").toLowerCase())
          : rawById.get(String(item.ingredient_id || "")) || rawByName.get(String(item.ingredient_name || "").toLowerCase());
        const currentPrice = source
          ? (type === "preparation" ? preparationUnitCost(source) : rawMaterialUnitCost(source))
          : number(item.price_per_unit);
        const computed = number(item.qty) * currentPrice * (1 + number(item.waste_percent) / 100);
        return sum + (computed || number(item.total));
      }, 0);
      const sellingPrice = number(menu.selling_price);
      const profit = sellingPrice - recipeCost;
      return {
        id: menu.id,
        name: menu.nama || menu.name || "",
        category: menu.category || "",
        sub_category: menu.sub_category || "",
        selling_price: sellingPrice,
        hpp: recipeCost,
        profit_rp: profit,
        profit_pct: sellingPrice ? (profit / sellingPrice) * 100 : 0,
        food_cost_pct: sellingPrice ? (recipeCost / sellingPrice) * 100 : 0,
        total_ingredients: items.length,
        status: menu.status || "ACTIVE"
      };
    });
  }

  function rawMaterialCsvRows(dataset) {
    return (dataset.tables.raw_material || []).map(row => ({
      id: row.id || "",
      raw_id: row.raw_id || "",
      nama: row.nama || row.name || "",
      merk: row.merk || "",
      category: row.category || "",
      supplier: row.supplier || "",
      qty_beli: number(row.qty_beli),
      satuan_beli: row.satuan_beli || "",
      harga_beli: number(row.harga_beli),
      conversion_qty: number(row.convertion_qty ?? row.conversion_qty),
      unit_dasar: row.unit_dasar || row.satuan_dasar || "",
      waste_percent: number(row.waste_percent),
      harga_unit: rawMaterialUnitCost(row),
      status: row.status || "ACTIVE"
    }));
  }

  function preparationCsvRows(dataset) {
    const itemsByPreparation = new Map();
    (dataset.tables.preparation_items || []).forEach(item => {
      const key = String(item.preparation_id || "");
      if (!itemsByPreparation.has(key)) itemsByPreparation.set(key, []);
      itemsByPreparation.get(key).push(item);
    });
    return (dataset.tables.preparations || []).flatMap(preparation => {
      const items = itemsByPreparation.get(String(preparation.id)) || [];
      const base = {
        preparation_id: preparation.id || "",
        preparation_name: preparation.nama || preparation.name || "",
        category: preparation.category || "",
        status: preparation.status || "ACTIVE",
        yield_qty: number(preparation.yield_qty),
        yield_unit: preparation.yield_unit || "",
        total_cost: number(preparation.total_cost),
        cost_per_unit: preparationUnitCost(preparation)
      };
      return items.length ? items.map(item => ({
        ...base,
        item_id: item.id || "",
        raw_material_id: item.raw_material_id || "",
        ingredient_name: item.nama_bahan || item.material_name || "",
        qty: number(item.qty),
        unit: item.unit || "",
        ingredient_cost: number(item.cost ?? item.total)
      })) : [{ ...base, item_id: "", raw_material_id: "", ingredient_name: "", qty: 0, unit: "", ingredient_cost: 0 }];
    });
  }

  function menuCsvRows(dataset) {
    const itemsByMenu = new Map();
    (dataset.tables.menu_items || []).forEach(item => {
      const key = String(item.menu_id || "");
      if (!itemsByMenu.has(key)) itemsByMenu.set(key, []);
      itemsByMenu.get(key).push(item);
    });
    return (dataset.tables.menus || []).flatMap(menu => {
      const items = itemsByMenu.get(String(menu.id)) || [];
      const base = {
        menu_id: menu.id || "",
        menu_name: menu.nama || menu.name || "",
        category: menu.category || "",
        sub_category: menu.sub_category || "",
        selling_price: number(menu.selling_price),
        status: menu.status || "ACTIVE",
        description: menu.description || "",
        photo_url: menu.photo_url || ""
      };
      return items.length ? items.map(item => ({
        ...base,
        item_id: item.id || "",
        ingredient_type: item.ingredient_type || "",
        ingredient_id: item.ingredient_id || "",
        ingredient_name: item.ingredient_name || "",
        qty: number(item.qty),
        unit: item.unit || "",
        price_per_unit: number(item.price_per_unit),
        waste_percent: number(item.waste_percent),
        item_total: number(item.total)
      })) : [{ ...base, item_id: "", ingredient_type: "", ingredient_id: "", ingredient_name: "", qty: 0, unit: "", price_per_unit: 0, waste_percent: 0, item_total: 0 }];
    });
  }

  function snapshotRows(dataset) {
    const tables = dataset.tables || {};
    const hpp = buildProductHpp(dataset);
    return [
      ["Raw Material", (tables.raw_material || []).length, latestTimestamp(tables.raw_material)],
      ["Raw Material Categories", (tables.raw_material_categories || []).length, latestTimestamp(tables.raw_material_categories)],
      ["Preparation", (tables.preparations || []).length, latestTimestamp(tables.preparations)],
      ["Preparation Items", (tables.preparation_items || []).length, latestTimestamp(tables.preparation_items)],
      ["Preparation Categories", (tables.preparation_categories || []).length, latestTimestamp(tables.preparation_categories)],
      ["Menu", (tables.menus || []).length, latestTimestamp(tables.menus)],
      ["Menu Items", (tables.menu_items || []).length, latestTimestamp(tables.menu_items)],
      ["Menu Categories", (tables.menu_categories || []).length, latestTimestamp(tables.menu_categories)],
      ["Menu Subcategories", (tables.menu_subcategories || []).length, latestTimestamp(tables.menu_subcategories)],
      ["Product HPP (calculated)", hpp.length, latestTimestamp(tables.menus)],
      ["Settings", (tables.cost_settings || []).length, latestTimestamp(tables.cost_settings)]
    ];
  }

  function validateBackup(backup) {
    if (!backup || typeof backup !== "object" || !backup.tables || typeof backup.tables !== "object") {
      throw new Error("Format backup tidak valid: properti tables tidak ditemukan.");
    }
    const required = ["raw_material", "preparations", "preparation_items", "menus", "menu_items"];
    required.forEach(table => {
      if (!Array.isArray(backup.tables[table])) throw new Error("Format backup tidak valid: " + table + " harus berupa array.");
    });
    return backup;
  }

  async function deleteTableRows(client, table, userId) {
    const { error } = await client.from(table).delete().eq("user_id", userId).not("id", "is", null);
    if (error) {
      if (OPTIONAL_TABLES.has(table) && isMissingTable(error)) return;
      logError("Delete " + table + " saat restore gagal", error, { table });
      throw error;
    }
  }

  async function insertTableRows(client, table, rows, userId) {
    if (!rows || !rows.length) return;
    for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
      const batch = global.BiyaData.ownedRows(rows.slice(index, index + INSERT_BATCH_SIZE), userId);
      const { error } = await client.from(table).insert(batch);
      if (error) {
        if (OPTIONAL_TABLES.has(table) && isMissingTable(error)) return;
        logError("Insert " + table + " saat restore gagal", error, {
          table,
          rowCount: rows.length,
          batchStart: index,
          batchSize: batch.length
        });
        throw error;
      }
    }
  }

  async function restoreAll(client, settingsService, backup, onProgress) {
    validateBackup(backup);
    const scope = settingsService
      ? await settingsService.resolveScope(client)
      : await (async function () { const user = await global.BiyaData.getCurrentUser(client); return { user, userId: user.id, businessId: user.id, storageKey: user.id }; })();
    const progress = typeof onProgress === "function" ? onProgress : function () {};
    for (const table of DELETE_ORDER) {
      progress("Menghapus data lama: " + table);
      await deleteTableRows(client, table, scope.userId);
    }
    for (const table of INSERT_ORDER) {
      progress("Memulihkan data: " + table);
      const rows = (backup.tables[table] || []).map(row => ({ ...row, user_id: scope.userId }));
      await insertTableRows(client, table, rows, scope.userId);
    }
    const settingRow = (backup.tables.cost_settings || [])[0] || backup.settings;
    if (settingRow && settingsService) {
      progress("Memulihkan settings bisnis");
      await settingsService.save(client, scope, settingRow);
    }
    return loadAll(client, settingsService);
  }

  global.BiyaExportCenter = Object.freeze({
    TABLES,
    buildProductHpp,
    latestTimestamp,
    loadAll,
    loadLocalFallback,
    logError,
    menuCsvRows,
    preparationCsvRows,
    rawMaterialCsvRows,
    restoreAll,
    snapshotRows,
    validateBackup
  });
})(window);
