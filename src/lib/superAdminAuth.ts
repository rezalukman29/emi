const AUTH_KEY = 'emi_superadmin_auth';

const DEMO_CREDENTIALS = {
  email: 'owner@emi-saas.com',
  password: 'Owner@123',
};

export const DEMO_LOGIN_HINT = `${DEMO_CREDENTIALS.email} / ${DEMO_CREDENTIALS.password}`;

export function isSuperAdminAuthed() {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function loginSuperAdmin(email: string, password: string) {
  const ok = email.trim().toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password;
  if (ok) localStorage.setItem(AUTH_KEY, 'true');
  return ok;
}

export function logoutSuperAdmin() {
  localStorage.removeItem(AUTH_KEY);
}
