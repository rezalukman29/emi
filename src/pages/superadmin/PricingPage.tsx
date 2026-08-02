// TypeScript page component.
import { useState } from 'react';
import Modal from '../../components/Modal';
import { IconPlus, IconEdit, IconDelete, IconClose, IconCheck } from '../../components/icons';
import { initialPricingPlans } from '../../data/pricingPlans';
import { formatIDR } from '../../lib/superAdminUtils';

function emptyForm() {
  return { name: '', price: 0, cycle: 'month', description: '', features: '', customerCount: 0 };
}

export default function PricingPage() {
  const [plans, setPlans] = useState(initialPricingPlans);
  const [nextId, setNextId] = useState(initialPricingPlans.length + 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(id: number) {
    const p = plans.find(x => x.id === id);
    if (!p) return;
    setEditingId(id);
    setForm({ name: p.name, price: p.price, cycle: p.cycle, description: p.description, features: p.features.join('\n'), customerCount: p.customerCount });
    setModalOpen(true);
  }

  function saveRow() {
    if (!form.name.trim()) return;
    const features = form.features.split('\n').map(f => f.trim()).filter(Boolean);
    if (editingId) {
      setPlans(ps => ps.map(p => p.id === editingId
        ? { ...p, name: form.name.trim(), price: Number(form.price), cycle: form.cycle, description: form.description.trim(), features, customerCount: Number(form.customerCount) }
        : p
      ));
    } else {
      setPlans(ps => [...ps, {
        id: nextId, name: form.name.trim(), price: Number(form.price), cycle: form.cycle,
        description: form.description.trim(), features, customerCount: Number(form.customerCount) || 0, highlighted: false,
      }]);
      setNextId(n => n + 1);
    }
    setModalOpen(false);
  }

  function openDelete(id: number) { setDeletingId(id); setDeleteOpen(true); }
  function confirmDelete() { setPlans(ps => ps.filter(p => p.id !== deletingId)); setDeleteOpen(false); }

  const delTarget = plans.find(p => p.id === deletingId);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Pricing Plans</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Plan</button>
      </div>

      <div className="sa-plan-grid">
        {plans.map(p => (
          <div key={p.id} className={`sa-plan-card${p.highlighted ? ' highlighted' : ''}`}>
            {p.highlighted && <div className="sa-plan-tag">Most Popular</div>}
            <div className="sa-plan-name">{p.name}</div>
            <div className="sa-plan-price">
              {p.price > 0 ? formatIDR(p.price) : 'Custom'}
              {p.price > 0 && <span>/{p.cycle}</span>}
            </div>
            <p className="sa-plan-desc">{p.description}</p>
            <ul className="sa-plan-features">
              {p.features.map((f, i) => <li key={i}><IconCheck /> {f}</li>)}
            </ul>
            <div className="sa-plan-footer">
              <span className="sa-plan-customers">{p.customerCount} customers</span>
              <div className="action-btns">
                <button className="btn-icon edit" title="Edit" onClick={() => openEdit(p.id)}><IconEdit /></button>
                <button className="btn-icon delete" title="Delete" onClick={() => openDelete(p.id)}><IconDelete /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Pricing Plan' : 'Add Pricing Plan'}
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
            <label>Plan Name <span style={{ color: 'var(--red)' }}>*</span></label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Billing Cycle</label>
            <select value={form.cycle} onChange={e => setForm(f => ({ ...f, cycle: e.target.value }))}>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Price (IDR, 0 = custom)</label>
          <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Features (one per line)</label>
          <textarea style={{ minHeight: 100 }} value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete Plan"
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
