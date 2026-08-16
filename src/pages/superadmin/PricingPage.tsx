import { useState } from 'react';
import Modal from '../../components/Modal';
import { IconPlus, IconEdit, IconDelete, IconClose, IconCheck } from '../../components/icons';
import { initialPricingPlans } from '../../data/pricingPlans';
import type { PricingPlan } from '../../data/pricingPlans';
import { MODULE_CATALOG, STORAGE_TIERS, BASE_PLATFORM_FEE, AI_FEATURE_FEE } from '../../data/pricingCatalog';
import { computePlanPrice, planFeatureList } from '../../lib/pricingCalc';
import { formatIDR } from '../../lib/superAdminUtils';

type PricingForm = Omit<PricingPlan, 'id' | 'highlighted'>;

function emptyForm(): PricingForm {
  return { name: '', cycle: 'month', description: '', modules: [], aiFeature: false, storageGb: STORAGE_TIERS[0].gb, customerCount: 0 };
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
    setForm({ name: p.name, cycle: p.cycle, description: p.description, modules: [...p.modules], aiFeature: p.aiFeature, storageGb: p.storageGb, customerCount: p.customerCount });
    setModalOpen(true);
  }

  function toggleModule(key: string) {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(key) ? f.modules.filter(m => m !== key) : [...f.modules, key],
    }));
  }

  function saveRow() {
    if (!form.name.trim()) return;
    if (editingId) {
      setPlans(ps => ps.map(p => p.id === editingId
        ? { ...p, name: form.name.trim(), cycle: form.cycle, description: form.description.trim(), modules: form.modules, aiFeature: form.aiFeature, storageGb: Number(form.storageGb), customerCount: Number(form.customerCount) }
        : p
      ));
    } else {
      setPlans(ps => [...ps, {
        id: nextId, name: form.name.trim(), cycle: form.cycle, description: form.description.trim(),
        modules: form.modules, aiFeature: form.aiFeature, storageGb: Number(form.storageGb),
        customerCount: Number(form.customerCount) || 0, highlighted: false,
      }]);
      setNextId(n => n + 1);
    }
    setModalOpen(false);
  }

  function openDelete(id: number) { setDeletingId(id); setDeleteOpen(true); }
  function confirmDelete() { setPlans(ps => ps.filter(p => p.id !== deletingId)); setDeleteOpen(false); }

  const delTarget = plans.find(p => p.id === deletingId);

  const formModulesTotal = form.modules.reduce((sum, key) => {
    const mod = MODULE_CATALOG.find(m => m.key === key);
    return sum + (mod ? mod.price : 0);
  }, 0);
  const formAiFee = form.aiFeature ? AI_FEATURE_FEE : 0;
  const formStorageFee = (STORAGE_TIERS.find(t => t.gb === Number(form.storageGb)) || STORAGE_TIERS[0]).price;
  const formTotal = BASE_PLATFORM_FEE + formModulesTotal + formAiFee + formStorageFee;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Pricing Plans</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Plan</button>
      </div>
      <p className="summary-text">Harga plan dihitung otomatis dari modul, AI feature, dan kapasitas storage yang dipilih.</p>

      <div className="sa-plan-grid">
        {plans.map(p => {
          const computed = computePlanPrice(p);
          const featureList = planFeatureList(p);
          return (
            <div key={p.id} className={`sa-plan-card${p.highlighted ? ' highlighted' : ''}`}>
              {p.highlighted && <div className="sa-plan-tag">Most Popular</div>}
              <div className="sa-plan-name">{p.name}</div>
              <div className="sa-plan-price">
                {p.cycle === 'custom' ? 'Custom' : formatIDR(computed)}
                {p.cycle !== 'custom' && <span>/{p.cycle}</span>}
              </div>
              <p className="sa-plan-desc">{p.description}</p>
              <ul className="sa-plan-features">
                {featureList.map((f, i) => <li key={i}><IconCheck /> {f}</li>)}
              </ul>
              <div className="sa-plan-footer">
                <span className="sa-plan-customers">{p.customerCount} customers</span>
                <div className="action-btns">
                  <button className="btn-icon edit" title="Edit" onClick={() => openEdit(p.id)}><IconEdit /></button>
                  <button className="btn-icon delete" title="Delete" onClick={() => openDelete(p.id)}><IconDelete /></button>
                </div>
              </div>
            </div>
          );
        })}
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
              <option value="custom">Custom (harga tidak ditampilkan)</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>

        <div className="form-group">
          <label>Modules</label>
          <div className="sa-module-grid">
            {MODULE_CATALOG.map(m => (
              <label key={m.key} className={`sa-module-item${form.modules.includes(m.key) ? ' checked' : ''}`}>
                <input type="checkbox" checked={form.modules.includes(m.key)} onChange={() => toggleModule(m.key)} />
                <span className="sa-module-label">{m.label}</span>
                <span className="sa-module-price">{formatIDR(m.price)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>AI Feature</label>
            <label className={`sa-module-item${form.aiFeature ? ' checked' : ''}`} style={{ marginTop: 0 }}>
              <input type="checkbox" checked={form.aiFeature} onChange={e => setForm(f => ({ ...f, aiFeature: e.target.checked }))} />
              <span className="sa-module-label">AI Analyzer Access</span>
              <span className="sa-module-price">{formatIDR(AI_FEATURE_FEE)}</span>
            </label>
          </div>
          <div className="form-group">
            <label>Storage Capacity</label>
            <select value={form.storageGb} onChange={e => setForm(f => ({ ...f, storageGb: Number(e.target.value) }))}>
              {STORAGE_TIERS.map(t => (
                <option key={t.gb} value={t.gb}>{t.gb} GB {t.price > 0 ? `(+${formatIDR(t.price)})` : '(included)'}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="sa-price-summary">
          <div className="sa-price-summary-row">
            <span>Base platform fee</span>
            <span>{formatIDR(BASE_PLATFORM_FEE)}</span>
          </div>
          <div className="sa-price-summary-row">
            <span>Modules ({form.modules.length})</span>
            <span>{formatIDR(formModulesTotal)}</span>
          </div>
          <div className="sa-price-summary-row">
            <span>AI Feature</span>
            <span>{formatIDR(formAiFee)}</span>
          </div>
          <div className="sa-price-summary-row">
            <span>Storage ({form.storageGb} GB)</span>
            <span>{formatIDR(formStorageFee)}</span>
          </div>
          <div className="sa-price-summary-row sa-price-summary-total">
            <span>Total per {form.cycle === 'custom' ? 'periode' : form.cycle}</span>
            <span>{form.cycle === 'custom' ? 'Custom' : formatIDR(formTotal)}</span>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label>Customer Count</label>
          <input type="number" min={0} value={form.customerCount} onChange={e => setForm(f => ({ ...f, customerCount: Number(e.target.value) }))} />
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
