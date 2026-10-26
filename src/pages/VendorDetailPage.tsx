import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { toast } from "react-toastify";

import Modal from "../components/Modal";
import SearchableSelect from "../components/SearchableSelect";
import TextInput from "../components/TextInput";
import { IconEdit } from "../components/icons";
import {
  getProductionRequestList,
  type ProductionRequestListItem,
} from "../hooks/api/useGetProductionRequestList";
import {
  type VendorOrigin,
  type VendorPayload,
  useGetVendor,
  useUpdateVendor,
} from "../hooks/api/useVendors";
import { fmtNum } from "../lib/format";

const ORIGINS: VendorOrigin[] = ["Internal", "External"];

interface ProducedItemSummary {
  name: string;
  requestedQty: number;
  doneQty: number;
  eventNames: Set<string>;
  restockCount: number;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return <div className="vendor-info-row"><span>{label}</span><div>{value?.trim() || "—"}</div></div>;
}

function errorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (error as { message?: string })?.message
    || fallback;
}

function statusBadge(status: string) {
  if (status === "DONE") return "badge-green";
  if (status === "IN_PRODUCTION") return "badge-blue";
  if (status === "REQUESTED") return "badge-orange";
  return "badge-gray";
}

async function getVendorProductions(id: number) {
  const first = await getProductionRequestList({
    page: 1,
    limit: 100,
    vendor_id: id,
  });
  const rows = [...first.data.data];
  for (let page = 2; page <= first.data.total_pages; page += 1) {
    rows.push(...(await getProductionRequestList({
      page,
      limit: 100,
      vendor_id: id,
    })).data.data);
  }
  return rows;
}

