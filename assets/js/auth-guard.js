(() => {
  "use strict";

  document.documentElement.classList.add("biya-auth-pending");

  const auth = window.BiyaAuth;
  const deletionGuard = window.BIYADeletionGuard;
  const loginPath = (auth && auth.config && auth.config.loginPath) || "/index.html";
  let guardRedirecting = false;

  function redirectToLogin(reason) {
    if (guardRedirecting) return;
    guardRedirecting = true;
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const params = new URLSearchParams({ redirect: currentPath });
    if (reason) params.set("reason", reason);
    window.location.replace(`${loginPath}?${params.toString()}`);
  }

  function revealPage() {
    document.documentElement.classList.remove("biya-auth-pending");
  }

  async function protectPage() {
    if (!auth || !auth.client || !deletionGuard) {
      redirectToLogin("config");
      return;
    }

    try {
      const session = await auth.getSession();
      if (!session) {
        redirectToLogin("auth");
        return;
      }
      const activeRequest = await deletionGuard.blockAndSignOutIfNeeded(auth.client, session.user.id);
      if (activeRequest) {
        redirectToLogin("deletion");
        return;
      }
      window.BIYA_SESSION = session;
      window.BIYA_CURRENT_USER = session.user;
      revealPage();
    } catch (error) {
      console.error("[BIYA Deletion Guard] Pemeriksaan sesi atau status penghapusan gagal", error);
      deletionGuard.storeNotice(deletionGuard.VERIFICATION_NOTICE);
      try {
        await auth.client.auth.signOut();
      } catch (signOutError) {
        console.error("[BIYA Deletion Guard] Gagal mengakhiri sesi setelah verifikasi gagal", signOutError);
      }
      redirectToLogin("verification");
    }
  }

  if (auth && auth.client && auth.client.auth) {
    auth.client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !guardRedirecting) redirectToLogin("logout");
    });
  }

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    document.documentElement.classList.add("biya-auth-pending");
    protectPage();
  });

  protectPage();
})();
