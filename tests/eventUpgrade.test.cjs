const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, appended = '', dependencies = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8') + appended;
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports,
    require(name) {
      if (name in dependencies) return dependencies[name];
      if (name.endsWith('/lib/format')) return load('lib/format.ts');
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key }) };
      if (name === '../i18n') return { __esModule: true, default: { t: key => key } };
      if (name.endsWith('/icons')) return new Proxy({}, { get: () => () => React.createElement('svg') });
      return { default: () => null };
    },
  });
  return exports;
}

test('event status rows and features use authoritative backend booleans and code', () => {
  const featureModule = load('lib/eventStatusFeatures.ts');
  const { mapEventStatuses } = load('pages/EventStatusPage.tsx', '\nexport { mapEventStatuses };', {
    '../lib/eventStatusFeatures': featureModule,
  });
  const rows = mapEventStatuses({ data: { data: [
    { id: 1, name: 'Production', code: 'PRD', production_item: true, stock_return: false, cutting_stock: false, order_data: 1, is_show_scan_result: 1, action: 'SCAN_IN', updated_at: '2026-10-07' },
    { id: 2, name: 'Return', code: '', production_item: false, stock_return: true, cutting_stock: true, order_data: 2 },
  ] } });
  assert.equal(rows[0].productionItem, true);
  assert.equal(rows[0].stockReturn, false);
  assert.equal(rows[0].code, 'PRD');
  assert.equal(rows[0].updatedAt, '2026-10-07');
  assert.equal(rows[1].productionItem, false);
  assert.equal(rows[1].stockReturn, true);
  assert.equal(rows[0].cuttingStock, false);
  assert.equal(rows[1].cuttingStock, true);
  assert.equal(rows[1].code, '');
  assert.equal(featureModule.eventStatusFeatures({}).productionItem, false);
  const productionStatuses = [
    { order_data: 1, production_item: false },
    { order_data: 3, production_item: true },
    { order_data: 6, production_item: false },
  ];
  assert.equal(featureModule.hasReachedProductionStatus({ order_data: 2 }, productionStatuses), false);
  assert.equal(featureModule.hasReachedProductionStatus({ order_data: 3 }, productionStatuses), true);
  assert.equal(featureModule.hasReachedProductionStatus({ order_data: 8 }, productionStatuses), true);
  assert.equal(featureModule.hasReachedProductionStatus({ order_data: 8 }, []), false);

  const scanStatuses = [
    { order_data: 1, action: '' },
    { order_data: 3, action: 'SCAN_IN' },
    { order_data: 5, action: 'SCAN_OUT' },
  ];
  assert.equal(featureModule.canBorrowBeforeScanIn({ order_data: 1 }, scanStatuses), true);
  assert.equal(featureModule.canBorrowBeforeScanIn({ order_data: 2 }, scanStatuses), true);
  assert.equal(featureModule.canBorrowBeforeScanIn({ order_data: 3 }, scanStatuses), false);
  assert.equal(featureModule.canBorrowBeforeScanIn({ order_data: 4 }, scanStatuses), false);
  assert.equal(featureModule.canBorrowBeforeScanIn({ order_data: 1 }, []), false);
});

test('production request timestamps are displayed in Asia/Jakarta without a GMT suffix', () => {
  const { formatJakartaDateTime } = load('pages/EventDetailPage.tsx', '\nexport { formatJakartaDateTime };');
  assert.equal(formatJakartaDateTime('2026-10-16 07:01:56'), '2026-10-16 14:01:56');
  assert.equal(formatJakartaDateTime('2026-10-16T07:01:56Z'), '2026-10-16 14:01:56');
  assert.equal(formatJakartaDateTime(''), '');
});

