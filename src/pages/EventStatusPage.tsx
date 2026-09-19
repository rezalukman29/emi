import { useState } from "react";
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";

import { IconCheck, IconClose, IconDelete, IconEdit, IconPlus, IconSearch } from "../components/icons";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import SortTh from "../components/SortTh";
import TextInput from "../components/TextInput";
import SearchableSelect from "../components/SearchableSelect";
import useGetEventStatus, {
  type GetEventStatusParams,
  type GetEventStatusResponse,
} from "../hooks/api/useGetEventStatus";
import usePostEventStatus from "../hooks/api/usePostEventStatus";
import usePutEventStatus from "../hooks/api/usePutEventStatus";
import { InventoryService } from "../service/InventoryService";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useEventLifecycle, updateLifecycle } from '../lib/eventLifecycle';


const PAGE_SIZE = 20;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ScanAction = "" | "SCAN_IN" | "SCAN_OUT";
type ScanSetting = "None" | "Scan";

interface EventStatusRow {
  code: string;
  id: number;
  order: number;
  status: string;
  scan: ScanSetting;
  action: string;
  eventRunning: number;
  updatedAt: string;
}

interface EventStatusForm {
  code: string;
  name: string;
  order_data: string;
  action: ScanAction;
  showScan: boolean;
}

function emptyForm(order = 1): EventStatusForm {
  return {
    code: '',
    name: "",
    order_data: String(order),
    action: "",
    showScan: false,
  };
}

function normalizeScanAction(action: string): ScanAction {
  const normalized = action.trim().toUpperCase().replace(/\s+/g, "_");
  return normalized === "SCAN_IN" || normalized === "SCAN_OUT"
    ? normalized
    : "";
}

function ScanActionBadge({ action }: { action: string }) {
  const normalized = normalizeScanAction(action);
  if (!normalized) return <span>-</span>;

  return (
    <span className={`badge ${normalized === "SCAN_IN" ? "badge-green" : "badge-orange"}`}>
      {normalized === "SCAN_IN" ? i18n.t("wording.scanIn") : i18n.t("wording.scanOut")}
    </span>
  );
}

