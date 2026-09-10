// TypeScript page component.
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import SuperAdminSidebar from '../../components/SuperAdminSidebar';
import { IconMenu, IconLogout } from '../../components/icons';
import { logoutSuperAdmin } from '../../lib/superAdminAuth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function SuperAdminLayout() {
  const { t } = useTranslation();
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
          <button className="header-btn" onClick={() => setSidebarVisible(v => !v)} title={t('header.toggleMenu')}>
            <IconMenu />
          </button>
          <span className="header-title">{t('auth.ownerPanel')}</span>
        </div>
        <div className="header-actions">
          <LanguageSwitcher />
          <button className="header-btn" title={t('header.logout')} onClick={handleLogout}>
            <IconLogout />
          </button>
        </div>
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