test('create and update event status send code and boolean feature payloads, including false', async () => {
  const calls = [];
  const dependencies = {
    '../../service/axios': { __esModule: true, default: {
      post: async (url, payload) => { calls.push({ url, payload }); return { data: { success: true } }; },
      put: async (url, payload) => { calls.push({ url, payload }); return { data: { success: true } }; },
    } },
  };
  const { postEventStatus } = load('hooks/api/usePostEventStatus.ts', '', dependencies);
  const { putEventStatus } = load('hooks/api/usePutEventStatus.ts', '', dependencies);
  const payload = { name: 'Production', code: 'PRD', cutting_stock: false, production_item: true, is_show_scan_result: 1, action: 'SCAN_IN', order_data: 2 };
  await postEventStatus(payload);
  await putEventStatus({ ...payload, id: 7, code: '', cutting_stock: true, production_item: false });
  assert.equal(calls[0].url, '/v1/event-status/create');
  assert.equal(calls[0].payload.cutting_stock, false);
  assert.equal(calls[0].payload.production_item, true);
  assert.equal(calls[0].payload.code, 'PRD');
  assert.equal(calls[1].url, '/v1/event-status/update-scan');
  assert.equal(calls[1].payload.production_item, false);
  assert.equal(calls[1].payload.code, '');
  assert.equal(calls[1].payload.id, 7);
  assert.equal(calls[1].payload.cutting_stock, true);
  assert.equal('stock_return' in calls[0].payload, false);
  assert.equal('stock_return' in calls[1].payload, false);
});

test('modify event item uses v3 endpoint and preserves area, sub area, ownership, PIC, notes, and qty', async () => {
  const calls = [];
  const { putEventItem } = load('hooks/api/usePutEventItem.ts', '', {
    '../../service/axios': { __esModule: true, default: {
      put: async (url, payload) => { calls.push({ url, payload }); return { data: { success: true, message: 'updated' } }; },
    } },
  });
  const payload = { id: 432, list_id: 22, sub_list_id: 31, qty: 3, pic: 'Rendy', notes: 'Bagus', ownerships: { ihc: true, ihp: false, outsource: true } };
  const result = await putEventItem(payload);
  assert.equal(calls[0].url, '/v3/fix-list-item');
  assert.deepEqual(calls[0].payload, payload);
  assert.equal(result.message, 'updated');
});

test('get event items sends v3 production and conversion filters, including zero values', async () => {
  const calls = [];
  const { getEventItem } = load('hooks/api/useGetEventItem.ts', '', {
    '../../service/axios': { __esModule: true, default: {
      get: async (url, config) => { calls.push({ url, params: config.params }); return { data: { success: true, data: [] } }; },
    } },
  });
  await getEventItem({ params: { event_id: 88, list_id: 0, status_event_id: 0, search: 'chair', ownership: 'ihc,ihp', is_new_production_item: 1, isConverted: 0, order: 'asc' } });
  assert.equal(calls[0].url, '/v3/fix-list-item-event');
  assert.equal(JSON.stringify(calls[0].params), JSON.stringify({ event_id: 88, list_id: 0, status_event_id: 0, search: 'chair', ownership: 'ihc,ihp', is_new_production_item: 1, isConverted: 0, order: 'asc' }));
});

test('new and replacement production requests preserve vendor, origin, warehouse, and broken item fields', async () => {
  const calls = [];
  const { createProductionRequest } = load('hooks/api/useCreateProductionRequest.ts', '', {
    '../../service/axios': { __esModule: true, default: {
      post: async (url, payload) => { calls.push({ url, payload }); return { data: { success: true, message: 'created' } }; },
    } },
  });
  const payload = { event_id: 88, request_type: 'NEW_PRODUCTION', item_name: 'Custom Welcome Sign', qty: 2, area_id: 10, sub_area_id: 5, warehouse_id: 3, vendor_id: 7, origin: 'External', notes: 'Blue' };
  const response = await createProductionRequest(payload);
  const replacement = { ...payload, request_type: 'REPLACEMENT', item_name: 'Replacement Chair', barang_event_id: 597, fix_list_item_id: 597 };
  await createProductionRequest(replacement);
  assert.equal(calls[0].url, '/v1/event-production-request');
  assert.deepEqual(calls[0].payload, payload);
  assert.equal(calls[1].url, '/v1/event-production-request');
  assert.deepEqual(calls[1].payload, replacement);
  assert.equal(response.message, 'created');
});

