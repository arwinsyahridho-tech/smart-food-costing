(() => {
  "use strict";

  const existingConfig = window.BIYA_PORTAL_CONFIG || {};

  window.BIYA_PORTAL_CONFIG = Object.freeze({
    ...existingConfig,
    COST_MANAGEMENT_URL:
      existingConfig.COST_MANAGEMENT_URL ||
      window.BIYA_COST_MANAGEMENT_URL ||
      "/modules/cost-management/costdashboard.html",
    ACCOUNT_CENTER_URL:
      existingConfig.ACCOUNT_CENTER_URL ||
      window.BIYA_ACCOUNT_CENTER_URL ||
      "https://biya-account-center.vercel.app"
  });
})();
