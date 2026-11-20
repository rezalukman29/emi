import { fmtNum as fmtDisplayNumber } from '../lib/format';
import { useState } from "react";
import { useQueryClient } from 'react-query';
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";

import { IconCheck, IconChevronDown, IconClose, IconDelete, IconEdit, IconPlus, IconSearch } from "../components/icons";
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
import type { EventStatusPayload } from '../hooks/api/usePostEventStatus';
import usePutEventStatus from "../hooks/api/usePutEventStatus";
import { InventoryService } from "../service/InventoryService";
import { useTranslation } from "react-i18next";
import { eventStatusFeatures } from '../lib/eventStatusFeatures';
import { hasExclusiveFlagConflict } from '../lib/eventStageRules';
import "../eventUpgrade.css";


const PAGE_SIZE = 20;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const EMPTY_FEATURES = { cuttingStock: false, stockReturn: false, productionItem: false };
type ScanAction = "" | "SCAN_IN" | "SCAN_OUT";
type ScanSetting = "None" | "Scan";

interface EventStatusRow {
  stockReturn: boolean;
  productionItem: boolean;
  cuttingStock: boolean;
  checkOwnership: boolean;
  allowAddItem: boolean;
  allowDelete: boolean;
  borrowItem: boolean;
  outsourceItem: boolean;
  code: string;
  id: number;
  order: number;
  status: string;
  scan: ScanSetting;
  action: string;
  eventRunning: number;
  updatedAt: string;
}

interface EventStatusForm {
  code: string;
  name: string;
  order_data: string;
  action: ScanAction;
  cuttingStock: boolean;
  stockReturn: boolean;
  productionItem: boolean;
  checkOwnership: boolean;
  allowAddItem: boolean;
  allowDelete: boolean;
  borrowItem: boolean;
  outsourceItem: boolean;
}

function emptyForm(order = 1): EventStatusForm {
  return {
    ...EMPTY_FEATURES,
    code: '',
    name: "",
    order_data: String(order),
    action: "",
    checkOwnership: false,
    allowAddItem: true,
    allowDelete: true,
    borrowItem: false,
    outsourceItem: false,
  };
}

function normalizeScanAction(action: string): ScanAction {
  const normalized = action.trim().toUpperCase().replace(/\s+/g, "_");
  return normalized === "SCAN_IN" || normalized === "SCAN_OUT"
    ? normalized
    : "";
}