test('restock production supports existing and new inventory item payloads without an event', async () => {
  const calls = [];
  const { createProductionRequest } = load('hooks/api/useCreateProductionRequest.ts', '', {
    '../../service/axios': { __esModule: true, default: {
      post: async (url, payload) => {
        calls.push({ url, payload });
        return { data: { success: true, message: 'created' } };
      },
    } },
  });

  await createProductionRequest({
    request_type: 'NEW_PRODUCTION',
    barang_id: 456,
    item_name: 'Existing Chair',
    name: 'Existing Chair',
    qty: 3,
    warehouse_id: 19,
    vendor_id: 7,
    origin: 'Internal',
  });
  await createProductionRequest({
    request_type: 'NEW_PRODUCTION',
    item_name: 'Brand New Chair',
    name: 'Brand New Chair',
    qty: 2,
    warehouse_id: 19,
    vendor_id: 4,
    origin: 'External',
  });

  assert.equal(calls[0].url, '/v1/event-production-request');
  assert.equal(calls[0].payload.barang_id, 456);
  assert.equal('event_id' in calls[0].payload, false);
  assert.equal(calls[1].payload.item_name, 'Brand New Chair');
  assert.equal(calls[1].payload.name, 'Brand New Chair');
  assert.equal('barang_id' in calls[1].payload, false);
  assert.equal('event_id' in calls[1].payload, false);
});

test('restock production actions use cancel and status transition endpoints', async () => {
  const calls = [];
  const {
    cancelProductionRequest,
    updateProductionRequestStatus,
  } = load('hooks/api/useProductionRequestActions.ts', '', {
    '../../service/axios': { __esModule: true, default: {
      put: async (url, payload) => {
        calls.push({ url, payload });
        return { data: { success: true, message: 'updated' } };
      },
    } },
  });

  await cancelProductionRequest(41);
  await updateProductionRequestStatus({ id: 42, status: 'IN_PRODUCTION' });
  await updateProductionRequestStatus({ id: 42, status: 'DONE' });

  assert.equal(calls[0].url, '/v3/production-requests/41/cancel');
  assert.equal(calls[0].payload, undefined);
  assert.equal(calls[1].url, '/v1/production-requests/42/status');
  assert.equal(JSON.stringify(calls[1].payload), JSON.stringify({ status: 'IN_PRODUCTION' }));
  assert.equal(calls[2].url, '/v1/production-requests/42/status');
  assert.equal(JSON.stringify(calls[2].payload), JSON.stringify({ status: 'DONE' }));
});

test('event item conversion sends the v3 backend payload', async () => {
  const calls = [];
  const { convertEventItem } = load('hooks/api/useConvertEventItem.ts', '', {
    '../../service/axios': { __esModule: true, default: {
      post: async (url, payload) => { calls.push({ url, payload }); return { data: { success: true, message: 'pending' } }; },
    } },
  });
  const payload = { id_fix_list_item_event: 123, old_qty: 4, barang_id: 456, new_qty: 1 };
  const response = await convertEventItem(payload);
  assert.equal(calls[0].url, '/v3/fix-list-item/convert');
  assert.deepEqual(calls[0].payload, payload);
  assert.equal(response.message, 'pending');
});

test('production requests are loaded for the current event', async () => {
  const calls = [];
  const { getProductionRequests } = load('hooks/api/useGetProductionRequests.ts', '', {
    '../../service/axios': { __esModule: true, default: {
      get: async (url, config) => { calls.push({ url, params: config.params }); return { data: { success: true, message: 'ok', data: [] } }; },
    } },
  });
  const response = await getProductionRequests(88);
  assert.equal(calls[0].url, '/v3/production-requests');
  assert.equal(JSON.stringify(calls[0].params), JSON.stringify({ event_id: 88 }));
  assert.equal(response.success, true);
});

test('warehouse production list uses the global endpoint with server-side filters and pagination', async () => {
  const calls = [];
  const apiResponse = {
    success: true,
    message: 'production requests',
    data: {
      page: 2,
      total_pages: 3,
      total_records: 25,
      prev: 1,
      next: 3,
      record_per_page: 10,
      summary: { production_records: 25, in_progress: 7, done: 18, qty_produced: 42 },
      data: [],
    },
  };
  const { getProductionRequestList } = load('hooks/api/useGetProductionRequestList.ts', '', {
    '../../service/axios': { __esModule: true, default: {
      get: async (url, config) => {
        calls.push({ url, params: config.params });
        return { data: apiResponse };
      },
    } },
  });

  const response = await getProductionRequestList({
    status: 'REQUESTED',
    source: 'EVENT',
    warehouse_id: 19,
    search: 'lampu',
    page: 2,
    limit: 10,
  });

  assert.equal(calls[0].url, '/v1/production-requests');
  assert.equal(JSON.stringify(calls[0].params), JSON.stringify({
    page: 2,
    limit: 10,
    status: 'REQUESTED',
    source: 'EVENT',
    warehouse_id: 19,
    search: 'lampu',
  }));
  assert.equal(response.data.summary.qty_produced, 42);
  assert.equal(response.data.total_records, 25);
});

