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
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key }) };
      if (name === '../i18n') return { __esModule: true, default: { t: key => key } };
      if (name.endsWith('/icons')) return new Proxy({}, { get: () => () => React.createElement('svg') });
      return { default: () => null };
    },
  });
  return exports;
}

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

test('stock flags are individually exclusive and mutually exclusive on a status; production can repeat', () => {
  const { hasExclusiveFlagConflict } = load('lib/eventStageRules.ts');
  const empty = { cuttingStock: false, stockReturn: false, productionItem: false };
  assert.equal(hasExclusiveFlagConflict({ ...empty, cuttingStock: true }, [{ ...empty, cuttingStock: true }]), true);
  assert.equal(hasExclusiveFlagConflict({ ...empty, stockReturn: true }, [{ ...empty, stockReturn: true }]), true);
  assert.equal(hasExclusiveFlagConflict({ ...empty, cuttingStock: true, stockReturn: true }, []), true);
  assert.equal(hasExclusiveFlagConflict({ ...empty, stockReturn: true }, [{ ...empty, cuttingStock: true }]), false);
  assert.equal(hasExclusiveFlagConflict({ ...empty, productionItem: true }, [{ ...empty, productionItem: true }]), false);
});

test('cards and list preserve backend return / transfer chips, and locked item actions disappear', () => {
  const { ItemCard, ItemTable } = load('pages/EventDetailPage.tsx', '\nexport { ItemCard, ItemTable };', {
    '../lib/eventLifecycle': { ownershipClass: () => 'badge-purple' },
  });
  const item = { id: 1, name: 'Chair', photo: '/chair.jpg', area: 'Entrance', qty: 2, unit: 'pcs', ownerships: ['IHP'], checking: true, isReturned: true, isTransferredFromOtherEvent: true, isTransferredToOtherEvent: true };
  const props = { item, onOpen() {}, onScan() {}, showScanButton: false, isScanned: false };
  const card = renderToStaticMarkup(React.createElement(ItemCard, props));
  assert.match(card, /lifecycle.returned/);
  assert.equal((card.match(/lifecycle.transferred/g) || []).length, 2);
  assert.ok(card.indexOf('M6 2v8') < card.indexOf('M6 10V2'));
  assert.doesNotMatch(card, /item-card-action modify|item-card-action delete/);
  const editable = renderToStaticMarkup(React.createElement(ItemCard, { ...props, onModify() {}, onDelete() {} }));
  assert.match(editable, /item-card-action modify/);
  assert.match(editable, /item-card-action delete/);
  const table = renderToStaticMarkup(React.createElement(ItemTable, { items: [item], onOpen() {}, onScan() {}, showScanButton: false, isScanned: () => false }));
  assert.match(table, /2 pcs/);
  assert.ok(table.indexOf('↓') < table.indexOf('↑'));
  assert.doesNotMatch(table, /eventUpgrade.modify/);
});
