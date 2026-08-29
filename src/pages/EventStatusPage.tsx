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

const PAGE_SIZE = 20;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ScanAction = "" | "SCAN IN" | "SCAN OUT";
type ScanSetting = "None" | "Scan";

interface EventStatusRow {
  id: number;
  order: number;
  status: string;
  scan: ScanSetting;
  action: string;
  eventRunning: number;
  updatedAt: string;
}

interface EventStatusForm {
  name: string;
  order_data: string;
  scan: ScanSetting;
  action: ScanAction;
}

function emptyForm(order = 1): EventStatusForm {
  return {
    name: "",
    order_data: String(order),
    scan: "None",
    action: "",
  };
}

function fmtDate(date: string) {
  if (!date) return "—";
  const [year, month, day] = date.split("-");
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(month) - 1]} ${year}`;
}

function ScanBadge({ scan }: { scan: ScanSetting }) {
  return scan === "Scan" ? (
    <span className="badge badge-green" style={{ fontSize: 11 }}>Scan</span>
  ) : (
    <span
      className="badge badge-gray"
      style={{
        fontSize: 11,
        background: "transparent",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
        fontWeight: 400,
      }}
    >
      None
    </span>
  );
}

function mapEventStatuses(response: GetEventStatusResponse): EventStatusRow[] {
  return (response.data?.data ?? []).map((status) => ({
    id: status.id,
    order: status.order_data,
    status: status.name,
    scan: status.is_show_scan_result === 1 ? "Scan" : "None",
    action: status.action,
    eventRunning: status.active_event,
    updatedAt: status.created_at,
  }));
}

export default function EventStatusPage() {
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
  const isSaving = isCreating || isUpdating;

  const total = response?.data?.total_records ?? 0;
  const currentPage = response?.data?.page ?? page;
  const runningTotal = statuses.reduce((sum, status) => sum + status.eventRunning, 0);
  const scanEnabled = statuses.filter((status) => status.scan === "Scan").length;
  const deleteRecord = statuses.find((status) => status.id === deleteTarget);
  const orderedStatuses = orderedResponse
    ? mapEventStatuses(orderedResponse).sort((left, right) => left.order - right.order)
    : [...statuses].sort((left, right) => left.order - right.order);
  const canReorder = sortBy === "order_data" && sort === "ASC";

  async function refetchStatusLists() {
    await Promise.all([
      refetchEventStatuses(),
      refetchOrderedEventStatuses(),
    ]);
  }

  const formik = useFormik<EventStatusForm>({
    initialValues: emptyForm(),
    validationSchema: Yup.object({
      name: Yup.string().trim().required("Required"),
      order_data: Yup.number().integer("Must be an integer").min(0, "Minimum value is 0").required("Required"),
      scan: Yup.string().oneOf(["None", "Scan"]).required("Required"),
      action: Yup.string().oneOf(["", "SCAN IN", "SCAN OUT"]),
    }),
    validateOnChange: false,
    onSubmit: async (values, { resetForm }) => {
      try {
        const payload = {
          name: values.name.trim(),
          is_show_scan_result: values.scan === "Scan" ? 1 : 0,
          order_data: Number(values.order_data),
          // The simplified UI no longer asks users to choose a scan direction.
          // Keep the existing BE action when editing, and clear it when scanning
          // is disabled so the payload remains backwards-compatible.
          action: values.scan === "Scan" ? values.action : "",
        };
        const result = editingId
          ? await putEventStatus({ ...payload, id: editingId })
          : await postEventStatus(payload);

        toast(result.message || (editingId ? "Event status updated successfully." : "Event status created successfully."), {
          type: "success",
        });
        setStatusModal(false);
        setEditingId(null);
        resetForm();
        await refetchStatusLists();
      } catch (error) {
        toast(
          error instanceof Error
            ? error.message
            : editingId
              ? "Failed to update event status."
              : "Failed to create event status.",
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
    if (sortBy === field) setSort((direction) => (direction === "ASC" ? "DESC" : "ASC"));
    else {
      setSortBy(field);
      setSort("ASC");
    }
    setPage(1);
  }

  function openNew() {
    setEditingId(null);
    formik.resetForm({ values: emptyForm(total + 1) });
    setStatusModal(true);
  }

  function openEdit(row: EventStatusRow) {
    setEditingId(row.id);
    formik.resetForm({
      values: {
        name: row.status,
        order_data: String(row.order),
        scan: row.scan,
        action: (["SCAN IN", "SCAN OUT"].includes(row.action) ? row.action : "") as ScanAction,
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

  async function moveOrder(id: number, direction: number) {
    if (!canReorder) return;
    const sorted = orderedStatuses;
    const index = sorted.findIndex((status) => status.id === id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;

    const current = sorted[index];
    const neighbor = sorted[swapIndex];
    const payloadFor = (row: EventStatusRow, order_data: number) => ({
      id: row.id,
      name: row.status,
      is_show_scan_result: row.scan === "Scan" ? 1 : 0,
      order_data,
      action: row.scan === "Scan" ? row.action : "",
    });

    setStatuses((rows) => rows.map((row) => {
      if (row.id === current.id) return { ...row, order: neighbor.order };
      if (row.id === neighbor.id) return { ...row, order: current.order };
      return row;
    }));

    try {
      await putEventStatus(payloadFor(current, neighbor.order));
      await putEventStatus(payloadFor(neighbor, current.order));
      await refetchStatusLists();
    } catch (error) {
      await refetchStatusLists();
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reorder event statuses.",
      );
    }
  }

  function openDelete(id: number) {
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
            : "Failed to delete event status."),
      );
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Event Status</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Status</button>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -14, marginBottom: 18 }}>
        This list drives the stage stepper on every event detail page in the
        order shown below. Adding, removing, reordering, or renaming a status
        applies across events. A status set to Scan requires items to be scanned
        while an event is at that stage.
      </p>

      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {[
          { label: "Total Statuses", value: total, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: "Scan Enabled on Page", value: scanEnabled, color: "var(--green)", bg: "var(--green-bg)" },
          { label: "Events Running on Page", value: runningTotal, color: "var(--orange)", bg: "var(--orange-bg)" },
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
                placeholder="Search status…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") applySearch(); }}
              />
            </div>
            <button className="btn-search" onClick={applySearch}>Search</button>
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openNew}><IconPlus /> New</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Order" id="order_data" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ width: 70, textAlign: "center" }} />
                <th style={{ width: 80, textAlign: "center" }}>Edit Order</th>
                <SortTh label="Status" id="name" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} />
                <th style={{ width: 100, textAlign: "center" }}>Scan</th>
                <SortTh label="Event Running" id="active_event" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ width: 120, textAlign: "right" }} />
                <SortTh label="Created At" id="created_at" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ width: 120 }} />
                <th style={{ width: 100, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && statuses.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40 }}>Loading event statuses…</td></tr>
              ) : isError ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--red)" }}>Failed to load event statuses.</td></tr>
              ) : statuses.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No statuses found.</td></tr>
              ) : (
                statuses.map((row) => {
                  const orderedIndex = orderedStatuses.findIndex((status) => status.id === row.id);
                  const moveTitle = canReorder
                    ? undefined
                    : "Sort by Order ascending to edit stage order";
                  return (
                  <tr key={row.id}>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "var(--brand-bg)", color: "var(--brand)", borderRadius: 6, fontWeight: 700, fontSize: 13 }}>{row.order}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
                        <button className="btn-icon" title={moveTitle ?? "Move up"} style={{ padding: "2px 5px", color: !canReorder || orderedIndex <= 0 ? "var(--border)" : "var(--text-muted)" }} disabled={!canReorder || orderedIndex <= 0 || isSaving} onClick={() => void moveOrder(row.id, -1)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><polyline points="18 15 12 9 6 15" /></svg>
                        </button>
                        <button className="btn-icon" title={moveTitle ?? "Move down"} style={{ padding: "2px 5px", color: !canReorder || orderedIndex < 0 || orderedIndex === orderedStatuses.length - 1 ? "var(--border)" : "var(--text-muted)" }} disabled={!canReorder || orderedIndex < 0 || orderedIndex === orderedStatuses.length - 1 || isSaving} onClick={() => void moveOrder(row.id, 1)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                      </div>
                    </td>
                    <td className="name-cell">{row.status}</td>
                    <td style={{ textAlign: "center" }}><ScanBadge scan={row.scan} /></td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      <span style={{ color: row.eventRunning > 0 ? "var(--orange)" : "var(--text-muted)" }}>{row.eventRunning}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{fmtDate(row.updatedAt)}</td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: "center" }}>
                        <button className="btn-icon edit" title="Edit" onClick={() => openEdit(row)}><IconEdit /></button>
                        <button className="btn-icon delete" title="Delete" onClick={() => openDelete(row.id)}><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} total={total} pageSize={PAGE_SIZE} onPage={(nextPage: number) => setPage(nextPage)} label="statuses" />
      </div>

      <Modal
        open={statusModal}
        title={editingId ? "Edit Event Status" : "New Event Status"}
        onClose={closeStatusModal}
        footer={
          <>
            <button className="btn-cancel-modal" disabled={isSaving} onClick={closeStatusModal}><IconClose /> Cancel</button>
            <button className="btn-save-modal" type="submit" disabled={isSaving} onClick={() => formik.handleSubmit()}><IconCheck /> {isSaving ? "Saving…" : "Save"}</button>
          </>
        }
      >
        <TextInput
          value={formik.values.order_data}
          onChange={(value) => formik.setFieldValue("order_data", value)}
          isRequired
          isNumeric
          label="Order"
          placeholder="e.g. 1"
          errorText={formik.errors.order_data}
        />
        <TextInput
          value={formik.values.name}
          onChange={(value) => formik.setFieldValue("name", value)}
          isRequired
          label="Status Name"
          placeholder="e.g. Event running"
          errorText={formik.errors.name}
        />
        <div className="form-group">
          <label>Scan</label>
          <SearchableSelect
            value={formik.values.scan}
            onChange={(value) => formik.setFieldValue("scan", value as ScanSetting)}
            options={[
              { value: "None", label: "None" },
              { value: "Scan", label: "Scan" },
            ]}
            placeholder="None"
          />
          {formik.errors.scan && (
            <span style={{ color: "var(--red)", fontSize: 11.5 }}>{formik.errors.scan}</span>
          )}
        </div>
      </Modal>

      <Modal
        open={deleteModal}
        title="Delete Event Status"
        onClose={() => setDeleteModal(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteModal(false)}>Cancel</button>
            <button className="btn-del-ok" onClick={confirmDelete}>Delete</button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{deleteRecord?.status}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
