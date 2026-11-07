import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';

import useGetItemCategory from '../hooks/api/useGetItemCategory';
import useGetUnit from '../hooks/api/useGetUnit';
import { createLoanVendor, getLoanVendors, type LoanVendorItem, type LoanVendorType } from '../hooks/api/useLoanVendors';
import { createOutsourceVendor, getOutsourceVendors, type OutsourceVendor, type OutsourceVendorType } from '../hooks/api/useOutsource';
import { createVendor, getVendors, type VendorItem, type VendorOrigin } from '../hooks/api/useVendors';
import { InventoryService } from '../service/InventoryService';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import TextInput from './TextInput';

type CatalogApiUnit = {
  id?: number;
  name?: string;
  description?: string;
};

type CatalogApiItem = {
  id: number;
  nama: string;
  code?: string;
  satuan?: string | CatalogApiUnit | null;
  satuan_id?: number;
  kategori?: string;
};

type CatalogItem = Omit<CatalogApiItem, 'satuan'> & { satuan?: string };

function catalogUnitName(unit: CatalogApiItem['satuan']) {
  if (typeof unit === 'string') return unit;
  return unit?.name || unit?.description || '';
}

function apiError(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error as Error)?.message || fallback;
}

export function CatalogItemPicker({ value, onChange, placeholder }: {
  value: string;
  onChange: (name: string, item?: CatalogItem) => void;
  placeholder?: string;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createName, setCreateName] = useState<string | null>(null);
  const [createdItems, setCreatedItems] = useState<CatalogItem[]>([]);
  const [draft, setDraft] = useState({ name: '', code: '', categoryId: '', unitId: '' });
  const [saving, setSaving] = useState(false);
  const categoryQuery = useGetItemCategory({ options: { enabled: createName !== null } });
  const unitQuery = useGetUnit({ options: { enabled: createName !== null } });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const catalogQuery = useQuery(['quick-request-catalog', debouncedSearch], () => InventoryService.getInventory({
    page: 1, limit: 100, sort: 'ASC', sortBy: 'name', search: debouncedSearch || undefined,
  }));
  const catalogItems: CatalogItem[] = ((catalogQuery.data?.data?.data ?? []) as CatalogApiItem[]).map(item => ({
    ...item,
    satuan: catalogUnitName(item.satuan),
  }));
  const items = [
    ...createdItems,
    ...catalogItems.filter(item => !createdItems.some(createdItem =>
      (createdItem.id > 0 && createdItem.id === item.id) || createdItem.nama === item.nama
    )),
  ];
  const categories: Array<{ id: number; name: string }> = categoryQuery.data?.data?.data ?? categoryQuery.data?.data ?? [];
  const units: Array<{ id: number; name: string }> = unitQuery.data?.data ?? [];

  function openCreate() {
    setCreateName('');
    setDraft({ name: '', code: '', categoryId: '', unitId: '' });
  }

  async function saveNewItem() {
    if (!draft.name.trim() || !draft.code.trim() || !draft.categoryId || !draft.unitId || saving) return;
    setSaving(true);
    try {
      const response = await InventoryService.addBarang({
        nama: draft.name.trim(), code: draft.code.trim(), kategori_id: Number(draft.categoryId), satuan_id: Number(draft.unitId),
        stok: 0, detail: '', panjang: '', lebar: '', tinggi: '', berat: '', lantai: '', lorong: '', rack: '', photo: '',
      });
      if (response.success === false) throw new Error(response.message || 'Failed to create item.');
      const responseData = response.data?.data ?? response.data;
      let item: CatalogItem = {
        id: Number(responseData?.id || responseData?.barang_id || 0),
        nama: responseData?.nama || draft.name.trim(),
        code: responseData?.code || draft.code.trim(),
        satuan_id: Number(responseData?.satuan_id || draft.unitId),
        satuan: catalogUnitName(responseData?.satuan) || units.find(unit => unit.id === Number(draft.unitId))?.name,
      };

      // Some create responses only contain a success message. Reload the exact item
      // so the parent request form still receives a valid barang ID immediately.
      if (!item.id) {
        const refreshed = await InventoryService.getInventory({
          page: 1, limit: 100, sort: 'ASC', sortBy: 'name', search: draft.name.trim(),
        });
        const match = ((refreshed.data?.data ?? []) as CatalogApiItem[]).find(row =>
          row.nama.trim().toLowerCase() === draft.name.trim().toLowerCase()
        );
        if (match) item = { ...match, satuan: catalogUnitName(match.satuan) };
      }

      if (!item.id) throw new Error('Item was created, but could not be selected. Please reopen the item list.');
      setCreatedItems(current => [item, ...current.filter(row => row.id !== item.id && row.nama !== item.nama)]);
      onChange(item.nama, item);
      setCreateName(null);
      await queryClient.invalidateQueries('quick-request-catalog');
      toast.success(response.message || 'Item added to Inventory.');
    } catch (error) {
      toast.error(apiError(error, 'Item could not be added.'));
    } finally { setSaving(false); }
  }

  return <>
    <SearchableSelect
      value={value}
      onChange={name => { const item = items.find(row => row.nama === String(name)); onChange(String(name), item); }}
      onSearchChange={setSearch}
      options={items.map(item => ({ value: item.nama, label: item.nama, meta: [item.code, item.satuan].filter(Boolean).join(' · ') }))}
      placeholder={placeholder || 'Search Inventory master data'}
      emptyText="Item not found in Inventory."
      onCreate={openCreate}
      createLabel={query => query ? `Add “${query}” as new item` : 'Add new item'}
    />
    {createName !== null && <Modal open title="New Item (Inventory)" onClose={() => !saving && setCreateName(null)} footer={<>
      <button className="btn-cancel-modal" disabled={saving} onClick={() => setCreateName(null)}>Cancel</button>
      <button className="btn-save-modal" disabled={saving || !draft.name.trim() || !draft.code.trim() || !draft.categoryId || !draft.unitId} onClick={() => void saveNewItem()}>Save item</button>
    </>}>
      <p className="field-hint">This item is saved directly to Inventory with zero initial stock.</p>
      <TextInput label="Name" value={draft.name} isRequired onChange={name => setDraft(current => ({ ...current, name }))} />
      <TextInput label="SKU / Code" value={draft.code} isRequired onChange={code => setDraft(current => ({ ...current, code }))} />
      <div className="form-row">
        <div className="form-group"><label>Category *</label><SearchableSelect value={draft.categoryId} onChange={categoryId => setDraft(current => ({ ...current, categoryId: String(categoryId) }))} options={categories.map(row => ({ value: row.id, label: row.name }))} /></div>
        <div className="form-group"><label>Unit *</label><SearchableSelect value={draft.unitId} onChange={unitId => setDraft(current => ({ ...current, unitId: String(unitId) }))} options={units.map(row => ({ value: row.id, label: row.name }))} /></div>
      </div>
    </Modal>}
  </>;
}

