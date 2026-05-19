import { useState, useMemo, useEffect, useCallback } from "react";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import SortTh from "../components/SortTh";
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconDelete,
  IconClose,
  IconCheck,
} from "../components/icons";
import { initialAreas, SUB_AREAS } from "../data/areas";
import Loading from "../components/Loading";
import { useAreaController } from "./lib/useAreaController";
import { InventoryService } from "../service/InventoryService";
import { toast } from "react-toastify";
import TextInput from "../components/TextInput";
import { useFormik } from "formik";
import * as Yup from "yup";

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
function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

function buildFlatSubAreas() {
  let id = 1;
  const rows = [];
  const base = new Date("2024-01-10");
  Object.entries(SUB_AREAS).forEach(([areaName, subs]) => {
    subs.forEach((sub, i) => {
      const d = new Date(base.getTime() + (id * 3 + i) * 24 * 3600 * 1000);
      const iso = d.toISOString().slice(0, 10);
      rows.push({
        id: id++,
        name: sub,
        area: areaName,
        createdAt: iso,
        updatedAt: iso,
      });
    });
  });
  return rows;
}

const initialSubAreas = buildFlatSubAreas();

export default function SubAreaPage() {
  const [subAreas, setSubAreas] = useState([]);
  const [nextId, setNextId] = useState(initialSubAreas.length + 1);
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [sortCol, setSortCol] = useState(-1);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [isModify, setIsModify] = useState(false);
  const [selected, setSelecetd] = useState(null);
  const [sort, setSort] = useState("ASC");
  const [sortBy, setSortBy] = useState("sub_area_name");

  const [subAreaModal, setSubAreaModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: "", area: "" });

  const { areas, areaOptions } = useAreaController();

  const getListSubArea = async () => {
    try {
      setIsLoading(true);
      const response = await InventoryService.getSubArea({ sort, sortBy });
      if (!!areaFilter) {
        setSubAreas(
          response.data?.data?.filter(
            (el) => Number(el.area_id) === Number(areaFilter)
          )
        );
      } else {
        setSubAreas(response.data.data);
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      area_id: isModify ? selected.area_id?.toString() : "",
      sub_area_name: isModify ? selected.sub_area_name : "",
    },
    validationSchema: Yup.object({
      area_id: Yup.string().required("Required"),
      sub_area_name: Yup.string().required("Required"),
    }),
    validateOnChange: false,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setIsLoading(true);
      setSubAreaModal(false);
      const payload = {
        area_id: Number(values.area_id),
        sub_area_name: values.sub_area_name,
      };
      if (isModify) {
        const result = await InventoryService.editSubArea({
          ...payload,
          id: selected.id,
        });
        if (result.success) {
          setTimeout(() => {
            setProductDialog(false);
          }, 200);
          toast("Success modify sub area", { type: "success" });
        }
      } else {
        const result = await InventoryService.addSubArea(payload);
        if (result.success) {
          setTimeout(() => {
            setProductDialog(false);
          }, 200);
          toast("Success adding sub area", { type: "success" });
        }
      }
      setIsModify(false);
      setIsLoading(false);
      getListSubArea();
      formik.resetForm();
    },
  });

  useEffect(() => {
    getListSubArea();
  }, [sort, sortBy]);

  const areaNames = useMemo(
    () =>
      initialAreas.map((a) => a.name).filter((n) => SUB_AREAS[n]?.length > 0),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = subAreas.filter((r) => {
      const mQ =
        !q ||
        r.area_name.toLowerCase().includes(q) ||
        r.sub_area_name.toLowerCase().includes(q);
      const mA = !areaFilter || Number(r.area_id) === Number(areaFilter);
      return mQ && mA;
    });
    return data;
  }, [subAreas, query, areaFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const pageData = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleSort = useCallback(
    (col) => {
      if (col !== sortBy) {
        setSort("ASC");
      } else {
        if (sort === "ASC") {
          setSort("DESC");
        } else {
          setSort("ASC");
        }
      }
      setSortBy(col);
      setPage(1);
    },
    [sort, sortBy]
  );

  function openNew() {
    setEditingId(null);
    setForm({ name: "", area: areaNames[0] || "" });
    setSubAreaModal(true);
  }

  function openEdit(id) {
    const r = subAreas.find((x) => x.id === id);
    if (!r) return;
    setEditingId(id);
    setForm({ name: r.name, area: r.area });
    setSubAreaModal(true);
  }

  function save() {
    if (!form.name.trim() || !form.area) return;
    const now = new Date().toISOString().slice(0, 10);
    if (editingId) {
      setSubAreas((as) =>
        as.map((a) =>
          a.id === editingId
            ? { ...a, name: form.name, area: form.area, updatedAt: now }
            : a
        )
      );
    } else {
      setSubAreas((as) => [
        ...as,
        {
          id: nextId,
          name: form.name,
          area: form.area,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      setNextId((n) => n + 1);
    }
    setSubAreaModal(false);
  }

  function openDelete(id) {
    setDeleteTarget(id);
    setDeleteModal(true);
  }
  function confirmDelete() {
    setSubAreas((as) => as.filter((a) => a.id !== deleteTarget));
    setDeleteModal(false);
  }

  const deleteRecord = subAreas.find((x) => x.id === deleteTarget);
  const areaCount = [...new Set(subAreas.map((r) => r.area))].length;

  return (
    <>
      {isLoading && <Loading />}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>
          Sub Area
        </h1>
        <button className="btn-new" onClick={openNew}>
          <IconPlus /> New Sub Area
        </button>
      </div>

      <div
        className="stats-bar"
        style={{ gridTemplateColumns: "repeat(3,1fr)" }}
      >
        {[
          {
            label: "Total Sub Areas",
            value: subAreas.length,
            color: "var(--brand)",
            bg: "var(--brand-bg)",
          },
          {
            label: "Parent Areas",
            value: areaCount,
            color: "var(--green)",
            bg: "var(--green-bg)",
          },
          {
            label: "Search Results",
            value: filtered.length,
            color: "var(--purple)",
            bg: "var(--purple-bg)",
          },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span className="stat-value" style={{ color: s.color }}>
                {s.value}
              </span>
            </div>
            <span className="stat-label">{s.label}</span>
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
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="wi-select-wrap">
              <select
                value={areaFilter}
                onChange={(e) => {
                  setAreaFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Areas</option>
                {areaOptions.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-search">Search</button>
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openNew}>
              <IconPlus /> New
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh
                  label="Sub Area"
                  colIndex={0}
                  id="sub_area_name"
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                />
                <SortTh
                  label="Area"
                  colIndex={1}
                  id="area_name"
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ minWidth: 160 }}
                />
                <SortTh
                  label="Created At"
                  colIndex={2}
                  id="created_at"
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ width: 120 }}
                />
                <SortTh
                  label="Updated At"
                  id="updated_at"
                  colIndex={3}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ width: 120 }}
                />
                <th style={{ width: 100, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "var(--text-muted)",
                    }}
                  >
                    No sub areas found.
                  </td>
                </tr>
              ) : (
                pageData.map((r) => (
                  <tr key={r.id}>
                    <td className="name-cell">{r.sub_area_name}</td>
                    <td>
                      <span
                        className="badge badge-gray"
                        style={{ fontSize: "11px", fontWeight: 600 }}
                      >
                        {r.area_name}
                      </span>
                    </td>
                    <td
                      style={{ color: "var(--text-muted)", fontSize: "12.5px" }}
                    >
                      {fmtDate(r.created_at)}
                    </td>
                    <td
                      style={{ color: "var(--text-muted)", fontSize: "12.5px" }}
                    >
                      {fmtDate(r.updated_at)}
                    </td>
                    <td>
                      <div
                        className="action-btns"
                        style={{ justifyContent: "center" }}
                      >
                        <button
                          className="btn-icon edit"
                          title="Edit"
                          onClick={() => {
                            setSubAreaModal(true);
                            setSelecetd(r);
                            setIsModify(true);
                          }}
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="btn-icon delete"
                          title="Delete"
                          onClick={() => openDelete(r.id)}
                        >
                          <IconDelete />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={safePage}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          label="sub areas"
        />
      </div>

      <Modal
        open={subAreaModal}
        title={editingId ? "Edit Sub Area" : "New Sub Area"}
        onClose={() => setSubAreaModal(false)}
        footer={
          <>
            <button
              className="btn-cancel-modal"
              onClick={() => setSubAreaModal(false)}
            >
              <IconClose /> Cancel
            </button>
            <button
              className="btn-save-modal"
              type="submit"
              onClick={() => formik.handleSubmit()}
            >
              <IconCheck /> Save
            </button>
          </>
        }
      >
        <TextInput
          value={formik.values.sub_area_name}
          onChange={(e) => formik.setFieldValue("sub_area_name", e)}
          isRequired
          label="SUB AREA NAME"
          placeholder="e.g. Altar Setup"
          errorText={formik.errors.sub_area_name}
        />
        <div className="form-group">
          <label>
            Parent Area <span style={{ color: "var(--red)" }}>*</span>
          </label>
          <select
            onChange={(e) => formik.setFieldValue("area_id", e.target.value)}
            value={formik.values.area_id}
            style={{
              ...(formik.errors.area_id && {
                borderWidth: 1,
                borderColor: "var(--red)",
              }),
            }}
          >
            <option value="">— Select Area —</option>
            {areaOptions.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
          {formik.errors.area_id?.trim() && (
            <span style={{ color: "var(--red)", fontSize: 12 }}>
              {formik.errors.area_id}
            </span>
          )}
        </div>
      </Modal>

      <Modal
        open={deleteModal}
        title="Delete Sub Area"
        onClose={() => setDeleteModal(false)}
        footer={
          <>
            <button
              className="btn-cancel-modal"
              onClick={() => setDeleteModal(false)}
            >
              Cancel
            </button>
            <button className="btn-del-ok" onClick={confirmDelete}>
              Delete
            </button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete{" "}
          <strong>&ldquo;{deleteRecord?.name}&rdquo;</strong>? This action
          cannot be undone.
        </p>
      </Modal>
    </>
  );
}
