import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import BuildInfo from './BuildInfo';
import useUserPlanController, {
  type UserPlanFeatureFlags,
} from '../hooks/useUserPlanController';

export const ROUTE_FEATURES: Partial<Record<string, keyof UserPlanFeatureFlags>> = {
  '/loan': 'item_loan_price',
  '/loan-vendor-detail': 'item_loan_price',
  '/outsource': 'item_loan_price',
  '/outsource-vendor-detail': 'item_loan_price',
  '/event-calendar': 'event_management_price',
  '/event-report': 'reports_dashboard_price',
  '/stock-opname-report': 'reports_dashboard_price',
  '/dashboard': 'reports_dashboard_price',
  '/event': 'event_management_price',
  '/event-checklist': 'event_management_price',
  '/event-checklist-settings': 'event_management_price',
  '/event-detail': 'event_management_price',
  '/event-summary': 'event_management_price',
  '/event-status': 'event_management_price',
  '/event-inventory': 'event_management_price',
  '/area': 'event_management_price',
  '/area-detail': 'event_management_price',
  '/sub-area': 'event_management_price',
  '/inventory': 'inventory_management_price',
  '/inventory-detail': 'inventory_management_price',
  '/sync-inventory': 'inventory_management_price',
  '/category': 'inventory_management_price',
  '/category-detail': 'inventory_management_price',
  '/unit': 'inventory_management_price',
  '/unit-detail': 'inventory_management_price',
  '/warehouse': 'warehouse_management_price',
  '/warehouse-detail': 'warehouse_management_price',
  '/warehouse-inventory': 'warehouse_management_price',
  '/stock-opname': 'warehouse_management_price',
  '/qr-code': 'qr_scanning_price',
  '/inventory-report': 'reports_dashboard_price',
  '/overview-report': 'reports_dashboard_price',
  '/item-loan': 'item_loan_price',
  '/item-loan-detail': 'item_loan_price',
  '/ai-material-analyzer': 'ai_analyzer_price',
};

const LANDING_ROUTES: Array<{
  to: string;
  feature?: keyof UserPlanFeatureFlags;
}> = [
  { to: '/dashboard', feature: 'reports_dashboard_price' },
  { to: '/event', feature: 'event_management_price' },
  { to: '/inventory', feature: 'inventory_management_price' },
  { to: '/warehouse', feature: 'warehouse_management_price' },
  { to: '/loan', feature: 'item_loan_price' },
  { to: '/outsource', feature: 'item_loan_price' },
  { to: '/qr-code', feature: 'qr_scanning_price' },
  { to: '/ai-material-analyzer', feature: 'ai_analyzer_price' },
  { to: '/log' },
];

export function getRequiredFeatureForPath(pathname: string) {
  const matchingRoute = Object.keys(ROUTE_FEATURES)
    .sort((left, right) => right.length - left.length)
    .find((route) => pathname === route || pathname.startsWith(`${route}/`));

  return matchingRoute ? ROUTE_FEATURES[matchingRoute] : undefined;
}

export function getFirstAccessibleRoute(features: UserPlanFeatureFlags) {
  return (
    LANDING_ROUTES.find(
      ({ feature }) => !feature || features[feature],
    )?.to ?? '/log'
  );
}

/** A menu link, or a parent that groups links one level deeper (nested menu, 2026-11-22). */
interface NavLeaf { to: string; label: string; icon: ReactNode }
interface NavParent { key: string; label: string; icon: ReactNode; children: NavLeaf[] }
type NavEntry = NavLeaf | NavParent;
interface NavSection { label: string; items: NavEntry[] }
const isParent = (entry: NavEntry): entry is NavParent => 'children' in entry;
const leavesOf = (entry: NavEntry): NavLeaf[] => (isParent(entry) ? entry.children : [entry]);

const VENDORS_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const SETTINGS_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;