export function QuickVendorPicker({ kind, origin, value, onChange, placeholder }: {
  kind: 'production' | 'loan' | 'outsource';
  origin?: VendorOrigin;
  value: string | number;
  onChange: (id: number, name: string) => void;
  placeholder?: string;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createName, setCreateName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: '', category: '', contact: '', description: '', address: '' });
  const productionQuery = useQuery(['quick-request-vendors', 'production', origin, search], () => getVendors({ page: 1, limit: 100, origin, search: search || undefined }), { enabled: kind === 'production' });
  const loanQuery = useQuery(['quick-request-vendors', 'loan', origin, search], () => getLoanVendors({ page: 1, limit: 100, type: origin as LoanVendorType | undefined, search: search || undefined }), { enabled: kind === 'loan' });
  const outsourceQuery = useQuery(['quick-request-vendors', 'outsource', origin, search], () => getOutsourceVendors({ page: 1, limit: 100, type: origin as OutsourceVendorType | undefined, search: search || undefined }), { enabled: kind === 'outsource' });
  const vendors: Array<VendorItem | LoanVendorItem | OutsourceVendor> = useMemo(
    () => kind === 'production' ? productionQuery.data?.data?.items ?? [] : kind === 'loan' ? loanQuery.data?.data?.items ?? [] : outsourceQuery.data?.data?.items ?? [],
    [kind, loanQuery.data, outsourceQuery.data, productionQuery.data],
  );

  function openCreate(name: string) {
    setCreateName(name || search.trim());
    setDraft({ name: name || search.trim(), category: '', contact: '', description: '', address: '' });
  }

  async function saveVendor() {
    if (!draft.name.trim() || saving) return;
    setSaving(true);
    try {
      const response = kind === 'production'
        ? await createVendor({ name: draft.name.trim(), origin: origin || 'Internal', category: draft.category.trim(), contact: draft.contact.trim() })
        : kind === 'loan'
          ? await createLoanVendor({ name: draft.name.trim(), type: (origin || 'External') as LoanVendorType, description: draft.description.trim(), phone: draft.contact.trim(), address: draft.address.trim(), is_loan: true, is_production: false })
          : await createOutsourceVendor({ name: draft.name.trim(), type: (origin || 'External') as OutsourceVendorType, description: draft.description.trim(), phone: draft.contact.trim(), address: draft.address.trim() });
      const created = response.data;
      onChange(created.id, created.name);
      setCreateName(null);
      await queryClient.invalidateQueries('quick-request-vendors');
      await queryClient.invalidateQueries(kind === 'production' ? 'useGetVendors' : kind === 'loan' ? 'useGetLoanVendors' : 'useGetOutsourceVendors');
      toast.success(response.message || 'Vendor added.');
    } catch (error) { toast.error(apiError(error, 'Vendor could not be added.')); }
    finally { setSaving(false); }
  }

  return <>
    <SearchableSelect
      value={value}
      onChange={id => { const vendor = vendors.find(row => row.id === Number(id)); onChange(Number(id), vendor?.name || ''); }}
      onSearchChange={setSearch}
      options={vendors.map(vendor => ({ value: vendor.id, label: vendor.name, meta: 'contact' in vendor ? vendor.contact : vendor.phone }))}
      placeholder={placeholder || 'Select vendor'}
      onCreate={openCreate}
      createLabel={text => text ? `Add “${text}” as new vendor` : 'Add new vendor'}
    />
    {createName !== null && <Modal open title={kind === 'production' ? 'New Production Vendor' : kind === 'loan' ? 'New Rent Vendor' : 'New Outsource Vendor'} onClose={() => !saving && setCreateName(null)} footer={<>
      <button className="btn-cancel-modal" disabled={saving} onClick={() => setCreateName(null)}>Cancel</button>
      <button className="btn-save-modal" disabled={saving || !draft.name.trim()} onClick={() => void saveVendor()}>Save vendor</button>
    </>}>
      <TextInput label="Name" value={draft.name} isRequired onChange={name => setDraft(current => ({ ...current, name }))} />
      {kind === 'production' ? <TextInput label="Category" value={draft.category} onChange={category => setDraft(current => ({ ...current, category }))} /> : <TextInput label="Description" value={draft.description} onChange={description => setDraft(current => ({ ...current, description }))} />}
      <TextInput label="Contact" value={draft.contact} onChange={contact => setDraft(current => ({ ...current, contact }))} />
      {kind !== 'production' && <TextInput label="Address" value={draft.address} onChange={address => setDraft(current => ({ ...current, address }))} />}
    </Modal>}
  </>;
}
