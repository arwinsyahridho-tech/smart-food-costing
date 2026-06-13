(() => {
  "use strict";

  const auth = window.BiyaAuth;
  const loginView = document.getElementById("loginView");
  const registerView = document.getElementById("registerView");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const demoButton = document.getElementById("demoButton");
  const loginStatus = document.getElementById("loginStatus");
  const registerStatus = document.getElementById("registerStatus");
  const redirectTarget = auth.safeRedirectTarget(new URLSearchParams(window.location.search).get("redirect"));

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

  async function redirectAuthenticatedUser() {
    if (!auth || !auth.client) {
      showStatus(loginStatus, "Konfigurasi Supabase belum tersedia. Hubungi administrator.");
      return;
    }
    try {
      const session = await auth.getSession();
      if (session) window.location.replace(redirectTarget);
    } catch (error) {
      console.error("[BIYA Auth] Gagal membaca sesi", error);
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
    try {
      await auth.signIn(email, password);
      window.location.replace(redirectTarget);
    } catch (error) {
      showStatus(loginStatus, error.isValidationError ? error.message : auth.friendlyAuthError(error));
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
    try {
      await auth.signIn(demoEmail, demoPassword);
      window.location.replace(redirectTarget);
    } catch (error) {
      console.error("[BIYA Auth] Demo login gagal", error);
      showStatus(loginStatus, "Demo akun belum tersedia atau konfigurasi demo salah.");
      setButtonLoading(demoButton, false);
    }
  });

  const redirectReason = new URLSearchParams(window.location.search).get("reason");
  if (redirectReason === "auth") showStatus(loginStatus, "Silakan masuk untuk membuka halaman tersebut.");
  if (redirectReason === "logout") showStatus(loginStatus, "Anda telah keluar dari BIYA.", "success");
  if (redirectReason === "session") showStatus(loginStatus, "Sesi tidak dapat diverifikasi. Silakan masuk kembali.");
  if (redirectReason === "config") showStatus(loginStatus, "Konfigurasi Supabase belum tersedia. Hubungi administrator.");

  if (window.location.hash === "#register") setView("register");
  redirectAuthenticatedUser();
})();
