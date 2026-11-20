// Small helpers around the tenant login stored in localStorage("auth").

interface StoredTenantAuth {
  fullname?: string;
  user_type?: string;
  is_admin?: number;
}

function readAuth(): StoredTenantAuth | null {
  try {
    const raw = window.localStorage.getItem('auth');
    return raw ? (JSON.parse(raw) as StoredTenantAuth) : null;
  } catch {
    return null;
  }
}

export function isTenantAdminUser() {
  const auth = readAuth();
  return auth?.user_type?.toUpperCase() === 'ADMIN' || auth?.is_admin === 1;
}

export function currentUserName(fallback = 'You') {
  return readAuth()?.fullname?.trim() || fallback;
}
