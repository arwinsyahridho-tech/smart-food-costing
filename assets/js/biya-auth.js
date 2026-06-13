(() => {
  "use strict";

  const config = window.BIYA_AUTH_CONFIG || {};
  const supabaseFactory = window.supabase;
  const existingClient = window.biyaSupabase || window.supabaseClient || null;
  const client = existingClient || (
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    supabaseFactory &&
    typeof supabaseFactory.createClient === "function"
      ? supabaseFactory.createClient(config.supabaseUrl, config.supabaseAnonKey)
      : null
  );

  if (client) {
    window.biyaSupabase = client;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateCredentials(email, password) {
    if (!String(email || "").trim()) return "Email wajib diisi.";
    if (!emailPattern.test(String(email).trim())) return "Format email belum valid.";
    if (!String(password || "")) return "Password wajib diisi.";
    return "";
  }

  function friendlyAuthError(error, fallback = "Autentikasi gagal. Silakan coba lagi.") {
    const message = String(error && error.message ? error.message : "").toLowerCase();
    if (message.includes("invalid login credentials")) return "Email atau password salah.";
    if (message.includes("email not confirmed")) return "Email belum diverifikasi. Silakan cek inbox Anda.";
    if (message.includes("user already registered")) return "Email ini sudah terdaftar. Silakan masuk.";
    if (message.includes("password should be at least")) return "Password minimal 6 karakter.";
    if (message.includes("unable to validate email")) return "Alamat email tidak dapat digunakan.";
    if (message.includes("signup is disabled")) return "Pendaftaran akun sedang dinonaktifkan.";
    if (message.includes("rate limit") || message.includes("too many requests")) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
    if (message.includes("failed to fetch") || message.includes("network")) return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
    return fallback;
  }

  function safeRedirectTarget(value, fallback = config.dashboardPath || "/menu-modules/dashboard.html") {
    if (!value) return fallback;
    try {
      const target = new URL(value, window.location.origin);
      if (target.origin !== window.location.origin) return fallback;
      if (target.pathname === "/" || target.pathname === "/index.html") return fallback;
      return `${target.pathname}${target.search}${target.hash}`;
    } catch (_) {
      return fallback;
    }
  }

  async function getSession() {
    if (!client || !client.auth) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data && data.session ? data.session : null;
  }

  async function signIn(email, password) {
    if (!client || !client.auth) throw new Error("Supabase client belum tersedia.");
    const validationError = validateCredentials(email, password);
    if (validationError) throw Object.assign(new Error(validationError), { isValidationError: true });
    const { data, error } = await client.auth.signInWithPassword({
      email: String(email).trim(),
      password: String(password)
    });
    if (error) throw error;
    return data;
  }

  async function signUp({ name, email, password }) {
    if (!client || !client.auth) throw new Error("Supabase client belum tersedia.");
    const validationError = validateCredentials(email, password);
    if (validationError) throw Object.assign(new Error(validationError), { isValidationError: true });
    const cleanName = String(name || "").trim();
    if (!cleanName) throw Object.assign(new Error("Nama bisnis atau nama user wajib diisi."), { isValidationError: true });
    const { data, error } = await client.auth.signUp({
      email: String(email).trim(),
      password: String(password),
      options: {
        data: {
          name: cleanName,
          full_name: cleanName,
          business_name: cleanName
        }
      }
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (client && client.auth) {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    }
    window.location.replace(config.loginPath || "/index.html");
  }

  window.BiyaAuth = Object.freeze({
    client,
    config,
    friendlyAuthError,
    getSession,
    safeRedirectTarget,
    signIn,
    signOut,
    signUp,
    validateCredentials
  });
})();
