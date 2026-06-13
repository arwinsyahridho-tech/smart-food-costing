const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("halaman login menyediakan login, register, demo, status, dan password toggle", () => {
  const source = read("index.html");
  assert.match(source, /id="loginForm"/);
  assert.match(source, /id="registerForm"/);
  assert.match(source, /id="demoButton"/);
  assert.match(source, /id="loginStatus"/);
  assert.match(source, /id="registerStatus"/);
  assert.equal((source.match(/data-password-toggle=/g) || []).length, 3);
  assert.match(source, /Phase 1 Development - BIYA Operating System/);
});

test("auth helper memakai API Supabase resmi dan metadata pendaftaran", () => {
  const source = read("assets/js/biya-auth.js");
  assert.match(source, /auth\.signInWithPassword/);
  assert.match(source, /auth\.signUp/);
  assert.match(source, /auth\.signOut/);
  assert.match(source, /auth\.getSession/);
  assert.match(source, /business_name: cleanName/);
  assert.match(source, /target\.origin !== window\.location\.origin/);
});

test("pending deletion helper memfilter request aktif terbaru dan menyediakan blokir sesi", () => {
  const source = read("assets/js/biya-deletion-guard.js");
  assert.match(source, /\.from\("account_deletion_requests"\)/);
  assert.match(source, /\.eq\("user_id", userId\)/);
  assert.match(source, /\.in\("status", ACTIVE_STATUSES\)/);
  assert.match(source, /\.order\("requested_at", \{ ascending: false \}\)/);
  assert.match(source, /\.limit\(1\)/);
  assert.match(source, /\.maybeSingle\(\)/);
  assert.match(source, /"pending", "processing", "completed"/);
  assert.doesNotMatch(source, /service[_-]?role/i);
  assert.doesNotMatch(source, /\.delete\(\)/);
});

function createDeletionGuardContext({ request = null, queryError = null, signOutError = null } = {}) {
  const calls = [];
  const query = {
    eq(column, value) {
      calls.push(["eq", column, value]);
      return this;
    },
    in(column, values) {
      calls.push(["in", column, Array.from(values)]);
      return this;
    },
    limit(value) {
      calls.push(["limit", value]);
      return this;
    },
    maybeSingle() {
      calls.push(["maybeSingle"]);
      return Promise.resolve({ data: request, error: queryError });
    },
    order(column, options) {
      calls.push(["order", column, options]);
      return this;
    },
    select(columns) {
      calls.push(["select", columns]);
      return this;
    }
  };
  const storage = new Map();
  const client = {
    auth: {
      async signOut() {
        calls.push(["signOut"]);
        return { error: signOutError };
      }
    },
    from(table) {
      calls.push(["from", table]);
      return query;
    }
  };
  const context = {
    console: { error() {} },
    window: {
      sessionStorage: {
        getItem: (key) => storage.get(key) || null,
        removeItem: (key) => storage.delete(key),
        setItem: (key, value) => storage.set(key, value)
      }
    }
  };
  vm.runInNewContext(read("assets/js/biya-deletion-guard.js"), context);
  return { calls, client, guard: context.window.BIYADeletionGuard, storage };
}

test("pending deletion helper mengembalikan null untuk akun normal", async () => {
  const { calls, client, guard } = createDeletionGuardContext();
  const result = await guard.getActiveDeletionRequest(client, "user-normal");

  assert.equal(result, null);
  assert.deepEqual(calls.find((call) => call[0] === "in"), [
    "in",
    "status",
    ["pending", "processing", "completed"]
  ]);
  assert.equal(calls.some((call) => call[0] === "signOut"), false);
});

test("pending deletion helper menyimpan notice dan sign out untuk request aktif", async () => {
  const request = { id: "delete-1", user_id: "user-pending", status: "pending" };
  const { calls, client, guard, storage } = createDeletionGuardContext({ request });
  const result = await guard.blockAndSignOutIfNeeded(client, "user-pending");

  assert.equal(result, request);
  assert.equal(calls.some((call) => call[0] === "signOut"), true);
  assert.match(storage.get("biya_auth_notice"), /sedang menunggu proses penghapusan/);
  assert.match(storage.get("biya_auth_notice"), /hubungi admin BIYA/);
});

test("validasi credential menangani kosong dan format email", () => {
  const code = read("assets/js/biya-auth.js");
  const context = {
    window: {
      BIYA_AUTH_CONFIG: { dashboardPath: "/menu-modules/dashboard.html" },
      location: { origin: "https://biya.test" }
    },
    URL
  };
  vm.runInNewContext(code, context);
  const validate = context.window.BiyaAuth.validateCredentials;
  assert.equal(validate("", "secret"), "Email wajib diisi.");
  assert.equal(validate("invalid", "secret"), "Format email belum valid.");
  assert.equal(validate("user@example.com", ""), "Password wajib diisi.");
  assert.equal(validate("user@example.com", "secret"), "");
});