test('event calendar and clashes use the selected month backend contracts', async () => {
  const calls = [];
  const { getEventCalendar, getEventCalendarClashes } = load('hooks/api/useGetEventCalendar.ts', '', {
    '../../service/axios': { __esModule: true, default: {
      get: async (url, config) => {
        calls.push({ url, params: config.params });
        return { data: { success: true, message: 'ok', data: {} } };
      },
    } },
  });
  await getEventCalendar('2026-10');
  await getEventCalendarClashes('2026-10');
  assert.equal(JSON.stringify(calls), JSON.stringify([
    { url: '/v1/event-calendar', params: { month: '2026-10' } },
    { url: '/v1/event-calendar/clashes', params: { month: '2026-10' } },
  ]));
});

test('inventory total asset value comes from the inventory summary endpoint', async () => {
  const calls = [];
  const response = { success: true, message: 'ok', data: { total_items: 2, available: 1, low_stock: 0, out_of_stock: 1, total_asset_value: 1250000 } };
  const { getInventorySummary } = load('hooks/api/useGetInventorySummary.ts', '', {
    '../../service/axios': { __esModule: true, default: {
      get: async url => { calls.push(url); return { data: response }; },
    } },
  });
  const result = await getInventorySummary();
  assert.equal(calls[0], '/v1/inventory-summary');
  assert.equal(result.data.total_asset_value, 1250000);
});

test('Next only unlocks the immediately following stage; scan gate permits returning to reached stages', () => {
  const { canChangeStage } = load('lib/eventStageRules.ts');
  const state = { current: 1, furthest: 1, stageCount: 5, viaNext: false, scanRequired: false, unscanned: 3, locked: false };
  assert.equal(canChangeStage({ ...state, target: 2 }), false);
  assert.equal(canChangeStage({ ...state, target: 2, viaNext: true }), true);
  assert.equal(canChangeStage({ ...state, target: 3, viaNext: true }), false);
  assert.equal(canChangeStage({ ...state, target: 2, viaNext: true, scanRequired: true }), false);
  assert.equal(canChangeStage({ ...state, target: 2, viaNext: true, scanRequired: true, unscanned: 0 }), true);
  assert.equal(canChangeStage({ ...state, target: 0, scanRequired: true }), true);
  assert.equal(canChangeStage({ ...state, target: 0, locked: true }), false);
  assert.equal(canChangeStage({ ...state, target: 4, furthest: 4 }), true);
});

test('Cutting Stock is exclusive; hidden Stock Return does not constrain settings; production can repeat', () => {
  const { hasExclusiveFlagConflict } = load('lib/eventStageRules.ts');
  const empty = { cuttingStock: false, stockReturn: false, productionItem: false };
  assert.equal(hasExclusiveFlagConflict({ ...empty, cuttingStock: true }, [{ ...empty, cuttingStock: true }]), true);
  assert.equal(hasExclusiveFlagConflict({ ...empty, stockReturn: true }, [{ ...empty, stockReturn: true }]), false);
  assert.equal(hasExclusiveFlagConflict({ ...empty, cuttingStock: true, stockReturn: true }, []), false);
  assert.equal(hasExclusiveFlagConflict({ ...empty, stockReturn: true }, [{ ...empty, cuttingStock: true }]), false);
  assert.equal(hasExclusiveFlagConflict({ ...empty, productionItem: true }, [{ ...empty, productionItem: true }]), false);
});