export default function VendorDetailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const id = Number(params.get("id"));
  const [statusFilter, setStatusFilter] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<VendorPayload | null>(null);
  const vendorQuery = useGetVendor(id);
  const productionsQuery = useQuery(
    ["vendor-production-detail", id],
    () => getVendorProductions(id),
    { enabled: id > 0 },
  );
  const updateMutation = useUpdateVendor();
  const vendor = vendorQuery.data?.data;
  const productions = productionsQuery.data ?? [];

  const shownProductions = useMemo(
    () => productions.filter(item => !statusFilter || item.status === statusFilter),
    [productions, statusFilter],
  );
  const statuses = useMemo(
    () => Array.from(new Set(productions.map(item => item.status).filter(Boolean))),
    [productions],
  );
  const eventsServed = useMemo(
    () => new Set(productions.flatMap(item => item.event?.id ? [item.event.id] : [])).size,
    [productions],
  );
  const qtyProduced = useMemo(
    () => productions.filter(item => item.status === "DONE").reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [productions],
  );
  const inProgress = useMemo(
    () => productions.filter(item => item.status === "REQUESTED" || item.status === "IN_PRODUCTION").length,
    [productions],
  );
  const producedItems = useMemo(() => {
    const grouped = new Map<string, ProducedItemSummary>();
    productions.forEach(item => {
      const name = item.item_name || "—";
      const current = grouped.get(name) ?? {
        name,
        requestedQty: 0,
        doneQty: 0,
        eventNames: new Set<string>(),
        restockCount: 0,
      };
      current.requestedQty += Number(item.qty || 0);
      if (item.status === "DONE") current.doneQty += Number(item.qty || 0);
      if (item.event?.name) current.eventNames.add(item.event.name);
      else current.restockCount += 1;
      grouped.set(name, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.requestedQty - a.requestedQty);
  }, [productions]);

  function openEdit() {
    if (!vendor) return;
    setForm({
      name: vendor.name,
      origin: vendor.origin,
      category: vendor.category || "",
      contact: vendor.contact || "",
    });
    setEditOpen(true);
  }

  function closeEdit() {
    if (updateMutation.isLoading) return;
    setEditOpen(false);
    setForm(null);
  }

  async function saveVendor() {
    if (!vendor || !form?.name.trim() || updateMutation.isLoading) return;
    const payload: VendorPayload = {
      ...form,
      name: form.name.trim(),
      category: form.category.trim(),
      contact: form.contact.trim(),
    };
    try {
      await updateMutation.mutateAsync({ id: vendor.id, payload });
      await Promise.all([
        vendorQuery.refetch(),
        queryClient.invalidateQueries("useGetVendors"),
      ]);
      toast.success(t("sourceUpgrade.vendorUpdated"));
      closeEdit();
    } catch (error) {
      toast.error(errorMessage(error, t("sourceUpgrade.failedUpdateVendor")));
    }
  }

  const summary = [
    { label: t("vendorDetail.productions"), value: productions.length, color: "var(--brand)", background: "var(--brand-bg)" },
    { label: t("vendorDetail.eventsServed"), value: eventsServed, color: "var(--purple)", background: "var(--purple-bg)" },
    { label: t("productionList.qtyProduced"), value: qtyProduced, color: "var(--green)", background: "var(--green-bg)" },
    { label: t("productionList.inProgress"), value: inProgress, color: "var(--orange)", background: "var(--orange-bg)" },
  ];

  if (vendorQuery.isLoading) return <p>{t("wording.loading")}</p>;
  if (vendorQuery.isError) return <p role="alert">{t("vendorDetail.loadError")}</p>;
  if (!vendor) return <p>{t("vendorDetail.notFound")}</p>;

  return (
    <>
      <div className="detail-header">
        <Link className="loan-detail-back" to="/vendor">← {t("wording.back")}</Link>
        <h1 className="page-title loan-detail-heading">
          {vendor.name}
          <span className={`badge ${vendor.origin === "Internal" ? "badge-green" : "badge-orange"}`}>{vendor.origin}</span>
        </h1>
        <button className="btn btn-ghost loan-detail-edit" onClick={openEdit}><IconEdit /> {t("wording.edit")}</button>
      </div>

      <div className="stats-bar vendor-detail-stats">
        {summary.map(item => <div className="stat-card" key={item.label}>
          <span className="stat-icon" style={{ background: item.background }}>
            <strong className="stat-value" style={{ color: item.color }}>{fmtNum(item.value)}</strong>
          </span>
          <span className="stat-label">{item.label}</span>
        </div>)}
      </div>

      <div className="grid-2col loan-detail-grid">
        <section className="card loan-detail-card">
          <div className="section-dot-label"><span style={{ background: "var(--brand)" }} />{t("vendorDetail.vendorInfo")}</div>
          <InfoRow label={t("vendorDetail.type")} value={`${vendor.origin} (${t(vendor.origin === "Internal" ? "vendorDetail.ownTeam" : "vendorDetail.outsideVendor")})`} />
          <InfoRow label={t("sourceUpgrade.category")} value={vendor.category} />
          <InfoRow label={t("sourceUpgrade.contact")} value={vendor.contact} />
        </section>
        <section className="card loan-detail-card">
          <div className="section-dot-label"><span style={{ background: "var(--green)" }} />{t("vendorDetail.itemsProduced")}</div>
          {productionsQuery.isLoading ? <p className="loan-detail-placeholder">{t("wording.loading")}</p>
            : productionsQuery.isError ? <p className="loan-detail-placeholder vendor-error-cell">{t("productionList.loadError")}</p>
              : producedItems.length === 0 ? <p className="loan-detail-placeholder">{t("vendorDetail.noItemsProduced")}</p>
                : <ul className="vendor-item-list">{producedItems.map(item => {
                  const destinations = Array.from(item.eventNames);
                  if (item.restockCount) destinations.push(t("vendorDetail.restockCount", { count: item.restockCount }));
                  return <li key={item.name}>
                    <div className="vendor-item-main"><strong>{item.name}</strong><div className="vendor-item-sub">{destinations.join(", ") || "—"}</div></div>
                    <span className="vendor-item-qty">{fmtNum(item.doneQty)}{item.doneQty !== item.requestedQty && <em> / {fmtNum(item.requestedQty)}</em>}</span>
                  </li>;
                })}</ul>}
        </section>
      </div>

      <section className="card vendor-production-history">
        <div className="toolbar">
          <div className="toolbar-left"><div className="section-dot-label vendor-production-title"><span style={{ background: "var(--orange)" }} />{t("vendorDetail.productionHistory")}</div></div>
          <div className="toolbar-right vendor-production-status-filter">
            <SearchableSelect inline value={statusFilter} onChange={value => setStatusFilter(String(value))}
              options={[{ value: "", label: t("productionList.allStatuses") }, ...statuses.map(status => ({ value: status, label: statusLabel(status) }))]}
              placeholder={t("productionList.allStatuses")} />
          </div>
        </div>
        <div className="table-wrap">
          <table className="vendor-production-table">
            <thead><tr>
              <th>{t("productionList.requestedAt")}</th><th>{t("productionList.item")}</th><th className="number-cell">{t("productionList.qty")}</th>
              <th>{t("productionList.event")}</th><th>{t("productionList.deployTo")}</th><th>{t("productionList.status")}</th><th>{t("productionList.finished")}</th>
            </tr></thead>
            <tbody>
              {productionsQuery.isLoading && <tr><td colSpan={7} className="vendor-empty-cell">{t("wording.loading")}</td></tr>}
              {productionsQuery.isError && <tr><td colSpan={7} className="vendor-empty-cell vendor-error-cell">{t("productionList.loadError")}</td></tr>}
              {!productionsQuery.isLoading && !productionsQuery.isError && shownProductions.length === 0 && <tr><td colSpan={7} className="vendor-empty-cell">{t("productionList.noRecords")}</td></tr>}
              {shownProductions.map(item => <ProductionHistoryRow key={item.id} item={item} />)}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={editOpen && Boolean(form)} title={t("sourceUpgrade.editVendor")} onClose={closeEdit}
        footer={<><button className="btn-cancel-modal" disabled={updateMutation.isLoading} onClick={closeEdit}>{t("wording.cancel")}</button>
          <button className="btn-save-modal" disabled={!form?.name.trim() || updateMutation.isLoading} onClick={() => void saveVendor()}>{t(updateMutation.isLoading ? "wording.saving" : "wording.save")}</button></>}>
        {form && <>
          <TextInput label={t("sourceUpgrade.name")} isRequired placeholder={t("sourceUpgrade.vendorNamePlaceholder")} value={form.name} onChange={name => setForm(current => current ? { ...current, name } : current)} />
          <div className="form-group"><label>{t("sourceUpgrade.origin")}</label>
            <SearchableSelect value={form.origin} onChange={value => setForm(current => current ? { ...current, origin: value as VendorOrigin } : current)} options={ORIGINS.map(value => ({ value, label: value }))} />
            <p className="vendor-origin-help">{t("sourceUpgrade.originHelp")}</p>
          </div>
          <div className="form-row">
            <TextInput label={t("sourceUpgrade.category")} placeholder={t("sourceUpgrade.categoryPlaceholder")} value={form.category} onChange={category => setForm(current => current ? { ...current, category } : current)} />
            <TextInput label={t("sourceUpgrade.contact")} placeholder={t("sourceUpgrade.contactPlaceholder")} value={form.contact} onChange={contact => setForm(current => current ? { ...current, contact } : current)} />
          </div>
        </>}
      </Modal>
    </>
  );

  function statusLabel(status: string) {
    if (status === "REQUESTED") return t("productionList.requested");
    if (status === "IN_PRODUCTION") return t("productionList.inProduction");
    if (status === "DONE") return t("productionList.done");
    return status;
  }

  function ProductionHistoryRow({ item }: { item: ProductionRequestListItem }) {
    return <tr>
      <td className="production-date">{item.requested_at || "—"}</td>
      <td className="name-cell">{item.item_name || "—"}{item.request_type === "REPLACEMENT" && <span className="badge badge-red production-replacement">{t("productionList.replacement")}</span>}{item.notes && <div className="production-notes">{item.notes}</div>}</td>
      <td className="production-qty">{fmtNum(item.qty)}</td>
      <td>{item.event ? <><Link to={`/event-detail?id=${item.event.id}`}>{item.event.name}</Link><div className="production-event-area">{[item.event.area, item.event.sub_area].filter(Boolean).join(" · ")}</div></> : <span className="production-muted">{t("productionList.restockSource")}</span>}</td>
      <td>{item.warehouse?.name || "—"}</td>
      <td><span className={`badge ${statusBadge(item.status)}`}>{statusLabel(item.status)}</span></td>
      <td className="production-date">{item.finished_at || "—"}</td>
    </tr>;
  }
}
