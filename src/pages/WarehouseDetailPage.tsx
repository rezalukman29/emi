import { useSearchParams, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import Modal from "../components/Modal";
import { IconEdit, IconDelete } from "../components/icons";
import { initialWarehouses } from "../data/warehouses";
import useGetWarehouseDetail from "../hooks/api/useGetWarehouseDetail";
import useGetWarehouseItems from "../hooks/api/useGetWarehouseItems";

const warehouseItems = {
  "Gudang Bali 66": [
    {
      name: "Artificial Flower Chrysant Giant White",
      sku: "AFG-001",
      qty: 342,
      status: "Available",
    },
    {
      name: "Artificial Rose Pink",
      sku: "ARP-003",
      qty: 182,
      status: "Available",
    },
    {
      name: "Crystal Bentuk Tabung",
      sku: "CBT-007",
      qty: 100,
      status: "Available",
    },
  ],
  "Gudang Bali 70": [
    {
      name: "Candle Holder Bulat Besar",
      sku: "CHB-006",
      qty: 60,
      status: "Available",
    },
    {
      name: "Flower Arch Besi 60cm",
      sku: "FAB-009",
      qty: 12,
      status: "Available",
    },
    {
      name: "Acrylic Ball Silver 20cm",
      sku: "ABS-021",
      qty: 189,
      status: "Available",
    },
  ],
  "Gudang C9": [
    { name: "Backdrop Stand 2m", sku: "BSD-004", qty: 8, status: "Low Stock" },
  ],
  "Gudang Surabaya": [
    {
      name: "Balon Latex Putih",
      sku: "BLP-005",
      qty: 500,
      status: "Available",
    },
    { name: "Meja Buffet Putih", sku: "MBP-015", qty: 8, status: "Low Stock" },
  ],
  "Gudang Cililitan": [
    {
      name: "Fabric Putih Polos 3m",
      sku: "FPP-008",
      qty: 20,
      status: "Low Stock",
    },
    { name: "Gebyok Jati Ukiran", sku: "GJU-010", qty: 2, status: "Low Stock" },
    {
      name: "Kain Batik Wahyu Tumurun",
      sku: "KBW-012",
      qty: 80,
      status: "Available",
    },
  ],
};

function statusBadge(s: any) {
  if (s === "Available") return <span className="badge badge-green">{s}</span>;
  if (s === "Low Stock") return <span className="badge badge-orange">{s}</span>;
  if (s === "Out of Stock") return <span className="badge badge-red">{s}</span>;
  return <span className="badge badge-gray">{s}</span>;
}

function Field({ label, value }: any) {
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
        {value || <span style={{ color: "var(--border)" }}>—</span>}
      </span>
    </div>
  );
}

export default function WarehouseDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = parseInt(params.get("id") as any);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data } = useGetWarehouseItems({
    id,
    options: {
      enabled: !!id,
    },
  });

  const { data: warehouseData } = useGetWarehouseDetail({
    id,
    options: {
      enabled: !!id,
    },
  });

  const warehouse: any = useMemo(() => {
    if (!warehouseData?.data) {
      return null;
    } else {
      return warehouseData?.data;
    }
  }, [warehouseData]);

  if (!warehouse) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Warehouse not found.
        </p>
        <button
          className="btn-new"
          style={{ marginTop: 12 }}
          onClick={() => navigate("/warehouse")}
        >
          Back to Warehouse
        </button>
      </div>
    );
  }

  const items = useMemo(() => {
    if (!data) {
      return [];
    } else {
      return data?.data;
    }
  }, [data]);
  const totalItems = items.reduce((a: any, i: any) => a + i.stok, 0);
  const lowStockCount = items.filter(
    (i: any) => i.status === "Low Stock"
  ).length;

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
          onClick={() => navigate("/warehouse")}
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
          {warehouse.nama_barang}
        </h1>
        <button
          className="btn-icon edit"
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
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
              Warehouse Info
            </span>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
          >
            <Field label="Name" value={warehouse.nama} />
            <Field label="Location" value={warehouse.lokasi} />
            <Field label="PIC" value={warehouse.pic} />
            <Field label="Created At" value={warehouse.created_at} />
            <Field
              label="Updated At"
              value={warehouse.updated_at === "-" ? null : warehouse.updated_at}
            />
          </div>
        </div>

        <div
          className="stats-bar"
          style={{
            gridTemplateColumns: "1fr",
            alignContent: "start",
            gap: 12,
            background: "transparent",
            border: "none",
            padding: 0,
          }}
        >
          {[
            {
              label: "Total Items (qty)",
              value: totalItems,
              color: "var(--brand)",
              bg: "var(--brand-bg)",
            },
            {
              label: "SKU Count",
              value: items.length,
              color: "var(--green)",
              bg: "var(--green-bg)",
            },
            {
              label: "Low Stock SKUs",
              value: lowStockCount,
              color: "var(--orange)",
              bg: "var(--orange-bg)",
            },
          ].map((s) => (
            <div key={s.label} className="stat-card" style={{ margin: 0 }}>
              <div className="stat-icon" style={{ background: s.bg }}>
                <span className="stat-value" style={{ color: s.color }}>
                  {s.value}
                </span>
              </div>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Items list */}
      <div className="card">
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Items in this Warehouse
        </div>
        {items.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            No items found.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={{ width: 90 }}>SKU</th>
                  <th style={{ width: 100, textAlign: "right" }}>Qty</th>
                  <th style={{ width: 120 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="name-cell">{item.name}</td>
                    <td className="id-cell">{item.kode}</td>
                    <td
                      style={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {item.stok}
                    </td>
                    <td>{statusBadge('Available')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
            <button
              className="btn-del-ok"
              onClick={() => {
                setDeleteOpen(false);
                navigate("/warehouse");
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>"{warehouse.name}"</strong>?
          This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