test('conversion preview accounts for reservations across events and validates the whole batch atomically', () => {
  const { availableConversionStock, planConversions } = load('lib/conversionPreview.ts');
  const row = { id: 7, itemId: 10, name: 'Old', warehouse: 'W1', stock: 10 };
  const request = { id: 101, type: 'convert', status: 'Pending', stageId: 1, fromRowId: 7, fromItemId: 10, fromName: 'Old', fromWarehouse: 'W1', fromQty: 3, toItemId: 20, toName: 'New', toQty: 2 };
  const store = { events: { 1: { productionRequests: [request] }, 2: { productionRequests: [{ ...request, id: 102, fromQty: 2 }] } }, stockMovements: [{ rowId: 7, change: -1 }] };
  assert.equal(availableConversionStock(row, store), 4);
  const before = JSON.stringify(store);
  const result = planConversions(store, 1, [row], 5, 'Event', 'Stage', 'User', '2026-10-06T00:00:00Z');
  assert.equal(JSON.stringify(store), before, 'planning must not mutate stock before successful stage update');
  assert.equal(result.requests[0].status, 'Converted');
  assert.equal(result.requests[0].stageId, 5);
  assert.equal(result.movements.length, 1);
  assert.equal(result.movements[0].before, 9);
  assert.equal(result.movements[0].after, 6);
  assert.equal(result.movements[0].change, -3, 'only old stock is deducted');
  const applied = { ...store, events: { ...store.events, 1: { productionRequests: result.requests } }, stockMovements: [...result.movements, ...store.stockMovements] };
  assert.equal(planConversions(applied, 1, [row], 6, 'Event', 'Stage 2', 'User', '').movements.length, 0, 'converted requests cannot deduct twice');
  assert.throws(() => planConversions(store, 1, [{ ...row, stock: 2 }], 5, '', '', '', ''), /conversionStockUnavailable/);
  assert.throws(() => planConversions(store, 1, [], 5, '', '', '', ''), /conversionStockUnavailable/);
  for (const bad of [{ fromQty: 0 }, { fromQty: 1.5 }, { toQty: -1 }, { toQty: NaN }, { toItemId: 10 }]) {
    const invalid = { ...store, events: { 1: { productionRequests: [{ ...request, ...bad }] } } };
    assert.throws(() => planConversions(invalid, 1, [row], 5, '', '', '', ''), /conversionStockUnavailable/);
  }
  const batch = { ...store, events: { 1: { productionRequests: [request, { ...request, id: 103, fromQty: 8 }] } } };
  assert.throws(() => planConversions(batch, 1, [row], 5, '', '', '', ''), /conversionStockUnavailable/);
});

test('conversion loaders use backend pagination and stable inventory identifiers', async () => {
  const calls = [];
  const { loadConversionStock, loadConversionCatalog } = load('lib/conversionInventory.ts', '', {
    '../service/InventoryService': { InventoryService: {
      async getBarangGudang(warehouse, page) { calls.push(['stock', page]); return { total_pages: 2, data: [{ id: 99, barang_gudang_id: page, barang_id: 10, nama_barang: 'Old', kode_gudang: 'W1', stok_gudang: 12 }] }; },
      async getInventory(params) { calls.push(['catalog', params]); return { data: { total_pages: 2, data: [{ id: 11, nama: 'New', code: 'SKU' }] } }; },
    } },
  });
  const rows = await loadConversionStock();
  await loadConversionCatalog();
  const catalog = await loadConversionCatalog('table');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, 1);
  assert.equal(rows[0].stock, 12);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].id, 11);
  assert.equal(JSON.stringify(calls[2][1]), JSON.stringify({ page: 1, limit: 100, sort: 'ASC', sortBy: 'name' }));
  assert.equal(JSON.stringify(calls[3][1]), JSON.stringify({ page: 1, limit: 100, sort: 'ASC', sortBy: 'name', search: 'table' }));
  assert.equal(calls.length, 4);
});

