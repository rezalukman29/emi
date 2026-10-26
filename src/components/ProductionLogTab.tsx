import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import useCreateProductionRequest from "../hooks/api/useCreateProductionRequest";
import useGetProductionRequestList, {
  type ProductionRequestSource,
  type ProductionRequestStatus,
} from "../hooks/api/useGetProductionRequestList";
import {
  useCancelProductionRequest,
  useUpdateProductionRequestStatus,
  type ProductionRequestNextStatus,
} from "../hooks/api/useProductionRequestActions";
import { useGetVendors, type VendorOrigin } from "../hooks/api/useVendors";
import { fmtNum } from "../lib/format";
import { loadProductions } from "../lib/reportData";
import { InventoryService } from "../service/InventoryService";
import Modal from "./Modal";
import Pagination from "./Pagination";
import SearchableSelect, { type SearchableSelectOption } from "./SearchableSelect";
import { IconCheck, IconClose, IconPlus, IconSearch } from "./icons";

const PAGE_SIZE = 10;

interface ProductionLogTabProps {
  vendorId?: number;
  warehouseOptions?: SearchableSelectOption[];
}

type ProductionItemMode = "existing" | "new";

interface RestockProductionForm {
  itemMode: ProductionItemMode;
  barangId: string;
  newName: string;
  qty: string;
  warehouseId: string;
  vendorOrigin: VendorOrigin;
  vendorId: string;
  notes: string;
}

const EMPTY_RESTOCK_FORM: RestockProductionForm = {
  itemMode: "existing",
  barangId: "",
  newName: "",
  qty: "1",
  warehouseId: "",
  vendorOrigin: "Internal",
  vendorId: "",
  notes: "",
};

function requestError(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message
    ?? (error instanceof Error ? error.message : fallback);
}

function statusBadge(status: string) {
  if (status === "DONE") return "badge-green";
  if (status === "IN_PRODUCTION") return "badge-blue";
  if (status === "REQUESTED") return "badge-orange";
  return "badge-gray";
}

