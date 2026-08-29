import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";

import Loading from "../components/Loading";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import SearchableSelect from "../components/SearchableSelect";
import SortTh from "../components/SortTh";
import TextInput from "../components/TextInput";
import {
  IconCheck,
  IconClose,
  IconDelete,
  IconEdit,
  IconPlus,
  IconSearch,
} from "../components/icons";
import type { SubAreaItem } from "../hooks/api/useGetSubArea";
import { InventoryService } from "../service/InventoryService";
import { useAreaController } from "./lib/useAreaController";

const PAGE_SIZE = 10;
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type SortDirection = "ASC" | "DESC";

interface SubAreaForm {
  area_id: string;
  sub_area_name: string;
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  const monthIndex = Number(month) - 1;
  const date = Number.parseInt(day, 10);
  if (!year || !MONTHS_SHORT[monthIndex] || Number.isNaN(date)) return value;
  return `${date} ${MONTHS_SHORT[monthIndex]} ${year}`;
}

function errorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return apiMessage || (error instanceof Error ? error.message : fallback);
}

export default function SubAreaPage() {
  const [subAreas, setSubAreas] = useState<SubAreaItem[]>([]);
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isModify, setIsModify] = useState(false);
  const [selected, setSelected] = useState<SubAreaItem | null>(null);
  const [sort, setSort] = useState<SortDirection>("ASC");
  const [sortBy, setSortBy] = useState("sub_area_name");
  const [subAreaModal, setSubAreaModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubAreaItem | null>(null);

  const { areaOptions } = useAreaController();

  const getListSubArea = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await InventoryService.getSubArea({ sort, sortBy });
      const rows = response.data?.data;
      setSubAreas(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast(errorMessage(error, "Failed to load sub areas."), { type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [sort, sortBy]);

  useEffect(() => {
    void getListSubArea();
  }, [getListSubArea]);

  const formik = useFormik<SubAreaForm>({
    initialValues: {
      area_id: isModify && selected ? String(selected.area_id) : "",
      sub_area_name: isModify && selected ? selected.sub_area_name : "",
    },
    validationSchema: Yup.object({
      area_id: Yup.string().required("Required"),
      sub_area_name: Yup.string().trim().required("Required"),
    }),
    validateOnChange: false,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm }) => {
      try {
        setIsLoading(true);
        const payload = {
          area_id: Number(values.area_id),
          sub_area_name: values.sub_area_name.trim(),
        };
        const result = isModify && selected
          ? await InventoryService.editSubArea({ ...payload, id: selected.id })
          : await InventoryService.addSubArea(payload);

        if (!result.success) throw new Error(result.message);

        toast(isModify ? "Sub area updated successfully." : "Sub area added successfully.", {
          type: "success",
        });
        setSubAreaModal(false);
        setIsModify(false);
        setSelected(null);
        resetForm();
        await getListSubArea();
      } catch (error) {
        toast(errorMessage(error, isModify ? "Failed to update sub area." : "Failed to add sub area."), {
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    },
  });

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return subAreas.filter((subArea) => {
      const matchesQuery = !normalizedQuery
        || subArea.area_name.toLowerCase().includes(normalizedQuery)
        || subArea.sub_area_name.toLowerCase().includes(normalizedQuery);
      const matchesArea = !areaFilter || Number(subArea.area_id) === Number(areaFilter);
      return matchesQuery && matchesArea;
    });
  }, [areaFilter, query, subAreas]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const areaCount = new Set(subAreas.map((subArea) => subArea.area_id)).size;

  const handleSort = useCallback((column: string) => {
    setSort((currentSort) => column === sortBy && currentSort === "ASC" ? "DESC" : "ASC");
    setSortBy(column);
    setPage(1);
  }, [sortBy]);

  function openNew() {
    setSelected(null);
    setIsModify(false);
    formik.resetForm({ values: { area_id: "", sub_area_name: "" } });
    setSubAreaModal(true);
  }

  function openEdit(subArea: SubAreaItem) {
    setSelected(subArea);
    setIsModify(true);
    setSubAreaModal(true);
  }

  function closeSubAreaModal() {
    if (isLoading) return;
    setSubAreaModal(false);
    setSelected(null);
    setIsModify(false);
    formik.resetForm();
  }

  function openDelete(subArea: SubAreaItem) {
    setDeleteTarget(subArea);
    setDeleteModal(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      setIsLoading(true);
      const result = await InventoryService.deleteSubArea(deleteTarget.id);
      if (!result.success) throw new Error(result.message);
      toast("Sub area deleted successfully.", { type: "success" });
      setDeleteModal(false);
      setDeleteTarget(null);
      await getListSubArea();
    } catch (error) {
      toast(errorMessage(error, "Failed to delete sub area."), { type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {isLoading && <Loading />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Sub Area</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Sub Area</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {[
          { label: "Total Sub Areas", value: subAreas.length, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: "Parent Areas", value: areaCount, color: "var(--green)", bg: "var(--green-bg)" },
          { label: "Search Results", value: filtered.length, color: "var(--purple)", bg: "var(--purple-bg)" },
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
                placeholder="Search sub area…"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              />
            </div>
            <SearchableSelect
              inline
              value={areaFilter}
              onChange={(value) => { setAreaFilter(String(value)); setPage(1); }}
              options={[{ value: "", label: "All Areas" }, ...areaOptions]}
              placeholder="All Areas"
              searchPlaceholder="Search areas…"
            />
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openNew}><IconPlus /> New</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Sub Area" id="sub_area_name" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} />
                <SortTh label="Area" id="area_name" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ minWidth: 160 }} />
                <SortTh label="Created At" id="created_at" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ width: 120 }} />
                <SortTh label="Updated At" id="updated_at" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ width: 120 }} />
                <th style={{ width: 100, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {!pageData.length ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No sub areas found.</td></tr>
              ) : pageData.map((subArea) => (
                <tr key={subArea.id}>
                  <td className="name-cell">{subArea.sub_area_name}</td>
                  <td><span className="badge badge-gray" style={{ fontSize: 11, fontWeight: 600 }}>{subArea.area_name}</span></td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{fmtDate(subArea.created_at)}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{fmtDate(subArea.updated_at)}</td>
                  <td>
                    <div className="action-btns" style={{ justifyContent: "center" }}>
                      <button className="btn-icon edit" title="Edit" onClick={() => openEdit(subArea)}><IconEdit /></button>
                      <button className="btn-icon delete" title="Delete" onClick={() => openDelete(subArea)}><IconDelete /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="sub areas" />
      </div>

      <Modal
        open={subAreaModal}
        title={isModify ? "Edit Sub Area" : "New Sub Area"}
        onClose={closeSubAreaModal}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isLoading} onClick={closeSubAreaModal}><IconClose /> Cancel</button>
            <button className="btn-save-modal" type="submit" disabled={isLoading} onClick={() => formik.handleSubmit()}><IconCheck /> {isLoading ? "Saving…" : "Save"}</button>
          </>
        )}
      >
        <TextInput
          value={formik.values.sub_area_name}
          onChange={(value) => formik.setFieldValue("sub_area_name", value)}
          isRequired
          label="Sub Area Name"
          placeholder="e.g. Altar Setup"
          errorText={formik.errors.sub_area_name}
        />
        <div className="form-group">
          <label>Parent Area <span style={{ color: "var(--red)" }}>*</span></label>
          <SearchableSelect
            value={formik.values.area_id}
            onChange={(value) => formik.setFieldValue("area_id", String(value))}
            options={[{ value: "", label: "— Select Area —" }, ...areaOptions]}
            placeholder="— Select Area —"
            searchPlaceholder="Search areas…"
          />
          {formik.errors.area_id && <span style={{ color: "var(--red)", fontSize: 12 }}>{formik.errors.area_id}</span>}
        </div>
      </Modal>

      <Modal
        open={deleteModal}
        title="Delete Sub Area"
        onClose={() => { if (!isLoading) { setDeleteModal(false); setDeleteTarget(null); } }}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isLoading} onClick={() => { setDeleteModal(false); setDeleteTarget(null); }}>Cancel</button>
            <button className="btn-del-ok" disabled={isLoading} onClick={confirmDelete}>{isLoading ? "Deleting…" : "Delete"}</button>
          </>
        )}
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{deleteTarget?.sub_area_name ?? ""}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