test('cards and list preserve backend return / transfer chips, and locked item actions disappear', () => {
  const { ItemCard, ItemTable, isPackableEventItem, mapEventItem } = load('pages/EventDetailPage.tsx', '\nexport { ItemCard, ItemTable, isPackableEventItem, mapEventItem };', {
    '../lib/eventLifecycle': { ownershipClass: () => 'badge-purple' },
    '../utils/function': { isValidUrl: () => false, noImage: '/empty.jpg', STORAGE_BOOQABLE: '' },
  });
  const item = { id: 1, name: 'Chair', photo: '/chair.jpg', area: 'Entrance', qty: 2, unit: 'pcs', ownerships: ['IHP'], checking: true, isReturned: true, isTransferredFromOtherEvent: true, isTransferredToOtherEvent: true, isNewProductionItem: true, isConverted: true, convertedQty: 1 };
  const props = { item, onOpen() {}, onScan() {}, showScanButton: false, isScanned: false };
  const card = renderToStaticMarkup(React.createElement(ItemCard, props));
  assert.match(card, /lifecycle.returned/);
  assert.equal((card.match(/lifecycle.transferred/g) || []).length, 2);
  assert.match(card, /eventUpgrade.productionItem/);
  assert.match(card, /conversion.convertedQty/);
  assert.ok(card.indexOf('M6 2v8') < card.indexOf('M6 10V2'));
  assert.doesNotMatch(card, /item-card-action modify|item-card-action delete/);
  const editable = renderToStaticMarkup(React.createElement(ItemCard, { ...props, onModify() {}, onDelete() {} }));
  assert.match(editable, /item-card-action modify/);
  assert.match(editable, /item-card-action delete/);
  const table = renderToStaticMarkup(React.createElement(ItemTable, { items: [item], onOpen() {}, onScan() {}, showScanButton: false, isScanned: () => false }));
  assert.match(table, /2 pcs/);
  assert.ok(table.indexOf('↓') < table.indexOf('↑'));
  assert.doesNotMatch(table, /eventUpgrade.modify/);
  assert.equal(isPackableEventItem({ id: 1, packageId: null }), true);
  assert.equal(isPackableEventItem({ id: 2, packageId: 24 }), false);
  assert.equal(isPackableEventItem({ id: 3 }), false, 'only an explicit package:null response is eligible');
  const mapped = mapEventItem({
    id: 597, photo: '', nama_barang: 'Chair', kategori: null, code: 'CHAIR', gudang: null,
    area_name: 'CEREMONY', sub_list_name: 'AISLE', qty: 2, pic: '', satuan: 'pcs',
    is_checking: { Valid: true, Int64: 0 }, is_ware_house_item: { Valid: true, Int64: 0 },
    scan_in: 0, scan_in_date: { Valid: false, Time: '' }, scan_out_date: { Valid: false, Time: '' },
    notes: '', list_id: 16, sub_list_id: { Valid: true, Int64: 26 }, barang_id: 2232,
    barang_gudang_id: 2408, event_status_id: 1, group_detail: '', ownerships: {},
    is_returned: 0, is_transfer_to_other_event: 0, is_transfer_from_other_event: 0,
    is_new_production_item: false, is_converted: false, converted_qty: 0, package: null,
    broken_item: { id: 4, qty: 1, notes: 'dirty', reported_by: 'Monata', reported_at: '2026-10-16 06:20:00' },
  }, new Map([[1, 'Preparation']]));
  assert.equal(mapped.brokenReport.id, 4);
  assert.equal(mapped.brokenReport.qty, 1);
  assert.equal(mapped.brokenReport.note, 'dirty');
  assert.equal(mapped.brokenReport.by, 'Monata');
  assert.equal(mapped.brokenReport.at, '2026-10-16 06:20:00');
});

test('vendor CMS uses the v1 vendor contract for list, create, update, and delete', async () => {
  const calls = [];
  const axios = {
    get: async (url, config) => {
      calls.push({ method: 'GET', url, params: config.params });
      return { data: { success: true, message: 'ok', data: { items: [], page: 2, limit: 10, total: 0, total_pages: 0, stats: { total: 0, internal: 0, external: 0 } } } };
    },
    post: async (url, payload) => {
      calls.push({ method: 'POST', url, payload });
      return { data: { success: true, message: 'created', data: { id: 1, ...payload } } };
    },
    put: async (url, payload) => {
      calls.push({ method: 'PUT', url, payload });
      return { data: { success: true, message: 'updated', data: { id: 7, ...payload } } };
    },
    delete: async url => {
      calls.push({ method: 'DELETE', url });
      return { data: { success: true, message: 'deleted', data: null } };
    },
  };
  const api = load('hooks/api/useVendors.ts', '', {
    '../../service/axios': { __esModule: true, default: axios },
  });
  const payload = { name: 'Workshop Kayu', category: 'Carpentry', contact: '0812', origin: 'Internal' };

  await api.getVendors({ page: 2, limit: 10, search: 'wood', origin: 'Internal' });
  await api.createVendor(payload);
  await api.updateVendor({ id: 7, payload });
  await api.deleteVendor(7);

  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].url, '/v1/vendor');
  assert.equal(JSON.stringify(calls[0].params), JSON.stringify({ page: 2, limit: 10, search: 'wood', origin: 'Internal' }));
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].url, '/v1/vendor');
  assert.deepEqual(calls[1].payload, payload);
  assert.equal(calls[2].method, 'PUT');
  assert.equal(calls[2].url, '/v1/vendor/7');
  assert.deepEqual(calls[2].payload, payload);
  assert.equal(calls[3].method, 'DELETE');
  assert.equal(calls[3].url, '/v1/vendor/7');
});

