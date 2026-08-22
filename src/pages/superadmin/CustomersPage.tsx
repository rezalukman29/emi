// TypeScript page component.
import { useEffect, useState, useMemo } from 'react';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SortTh from '../../components/SortTh';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose, IconCheck, IconBan, IconEye } from '../../components/icons';
import type { Customer } from '../../data/customers';
import { initialCustomerUsers, type CustomerUser } from '../../data/customerUsers';
import useGetAdminUserPlan from '../../hooks/api/useGetAdminUserPlan';
import { formatIDR, customerStatusBadge } from '../../lib/superAdminUtils';

const cols: (keyof Customer)[] = ['company', 'contact', 'plan', 'status', 'mrr', 'users', 'joinedAt'];
const PAGE_SIZE = 8;
const PLANS = ['Starter', 'Pro', 'Business', 'Enterprise'];
const STATUSES = ['active', 'trial', 'suspended', 'cancelled'];
const SUB_ROLES = ['Owner', 'Admin', 'Staff', 'Viewer'];
const SUB_STATUSES = ['active', 'inactive'];

function emptyForm() {
  return { company: '', contact: '', email: '', plan: 'Starter', status: 'trial', mrr: 0, users: 1 };
}

function emptySubForm() {
  return { name: '', email: '', role: 'Staff', status: 'active' };
}

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [nextId, setNextId] = useState(1);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortCol, setSortCol] = useState(0);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  const [customerUsers, setCustomerUsers] = useState(initialCustomerUsers);
  const [nextSubUserId, setNextSubUserId] = useState(2000);
  const [usersModalId, setUsersModalId] = useState<number | null>(null);
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [subForm, setSubForm] = useState(emptySubForm());

  const {
    data: userPlansResponse,
    isLoading: isCustomersLoading,
    isError: isCustomersError,
  } = useGetAdminUserPlan();

  useEffect(() => {
    if (!userPlansResponse?.data) return;
    const mappedCustomers: Customer[] = userPlansResponse.data.map((item) => ({
      id: item.user_emi_id,
      company: '-',
      contact: '-',
      email: item.email,
      plan: item.plan_name,
      status: item.status,
      mrr: item.price,
      users: 0,
      joinedAt: formatDate(item.started_at),
      nextBilling: formatDate(item.expires_at),
    }));
    setCustomers(mappedCustomers);
    setNextId(Math.max(0, ...mappedCustomers.map((customer) => customer.id)) + 1);
  }, [userPlansResponse?.data]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let data = customers.filter(c =>
      (!q || c.company.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) &&
      (!statusFilter || c.status === statusFilter)
    );
    const key = cols[sortCol] || 'company';
    data.sort((a, b) => {
      const va = a[key], vb = b[key];
      if (typeof va === 'number') return sortAsc ? va - Number(vb) : Number(vb) - va;
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return data;
  }, [customers, query, statusFilter, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSort(col: number) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(id: number) {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    setEditingId(id);
    setForm({ company: c.company, contact: c.contact, email: c.email, plan: c.plan, status: c.status, mrr: c.mrr, users: c.users });
    setModalOpen(true);
  }

  function saveRow() {
    if (!form.company.trim() || !form.contact.trim() || !form.email.trim()) return;
    if (editingId) {
      setCustomers(cs => cs.map(c => c.id === editingId
        ? { ...c, ...form, company: form.company.trim(), contact: form.contact.trim(), email: form.email.trim(), mrr: Number(form.mrr), users: Number(form.users) }
        : c
      ));
    } else {
      const joinedAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      setCustomers(cs => [...cs, {
        id: nextId, ...form,
        company: form.company.trim(), contact: form.contact.trim(), email: form.email.trim(),
        mrr: Number(form.mrr), users: Number(form.users), joinedAt, nextBilling: '-',
      }]);
      setNextId(n => n + 1);
    }
    setModalOpen(false);
  }

  function toggleSuspend(id: number) {
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, status: c.status === 'suspended' ? 'active' : 'suspended' } : c));
  }

  function openDelete(id: number) { setDeletingId(id); setDeleteOpen(true); }
  function confirmDelete() { setCustomers(cs => cs.filter(c => c.id !== deletingId)); setDeleteOpen(false); }

  function openUsers(id: number) {
    setUsersModalId(id);
    setEditingSubId(null);
    setSubForm(emptySubForm());
  }
  function closeUsers() { setUsersModalId(null); }

  function saveSubUser() {
    if (!subForm.name.trim() || !subForm.email.trim()) return;
    if (usersModalId === null) return;
    const customerId = usersModalId;
    setCustomerUsers(prev => {
      const list = prev[customerId] || [];
      if (editingSubId) {
        return { ...prev, [customerId]: list.map(u => u.id === editingSubId
          ? { ...u, ...subForm, name: subForm.name.trim(), email: subForm.email.trim() }
          : u
        ) };
      }
      return { ...prev, [customerId]: [...list, { id: nextSubUserId, ...subForm, name: subForm.name.trim(), email: subForm.email.trim() }] };
    });
    if (!editingSubId) setNextSubUserId(n => n + 1);
    setEditingSubId(null);
    setSubForm(emptySubForm());
  }

  function editSubUser(u: CustomerUser) {
    setEditingSubId(u.id);
    setSubForm({ name: u.name, email: u.email, role: u.role, status: u.status });
  }

  function removeSubUser(id: number) {
    if (usersModalId === null) return;
    setCustomerUsers(prev => ({ ...prev, [usersModalId]: (prev[usersModalId] || []).filter(u => u.id !== id) }));
    if (editingSubId === id) { setEditingSubId(null); setSubForm(emptySubForm()); }
  }

  const delTarget = customers.find(c => c.id === deletingId);
  const usersCustomer = customers.find(c => c.id === usersModalId);
  const subUsers = usersModalId === null ? [] : customerUsers[usersModalId] || [];
  const totalMrr = useMemo(() => customers.filter(c => c.status === 'active').reduce((s, c) => s + c.mrr, 0), [customers]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Customers</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Customer</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Total Customers', value: customers.length, color: 'var(--brand)', bg: 'var(--brand-bg)' },
          { label: 'Active',          value: customers.filter(c => c.status === 'active').length, color: 'var(--green)', bg: 'var(--green-bg)' },
          { label: 'Trial',           value: customers.filter(c => c.status === 'trial').length, color: 'var(--orange)', bg: 'var(--orange-bg)' },
          { label: 'Active MRR',      value: formatIDR(totalMrr), color: 'var(--purple)', bg: 'var(--purple-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span className="stat-value" style={{ color: s.color, fontSize: typeof s.value === 'string' ? 14 : 20 }}>{s.value}</span>
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
                className="search-input" type="text" placeholder="Search company, contact, email…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="wi-select-wrap">
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
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
                <SortTh label="Plan"    colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 100 }} />
                <SortTh label="Status"  colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 100 }} />
                <SortTh label="MRR"     colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 120 }} />
                <SortTh label="Users"   colIndex={5} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 70 }} />
                <SortTh label="Joined"  colIndex={6} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 110 }} />
                <th style={{ width: 120, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isCustomersLoading
                ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Loading customers…</td></tr>
                : isCustomersError
                  ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--red)', padding: 32 }}>Unable to load customers.</td></tr>
                  : pageData.length === 0
                ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No customers found.</td></tr>
                : pageData.map(c => (
                  <tr key={c.id}>
                    <td className="name-cell">{c.company}</td>
                    <td>{c.contact}<div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{c.email}</div></td>
                    <td>{c.plan}</td>
                    <td><span className={`badge badge-${customerStatusBadge(c.status)}`}>{c.status}</span></td>
                    <td>{formatIDR(c.mrr)}</td>
                    <td>{c.users}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{c.joinedAt}</td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: 'center' }}>
                        <button className="btn-icon" title="Manage Users" style={{ color: 'var(--brand)' }} onClick={() => openUsers(c.id)}><IconEye /></button>
                        <button className="btn-icon edit" title="Edit" onClick={() => openEdit(c.id)}><IconEdit /></button>
                        <button
                          className="btn-icon" title={c.status === 'suspended' ? 'Activate' : 'Suspend'}
                          style={{ color: c.status === 'suspended' ? 'var(--green)' : 'var(--orange)' }}
                          onClick={() => toggleSuspend(c.id)}
                        ><IconBan /></button>
                        <button className="btn-icon delete" title="Delete" onClick={() => openDelete(c.id)}><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={(p: number) => setPage(p)} label="customers" />
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Customer' : 'Add Customer'}
        onClose={() => setModalOpen(false)}
        size="lg"
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setModalOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={saveRow}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Company <span style={{ color: 'var(--red)' }}>*</span></label>
            <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Contact Name <span style={{ color: 'var(--red)' }}>*</span></label>
            <input type="text" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label>Email <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Plan</label>
            <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>MRR (IDR)</label>
            <input type="number" value={form.mrr} onChange={e => setForm(f => ({ ...f, mrr: Number(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label>Users</label>
            <input type="number" value={form.users} onChange={e => setForm(f => ({ ...f, users: Number(e.target.value) }))} />
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete Customer"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn-del-ok" onClick={confirmDelete}>Delete</button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{delTarget?.company}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>

      <Modal
        open={!!usersModalId}
        title={usersCustomer ? `Users — ${usersCustomer.company}` : 'Users'}
        onClose={closeUsers}
        size="lg"
        footer={<button className="btn-cancel-modal" onClick={closeUsers}><IconClose /> Close</button>}
      >
        <div className="form-row">
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={subForm.name} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={subForm.email} onChange={e => setSubForm(f => ({ ...f, email: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Role</label>
            <select value={subForm.role} onChange={e => setSubForm(f => ({ ...f, role: e.target.value }))}>
              {SUB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={subForm.status} onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))}>
              {SUB_STATUSES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 18 }}>
          {editingSubId && (
            <button className="btn-cancel-modal" onClick={() => { setEditingSubId(null); setSubForm(emptySubForm()); }}>Cancel Edit</button>
          )}
          <button className="btn-save-modal" onClick={saveSubUser}><IconCheck /> {editingSubId ? 'Update User' : 'Add User'}</button>
        </div>

        <div className="sa-mini-list">
          {subUsers.length === 0
            ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>No sub users yet.</div>
            : subUsers.map(u => (
              <div className="sa-mini-item" key={u.id}>
                <div>
                  <div className="sa-mini-name">{u.name}</div>
                  <div className="sa-mini-sub">{u.email} · {u.role}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={`badge badge-${u.status === 'active' ? 'green' : 'gray'}`}>{u.status}</span>
                  <button className="btn-icon edit" title="Edit" onClick={() => editSubUser(u)}><IconEdit /></button>
                  <button className="btn-icon delete" title="Remove" onClick={() => removeSubUser(u.id)}><IconDelete /></button>
                </div>
              </div>
            ))
          }
        </div>
      </Modal>
    </>
  );
}
