import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { IconMenu, IconLogout } from './icons';

export default function Layout() {
  const [sidebarVisible, setSidebarVisible] = useState(true);

  return (
    <>
      <header className="header">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button className="header-btn" onClick={() => setSidebarVisible(v => !v)} title="Toggle menu">
            <IconMenu />
          </button>
          <span className="header-title">EMI Inventory</span>
        </div>
        <button className="header-btn" title="Logout">
          <IconLogout />
        </button>
      </header>
      <div className="layout">
        <Sidebar visible={sidebarVisible} />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
