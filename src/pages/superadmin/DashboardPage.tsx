import { initialPayments } from "../../data/payments";
import useGetSuperAdminDashboard from "../../hooks/api/useGetSuperAdminDashboard";
import { customerStatusBadge, formatIDR, paymentStatusBadge } from "../../lib/superAdminUtils";

function formatSignupDate(value: string) {
  if (!value) return "-";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const {
    data: dashboardResponse,
    isLoading,
    isError,
  } = useGetSuperAdminDashboard();
  const dashboard = dashboardResponse?.data;
  const recentSignups = dashboard?.recent_signups ?? [];
  const recentPayments = [...initialPayments].slice(-6).reverse();

  return (
    <>
      <h1 className="page-title">Dashboard</h1>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Total Customers</div>
          <div className="kpi-value">{dashboard?.total_customers ?? 0}</div>
          <div className="kpi-sub">{dashboard?.trial_count ?? 0} on trial</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">Monthly Recurring Revenue</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{formatIDR(dashboard?.mrr ?? 0)}</div>
          <div className="kpi-sub">from {dashboard?.active_subscriptions ?? 0} active accounts</div>
        </div>
        <div className="kpi-card orange-accent">
          <div className="kpi-label">Active Subscriptions</div>
          <div className="kpi-value">{dashboard?.active_subscriptions ?? 0}</div>
          <div className="kpi-sub">of {dashboard?.total_customers ?? 0} total</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">Churn Rate</div>
          <div className="kpi-value">{dashboard?.churn_rate ?? 0}%</div>
          <div className="kpi-sub">{dashboard?.canceled_count ?? 0} cancelled accounts</div>
        </div>
      </div>

      <div className="sa-dash-grid">
        <div className="card">
          <div className="section-title">Recent Signups</div>
          <div className="sa-mini-list">
            {isLoading ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>
                Loading recent signups…
              </div>
            ) : isError ? (
              <div style={{ textAlign: "center", color: "var(--red)", padding: 24 }}>
                Unable to load recent signups.
              </div>
            ) : !recentSignups.length ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>
                No recent signups.
              </div>
            ) : recentSignups.map((signup) => (
              <div className="sa-mini-item" key={signup.user_id}>
                <div>
                  <div className="sa-mini-name">{signup.company}</div>
                  <div className="sa-mini-sub">
                    {signup.plan_name} · {formatSignupDate(signup.joined_at)}
                  </div>
                  <div className="sa-mini-sub">{signup.email}</div>
                </div>
                <span className={`badge badge-${customerStatusBadge(signup.status.toLowerCase())}`}>
                  {signup.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Recent Payments</div>
          <div className="sa-mini-list">
            {recentPayments.map((payment) => (
              <div className="sa-mini-item" key={payment.id}>
                <div>
                  <div className="sa-mini-name">{payment.customer}</div>
                  <div className="sa-mini-sub">{payment.invoiceNo} · {payment.date}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="sa-mini-amount">{formatIDR(payment.amount)}</div>
                  <span className={`badge badge-${paymentStatusBadge(payment.status)}`}>{payment.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
