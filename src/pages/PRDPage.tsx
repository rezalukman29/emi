import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

const sections = [
  ["overview", "Overview"],
  ["lifecycle", "Event Lifecycle"],
  ["closing", "Event closing & ownership"],
  ["scan", "Scan Gate & Next"],
  ["packaging", "Packaging"],
  ["summary", "Event Summary"],
  ["auth", "Authentication & Roles"],
  ["opname", "Stock Opname"],
  ["warehouse", "Warehouse Inventory"],
  ["moving-order", "Moving Order"],
  ["dropdowns", "Searchable Dropdowns"],
  ["activity-log", "Activity Log"],
  ["item-loan", "Item Loan"],
  ["upgrade", "Upgrade"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="card prd-section" id={id}>
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

function Paragraph({ children }: { children: ReactNode }) {
  return <p className="prd-copy">{children}</p>;
}

function List({ children }: { children: ReactNode }) {
  return <ul className="prd-list">{children}</ul>;
}

export default function PRDPage() {
  const { t } = useTranslation();
  return (
    <>
      <h1 className="page-title">{t("wording.productKnowledge")}</h1>
      <p className="page-subtitle">
        {t("wording.aLivingReferenceForEmiInventoryBehaviorDecisions")}
      </p>

      <nav className="card prd-navigation" aria-label={t("wording.productKnowledgeSections")}>
        <div className="section-title">{t("wording.onThisPage")}</div>
        <div className="prd-navigation-links">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="badge badge-blue">
              {label}
            </a>
          ))}
        </div>
      </nav>

      <Section id="overview" title={t("wording.overview")}>
        <Paragraph>
          {t("wording.emiInventoryIsAnApiBackedEventAnd")} <code>/superadmin</code> {t("wording.managesSaasCustomersPlansAndDefaults")}
        </Paragraph>
      </Section>

      <Section id="lifecycle" title={t("wording.eventLifecycle")}>
        <Paragraph>
          {t("wording.eventDetailBuildsItsLifecycleFromTheEvent")} <code>order_data</code>{t("wording.renamingOrReorderingTheMasterRecordsThereforeChanges")}
        </Paragraph>
        <List>
          <li>{t("wording.everyEventItemRetainsTheStatusInWhich")}</li>
          <li>{t("wording.theItemTabsExposeWaitingScanWhenRelevant")}</li>
          <li>{t("wording.eventSettingsIsAnAdminShortcutToThe")}</li>
          <li>{t("wording.statusReorderingIsAnExplicitEditFlowEdit")}</li>
        </List>
      </Section>

      <Section id="scan" title={t("wording.scanGateNext")}>
        <Paragraph>
          {t("wording.aStatusWith")} <code>is_show_scan_result = 1</code> {t("wording.isAScanStageItemScanControlsAnd")}
        </Paragraph>
      </Section>

      <Section id="closing" title={t('lifecycle.prdTitle')}>
        <p>{t('lifecycle.prdBody')}</p>
        <p>{t('lifecycle.preview')}</p>
      </Section>
      <Section id="packaging" title={t("wording.packaging")}>
        <p>{t('lifecycle.groupItems')}</p>
        <Paragraph>
          {t("wording.packagingGroupsMultipleEventItemsIntoOnePhysical")}
        </Paragraph>
      </Section>

      <Section id="summary" title={t("wording.eventSummary")}>
        <Paragraph>
          {t("wording.eventDetailProvidesACompactSummaryModalFor")}
        </Paragraph>
      </Section>

      <Section id="auth" title={t("wording.authenticationRoles")}>
        <Paragraph>
          {t("wording.tenantLoginAndPasswordRecoveryUseTheBackend")} <code>auth</code> {t("wording.localStorageEntryTenantRoutesRequireThatSession")}
        </Paragraph>
      </Section>

      <Section id="opname" title={t("wording.stockOpname")}>
        <Paragraph>
          {t("wording.stockOpnameIsScopedToOneWarehouseAnd")} <code>/stock-opname</code>{t("wording.theOperatorEntersPeriodRemarkActualStockAnd")}
        </Paragraph>
      </Section>

      <Section id="warehouse" title={t("wording.warehouseInventory")}>
        <Paragraph>
          {t("wording.warehouseInventoryUsesBackendPaginationSearchingSortingWarehouse")}
        </Paragraph>
      </Section>

      <Section id="moving-order" title={t("wording.movingOrder")}>
        <Paragraph>
          {t("wording.theIntendedFlowSelectsASourceWarehouseOne")}
        </Paragraph>
      </Section>

      <Section id="dropdowns" title={t("wording.searchableDropdowns")}>
        <Paragraph>
          {t("wording.tenantFiltersAndLongOptionListsUseThe")}
        </Paragraph>
      </Section>

      <Section id="activity-log" title={t("wording.activityLog")}>
        <Paragraph>
          {t("wording.theLogPageAndDashboardRecentActivityUse")}
        </Paragraph>
      </Section>

      <Section id="item-loan" title={t("wording.itemLoan")}>
        <Paragraph>
          {t("wording.itemLoanUsesBackendPaginationSearchingStatusFilters")} <code>barang_gudang_id</code> {t("wording.perLoan")}
        </Paragraph>
      </Section>

      <Section id="upgrade" title={t("wording.upgrade")}>
        <Paragraph>
          {t("wording.theUpgradeButtonInTheTenantHeaderOpens")}
        </Paragraph>
      </Section>
    </>
  );
}
