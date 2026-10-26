import { useDeferredValue, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "react-query";
import { toast } from "react-toastify";

import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import SearchableSelect from "../components/SearchableSelect";
import TextInput from "../components/TextInput";
import { IconDelete, IconEdit, IconPlus, IconSearch } from "../components/icons";
import ItemLoanPage from "./ItemLoanPage";
import {
  type LoanVendorItem,
  type LoanVendorPayload,
  type LoanVendorType,
  useCreateLoanVendor,
  useDeleteLoanVendor,
  useGetLoanVendors,
  useUpdateLoanVendor,
} from "../hooks/api/useLoanVendors";
import { fmtNum } from "../lib/format";

const PAGE_SIZE = 10;
const TYPES: LoanVendorType[] = ["Internal", "External"];
const EMPTY_FORM: LoanVendorPayload = {
  name: "",
  type: "External",
  description: "",
  phone: "",
  address: "",
  is_loan: true,
  is_production: false,
};

function errorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ||
    (error as { message?: string })?.message ||
    fallback
  );
}

export default function LoanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "borrowed" ? "borrowed" : "vendors";
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());
  const [type, setType] = useState<LoanVendorType | "">("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<LoanVendorPayload>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LoanVendorItem | null>(null);

  const vendorQuery = useGetLoanVendors({
    params: {
      page,
      limit: PAGE_SIZE,
      ...(search ? { search } : {}),
      ...(type ? { type } : {}),
    },
    options: { keepPreviousData: true, enabled: tab === "vendors" },
  });
  const createMutation = useCreateLoanVendor();
  const updateMutation = useUpdateLoanVendor();
  const deleteMutation = useDeleteLoanVendor();
  const result = vendorQuery.data?.data;
  const vendors = result?.items ?? [];
  const stats = result?.stats ?? { total: 0, internal: 0, external: 0 };
  const currentPage = result?.page || page;
  const limit = result?.limit || PAGE_SIZE;
  const total = result?.total ?? 0;
  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  function closeForm() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(vendor: LoanVendorItem) {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name,
      type: vendor.type,
      description: vendor.description || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      is_loan: true,
      is_production: false,
    });
    setModalOpen(true);
  }

  async function saveVendor() {
    if (!form.name.trim() || isSaving) return;
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
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, payload });
        toast.success(t("loanVendor.updated"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("loanVendor.created"));
      }
      closeForm();
      await queryClient.invalidateQueries("useGetLoanVendors");
    } catch (error) {
      toast.error(errorMessage(error, t("loanVendor.saveError")));
    }
  }

  async function removeVendor() {
    if (!deleteTarget || deleteMutation.isLoading) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      if (vendors.length === 1 && currentPage > 1) setPage(current => current - 1);
      setDeleteTarget(null);
      toast.success(t("loanVendor.deleted"));
      await queryClient.invalidateQueries("useGetLoanVendors");
    } catch (error) {
      toast.error(errorMessage(error, t("loanVendor.deleteError")));
    }
  }

  const summary = [
    ["loanVendor.totalVendors", stats.total, "var(--brand)", "var(--brand-bg)"],
    ["loanVendor.internal", stats.internal, "var(--green)", "var(--green-bg)"],
    ["loanVendor.external", stats.external, "var(--orange)", "var(--orange-bg)"],
  ] as const;

  return (
    <>
      <div className="vendor-page-header loan-page-header">
        <div>
          <h1 className="page-title">{t("loanVendor.title")}</h1>
          <p className="vendor-page-description">{t("borrowedItemsApi.pageIntro")}</p>
        </div>
        {tab === "vendors" && (
          <button className="btn-new" onClick={openCreate}>
            <IconPlus /> {t("loanVendor.newVendor")}
          </button>
        )}
      </div>

      <div className="wi-tabs loan-tabs">
        <button
          className={`wi-tab-btn${tab === "vendors" ? " active" : ""}`}
          onClick={() => setParams({}, { replace: true })}
        >
          {t("loanVendor.vendors")}
        </button>
        <button
          className={`wi-tab-btn${tab === "borrowed" ? " active" : ""}`}
          onClick={() => setParams({ tab: "borrowed" }, { replace: true })}
        >
          {t("loanVendor.borrowedItems")}
        </button>
      </div>

      {tab === "borrowed" ? (
        <ItemLoanPage embedded />
      ) : (
        <>
          <div className="stats-bar vendor-stats-bar">
            {summary.map(([label, value, color, background]) => (
              <div className="stat-card" key={label}>
                <span className="stat-icon" style={{ background }}>
                  <strong className="stat-value" style={{ color }}>{fmtNum(value)}</strong>
                </span>
                <span className="stat-label">{t(label)}</span>
              </div>
            ))}
          </div>

          <div className="card vendor-list-card loan-vendor-card">
            <div className="toolbar vendor-toolbar">
              <div className="toolbar-left">
                <div className="search-wrap">
                  <IconSearch />
                  <input
                    className="search-input"
                    aria-label={t("loanVendor.search")}
                    placeholder={t("loanVendor.search")}
                    value={searchInput}
                    onChange={event => {
                      setSearchInput(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="vendor-origin-filter">
                  <SearchableSelect
                    value={type}
                    onChange={value => {
                      setType(value as LoanVendorType | "");
                      setPage(1);
                    }}
                    options={[
                      { value: "", label: t("loanVendor.allTypes") },
                      ...TYPES.map(value => ({ value, label: value })),
                    ]}
                  />
                </div>
              </div>
            </div>
            <div className="table-wrap">
              <table className="loan-vendor-table">
                <thead>
                  <tr>
                    <th>{t("loanVendor.name")}</th>
                    <th>{t("loanVendor.type")}</th>
                    <th>{t("loanVendor.description")}</th>
                    <th>{t("loanVendor.phone")}</th>
                    <th>{t("loanVendor.address")}</th>
                    <th className="number-cell">{t("loanVendor.loans")}</th>
                    <th>{t("loanVendor.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorQuery.isLoading && (
                    <tr><td className="vendor-empty-cell" colSpan={7}>{t("wording.loading")}</td></tr>
                  )}
                  {vendorQuery.isError && !vendorQuery.isLoading && (
                    <tr><td className="vendor-empty-cell vendor-error-cell" colSpan={7}>{errorMessage(vendorQuery.error, t("loanVendor.loadError"))}</td></tr>
                  )}
                  {!vendorQuery.isLoading && !vendorQuery.isError && vendors.length === 0 && (
                    <tr><td className="vendor-empty-cell" colSpan={7}>{t("loanVendor.noVendors")}</td></tr>
                  )}
                  {vendors.map(vendor => (
                    <tr
                      key={vendor.id}
                      className="row-clickable"
                      role="link"
                      tabIndex={0}
                      title={t("loanVendor.viewDetail")}
                      onClick={() => navigate(`/loan-vendor-detail?id=${vendor.id}`)}
                      onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/loan-vendor-detail?id=${vendor.id}`);
                        }
                      }}
                    >
                      <td className="name-cell">{vendor.name}</td>
                      <td><span className={`badge badge-${vendor.type === "Internal" ? "green" : "orange"}`}>{vendor.type}</span></td>
                      <td className="cell-clamp">{vendor.description || "—"}</td>
                      <td className="loan-nowrap">{vendor.phone || "—"}</td>
                      <td className="cell-clamp">{vendor.address || "—"}</td>
                      <td className="number-cell">{fmtNum(vendor.loans || 0)}</td>
                      <td onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
                        <div className="action-btns">
                          <button className="btn-icon edit" aria-label={t("wording.edit")} onClick={() => openEdit(vendor)}><IconEdit /></button>
                          <button className="btn-icon delete" aria-label={t("wording.delete")} onClick={() => setDeleteTarget(vendor)}><IconDelete /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} total={total} pageSize={limit} onPage={setPage} label={t("loanVendor.vendors")} />
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        title={t(editingId ? "loanVendor.editVendor" : "loanVendor.newVendor")}
        onClose={() => { if (!isSaving) closeForm(); }}
        footer={<>
          <button className="btn-cancel-modal" disabled={isSaving} onClick={closeForm}>{t("wording.cancel")}</button>
          <button className="btn-save-modal" disabled={!form.name.trim() || isSaving} onClick={() => void saveVendor()}>{t(isSaving ? "wording.saving" : "wording.save")}</button>
        </>}
      >
        <TextInput label={t("loanVendor.name")} isRequired placeholder={t("loanVendor.namePlaceholder")} value={form.name} onChange={name => setForm(current => ({ ...current, name }))} />
        <div className="form-group">
          <label>{t("loanVendor.type")}</label>
          <div className="loan-type-toggle">
            {TYPES.map(value => <button type="button" key={value} className={form.type === value ? "active" : ""} onClick={() => setForm(current => ({ ...current, type: value }))}>{t(`loanVendor.${value.toLowerCase()}`)}</button>)}
          </div>
          <p className="vendor-origin-help">{t("loanVendor.typeHelp")}</p>
        </div>
        <div className="form-group">
          <label>{t("loanVendor.description")}</label>
          <textarea placeholder={t("loanVendor.descriptionPlaceholder")} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} />
        </div>
        <div className="form-row">
          <TextInput label={t("loanVendor.phone")} placeholder={t("loanVendor.phonePlaceholder")} value={form.phone} onChange={phone => setForm(current => ({ ...current, phone }))} />
          <TextInput label={t("loanVendor.address")} placeholder={t("loanVendor.addressPlaceholder")} value={form.address} onChange={address => setForm(current => ({ ...current, address }))} />
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title={t("loanVendor.deleteTitle")}
        onClose={() => { if (!deleteMutation.isLoading) setDeleteTarget(null); }}
        footer={<>
          <button className="btn-cancel-modal" disabled={deleteMutation.isLoading} onClick={() => setDeleteTarget(null)}>{t("wording.cancel")}</button>
          <button className="btn-del-ok" disabled={deleteMutation.isLoading} onClick={() => void removeVendor()}>{t("wording.delete")}</button>
        </>}
      >
        <p>{t("loanVendor.deleteConfirm", { name: deleteTarget?.name })}</p>
      </Modal>
    </>
  );
}