test('loan vendor CMS uses its separate v1 loan-vendors CRUD contract', async () => {
  const calls = [];
  const axios = {
    get: async (url, config = {}) => {
      calls.push({ method: 'GET', url, params: config.params });
      return { data: { success: true, message: 'ok', data: url.endsWith('/7') ? { id: 7, name: 'Rental' } : { items: [], page: 2, limit: 10, total: 0, total_pages: 0, stats: { total: 0, internal: 0, external: 0 } } } };
    },
    post: async (url, payload) => {
      calls.push({ method: 'POST', url, payload });
      return { data: { success: true, message: 'created', data: { id: 7, ...payload } } };
    },
    put: async (url, payload) => {
      calls.push({ method: 'PUT', url, payload });
      return { data: { success: true, message: 'updated', data: { id: 7, ...payload } } };
    },
    delete: async url => {
      calls.push({ method: 'DELETE', url });
      return { data: { success: true, message: 'deleted' } };
    },
  };
  const api = load('hooks/api/useLoanVendors.ts', '', {
    '../../service/axios': { __esModule: true, default: axios },
  });
  const payload = { name: 'Bali Party Rental', type: 'External', description: 'Furniture rental', phone: '0812', address: 'Denpasar', is_loan: true, is_production: false };

  await api.getLoanVendors({ page: 2, limit: 10, search: 'party', type: 'External' });
  await api.getLoanVendor(7);
  await api.createLoanVendor(payload);
  await api.updateLoanVendor({ id: 7, payload });
  await api.deleteLoanVendor(7);

  assert.equal(calls[0].url, '/v1/loan-vendors');
  assert.equal(JSON.stringify(calls[0].params), JSON.stringify({ page: 2, limit: 10, search: 'party', type: 'External' }));
  assert.equal(calls[1].url, '/v1/loan-vendors/7');
  assert.equal(calls[2].url, '/v1/loan-vendors');
  assert.deepEqual(calls[2].payload, payload);
  assert.equal(calls[3].url, '/v1/loan-vendors/7');
  assert.deepEqual(calls[3].payload, payload);
  assert.equal(calls[4].url, '/v1/loan-vendors/7');
});

test('borrowed items use the loan-items list, detail, create, update, and delete contracts', async () => {
  const calls = [];
  const axios = {
    get: async (url, config) => {
      calls.push({ method: 'GET', url, params: config?.params });
      return { data: { success: true, message: 'ok', data: url.endsWith('/44') ? { id: 44, item_name: 'Chair', qty: 2, unit: 'pcs', vendor_id: 7, warehouse_id: 19, event_id: 0, area_id: 0, sub_area_id: 0, borrow_from: '2026-10-25', return_by: '2026-11-02', rental_cost_per_unit: 50000, purpose: 'Event buffer', notes: 'White' } : { data: [], summary: {}, page: 2, total_records: 0 } } };
    },
    post: async (url, payload) => {
      calls.push({ method: 'POST', url, payload });
      return { data: { success: true, message: 'created' } };
    },
    put: async (url, payload) => {
      calls.push({ method: 'PUT', url, payload });
      return { data: { success: true, message: 'updated', data: { id: 44, ...payload } } };
    },
    delete: async url => {
      calls.push({ method: 'DELETE', url });
      return { data: { success: true, message: 'deleted' } };
    },
  };
  const dependencies = { '../../service/axios': { __esModule: true, default: axios } };
  const api = load('hooks/api/useGetItemLoans.ts', '', dependencies);
  const payload = { item_name: 'Chair', qty: 2, unit: 'pcs', vendor_id: 7, warehouse_id: 19, borrow_from: '2026-10-25', return_by: '2026-11-02', rental_cost_per_unit: 50000, purpose: 'Event buffer', notes: 'White' };

  await api.getLoanItems({ page: 2, limit: 15, search: 'chair', status: 'OVERDUE', vendor_id: 7, warehouse_id: 19 });
  await api.getLoanItem(44);
  await api.createLoanItem(payload);
  await api.updateLoanItem({ id: 44, payload });
  const detail = await api.getLoanItem(44);
  const statusPayload = api.loanItemToUpdatePayload(detail.data, 'BORROWED');
  await api.updateLoanItem({ id: 44, payload: statusPayload });
  await api.deleteLoanItem(44);

  assert.equal(JSON.stringify(calls[0]), JSON.stringify({ method: 'GET', url: '/v1/loan-items', params: { page: 2, limit: 15, search: 'chair', status: 'OVERDUE', vendor_id: 7, warehouse_id: 19 } }));
  assert.equal(calls[1].url, '/v1/loan-items/44');
  assert.equal(calls[2].url, '/v1/loan-items');
  assert.deepEqual(calls[2].payload, payload);
  assert.equal(calls[3].url, '/v1/loan-items/44');
  assert.deepEqual(calls[3].payload, payload);
  assert.equal(calls[4].url, '/v1/loan-items/44');
  assert.equal(calls[5].url, '/v1/loan-items/44');
  assert.equal(JSON.stringify(calls[5].payload), JSON.stringify({ ...payload, status: 'BORROWED' }));
  assert.equal(calls[6].url, '/v1/loan-items/44');
});

