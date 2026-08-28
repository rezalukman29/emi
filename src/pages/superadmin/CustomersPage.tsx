import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";

import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import SortTh from "../../components/SortTh";
import TextInput from "../../components/TextInput";
import {
  IconBan,
  IconCheck,
  IconClose,
  IconDelete,
  IconEdit,
  IconEye,
  IconPlus,
  IconSearch,
} from "../../components/icons";
import { initialCustomerUsers, type CustomerUser } from "../../data/customerUsers";
import useCreateSuperAdminCustomer from "../../hooks/api/useCreateSuperAdminCustomer";
import useDeleteSuperAdminCustomer from "../../hooks/api/useDeleteSuperAdminCustomer";
import useGetAdminPlan from "../../hooks/api/useGetAdminPlan";
import useGetSuperAdminCustomers from "../../hooks/api/useGetSuperAdminCustomers";
import usePutBlockSuperAdminCustomer from "../../hooks/api/usePutBlockSuperAdminCustomer";
import useUpdateSuperAdminCustomer from "../../hooks/api/useUpdateSuperAdminCustomer";
import { customerStatusBadge, formatIDR } from "../../lib/superAdminUtils";

const PAGE_SIZE = 10;
const STATUSES = ["Active", "Trial", "Suspended", "Cancelled"];
const SUB_ROLES = ["Owner", "Admin", "Staff", "Viewer"];
const SUB_STATUSES = ["active", "inactive"];

interface CustomerRow {
  id: number;
  company: string;
  contact: string;
  email: string;
  planId: number;
  plan: string;
  status: string;
  mrr: number;
  users: number;
  joinedAt: string;
  isBlocked: boolean;
}

interface CustomerForm {
  company: string;
  contact: string;
  email: string;
  planId: string;
  status: string;
  mrr: string;
  users: string;
}

type CustomerSortKey = "company" | "contact" | "plan" | "status" | "mrr" | "users" | "joinedAt";

const columns: CustomerSortKey[] = [
  "company",
  "contact",
  "plan",
  "status",
  "mrr",
  "users",
  "joinedAt",
];

function emptyForm(planId = 0): CustomerForm {
  return {
    company: "",
    contact: "",
    email: "",
    planId: String(planId || ""),
    status: "Trial",
    mrr: "0",
    users: "1",
  };
}

function emptySubForm() {
  return { name: "", email: "", role: "Staff", status: "active" };
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function requestErrorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (apiMessage) return apiMessage;
  return error instanceof Error ? error.message : fallback;
}