function fmtDate(date: string) {
  if (!date) return "—";
  const [year, month, day] = date.split("-");
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(month) - 1]} ${year}`;
}

function mapEventStatuses(response: GetEventStatusResponse): EventStatusRow[] {
  return (response.data?.data ?? []).map((status) => ({
    ...eventStatusFeatures(status),
    checkOwnership: status.check_ownership === true,
    allowAddItem: status.allow_add_item !== false,
    allowDelete: status.allow_delete !== false,
    borrowItem: status.borrow_item === true,
    outsourceItem: status.outsource_item === true,
    id: status.id,
    code: status.code || '',
    order: status.order_data,
    status: status.name,
    scan: status.is_show_scan_result === 1 ? "Scan" : "None",
    action: status.action,
    eventRunning: status.active_event,
    updatedAt: status.updated_at ?? status.created_at,
  }));
}

type RuleGroupId = 'scan' | 'stock' | 'items' | 'requests';
type BooleanRuleKey = 'cuttingStock' | 'stockReturn' | 'allowAddItem' | 'allowDelete' | 'checkOwnership' | 'productionItem' | 'borrowItem' | 'outsourceItem';
interface RuleDefinition {
  key: 'scan' | BooleanRuleKey;
  group: RuleGroupId;
  labelKey: string;
  chipKey: string;
  descriptionKey: string;
  restrictive?: boolean;
  unique?: boolean;
}

const RULE_GROUPS: Array<{ id: RuleGroupId; labelKey: string; color: string }> = [
  { id: 'scan', labelKey: 'eventSettingsRules.groups.scanning', color: 'green' },
  { id: 'stock', labelKey: 'eventSettingsRules.groups.stock', color: 'orange' },
  { id: 'items', labelKey: 'eventSettingsRules.groups.items', color: 'blue' },
  { id: 'requests', labelKey: 'eventSettingsRules.groups.requests', color: 'purple' },
];

const RULES: RuleDefinition[] = [
  { key: 'scan', group: 'scan', labelKey: 'eventSettingsRules.scan.label', chipKey: 'eventSettingsRules.scan.chip', descriptionKey: 'eventSettingsRules.scan.description' },
  { key: 'cuttingStock', group: 'stock', labelKey: 'eventUpgrade.cuttingStock', chipKey: 'eventSettingsRules.cuttingStock.chip', descriptionKey: 'eventSettingsRules.cuttingStock.description', unique: true },
  { key: 'stockReturn', group: 'stock', labelKey: 'eventUpgrade.stockReturn', chipKey: 'eventSettingsRules.stockReturn.chip', descriptionKey: 'eventSettingsRules.stockReturn.description', unique: true },
  { key: 'allowAddItem', group: 'items', labelKey: 'eventSettingsRules.allowAddItem.label', chipKey: 'eventSettingsRules.allowAddItem.chip', descriptionKey: 'eventSettingsRules.allowAddItem.description', restrictive: true },
  { key: 'allowDelete', group: 'items', labelKey: 'sourceUpgrade.allowDelete', chipKey: 'eventSettingsRules.allowDelete.chip', descriptionKey: 'eventSettingsRules.allowDelete.description', restrictive: true },
  { key: 'checkOwnership', group: 'items', labelKey: 'sourceUpgrade.checkOwnership', chipKey: 'eventSettingsRules.checkOwnership.chip', descriptionKey: 'eventSettingsRules.checkOwnership.description' },
  { key: 'productionItem', group: 'requests', labelKey: 'eventUpgrade.productionItem', chipKey: 'eventSettingsRules.productionItem.chip', descriptionKey: 'eventSettingsRules.productionItem.description' },
  { key: 'borrowItem', group: 'requests', labelKey: 'sourceUpgrade.borrowItem', chipKey: 'eventSettingsRules.borrowItem.chip', descriptionKey: 'eventSettingsRules.borrowItem.description' },
  { key: 'outsourceItem', group: 'requests', labelKey: 'sourceUpgrade.outsourceItem', chipKey: 'eventSettingsRules.outsourceItem.chip', descriptionKey: 'eventSettingsRules.outsourceItem.description' },
];

function isRuleEnabled(row: EventStatusRow, rule: RuleDefinition) {
  if (rule.key === 'scan') {
    const action = normalizeScanAction(row.action);
    return row.scan === 'Scan' || action === 'SCAN_IN' || action === 'SCAN_OUT';
  }

  return row[rule.key];
}

function RuleChips({ row }: { row: EventStatusRow }) {
  const { t } = useTranslation();
  const hasScanRule = isRuleEnabled(row, RULES[0]);
  const hasEnabledStatusRule = [
    hasScanRule,
    row.cuttingStock,
    row.stockReturn,
    row.productionItem,
    row.checkOwnership,
    row.allowDelete,
    row.allowAddItem,
    row.borrowItem,
    row.outsourceItem,
  ].some(Boolean);

  if (!hasEnabledStatusRule) {
    return <span className="es-none">{t('eventSettingsRules.noSpecialRules')}</span>;
  }

  const chips = RULES.filter((rule) => rule.restrictive ? !isRuleEnabled(row, rule) : isRuleEnabled(row, rule));
  if (!chips.length) return <span className="es-none">{t('eventSettingsRules.noSpecialRules')}</span>;
  return <div className="es-chips">{chips.map((rule) => {
    const color = rule.restrictive ? 'red' : RULE_GROUPS.find((group) => group.id === rule.group)?.color ?? 'blue';
    return <span key={rule.key} className={`es-chip ${color}`} title={t(rule.descriptionKey)}>{t(rule.chipKey)}</span>;
  })}</div>;
}

function RuleSwitch({ checked, disabled, label, description, note, onChange }: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  note?: string;
  onChange: (checked: boolean) => void;
}) {
  return <label className={`es-switch-row${disabled ? ' disabled' : ''}`}>
    <span className="es-switch-text"><strong>{label}</strong><span>{description}</span>{note && <em>{note}</em>}</span>
    <input className="es-switch" type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
  </label>;
}

export default function EventStatusPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
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
  const [reorderMode, setReorderMode] = useState(false);
  const [draftStatuses, setDraftStatuses] = useState<EventStatusRow[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

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
  const isSaving = isCreating || isUpdating || isSavingOrder;

  const total = response?.data?.total_records ?? 0;
  const currentPage = response?.data?.page ?? page;
  const deleteRecord = statuses.find((status) => status.id === deleteTarget);
  const orderedStatuses = orderedResponse
    ? mapEventStatuses(orderedResponse).sort((left, right) => left.order - right.order)
    : [...statuses].sort((left, right) => left.order - right.order);
  const displayedStatuses = (reorderMode ? draftStatuses : statuses);
  const scanEnabled = orderedStatuses.filter((status) => status.scan === 'Scan').length;
  const runningTotal = orderedStatuses.reduce((sum, status) => sum + status.eventRunning, 0);
  const cutStage = orderedStatuses.find((status) => status.cuttingStock);
  const returnStage = orderedStatuses.find((status) => status.stockReturn);

  async function refetchStatusLists() {
    await queryClient.invalidateQueries(['useGetEventStatus'], { refetchActive: false });
    return Promise.all([
      refetchEventStatuses(),
      refetchOrderedEventStatuses(),
    ]);
  }

  const formik = useFormik<EventStatusForm>({
    initialValues: emptyForm(),
    validationSchema: Yup.object({
      name: Yup.string().trim().required(t("wording.required")),
      order_data: Yup.number().integer("Must be an integer").min(0, t("wording.minimumValueIs0")).required(t("wording.required")),
      action: Yup.string().oneOf(["", "SCAN_IN", "SCAN_OUT"]),
    }),
    validateOnChange: false,
    onSubmit: async (values, { resetForm }) => {
      try {
        const featureRows = orderedStatuses.filter(row => row.id !== editingId);
        if (!orderedResponse || hasExclusiveFlagConflict(values, featureRows)) {
          toast.error(t('eventUpgrade.exclusiveError')); return;
        }
        const payload: EventStatusPayload = {
          name: values.name.trim(),
          code: values.code.trim().toUpperCase(),
          cutting_stock: values.cuttingStock,
          stock_return: values.stockReturn,
          production_item: values.productionItem,
          check_ownership: values.checkOwnership,
          allow_add_item: values.allowAddItem,
          allow_delete: values.allowDelete,
          borrow_item: values.borrowItem,
          outsource_item: values.outsourceItem,
          is_show_scan_result: values.action ? 1 : 0,
          order_data: Number(values.order_data),
          action: values.action,
        };
        const result = editingId
          ? await putEventStatus({ ...payload, id: editingId })
          : await postEventStatus(payload);

        toast(result.message || (editingId ? t("wording.eventStatusUpdatedSuccessfully") : t("wording.eventStatusCreatedSuccessfully")), {
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
              ? t("wording.failedToUpdateEventStatus")
              : t("wording.failedToCreateEventStatus"),
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
    if (reorderMode) return;
    if (sortBy === field) setSort((direction) => (direction === "ASC" ? "DESC" : "ASC"));
    else {
      setSortBy(field);
      setSort("ASC");
    }
    setPage(1);
  }

  function openNew() {
    if (reorderMode) return;
    setEditingId(null);
    formik.resetForm({ values: emptyForm(total + 1) });
    setStatusModal(true);
  }

  function openEdit(row: EventStatusRow) {
    if (reorderMode) return;
    setEditingId(row.id);
    formik.resetForm({
      values: {
        cuttingStock: row.cuttingStock,
        stockReturn: row.stockReturn,
        productionItem: row.productionItem,
        code: row.code,
        name: row.status,
        order_data: String(row.order),
        action: normalizeScanAction(row.action),
        checkOwnership: row.checkOwnership,
        allowAddItem: row.allowAddItem,
        allowDelete: row.allowDelete,
        borrowItem: row.borrowItem,
        outsourceItem: row.outsourceItem,
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

  function startReorder() {
    setSortBy("order_data");
    setSort("ASC");
    setPage(1);
    setDraftStatuses(orderedStatuses.map((status) => ({ ...status })));
    setReorderMode(true);
  }

  function cancelReorder() {
    if (isSavingOrder) return;
    setDraftStatuses([]);
    setReorderMode(false);
  }

  function moveOrder(id: number, direction: number) {
    const sorted = [...draftStatuses].sort(
      (left, right) => left.order - right.order,
    );
    const index = sorted.findIndex((status) => status.id === id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;

    const current = sorted[index];
    const neighbor = sorted[swapIndex];
    sorted[index] = { ...neighbor, order: current.order };
    sorted[swapIndex] = { ...current, order: neighbor.order };
    setDraftStatuses(sorted);
  }

  async function saveReorder() {
    const originalOrder = new Map(
      orderedStatuses.map((status) => [status.id, status.order]),
    );
    const changedStatuses = draftStatuses.filter(
      (status) => originalOrder.get(status.id) !== status.order,
    );

    try {
      setIsSavingOrder(true);
      await Promise.all(
        changedStatuses.map((status) =>
          putEventStatus({
            id: status.id,
            name: status.status,
            code: status.code,
            cutting_stock: status.cuttingStock,
            stock_return: status.stockReturn,
            production_item: status.productionItem,
            check_ownership: status.checkOwnership,
            allow_add_item: status.allowAddItem,
            allow_delete: status.allowDelete,
            borrow_item: status.borrowItem,
            outsource_item: status.outsourceItem,
            is_show_scan_result: status.scan === "Scan" ? 1 : 0,
            order_data: status.order,
            action: normalizeScanAction(status.action),
          }),
        ),
      );
      toast.success(t("wording.eventStatusOrderUpdatedSuccessfully"));
      setReorderMode(false);
      setDraftStatuses([]);
      await refetchStatusLists();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("wording.failedToSaveEventStatusOrder"),
      );
    } finally {
      setIsSavingOrder(false);
    }
  }

  function openDelete(id: number) {
    if (reorderMode) return;
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
            : t("wording.failedToDeleteEventStatus")),
      );
    }
  }

  function formRuleValue(rule: RuleDefinition) {
    return rule.key === 'scan' ? Boolean(formik.values.action) : formik.values[rule.key];
  }

  function setFormRule(rule: RuleDefinition, enabled: boolean) {
    if (rule.key === 'scan') {
      void formik.setFieldValue('action', enabled ? 'SCAN_IN' : '');
      return;
    }
    void formik.setFieldValue(rule.key, enabled);
    if (rule.key === 'cuttingStock' && enabled) void formik.setFieldValue('stockReturn', false);
    if (rule.key === 'stockReturn' && enabled) void formik.setFieldValue('cuttingStock', false);
  }

  return (
    <>
      <div className="es-header">
        <div className="es-header-text">
          <h1 className="page-title" style={{ margin: 0 }}>{t("wording.eventStatus")}</h1>
          <p className="es-intro">{t('eventSettingsRules.intro')}</p>
        </div>
        <div className="es-header-actions">
          <button
            type="button"
            className={`es-guide-toggle${legendOpen ? ' open' : ''}`}
            aria-expanded={legendOpen}
            aria-controls="es-rule-guide"
            onClick={() => setLegendOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            <span>{t('eventSettingsRules.guide.toggle')}</span>
            <span className="es-guide-chevron" aria-hidden="true"><IconChevronDown /></span>
          </button>
          <button className="btn-new" disabled={reorderMode} onClick={openNew}><IconPlus /> {t("wording.newStatus")}</button>
        </div>
      </div>

      {legendOpen && <section id="es-rule-guide" className="card es-guide" aria-labelledby="es-guide-title">
        <header className="es-guide-head">
          <div>
            <h2 id="es-guide-title">{t('eventSettingsRules.guide.title')}</h2>
            <p>{t('eventSettingsRules.guide.subtitle')}</p>
          </div>
          <button type="button" className="btn-icon" aria-label={t('eventSettingsRules.hideLegend')} title={t('eventSettingsRules.hideLegend')} onClick={() => setLegendOpen(false)}>
            <IconClose />
          </button>
        </header>
        <div className="es-guide-grid">
          {RULE_GROUPS.map((group) => <div className={`es-guide-group ${group.color}`} key={group.id}>
            <div className="es-legend-title"><span className={`es-dot ${group.color}`} />{t(group.labelKey)}</div>
            <p className="es-guide-hint">{t(`eventSettingsRules.guide.groupHints.${group.id}`)}</p>
            <ul className="es-guide-list">
              {RULES.filter((rule) => rule.group === group.id).map((rule) => <li key={rule.key}>
                <div className="es-guide-rule-head">
                  <span className={`es-chip ${rule.restrictive ? 'red' : group.color}`}>{t(rule.chipKey)}</span>
                  {rule.unique && <span className="es-guide-tag">{t('eventSettingsRules.guide.oneStageOnly')}</span>}
                  {rule.restrictive && <span className="es-guide-tag">{t('eventSettingsRules.guide.shownWhenOff')}</span>}
                </div>
                <p>{t(`eventSettingsRules.guide.rules.${rule.key}`)}</p>
              </li>)}
            </ul>
          </div>)}
        </div>
        <footer className="es-guide-foot">
          <span className="es-guide-foot-label">{t('eventSettingsRules.guide.dotsLabel')}</span>
          <span className="es-guide-dot"><i className="green" />{t('eventSettingsRules.guide.dotScan')}</span>
          <span className="es-guide-dot"><i className="orange" />{t('eventSettingsRules.guide.dotStock')}</span>
          <span className="es-guide-dot"><i className="red" />{t('eventSettingsRules.guide.dotLocked')}</span>
        </footer>
      </section>}

      <div className="es-summary">
        <div className="es-kpis">
          {[
            { label: t('eventSettingsRules.stages'), value: total, color: 'var(--brand)' },
            { label: t('eventSettingsRules.scanStages'), value: scanEnabled, color: 'var(--green)' },
            { label: t('eventSettingsRules.eventsRunning'), value: runningTotal, color: 'var(--orange)' },
          ].map((stat) => <div className="es-kpi" key={stat.label}>
            <b style={{ color: stat.color }}>{fmtDisplayNumber(stat.value)}</b><span>{stat.label}</span>
          </div>)}
          <div className="es-kpi wide">
            <span>{t('eventSettingsRules.stockPipeline')}</span>
            <b className="es-kpi-text">
              {cutStage
                ? <>{t('eventSettingsRules.cutAtLabel')} <em>{cutStage.status}</em></>
                : t('eventSettingsRules.noCutStage')}
              {' · '}
              {returnStage
                ? <>{t('eventSettingsRules.returnAtLabel')} <em>{returnStage.status}</em></>
                : t('eventSettingsRules.noReturnStage')}
            </b>
          </div>
        </div>
        <ol className="es-pipeline" aria-label={t('eventSettingsRules.stageOrder')}>
          {orderedStatuses.map((status) => <li key={status.id}>
            <span className="es-pipe-num">{status.order}</span>
            <span className="es-pipe-name">{status.status}</span>
            <span className="es-pipe-icons">
              {status.scan === 'Scan' && <i className="green" />}
              {(status.cuttingStock || status.stockReturn) && <i className="orange" />}
              {!status.allowAddItem && <i className="red" />}
            </span>
          </li>)}
        </ol>
      </div>

      <div className="card event-status-table-card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input"
                type="text"
                placeholder={t("wording.searchStatus")}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") applySearch(); }}
              />
            </div>
            <button className="btn-search" onClick={applySearch}>{t("wording.search")}</button>
          </div>
          <div className="toolbar-right">
            {reorderMode ? (
              <>
                <button className="btn-cancel-modal" disabled={isSavingOrder} onClick={cancelReorder}><IconClose /> {t("wording.cancel")}</button>
                <button className="btn-save-modal" disabled={isSavingOrder} onClick={() => void saveReorder()}><IconCheck /> {isSavingOrder ? t("wording.saving") : t("wording.saveOrder")}</button>
              </>
            ) : (
              <button className="btn btn-ghost" disabled={!orderedResponse} onClick={startReorder}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="8 7 12 3 16 7" /><polyline points="16 17 12 21 8 17" /><line x1="12" y1="3" x2="12" y2="21" /></svg>
                {t("wording.editOrder")}
              </button>
            )}
          </div>
        </div>

        {reorderMode && (
          <p className="event-status-reorder-help">
            {t("wording.reorderingUseTheArrowsBelowThen")} <strong>{t("wording.saveOrder")}</strong> {t("wording.toApplyOr")} <strong>{t("wording.cancel")}</strong> {t("wording.toDiscard")}
          </p>
        )}

        <div className="table-wrap">
          <table className="es-table event-status-table">
            <thead>
              <tr>
                <SortTh label={t("wording.order")} id="order_data" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ width: 100 }} />
                <SortTh label={t("wording.status")} id="name" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ minWidth: 210 }} />
                <th className="es-col-rules" style={{ minWidth: 360 }}>{t('eventSettingsRules.rules')}</th>
                <SortTh label={t("wording.eventRunning")} id="active_event" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ width: 100, textAlign: "right" }} />
                <SortTh label={t("wording.updatedAt")} id="created_at" sortCol={sortBy} sortAsc={sort === "ASC"} onSort={handleSort} style={{ width: 125 }} />
                <th style={{ width: 100, textAlign: "center" }}>{t("wording.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && statuses.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40 }}>{t("wording.loadingEventStatuses")}</td></tr>
              ) : isError ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--red)" }}>{t("wording.failedToLoadEventStatuses")}</td></tr>
              ) : displayedStatuses.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>{t("wording.noStatusesFound")}</td></tr>
              ) : (
                displayedStatuses.map((row) => {
                  const orderedIndex = displayedStatuses.findIndex((status) => status.id === row.id);
                  return (
                  <tr key={row.id}>
                    <td>
                      <div className="es-order">
                        <span className="es-order-num">{row.order}</span>
                        {reorderMode && <span className="es-order-arrows">
                          <button className="btn-icon" title={t("wording.moveUp")} style={{ padding: "2px 5px", color: orderedIndex <= 0 ? "var(--border)" : "var(--text-muted)" }} disabled={orderedIndex <= 0 || isSavingOrder} onClick={() => moveOrder(row.id, -1)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><polyline points="18 15 12 9 6 15" /></svg>
                          </button>
                          <button className="btn-icon" title={t("wording.moveDown")} style={{ padding: "2px 5px", color: orderedIndex === displayedStatuses.length - 1 ? "var(--border)" : "var(--text-muted)" }} disabled={orderedIndex === displayedStatuses.length - 1 || isSavingOrder} onClick={() => moveOrder(row.id, 1)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><polyline points="6 9 12 15 18 9" /></svg>
                          </button>
                        </span>}
                      </div>
                    </td>
                    <td>
                      <div className="es-name">{row.status}</div>
                      {row.code && <span className="es-code">{row.code}</span>}
                      <div className="es-rules-mobile"><RuleChips row={row} /></div>
                    </td>
                    <td className="es-col-rules"><RuleChips row={row} /></td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      <span style={{ color: row.eventRunning > 0 ? "var(--orange)" : "var(--text-muted)" }}>{row.eventRunning}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{fmtDate(row.updatedAt)}</td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: "center" }}>
                        <button className="btn-icon edit" title={t("wording.edit")} disabled={reorderMode} onClick={() => openEdit(row)}><IconEdit /></button>
                        <button className="btn-icon delete" title={t("wording.delete")} disabled={reorderMode} onClick={() => openDelete(row.id)}><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!reorderMode && (
          <Pagination currentPage={currentPage} total={total} pageSize={PAGE_SIZE} onPage={(nextPage: number) => setPage(nextPage)} label={t("wording.statuses")} />
        )}
      </div>

      <Modal
        open={statusModal}
        size="lg"
        title={editingId ? t("wording.editEventStatus") : t("wording.newEventStatus")}
        onClose={closeStatusModal}
        footer={
          <>
            <button className="btn-cancel-modal" disabled={isSaving} onClick={closeStatusModal}><IconClose /> {t("wording.cancel")}</button>
            <button className="btn-save-modal" type="submit" disabled={isSaving || !orderedResponse} onClick={() => formik.handleSubmit()}><IconCheck /> {isSaving ? t("common.actions.saving") : t("common.actions.save")}</button>
          </>
        }
      >
        <div className="es-form-basics">
          <TextInput value={formik.values.order_data} onChange={(value) => formik.setFieldValue("order_data", value)} isRequired isNumeric label={t("wording.order")} placeholder={t("wording.eG1")} errorText={formik.errors.order_data} />
          <TextInput value={formik.values.name} onChange={(value) => formik.setFieldValue("name", value)} isRequired label={t("wording.statusName")} placeholder={t("wording.eGEventRunning")} errorText={formik.errors.name} />
          <TextInput label={t('wording.code')} value={formik.values.code} onChange={(value) => formik.setFieldValue('code', value.toUpperCase())} />
        </div>
        {RULE_GROUPS.map((group) => <div className="es-form-group" key={group.id}>
          <div className="es-legend-title"><span className={`es-dot ${group.color}`} />{t(group.labelKey)}</div>
          {RULES.filter((rule) => rule.group === group.id).map((rule) => {
            const owner = rule.key === 'cuttingStock'
              ? orderedStatuses.find((row) => row.id !== editingId && row.cuttingStock)
              : rule.key === 'stockReturn'
                ? orderedStatuses.find((row) => row.id !== editingId && row.stockReturn)
                : undefined;
            const enabled = Boolean(formRuleValue(rule));
            return <div key={rule.key}>
              <RuleSwitch
                checked={enabled}
                disabled={Boolean(owner) && !enabled}
                label={t(rule.labelKey)}
                description={t(rule.descriptionKey)}
                note={owner && !enabled ? t('eventSettingsRules.usedBy', { name: owner.status }) : undefined}
                onChange={(value) => setFormRule(rule, value)}
              />
              {rule.key === 'scan' && enabled && <div className="es-scan-action">
                <SearchableSelect
                  value={formik.values.action}
                  onChange={(value) => formik.setFieldValue('action', value as ScanAction)}
                  options={[
                    { value: 'SCAN_IN', label: t('wording.scanIn') },
                    { value: 'SCAN_OUT', label: t('wording.scanOut') },
                  ]}
                  errorText={formik.errors.action}
                />
              </div>}
            </div>;
          })}
        </div>)}
      </Modal>

      <Modal
        open={deleteModal}
        title={t("wording.deleteEventStatus")}
        onClose={() => setDeleteModal(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteModal(false)}>{t("wording.cancel")}</button>
            <button className="btn-del-ok" onClick={confirmDelete}>{t("wording.delete")}</button>
          </>
        }
      >
        <p className="confirm-msg">
          {t("wording.areYouSureYouWantToDelete")} <strong>&ldquo;{deleteRecord?.status}&rdquo;</strong>{t("wording.thisActionCannotBeUndone")}
        </p>
      </Modal>
    </>
  );
}