function VendorProductionLog({ vendorId }: { vendorId: number }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery(["production-log"], loadProductions, { staleTime: 30000 });
  const rows = (query.data || []).filter(
    (row) => row.vendor_id === vendorId
      && `${row.item_name} ${row.eventName}`.toLowerCase().includes(search.toLowerCase()),
  );
  const safePage = Math.min(page, Math.max(1, Math.ceil(rows.length / 25)));

  return (
    <section className="card">
      <div className="oct-toolbar">
        <h3>{t("october.productionLog")}</h3>
        <input
          placeholder={t("wording.search")}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>
      <p className="ed-lock-note">{t("october.productionNote")}</p>
      {query.isLoading ? (
        <p>{t("wording.loading")}</p>
      ) : query.isError ? (
        <p role="alert">{t("october.loadError")}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['item', 'qty', 'event', 'status'].map((key) => (
                  <th key={key}>{t(`october.${key}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice((safePage - 1) * 25, safePage * 25).map((row) => (
                <tr key={`${row.eventId}-${row.type}-${row.id}`}>
                  <td>{row.item_name || row.new_item?.nama || '—'}</td>
                  <td>{fmtNum(row.qty ?? row.new_item?.qty)}</td>
                  <td><Link to={`/event-detail?id=${row.eventId}`}>{row.eventName}</Link></td>
                  <td>{row.status}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={4}>{t("eventUpgrade.noRequests")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!query.isLoading && !query.isError && (
        <Pagination currentPage={safePage} total={rows.length} pageSize={25} onPage={setPage} />
      )}
    </section>
  );
}

function WarehouseProductionLog({
  warehouseOptions,
}: Pick<ProductionLogTabProps, "warehouseOptions">) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canRecord = warehouseOptions !== undefined;
  const availableWarehouses = warehouseOptions ?? [];
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductionRequestStatus | "">("");
  const [source, setSource] = useState<ProductionRequestSource | "">("");
  const [warehouseId, setWarehouseId] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RestockProductionForm>(EMPTY_RESTOCK_FORM);
  const [inventorySearchDraft, setInventorySearchDraft] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [activeAction, setActiveAction] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchDraft]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setInventorySearch(inventorySearchDraft.trim()),
      350,
    );
    return () => window.clearTimeout(timeout);
  }, [inventorySearchDraft]);

  const query = useGetProductionRequestList({
    params: {
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
      ...(warehouseId ? { warehouse_id: Number(warehouseId) } : {}),
      ...(search ? { search } : {}),
      page,
      limit: PAGE_SIZE,
    },
    options: {
      keepPreviousData: true,
      staleTime: 30000,
    },
  });

  const response = query.data?.data;
  const rows = response?.data ?? [];
  const summary = response?.summary;
  const safePage = Math.min(page, Math.max(1, response?.total_pages ?? 1));

  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [page, safePage]);

  const inventoryQuery = useQuery(
    ["production-restock-inventory", inventorySearch],
    () => InventoryService.getInventory({
      page: 1,
      limit: 100,
      sort: "ASC",
      sortBy: "name",
      ...(inventorySearch ? { search: inventorySearch } : {}),
    }),
    {
      enabled: canRecord && modalOpen && form.itemMode === "existing",
      keepPreviousData: true,
      staleTime: 30000,
    },
  );
  const inventoryItems: Array<{
    id: number;
    nama?: string;
    name?: string;
    code?: string;
    kode?: string;
  }> = (inventoryQuery.data as any)?.data?.data ?? [];
  const selectedInventoryItem = inventoryItems.find(
    (item) => String(item.id) === form.barangId,
  );

  const vendorQuery = useGetVendors({
    params: { page: 1, limit: 100, origin: form.vendorOrigin },
    options: {
      enabled: canRecord && modalOpen,
      keepPreviousData: true,
      staleTime: 30000,
    },
  });
  const vendors = vendorQuery.data?.data?.items ?? [];
  const { mutateAsync: createProductionRequest, isLoading: isSaving } =
    useCreateProductionRequest();
  const { mutateAsync: cancelRequest } = useCancelProductionRequest();
  const { mutateAsync: updateRequestStatus } =
    useUpdateProductionRequestStatus();

  const selectedItemName = form.itemMode === "existing"
    ? (selectedInventoryItem?.nama ?? selectedInventoryItem?.name ?? "")
    : form.newName.trim();
  const parsedQty = Number(form.qty);
  const formValid = Boolean(
    selectedItemName
      && Number.isInteger(parsedQty)
      && parsedQty >= 1
      && form.warehouseId
      && form.vendorId,
  );

  function openRecordModal() {
    setForm(EMPTY_RESTOCK_FORM);
    setInventorySearchDraft("");
    setInventorySearch("");
    setModalOpen(true);
  }

  async function submitRestockProduction() {
    if (!formValid || isSaving) return;

    try {
      const response = await createProductionRequest({
        request_type: "NEW_PRODUCTION",
        item_name: selectedItemName,
        name: selectedItemName,
        ...(form.itemMode === "existing"
          ? { barang_id: Number(form.barangId) }
          : {}),
        qty: parsedQty,
        warehouse_id: Number(form.warehouseId),
        vendor_id: Number(form.vendorId),
        origin: form.vendorOrigin,
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      });
      setPage(1);
      await query.refetch();
      toast.success(response.message || t("productionList.created"));
      setModalOpen(false);
    } catch (error) {
      toast.error(requestError(error, t("productionList.createError")));
    }
  }

  async function refreshAfterAction(stockChanged = false) {
    await query.refetch();
    if (stockChanged) {
      await Promise.all([
        queryClient.invalidateQueries(["useGetWarehouseInventorySummary"]),
        queryClient.invalidateQueries(["useGetBarangGudang"]),
      ]);
    }
  }

  async function cancelRestockRequest(id: number) {
    if (!window.confirm(t("productionList.confirmCancel"))) return;
    setActiveAction(`cancel:${id}`);
    try {
      const response = await cancelRequest(id);
      await refreshAfterAction();
      toast.success(response.message || t("productionList.cancelled"));
    } catch (error) {
      toast.error(requestError(error, t("productionList.actionError")));
    } finally {
      setActiveAction("");
    }
  }

  async function moveRestockRequest(
    id: number,
    status: ProductionRequestNextStatus,
  ) {
    setActiveAction(`${status}:${id}`);
    try {
      const response = await updateRequestStatus({ id, status });
      await refreshAfterAction(status === "DONE");
      toast.success(response.message || t(
        status === "DONE"
          ? "productionList.markedDone"
          : "productionList.started",
      ));
    } catch (error) {
      toast.error(requestError(error, t("productionList.actionError")));
    } finally {
      setActiveAction("");
    }
  }

  const statusOptions: SearchableSelectOption[] = [
    { value: "", label: t("productionList.allStatuses") },
    { value: "REQUESTED", label: t("productionList.requested") },
    { value: "IN_PRODUCTION", label: t("productionList.inProduction") },
    { value: "DONE", label: t("productionList.done") },
  ];
  const sourceOptions: SearchableSelectOption[] = [
    { value: "", label: t("productionList.allSources") },
    { value: "EVENT", label: t("productionList.eventSource") },
    { value: "RESTOCK", label: t("productionList.restockSource") },
  ];
  const deployWarehouseOptions: SearchableSelectOption[] = [
    { value: "", label: t("productionList.allWarehouses") },
    ...availableWarehouses,
  ];
  const statusText: Record<string, string> = {
    REQUESTED: t("productionList.requested"),
    IN_PRODUCTION: t("productionList.inProduction"),
    DONE: t("productionList.done"),
  };

  return (
    <>
      <div className="stats-bar production-summary" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 18 }}>
        {[
          { label: t("productionList.productionRecords"), value: summary?.production_records ?? 0, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: t("productionList.inProgress"), value: summary?.in_progress ?? 0, color: "var(--orange)", bg: "var(--orange-bg)" },
          { label: t("productionList.done"), value: summary?.done ?? 0, color: "var(--green)", bg: "var(--green-bg)" },
          { label: t("productionList.qtyProduced"), value: summary?.qty_produced ?? 0, color: "var(--purple)", bg: "var(--purple-bg)" },
        ].map((item) => (
          <div key={item.label} className="stat-card">
            <div className="stat-icon" style={{ background: item.bg }}>
              <span className="stat-value" style={{ color: item.color }}>{fmtNum(item.value)}</span>
            </div>
            <span className="stat-label">{item.label}</span>
          </div>
        ))}
      </div>

      <section className="card production-list-card">
        <div className="toolbar">
          <div className="toolbar-left production-filter-bar">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input"
                type="search"
                placeholder={t("productionList.searchPlaceholder")}
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </div>
            <SearchableSelect
              inline
              value={status}
              onChange={(value) => {
                setStatus(String(value) as ProductionRequestStatus | "");
                setPage(1);
              }}
              placeholder={t("productionList.allStatuses")}
              options={statusOptions}
            />
            <SearchableSelect
              inline
              value={source}
              onChange={(value) => {
                setSource(String(value) as ProductionRequestSource | "");
                setPage(1);
              }}
              placeholder={t("productionList.allSources")}
              options={sourceOptions}
            />
            <SearchableSelect
              inline
              value={warehouseId}
              onChange={(value) => {
                setWarehouseId(String(value));
                setPage(1);
              }}
              placeholder={t("productionList.allWarehouses")}
              searchPlaceholder={t("wording.searchWarehouse")}
              options={deployWarehouseOptions}
            />
          </div>
          {canRecord && (
            <div className="toolbar-right">
              <button type="button" className="btn-new" onClick={openRecordModal}>
                <IconPlus /> {t("productionList.recordProduction")}
              </button>
            </div>
          )}
        </div>

        <p className="production-list-note">{t("productionList.description")}</p>

        {query.isLoading && !query.data ? (
          <p>{t("wording.loading")}</p>
        ) : query.isError ? (
          <p role="alert">{t("productionList.loadError")}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>{t("productionList.requestedAt")}</th>
                  <th>{t("productionList.item")}</th>
                  <th style={{ width: 60, textAlign: "right" }}>{t("productionList.qty")}</th>
                  <th>{t("productionList.vendor")}</th>
                  <th>{t("productionList.event")}</th>
                  <th>{t("productionList.deployTo")}</th>
                  <th style={{ width: 120 }}>{t("productionList.status")}</th>
                  <th style={{ width: 100 }}>{t("productionList.finished")}</th>
                  <th style={{ width: 160, textAlign: "center" }}>{t("productionList.action")}</th>
                </tr>
              </thead>
              <tbody>
                {!rows.length ? (
                  <tr>
                    <td colSpan={9} className="production-empty">{t("productionList.noRecords")}</td>
                  </tr>
                ) : rows.map((item) => (
                  <tr key={item.id}>
                    <td className="production-date">{item.requested_at || "—"}</td>
                    <td className="name-cell">
                      <span>{item.item_name || "—"}</span>
                      {item.request_type === "REPLACEMENT" && (
                        <span className="badge badge-red production-replacement">{t("productionList.replacement")}</span>
                      )}
                      {item.notes && <div className="production-notes">{item.notes}</div>}
                    </td>
                    <td className="production-qty">{fmtNum(item.qty)}</td>
                    <td>
                      {item.vendor ? (
                        <>
                          <Link to={`/vendor-detail?id=${item.vendor.id}`}>{item.vendor.name}</Link>
                          <div>
                            <span className={`badge ${item.vendor.origin?.toUpperCase() === "INTERNAL" ? "badge-green" : "badge-orange"} production-origin`}>
                              {item.vendor.origin}
                            </span>
                          </div>
                        </>
                      ) : "—"}
                    </td>
                    <td>
                      {item.event ? (
                        <>
                          <Link to={`/event-detail?id=${item.event.id}`}>{item.event.name}</Link>
                          {(item.event.area || item.event.sub_area) && (
                            <div className="production-event-area">
                              {[item.event.area, item.event.sub_area].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="production-muted">{t("productionList.restockSource")}</span>
                      )}
                    </td>
                    <td>{item.warehouse?.name || "—"}</td>
                    <td>
                      <span className={`badge ${statusBadge(item.status)}`}>
                        {statusText[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="production-date">{item.finished_at || "—"}</td>
                    <td>
                      <div className="action-btns production-action">
                        {item.source === "RESTOCK" || !item.event ? (
                          item.status === "REQUESTED" ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost production-row-btn"
                                disabled={Boolean(activeAction)}
                                onClick={() => void cancelRestockRequest(item.id)}
                              >
                                {activeAction === `cancel:${item.id}`
                                  ? t("wording.loading")
                                  : t("productionList.cancel")}
                              </button>
                              <button
                                type="button"
                                className="btn-save-modal production-row-btn"
                                disabled={Boolean(activeAction)}
                                onClick={() => void moveRestockRequest(item.id, "IN_PRODUCTION")}
                              >
                                {activeAction === `IN_PRODUCTION:${item.id}`
                                  ? t("wording.loading")
                                  : t("productionList.start")}
                              </button>
                            </>
                          ) : item.status === "IN_PRODUCTION" ? (
                            <button
                              type="button"
                              className="btn-save-modal production-row-btn"
                              disabled={Boolean(activeAction)}
                              onClick={() => void moveRestockRequest(item.id, "DONE")}
                            >
                              {activeAction === `DONE:${item.id}`
                                ? t("wording.loading")
                                : t("productionList.markDone")}
                            </button>
                          ) : item.status === "DONE" ? (
                            <span className="production-complete">{t("productionList.addedToStock")}</span>
                          ) : "—"
                        ) : item.source === "EVENT" && item.event ? (
                          item.status === "DONE" ? (
                            <span className="production-muted">{t("productionList.done")}</span>
                          ) : (
                            <Link to={`/event-detail?id=${item.event.id}`} className="production-action-link">
                              {t("productionList.updateInEventDetail")}
                            </Link>
                          )
                        ) : "—"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!query.isLoading && !query.isError && (
          <Pagination
            currentPage={safePage}
            total={response?.total_records ?? 0}
            pageSize={response?.record_per_page || PAGE_SIZE}
            onPage={setPage}
            label={t("productionList.records")}
          />
        )}
      </section>

      {canRecord && (
        <Modal
          open={modalOpen}
          title={t("productionList.recordProduction")}
          onClose={() => {
            if (!isSaving) setModalOpen(false);
          }}
          footer={(
            <>
              <button
                type="button"
                className="btn-cancel-modal"
                disabled={isSaving}
                onClick={() => setModalOpen(false)}
              >
                <IconClose /> {t("wording.cancel")}
              </button>
              <button
                type="button"
                className="btn-save-modal"
                disabled={!formValid || isSaving}
                onClick={() => void submitRestockProduction()}
              >
                <IconCheck /> {t(isSaving ? "wording.saving" : "wording.save")}
              </button>
            </>
          )}
        >
          <div className="form-group">
            <label>
              {t("productionList.item")} <span className="required-mark">*</span>
            </label>
            <div className="seg-choice production-item-mode" role="radiogroup">
              {([
                ["existing", t("productionList.existingItem")],
                ["new", t("productionList.newItem")],
              ] as Array<[ProductionItemMode, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={form.itemMode === value}
                  className={form.itemMode === value ? "active" : ""}
                  onClick={() => setForm((current) => ({
                    ...current,
                    itemMode: value,
                    barangId: "",
                    newName: "",
                  }))}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.itemMode === "existing" ? (
              <SearchableSelect
                value={form.barangId}
                onChange={(value) => setForm((current) => ({
                  ...current,
                  barangId: String(value),
                }))}
                onSearchChange={setInventorySearchDraft}
                placeholder={t("productionList.searchInventory")}
                searchPlaceholder={t("productionList.searchInventory")}
                emptyText={inventoryQuery.isLoading
                  ? t("wording.loading")
                  : inventoryQuery.isError
                    ? t("productionList.inventoryLoadError")
                    : t("productionList.noInventoryItems")}
                options={inventoryItems.map((item) => ({
                  value: String(item.id),
                  label: item.nama ?? item.name ?? `#${item.id}`,
                  meta: item.code ?? item.kode ?? "",
                }))}
              />
            ) : (
              <input
                type="text"
                value={form.newName}
                placeholder={t("productionList.newItemPlaceholder")}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  newName: event.target.value,
                }))}
              />
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                {t("productionList.quantity")} <span className="required-mark">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.qty}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  qty: event.target.value,
                }))}
              />
            </div>
            <div className="form-group">
              <label>
                {t("productionList.deployWarehouse")} <span className="required-mark">*</span>
              </label>
              <SearchableSelect
                value={form.warehouseId}
                onChange={(value) => setForm((current) => ({
                  ...current,
                  warehouseId: String(value),
                }))}
                placeholder={t("productionList.selectWarehouse")}
                searchPlaceholder={t("wording.searchWarehouse")}
                options={availableWarehouses}
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              {t("productionList.madeBy")} <span className="required-mark">*</span>
            </label>
            <div className="seg-choice production-vendor-origin" role="radiogroup">
              {(["Internal", "External"] as VendorOrigin[]).map((origin) => (
                <button
                  key={origin}
                  type="button"
                  role="radio"
                  aria-checked={form.vendorOrigin === origin}
                  className={form.vendorOrigin === origin ? "active" : ""}
                  onClick={() => setForm((current) => ({
                    ...current,
                    vendorOrigin: origin,
                    vendorId: "",
                  }))}
                >
                  {t(origin === "Internal"
                    ? "productionList.internalVendor"
                    : "productionList.externalVendor")}
                </button>
              ))}
            </div>
            <SearchableSelect
              value={form.vendorId}
              onChange={(value) => setForm((current) => ({
                ...current,
                vendorId: String(value),
              }))}
              placeholder={t(
                form.vendorOrigin === "Internal"
                  ? "productionList.selectInternalVendor"
                  : "productionList.selectExternalVendor",
              )}
              emptyText={vendorQuery.isLoading
                ? t("wording.loading")
                : vendorQuery.isError
                  ? t("sourceUpgrade.failedLoadVendors")
                  : t("sourceUpgrade.noVendors")}
              options={vendors.map((vendor) => ({
                value: String(vendor.id),
                label: vendor.name,
                meta: vendor.contact,
              }))}
            />
          </div>

          <div className="form-group">
            <label>{t("productionList.note")}</label>
            <textarea
              rows={2}
              value={form.notes}
              placeholder={t("productionList.optional")}
              onChange={(event) => setForm((current) => ({
                ...current,
                notes: event.target.value,
              }))}
            />
          </div>
        </Modal>
      )}
    </>
  );
}

export default function ProductionLogTab(props: ProductionLogTabProps) {
  if (props.vendorId) return <VendorProductionLog vendorId={props.vendorId} />;
  return <WarehouseProductionLog warehouseOptions={props.warehouseOptions} />;
}
