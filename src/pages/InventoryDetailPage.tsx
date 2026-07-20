import { ReactNode, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import moment from "moment";

import Modal from "../components/Modal";
import { IconDelete, IconEdit } from "../components/icons";
import useGetBarangDetail from "../hooks/api/useGetBarangDetail";
import { BarangDetailI } from "../interfaces/InventoryInterface";
import { STORAGE_BOOQABLE, isValidUrl } from "../utils/function";

function statusBadge(s: string) {
  if (s === "Available") return <span className="badge badge-green">{s}</span>;
  if (s === "Low Stock") return <span className="badge badge-orange">{s}</span>;
  if (s === "Out of Stock") return <span className="badge badge-red">{s}</span>;
  return <span className="badge badge-gray">{s}</span>;
}

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: ".05em",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>
        {value || <span style={{ color: "var(--border)" }}>-</span>}
      </span>
    </div>
  );
}

function getStockStatus(totalStock: number) {
  if (totalStock <= 0) return "Out of Stock";
  if (totalStock <= 10) return "Low Stock";
  return "Available";
}

function getImageUrl(photo?: string) {
  if (!photo) return "";

  return isValidUrl(photo)
    ? photo.replace("http://66.42.48.163:9000/booqable/", STORAGE_BOOQABLE)
    : `https://democreation.site/home/public/${photo}`;
}

export default function InventoryDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = Number(params.get("id"));

  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = useGetBarangDetail({
    id,
    options: {
      enabled: !!id,
    },
  });

  const item = useMemo<BarangDetailI | null>(() => {
    return data?.data ?? null;
  }, [data]);

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Loading item detail...
        </p>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Item not found.
        </p>
        <button
          className="btn-new"
          style={{ marginTop: 12 }}
          onClick={() => navigate("/inventory")}
        >
          Back to Inventory
        </button>
      </div>
    );
  }

  const itemName = item.nama ?? "-";
  const itemDetail = item.detail;
  const category =
    item.kategori_barang?.name ??
    item.kategori_barang?.nama ??
    item.kategori_id;
  const unit =
    item.satuan?.name ?? item.satuan?.nama ?? item.satuan_id;
  const warehouse = "-";
  const totalStock =
    item.stock_summary?.total_stock ??
    item.stok_barang ??
    item.stok ??
    0;
  const availableStock = item.stock_summary?.available ?? totalStock;
  const reservedStock = item.stock_summary?.reserved ?? 0;
  const onEventStock = item.stock_summary?.on_event ?? 0;
  const stockStatus = getStockStatus(totalStock);
  const imageUrl = getImageUrl(item.photo);
  const updatedAt = item.updated_at ?? item.created_at;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <button
          onClick={() => navigate("/inventory")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--text-muted)",
            fontWeight: 500,
          }}
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
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 className="page-title" style={{ margin: 0, flex: 1 }}>
          {itemName}
        </h1>
        <button
          className="btn-icon edit"
          title="Edit"
          style={{
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <IconEdit /> Edit
        </button>
        <button
          className="btn-icon delete"
          title="Delete"
          onClick={() => setDeleteOpen(true)}
          style={{
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid var(--red-bg)",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <IconDelete /> Delete
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--brand)",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
              }}
            >
              Item Info
            </span>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
          >
            <Field label="SKU" value={item.code} />
            <Field label="Category" value={category} />
            <Field label="Unit" value={unit} />
            <Field label="Warehouse" value={warehouse} />
            <Field
              label="Updated At"
              value={
                updatedAt
                  ? moment(updatedAt).format("D MMM YYYY, HH:mm")
                  : null
              }
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                Status
              </span>
              {statusBadge(stockStatus)}
            </div>
          </div>
          {itemDetail && (
            <div style={{ marginTop: 18 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                Description
              </span>
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--text)",
                  marginTop: 6,
                  lineHeight: 1.6,
                }}
              >
                {itemDetail}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--green)",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                }}
              >
                Stock Summary
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Total Stock", value: totalStock, color: "var(--text)", big: true },
                { label: "Available", value: availableStock, color: "var(--green)" },
                { label: "Reserved", value: reservedStock, color: "var(--orange)" },
                { label: "On Event", value: onEventStock, color: "var(--brand)" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: 8,
                    borderBottom: "1px solid var(--bg)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontSize: s.big ? 20 : 15,
                      fontWeight: 700,
                      color: s.color,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--purple)",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                }}
              >
                Image
              </span>
            </div>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={itemName}
                style={{
                  width: "100%",
                  borderRadius: 8,
                  objectFit: "cover",
                  maxHeight: 180,
                }}
              />
            ) : (
              <div
                style={{
                  background: "var(--bg)",
                  borderRadius: 8,
                  height: 140,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "var(--border)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  style={{ width: 40, height: 40 }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "var(--text-muted)",
                  }}
                >
                  No image uploaded
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        title="Delete Item"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button
              className="btn-cancel-modal"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn-del-ok"
              onClick={() => {
                setDeleteOpen(false);
                navigate("/inventory");
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>"{itemName}"</strong>? This
          action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
