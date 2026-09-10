import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";

import Modal from "../../components/Modal";
import TextInput from "../../components/TextInput";
import SearchableSelect from "../../components/SearchableSelect";
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
import { useTranslation } from "react-i18next";


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

const MODULE_LABEL_KEYS: Record<string, string> = {
  event: "modules.event",
  inventory: "modules.inventory",
  warehouse: "modules.warehouse",
  "qr-code": "modules.qrCode",
  reports: "modules.reports",
  "item-loan": "modules.itemLoan",
};

const PLAN_FEATURES = [
  { field: "event_management_price", labelKey: "modules.event" },
  { field: "inventory_management_price", labelKey: "modules.inventory" },
  { field: "warehouse_management_price", labelKey: "modules.warehouse" },
  { field: "qr_scanning_price", labelKey: "modules.qrCode" },
  { field: "reports_dashboard_price", labelKey: "modules.reports" },
  { field: "item_loan_price", labelKey: "modules.itemLoan" },
  { field: "ai_analyzer_price", labelKey: "modules.ai" },
] as const;

function selectedModulePrice(modules: string[], key: string) {
  if (!modules.includes(key)) return 0;
  return MODULE_CATALOG.find((module) => module.key === key)?.price ?? 0;
}

export default function PricingPage() {
  const { t } = useTranslation();
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
      name: Yup.string().trim().required(t("wording.required")),
      billing_cycle: Yup.string().oneOf(["monthly", "yearly", "custom"]).required(t("wording.required")),
      description: Yup.string().trim().required(t("wording.required")),
      modules: Yup.array().of(Yup.string()),
      ai_feature: Yup.boolean(),
      storage_gb: Yup.number().required(t("wording.required")),
      storage_limit: Yup.number().typeError("Must be a number").integer("Must be a whole number").min(0, t("wording.minimumValueIs0")).required(t("wording.required")),
      customer_count: Yup.number().typeError("Must be a number").integer("Must be a whole number").min(0, t("wording.minimumValueIs0")),
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
        <h1 className="page-title" style={{ margin: 0 }}>{t("wording.pricingPlans")}</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> {t("wording.newPlan")}</button>
      </div>
      <p className="summary-text">{t("wording.planPricingIsCalculatedAutomaticallyBasedOnThe")}</p>

      {isPlansLoading ? (
        <div className="card" style={{ color: "var(--text-muted)" }}>{t("wording.loadingPricingPlans")}</div>
      ) : isPlansError ? (
        <div className="card" style={{ color: "var(--red)" }}>{t("wording.unableToLoadPricingPlans")}</div>
      ) : !plans.length ? (
        <div className="card" style={{ color: "var(--text-muted)" }}>{t("wording.noPricingPlansFound")}</div>
      ) : (
        <div className="sa-plan-grid">
          {plans.map((plan) => (
            <div key={plan.id} className={`sa-plan-card${plan.is_default === 1 ? " highlighted" : ""}`}>
              {plan.is_default === 1 && <div className="sa-plan-tag">{t("wording.mostPopular")}</div>}
              <div className="sa-plan-name">{plan.name}</div>
              <div className="sa-plan-price">
                {plan.billing_cycle === "custom" ? (
                  t("wording.custom")
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
                  <li key={feature.field}><IconCheck /> {t(feature.labelKey)}</li>
                ))}
                <li><IconCheck /> {plan.storage_limit_readable || readableStorage(plan.storage_limit)} {t("wording.storage")}</li>
              </ul>
              <div className="sa-plan-footer">
                <span className="sa-plan-customers">
                  {plan.customers_using} {plan.customers_using === 1 ? t("wording.customerInline") : t("wording.customersInline")}
                </span>
                <div className="action-btns">
                  <button className="btn-icon edit" title={t("wording.edit")} onClick={() => openEdit(plan)}><IconEdit /></button>
                  <button className="btn-icon delete" title={t("wording.delete")} onClick={() => openDelete(plan.id)}><IconDelete /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editingId ? t("wording.editPricingPlan") : t("wording.addPricingPlan")}
        onClose={closePlanModal}
        size="lg"
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isSaving} onClick={closePlanModal}><IconClose /> {t("wording.cancel")}</button>
            <button className="btn-save-modal" disabled={isSaving} onClick={() => formik.handleSubmit()}><IconCheck /> {isSaving ? t("common.actions.saving") : t("common.actions.save")}</button>
          </>
        )}
      >
        <div className="form-row">
          <TextInput
            variant="secondary"
            value={formik.values.name}
            onChange={(value) => formik.setFieldValue("name", value)}
            isRequired
            label={t("wording.planName")}
            errorText={formik.errors.name}
          />
          <div className="form-group">
            <label>{t("wording.billingCycleTitle")} <span style={{ color: "var(--red)" }}>*</span></label>
            <SearchableSelect
              value={formik.values.billing_cycle}
              onChange={(value) => formik.setFieldValue("billing_cycle", String(value))}
              options={[
                { value: "monthly", label: t("wording.monthly") },
                { value: "yearly", label: t("wording.yearly") },
                { value: "custom", label: t("wording.customPriceNotShown") },
              ]}
              placeholder={t("wording.selectBillingCycle")}
              errorText={formik.errors.billing_cycle}
            />
          </div>
        </div>

        <TextInput
          variant="secondary"
          value={formik.values.description}
          onChange={(value) => formik.setFieldValue("description", value)}
          isRequired
          label={t("wording.description")}
          errorText={formik.errors.description}
        />

        <div className="form-group">
          <label>{t("wording.modules")}</label>
          <div className="sa-module-grid">
            {MODULE_CATALOG.map((module) => (
              <label key={module.key} className={`sa-module-item${formik.values.modules.includes(module.key) ? " checked" : ""}`}>
                <input
                  type="checkbox"
                  checked={formik.values.modules.includes(module.key)}
                  onChange={() => toggleModule(module.key)}
                />
                <span className="sa-module-label">
                  {t(MODULE_LABEL_KEYS[module.key] ?? module.label)}
                </span>
                <span className="sa-module-price">{formatIDR(module.price)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t("wording.aiFeature")}</label>
            <label className={`sa-module-item${formik.values.ai_feature ? " checked" : ""}`} style={{ marginTop: 0 }}>
              <input
                type="checkbox"
                checked={formik.values.ai_feature}
                onChange={(event) => formik.setFieldValue("ai_feature", event.target.checked)}
              />
              <span className="sa-module-label">{t("wording.aiAnalyzerAccess")}</span>
              <span className="sa-module-price">{formatIDR(AI_FEATURE_FEE)}</span>
            </label>
          </div>
          <div className="form-group">
            <label>{t("wording.storageCapacity")}</label>
            <SearchableSelect
              value={formik.values.storage_gb}
              onChange={(value) => {
                const gigabytes = Number(value);
                formik.setFieldValue("storage_gb", gigabytes);
                formik.setFieldValue("storage_limit", String(storageBytes(gigabytes)));
              }}
              options={STORAGE_TIERS.map((tier) => ({
                value: tier.gb,
                label: tier.price > 0
                  ? `${tier.gb} GB (+${formatIDR(tier.price)})`
                  : t("dynamic.storageIncluded", { count: tier.gb }),
              }))}
              placeholder={t("wording.selectStorageCapacity")}
              errorText={formik.errors.storage_gb as string}
            />
          </div>
        </div>

        <div className="form-row">
          <TextInput
            variant="secondary"
            value={formik.values.storage_limit}
            onChange={(value) => formik.setFieldValue("storage_limit", value)}
            isRequired
            isNumeric
            label={t("wording.storageLimitBytes")}
            placeholder={t("wording.eG1073741824")}
            errorText={formik.errors.storage_limit}
          />
        </div>

        <div className="sa-price-summary">
          <div className="sa-price-summary-row">
            <span>{t("wording.basePlatformFee")}</span>
            <span>{formatIDR(BASE_PLATFORM_FEE)}</span>
          </div>
          <div className="sa-price-summary-row">
            <span>{t("wording.modulesPrefix")}{formik.values.modules.length})</span>
            <span>{formatIDR(modulesTotal)}</span>
          </div>
          <div className="sa-price-summary-row">
            <span>{t("wording.aiFeature")}</span>
            <span>{formatIDR(aiFeatureFee)}</span>
          </div>
          <div className="sa-price-summary-row">
            <span>{t("wording.storagePrefix")}{formik.values.storage_gb} GB)</span>
            <span>{formatIDR(storageFee)}</span>
          </div>
          <div className="sa-price-summary-row">
            <span>{t("wording.storageLimit")}</span>
            <span>{readableStorage(Number(formik.values.storage_limit))}</span>
          </div>
          <div className="sa-price-summary-row sa-price-summary-total">
            <span>{t("wording.totalPer")} {summaryPeriod}</span>
            <span>{formik.values.billing_cycle === "custom" ? t("wording.custom") : formatIDR(formTotal)}</span>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <TextInput
            variant="secondary"
            value={formik.values.customer_count}
            onChange={(value) => formik.setFieldValue("customer_count", value)}
            isNumeric
            label={t("wording.customerCount")}
            errorText={formik.errors.customer_count}
          />
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title={t("wording.deletePlan")}
        onClose={() => { if (!isDeleting) setDeleteOpen(false); }}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isDeleting} onClick={() => setDeleteOpen(false)}>{t("wording.cancel")}</button>
            <button className="btn-del-ok" disabled={isDeleting} onClick={confirmDelete}>{isDeleting ? t("common.actions.deleting") : t("common.actions.delete")}</button>
          </>
        )}
      >
        <p className="confirm-msg">
          {t("wording.areYouSureYouWantToDelete")} <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>{t("wording.thisActionCannotBeUndone")}
        </p>
      </Modal>
    </>
  );
}
