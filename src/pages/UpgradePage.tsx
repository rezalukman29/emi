import { useMemo, useState } from "react";
import { useQueryClient } from "react-query";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import useGetUserPricingPlans, {
  type UserPricingPlan,
} from "../hooks/api/useGetUserPricingPlans";
import useUpgradeUserPlan from "../hooks/api/useUpgradeUserPlan";
import type { RootState } from "../store/store";
import { translateApiValue } from "../utils/function";

function formatIDR(value: number) {
  return `Rp${Number(value || 0).toLocaleString("id-ID")}`;
}

const PLAN_FEATURES = [
  { field: "event_management_price", labelKey: "modules.event" },
  { field: "inventory_management_price", labelKey: "modules.inventory" },
  { field: "warehouse_management_price", labelKey: "modules.warehouse" },
  { field: "qr_scanning_price", labelKey: "modules.qrCode" },
  { field: "reports_dashboard_price", labelKey: "modules.reports" },
  { field: "item_loan_price", labelKey: "modules.itemLoan" },
  { field: "ai_analyzer_price", labelKey: "modules.ai" },
] as const;

function requestErrorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return apiMessage || (error instanceof Error ? error.message : fallback);
}

export default function UpgradePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [upgradingPlanId, setUpgradingPlanId] = useState<number | null>(null);
  const currentPlanState = useSelector((state: RootState) => state.userPlan);
  const currentPlan = currentPlanState.data;
  const {
    data: pricingResponse,
    isLoading: isPricingLoading,
    isError: isPricingError,
  } = useGetUserPricingPlans();
  const { mutateAsync: upgradePlan, isLoading: isUpgrading } = useUpgradeUserPlan();

  const plans = useMemo(
    () => [...(pricingResponse?.data ?? [])].sort(
      (left, right) => left.display_order - right.display_order || left.id - right.id,
    ),
    [pricingResponse?.data],
  );
  const storagePercentage = Math.min(
    100,
    Math.max(0, Number(currentPlan?.usage_percentage ?? 0)),
  );

  const getFeatures = (plan: UserPricingPlan) => [
    ...PLAN_FEATURES
      .filter(({ field }) => Number(plan[field] ?? 0) > 0)
      .map(({ labelKey }) => t(labelKey)),
    t("upgrade.storageFeature", { storage: plan.storage_limit_readable }),
  ];

  const handleUpgrade = async (plan: UserPricingPlan) => {
    if (plan.id === currentPlan?.plan_id || isUpgrading) return;

    setUpgradingPlanId(plan.id);
    try {
      const response = await upgradePlan({ plan_id: plan.id });
      toast.success(response.message || t("upgrade.success", { name: plan.name }));
      await Promise.all([
        queryClient.invalidateQueries(["useGetUserPlan"]),
        queryClient.invalidateQueries(["useGetUserPricingPlans"]),
      ]);
    } catch (error) {
      toast.error(requestErrorMessage(error, t("upgrade.failed")));
    } finally {
      setUpgradingPlanId(null);
    }
  };

  return (
    <>
      <h1 className="page-title">{t("wording.upgradeYourPlan")}</h1>
      <p className="upgrade-page-intro">{t("upgrade.subtitle")}</p>

      <div className="card upgrade-current-plan">
        <div className="section-title">{t("wording.currentPlan")}</div>
        <p className="upgrade-current-plan-copy">
          {currentPlanState.isLoading ? (
            t("upgrade.loadingCurrentPlan")
          ) : (
            <>
              {t("wording.youreOnThe")} <strong>{currentPlan?.plan_name || "—"}</strong>{" "}
              {t("wording.planInline")}
            </>
          )}
        </p>
        <div className="upgrade-usage-grid">
          <div>
            <div className="upgrade-usage-heading">
              <span>{t("wording.storageUsed")}</span>
              <strong>
                {currentPlan?.storage_used_readable ?? "—"} /{" "}
                {currentPlan?.storage_limit_readable ?? "—"}
              </strong>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${storagePercentage}%`, background: "var(--green)" }}
              />
            </div>
          </div>
          <div className="upgrade-plan-summary">
            <span>{t("wording.billingCycle")}</span>
            <strong>
              {currentPlan?.billing_cycle
                ? translateApiValue(currentPlan.billing_cycle)
                : "—"}
            </strong>
          </div>
          <div className="upgrade-plan-summary">
            <span>{t("wording.planStatus")}</span>
            <strong>
              {currentPlan?.status ? translateApiValue(currentPlan.status) : "—"}
            </strong>
          </div>
        </div>
      </div>

      {isPricingLoading ? (
        <div className="card no-data">{t("wording.loadingPricingPlans")}</div>
      ) : isPricingError ? (
        <div className="card no-data" style={{ color: "var(--red)" }}>
          {t("wording.unableToLoadPricingPlans")}
        </div>
      ) : plans.length === 0 ? (
        <div className="card no-data">{t("wording.noPricingPlansFound")}</div>
      ) : (
        <div className="upgrade-plan-grid">
          {plans.map((plan) => {
            const features = getFeatures(plan);
            const isPopular = Number(plan.is_popular) === 1;
            const isCurrent = plan.id === currentPlan?.plan_id;
            const isThisPlanUpgrading = isUpgrading && upgradingPlanId === plan.id;

            return (
              <div
                key={plan.id}
                className={`upgrade-plan-card${isPopular ? " highlighted" : ""}`}
              >
                {isPopular && (
                  <span className="upgrade-plan-badge">{t("wording.mostPopular")}</span>
                )}
                <div className="upgrade-plan-name">{plan.name}</div>
                <div className="upgrade-plan-desc">{plan.description || "—"}</div>
                <div className="upgrade-plan-price">
                  {formatIDR(plan.price)}
                  <span>
                    {t("upgrade.perCycle", {
                      cycle: translateApiValue(plan.billing_cycle).toLowerCase(),
                    })}
                  </span>
                </div>
                <ul className="upgrade-plan-features">
                  {features.map((feature) => (
                    <li key={feature}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`upgrade-plan-btn${isPopular ? " primary" : ""}`}
                  disabled={isCurrent || isUpgrading}
                  onClick={() => void handleUpgrade(plan)}
                >
                  {isCurrent
                    ? t("upgrade.currentPlanButton")
                    : isThisPlanUpgrading
                      ? t("upgrade.upgrading")
                      : t("upgrade.upgradeTo", { name: plan.name })}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="card upgrade-faq-card">
        <div className="section-title">{t("wording.frequentlyAskedQuestions")}</div>
        <div className="upgrade-faq-list">
          <div>
            <div className="upgrade-faq-question">{t("upgrade.faq.change.question")}</div>
            <div className="upgrade-faq-answer">{t("upgrade.faq.change.answer")}</div>
          </div>
          <div>
            <div className="upgrade-faq-question">{t("upgrade.faq.downgrade.question")}</div>
            <div className="upgrade-faq-answer">{t("upgrade.faq.downgrade.answer")}</div>
          </div>
          <div>
            <div className="upgrade-faq-question">{t("upgrade.faq.billing.question")}</div>
            <div className="upgrade-faq-answer">{t("upgrade.faq.billing.answer")}</div>
          </div>
        </div>
      </div>
    </>
  );
}
