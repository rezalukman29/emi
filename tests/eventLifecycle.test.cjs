const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup() {
  const values = new Map([['auth', JSON.stringify({ id: 12, fullname: 'Tester' })]]);
  const localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const exports = {};
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/lib/eventLifecycle.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: () => ({}), localStorage,
    window: { dispatchEvent() {} }, Event: class {},
  });
  const read = id => JSON.parse(values.get(`emi.event-lifecycle.preview.v1.${id}`));
  return { ...exports, read, localStorage };
}

test('lifecycle follows items, final stage, and closing state rather than event date', () => {
  const { resolveLifecycle: resolve } = setup();
  assert.equal(resolve({ id: 1 }, undefined, 9), 'upcoming');
  assert.equal(resolve({ id: 1, total_items: 2 }, undefined, 9), 'on-going');
  assert.equal(resolve({ id: 1, status: 9 }, undefined, 9), 'ready-to-close');
  assert.equal(resolve({ id: 1, status: 2 }, { stageId: 9 }, 9), 'upcoming');
  for (const closing of ['checking-inventory', 'returned-completed', 'transferred']) {
    assert.equal(resolve({ id: 1, status: 9 }, { closing }, 9), closing);
  }
  assert.equal(resolve({ id: 1, is_complete: 1 }, undefined, 9), 'returned-completed');
  assert.equal(resolve({ id: 1, total_items: 0 }, { incoming: [{ id: -1 }] }, 9), 'on-going');
});

test('local updates retain metadata, persist transfers, and record one bulk log', () => {
  const api = setup();
  api.updateEventLifecycle(1, { stageId: 2, items: { 10: { checked: true } } });
  api.updateLifecycle(data => {
    data.events[1].items[10].ownership = 'IHP';
    data.events[1].items[11] = { ownership: 'IHP' };
  }, 'Bulk ownership IHP (2)');
  assert.equal(api.read(12).events[1].items[10].checked, true);
  assert.equal(api.read(12).logs.length, 1);
  assert.equal(api.read(12).logs[0].user, 'Tester');
  api.updateLifecycle(data => {
    data.events[1].items[10].resolution = 'transferred';
    data.events[2] = { incoming: [{ id: -1, nama_barang: 'Chair' }] };
  });
  assert.equal(api.read(12).events[2].incoming[0].nama_barang, 'Chair');
  api.localStorage.setItem('auth', JSON.stringify({ id: 99 }));
  api.updateEventLifecycle(1, { closing: 'checking-inventory' });
  assert.equal(api.read(99).events[1].items, undefined);
  assert.equal(api.read(12).events[1].stageId, 2);
});
