import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

type TenantAuth = {
  id?: number;
  user_type?: string;
};

function getTenantAuth(): TenantAuth | null {
  try {
    const raw = window.localStorage.getItem("auth");
    return raw ? (JSON.parse(raw) as TenantAuth) : null;
  } catch {
    return null;
  }
}

export default function RequireTenantAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const auth = getTenantAuth();

  if (!auth?.id) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (auth.user_type?.toUpperCase() === "SUPERADMIN") {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  return children;
}
