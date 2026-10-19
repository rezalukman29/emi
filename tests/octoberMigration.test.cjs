const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(name) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`${__dirname}/../src/lib/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
  return exports;
}
test('display numbers use dots, preserve zero, and do not invent missing values', () => {
  const { fmtNum, formatIDR } = load('format');
  assert.equal(fmtNum(1234567), '1.234.567');
  assert.equal(fmtNum(1234.5), '1.234,5');
  assert.equal(fmtNum(0), '0');
  assert.equal(formatIDR(undefined), '—');
});
test('clashes merge consecutive days and combine multiple lines within one event by ID', () => {
  const { computeClashes } = load('eventClashes');
  const line = { eventId: 1, eventName: 'A', itemId: 9, itemName: 'Chair', qty: 2, from: '2026-10-01', to: '2026-10-03' };
  const result = computeClashes([line, { ...line, qty: 3 }, { ...line, eventId: 2, eventName: 'B', from: '2026-10-02' }, { ...line, itemId: 10 }], '2026-10-01', '2026-10-31');
  assert.equal(result.length, 1);
  assert.equal(result[0].from, '2026-10-02');
  assert.equal(result[0].to, '2026-10-03');
  assert.equal(result[0].demand, 7);
  assert.equal(result[0].events[0].qty, 5);
});
test('non-overlapping bookings and same-name different items do not clash', () => {
  const { computeClashes } = load('eventClashes');
  const line = { eventId: 1, eventName: 'A', itemId: 9, itemName: 'Chair', qty: 2, from: '2026-10-01', to: '2026-10-02' };
  assert.equal(computeClashes([line, { ...line, eventId: 2, itemId: 10 }, { ...line, eventId: 3, from: '2026-10-03', to: '2026-10-04' }], '2026-10-01', '2026-10-31').length, 0);
});
