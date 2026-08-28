import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";

import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import SortTh from "../../components/SortTh";
import TextInput from "../../components/TextInput";
import {
  IconCheck,
  IconClose,
  IconDelete,
  IconEdit,
  IconPlus,
  IconSearch,
} from "../../components/icons";
import useCreateDefaultUnit from "../../hooks/api/useCreateDefaultUnit";
import useDeleteDefaultUnit from "../../hooks/api/useDeleteDefaultUnit";
import useGetDefaultUnit, {
  type DefaultUnitItem,
} from "../../hooks/api/useGetDefaultUnit";
import useUpdateDefaultUnit from "../../hooks/api/useUpdateDefaultUnit";

const PAGE_SIZE = 20;
const TYPES = ["Length", "Weight", "Volume", "Count"];

interface DefaultUnitForm {
  name: string;
  abbreviation: string;
  type: string;
  isActive: string;
}

function emptyForm(): DefaultUnitForm {
  return {
    name: "",
    abbreviation: "",
    type: "Length",
    isActive: "1",
  };
}

function requestErrorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (apiMessage) return apiMessage;
  return error instanceof Error ? error.message : fallback;
}

export default function DefaultUnitsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState(-1);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    data: unitsResponse,
    isLoading: isUnitsLoading,
    isError: isUnitsError,
    refetch: refetchUnits,
  } = useGetDefaultUnit({
    params: {
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    },
    options: { keepPreviousData: true },
  });
  const { mutateAsync: createUnit, isLoading: isCreating } = useCreateDefaultUnit();
  const { mutateAsync: updateUnit, isLoading: isUpdating } = useUpdateDefaultUnit();
  const { mutateAsync: deleteUnit, isLoading: isDeleting } = useDeleteDefaultUnit();
  const isSaving = isCreating || isUpdating;
  const unitData = unitsResponse?.data;
  const stats = unitData?.stats;
  const units = unitData?.items ?? [];
  const total = unitData?.total ?? 0;
  const totalPages = Math.max(1, unitData?.total_pages ?? 1);
  const safePage = Math.min(page, totalPages);

  const formik = useFormik<DefaultUnitForm>({
    initialValues: emptyForm(),
    validationSchema: Yup.object({
      name: Yup.string().trim().required("Unit name is required."),
      abbreviation: Yup.string().trim().required("Abbreviation is required."),
      type: Yup.string().oneOf(TYPES).required("Type is required."),
      isActive: Yup.string().oneOf(["0", "1"]).required("Status is required."),
    }),
    onSubmit: async (values, { resetForm }) => {
      const payload = {
        abbreviation: values.abbreviation.trim(),
        is_active: Number(values.isActive),
        name: values.name.trim(),
        type: values.type,
      };

      try {
        const response = editingId
          ? await updateUnit({ id: editingId, payload })
          : await createUnit(payload);
        toast(response.message, { type: "success" });
        setModalOpen(false);
        resetForm();
        if (!editingId && page !== 1) setPage(1);
        else await refetchUnits();
      } catch (error) {
        toast(
          requestErrorMessage(
            error,
            editingId ? "Failed to update default unit." : "Failed to create default unit.",
          ),
          { type: "error" },
        );
      }
    },
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageData = useMemo(() => {
    const sorted = [...units];
    if (sortCol < 0) return sorted;
    sorted.sort((first, second) => {
      let firstValue: string | number;
      let secondValue: string | number;
      if (sortCol === 0) {
        firstValue = first.name;
        secondValue = second.name;
      } else if (sortCol === 1) {
        firstValue = first.abbreviation;
        secondValue = second.abbreviation;
      } else if (sortCol === 3) {
        firstValue = first.customers_using;
        secondValue = second.customers_using;
      } else {
        return 0;
      }
      if (typeof firstValue === "number") {
        return sortAsc
          ? firstValue - Number(secondValue)
          : Number(secondValue) - firstValue;
      }
      return sortAsc
        ? firstValue.localeCompare(String(secondValue))
        : String(secondValue).localeCompare(firstValue);
    });
    return sorted;
  }, [sortAsc, sortCol, units]);

  function handleSort(column: number) {
    if (sortCol === column) setSortAsc((current) => !current);
    else {
      setSortCol(column);
      setSortAsc(true);
    }
  }

  function openNew() {
    setEditingId(null);
    formik.resetForm({ values: emptyForm() });
    setModalOpen(true);
  }

  function openEdit(unit: DefaultUnitItem) {
    setEditingId(unit.id);
    formik.resetForm({
      values: {
        name: unit.name,
        abbreviation: unit.abbreviation,
        type: unit.type,
        isActive: String(unit.is_active),
      },
    });
    setModalOpen(true);
  }

  function closeUnitModal() {
    if (isSaving) return;
    formik.resetForm();
    setModalOpen(false);
  }

  function openDelete(id: number) {
    setDeletingId(id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingId) return;
    try {
      const response = await deleteUnit(deletingId);
      toast(response.message, { type: "success" });
      setDeleteOpen(false);
      setDeletingId(null);
      await refetchUnits();
    } catch (error) {
      toast(requestErrorMessage(error, "Failed to delete default unit."), { type: "error" });
    }
  }

  const deleteTarget = units.find((unit) => unit.id === deletingId);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Default Units</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Unit</button>
      </div>
      <p className="summary-text">Template measurement units (e.g. cm, m, kg) offered to every new customer.</p>

      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {[
          { label: "Total Units", value: stats?.total ?? 0, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: "Active", value: stats?.active ?? 0, color: "var(--green)", bg: "var(--green-bg)" },
          { label: "Customers Using", value: stats?.customers_using ?? 0, color: "var(--purple)", bg: "var(--purple-bg)" },
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
                placeholder="Search unit…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openNew}><IconPlus /> New</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Name" colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Abbreviation" colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 110 }} />
                <th style={{ width: 100 }}>Type</th>
                <SortTh label="Customers Using" colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 150, textAlign: "right" }} />
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 100, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isUnitsLoading && !unitData ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading units…</td></tr>
              ) : isUnitsError ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--red)" }}>Unable to load units.</td></tr>
              ) : !pageData.length ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No units found.</td></tr>
              ) : pageData.map((unit) => (
                <tr key={unit.id}>
                  <td className="name-cell">{unit.name}</td>
                  <td>
                    <span style={{ display: "inline-block", padding: "3px 9px", background: "var(--brand-bg)", color: "var(--brand)", borderRadius: 5, fontSize: 12, fontWeight: 700, fontFamily: "monospace", letterSpacing: ".02em" }}>
                      {unit.abbreviation}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-2)", fontSize: "12.5px" }}>{unit.type}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{unit.customers_using}</td>
                  <td>
                    <span className={`badge badge-${unit.is_active === 1 ? "green" : "gray"}`}>
                      {unit.is_active === 1 ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns" style={{ justifyContent: "center" }}>
                      <button className="btn-icon edit" title="Edit" onClick={() => openEdit(unit)}><IconEdit /></button>
                      <button className="btn-icon delete" title="Delete" onClick={() => openDelete(unit.id)}><IconDelete /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={total} pageSize={PAGE_SIZE} onPage={setPage} label="units" />
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? "Edit Unit" : "New Unit"}
        onClose={closeUnitModal}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isSaving} onClick={closeUnitModal}><IconClose /> Cancel</button>
            <button className="btn-save-modal" disabled={isSaving} onClick={() => formik.handleSubmit()}>
              <IconCheck /> {isSaving ? "Saving…" : "Save"}
            </button>
          </>
        )}
      >
        <div className="form-row">
          <TextInput
            variant="secondary"
            value={formik.values.name}
            onChange={(value) => formik.setFieldValue("name", value)}
            isRequired
            label="Unit Name"
            placeholder="e.g. Centimeter"
            errorText={formik.touched.name ? formik.errors.name : undefined}
          />
          <TextInput
            variant="secondary"
            value={formik.values.abbreviation}
            onChange={(value) => formik.setFieldValue("abbreviation", value)}
            isRequired
            label="Abbreviation"
            placeholder="e.g. cm"
            errorText={formik.touched.abbreviation ? formik.errors.abbreviation : undefined}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Type <span style={{ color: "var(--red)" }}>*</span></label>
            <select value={formik.values.type} onChange={(event) => formik.setFieldValue("type", event.target.value)}>
              {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status <span style={{ color: "var(--red)" }}>*</span></label>
            <select value={formik.values.isActive} onChange={(event) => formik.setFieldValue("isActive", event.target.value)}>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete Unit"
        onClose={() => { if (!isDeleting) setDeleteOpen(false); }}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isDeleting} onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn-del-ok" disabled={isDeleting} onClick={confirmDelete}>
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
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