const SECTIONS: NavSection[] = [
    {
    label: 'Home',
    items: [
      { to: '/dashboard', label: 'Dashboard',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    ],
  },
  {
    label: 'Events',
    items: [
      { to: '/event-calendar', label: 'Event Calendar',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg> },
      { to: '/event', label: 'Event',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
      { to: '/event-checklist', label: 'Event Checklist',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/inventory', label: 'Inventory',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
      { to: '/warehouse', label: 'Warehouse',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
      { to: '/warehouse-inventory', label: 'Warehouse Inventory',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg> },
      { to: '/event-inventory', label: 'Event Inventory',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
      { to: '/sync-inventory', label: 'Sync Inventory',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg> },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { to: '/area', label: 'Area',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
      { to: '/sub-area', label: 'Sub Area',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/><path d="M4 6h1M4 12h5M4 18h1"/></svg> },
      { to: '/category', label: 'Category',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 10h16M4 14h10M4 18h6"/></svg> },
      { to: '/unit', label: 'Unit',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
      { key: 'vendors', label: 'Vendors', icon: VENDORS_ICON, children: [
        { to: '/vendor', label: 'Production',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg> },
        { to: '/loan', label: 'Rent',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/></svg> },
        { to: '/outsource', label: 'Outsource',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
      ] },
      { to: '/qr-code', label: 'QR Code',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M14 17h3v3M17 14h3"/></svg> },
    ],
  },
    {
    label: 'Report',
    items: [
      { to: '/event-report', label: 'Event Report',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 16 11 13 13 15 16 12"/></svg> },
      { to: '/stock-opname-report', label: 'Stock Opname Report',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg> },
      { to: '/inventory-report', label: 'Inventory Report',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h1M9 17h1M14 13h1M14 17h1"/></svg> },
      { to: '/overview-report', label: 'Overview Report',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { to: '/ai-material-analyzer', label: 'Material Analyzer',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg> },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/log', label: 'Log',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
      { to: '/users', label: 'Users',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
      { to: '/prd', label: 'Product Knowledge',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
    ],
  },
];

const EVENT_SETTINGS_ITEM = {
  to: '/event-status',
  label: 'Event Settings',
  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z"/></svg>,
};

const CHECKLIST_SETTINGS_ITEM = {
  to: '/event-checklist-settings',
  label: 'Checklist Settings',
  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
};

/** Admin-only settings, nested under Events → Settings. */
const SETTINGS_PARENT = (): NavParent => ({ key: 'event-settings', label: 'Settings', icon: SETTINGS_ICON, children: [EVENT_SETTINGS_ITEM, CHECKLIST_SETTINGS_ITEM] });

const SIDEBAR_STATE_KEY = 'emi.sidebar.open.v1';
/** Groups open on a first visit even when the current page is elsewhere (owner, 2026-11-22). */
const DEFAULT_OPEN = new Set(['Events']);
function readOpenState(): Record<string, boolean> {
  try { return JSON.parse(window.localStorage.getItem(SIDEBAR_STATE_KEY) || '{}') as Record<string, boolean>; } catch { return {}; }
}
/** The current page belongs to this link (also its detail pages, e.g. /event-detail for /event). */
function isOnRoute(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`) || pathname.startsWith(`${to}-`);
}
const Chevron = ({ open }: { open: boolean }) => (
  <svg className={`sidebar-chevron${open ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18" /></svg>
);

const SECTION_TRANSLATION_KEYS: Record<string, string> = {
  Home: 'navigation.sections.home',
  Events: 'navigation.sections.events',
  Inventory: 'navigation.sections.inventory',
  'Master Data': 'navigation.sections.masterData',
  Report: 'navigation.sections.report',
  'AI Tools': 'navigation.sections.aiTools',
  System: 'navigation.sections.system',
};

const ITEM_TRANSLATION_KEYS: Record<string, string> = {
  Production: 'navigation.items.production',
  Rent: 'navigation.items.rent',
  Outsource: 'navigation.items.outsource',
  'Event Calendar': 'october.calendar',
  'Event Report': 'wording.eventSummary',
  'Stock Opname Report': 'october.opnameReport',
  Dashboard: 'navigation.items.dashboard',
  Event: 'navigation.items.event',
  'Event Settings': 'navigation.items.eventSettings',
  'Event Checklist': 'navigation.items.eventChecklist',
  'Checklist Settings': 'navigation.items.checklistSettings',
  Inventory: 'navigation.items.inventory',
  Warehouse: 'navigation.items.warehouse',
  'Warehouse Inventory': 'navigation.items.warehouseInventory',
  'Event Inventory': 'navigation.items.eventInventory',
  'Sync Inventory': 'navigation.items.syncInventory',
  'Item Loan': 'navigation.items.itemLoan',
  Area: 'navigation.items.area',
  'Sub Area': 'navigation.items.subArea',
  Category: 'navigation.items.category',
  Unit: 'navigation.items.unit',
  'QR Code': 'navigation.items.qrCode',
  'Inventory Report': 'navigation.items.inventoryReport',
  'Overview Report': 'navigation.items.overviewReport',
  'Material Analyzer': 'navigation.items.materialAnalyzer',
  Log: 'navigation.items.log',
  Users: 'navigation.items.users',
  'Product Knowledge': 'navigation.items.productKnowledge',
  Vendors: 'navigation.items.vendors',
  Settings: 'navigation.items.settings',
};

function isTenantAdmin() {
  try {
    const raw = window.localStorage.getItem('auth');
    if (!raw) return false;
    const auth = JSON.parse(raw) as { user_type?: string; is_admin?: number };
    return auth.user_type?.toUpperCase() === 'ADMIN' || auth.is_admin === 1;
  } catch {
    return false;
  }
}

export default function Sidebar({ visible, mobile = false }: { visible: boolean; mobile?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [openState, setOpenState] = useState<Record<string, boolean>>(readOpenState);
  const [menuQuery, setMenuQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const enabledFeatures = useUserPlanController();
  const allowed = (leaf: NavLeaf) => {
    const requiredFeature = ROUTE_FEATURES[leaf.to];
    return !requiredFeature || enabledFeatures[requiredFeature];
  };
  const sections: NavSection[] = SECTIONS.map((section) => {
    if (section.label !== 'Events' || !isTenantAdmin()) return section;
    return { ...section, items: [...section.items, SETTINGS_PARENT()] };
  })
    .map((section) => ({
      ...section,
      items: section.items
        .map((entry): NavEntry | null => {
          if (!isParent(entry)) return allowed(entry) ? entry : null;
          const children = entry.children.filter(allowed);
          return children.length ? { ...entry, children } : null;
        })
        .filter((entry): entry is NavEntry => entry !== null),
    }))
    .filter((section) => section.items.length > 0);
  const label = (entry: { label: string }) => t(ITEM_TRANSLATION_KEYS[entry.label] ?? entry.label);

  const normalizedQuery = menuQuery.trim().toLowerCase();
  const shownSections = sections
    .map((section) => {
      const translatedLabel = t(SECTION_TRANSLATION_KEYS[section.label] ?? section.label);
      const sectionMatches = translatedLabel.toLowerCase().includes(normalizedQuery);
      const matches = (entry: { label: string }) => label(entry).toLowerCase().includes(normalizedQuery);
      const items = !normalizedQuery || sectionMatches
        ? section.items
        : section.items
            .map((entry): NavEntry | null => {
              if (!isParent(entry)) return matches(entry) ? entry : null;
              if (matches(entry)) return entry;
              const children = entry.children.filter(matches);
              return children.length ? { ...entry, children } : null;
            })
            .filter((entry): entry is NavEntry => entry !== null);
      return { ...section, translatedLabel, items };
    })
    .filter((section) => section.items.length > 0);

  const firstLeaf = shownSections[0]?.items[0] ? leavesOf(shownSections[0].items[0])[0] : undefined;
  // Open = what the user chose; otherwise open when it holds the current page. Search opens everything.
  const isOpen = (key: string, entries: NavEntry[]) => {
    if (normalizedQuery) return true;
    if (key in openState) return openState[key];
    if (DEFAULT_OPEN.has(key)) return true;
    return entries.some((entry) => leavesOf(entry).some((leaf) => isOnRoute(pathname, leaf.to)));
  };
  const toggle = (key: string, open: boolean) =>
    setOpenState((current) => {
      const next = { ...current, [key]: !open };
      try { window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  // Navigating into a closed group (search, link, back button) opens it again.
  useEffect(() => {
    setOpenState((current) => {
      let changed = false;
      const next = { ...current };
      for (const section of SECTIONS) {
        const entries = section.label === 'Events' ? [...section.items, SETTINGS_PARENT()] : section.items;
        for (const entry of entries) {
          const here = leavesOf(entry).some((leaf) => isOnRoute(pathname, leaf.to));
          if (!here) continue;
          if (next[section.label] === false) { next[section.label] = true; changed = true; }
          if (isParent(entry) && next[entry.key] === false) { next[entry.key] = true; changed = true; }
        }
      }
      return changed ? next : current;
    });
  }, [pathname]);

  const renderLeaf = ({ to, icon, label: text }: NavLeaf, nested = false) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) => 'nav-item' + (nested ? ' nav-item-child' : '') + (isActive ? ' active' : '')}
    >
      {icon}
      <span>{t(ITEM_TRANSLATION_KEYS[text] ?? text)}</span>
    </NavLink>
  );

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        !visible ||
        event.key !== '/' ||
        !(target instanceof HTMLElement) ||
        target.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      event.preventDefault();
      searchRef.current?.focus();
    };

    document.addEventListener('keydown', focusSearch);
    return () => document.removeEventListener('keydown', focusSearch);
  }, [visible]);

  return (
    <nav className={`sidebar${mobile ? " sidebar-mobile" : ""}`} style={visible ? {} : { display: 'none' }}>
      <div className="sidebar-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input
          ref={searchRef}
          type="search"
          placeholder={t('navigation.menuSearch')}
          aria-label={t('navigation.menuSearch')}
          value={menuQuery}
          onChange={(event) => setMenuQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && firstLeaf) {
              event.preventDefault();
              navigate(firstLeaf.to);
              setMenuQuery('');
            }
            if (event.key === 'Escape' && menuQuery) {
              event.preventDefault();
              event.stopPropagation();
              setMenuQuery('');
            }
          }}
        />
        {!menuQuery && <kbd aria-hidden="true">/</kbd>}
      </div>
      {shownSections.length === 0 && (
        <div className="sidebar-empty">
          {t('navigation.noMenuMatches', { query: menuQuery })}
        </div>
      )}
      {shownSections.map(section => {
        // A one-link section (Home, AI Tools) is not worth folding.
        const foldable = section.items.length > 1 || isParent(section.items[0]);
        const open = !foldable || isOpen(section.label, section.items);
        const sectionId = `sidebar-sec-${section.label.replace(/\W+/g, '-').toLowerCase()}`;
        return (
          <div key={section.label} className={`sidebar-section${foldable ? ' foldable' : ''}`}>
            {foldable ? (
              <button type="button" className="sidebar-section-label sidebar-group-toggle" aria-expanded={open} aria-controls={sectionId} onClick={() => toggle(section.label, open)}>
                <span>{section.translatedLabel}</span>
                <Chevron open={open} />
              </button>
            ) : (
              <div className="sidebar-section-label">{section.translatedLabel}</div>
            )}
            {open && (
              <div id={sectionId} className="sidebar-section-items">
                {section.items.map((entry) => {
                  if (!isParent(entry)) return renderLeaf(entry);
                  const childOpen = isOpen(entry.key, [entry]);
                  const childActive = entry.children.some((leaf) => isOnRoute(pathname, leaf.to));
                  const groupId = `sidebar-sub-${entry.key}`;
                  return (
                    <div key={entry.key} className="sidebar-subgroup">
                      <button type="button" className={`nav-item nav-parent${childActive && !childOpen ? ' has-active' : ''}`} aria-expanded={childOpen} aria-controls={groupId} onClick={() => toggle(entry.key, childOpen)}>
                        {entry.icon}
                        <span>{label(entry)}</span>
                        <Chevron open={childOpen} />
                      </button>
                      {childOpen && (
                        <div id={groupId} className="sidebar-children">
                          {entry.children.map((leaf) => renderLeaf(leaf, true))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div className="sidebar-footer">
        <Link to="/superadmin/login" className="nav-item sidebar-owner-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>{t('navigation.sections.ownerPanel')}</span>
        </Link>
        <BuildInfo />
      </div>
    </nav>
  );
}
