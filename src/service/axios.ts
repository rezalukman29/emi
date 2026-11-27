import axios from "axios";
import { localStorageService } from "./localStorage";

const ax = axios.create({
  baseURL:
    (import.meta.env.VITE_BACKEND_URL as string) ||
    "https://booqable-staging.emi.web.id",
});

ax.interceptors.request.use(
  async (configuration: any) => {
    const auth = localStorageService.getAuth("auth");
    if (!(configuration.data instanceof FormData)) {
      configuration.headers["Content-Type"] = "application/json";
    }
    if (auth) {
      try {
        const parsedAuth = JSON.parse(auth);
        if (parsedAuth.user_type === "SUPERADMIN") {
          configuration.headers["SuperAdmin-Id"] = parsedAuth.id;
          configuration.headers["SuperAdmin-Token"] = parsedAuth.token;
        } else {
          configuration.headers["User-Id"] = parsedAuth.id;
          configuration.headers["User-Token"] = parsedAuth.token;
        }
      } catch { /* Invalid stored sessions are handled by the route guard. */ }
    }
    return configuration;
  },
  (error: any) => {
    return Promise.reject(error);
  },
);

ax.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401) {
    const isSuperAdmin = window.location.pathname.startsWith('/superadmin');
    const loginPath = isSuperAdmin ? '/superadmin/login' : '/login';
    if (window.location.pathname !== loginPath && !window.location.pathname.startsWith('/forgot-password')) {
      localStorage.removeItem('auth');
      if (isSuperAdmin) localStorage.removeItem('emi_superadmin_auth');
      sessionStorage.setItem('emi.returnTo', window.location.pathname + window.location.search + window.location.hash);
      window.location.assign(`${loginPath}?expired=1`);
    }
  }
  return Promise.reject(error);
});

export default ax;