test('event borrowed items use the event-specific list and create contracts', async () => {
  const calls = [];
  const axios = {
    get: async (url, config) => {
      calls.push({ method: 'GET', url, params: config?.params });
      return { data: { success: true, message: 'ok', data: { event_id: 73, total: 0, items: [] } } };
    },
    post: async (url, payload) => {
      calls.push({ method: 'POST', url, payload });
      return { data: { success: true, message: 'created', data: { id: 45, ...payload } } };
    },
  };
  const api = load('hooks/api/useGetItemLoans.ts', '', {
    '../../service/axios': { __esModule: true, default: axios },
  });
  const payload = {
    item_name: 'Champagne Glass Coupe',
    qty: 24,
    unit: 'pcs',
    vendor_id: 7,
    area_id: 10,
    sub_area_id: 5,
    borrow_from: '2026-10-25',
    return_by: '2026-11-02',
    rental_cost_per_unit: 15000,
    purpose: '',
    notes: 'For reception',
  };

  await api.getEventBorrowedItems(73);
  await api.borrowItemToEvent({ eventId: 73, payload });

  assert.equal(JSON.stringify(calls[0]), JSON.stringify({ method: 'GET', url: '/v1/events/73/borrowed-items' }));
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].url, '/v1/events/73/borrow-item');
  assert.equal(JSON.stringify(calls[1].payload), JSON.stringify({ ...payload, event_id: 73 }));
});

test('broken item reports use the v3 create, update, and delete contracts', async () => {
  const calls = [];
  const axios = {
    post: async (url, payload) => {
      calls.push({ method: 'POST', url, payload });
      return { data: { success: true, message: 'created', data: { id: 91, ...payload } } };
    },
    put: async (url, payload) => {
      calls.push({ method: 'PUT', url, payload });
      return { data: { success: true, message: 'updated', data: { id: 91, ...payload } } };
    },
    delete: async url => {
      calls.push({ method: 'DELETE', url });
      return { data: { success: true, message: 'deleted' } };
    },
  };
  const api = load('hooks/api/useBrokenItemReport.ts', '', {
    '../../service/axios': { __esModule: true, default: axios },
  });
  const createPayload = { barang_event_id: 404, fix_list_item_id: 404, qty: 2, notes: 'Leg cracked' };
  const updatePayload = { qty: 1, notes: 'One unit confirmed' };

  await api.createBrokenItemReport(createPayload);
  await api.updateBrokenItemReport({ id: 91, payload: updatePayload });
  await api.deleteBrokenItemReport(91);

  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].url, '/v3/fix-list-item/report');
  assert.deepEqual(calls[0].payload, createPayload);
  assert.equal(calls[1].method, 'PUT');
  assert.equal(calls[1].url, '/v3/fix-list-item/report/91');
  assert.deepEqual(calls[1].payload, updatePayload);
  assert.equal(calls[2].method, 'DELETE');
  assert.equal(calls[2].url, '/v3/fix-list-item/report/91');
});
