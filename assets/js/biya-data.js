(function (global) {
  "use strict";

  function authError(message) {
    const error = new Error(message || "User belum login.");
    error.code = "BIYA_AUTH_REQUIRED";
    return error;
  }

  async function getCurrentUser(client) {
    if (!client || !client.auth) throw authError("Supabase Auth belum tersedia.");
    const { data, error } = await client.auth.getUser();
    if (error || !data || !data.user) {
      if (error) console.error("[BIYA Data] Gagal memverifikasi user", error);
      throw authError();
    }
    global.BIYA_CURRENT_USER = data.user;
    return data.user;
  }

  async function getCurrentUserId(client) {
    const user = await getCurrentUser(client);
    return user.id;
  }

  function ownedPayload(payload, userId) {
    if (!userId) throw authError();
    return { ...(payload || {}), user_id: userId };
  }

  function ownedRows(rows, userId) {
    return (rows || []).map((row) => ownedPayload(row, userId));
  }

  function storagePath(userId) {
    if (!userId) throw authError();
    const parts = Array.prototype.slice.call(arguments, 1)
      .map((part) => String(part || "").replace(/^\/+|\/+$/g, ""))
      .filter(Boolean);
    return [userId].concat(parts).join("/");
  }

  global.BiyaData = Object.freeze({
    getCurrentUser,
    getCurrentUserId,
    ownedPayload,
    ownedRows,
    storagePath
  });
})(window);
