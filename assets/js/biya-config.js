(() => {
  "use strict";

  const existing = window.BIYA_AUTH_CONFIG || {};

  window.BIYA_AUTH_CONFIG = Object.freeze({
    supabaseUrl:
      existing.supabaseUrl ||
      window.BIYA_SUPABASE_URL ||
      "https://pkjmkjyylgzjvhcreucc.supabase.co",
    supabaseAnonKey:
      existing.supabaseAnonKey ||
      window.BIYA_SUPABASE_ANON_KEY ||
      "sb_publishable_Tq4d0o3PIAd_zh11uJa2uQ_M_zPIYFX",
    loginPath: existing.loginPath || "/index.html",
    dashboardPath: existing.dashboardPath || "/menu-modules/dashboard.html",
    demoEmail: existing.demoEmail || window.BIYA_DEMO_EMAIL || "demo@biya.id",
    demoPassword: existing.demoPassword || window.BIYA_DEMO_PASSWORD || "BIYA-Demo-2026!"
  });
})();
