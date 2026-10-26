import { useDeferredValue, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useQueryClient } from "react-query";
import { toast } from "react-toastify";

import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import ProductionLogTab from "../components/ProductionLogTab";
import SearchableSelect from "../components/SearchableSelect";
import TextInput from "../components/TextInput";
import { IconDelete, IconEdit, IconPlus, IconSearch } from "../components/icons";
import {
  type VendorItem,
  type VendorOrigin,
  type VendorPayload,
  useCreateVendor,
  useDeleteVendor,
  useGetVendors,
  useUpdateVendor,
} from "../hooks/api/useVendors";
import { useWarehouseController } from "./lib/useWarehouseController";

const PAGE_SIZE = 10;
const EMPTY_FORM: VendorPayload = {
  name: "",
  origin: "External",
  category: "",
  contact: "",
};
const ORIGINS: VendorOrigin[] = ["Internal", "External"];

function errorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as {
    response?: { data?: { message?: string } };
    message?: string;
  })?.response?.data?.message;
  return apiMessage || (error as { message?: string })?.message || fallback;
}

export default function VendorPage({ kind = 'production' }: { kind?: 'production' | 'loan' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { warehouseOptions } = useWarehouseController();
  const [activeTab, setActiveTab] = useState<"vendors" | "produced">("vendors");
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());
  const [origin, setOrigin] = useState<VendorOrigin | "">("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<VendorPayload>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VendorItem | null>(null);

  const vendorQuery = useGetVendors({
    params: {
      page,
      limit: PAGE_SIZE,
      ...(search ? { search } : {}),
      ...(origin ? { origin } : {}),
    },
    options: { keepPreviousData: true, enabled: activeTab === "vendors" },
  });
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const deleteMutation = useDeleteVendor();

  const result = vendorQuery.data?.data;
  const vendors = result?.items ?? [];
  const stats = result?.stats ?? { total: 0, internal: 0, external: 0 };
  const total = result?.total ?? 0;
  const limit = result?.limit || PAGE_SIZE;
  const currentPage = result?.page || page;
  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  function resetFormModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function openNewVendor() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditVendor(vendor: VendorItem) {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name,
      origin: vendor.origin,
      category: vendor.category ?? "",
      contact: vendor.contact ?? "",
    });
    setModalOpen(true);
  }

  async function saveVendor() {
    const payload: VendorPayload = {
      ...form,
      name: form.name.trim(),
      category: form.category.trim(),
      contact: form.contact.trim(),
    };
    if (!payload.name || isSaving) return;

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, payload });
        toast.success(t("sourceUpgrade.vendorUpdated"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("sourceUpgrade.vendorCreated"));
      }
      resetFormModal();
      await queryClient.invalidateQueries("useGetVendors");
    } catch (error) {
      toast.error(
        errorMessage(
          error,
          t(
            editingId
              ? "sourceUpgrade.failedUpdateVendor"
              : "sourceUpgrade.failedCreateVendor",
          ),
        ),
      );
    }
  }

  async function removeVendor() {
    if (!deleteTarget || deleteMutation.isLoading) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      const shouldMoveBack = vendors.length === 1 && page > 1;
      if (shouldMoveBack) setPage(current => current - 1);
      setDeleteTarget(null);
      toast.success(t("sourceUpgrade.vendorDeleted"));
      await queryClient.invalidateQueries("useGetVendors");
    } catch (error) {
      toast.error(errorMessage(error, t("sourceUpgrade.failedDeleteVendor")));
    }
  }

  const summary = [
    {
      label: t("sourceUpgrade.totalVendors"),
      value: stats.total,
      color: "var(--brand)",
      background: "var(--brand-bg)",
    },
    {
      label: t("sourceUpgrade.internal"),
      value: stats.internal,
      color: "var(--green)",
      background: "var(--green-bg)",
    },
    {
      label: t("sourceUpgrade.external"),
      value: stats.external,
      color: "var(--orange)",
      background: "var(--orange-bg)",
    },
  ];

  return (
    <>
      <div className="vendor-page-header">
        <div>
          <h1 className="page-title">{t("sourceUpgrade.vendors")}</h1>
          <p className="vendor-page-description">
            {t("sourceUpgrade.vendorDescription")}
          </p>
        </div>
        {activeTab === "vendors" && (
          <button className="btn-new" onClick={openNewVendor}>
            <IconPlus />
            {t("sourceUpgrade.newVendor")}
          </button>
        )}
      </div>

      <div className="wi-tabs">
        <button
          type="button"
          className={`wi-tab-btn${activeTab === "vendors" ? " active" : ""}`}
          onClick={() => setActiveTab("vendors")}
        >
          {t("sourceUpgrade.vendors")}
        </button>
        <button
          type="button"
          className={`wi-tab-btn${activeTab === "produced" ? " active" : ""}`}
          onClick={() => setActiveTab("produced")}
        >
          {t("october.productionLog")}
        </button>
      </div>

      {activeTab === "vendors" ? (
        <>
          {kind === 'loan' && <p className="ed-lock-note">{t('october.sharedVendors')}</p>}
          <div className="stats-bar vendor-stats-bar">
            {summary.map(item => (
              <div className="stat-card" key={item.label}>
                <span
                  className="stat-icon"
                  style={{ background: item.background }}
                >
                  <strong className="stat-value" style={{ color: item.color }}>
                    {item.value}
                  </strong>
                </span>
                <span className="stat-label">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="card vendor-list-card">
        <div className="toolbar vendor-toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                aria-label={t("sourceUpgrade.searchVendor")}
                className="search-input"
                placeholder={t("sourceUpgrade.searchVendor")}
                value={searchInput}
                onChange={event => {
                  setSearchInput(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="vendor-origin-filter">
              <SearchableSelect
                value={origin}
                onChange={value => {
                  setOrigin(value as VendorOrigin | "");
                  setPage(1);
                }}
                options={[
                  { value: "", label: t("sourceUpgrade.allOrigins") },
                  ...ORIGINS.map(value => ({ value, label: value })),
                ]}
              />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("sourceUpgrade.name")}</th>
                <th>{t("sourceUpgrade.origin")}</th>
                <th>{t("sourceUpgrade.category")}</th>
                <th>{t("sourceUpgrade.contact")}</th>
                <th>{t("sourceUpgrade.action")}</th>
              </tr>
            </thead>
            <tbody>
              {vendorQuery.isLoading && (
                <tr>
                  <td className="vendor-empty-cell" colSpan={5}>
                    {t("wording.loading")}
                  </td>
                </tr>
              )}
              {vendorQuery.isError && !vendorQuery.isLoading && (
                <tr>
                  <td className="vendor-empty-cell vendor-error-cell" colSpan={5}>
                    {errorMessage(
                      vendorQuery.error,
                      t("sourceUpgrade.failedLoadVendors"),
                    )}
                  </td>
                </tr>
              )}
              {!vendorQuery.isLoading && !vendorQuery.isError && vendors.length === 0 && (
                <tr>
                  <td className="vendor-empty-cell" colSpan={5}>
                    {t("sourceUpgrade.noVendors")}
                  </td>
                </tr>
              )}
              {vendors.map(vendor => (
                <tr
                  key={vendor.id}
                  className="row-clickable"
                  role="link"
                  tabIndex={0}
                  title={t("wording.viewDetail")}
                  onClick={() => navigate(`/vendor-detail?id=${vendor.id}&kind=${kind}`)}
                  onKeyDown={event => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/vendor-detail?id=${vendor.id}&kind=${kind}`);
                    }
                  }}
                >
                  <td className="name-cell">{vendor.name}</td>
                  <td>
                    <span
                      className={`badge badge-${
                        vendor.origin === "Internal" ? "green" : "orange"
                      }`}
                    >
                      {vendor.origin}
                    </span>
                  </td>
                  <td>{vendor.category || "—"}</td>
                  <td>{vendor.contact || "—"}</td>
                  <td
                    onClick={event => event.stopPropagation()}
                    onKeyDown={event => event.stopPropagation()}
                  >
                    <div className="action-btns">
                      <button
                        className="btn-icon edit"
                        aria-label={t("wording.edit")}
                        onClick={() => openEditVendor(vendor)}
                      >
                        <IconEdit />
                      </button>
                      <button
                        className="btn-icon delete"
                        disabled={kind === 'loan'}
                        aria-label={t("wording.delete")}
                        onClick={() => setDeleteTarget(vendor)}
                      >
                        <IconDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          total={total}
          pageSize={limit}
          onPage={setPage}
          label={t("sourceUpgrade.vendors")}
        />
          </div>
        </>
      ) : (
        <ProductionLogTab warehouseOptions={warehouseOptions} />
      )}

      <Modal
        open={modalOpen}
        title={t(
          editingId ? "sourceUpgrade.editVendor" : "sourceUpgrade.newVendor",
        )}
        onClose={() => {
          if (!isSaving) resetFormModal();
        }}
        footer={
          <>
            <button
              className="btn-cancel-modal"
              disabled={isSaving}
              onClick={resetFormModal}
            >
              {t("wording.cancel")}
            </button>
            <button
              className="btn-save-modal"
              disabled={!form.name.trim() || isSaving}
              onClick={() => void saveVendor()}
            >
              {t(isSaving ? "wording.saving" : "wording.save")}
            </button>
          </>
        }
      >
        <TextInput
          label={t("sourceUpgrade.name")}
          isRequired
          placeholder={t("sourceUpgrade.vendorNamePlaceholder")}
          value={form.name}
          onChange={name => setForm(current => ({ ...current, name }))}
        />
        <div className="form-group">
          <label>{t("sourceUpgrade.origin")}</label>
          <SearchableSelect
            value={form.origin}
            onChange={value =>
              setForm(current => ({
                ...current,
                origin: value as VendorOrigin,
              }))
            }
            options={ORIGINS.map(value => ({ value, label: value }))}
          />
          <p className="vendor-origin-help">{t("sourceUpgrade.originHelp")}</p>
        </div>
        <div className="form-row">
          <TextInput
            label={t("sourceUpgrade.category")}
            placeholder={t("sourceUpgrade.categoryPlaceholder")}
            value={form.category}
            onChange={category => setForm(current => ({ ...current, category }))}
          />
          <TextInput
            label={t("sourceUpgrade.contact")}
            placeholder={t("sourceUpgrade.contactPlaceholder")}
            value={form.contact}
            onChange={contact => setForm(current => ({ ...current, contact }))}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title={t("sourceUpgrade.deleteVendorTitle")}
        onClose={() => {
          if (!deleteMutation.isLoading) setDeleteTarget(null);
        }}
        footer={
          <>
            <button
              className="btn-cancel-modal"
              disabled={deleteMutation.isLoading}
              onClick={() => setDeleteTarget(null)}
            >
              {t("wording.cancel")}
            </button>
            <button
              className="btn-del-ok"
              disabled={deleteMutation.isLoading}
              onClick={() => void removeVendor()}
            >
              {t("wording.delete")}
            </button>
          </>
        }
      >
        <p>{t("sourceUpgrade.deleteVendor", { name: deleteTarget?.name })}</p>
      </Modal>
    </>
  );
}
