import { initialPayments } from "../../data/payments";
import useGetSuperAdminDashboard from "../../hooks/api/useGetSuperAdminDashboard";
import { customerStatusBadge, formatIDR, paymentStatusBadge } from "../../lib/superAdminUtils";
import { useTranslation } from "react-i18next";
import { translateApiValue } from "../../utils/function";


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
  const { t } = useTranslation();
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
      <h1 className="page-title">{t("wording.dashboard")}</h1>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">{t("wording.totalCustomers")}</div>
          <div className="kpi-value">{dashboard?.total_customers ?? 0}</div>
          <div className="kpi-sub">{dashboard?.trial_count ?? 0} {t("wording.onTrial")}</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">{t("wording.monthlyRecurringRevenue")}</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{formatIDR(dashboard?.mrr ?? 0)}</div>
          <div className="kpi-sub">{t("wording.fromInline")} {dashboard?.active_subscriptions ?? 0} {t("wording.activeAccounts")}</div>
        </div>
        <div className="kpi-card orange-accent">
          <div className="kpi-label">{t("wording.activeSubscriptions")}</div>
          <div className="kpi-value">{dashboard?.active_subscriptions ?? 0}</div>
          <div className="kpi-sub">{t("wording.of")} {dashboard?.total_customers ?? 0} {t("wording.total")}</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">{t("wording.churnRate")}</div>
          <div className="kpi-value">{dashboard?.churn_rate ?? 0}%</div>
          <div className="kpi-sub">{dashboard?.canceled_count ?? 0} {t("wording.cancelledAccounts")}</div>
        </div>
      </div>

      <div className="sa-dash-grid">
        <div className="card">
          <div className="section-title">{t("wording.recentSignups")}</div>
          <div className="sa-mini-list">
            {isLoading ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>
                {t("wording.loadingRecentSignups")}
              </div>
            ) : isError ? (
              <div style={{ textAlign: "center", color: "var(--red)", padding: 24 }}>
                {t("wording.unableToLoadRecentSignups")}
              </div>
            ) : !recentSignups.length ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>
                {t("wording.noRecentSignups")}
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
                  {translateApiValue(signup.status)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">{t("wording.recentPayments")}</div>
          <div className="sa-mini-list">
            {recentPayments.map((payment) => (
              <div className="sa-mini-item" key={payment.id}>
                <div>
                  <div className="sa-mini-name">{payment.customer}</div>
                  <div className="sa-mini-sub">{payment.invoiceNo} · {payment.date}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="sa-mini-amount">{formatIDR(payment.amount)}</div>
                  <span className={`badge badge-${paymentStatusBadge(payment.status)}`}>{translateApiValue(payment.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
