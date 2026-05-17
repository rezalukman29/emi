import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import { toast } from "react-toastify";
import SortTh from "../components/SortTh";
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconDelete,
  IconFolder,
  IconClose,
  IconCheck,
} from "../components/icons";
import { initialAreas, SUB_AREAS } from "../data/areas";
import { InventoryService } from "../service/InventoryService";

import { useFormik } from "formik";
import * as Yup from "yup";
import TextInput from "../components/TextInput";
import TextArea from "../components/TextArea";
import Loading from "../components/Loading";

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

export default function AreaPage() {
  const navigate = useNavigate();
  const [areas, setAreas] = useState(initialAreas);
  const [nextId, setNextId] = useState(16);
  const [query, setQuery] = useState("");
  const [sortCol, setSortCol] = useState(-1);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isModify, setIsModify] = useState(false);
  const [selected, setSelecetd] = useState(null);
  const [areaDetail, setAreaDetail] = useState(null);

  const [sort, setSort] = useState("ASC");
  const [sortBy, setSortBy] = useState("name");
  const [areaModal, setAreaModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [subAreaModal, setSubAreaModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [subAreaTarget, setSubAreaTarget] = useState(null);
  const [form, setForm] = useState({ name: "", desc: "" });

  const formik = useFormik({
    initialValues: {
      name: isModify ? selected.name : "",
      description: isModify ? selected.description : "",
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Required"),
    }),
    validateOnChange: false,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setAreaModal(false);
      setIsLoading(true);
      const payload = {
        name: values.name,
        description: values.description,
      };
      if (isModify) {
        const result = await InventoryService.editArea({
          ...payload,
          id: selected.id,
        });
        if (result.success) {
          setTimeout(() => {
            setAreaModal(false);
          }, 200);
          toast("Success modify area", { type: "success" });
        }
      } else {
        const result = await InventoryService.addArea(payload);
        if (result.success) {
          setTimeout(() => {
            setAreaModal(false);
          }, 200);
          toast("Success adding area", { type: "success" });
        }
      }
      setIsModify(false);
      setIsLoading(false);
      formik.resetForm();
      getListArea();
    },
  });

  const getListArea = async () => {
    try {
      setIsLoading(true);
      const response = await InventoryService.getArea({
        sort,
        sortBy,
      });
      setAreas(response.data.data);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const getAreaDetail = async (id) => {
    try {
      setIsLoading(true);
      const response = await InventoryService.getAreaDetail(id);
      setAreaDetail(response.data);
      setIsLoading(false);
      setSubAreaModal(true);
    } catch (error) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getListArea();
  }, [sort, sortBy]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = areas.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.desc && r.desc.toLowerCase().includes(q))
    );
    return data;
  }, [areas, query]);

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
    setForm({ name: "", desc: "" });
    setAreaModal(true);
  }

  function openDelete(id) {
    setDeleteTarget(id);
    setDeleteModal(true);
  }
  function openSubAreas(id) {
    setSubAreaTarget(id);
    setSubAreaModal(true);
  }

  const onDelete = async () => {
    try {
      setDeleteModal(false);
      setIsLoading(true);
      await InventoryService.deleteArea(selected.id);
      toast("Success delete area", { type: "success" });
      setSelecetd(null);
      getListArea();
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast(error?.response?.data?.message, { type: "error" });
    }
  };

  const subAreaRecord = areas.find((x) => x.id === subAreaTarget);
  const subs = subAreaRecord ? SUB_AREAS[subAreaRecord.name] || [] : [];
  const deleteRecord = areas.find((x) => x.id === deleteTarget);

  const totalSubAreas = areas.reduce((acc, arr) => acc + arr.total_sub_area, 0);

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
          Area
        </h1>
        <button className="btn-new" onClick={openNew}>
          <IconPlus /> New Area
        </button>
      </div>

      {/* Stats */}
      <div
        className="stats-bar"
        style={{ gridTemplateColumns: "repeat(3,1fr)" }}
      >
        {[
          {
            label: "Total Areas",
            value: areas.length,
            color: "var(--brand)",
            bg: "var(--brand-bg)",
          },
          {
            label: "Total Sub Areas",
            value: totalSubAreas,
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
                placeholder="Search area…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
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
                  label="Name"
                  id="name"
                  colIndex={0}
                  sortCol={sort}
                  sortAsc={sortBy}
                  onSort={handleSort}
                />
                <th>Description</th>
                <th style={{ width: 110, textAlign: "center" }}>Sub Areas</th>
                <SortTh
                  label="Created At"
                  colIndex={3}
                  id="created_at"
                  sortCol={sort}
                  sortAsc={sortBy}
                  onSort={handleSort}
                  style={{ width: 120 }}
                />
                <SortTh
                  label="Updated At"
                  id="updated_at"
                  colIndex={4}
                  sortCol={sort}
                  sortAsc={sortBy}
                  onSort={handleSort}
                  style={{ width: 120 }}
                />
                <th style={{ width: 110, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "var(--text-muted)",
                    }}
                  >
                    No areas found.
                  </td>
                </tr>
              ) : (
                pageData.map((r) => {
                  const subCount = r.total_sub_area;
                  return (
                    <tr key={r.id}>
                      <td className="name-cell">{r.name}</td>
                      <td
                        style={{ color: "var(--text-2)", fontSize: "12.5px" }}
                      >
                        {r.description || (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {subCount > 0 ? (
                          <button
                            onClick={() => openSubAreas(r.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                            }}
                            title={`View ${subCount} sub areas`}
                          >
                            <span
                              className="badge badge-blue"
                              style={{ cursor: "pointer" }}
                            >
                              {subCount} sub area{subCount !== 1 ? "s" : ""}
                            </span>
                          </button>
                        ) : (
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "12px",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "12.5px",
                        }}
                      >
                        {fmtDate(r.created_at)}
                      </td>
                      <td
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "12.5px",
                        }}
                      >
                        {fmtDate(r.updated_at)}
                      </td>
                      <td>
                        <div
                          className="action-btns"
                          style={{ justifyContent: "center" }}
                        >
                          <button
                            className="btn-icon"
                            title="View Detail"
                            style={{ color: "var(--brand)" }}
                            onClick={() => navigate(`/area-detail?id=${r.id}`)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ width: 14, height: 14 }}
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            className="btn-icon"
                            title="View sub areas"
                            onClick={() => getAreaDetail(r.id)}
                          >
                            <IconFolder />
                          </button>
                          <button
                            className="btn-icon edit"
                            title="Edit"
                            onClick={() => {
                              setAreaModal(true);
                              setIsModify(true);
                              setSelecetd(r);
                            }}
                          >
                            <IconEdit />
                          </button>
                          <button
                            className="btn-icon delete"
                            title="Delete"
                            onClick={() => {
                              setSelecetd(r);
                              setDeleteModal(true);
                            }}
                          >
                            <IconDelete />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={safePage}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          label="areas"
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={areaModal}
        title={isModify ? "Edit Area" : "New Area"}
        onClose={() => setAreaModal(false)}
        footer={
          <>
            <button
              className="btn-cancel-modal"
              onClick={() => setAreaModal(false)}
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
          value={formik.values.name}
          onChange={(e) => formik.setFieldValue("name", e)}
          isRequired
          label="Name"
          placeholder="e.g. CEREMONY"
          errorText={formik.errors.name}
        />
        <TextArea
          value={formik.values.description}
          onChange={(e) => formik.setFieldValue("description", e)}
          label="Description"
          placeholder="Short description (optional)"
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModal}
        title="Delete Area"
        onClose={() => setDeleteModal(false)}
        footer={
          <>
            <button
              className="btn-cancel-modal"
              onClick={() => setDeleteModal(false)}
            >
              Cancel
            </button>
            <button className="btn-del-ok" onClick={onDelete}>
              Delete
            </button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete{" "}
          <strong>&ldquo;{selected?.name}&rdquo;</strong>? This action cannot be
          undone.
        </p>
      </Modal>

      {/* Sub Areas Modal */}
      <Modal
        open={subAreaModal}
        title={`Sub Areas — ${areaDetail?.name || ""}`}
        onClose={() => setSubAreaModal(false)}
        size="lg"
        footer={
          <button
            className="btn-ghost btn"
            onClick={() => setSubAreaModal(false)}
          >
            Close
          </button>
        }
      >
        {areaDetail?.list_sub_area?.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            No sub areas defined.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              padding: "4px 0",
            }}
          >
            {areaDetail?.list_sub_area?.map((s, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-2)",
                }}
              >
                {s?.sub_area_name}
              </span>
            ))}
          </div>
        )}
        <p
          style={{
            fontSize: "11.5px",
            color: "var(--text-muted)",
            marginTop: 14,
          }}
        >
          {areaDetail?.list_sub_area?.length} sub area
          {areaDetail?.list_sub_area?.length !== 1 ? "s" : ""} in{" "}
          <strong>{subAreaRecord?.name}</strong>
        </p>
      </Modal>
    </>
  );
}
