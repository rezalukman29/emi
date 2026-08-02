// TypeScript page component.
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import SuperAdminSidebar from '../../components/SuperAdminSidebar';
import { IconMenu, IconLogout } from '../../components/icons';
import { logoutSuperAdmin } from '../../lib/superAdminAuth';

export default function SuperAdminLayout() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const navigate = useNavigate();

  function handleLogout() {
    logoutSuperAdmin();
    navigate('/superadmin/login', { replace: true });
  }

  return (
    <div className="sa-theme">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="header-btn" onClick={() => setSidebarVisible(v => !v)} title="Toggle menu">
            <IconMenu />
          </button>
          <span className="header-title">SaaS Owner Panel</span>
        </div>
        <button className="header-btn" title="Logout" onClick={handleLogout}>
          <IconLogout />
        </button>
      </header>
      <div className="layout">
        <SuperAdminSidebar visible={sidebarVisible} />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
