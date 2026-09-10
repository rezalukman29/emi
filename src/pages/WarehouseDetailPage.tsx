import { useSearchParams, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import Modal from "../components/Modal";
import { IconEdit, IconDelete } from "../components/icons";
import { initialWarehouses } from "../data/warehouses";
import useGetWarehouseDetail from "../hooks/api/useGetWarehouseDetail";
import useGetWarehouseItems from "../hooks/api/useGetWarehouseItems";
import { useTranslation } from "react-i18next";




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
  const { t } = useTranslation();
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
          {t("wording.warehouseNotFound")}
        </p>
        <button
          className="btn-new"
          style={{ marginTop: 12 }}
          onClick={() => navigate("/warehouse")}
        >
          {t("wording.backToWarehouse")}
        </button>
      </div>
    );
  }

  const items = data?.data ?? []
  console.log(items)
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
          {t("wording.back")}
        </button>
        <h1 className="page-title" style={{ margin: 0, flex: 1 }}>
          {warehouse.nama}
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
          <IconEdit /> {t("wording.edit")}
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
          <IconDelete /> {t("wording.delete")}
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
              {t("wording.warehouseInfo")}
            </span>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
          >
            <Field label={t("wording.name")} value={warehouse.nama} />
            <Field label={t("wording.location")} value={warehouse.lokasi} />
            <Field label={t("wording.pic")} value={warehouse.pic} />
            <Field label={t("wording.createdAt")} value={warehouse.created_at} />
            <Field
              label={t("wording.updatedAt")}
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
              label: t("wording.totalItemsQty"),
              value: totalItems,
              color: "var(--brand)",
              bg: "var(--brand-bg)",
            },
            {
              label: t("wording.skuCount"),
              value: items.length,
              color: "var(--green)",
              bg: "var(--green-bg)",
            },
            {
              label: t("wording.lowStockSkus"),
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
          {t("wording.itemsInThisWarehouse")}
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
            {t("wording.noItemsFound")}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("wording.name")}</th>
                  <th style={{ width: 90 }}>{t("wording.sku")}</th>
                  <th style={{ width: 100, textAlign: "right" }}>{t("wording.qty")}</th>
                  <th style={{ width: 120 }}>{t("wording.status")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="name-cell">{item.nama_barang}</td>
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
        title={t("wording.deleteWarehouse")}
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button
              className="btn-cancel-modal"
              onClick={() => setDeleteOpen(false)}
            >
              {t("wording.cancel")}
            </button>
            <button
              className="btn-del-ok"
              onClick={() => {
                setDeleteOpen(false);
                navigate("/warehouse");
              }}
            >
              {t("wording.delete")}
            </button>
          </>
        }
      >
        <p className="confirm-msg">
          {t("wording.areYouSureYouWantToDelete")} <strong>"{warehouse.name}"</strong>{t("wording.thisActionCannotBeUndone")}
        </p>
      </Modal>
    </>
  );
}
