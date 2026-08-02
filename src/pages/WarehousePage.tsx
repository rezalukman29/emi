import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import React from "react";
import Modal from "../components/Modal.js";
import Pagination from "../components/Pagination.js";
import {
  IconCheck,
  IconClose,
  IconDelete,
  IconEdit,
  IconPlus,
  IconSearch,
} from "../components/icons";
import SortTh from "../components/SortTh.js";
import { initialWarehouses } from "../data/warehouses.js";
import { useWarehouseController } from "./lib/useWarehouseController.js";
import { useFormik } from "formik";
import * as Yup from "yup";
import { APIResponse } from "../interfaces/BaseApiResponse.js";
import { InventoryService } from "../service/InventoryService.js";
import { toast } from "react-toastify";
import TextInput from "../components/TextInput.js";
import Loading from "../components/Loading.js";

function ImgCell({ src, name, onClick }: any) {
  return (
    <div
      onClick={onClick}
      title="View image"
      style={{
        width: 42,
        height: 42,
        background: "var(--bg)",
        borderRadius: "var(--r)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--border)",
        margin: "auto",
        cursor: "pointer",
        transition: "background .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "var(--r)",
          }}
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ width: 18, height: 18 }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )}
    </div>
  );
}

function ImageViewerModal({ open, name, src, onClose }: any) {
  if (!open) return null;
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          maxWidth: 480,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
            {name}
          </span>
          <button className="modal-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div
          style={{
            padding: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 220,
            background: "var(--bg)",
          }}
        >
          {src ? (
            <img
              src={src}
              alt={name}
              style={{
                maxWidth: "100%",
                maxHeight: 320,
                borderRadius: 8,
                objectFit: "contain",
              }}
            />
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                style={{
                  width: 56,
                  height: 56,
                  marginBottom: 12,
                  color: "var(--border)",
                }}
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p style={{ fontSize: 13, fontWeight: 500 }}>No image uploaded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

function formatDate(d: any) {
  const months = [
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
  return `${String(d.getDate()).padStart(2, "0")} ${
    months[d.getMonth()]
  } ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function WarehousePage() {
  const navigate = useNavigate();
  const [nextId, setNextId] = useState(11);
  const [query, setQuery] = useState("");
  const [sortCol, setSortCol] = useState(0);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [isModify, setIsModify] = useState<boolean>(false);
  const [gudang, setGudang] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState<any>({
    name: "",
    location: "",
    pic: "",
    image: "",
  });
  const [imgPopup, setImgPopup] = useState({
    open: false,
    name: "",
    src: null,
  });

  const { warehouses, refetchWarehouse } = useWarehouseController();

  const formik = useFormik<any>({
    initialValues: {
      nama: isModify ? gudang.nama : "",
      lokasi: isModify ? gudang.lokasi : "",
      pic: isModify ? gudang.pic : "",
    },
    validationSchema: Yup.object({
      nama: Yup.string().required("Required"),
      lokasi: Yup.string().required("Required"),
      pic: Yup.string().required("Required"),
    }),
    validateOnChange: false,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setModalOpen(false);
      setIsLoading(true);
      const payload: any = {
        nama: values.nama,
        lokasi: values.lokasi,
        pic: values.pic,
      };
      if (isModify) {
        const result: APIResponse<any> = await InventoryService.editGudang({
          ...payload,
          id: gudang.id,
        });
        if (result.success) {
          toast("Success modify warehouse", { type: "success" });
        }
      } else {
        const result: APIResponse<any> = await InventoryService.addGudang(
          payload
        );
        if (result.success) {
          toast("Success adding warehouse", { type: "success" });
        }
      }
      setIsModify(false);
      setIsLoading(false);
      formik.resetForm();
      refetchWarehouse();
    },
  });

  const cols = ["nama", "lokasi", "pic", "created_at", "updatedAt"];

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let data = q
      ? warehouses?.filter(
          (r: any) =>
            r.nama.toLowerCase().includes(q) ||
            r.lokasi.toLowerCase().includes(q) ||
            r.pic.toLowerCase().includes(q)
        )
      : warehouses;
    const key = cols[sortCol] || "nama";
    data?.sort((a: any, b: any) => {
      const va = String(a[key] ?? ""),
        vb = String(b[key] ?? "");
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return data;
  }, [warehouses, query, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered?.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered?.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function handleSort(col: any) {
    if (sortCol === col) setSortAsc((a) => !a);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
    setPage(1);
  }

  function openNew() {
    setModalOpen(true);
  }



  const delTarget = warehouses?.find((w: any) => w.id === deletingId);
  const uniqueLocations = [
    ...new Set(warehouses?.map((w: any) => w.lokasi)?.filter(Boolean)),
  ].length;

  const onDelete = async () => {
    try {
      setDeleteOpen(false);
      setIsLoading(true);
      await InventoryService.deleteGudang(gudang.id);
      toast("Success delete warehouse", { type: "success" });
      setGudang(null)
      refetchWarehouse();
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
    }
  };

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
          Warehouse
        </h1>
        <button className="btn-new" onClick={openNew}>
          <IconPlus /> New Warehouse
        </button>
      </div>

      {/* Stats */}
      <div
        className="stats-bar"
        style={{ gridTemplateColumns: "repeat(3,1fr)" }}
      >
        {[
          {
            label: "Total Warehouses",
            value: warehouses.length,
            color: "var(--brand)",
            bg: "var(--brand-bg)",
          },
          {
            label: "Locations",
            value: uniqueLocations,
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
                placeholder="Search warehouse…"
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
                  colIndex={0}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                />
                <SortTh
                  label="Location"
                  colIndex={1}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                />
                <SortTh
                  label="PIC"
                  colIndex={2}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ width: 130 }}
                  id={undefined}
                />
                <SortTh
                  label="Created At"
                  colIndex={3}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ width: 165 }}
                />
                <SortTh
                  label="Updated At"
                  colIndex={4}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ width: 165 }}
                />
                <th style={{ width: 60, textAlign: "center" }}>Image</th>
                <th style={{ width: 90, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      padding: 32,
                    }}
                  >
                    No warehouses found.
                  </td>
                </tr>
              ) : (
                pageData.map((r: any) => (
                  <tr key={r.id}>
                    <td className="name-cell">{r.nama}</td>
                    <td>
                      {r.lokasi || (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      {r.pic || (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td
                      style={{ color: "var(--text-muted)", fontSize: "12.5px" }}
                    >
                      {r.created_at}
                    </td>
                    <td
                      style={{ color: "var(--text-muted)", fontSize: "12.5px" }}
                    >
                      {r.updatedAt === "-" ? (
                        <span style={{ color: "var(--border)" }}>—</span>
                      ) : (
                        r.updatedAt
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <ImgCell
                        src={r.image || null}
                        name={r.name}
                        onClick={() =>
                          setImgPopup({
                            open: true,
                            name: r.name,
                            src: r.image || null,
                          })
                        }
                      />
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
                          onClick={() =>
                            navigate(`/warehouse-detail?id=${r.id}`)
                          }
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
                          className="btn-icon edit"
                          title="Edit"
                          onClick={() => {
                            setModalOpen(true);
                            setIsModify(true);
                            setGudang(r)
                          }}
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="btn-icon delete"
                          title="Delete"
                          onClick={() => {
                            setDeleteOpen(true)
                            setGudang(r)
                          }}
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
          onPage={(p: any) => setPage(p)}
          label="warehouses"
        />
      </div>

      <Modal
        open={modalOpen}
        title={isModify ? "Edit Warehouse" : "New Warehouse"}
        onClose={() => {
          setModalOpen(false);
          formik.resetForm();
        }}
        footer={
          <>
            <button
              className="btn-cancel-modal"
              onClick={() => {
                setModalOpen(false);
                formik.resetForm();
              }}
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
          value={formik.values.nama}
          onChange={(e) => formik.setFieldValue("nama", e)}
          isRequired
          label="Name"
          placeholder="e.g. Gudang Bali 66"
          errorText={formik.errors.nama as string}
        />
        <TextInput
          value={formik.values.lokasi}
          onChange={(e) => formik.setFieldValue("lokasi", e)}
          isRequired
          label="Location"
          placeholder="e.g. Bali, Jakarta"
          errorText={formik.errors.lokasi as string}
        />
        <TextInput
          value={formik.values.pic}
          onChange={(e) => formik.setFieldValue("pic", e)}
          isRequired
          label="PIC"
          placeholder="Person in charge"
          errorText={formik.errors.pic as string}
        />
      </Modal>

      <ImageViewerModal
        open={imgPopup.open}
        name={imgPopup.name}
        src={imgPopup.src}
        onClose={() => setImgPopup((p) => ({ ...p, open: false }))}
      />

      <Modal
        open={deleteOpen}
        title="Delete Warehouse"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button
              className="btn-cancel-modal"
              onClick={() => setDeleteOpen(false)}
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
          <strong>&ldquo;{gudang?.nama}&rdquo;</strong>? This action cannot
          be undone.
        </p>
      </Modal>
    </>
  );
}
