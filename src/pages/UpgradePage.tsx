import { useState } from "react";
import { useSelector } from "react-redux";

import { initialPricingPlans } from "../data/pricingPlans";
import { computePlanPrice, planFeatureList } from "../lib/pricingCalc";
import type { RootState } from "../store/store";

function formatIDR(value: number) {
  return `Rp${Number(value || 0).toLocaleString("id-ID")}`;
}

const faqItems = [
  {
    question: "Can I change plans later?",
    answer:
      "Yes. You can upgrade or downgrade at any time. Contact our team and we will help with the change.",
  },
  {
    question: "What happens to my data if I downgrade?",
    answer:
      "Your data stays safe. Our team will help you review storage and feature usage before the lower plan takes effect.",
  },
  {
    question: "Do you offer annual billing?",
    answer:
      "Annual billing depends on the selected plan. Contact our sales team for the available billing options.",
  },
];

export default function UpgradePage() {
  const [requestedPlanId, setRequestedPlanId] = useState<number | null>(null);
  const currentPlan = useSelector((state: RootState) => state.userPlan.data);
  const storagePercentage = Math.min(
    100,
    Math.max(0, Number(currentPlan?.usage_percentage ?? 0)),
  );

  return (
    <>
      <h1 className="page-title">Upgrade Your Plan</h1>
      <p className="upgrade-page-intro">
        Unlock more modules, storage, and AI features for your team. Plan
        requests are previews until the payment flow is connected.
      </p>

      <div className="card upgrade-current-plan">
        <div className="section-title">Current Plan</div>
        <p className="upgrade-current-plan-copy">
          You&apos;re on the <strong>{currentPlan?.plan_name || "Current"}</strong>{" "}
          plan.
        </p>
        <div className="upgrade-usage-grid">
          <div>
            <div className="upgrade-usage-heading">
              <span>Storage used</span>
              <strong>
                {currentPlan?.storage_used_readable ?? "—"} /{" "}
                {currentPlan?.storage_limit_readable ?? "—"}
              </strong>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${storagePercentage}%`,
                  background: "var(--green)",
                }}
              />
            </div>
          </div>
          <div className="upgrade-plan-summary">
            <span>Billing cycle</span>
            <strong>{currentPlan?.billing_cycle || "—"}</strong>
          </div>
          <div className="upgrade-plan-summary">
            <span>Plan status</span>
            <strong>{currentPlan?.status || "—"}</strong>
          </div>
        </div>
      </div>

      <div className="upgrade-plan-grid">
        {initialPricingPlans.map((plan) => {
          const price = computePlanPrice(plan);
          const features = planFeatureList(plan);
          const requested = requestedPlanId === plan.id;

          return (
            <div
              key={plan.id}
              className={`upgrade-plan-card${plan.highlighted ? " highlighted" : ""}`}
            >
              {plan.highlighted && (
                <span className="upgrade-plan-badge">Most Popular</span>
              )}
              <div className="upgrade-plan-name">{plan.name}</div>
              <div className="upgrade-plan-desc">{plan.description}</div>
              <div className="upgrade-plan-price">
                {plan.cycle === "custom" ? "Custom" : formatIDR(price)}
                {plan.cycle !== "custom" && <span>/month</span>}
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
                className={`upgrade-plan-btn${plan.highlighted ? " primary" : ""}`}
                disabled={requested}
                onClick={() => setRequestedPlanId(plan.id)}
              >
                {requested
                  ? "Request sent — we’ll be in touch"
                  : plan.cycle === "custom"
                    ? "Contact Sales"
                    : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="card upgrade-faq-card">
        <div className="section-title">Frequently Asked Questions</div>
        <div className="upgrade-faq-list">
          {faqItems.map((item) => (
            <div key={item.question}>
              <div className="upgrade-faq-question">{item.question}</div>
              <div className="upgrade-faq-answer">{item.answer}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
