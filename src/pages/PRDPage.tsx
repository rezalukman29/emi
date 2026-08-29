import type { ReactNode } from "react";

const sections = [
  ["overview", "Overview"],
  ["lifecycle", "Event Lifecycle"],
  ["scan", "Scan Gate & Next"],
  ["packaging", "Packaging"],
  ["summary", "Event Summary"],
  ["auth", "Authentication & Roles"],
  ["opname", "Stock Opname"],
  ["warehouse", "Warehouse Inventory"],
  ["moving-order", "Moving Order"],
  ["dropdowns", "Searchable Dropdowns"],
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
  return (
    <>
      <h1 className="page-title">Product Knowledge</h1>
      <p className="page-subtitle">
        A living reference for EMI Inventory behavior, decisions, and current integration boundaries.
      </p>

      <nav className="card prd-navigation" aria-label="Product knowledge sections">
        <div className="section-title">On this page</div>
        <div className="prd-navigation-links">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="badge badge-blue">
              {label}
            </a>
          ))}
        </div>
      </nav>

      <Section id="overview" title="Overview">
        <Paragraph>
          EMI Inventory is an API-backed event and inventory management application. The tenant area
          manages events, warehouses, inventory, loans, reports, and master data. The separate Owner
          Panel under <code>/superadmin</code> manages SaaS customers, plans, and defaults.
        </Paragraph>
      </Section>

      <Section id="lifecycle" title="Event Lifecycle">
        <Paragraph>
          Event Detail builds its lifecycle from the Event Status API, ordered by <code>order_data</code>.
          Renaming or reordering the master records therefore changes the stepper without a separate
          hard-coded stage list.
        </Paragraph>
        <List>
          <li>Every event item retains the status in which it was added.</li>
          <li>The item tabs separate all items, carried-over items, and items added in the current status.</li>
          <li>Event Settings is an Admin shortcut to the same Event Status master page.</li>
        </List>
      </Section>

      <Section id="scan" title="Scan Gate & Next">
        <Paragraph>
          A status with <code>is_show_scan_result = 1</code> is a scan stage. Item scan controls and the
          guided Next action are only shown at those stages. Moving forward is blocked while required
          items remain unscanned; moving backward stays available.
        </Paragraph>
      </Section>

      <Section id="packaging" title="Packaging">
        <Paragraph>
          Packaging groups multiple event items into one physical box. A grouped view shows the box,
          its members, and a single scan action so one box QR can represent every item inside. Existing
          package information returned by the API remains the source of truth; newly assembled boxes
          stay local to the current Event Detail session until a create-package contract is available.
        </Paragraph>
      </Section>

      <Section id="summary" title="Event Summary">
        <Paragraph>
          Event Detail provides a compact summary modal for total quantity, checked items, scan-in, and
          scan-out progress. View Full Detail opens the API-backed summary page using the event ID; its
          breadcrumb links back to the event list and the selected event.
        </Paragraph>
      </Section>

      <Section id="auth" title="Authentication & Roles">
        <Paragraph>
          Tenant login and password recovery use the backend authentication flow and store the authenticated
          profile in the <code>auth</code> local-storage entry. Tenant routes require that session. Admin and
          Employee roles use the same operational application; Admin additionally sees the Event Settings shortcut.
        </Paragraph>
      </Section>

      <Section id="opname" title="Stock Opname">
        <Paragraph>
          Stock Opname is scoped to one warehouse and lives at <code>/stock-opname</code>. The operator enters
          Period, Remark, actual stock, and the observed condition. Submission creates an API record for review;
          applying an opname is performed from its history rather than silently replacing inventory data locally.
          Condition details and a rejection fallback are retained for the active browser session while those
          fields/actions are not yet supported by the backend contract.
        </Paragraph>
      </Section>

      <Section id="warehouse" title="Warehouse Inventory">
        <Paragraph>
          Warehouse Inventory uses backend pagination, searching, sorting, warehouse and stock-status filters.
          Row actions expose API-backed detail, edit, and delete flows. Stock numbers displayed in the UI are never
          replaced by the prototype&apos;s in-memory warehouse arrays.
        </Paragraph>
      </Section>

      <Section id="moving-order" title="Moving Order">
        <Paragraph>
          The intended flow selects a source warehouse, one or more items and quantities, then a different
          destination warehouse. The form remains separated from Stock Opname because transfers and physical
          counts have different audit semantics. Until a dedicated transfer endpoint is available, creating an
          order updates only the Moving Order session preview and local history; API inventory remains unchanged.
        </Paragraph>
      </Section>

      <Section id="dropdowns" title="Searchable Dropdowns">
        <Paragraph>
          Tenant filters and long option lists use the shared searchable dropdown. Option values continue to use
          backend IDs or enums, while labels and metadata provide readable context. The Owner Panel keeps its own
          controls and styling.
        </Paragraph>
      </Section>
    </>
  );
}