test("seluruh halaman internal memasang auth guard sebelum body", () => {
  const candidates = [
    "menu-modules/dashboard.html",
    ...fs.readdirSync(path.join(root, "modules/cost-management"))
      .filter((name) => name.endsWith(".html"))
      .map((name) => `modules/cost-management/${name}`),
    "modules/cost-inteligent/dashboard-costinteligent",
    "modules/finance/dashboard-finance.html",
    "modules/inventory/dashboard-inventory.html",
    "modules/pos/dashboard-pos"
  ];

  for (const file of candidates) {
    const source = read(file);
    const guardPosition = source.indexOf('/assets/js/auth-guard.js');
    const bodyPosition = source.indexOf("<body");
    assert.ok(guardPosition >= 0, `${file} belum memasang auth guard`);
    assert.ok(bodyPosition < 0 || guardPosition < bodyPosition, `${file} memuat guard setelah body`);
  }
});

function runAuthGuard(getSession, activeDeletionRequest = null) {
  const replacedUrls = [];
  const removedClasses = [];
  const authStateHandlers = [];
  const appendedElements = [];
  const windowListeners = new Map();
  const context = {
    console: { error() {} },
    document: {
      documentElement: {
        classList: {
          add() {},
          remove(className) {
            removedClasses.push(className);
          }
        }
      },
      body: {
        appendChild(element) {
          appendedElements.push(element);
        }
      }
    },
    URLSearchParams,
    window: {
      BIYADeletionGuard: {
        VERIFICATION_NOTICE: "Status akun belum bisa diverifikasi. Silakan coba login ulang.",
        async blockAndSignOutIfNeeded() {
          return activeDeletionRequest;
        },
        storeNotice() {}
      },
      BiyaAuth: {
        client: {
          auth: {
            onAuthStateChange(handler) {
              authStateHandlers.push(handler);
            }
          }
        },
        config: { loginPath: "/index.html" },
        getSession
      },
      location: {
        hash: "",
        pathname: "/modules/cost-management/costdashboard.html",
        replace(url) {
          replacedUrls.push(url);
        },
        search: ""
      },
      addEventListener(event, handler) {
        windowListeners.set(event, handler);
      }
    }
  };

  vm.runInNewContext(read("assets/js/auth-guard.js"), context);
  return {
    appendedElements,
    authStateHandlers,
    context,
    removedClasses,
    replacedUrls,
    windowListeners
  };
}

test("auth guard membuka halaman untuk sesi valid tanpa membuat tombol logout floating", async () => {
  const session = { user: { id: "user-1" } };
  const result = runAuthGuard(async () => session);
  await new Promise(setImmediate);

  assert.equal(result.context.window.BIYA_SESSION, session);
  assert.equal(result.context.window.BIYA_CURRENT_USER, session.user);
  assert.deepEqual(result.removedClasses, ["biya-auth-pending"]);
  assert.equal(result.appendedElements.length, 0);
  assert.equal(result.replacedUrls.length, 0);
  assert.doesNotMatch(read("assets/js/auth-guard.js"), /installLogout|data-biya-logout|biya-logout-button/);
  assert.doesNotMatch(read("assets/css/auth-guard.css"), /biya-logout-button/);
});

test("auth guard tetap mengarahkan sesi kosong dan event logout ke halaman login", async () => {
  const result = runAuthGuard(async () => null);
  await new Promise(setImmediate);

  assert.equal(result.authStateHandlers.length, 1);
  assert.equal(
    result.replacedUrls[0],
    "/index.html?redirect=%2Fmodules%2Fcost-management%2Fcostdashboard.html&reason=auth"
  );

  const signedInResult = runAuthGuard(async () => ({ user: { id: "user-1" } }));
  await new Promise(setImmediate);
  signedInResult.authStateHandlers[0]("SIGNED_OUT");
  assert.equal(
    signedInResult.replacedUrls[0],
    "/index.html?redirect=%2Fmodules%2Fcost-management%2Fcostdashboard.html&reason=logout"
  );
});

test("auth guard memblokir direct URL untuk akun dengan request penghapusan aktif", async () => {
  const session = { user: { id: "user-pending" } };
  const result = runAuthGuard(async () => session, { id: "delete-1", status: "pending" });
  await new Promise(setImmediate);

  assert.equal(result.context.window.BIYA_SESSION, undefined);
  assert.equal(result.removedClasses.length, 0);
  assert.equal(
    result.replacedUrls[0],
    "/index.html?redirect=%2Fmodules%2Fcost-management%2Fcostdashboard.html&reason=deletion"
  );
});

