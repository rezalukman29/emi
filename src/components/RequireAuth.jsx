import { Navigate, useLocation } from 'react-router-dom';
import { isSuperAdminAuthed } from '../lib/superAdminAuth';

export default function RequireAuth({ children }) {
  const location = useLocation();
  if (!isSuperAdminAuthed()) {
    return <Navigate to="/superadmin/login" replace state={{ from: location }} />;
  }
  return children;
}
