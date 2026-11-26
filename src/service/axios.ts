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
      } catch {
        configuration.headers["User-Id"] = 8;
      }
    } else {
      configuration.headers["User-Id"] = 8;
    }
    return configuration;
  },
  (error: any) => {
    Promise.reject(error);
  },
);

// Session expired / not accepted: go to login with a message and come back afterwards (UX review 2026-11-26, REG-02).
ax.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/superadmin")) {
      try {
        window.sessionStorage.setItem("emi.returnTo", window.location.pathname + window.location.search);
        window.localStorage.removeItem("auth");
      } catch { /* storage blocked */ }
      window.location.assign("/login?expired=1");
    }
    return Promise.reject(error);
  },
);

export default ax;