test("demo login menggunakan credential konfigurasi dan pesan kegagalan yang jelas", () => {
  const source = read("assets/js/login-page.js");
  assert.match(source, /demoEmail, demoPassword/);
  assert.match(source, /auth\.signIn\(demoEmail, demoPassword\)/);
  assert.match(source, /Akun demo belum dibuat di Supabase atau password demo tidak sesuai\. Silakan buat akun demo di Supabase Auth\./);
  assert.match(source, /setButtonLoading\(demoButton, true, "Menyiapkan demo…"\)/);
  assert.match(source, /setButtonLoading\(demoButton, false\)/);
});

test("credential demo default terpusat di konfigurasi auth", () => {
  const code = read("assets/js/biya-config.js");
  const context = { window: {} };
  vm.runInNewContext(code, context);

  assert.equal(context.window.BIYA_AUTH_CONFIG.demoEmail, "demo@biya.id");
  assert.equal(context.window.BIYA_AUTH_CONFIG.demoPassword, "BIYA-Demo-2026!");
  assert.ok(Object.isFrozen(context.window.BIYA_AUTH_CONFIG));
});

test("signIn meneruskan credential ke Supabase Auth tanpa bypass", async () => {
  let submittedCredentials;
  const client = {
    auth: {
      async signInWithPassword(credentials) {
        submittedCredentials = credentials;
        return { data: { session: { access_token: "test-token" } }, error: null };
      }
    }
  };
  const code = read("assets/js/biya-auth.js");
  const context = {
    window: {
      BIYA_AUTH_CONFIG: { dashboardPath: "/menu-modules/dashboard.html" },
      biyaSupabase: client,
      location: { origin: "https://biya.test", replace() {} }
    },
    URL
  };
  vm.runInNewContext(code, context);

  const result = await context.window.BiyaAuth.signIn(" demo@biya.id ", "BIYA-Demo-2026!");
  assert.equal(submittedCredentials.email, "demo@biya.id");
  assert.equal(submittedCredentials.password, "BIYA-Demo-2026!");
  assert.equal(result.session.access_token, "test-token");
});

test("klik Demo Login menjaga loading state dan menampilkan error Supabase yang jelas", async () => {
  let demoClick;
  let submittedCredentials;
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      const value = {
        id,
        className: "",
        dataset: {},
        disabled: false,
        hidden: false,
        textContent: "",
        value: "",
        addEventListener(type, handler) {
          if (id === "demoButton" && type === "click") demoClick = handler;
        },
        classList: { toggle() {} },
        focus() {},
        querySelector(selector) {
          if (selector !== "[data-button-label]") return null;
          if (!this.label) this.label = { textContent: id === "demoButton" ? "Demo Login" : "Button" };
          return this.label;
        },
        reset() {}
      };
      elements.set(id, value);
    }
    return elements.get(id);
  };
  const auth = {
    client: {},
    config: { demoEmail: "demo@biya.id", demoPassword: "BIYA-Demo-2026!" },
    friendlyAuthError: () => "Auth gagal",
    getSession: async () => null,
    safeRedirectTarget: () => "/menu-modules/dashboard.html",
    signIn: async (email, password) => {
      submittedCredentials = { email, password };
      throw new Error("Invalid login credentials");
    },
    validateCredentials: () => ""
  };
  const context = {
    console: { error() {} },
    document: {
      getElementById: element,
      querySelectorAll: () => [],
      title: ""
    },
    requestAnimationFrame: (callback) => callback(),
    URLSearchParams,
    window: {
      BIYADeletionGuard: {
        BLOCKED_NOTE: "Jika ini tidak disengaja, hubungi admin BIYA untuk membatalkan permintaan hapus akun.",
        BLOCKED_NOTICE: "Akun ini sedang menunggu proses penghapusan dan tidak dapat mengakses BIYA.",
        NOTICE_STORAGE_KEY: "biya_auth_notice",
        VERIFICATION_NOTICE: "Status akun belum bisa diverifikasi. Silakan coba login ulang.",
        async blockAndSignOutIfNeeded() {
          return null;
        }
      },
      BiyaAuth: auth,
      history: { replaceState() {} },
      location: {
        hash: "",
        origin: "https://biya.test",
        pathname: "/index.html",
        replace() {},
        search: ""
      },
      sessionStorage: {
        getItem() { return null; },
        removeItem() {}
      }
    }
  };

  vm.runInNewContext(read("assets/js/login-page.js"), context);
  assert.equal(typeof demoClick, "function");
  await demoClick();

  assert.deepEqual(submittedCredentials, {
    email: "demo@biya.id",
    password: "BIYA-Demo-2026!"
  });
  assert.equal(
    element("loginStatus").textContent,
    "Akun demo belum dibuat di Supabase atau password demo tidak sesuai. Silakan buat akun demo di Supabase Auth."
  );
  assert.equal(element("demoButton").disabled, false);
  assert.equal(element("demoButton").label.textContent, "Demo Login");
});