function fmtDate(date: string) {
  if (!date) return "—";
  const [year, month, day] = date.split("-");
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(month) - 1]} ${year}`;
}

function ScanBadge({ scan }: { scan: ScanSetting }) {
  return scan === "Scan" ? (
    <span className="badge badge-green">{i18n.t("wording.yes")}</span>
  ) : (
    <span className="badge badge-orange">{i18n.t("wording.no")}</span>
  );
}

function mapEventStatuses(response: GetEventStatusResponse): EventStatusRow[] {
  return (response.data?.data ?? []).map((status) => ({
    id: status.id,
    code: status.code || '',
    order: status.order_data,
    status: status.name,
    scan: status.is_show_scan_result === 1 ? "Scan" : "None",
    action: status.action,
    eventRunning: status.active_event,
    updatedAt: status.created_at,
  }));
}

export default function EventStatusPage() {
  const lifecycleStore = useEventLifecycle();
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<EventStatusRow[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<GetEventStatusParams["sortBy"]>("order_data");
  const [sort, setSort] = useState<GetEventStatusParams["sort"]>("ASC");
  const [page, setPage] = useState(1);
  const [statusModal, setStatusModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [draftStatuses, setDraftStatuses] = useState<EventStatusRow[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const {
    data: response,
    isLoading,
    isError,
    refetch: refetchEventStatuses,
  } = useGetEventStatus({
    params: { page, limit: PAGE_SIZE, search, sort, sortBy },
    options: {
      keepPreviousData: true,
      onSuccess: (result) => setStatuses(mapEventStatuses(result)),
    },
  });
  const {
    data: orderedResponse,
    refetch: refetchOrderedEventStatuses,
  } = useGetEventStatus({
    params: {
      page: 1,
      limit: 9999,
      sort: "ASC",
      sortBy: "order_data",
    },
    options: { keepPreviousData: true },
  });
  const { mutateAsync: postEventStatus, isLoading: isCreating } = usePostEventStatus();
  const { mutateAsync: putEventStatus, isLoading: isUpdating } = usePutEventStatus();
  const isSaving = isCreating || isUpdating || isSavingOrder;

  const total = response?.data?.total_records ?? 0;
  const currentPage = response?.data?.page ?? page;
  const runningTotal = statuses.reduce((sum, status) => sum + status.eventRunning, 0);
  const scanEnabled = statuses.filter((status) => status.scan === "Scan").length;
  const deleteRecord = statuses.find((status) => status.id === deleteTarget);
  const orderedStatuses = orderedResponse
    ? mapEventStatuses(orderedResponse).sort((left, right) => left.order - right.order)
    : [...statuses].sort((left, right) => left.order - right.order);
  const displayedStatuses = (reorderMode ? draftStatuses : statuses).map(row => ({ ...row, code: lifecycleStore.codes[row.id] ?? row.code }));

  async function refetchStatusLists() {
    return Promise.all([
      refetchEventStatuses(),
      refetchOrderedEventStatuses(),
    ]);
  }

  const formik = useFormik<EventStatusForm>({
    initialValues: emptyForm(),
    validationSchema: Yup.object({
      name: Yup.string().trim().required(t("wording.required")),
      order_data: Yup.number().integer("Must be an integer").min(0, t("wording.minimumValueIs0")).required(t("wording.required")),
      action: Yup.string().oneOf(["", "SCAN_IN", "SCAN_OUT"]),
      showScan: Yup.boolean().required(),
    }),
    validateOnChange: false,
    onSubmit: async (values, { resetForm }) => {
      try {
        const payload = {
          name: values.name.trim(),
          is_show_scan_result: values.showScan ? 1 : 0,
          order_data: Number(values.order_data),
          action: values.action,
        };
        const result = editingId
          ? await putEventStatus({ ...payload, id: editingId })
          : await postEventStatus(payload);

        toast(result.message || (editingId ? t("wording.eventStatusUpdatedSuccessfully") : t("wording.eventStatusCreatedSuccessfully")), {
          type: "success",
        });
        setStatusModal(false);
        setEditingId(null);
        resetForm();
        const refreshed = await refetchStatusLists();
        const saved = editingId ?? refreshed[1].data?.data?.data?.find(row => row.name === values.name.trim() && row.order_data === Number(values.order_data))?.id;
        if (saved) updateLifecycle(data => { data.codes[saved] = values.code.trim().toUpperCase(); });
      } catch (error) {
        toast(
          error instanceof Error
            ? error.message
            : editingId
              ? t("wording.failedToUpdateEventStatus")
              : t("wording.failedToCreateEventStatus"),
          { type: "error" },
        );
      }
    },
  });

  function applySearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  function handleSort(field: GetEventStatusParams["sortBy"]) {
    if (reorderMode) return;
    if (sortBy === field) setSort((direction) => (direction === "ASC" ? "DESC" : "ASC"));
    else {
      setSortBy(field);
      setSort("ASC");
    }
    setPage(1);
  }

  function openNew() {
    if (reorderMode) return;
    setEditingId(null);
    formik.resetForm({ values: emptyForm(total + 1) });
    setStatusModal(true);
  }

  function openEdit(row: EventStatusRow) {
    if (reorderMode) return;
    setEditingId(row.id);
    formik.resetForm({
      values: {
        code: row.code,
        name: row.status,
        order_data: String(row.order),
        action: normalizeScanAction(row.action),
        showScan: row.scan === "Scan",
      },
    });
    setStatusModal(true);
  }

  function closeStatusModal() {
    if (isSaving) return;
    setStatusModal(false);
    setEditingId(null);
    formik.resetForm();
  }

  function startReorder() {
    setSortBy("order_data");
    setSort("ASC");
    setPage(1);
    setDraftStatuses(orderedStatuses.map((status) => ({ ...status })));
    setReorderMode(true);
  }

  function cancelReorder() {
    if (isSavingOrder) return;
    setDraftStatuses([]);
    setReorderMode(false);
  }

  function moveOrder(id: number, direction: number) {
    const sorted = [...draftStatuses].sort(
      (left, right) => left.order - right.order,
    );
    const index = sorted.findIndex((status) => status.id === id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;

    const current = sorted[index];
    const neighbor = sorted[swapIndex];
    sorted[index] = { ...neighbor, order: current.order };
    sorted[swapIndex] = { ...current, order: neighbor.order };
    setDraftStatuses(sorted);
  }

  async function saveReorder() {
    const originalOrder = new Map(
      orderedStatuses.map((status) => [status.id, status.order]),
    );
    const changedStatuses = draftStatuses.filter(
      (status) => originalOrder.get(status.id) !== status.order,
    );

    try {
      setIsSavingOrder(true);
      await Promise.all(
        changedStatuses.map((status) =>
          putEventStatus({
            id: status.id,
            name: status.status,
            is_show_scan_result: status.scan === "Scan" ? 1 : 0,
            order_data: status.order,
            action: normalizeScanAction(status.action),
          }),
        ),
      );
      toast.success(t("wording.eventStatusOrderUpdatedSuccessfully"));
      setReorderMode(false);
      setDraftStatuses([]);
      await refetchStatusLists();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("wording.failedToSaveEventStatusOrder"),
      );
    } finally {
      setIsSavingOrder(false);
    }
  }

  function openDelete(id: number) {
    if (reorderMode) return;
    setDeleteTarget(id);
    setDeleteModal(true);
  }

  async function confirmDelete() {
    if (deleteTarget === null) return;
    try {
      const result = await InventoryService.deleteStatus(String(deleteTarget));
      if (result?.success === false) {
        throw new Error(result.message || "Failed to delete event status.");
      }
      toast.success(result?.message || "Event status deleted successfully.");
      setDeleteModal(false);
      setDeleteTarget(null);
      await refetchStatusLists();
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(
        apiMessage ||
          (error instanceof Error
            ? error.message
            : t("wording.failedToDeleteEventStatus")),
      );
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>{t("wording.eventStatus")}</h1>
        <button className="btn-new" disabled={reorderMode} onClick={openNew}><IconPlus /> {t("wording.newStatus")}</button>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -14, marginBottom: 18 }}>
        {t("wording.thisListDrivesTheStageStepperOnEvery")}
      </p>

      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {[
          { label: t("wording.totalStatuses"), value: total, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: t("wording.scanEnabledOnPage"), value: scanEnabled, color: "var(--green)", bg: "var(--green-bg)" },
          { label: t("wording.eventsRunningOnPage"), value: runningTotal, color: "var(--orange)", bg: "var(--orange-bg)" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon" style={{ background: stat.bg }}>
              <span className="stat-value" style={{ color: stat.color }}>{stat.value}</span>
            </div>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input"
                type="text"
                placeholder={t("wording.searchStatus")}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") applySearch(); }}
              />
            </div>
            <button className="btn-search" onClick={applySearch}>{t("wording.search")}</button>
          </div>
          <div className="toolbar-right">
            {reorderMode ? (
              <>
                <button className="btn-cancel-modal" disabled={isSavingOrder} onClick={cancelReorder}><IconClose /> {t("wording.cancel")}</button>
                <button className="btn-save-modal" disabled={isSavingOrder} onClick={() => void saveReorder()}><IconCheck /> {isSavingOrder ? t("wording.saving") : t("wording.saveOrder")}</button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost" disabled={!orderedResponse} onClick={startReorder}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="8 7 12 3 16 7" /><polyline points="16 17 12 21 8 17" /><line x1="12" y1="3" x2="12" y2="21" /></svg>
                  {t("wording.editOrder")}
                </button>
                <button className="btn-new" onClick={openNew}><IconPlus /> {t("wording.new")}</button>
              </>
            )}
          </div>
        </div>

        {reorderMode && (
          <p className="event-status-reorder-help">
            {t("wording.reorderingUseTheArrowsBelowThen")} <strong>{t("wording.saveOrder")}</strong> {t("wording.toApplyOr")} <strong>{t("wording.cancel")}</strong> {t("wording.toDiscard")}
          </p>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label={t("wording.order")} id="order_data" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ width: 70, textAlign: "center" }} />
                <th style={{ width: 80, textAlign: "center" }}>{t("wording.editOrder")}</th>
                <SortTh label={t("wording.status")} id="name" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} />
                <th style={{ width: 100, textAlign: "center" }}>{t("wording.showScan")}</th>
                <th>{t('wording.code')}</th>
                <th style={{ width: 120, textAlign: "center" }}>{t("wording.action")}</th>
                <SortTh label={t("wording.eventRunning")} id="active_event" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ width: 120, textAlign: "right" }} />
                <SortTh label={t("wording.createdAt")} id="created_at" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ width: 120 }} />
                <th style={{ width: 100, textAlign: "center" }}>{t("wording.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && statuses.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 40 }}>{t("wording.loadingEventStatuses")}</td></tr>
              ) : isError ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--red)" }}>{t("wording.failedToLoadEventStatuses")}</td></tr>
              ) : displayedStatuses.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>{t("wording.noStatusesFound")}</td></tr>
              ) : (
                displayedStatuses.map((row) => {
                  const orderedIndex = displayedStatuses.findIndex((status) => status.id === row.id);
                  return (
                  <tr key={row.id}>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "var(--brand-bg)", color: "var(--brand)", borderRadius: 6, fontWeight: 700, fontSize: 13 }}>{row.order}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {reorderMode ? (
                        <div style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
                          <button className="btn-icon" title={t("wording.moveUp")} style={{ padding: "2px 5px", color: orderedIndex <= 0 ? "var(--border)" : "var(--text-muted)" }} disabled={orderedIndex <= 0 || isSavingOrder} onClick={() => moveOrder(row.id, -1)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><polyline points="18 15 12 9 6 15" /></svg>
                          </button>
                          <button className="btn-icon" title={t("wording.moveDown")} style={{ padding: "2px 5px", color: orderedIndex === displayedStatuses.length - 1 ? "var(--border)" : "var(--text-muted)" }} disabled={orderedIndex === displayedStatuses.length - 1 || isSavingOrder} onClick={() => moveOrder(row.id, 1)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><polyline points="6 9 12 15 18 9" /></svg>
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td className="name-cell">{row.status}</td>
                    <td style={{ textAlign: "center" }}><ScanBadge scan={row.scan} /></td>
                    <td><span className="badge badge-gray">{row.code || '—'}</span></td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>
                      <ScanActionBadge action={row.action} />
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      <span style={{ color: row.eventRunning > 0 ? "var(--orange)" : "var(--text-muted)" }}>{row.eventRunning}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{fmtDate(row.updatedAt)}</td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: "center" }}>
                        <button className="btn-icon edit" title={t("wording.edit")} disabled={reorderMode} onClick={() => openEdit(row)}><IconEdit /></button>
                        <button className="btn-icon delete" title={t("wording.delete")} disabled={reorderMode} onClick={() => openDelete(row.id)}><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!reorderMode && (
          <Pagination currentPage={currentPage} total={total} pageSize={PAGE_SIZE} onPage={(nextPage: number) => setPage(nextPage)} label={t("wording.statuses")} />
        )}
      </div>

      <Modal
        open={statusModal}
        title={editingId ? t("wording.editEventStatus") : t("wording.newEventStatus")}
        onClose={closeStatusModal}
        footer={
          <>
            <button className="btn-cancel-modal" disabled={isSaving} onClick={closeStatusModal}><IconClose /> {t("wording.cancel")}</button>
            <button className="btn-save-modal" type="submit" disabled={isSaving} onClick={() => formik.handleSubmit()}><IconCheck /> {isSaving ? t("common.actions.saving") : t("common.actions.save")}</button>
          </>
        }
      >
        <TextInput
          value={formik.values.order_data}
          onChange={(value) => formik.setFieldValue("order_data", value)}
          isRequired
          isNumeric
          label={t("wording.order")}
          placeholder={t("wording.eG1")}
          errorText={formik.errors.order_data}
        />
        <TextInput
          value={formik.values.name}
          onChange={(value) => formik.setFieldValue("name", value)}
          isRequired
          label={t("wording.statusName")}
          placeholder={t("wording.eGEventRunning")}
          errorText={formik.errors.name}
        />
        <TextInput label={t('wording.code')} value={formik.values.code} onChange={value => formik.setFieldValue('code', value.toUpperCase())} />
        <p className="summary-text">{t('lifecycle.codePreview')}</p>
        <div className="form-group">
          <label>{t("wording.scan")}</label>
          <SearchableSelect
            value={formik.values.action}
            onChange={(value) => formik.setFieldValue("action", value as ScanAction)}
            options={[
              { value: "", label: t("wording.none") },
              { value: "SCAN_IN", label: t("wording.scanIn") },
              { value: "SCAN_OUT", label: t("wording.scanOut") },
            ]}
            placeholder={t("wording.none")}
            errorText={formik.errors.action}
          />
        </div>
        <div className="form-group">
          <label>{t("wording.showScan")}</label>
          <button
            type="button"
            role="switch"
            aria-checked={formik.values.showScan}
            className={`event-status-toggle${formik.values.showScan ? " active" : ""}`}
            onClick={() => formik.setFieldValue("showScan", !formik.values.showScan)}
          >
            <span className="event-status-toggle-knob" />
          </button>
        </div>
      </Modal>

      <Modal
        open={deleteModal}
        title={t("wording.deleteEventStatus")}
        onClose={() => setDeleteModal(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteModal(false)}>{t("wording.cancel")}</button>
            <button className="btn-del-ok" onClick={confirmDelete}>{t("wording.delete")}</button>
          </>
        }
      >
        <p className="confirm-msg">
          {t("wording.areYouSureYouWantToDelete")} <strong>&ldquo;{deleteRecord?.status}&rdquo;</strong>{t("wording.thisActionCannotBeUndone")}
        </p>
      </Modal>
    </>
  );
}
