(() => {
  "use strict";

  document.documentElement.classList.add("biya-auth-pending");

  const auth = window.BiyaAuth;
  const loginPath = (auth && auth.config && auth.config.loginPath) || "/index.html";

  function redirectToLogin(reason) {
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const params = new URLSearchParams({ redirect: currentPath });
    if (reason) params.set("reason", reason);
    window.location.replace(`${loginPath}?${params.toString()}`);
  }

  function revealPage() {
    document.documentElement.classList.remove("biya-auth-pending");
  }

  function installLogout() {
    if (document.querySelector("[data-biya-logout]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "biya-logout-button";
    button.dataset.biyaLogout = "";
    button.textContent = "Keluar";
    button.setAttribute("aria-label", "Keluar dari BIYA");
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Keluar…";
      try {
        await auth.signOut();
      } catch (error) {
        console.error("[BIYA Auth] Logout gagal", error);
        button.disabled = false;
        button.textContent = "Keluar";
      }
    });
    document.body.appendChild(button);
  }

  async function protectPage() {
    if (!auth || !auth.client) {
      redirectToLogin("config");
      return;
    }

    try {
      const session = await auth.getSession();
      if (!session) {
        redirectToLogin("auth");
        return;
      }
      window.BIYA_SESSION = session;
      window.BIYA_CURRENT_USER = session.user;
      revealPage();
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", installLogout, { once: true });
      } else {
        installLogout();
      }
    } catch (error) {
      console.error("[BIYA Auth] Pemeriksaan sesi gagal", error);
      redirectToLogin("session");
    }
  }

  if (auth && auth.client && auth.client.auth) {
    auth.client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") redirectToLogin("logout");
    });
  }

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    document.documentElement.classList.add("biya-auth-pending");
    protectPage();
  });

  protectPage();
})();
