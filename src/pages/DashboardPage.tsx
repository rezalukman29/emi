import { useNavigate } from 'react-router-dom';
import { inventoryData } from '../data/inventory';
import useGetDashboard from '../hooks/api/useGetDashboard';
import { useTranslation } from "react-i18next";
import { formatLocalDate, getDateLocale, translateApiValue } from "../utils/function";

function fmtDate(d: string | null | undefined) {
  return formatLocalDate(d);
}

function fmtToday(d: Date) {
  return new Intl.DateTimeFormat(getDateLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function daysUntil(date: string) {
  const parsedDate = new Date(date.replace(' ', 'T'));
  if (Number.isNaN(parsedDate.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((parsedDate.getTime() - today.getTime()) / 86400000));
}

function stockBadgeClass(status: string) {
  const normalized = status.toLowerCase().replace(/_/g, ' ');
  if (normalized === 'low stock') return 'badge-orange';
  if (normalized === 'out of stock') return 'badge-red';
  return 'badge-green';
}

function pct(n: number, total: number) {
  return total === 0 ? 0 : (n / total) * 100;
}

const MODULE_DOT: Record<string, string> = {
  Event: 'var(--brand)', Inventory: 'var(--green)', 'Item Loan': 'var(--purple)',
  'Warehouse Inventory': 'var(--orange)', Warehouse: 'var(--red)', System: 'var(--text-muted)',
  Category: 'var(--blue, var(--brand))', Unit: 'var(--blue, var(--brand))', Area: 'var(--blue, var(--brand))',
};

const QUICK_ACTIONS = [
  { to: '/event', labelKey: 'dashboardActions.createEvent', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg> },
  { to: '/inventory', labelKey: 'dashboardActions.addInventory', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
  { to: '/item-loan', labelKey: 'dashboardActions.loanItem', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { to: '/stock-opname', labelKey: 'dashboardActions.stockOpname', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg> },
];

export default function MainDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: response, isLoading, isError } = useGetDashboard();
  const dashboard = response?.data;
  const summary = dashboard?.summary;
  const upcomingEvents = dashboard?.upcoming_events ?? [];
  const needsAttention = dashboard?.needs_attention ?? [];
  const warehouseBreakdown = dashboard?.stock_by_warehouse ?? [];
  const recentActivity = dashboard?.recent_activity ?? [];
  const categoryBreakdown = dashboard?.stock_by_category ?? [];
  const maxDaysAway = Math.max(...upcomingEvents.map(ev => daysUntil(ev.event_start)), 1);
  const nextEvent = upcomingEvents[0];

  // Stock Health intentionally still uses dummy data until BE provides it.
  const lowStock = inventoryData.filter(i => i.stockStatus === 'Low Stock');
  const outOfStock = inventoryData.filter(i => i.stockStatus === 'Out of Stock');
  const availableCount = inventoryData.length - lowStock.length - outOfStock.length;
  const maxCategoryStock = Math.max(...categoryBreakdown.map(item => item.total_stock), 1);
  const maxWarehouseStock = Math.max(...warehouseBreakdown.map(item => item.total_stock), 1);

  return (
    <>
      <div className="dash-hero">
        <div>
          <div className="dash-hero-title">{t("wording.welcomeBack")}</div>
          <div className="dash-hero-sub">
            {t("wording.youHave")} <strong>{summary?.upcoming_count ?? 0} {t("wording.upcomingEventsInline")}</strong>
            {nextEvent && <> {t("wording.theNearestIs")} <strong>{nextEvent.name}</strong> {t("wording.in")} {daysUntil(nextEvent.event_start)} {t("wording.days")}</>}
            {needsAttention.length > 0 && <> {t("wording.and")} <strong>{needsAttention.length} {t("wording.itemsInline")}</strong> {t("wording.needRestocking")}</>}
          </div>
        </div>
        <div className="dash-hero-date">{fmtToday(new Date())}</div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">{t("wording.totalEvents")}</div>
          <div className="kpi-value">{isLoading ? '—' : (summary?.total_events ?? 0)}</div>
          <div className="kpi-sub">{summary?.upcoming_count ?? 0} {t("wording.upcomingInline")} {summary?.past_count ?? 0} {t("wording.pastInline")}</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">{t("wording.inventorySku")}</div>
          <div className="kpi-value">{isLoading ? '—' : (summary?.inventory_sku ?? 0)}</div>
          <div className="kpi-sub">{(summary?.total_stock ?? 0).toLocaleString('en-US')} {t("wording.totalUnitsInline")}</div>
        </div>
        <div className="kpi-card orange-accent">
          <div className="kpi-label">{t("wording.lowStock")}</div>
          <div className="kpi-value">{isLoading ? '—' : (summary?.low_stock ?? 0)}</div>
          <div className="kpi-sub">{summary?.out_of_stock ?? 0} {t("wording.outOfStockInline")}</div>
        </div>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">{t("wording.currentlyLoaned")}</div>
          <div className="kpi-value">{isLoading ? '—' : (summary?.loaned ?? 0)}</div>
          <div className="kpi-sub">{t("wording.of")} {summary?.total_loans ?? 0} {t("wording.totalLoansInline")}</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">{t("wording.overdueLoans")}</div>
          <div className="kpi-value">{isLoading ? '—' : (summary?.overdue ?? 0)}</div>
          <div className="kpi-sub">{t("wording.needFollowUp")}</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">{t("wording.warehouses")}</div>
          <div className="kpi-value">{isLoading ? '—' : (summary?.warehouse_count ?? 0)}</div>
          <div className="kpi-sub">{t("wording.activeWarehouseLocations")}</div>
        </div>
      </div>

      <div className="dash-quick-actions">
        {QUICK_ACTIONS.map(a => (
          <button key={a.to} className="dash-quick-btn" onClick={() => navigate(a.to)}>
            {a.icon} {t(a.labelKey)}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="section-title">{t("wording.upcomingEvents")}</div>
          <div className="viz-event-list">
            {isLoading ? (
              <div className="no-data">{t("wording.loadingUpcomingEvents")}</div>
            ) : isError ? (
              <div className="no-data">{t("wording.failedToLoadUpcomingEvents")}</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="no-data">{t("wording.noUpcomingEvents")}</div>
            ) : upcomingEvents.map(ev => {
              const days = daysUntil(ev.event_start);
              return (
                <div key={ev.id} className="viz-event-row" onClick={() => navigate(`/event-detail?id=${ev.id}`)}>
                  <div className="viz-event-info">
                    <div className="dash-mini-name">{ev.name}</div>
                    <div className="dash-mini-sub">{fmtDate(ev.event_start)} · {ev.location || '—'}</div>
                  </div>
                  <div className="viz-bar-track" title={t("dynamic.daysRemaining", { count: days })}>
                    <div className="viz-bar-fill" style={{ width: `${pct(days, maxDaysAway)}%` }} />
                  </div>
                  <span className="badge badge-blue viz-event-days">{days}{t("wording.d")}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="section-title">{t("wording.stockHealth")}</div>
          <div className="viz-stacked-bar">
            <div className="viz-stacked-segment" style={{ width: `${pct(availableCount, inventoryData.length)}%`, background: 'var(--green)' }} title={t("dynamic.availableSku", { count: availableCount })} />
            <div className="viz-stacked-segment" style={{ width: `${pct(lowStock.length, inventoryData.length)}%`, background: 'var(--orange)' }} title={t("dynamic.lowStockSku", { count: lowStock.length })} />
            <div className="viz-stacked-segment" style={{ width: `${pct(outOfStock.length, inventoryData.length)}%`, background: 'var(--red)' }} title={t("dynamic.outOfStockSku", { count: outOfStock.length })} />
          </div>
          <div className="viz-legend">
            <span className="viz-legend-item"><i style={{ background: 'var(--green)' }} /> {t("wording.available")} <strong>{availableCount}</strong></span>
            <span className="viz-legend-item"><i style={{ background: 'var(--orange)' }} /> {t("wording.lowStock")} <strong>{lowStock.length}</strong></span>
            <span className="viz-legend-item"><i style={{ background: 'var(--red)' }} /> {t("wording.outOfStock")} <strong>{outOfStock.length}</strong></span>
          </div>
          <p className="summary-text" style={{ marginTop: 14, marginBottom: 0 }}>
            <strong>{pct(availableCount, inventoryData.length).toFixed(0)}%</strong> {t("wording.of")} {inventoryData.length} {t("wording.skusHaveHealthyStockLevels")}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="section-title">{t("wording.stockDistributionByWarehouse")}</div>
          <div className="viz-bar-chart">
            {isLoading ? (
              <div className="no-data">{t("wording.loadingWarehouseStock")}</div>
            ) : isError ? (
              <div className="no-data">{t("wording.failedToLoadWarehouseStock")}</div>
            ) : warehouseBreakdown.length === 0 ? (
              <div className="no-data">{t("wording.noWarehouseStockData")}</div>
            ) : warehouseBreakdown.map(item => (
                <div key={item.warehouse} className="viz-bar-row">
                  <div className="viz-bar-label">{item.warehouse || '—'}</div>
                  <div className="viz-bar-track" title={t("dynamic.warehouseUnits", { warehouse: item.warehouse, count: item.total_stock.toLocaleString(i18n.language === "id" ? t("wording.idId") : t("wording.enUs")) })}>
                    <div className="viz-bar-fill" style={{ width: `${pct(item.total_stock, maxWarehouseStock)}%` }} />
                  </div>
                  <div className="viz-bar-value">{item.total_stock.toLocaleString('en-US')}</div>
                </div>
              ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">{t("wording.recentActivity")}</div>
          <div className="dash-activity-list">
            {isLoading ? (
              <div className="no-data">{t("wording.loadingRecentActivity")}</div>
            ) : isError ? (
              <div className="no-data">{t("wording.failedToLoadRecentActivity")}</div>
            ) : recentActivity.length === 0 ? (
              <div className="no-data">{t("wording.noRecentActivity")}</div>
            ) : recentActivity.map(log => (
                <div key={log.id} className="dash-activity-row">
                  <span className="dash-activity-dot" style={{ background: MODULE_DOT[log.module] || 'var(--text-muted)' }} />
                  <div className="dash-activity-body">
                    <div className="dash-activity-text"><strong>{log.user_name || '—'}</strong> · {log.description}</div>
                    <div className="dash-activity-time">{log.timestamp}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="section-title">{t("wording.stockByCategory")}</div>
        <div className="viz-bar-chart">
          {isLoading ? (
            <div className="no-data">{t("wording.loadingCategoryStock")}</div>
          ) : isError ? (
            <div className="no-data">{t("wording.failedToLoadCategoryStock")}</div>
          ) : categoryBreakdown.length === 0 ? (
            <div className="no-data">{t("wording.noCategoryStockData")}</div>
          ) : categoryBreakdown.map(item => (
              <div key={item.category} className="viz-bar-row">
                <div className="viz-bar-label">{item.category || '—'}</div>
                <div className="viz-bar-track" title={t("dynamic.categoryUnitsSkus", { category: item.category, count: item.total_stock.toLocaleString(i18n.language === "id" ? t("wording.idId") : t("wording.enUs")), skuCount: item.sku_count })}>
                  <div className="viz-bar-fill" style={{ width: `${pct(item.total_stock, maxCategoryStock)}%` }} />
                </div>
                <div className="viz-bar-value">{item.total_stock.toLocaleString('en-US')}</div>
              </div>
            ))}
        </div>
      </div>

      <div className="card">
        <div className="section-title">{t("wording.needsAttentionLowOutOfStock")}</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("wording.itemName")}</th>
                <th>{t("wording.category")}</th>
                <th>{t("wording.warehouse")}</th>
                <th style={{ width: 90, textAlign: 'right' }}>{t("wording.stock")}</th>
                <th style={{ width: 120 }}>{t("wording.status")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>{t("wording.loadingItems")}</td></tr>
              ) : isError ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--red)' }}>{t("wording.failedToLoadItemsRequiringAttention")}</td></tr>
              ) : needsAttention.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>{t("wording.allStockLevelsAreHealthy")}</td></tr>
              ) : needsAttention.map(i => (
                  <tr key={i.id}>
                    <td className="name-cell">{i.name}</td>
                    <td>{i.category}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{i.warehouse}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{i.total_stock} {i.unit}</td>
                    <td><span className={`badge ${stockBadgeClass(i.status)}`}>{translateApiValue(i.status)}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
