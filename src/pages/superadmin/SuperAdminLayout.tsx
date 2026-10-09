import useSidebar from '../../components/useSidebar';
// TypeScript page component.

import { Outlet, useNavigate } from 'react-router-dom';
import SuperAdminSidebar from '../../components/SuperAdminSidebar';
import { IconMenu, IconLogout } from '../../components/icons';
import { logoutSuperAdmin } from '../../lib/superAdminAuth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function SuperAdminLayout() {
  const { t } = useTranslation();
  const { isMobile, visible: sidebarVisible, toggle, close } = useSidebar();
  const navigate = useNavigate();

  function handleLogout() {
    logoutSuperAdmin();
    navigate('/superadmin/login', { replace: true });
  }

  return (
    <div className="sa-theme">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="header-btn" onClick={toggle} aria-expanded={sidebarVisible} aria-label={t("header.toggleMenu")} title={t('header.toggleMenu')}>
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
        <SuperAdminSidebar visible={sidebarVisible} mobile={isMobile} />
        {isMobile && sidebarVisible && <button type="button" className="sidebar-backdrop" aria-label={t("wording.close")} onClick={close} />}
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
