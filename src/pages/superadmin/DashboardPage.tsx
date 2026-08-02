// TypeScript page component.
import { useMemo } from 'react';
import { initialCustomers } from '../../data/customers';
import { initialPayments } from '../../data/payments';
import { formatIDR, customerStatusBadge, paymentStatusBadge } from '../../lib/superAdminUtils';

export default function DashboardPage() {
  const customers = initialCustomers;
  const payments = initialPayments;

  const stats = useMemo(() => {
    const active = customers.filter(c => c.status === 'active');
    const trial = customers.filter(c => c.status === 'trial').length;
    const cancelled = customers.filter(c => c.status === 'cancelled').length;
    const mrr = active.reduce((sum, c) => sum + c.mrr, 0);
    const churnRate = customers.length ? ((cancelled / customers.length) * 100).toFixed(1) : '0.0';
    return { total: customers.length, activeCount: active.length, trial, mrr, churnRate };
  }, [customers]);

  const recentCustomers = [...customers].slice(-5).reverse();
  const recentPayments = [...payments].slice(-6).reverse();

  return (
    <>
      <h1 className="page-title">Dashboard</h1>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Total Customers</div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-sub">{stats.trial} on trial</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">Monthly Recurring Revenue</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{formatIDR(stats.mrr)}</div>
          <div className="kpi-sub">from {stats.activeCount} active accounts</div>
        </div>
        <div className="kpi-card orange-accent">
          <div className="kpi-label">Active Subscriptions</div>
          <div className="kpi-value">{stats.activeCount}</div>
          <div className="kpi-sub">of {stats.total} total</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">Churn Rate</div>
          <div className="kpi-value">{stats.churnRate}%</div>
          <div className="kpi-sub">cancelled accounts</div>
        </div>
      </div>

      <div className="sa-dash-grid">
        <div className="card">
          <div className="section-title">Recent Signups</div>
          <div className="sa-mini-list">
            {recentCustomers.map(c => (
              <div className="sa-mini-item" key={c.id}>
                <div>
                  <div className="sa-mini-name">{c.company}</div>
                  <div className="sa-mini-sub">{c.plan} · {c.joinedAt}</div>
                </div>
                <span className={`badge badge-${customerStatusBadge(c.status)}`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="section-title">Recent Payments</div>
          <div className="sa-mini-list">
            {recentPayments.map(p => (
              <div className="sa-mini-item" key={p.id}>
                <div>
                  <div className="sa-mini-name">{p.customer}</div>
                  <div className="sa-mini-sub">{p.invoiceNo} · {p.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="sa-mini-amount">{formatIDR(p.amount)}</div>
                  <span className={`badge badge-${paymentStatusBadge(p.status)}`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