export default function CustomersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortCol, setSortCol] = useState(0);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [blockingId, setBlockingId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [customerUsers, setCustomerUsers] = useState(initialCustomerUsers);
  const [nextSubUserId, setNextSubUserId] = useState(2000);
  const [usersModalId, setUsersModalId] = useState<number | null>(null);
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [subForm, setSubForm] = useState(emptySubForm());

  const {
    data: customersResponse,
    isLoading: isCustomersLoading,
    isError: isCustomersError,
    refetch: refetchCustomers,
  } = useGetSuperAdminCustomers({
    params: {
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    },
    options: { keepPreviousData: true },
  });
  const { data: plansResponse } = useGetAdminPlan();
  const { mutateAsync: createCustomer, isLoading: isCreating } = useCreateSuperAdminCustomer();
  const { mutateAsync: updateCustomer, isLoading: isUpdating } = useUpdateSuperAdminCustomer();
  const { mutateAsync: deleteCustomer, isLoading: isDeleting } = useDeleteSuperAdminCustomer();
  const { mutateAsync: putBlockCustomer } = usePutBlockSuperAdminCustomer();
  const isSaving = isCreating || isUpdating;

  const customerFormik = useFormik<CustomerForm>({
    initialValues: emptyForm(),
    validationSchema: Yup.object({
      company: Yup.string().trim().required("Company is required."),
      contact: Yup.string().trim().required("Contact name is required."),
      email: Yup.string()
        .trim()
        .email("Enter a valid email address.")
        .required("Email is required."),
      planId: Yup.string().required("Plan is required."),
      status: Yup.string().oneOf(STATUSES).required("Status is required."),
      mrr: Yup.number()
        .typeError("MRR must be a number.")
        .integer("MRR must be a whole number.")
        .min(0, "MRR cannot be negative.")
        .required("MRR is required."),
      users: Yup.number()
        .typeError("Users must be a number.")
        .integer("Users must be a whole number.")
        .min(0, "Users cannot be negative.")
        .required("Users is required."),
    }),
    onSubmit: async (values, { resetForm }) => {
      const payload = {
        contact_name: values.contact.trim(),
        email: values.email.trim(),
        name: values.company.trim(),
        plan_id: Number(values.planId),
        status: values.status,
        users: Number(values.users),
        mrr: Number(values.mrr),
      };

      try {
        const response = editingId
          ? await updateCustomer({ id: editingId, payload })
          : await createCustomer(payload);
        toast(response.message, { type: "success" });
        setModalOpen(false);
        resetForm();
        if (!editingId && page !== 1) setPage(1);
        else await refetchCustomers();
      } catch (error) {
        toast(
          requestErrorMessage(
            error,
            editingId ? "Failed to update customer." : "Failed to create customer.",
          ),
          { type: "error" },
        );
      }
    },
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const customerData = customersResponse?.data;
  const stats = customerData?.stats;
  const planOptions = plansResponse?.data ?? [];
  const customers = useMemo<CustomerRow[]>(() => (
    (customerData?.items ?? []).map((item) => ({
      id: item.id,
      company: item.name,
      contact: item.contact_name,
      email: item.email,
      planId: item.plan_id,
      plan: item.plan_name,
      status: item.is_blocked === 1 ? "Suspended" : item.status,
      mrr: item.mrr,
      users: item.users,
      joinedAt: formatDate(item.created_at),
      isBlocked: item.is_blocked === 1,
    }))
  ), [customerData?.items]);

  const pageData = useMemo(() => {
    const filtered = customers.filter((customer) => (
      !statusFilter || customer.status.toLowerCase() === statusFilter.toLowerCase()
    ));
    const key = columns[sortCol] ?? "company";
    return filtered.sort((first, second) => {
      const firstValue = first[key];
      const secondValue = second[key];
      if (typeof firstValue === "number") {
        return sortAsc
          ? firstValue - Number(secondValue)
          : Number(secondValue) - firstValue;
      }
      return sortAsc
        ? String(firstValue).localeCompare(String(secondValue))
        : String(secondValue).localeCompare(String(firstValue));
    });
  }, [customers, sortAsc, sortCol, statusFilter]);

  const total = customerData?.total ?? 0;
  const totalPages = Math.max(1, customerData?.total_pages ?? 1);
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function handleSort(column: number) {
    if (sortCol === column) setSortAsc((current) => !current);
    else {
      setSortCol(column);
      setSortAsc(true);
    }
  }

  function openNew() {
    setEditingId(null);
    customerFormik.resetForm({ values: emptyForm(planOptions[0]?.id) });
    setModalOpen(true);
  }

  function openEdit(customer: CustomerRow) {
    setEditingId(customer.id);
    customerFormik.resetForm({ values: {
      company: customer.company,
      contact: customer.contact,
      email: customer.email,
      planId: String(customer.planId),
      status: customer.status,
      mrr: String(customer.mrr),
      users: String(customer.users),
    } });
    setModalOpen(true);
  }

  function closeCustomerModal() {
    if (isSaving) return;
    setModalOpen(false);
  }

  async function toggleBlock(customer: CustomerRow) {
    setBlockingId(customer.id);
    try {
      const response = await putBlockCustomer(customer.id);
      toast(response.message, { type: "success" });
      await refetchCustomers();
    } catch (error) {
      toast(
        requestErrorMessage(
          error,
          customer.isBlocked ? "Failed to unblock customer." : "Failed to block customer.",
        ),
        { type: "error" },
      );
    } finally {
      setBlockingId(null);
    }
  }

  function openDelete(id: number) {
    setDeletingId(id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingId) return;
    try {
      const response = await deleteCustomer(deletingId);
      toast(response.message, { type: "success" });
      setDeleteOpen(false);
      setDeletingId(null);
      await refetchCustomers();
    } catch (error) {
      toast(requestErrorMessage(error, "Failed to delete customer."), { type: "error" });
    }
  }

  function openUsers(id: number) {
    setUsersModalId(id);
    setEditingSubId(null);
    setSubForm(emptySubForm());
  }

  function closeUsers() {
    setUsersModalId(null);
  }

  function saveSubUser() {
    if (!subForm.name.trim() || !subForm.email.trim() || usersModalId === null) return;
    const customerId = usersModalId;
    setCustomerUsers((current) => {
      const users = current[customerId] || [];
      if (editingSubId) {
        return {
          ...current,
          [customerId]: users.map((user) => (
            user.id === editingSubId
              ? { ...user, ...subForm, name: subForm.name.trim(), email: subForm.email.trim() }
              : user
          )),
        };
      }
      return {
        ...current,
        [customerId]: [
          ...users,
          { id: nextSubUserId, ...subForm, name: subForm.name.trim(), email: subForm.email.trim() },
        ],
      };
    });
    if (!editingSubId) setNextSubUserId((current) => current + 1);
    setEditingSubId(null);
    setSubForm(emptySubForm());
  }

  function editSubUser(user: CustomerUser) {
    setEditingSubId(user.id);
    setSubForm({ name: user.name, email: user.email, role: user.role, status: user.status });
  }

  function removeSubUser(id: number) {
    if (usersModalId === null) return;
    setCustomerUsers((current) => ({
      ...current,
      [usersModalId]: (current[usersModalId] || []).filter((user) => user.id !== id),
    }));
    if (editingSubId === id) {
      setEditingSubId(null);
      setSubForm(emptySubForm());
    }
  }

  const deleteTarget = customers.find((customer) => customer.id === deletingId);
  const usersCustomer = customers.find((customer) => customer.id === usersModalId);
  const subUsers = usersModalId === null ? [] : customerUsers[usersModalId] || [];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Customers</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Customer</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {[
          { label: "Total Customers", value: stats?.total ?? 0, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: "Active", value: stats?.active ?? 0, color: "var(--green)", bg: "var(--green-bg)" },
          { label: "Trial", value: stats?.trial ?? 0, color: "var(--orange)", bg: "var(--orange-bg)" },
          { label: "Active MRR", value: formatIDR(stats?.active_mrr ?? 0), color: "var(--purple)", bg: "var(--purple-bg)" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon" style={{ background: stat.bg }}>
              <span className="stat-value" style={{ color: stat.color, fontSize: typeof stat.value === "string" ? 14 : 20 }}>{stat.value}</span>
            </div>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input className="search-input" type="text" placeholder="Search company, contact, email…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            </div>
            <div className="wi-select-wrap">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All Status</option>
                {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openNew}><IconPlus /> New</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Company" colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Contact" colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Plan" colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 100 }} />
                <SortTh label="Status" colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 100 }} />
                <SortTh label="MRR" colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 120 }} />
                <SortTh label="Users" colIndex={5} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 70 }} />
                <SortTh label="Joined" colIndex={6} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 110 }} />
                <th style={{ width: 120, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isCustomersLoading && !customerData ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>Loading customers…</td></tr>
              ) : isCustomersError ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--red)", padding: 32 }}>Unable to load customers.</td></tr>
              ) : !pageData.length ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>No customers found.</td></tr>
              ) : pageData.map((customer) => {
                return (
                  <tr key={customer.id}>
                    <td className="name-cell">{customer.company}</td>
                    <td>{customer.contact}<div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{customer.email}</div></td>
                    <td>{customer.plan}</td>
                    <td><span className={`badge badge-${customerStatusBadge(customer.status.toLowerCase())}`}>{customer.status}</span></td>
                    <td>{formatIDR(customer.mrr)}</td>
                    <td>{customer.users}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{customer.joinedAt}</td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: "center" }}>
                        <button className="btn-icon" title="Manage Users" style={{ color: "var(--brand)" }} onClick={() => openUsers(customer.id)}><IconEye /></button>
                        <button className="btn-icon edit" title="Edit" onClick={() => openEdit(customer)}><IconEdit /></button>
                        <button
                          className="btn-icon"
                          title={customer.isBlocked ? "Unblock" : "Block"}
                          aria-label={customer.isBlocked ? "Unblock customer" : "Block customer"}
                          disabled={blockingId === customer.id}
                          style={{ color: customer.isBlocked ? "var(--green)" : "var(--orange)" }}
                          onClick={() => toggleBlock(customer)}
                        >
                          <IconBan />
                        </button>
                        <button className="btn-icon delete" title="Delete" onClick={() => openDelete(customer.id)}><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={total} pageSize={PAGE_SIZE} onPage={setPage} label="customers" />
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? "Edit Customer" : "Add Customer"}
        onClose={closeCustomerModal}
        size="lg"
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isSaving} onClick={closeCustomerModal}><IconClose /> Cancel</button>
            <button className="btn-save-modal" disabled={isSaving} onClick={() => customerFormik.handleSubmit()}><IconCheck /> {isSaving ? "Saving…" : "Save"}</button>
          </>
        )}
      >
        <div className="form-row">
          <TextInput
            variant="secondary"
            value={customerFormik.values.company}
            onChange={(value) => customerFormik.setFieldValue("company", value)}
            isRequired
            label="Company"
            errorText={customerFormik.touched.company ? customerFormik.errors.company : undefined}
          />
          <TextInput
            variant="secondary"
            value={customerFormik.values.contact}
            onChange={(value) => customerFormik.setFieldValue("contact", value)}
            isRequired
            label="Contact Name"
            errorText={customerFormik.touched.contact ? customerFormik.errors.contact : undefined}
          />
        </div>
        <TextInput
          variant="secondary"
          value={customerFormik.values.email}
          onChange={(value) => customerFormik.setFieldValue("email", value)}
          inputType="email"
          isRequired
          label="Email"
          errorText={customerFormik.touched.email ? customerFormik.errors.email : undefined}
        />
        <div className="form-row">
          <div className="form-group">
            <label>Plan <span style={{ color: "var(--red)" }}>*</span></label>
            <select
              value={customerFormik.values.planId}
              onChange={(event) => customerFormik.setFieldValue("planId", event.target.value)}
              style={{ borderColor: customerFormik.touched.planId && customerFormik.errors.planId ? "var(--red)" : undefined }}
            >
              {planOptions.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
            {customerFormik.touched.planId && customerFormik.errors.planId && (
              <span style={{ color: "var(--red)", fontSize: 12 }}>{customerFormik.errors.planId}</span>
            )}
          </div>
          <div className="form-group">
            <label>Status <span style={{ color: "var(--red)" }}>*</span></label>
            <select
              value={customerFormik.values.status}
              onChange={(event) => customerFormik.setFieldValue("status", event.target.value)}
              style={{ borderColor: customerFormik.touched.status && customerFormik.errors.status ? "var(--red)" : undefined }}
            >
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            {customerFormik.touched.status && customerFormik.errors.status && (
              <span style={{ color: "var(--red)", fontSize: 12 }}>{customerFormik.errors.status}</span>
            )}
          </div>
        </div>
        <div className="form-row">
          <TextInput
            variant="secondary"
            value={customerFormik.values.mrr}
            onChange={(value) => customerFormik.setFieldValue("mrr", value)}
            isNumeric
            isRequired
            label="MRR (IDR)"
            errorText={customerFormik.touched.mrr ? customerFormik.errors.mrr : undefined}
          />
          <TextInput
            variant="secondary"
            value={customerFormik.values.users}
            onChange={(value) => customerFormik.setFieldValue("users", value)}
            isNumeric
            isRequired
            label="Users"
            errorText={customerFormik.touched.users ? customerFormik.errors.users : undefined}
          />
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete Customer"
        onClose={() => { if (!isDeleting) setDeleteOpen(false); }}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isDeleting} onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn-del-ok" disabled={isDeleting} onClick={confirmDelete}>{isDeleting ? "Deleting…" : "Delete"}</button>
          </>
        )}
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{deleteTarget?.company}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>

      <Modal
        open={!!usersModalId}
        title={usersCustomer ? `Users — ${usersCustomer.company}` : "Users"}
        onClose={closeUsers}
        size="lg"
        footer={<button className="btn-cancel-modal" onClick={closeUsers}><IconClose /> Close</button>}
      >
        <div className="form-row">
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={subForm.name} onChange={(event) => setSubForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={subForm.email} onChange={(event) => setSubForm((current) => ({ ...current, email: event.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Role</label>
            <select value={subForm.role} onChange={(event) => setSubForm((current) => ({ ...current, role: event.target.value }))}>
              {SUB_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={subForm.status} onChange={(event) => setSubForm((current) => ({ ...current, status: event.target.value }))}>
              {SUB_STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 18 }}>
          {editingSubId && (
            <button className="btn-cancel-modal" onClick={() => { setEditingSubId(null); setSubForm(emptySubForm()); }}>Cancel Edit</button>
          )}
          <button className="btn-save-modal" onClick={saveSubUser}><IconCheck /> {editingSubId ? "Update User" : "Add User"}</button>
        </div>

        <div className="sa-mini-list">
          {!subUsers.length ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24, fontSize: 13 }}>No sub users yet.</div>
          ) : subUsers.map((user) => (
            <div className="sa-mini-item" key={user.id}>
              <div>
                <div className="sa-mini-name">{user.name}</div>
                <div className="sa-mini-sub">{user.email} · {user.role}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className={`badge badge-${user.status === "active" ? "green" : "gray"}`}>{user.status}</span>
                <button className="btn-icon edit" title="Edit" onClick={() => editSubUser(user)}><IconEdit /></button>
                <button className="btn-icon delete" title="Remove" onClick={() => removeSubUser(user.id)}><IconDelete /></button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
