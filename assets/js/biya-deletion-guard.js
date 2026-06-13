(() => {
  "use strict";

  const ACTIVE_STATUSES = Object.freeze(["pending", "processing", "completed"]);
  const BLOCKED_NOTICE = "Akun ini sedang menunggu proses penghapusan dan tidak dapat mengakses BIYA.";
  const BLOCKED_NOTE = "Jika ini tidak disengaja, hubungi admin BIYA untuk membatalkan permintaan hapus akun.";
  const VERIFICATION_NOTICE = "Status akun belum bisa diverifikasi. Silakan coba login ulang.";
  const NOTICE_STORAGE_KEY = "biya_auth_notice";

  function assertInputs(supabaseClient, userId) {
    if (!supabaseClient || typeof supabaseClient.from !== "function") {
      throw new Error("Supabase client tidak tersedia untuk memeriksa status penghapusan akun.");
    }
    if (!userId) {
      throw new Error("User ID tidak tersedia untuk memeriksa status penghapusan akun.");
    }
  }

  async function getActiveDeletionRequest(supabaseClient, userId) {
    assertInputs(supabaseClient, userId);

    const { data, error } = await supabaseClient
      .from("account_deletion_requests")
      .select("id, user_id, email, status, requested_at")
      .eq("user_id", userId)
      .in("status", ACTIVE_STATUSES)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function hasActiveDeletionRequest(supabaseClient, userId) {
    return Boolean(await getActiveDeletionRequest(supabaseClient, userId));
  }

  function storeNotice(message) {
    try {
      window.sessionStorage.setItem(NOTICE_STORAGE_KEY, message);
    } catch (error) {
      console.error("[BIYA Deletion Guard] Gagal menyimpan pemberitahuan autentikasi", error);
    }
  }

  async function blockAndSignOutIfNeeded(supabaseClient, userId, options = {}) {
    const request = await getActiveDeletionRequest(supabaseClient, userId);
    if (!request) return null;

    const message = options.notice || `${BLOCKED_NOTICE}\n${BLOCKED_NOTE}`;
    if (options.storeNotice !== false) storeNotice(message);

    if (!supabaseClient.auth || typeof supabaseClient.auth.signOut !== "function") {
      throw new Error("Supabase Auth tidak tersedia untuk mengakhiri sesi akun yang diblokir.");
    }

    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    return request;
  }

  window.BIYADeletionGuard = Object.freeze({
    ACTIVE_STATUSES,
    BLOCKED_NOTICE,
    BLOCKED_NOTE,
    NOTICE_STORAGE_KEY,
    VERIFICATION_NOTICE,
    blockAndSignOutIfNeeded,
    getActiveDeletionRequest,
    hasActiveDeletionRequest,
    storeNotice
  });
})();
