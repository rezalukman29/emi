import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconGrid, IconUsers, IconCreditCard, IconTag, IconLayers, IconRuler } from './icons';

const SECTIONS = [
  {
    label: 'Owner Panel',
    items: [
      { to: '/superadmin/dashboard', label: 'Dashboard',    icon: <IconGrid /> },
      { to: '/superadmin/customers', label: 'Customers',    icon: <IconUsers /> },
      { to: '/superadmin/users',     label: 'Users',        icon: <IconUsers /> },
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

const SECTION_TRANSLATION_KEYS = {
  'Owner Panel': 'navigation.sections.ownerPanel',
  CMS: 'navigation.sections.cms',
};

const ITEM_TRANSLATION_KEYS = {
  Dashboard: 'navigation.items.dashboard',
  Customers: 'navigation.items.customers',
  Users: 'navigation.items.users',
  Payments: 'navigation.items.payments',
  'Pricing Plans': 'navigation.items.pricingPlans',
  'Default Categories': 'navigation.items.defaultCategories',
  'Default Units': 'navigation.items.defaultUnits',
};

export default function SuperAdminSidebar({ visible }) {
  const { t } = useTranslation();
  return (
    <nav className="sidebar" style={visible ? {} : { display: 'none' }}>
      {SECTIONS.map(section => (
        <div key={section.label} className="sidebar-section">
          <div className="sidebar-section-label">
            {t(SECTION_TRANSLATION_KEYS[section.label] ?? section.label)}
          </div>
          {section.items.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              {icon}
              <span>{t(ITEM_TRANSLATION_KEYS[label] ?? label)}</span>
            </NavLink>
          ))}
        </div>
      ))}
      <div className="sidebar-version">{t('navigation.saasOwner')}</div>
    </nav>
  );
}
