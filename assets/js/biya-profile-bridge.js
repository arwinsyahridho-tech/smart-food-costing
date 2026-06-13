((global) => {
  "use strict";

  const FALLBACK = Object.freeze({
    displayName: "User BIYA",
    subtitle: "Akun BIYA"
  });

  function firstText(...values) {
    const match = values.find((value) => typeof value === "string" && value.trim());
    return match ? match.trim() : "";
  }

  function assertUserId(userId) {
    if (!userId) throw new Error("User ID tidak tersedia untuk memuat profil BIYA.");
  }

  async function getAccountProfile(supabaseClient, userId) {
    assertUserId(userId);
    if (!supabaseClient || typeof supabaseClient.from !== "function") return null;

    const { data, error } = await supabaseClient
      .from("account_profiles")
      .select("full_name, phone, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[BIYA] Account profile belum tersedia, memakai fallback.", error);
      return null;
    }

    return data || null;
  }

  async function getBusinessProfile(supabaseClient, userId) {
    assertUserId(userId);
    if (!supabaseClient || typeof supabaseClient.from !== "function") return null;

    const { data, error } = await supabaseClient
      .from("business_profiles")
      .select("business_name, business_type, owner_name, city, province")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[BIYA] Business profile belum tersedia, memakai fallback.", error);
      return null;
    }

    return data || null;
  }

  function getDisplayAccountInfo(user, accountProfile, businessProfile) {
    const metadata = (user && user.user_metadata) || {};
    const email = firstText(user && user.email);
    const emailName = email ? email.split("@")[0] : "";
    const accountName = firstText(accountProfile && accountProfile.full_name);
    const businessName = firstText(businessProfile && businessProfile.business_name);

    return {
      displayName: firstText(
        accountName,
        metadata.name,
        metadata.full_name,
        emailName,
        FALLBACK.displayName
      ),
      subtitle: firstText(
        businessName,
        accountName,
        email,
        FALLBACK.subtitle
      ),
      hasBusinessName: Boolean(businessName)
    };
  }

  global.BiyaProfileBridge = Object.freeze({
    FALLBACK,
    getAccountProfile,
    getBusinessProfile,
    getDisplayAccountInfo
  });
})(typeof window !== "undefined" ? window : globalThis);
