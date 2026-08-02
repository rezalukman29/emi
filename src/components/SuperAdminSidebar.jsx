import { NavLink } from 'react-router-dom';
import { IconGrid, IconUsers, IconCreditCard, IconTag, IconLayers, IconRuler } from './icons';

const SECTIONS = [
  {
    label: 'Owner Panel',
    items: [
      { to: '/superadmin/dashboard', label: 'Dashboard',    icon: <IconGrid /> },
      { to: '/superadmin/customers', label: 'Customers',    icon: <IconUsers /> },
      { to: '/superadmin/payments',  label: 'Payments',      icon: <IconCreditCard /> },
      { to: '/superadmin/pricing',   label: 'Pricing Plans', icon: <IconTag /> },
    ],
  },
  {
    label: 'CMS',
    items: [
      { to: '/superadmin/categories', label: 'Default Categories', icon: <IconLayers /> },
      { to: '/superadmin/units',      label: 'Default Units',      icon: <IconRuler /> },
    ],
  },
];

export default function SuperAdminSidebar({ visible }) {
  return (
    <nav className="sidebar" style={visible ? {} : { display: 'none' }}>
      {SECTIONS.map(section => (
        <div key={section.label} className="sidebar-section">
          <div className="sidebar-section-label">{section.label}</div>
          {section.items.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      ))}
      <div className="sidebar-version">SaaS Owner</div>
    </nav>
  );
}
