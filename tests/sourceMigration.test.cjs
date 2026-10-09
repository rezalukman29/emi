const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function load(file, storage = new Map()) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: name => name === 'react' ? {} : require(name), Event,
    window: new EventTarget(),
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  });
  return exports;
}

test('new local previews are isolated by tenant and user and contain no mock seeds', () => {
  const storage = new Map([['auth', JSON.stringify({ company_id: 1, id: 10 })]]);
  const preview = load('lib/sourcePreview.ts', storage);
  assert.equal(preview.readSourcePreview().vendors.length, 0);
  preview.updateSourcePreview(data => {
    data.vendors.push({ id: 1, name: 'Workshop', origin: 'Internal', type: '', contact: '' });
    data.checkOwnership[8] = true;
    data.reports[73] = { 404: { qty: 1, note: 'Broken', by: 'Admin', at: '2026-10-10' } };
  });
  storage.set('auth', JSON.stringify({ company_id: 1, id: 11 }));
  assert.equal(preview.readSourcePreview().vendors.length, 0);
  storage.set('auth', JSON.stringify({ company_id: 2, id: 10 }));
  assert.equal(preview.readSourcePreview().checkOwnership[8], undefined);
  storage.set('auth', JSON.stringify({ company_id: 1, id: 10 }));
  assert.equal(preview.readSourcePreview().reports[73][404].qty, 1);
  assert.equal(preview.readSourcePreview().vendors[0].name, 'Workshop');
});

test('broken reports validate integers between 1 and event quantity', () => {
  const { validBrokenQuantity } = load('lib/sourcePreview.ts');
  for (const qty of [0, -1, 1.5, NaN, Infinity, 11]) assert.equal(validBrokenQuantity(qty, 10), false);
  assert.equal(validBrokenQuantity(1, 10), true);
  assert.equal(validBrokenQuantity(10, 10), true);
});

test('forward prompts ownership then broken; answered stages and backwards skip ownership', () => {
  const { stagePromptStep } = load('lib/sourcePreview.ts');
  assert.equal(stagePromptStep(true, true, false, true), 'ownership');
  assert.equal(stagePromptStep(true, true, true, true), 'broken');
  assert.equal(stagePromptStep(true, false, false, true), 'broken');
  assert.equal(stagePromptStep(true, true, true, false), 'confirm');
  assert.equal(stagePromptStep(false, true, false, true), 'confirm');
});

test('setup flag is backend-driven and explicit false overrides legacy camelCase', () => {
  const { needsInventorySetup } = load('lib/inventorySetup.ts');
  assert.equal(needsInventorySetup({}), false);
  assert.equal(needsInventorySetup({ needs_setup: true }), true);
  assert.equal(needsInventorySetup({ needsSetup: true }), true);
  assert.equal(needsInventorySetup({ needs_setup: false, needsSetup: true }), false);
});
