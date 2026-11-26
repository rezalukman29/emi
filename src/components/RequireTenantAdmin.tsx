import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isTenantAdminUser } from '../lib/tenantUser';

export default function RequireTenantAdmin({ children }: { children: ReactNode }) {
  return isTenantAdminUser() ? children : <Navigate to="/dashboard" replace />;
}
