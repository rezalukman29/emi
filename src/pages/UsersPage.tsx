import { useState, useMemo } from 'react';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose, IconCheck, IconBan } from '../components/icons';
import { initialUsers } from '../data/users';

const PAGE_SIZE = 8;
const ROLES = ['Admin', 'Staff', 'Viewer'];
type UserRole = 'Admin' | 'Staff' | 'Viewer';
type UserStatus = 'active' | 'inactive';
interface UserForm { name: string; email: string; role: UserRole; status: UserStatus }

function roleBadgeClass(role: string) {
  if (role === 'Admin') return 'badge-purple';
  if (role === 'Staff') return 'badge-blue';
  return 'badge-gray';
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function Avatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-bg)', color: 'var(--brand)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

function emptyForm(): UserForm {
  return { name: '', email: '', role: 'Staff', status: 'active' };
}

export default function UsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [nextId, setNextId] = useState(initialUsers.length + 1);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(u =>
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (!roleFilter || u.role === roleFilter)
    );
  }, [users, query, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeCount = users.filter(u => u.status === 'active').length;
  const adminCount = users.filter(u => u.role === 'Admin').length;

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(id: number) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    setEditingId(id);
    setForm({ name: u.name, email: u.email, role: u.role as UserRole, status: u.status as UserStatus });
    setModalOpen(true);
  }

  function saveRow() {
    if (!form.name.trim() || !form.email.trim()) return;
    if (editingId) {
      setUsers(us => us.map(u => u.id === editingId
        ? { ...u, name: form.name.trim(), email: form.email.trim(), role: form.role, status: form.status }
        : u
      ));
    } else {
      setUsers(us => [...us, {
        id: nextId, name: form.name.trim(), email: form.email.trim(), role: form.role, status: form.status,
        lastActive: '-',
      }]);
      setNextId(n => n + 1);
    }
    setModalOpen(false);
  }

  function toggleStatus(id: number) {
    setUsers(us => us.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
  }

  function openDelete(id: number) { setDeletingId(id); setDeleteOpen(true); }
  function confirmDelete() { setUsers(us => us.filter(u => u.id !== deletingId)); setDeleteOpen(false); }

  const delTarget = users.find(u => u.id === deletingId);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Users</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New User</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'Total Users', value: users.length,  color: 'var(--brand)',  bg: 'var(--brand-bg)' },
          { label: 'Active',      value: activeCount,   color: 'var(--green)',  bg: 'var(--green-bg)' },
          { label: 'Admin',       value: adminCount,    color: 'var(--purple)', bg: 'var(--purple-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
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
                className="search-input" type="text" placeholder="Cari nama atau email…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="wi-select-wrap">
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
                <option value="">Semua Role</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
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
                <th>Nama</th>
                <th style={{ width: 110 }}>Role</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 140 }}>Terakhir Aktif</th>
                <th style={{ width: 120, textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Tidak ada user ditemukan.</td></tr>
                : pageData.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={u.name} />
                        <div>
                          <div className="name-cell" style={{ fontWeight: 600 }}>{u.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${roleBadgeClass(u.role)}`}>{u.role}</span></td>
                    <td><span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{u.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{u.lastActive}</td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: 'center' }}>
                        <button className="btn-icon edit" title="Edit" onClick={() => openEdit(u.id)}><IconEdit /></button>
                        <button
                          className="btn-icon" title={u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                          style={{ color: u.status === 'active' ? 'var(--orange)' : 'var(--green)' }}
                          onClick={() => toggleStatus(u.id)}
                        ><IconBan /></button>
                        <button className="btn-icon delete" title="Delete" onClick={() => openDelete(u.id)}><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={(p: number) => setPage(p)} label="users" />
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit User' : 'Add User'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setModalOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={saveRow}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="form-group">
          <label>Nama <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Email <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as UserStatus }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete User"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn-del-ok" onClick={confirmDelete}>Delete</button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{delTarget?.name}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
