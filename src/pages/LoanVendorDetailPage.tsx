import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import Modal from "../components/Modal";
import TextInput from "../components/TextInput";
import { IconEdit } from "../components/icons";
import {
  type LoanVendorPayload,
  type LoanVendorType,
  useGetLoanVendor,
  useUpdateLoanVendor,
} from "../hooks/api/useLoanVendors";
import { useGetLoanItems } from "../hooks/api/useGetItemLoans";
import { fmtNum, formatIDR } from "../lib/format";
import ItemLoanPage from "./ItemLoanPage";

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return <div className="vendor-info-row"><span>{label}</span><div>{value === "" || value == null ? "—" : value}</div></div>;
}

function errorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ||
    (error as { message?: string })?.message ||
    fallback
  );
}

export default function LoanVendorDetailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const id = Number(params.get("id"));
  const query = useGetLoanVendor(id);
  const vendor = query.data?.data;
  const updateMutation = useUpdateLoanVendor();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<LoanVendorPayload | null>(null);
  const loansQuery = useGetLoanItems({
    params: { page: 1, limit: 100, vendor_id: id },
    options: { enabled: id > 0 },
  });
  const loans = loansQuery.data?.data?.data ?? [];
  const activeLoans = loans.filter(
    item => item.status.toUpperCase() !== "RETURNED",
  );
  const eventsServed = new Set(loans.filter(item => item.event?.id || item.event_id).map(item => item.event?.id || item.event_id)).size;
  const totalRentalCost = loans.reduce(
    (sum, item) => sum + Number(item.rental_cost || item.qty * item.rental_cost_per_unit || 0),
    0,
  );

  function openEdit() {
    if (!vendor) return;
    setForm({
      name: vendor.name,
      type: vendor.type,
      description: vendor.description || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      is_loan: true,
      is_production: false,
    });
    setEditOpen(true);
  }

  function closeEdit() {
    if (updateMutation.isLoading) return;
    setEditOpen(false);
    setForm(null);
  }

  async function saveVendor() {
    if (!vendor || !form?.name.trim() || updateMutation.isLoading) return;
    const payload: LoanVendorPayload = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      is_loan: true,
      is_production: false,
    };
    try {
      await updateMutation.mutateAsync({ id: vendor.id, payload });
      await query.refetch();
      toast.success(t("loanVendor.updated"));
      setEditOpen(false);
      setForm(null);
    } catch (error) {
      toast.error(errorMessage(error, t("loanVendor.saveError")));
    }
  }

  return (
    <>
      <div className="detail-header">
        <Link className="loan-detail-back" to="/loan">← {t("wording.back")}</Link>
        <h1 className="page-title loan-detail-heading">
          {vendor?.name || t("loanVendor.vendorInfo")}
          {vendor && <>
            <span className={`badge ${vendor.type === "Internal" ? "badge-green" : "badge-orange"}`}>{vendor.type}</span>
            <span className="badge badge-blue">{t("loanVendor.loanVendorBadge")}</span>
          </>}
        </h1>
        {vendor && (
          <button className="btn btn-ghost loan-detail-edit" onClick={openEdit}>
            <IconEdit /> {t("wording.edit")}
          </button>
        )}
      </div>
      {query.isLoading ? <p>{t("wording.loading")}</p> : query.isError ? <p role="alert">{t("loanVendor.loadDetailError")}</p> : !vendor ? <p>{t("loanVendor.notFound")}</p> : (
        <>
          <div className="grid-2col loan-detail-grid">
            <div className="card loan-detail-card">
              <div className="section-dot-label"><span style={{ background: "var(--brand)" }} />{t("loanVendor.vendorInfoShort")}</div>
              <InfoRow label={t("loanVendor.type")} value={`${vendor.type} (${t(vendor.type === "Internal" ? "loanVendor.ownTeam" : "loanVendor.outsideVendor")})`} />
              <InfoRow label={t("loanVendor.phone")} value={vendor.phone} />
              <InfoRow label={t("loanVendor.address")} value={vendor.address} />
              <InfoRow label={t("loanVendor.description")} value={vendor.description} />
              <InfoRow label={t("loanVendor.eventsServed")} value={eventsServed ? t("loanVendor.eventCount", { count: eventsServed }) : "—"} />
              <InfoRow label={t("loanVendor.rentalCost")} value={totalRentalCost ? formatIDR(totalRentalCost) : "—"} />
            </div>
            <div className="card loan-detail-card">
              <div className="section-dot-label"><span style={{ background: "var(--green)" }} />{t("loanVendor.borrowedItems")}</div>
              {loansQuery.isLoading ? <p className="loan-detail-placeholder">{t("wording.loading")}</p>
                : loansQuery.isError ? <p className="loan-detail-placeholder vendor-error-cell">{t("borrowedItemsApi.loadError")}</p>
                  : activeLoans.length === 0 ? <p className="loan-detail-placeholder">{t("loanVendor.noActiveBorrowed")}</p>
                    : <ul className="vendor-item-list">
                      {activeLoans.map(item => {
                        const destination = item.event?.name || item.warehouse?.name || "—";
                        const location = item.event
                          ? [item.event.area, item.event.sub_area].filter(Boolean).join(" · ")
                          : item.purpose;
                        return <li key={item.id}>
                          <div className="vendor-item-main">
                            <strong>{item.item_name}</strong>
                            <div className="vendor-item-sub">{destination}{location ? ` · ${location}` : ""}</div>
                          </div>
                          <span className="vendor-item-qty">
                            {fmtNum(item.qty)} {item.unit}
                          </span>
                        </li>;
                      })}
                    </ul>}
            </div>
          </div>
          <div className="section-dot-label loan-history-title"><span style={{ background: "var(--orange)" }} />{t("loanVendor.loanHistory")}</div>
          <ItemLoanPage embedded vendorId={vendor.id} allowCreate={false} />
        </>
      )}

      <Modal
        open={editOpen && Boolean(form)}
        title={t("loanVendor.editVendor")}
        onClose={closeEdit}
        footer={<>
          <button className="btn-cancel-modal" disabled={updateMutation.isLoading} onClick={closeEdit}>{t("wording.cancel")}</button>
          <button className="btn-save-modal" disabled={!form?.name.trim() || updateMutation.isLoading} onClick={() => void saveVendor()}>{t(updateMutation.isLoading ? "wording.saving" : "wording.save")}</button>
        </>}
      >
        {form && <>
          <TextInput label={t("loanVendor.name")} isRequired placeholder={t("loanVendor.namePlaceholder")} value={form.name} onChange={name => setForm(current => current ? ({ ...current, name }) : current)} />
          <div className="form-group">
            <label>{t("loanVendor.type")}</label>
            <div className="loan-type-toggle">
              {(["Internal", "External"] as LoanVendorType[]).map(type => (
                <button type="button" key={type} className={form.type === type ? "active" : ""} onClick={() => setForm(current => current ? ({ ...current, type }) : current)}>{t(`loanVendor.${type.toLowerCase()}`)}</button>
              ))}
            </div>
            <p className="vendor-origin-help">{t("loanVendor.typeHelp")}</p>
          </div>
          <div className="form-group">
            <label>{t("loanVendor.description")}</label>
            <textarea placeholder={t("loanVendor.descriptionPlaceholder")} value={form.description} onChange={event => setForm(current => current ? ({ ...current, description: event.target.value }) : current)} />
          </div>
          <div className="form-row">
            <TextInput label={t("loanVendor.phone")} placeholder={t("loanVendor.phonePlaceholder")} value={form.phone} onChange={phone => setForm(current => current ? ({ ...current, phone }) : current)} />
            <TextInput label={t("loanVendor.address")} placeholder={t("loanVendor.addressPlaceholder")} value={form.address} onChange={address => setForm(current => current ? ({ ...current, address }) : current)} />
          </div>
        </>}
      </Modal>
    </>
  );
}
