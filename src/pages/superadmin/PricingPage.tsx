import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";

import Modal from "../../components/Modal";
import TextInput from "../../components/TextInput";
import { IconCheck, IconClose, IconDelete, IconEdit, IconPlus } from "../../components/icons";
import useCreateAdminPlan from "../../hooks/api/useCreateAdminPlan";
import useDeleteAdminPlan from "../../hooks/api/useDeleteAdminPlan";
import useGetAdminPlan, {
  type AdminPlan,
  type AdminPlanBillingCycle,
} from "../../hooks/api/useGetAdminPlan";
import useUpdateAdminPlan from "../../hooks/api/useUpdateAdminPlan";
import {
  AI_FEATURE_FEE,
  BASE_PLATFORM_FEE,
  MODULE_CATALOG,
  STORAGE_TIERS,
} from "../../data/pricingCatalog";
import { formatIDR } from "../../lib/superAdminUtils";

function readableStorage(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** unitIndex)).toFixed(2)} ${units[unitIndex]}`;
}

function errorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (apiMessage) return apiMessage;
  return error instanceof Error ? error.message : fallback;
}

function billingLabel(cycle: string) {
  if (cycle === "monthly") return "month";
  if (cycle === "yearly") return "year";
  return "period";
}

function storageBytes(gigabytes: number) {
  return gigabytes * (1024 ** 3);
}

function storageTierFromBytes(bytes: number) {
  const gigabytes = bytes / (1024 ** 3);
  return STORAGE_TIERS.find((tier) => tier.gb === gigabytes)?.gb ?? STORAGE_TIERS[0].gb;
}

const MODULE_PRICE_FIELDS = [
  { key: "event", field: "event_management_price" },
  { key: "inventory", field: "inventory_management_price" },
  { key: "warehouse", field: "warehouse_management_price" },
  { key: "qr-code", field: "qr_scanning_price" },
  { key: "reports", field: "reports_dashboard_price" },
  { key: "item-loan", field: "item_loan_price" },
] as const;

const PLAN_FEATURES = [
  { field: "event_management_price", label: "Event Management" },
  { field: "inventory_management_price", label: "Inventory Management" },
  { field: "warehouse_management_price", label: "Warehouse Management" },
  { field: "qr_scanning_price", label: "QR Code Scanning" },
  { field: "reports_dashboard_price", label: "Report & Dashboard" },
  { field: "item_loan_price", label: "Item Loan Management" },
  { field: "ai_analyzer_price", label: "AI Feature" },
] as const;

function selectedModulePrice(modules: string[], key: string) {
  if (!modules.includes(key)) return 0;
  return MODULE_CATALOG.find((module) => module.key === key)?.price ?? 0;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const {
    data: plansResponse,
    isLoading: isPlansLoading,
    isError: isPlansError,
    refetch: refetchPlans,
  } = useGetAdminPlan();
  const { mutateAsync: createPlan, isLoading: isCreating } = useCreateAdminPlan();
  const { mutateAsync: updatePlan, isLoading: isUpdating } = useUpdateAdminPlan();
  const { mutateAsync: deletePlan, isLoading: isDeleting } = useDeleteAdminPlan();
  const isSaving = isCreating || isUpdating;

  useEffect(() => {
    if (plansResponse?.data) setPlans(plansResponse.data);
  }, [plansResponse?.data]);

  const formik = useFormik({
    initialValues: {
      name: "",
      billing_cycle: "monthly" as AdminPlanBillingCycle,
      description: "",
      modules: [] as string[],
      ai_feature: false,
      storage_gb: STORAGE_TIERS[0].gb,
      storage_limit: String(storageBytes(STORAGE_TIERS[0].gb)),
      customer_count: "0",
    },
    validationSchema: Yup.object({
      name: Yup.string().trim().required("Required"),
      billing_cycle: Yup.string().oneOf(["monthly", "yearly", "custom"]).required("Required"),
      description: Yup.string().trim().required("Required"),
      modules: Yup.array().of(Yup.string()),
      ai_feature: Yup.boolean(),
      storage_gb: Yup.number().required("Required"),
      storage_limit: Yup.number().typeError("Must be a number").integer("Must be a whole number").min(0, "Minimum value is 0").required("Required"),
      customer_count: Yup.number().typeError("Must be a number").integer("Must be a whole number").min(0, "Minimum value is 0"),
    }),
    validateOnChange: false,
    onSubmit: async (values, { resetForm }) => {
      const featurePrices = {
        ai_analyzer_price: values.ai_feature ? AI_FEATURE_FEE : 0,
        event_management_price: selectedModulePrice(values.modules, "event"),
        inventory_management_price: selectedModulePrice(values.modules, "inventory"),
        warehouse_management_price: selectedModulePrice(values.modules, "warehouse"),
        qr_scanning_price: selectedModulePrice(values.modules, "qr-code"),
        reports_dashboard_price: selectedModulePrice(values.modules, "reports"),
        item_loan_price: selectedModulePrice(values.modules, "item-loan"),
      };

      if (editingId) {
        const existingPlan = plans.find((plan) => plan.id === editingId);
        if (!existingPlan) return;
        try {
          const response = await updatePlan({
            ...featurePrices,
            base_platform_fee: BASE_PLATFORM_FEE,
            billing_cycle: values.billing_cycle,
            description: values.description.trim(),
            display_order: existingPlan.display_order,
            id: existingPlan.id,
            is_active: existingPlan.is_active,
            is_default: existingPlan.is_default,
            is_popular: existingPlan.is_popular,
            name: values.name.trim(),
            storage_limit: Number(values.storage_limit),
          });
          toast(response.message, { type: "success" });
          setModalOpen(false);
          resetForm();
          await refetchPlans();
        } catch (error) {
          toast(errorMessage(error, "Failed to update pricing plan."), { type: "error" });
        }
        return;
      }

      try {
        const response = await createPlan({
          ...featurePrices,
          base_platform_fee: BASE_PLATFORM_FEE,
          billing_cycle: values.billing_cycle,
          description: values.description.trim(),
          display_order: plans.length + 1,
          is_default: 0,
          is_popular: 0,
          name: values.name.trim(),
          storage_limit: Number(values.storage_limit),
        });
        toast(response.message, { type: "success" });
        setModalOpen(false);
        resetForm();
        await refetchPlans();
      } catch (error) {
        toast(errorMessage(error, "Failed to create pricing plan."), { type: "error" });
      }
    },
  });

  function openNew() {
    setEditingId(null);
    formik.resetForm();
    setModalOpen(true);
  }

  function openEdit(plan: AdminPlan) {
    setEditingId(plan.id);
    const selectedModules = MODULE_PRICE_FIELDS
      .filter(({ field }) => Number(plan[field] ?? 0) > 0)
      .map(({ key }) => key);
    formik.setValues({
      name: plan.name,
      billing_cycle: plan.billing_cycle as AdminPlanBillingCycle,
      description: plan.description,
      modules: selectedModules,
      ai_feature: Number(plan.ai_analyzer_price ?? 0) > 0,
      storage_gb: storageTierFromBytes(plan.storage_limit),
      storage_limit: String(plan.storage_limit),
      customer_count: "0",
    });
    setModalOpen(true);
  }

  function closePlanModal() {
    if (isSaving) return;
    formik.resetForm();
    setModalOpen(false);
  }

  function toggleModule(key: string) {
    const modules = formik.values.modules;
    formik.setFieldValue(
      "modules",
      modules.includes(key)
        ? modules.filter((module) => module !== key)
        : [...modules, key],
    );
  }

  function openDelete(id: number) {
    setDeletingId(id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingId) return;
    try {
      const response = await deletePlan(deletingId);
      toast(response.message, { type: "success" });
      setDeleteOpen(false);
      setDeletingId(null);
      await refetchPlans();
    } catch (error) {
      toast(errorMessage(error, "Failed to delete pricing plan."), { type: "error" });
    }
  }

  const deleteTarget = plans.find((plan) => plan.id === deletingId);
  const summaryPeriod = billingLabel(formik.values.billing_cycle);
  const modulesTotal = formik.values.modules.reduce((total, key) => {
    const module = MODULE_CATALOG.find((item) => item.key === key);
    return total + (module?.price ?? 0);
  }, 0);
  const aiFeatureFee = formik.values.ai_feature ? AI_FEATURE_FEE : 0;
  const storageFee = STORAGE_TIERS.find((tier) => tier.gb === Number(formik.values.storage_gb))?.price ?? 0;
  const formTotal = BASE_PLATFORM_FEE + modulesTotal + aiFeatureFee + storageFee;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Pricing Plans</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Plan</button>
      </div>
      <p className="summary-text">Plan pricing is calculated automatically based on the selected modules, AI feature, and storage capacity.</p>

      {isPlansLoading ? (
        <div className="card" style={{ color: "var(--text-muted)" }}>Loading pricing plans…</div>
      ) : isPlansError ? (
        <div className="card" style={{ color: "var(--red)" }}>Unable to load pricing plans.</div>
      ) : !plans.length ? (
        <div className="card" style={{ color: "var(--text-muted)" }}>No pricing plans found.</div>
      ) : (
        <div className="sa-plan-grid">
          {plans.map((plan) => (
            <div key={plan.id} className={`sa-plan-card${plan.is_default === 1 ? " highlighted" : ""}`}>
              {plan.is_default === 1 && <div className="sa-plan-tag">Most Popular</div>}
              <div className="sa-plan-name">{plan.name}</div>
              <div className="sa-plan-price">
                {plan.billing_cycle === "custom" ? (
                  "Custom"
                ) : (
                  <>
                    {formatIDR((plan.price ?? 0) + (plan.base_platform_fee ?? 0))}{" "}
                    <span>/{billingLabel(plan.billing_cycle)}</span>
                  </>
                )}
              </div>
              <p className="sa-plan-desc">{plan.description || "-"}</p>
              <ul className="sa-plan-features">
                {PLAN_FEATURES.filter(({ field }) => Number(plan[field] ?? 0) > 0).map((feature) => (
                  <li key={feature.field}><IconCheck /> {feature.label}</li>
                ))}
                <li><IconCheck /> {plan.storage_limit_readable || readableStorage(plan.storage_limit)} Storage</li>
              </ul>
              <div className="sa-plan-footer">
                <span className="sa-plan-customers">
                  {plan.customers_using} {plan.customers_using === 1 ? "customer" : "customers"}
                </span>
                <div className="action-btns">
                  <button className="btn-icon edit" title="Edit" onClick={() => openEdit(plan)}><IconEdit /></button>
                  <button className="btn-icon delete" title="Delete" onClick={() => openDelete(plan.id)}><IconDelete /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editingId ? "Edit Pricing Plan" : "Add Pricing Plan"}
        onClose={closePlanModal}
        size="lg"
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isSaving} onClick={closePlanModal}><IconClose /> Cancel</button>
            <button className="btn-save-modal" disabled={isSaving} onClick={() => formik.handleSubmit()}><IconCheck /> {isSaving ? "Saving…" : "Save"}</button>
          </>
        )}
      >
        <div className="form-row">
          <TextInput
            variant="secondary"
            value={formik.values.name}
            onChange={(value) => formik.setFieldValue("name", value)}
            isRequired
            label="Plan Name"
            errorText={formik.errors.name}
          />
          <div className="form-group">
            <label>Billing Cycle <span style={{ color: "var(--red)" }}>*</span></label>
            <select value={formik.values.billing_cycle} onChange={(event) => formik.setFieldValue("billing_cycle", event.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom (price not shown)</option>
            </select>
          </div>
        </div>

        <TextInput
          variant="secondary"
          value={formik.values.description}
          onChange={(value) => formik.setFieldValue("description", value)}
          isRequired
          label="Description"
          errorText={formik.errors.description}
        />

        <div className="form-group">
          <label>Modules</label>
          <div className="sa-module-grid">
            {MODULE_CATALOG.map((module) => (
              <label key={module.key} className={`sa-module-item${formik.values.modules.includes(module.key) ? " checked" : ""}`}>
                <input
                  type="checkbox"
                  checked={formik.values.modules.includes(module.key)}
                  onChange={() => toggleModule(module.key)}
                />
                <span className="sa-module-label">{module.label}</span>
                <span className="sa-module-price">{formatIDR(module.price)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>AI Feature</label>
            <label className={`sa-module-item${formik.values.ai_feature ? " checked" : ""}`} style={{ marginTop: 0 }}>
              <input
                type="checkbox"
                checked={formik.values.ai_feature}
                onChange={(event) => formik.setFieldValue("ai_feature", event.target.checked)}
              />
              <span className="sa-module-label">AI Analyzer Access</span>
              <span className="sa-module-price">{formatIDR(AI_FEATURE_FEE)}</span>
            </label>
          </div>
          <div className="form-group">
            <label>Storage Capacity</label>
            <select
              value={formik.values.storage_gb}
              onChange={(event) => {
                const gigabytes = Number(event.target.value);
                formik.setFieldValue("storage_gb", gigabytes);
                formik.setFieldValue("storage_limit", String(storageBytes(gigabytes)));
              }}
            >
              {STORAGE_TIERS.map((tier) => (
                <option key={tier.gb} value={tier.gb}>
                  {tier.gb} GB {tier.price > 0 ? `(+${formatIDR(tier.price)})` : "(included)"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <TextInput
            variant="secondary"
            value={formik.values.storage_limit}
            onChange={(value) => formik.setFieldValue("storage_limit", value)}
            isRequired
            isNumeric
            label="Storage Limit (bytes)"
            placeholder="e.g. 1073741824"
            errorText={formik.errors.storage_limit}
          />
        </div>

        <div className="sa-price-summary">
          <div className="sa-price-summary-row">
            <span>Base platform fee</span>
            <span>{formatIDR(BASE_PLATFORM_FEE)}</span>
          </div>
          <div className="sa-price-summary-row">
            <span>Modules ({formik.values.modules.length})</span>
            <span>{formatIDR(modulesTotal)}</span>
          </div>
          <div className="sa-price-summary-row">
            <span>AI Feature</span>
            <span>{formatIDR(aiFeatureFee)}</span>
          </div>
          <div className="sa-price-summary-row">
            <span>Storage ({formik.values.storage_gb} GB)</span>
            <span>{formatIDR(storageFee)}</span>
          </div>
          <div className="sa-price-summary-row">
            <span>Storage Limit</span>
            <span>{readableStorage(Number(formik.values.storage_limit))}</span>
          </div>
          <div className="sa-price-summary-row sa-price-summary-total">
            <span>Total per {summaryPeriod}</span>
            <span>{formik.values.billing_cycle === "custom" ? "Custom" : formatIDR(formTotal)}</span>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <TextInput
            variant="secondary"
            value={formik.values.customer_count}
            onChange={(value) => formik.setFieldValue("customer_count", value)}
            isNumeric
            label="Customer Count"
            errorText={formik.errors.customer_count}
          />
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete Plan"
        onClose={() => { if (!isDeleting) setDeleteOpen(false); }}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isDeleting} onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn-del-ok" disabled={isDeleting} onClick={confirmDelete}>{isDeleting ? "Deleting…" : "Delete"}</button>
          </>
        )}
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
