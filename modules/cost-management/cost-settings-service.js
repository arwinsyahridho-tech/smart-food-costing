(function (global) {
  "use strict";

  const TABLE = "cost_settings";
  const LOGO_BUCKET = "business-logos";
  const DEFAULTS = Object.freeze({
    business_name: "BIYA Cost Management",
    business_type: "F&B",
    owner_name: "",
    phone: "",
    email: "",
    address: "",
    logo_url: "",
    food_cost_target: 35,
    profit_target: 50,
    currency: "IDR",
    date_format: "dd/mm/yyyy",
    auto_capitalize: "on",
    default_status: "ACTIVE"
  });

  function logError(context, error, extra) {
    console.error("[Cost Settings] " + context, {
      error,
      message: error && error.message,
      details: error && error.details,
      hint: error && error.hint,
      code: error && error.code,
      ...(extra || {})
    });
  }

  function asPositiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 && number <= 100 ? number : fallback;
  }

  function normalize(row) {
    const source = row || {};
    return {
      ...DEFAULTS,
      ...source,
      food_cost_target: asPositiveNumber(source.food_cost_target, DEFAULTS.food_cost_target),
      profit_target: asPositiveNumber(source.profit_target, DEFAULTS.profit_target)
    };
  }

  async function resolveScope(client) {
    const user = await global.BiyaData.getCurrentUser(client);
    return {
      user,
      userId: user.id,
      businessId: user.id,
      storageKey: user.id
    };
  }

  async function load(client) {
    const scope = await resolveScope(client);
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("user_id", scope.userId)
      .maybeSingle();
    if (error) {
      logError("Load cost_settings gagal", error, { businessId: scope.businessId });
      throw error;
    }
    return { scope, settings: normalize(data), exists: Boolean(data) };
  }

  async function save(client, scope, settings) {
    const payload = {
      user_id: scope.userId,
      business_id: scope.businessId,
      business_name: settings.business_name,
      business_type: settings.business_type,
      owner_name: settings.owner_name,
      phone: settings.phone,
      email: settings.email,
      address: settings.address,
      logo_url: settings.logo_url || "",
      food_cost_target: asPositiveNumber(settings.food_cost_target, DEFAULTS.food_cost_target),
      profit_target: asPositiveNumber(settings.profit_target, DEFAULTS.profit_target),
      currency: settings.currency || DEFAULTS.currency,
      date_format: settings.date_format || DEFAULTS.date_format,
      auto_capitalize: settings.auto_capitalize || DEFAULTS.auto_capitalize,
      default_status: settings.default_status || DEFAULTS.default_status,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await client
      .from(TABLE)
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) {
      logError("Upsert cost_settings gagal", error, { businessId: scope.businessId, payload });
      throw error;
    }
    return normalize(data);
  }

  async function uploadLogo(client, scope, file) {
    const path = global.BiyaData.storagePath(scope.userId, "logos", "business-logo");
    const { error } = await client.storage
      .from(LOGO_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });
    if (error) {
      logError("Upload logo gagal", error, {
        bucket: LOGO_BUCKET,
        path,
        size: file.size,
        type: file.type
      });
      throw error;
    }
    const { data } = client.storage.from(LOGO_BUCKET).getPublicUrl(path);
    if (!data || !data.publicUrl) {
      const publicUrlError = new Error("Public URL logo tidak tersedia.");
      logError("Get public URL logo gagal", publicUrlError, { bucket: LOGO_BUCKET, path });
      throw publicUrlError;
    }
    return data.publicUrl + "?v=" + Date.now();
  }

  async function removeLogo(client, scope) {
    const path = global.BiyaData.storagePath(scope.userId, "logos", "business-logo");
    const { error } = await client.storage.from(LOGO_BUCKET).remove([path]);
    if (error && error.statusCode !== "404") {
      logError("Hapus logo gagal", error, { bucket: LOGO_BUCKET, path });
      throw error;
    }
  }

  function healthyFoodCostLimit(target) {
    return asPositiveNumber(target, DEFAULTS.food_cost_target) * 0.85;
  }

  global.BiyaCostSettings = Object.freeze({
    DEFAULTS,
    LOGO_BUCKET,
    healthyFoodCostLimit,
    load,
    logError,
    normalize,
    removeLogo,
    resolveScope,
    save,
    uploadLogo
  });
})(window);
