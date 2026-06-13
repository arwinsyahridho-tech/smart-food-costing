(() => {
  "use strict";

  const auth = window.BiyaAuth;
  const deletionGuard = window.BIYADeletionGuard;
  const loginView = document.getElementById("loginView");
  const registerView = document.getElementById("registerView");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const demoButton = document.getElementById("demoButton");
  const loginStatus = document.getElementById("loginStatus");
  const registerStatus = document.getElementById("registerStatus");
  const redirectTarget = auth.safeRedirectTarget(new URLSearchParams(window.location.search).get("redirect"));
  const demoLoginError = "Akun demo belum dibuat di Supabase atau password demo tidak sesuai. Silakan buat akun demo di Supabase Auth.";

  function showStatus(element, message = "", type = "error") {
    element.textContent = message;
    element.className = `status${message ? ` is-visible ${type}` : ""}`;
  }

  function setButtonLoading(button, loading, loadingLabel) {
    button.disabled = loading;
    button.classList.toggle("is-loading", loading);
    const label = button.querySelector("[data-button-label]");
    if (!label) return;
    if (!button.dataset.defaultLabel) button.dataset.defaultLabel = label.textContent;
    label.textContent = loading ? loadingLabel : button.dataset.defaultLabel;
  }

  function setView(view) {
    const isRegister = view === "register";
    loginView.hidden = isRegister;
    registerView.hidden = !isRegister;
    showStatus(loginStatus);
    showStatus(registerStatus);
    window.history.replaceState(null, "", isRegister ? "#register" : window.location.pathname + window.location.search);
    document.title = isRegister ? "Daftar Akun · BIYA" : "Masuk · BIYA";
    requestAnimationFrame(() => document.getElementById(isRegister ? "registerName" : "loginEmail").focus());
  }

  function consumeAuthNotice() {
    try {
      const notice = window.sessionStorage.getItem(deletionGuard.NOTICE_STORAGE_KEY);
      if (!notice) return false;
      window.sessionStorage.removeItem(deletionGuard.NOTICE_STORAGE_KEY);
      showStatus(loginStatus, notice);
      return true;
    } catch (error) {
      console.error("[BIYA Auth] Gagal membaca pemberitahuan autentikasi", error);
      return false;
    }
  }

  async function verifySignedInUser(authData) {
    const user = authData && (authData.user || (authData.session && authData.session.user));
    if (!user || !user.id) throw new Error("User hasil autentikasi tidak tersedia.");

    const activeRequest = await deletionGuard.blockAndSignOutIfNeeded(auth.client, user.id, {
      storeNotice: false
    });
    if (!activeRequest) return true;

    showStatus(loginStatus, `${deletionGuard.BLOCKED_NOTICE}\n${deletionGuard.BLOCKED_NOTE}`);
    return false;
  }

  async function failClosedAfterVerificationError(error) {
    console.error("[BIYA Deletion Guard] Status akun gagal diverifikasi", error);
    try {
      await auth.client.auth.signOut();
    } catch (signOutError) {
      console.error("[BIYA Deletion Guard] Gagal mengakhiri sesi setelah verifikasi gagal", signOutError);
    }
    showStatus(loginStatus, deletionGuard.VERIFICATION_NOTICE);
  }

  async function redirectAuthenticatedUser() {
    if (!auth || !auth.client || !deletionGuard) {
      showStatus(loginStatus, "Konfigurasi Supabase belum tersedia. Hubungi administrator.");
      return;
    }
    try {
      const session = await auth.getSession();
      if (!session) return;
      if (await verifySignedInUser(session)) window.location.replace(redirectTarget);
    } catch (error) {
      await failClosedAfterVerificationError(error);
    }
  }

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      const revealing = input.type === "password";
      input.type = revealing ? "text" : "password";
      button.setAttribute("aria-label", revealing ? "Sembunyikan password" : "Tampilkan password");
    });
  });

  document.getElementById("showRegisterButton").addEventListener("click", () => setView("register"));
  document.getElementById("showLoginButton").addEventListener("click", () => setView("login"));

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showStatus(loginStatus);
    const button = document.getElementById("loginButton");
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const validationError = auth.validateCredentials(email, password);
    if (validationError) {
      showStatus(loginStatus, validationError);
      return;
    }
    setButtonLoading(button, true, "Memproses…");
    let data;
    try {
      data = await auth.signIn(email, password);
    } catch (error) {
      showStatus(loginStatus, error.isValidationError ? error.message : auth.friendlyAuthError(error));
      setButtonLoading(button, false);
      return;
    }
    try {
      if (await verifySignedInUser(data)) window.location.replace(redirectTarget);
      else setButtonLoading(button, false);
    } catch (error) {
      await failClosedAfterVerificationError(error);
      setButtonLoading(button, false);
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showStatus(registerStatus);
    const button = document.getElementById("registerButton");
    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    const confirmation = document.getElementById("registerConfirmPassword").value;
    if (!String(name).trim()) {
      showStatus(registerStatus, "Nama bisnis atau nama user wajib diisi.");
      return;
    }
    const validationError = auth.validateCredentials(email, password);
    if (validationError) {
      showStatus(registerStatus, validationError);
      return;
    }
    if (password.length < 6) {
      showStatus(registerStatus, "Password minimal 6 karakter.");
      return;
    }
    if (password !== confirmation) {
      showStatus(registerStatus, "Password dan konfirmasi password belum sama.");
      return;
    }
    setButtonLoading(button, true, "Membuat akun…");
    try {
      const data = await auth.signUp({ name, email, password });
      if (data && data.session) {
        showStatus(registerStatus, "Akun berhasil dibuat. Mengarahkan ke dashboard…", "success");
        window.location.replace(redirectTarget);
        return;
      }
      registerForm.reset();
      showStatus(registerStatus, "Akun berhasil dibuat. Silakan cek email untuk verifikasi.", "success");
      setButtonLoading(button, false);
    } catch (error) {
      showStatus(registerStatus, error.isValidationError ? error.message : auth.friendlyAuthError(error, "Akun belum dapat dibuat. Periksa data lalu coba lagi."));
      setButtonLoading(button, false);
    }
  });

  demoButton.addEventListener("click", async () => {
    showStatus(loginStatus);
    const { demoEmail, demoPassword } = auth.config;
    setButtonLoading(demoButton, true, "Menyiapkan demo…");
    let data;
    try {
      data = await auth.signIn(demoEmail, demoPassword);
    } catch (error) {
      console.error("[BIYA Auth] Demo login gagal", error);
      showStatus(loginStatus, demoLoginError);
      setButtonLoading(demoButton, false);
      return;
    }
    try {
      if (await verifySignedInUser(data)) window.location.replace(redirectTarget);
      else setButtonLoading(demoButton, false);
    } catch (error) {
      await failClosedAfterVerificationError(error);
      setButtonLoading(demoButton, false);
    }
  });

  const displayedStoredNotice = consumeAuthNotice();
  const redirectReason = new URLSearchParams(window.location.search).get("reason");
  if (!displayedStoredNotice && redirectReason === "auth") showStatus(loginStatus, "Silakan masuk untuk membuka halaman tersebut.");
  if (!displayedStoredNotice && redirectReason === "logout") showStatus(loginStatus, "Anda telah keluar dari BIYA.", "success");
  if (!displayedStoredNotice && redirectReason === "session") showStatus(loginStatus, "Sesi tidak dapat diverifikasi. Silakan masuk kembali.");
  if (!displayedStoredNotice && redirectReason === "config") showStatus(loginStatus, "Konfigurasi Supabase belum tersedia. Hubungi administrator.");
  if (!displayedStoredNotice && redirectReason === "verification") showStatus(loginStatus, deletionGuard.VERIFICATION_NOTICE);

  if (window.location.hash === "#register") setView("register");
  if (!displayedStoredNotice) redirectAuthenticatedUser();
})();
