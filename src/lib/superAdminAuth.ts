const AUTH_KEY = "emi_superadmin_auth";

export function isSuperAdminAuthed() {
  if (localStorage.getItem(AUTH_KEY) !== "true") return false;
  try {
    const auth = JSON.parse(localStorage.getItem("auth") || "null");
    return Boolean(
      auth?.id
      && auth?.email
      && auth?.token
      && auth?.user_type === "SUPERADMIN"
    );
  } catch {
    return false;
  }
}

export function markSuperAdminAuthed() {
  localStorage.setItem(AUTH_KEY, "true");
}

export function logoutSuperAdmin() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem("auth");
}
