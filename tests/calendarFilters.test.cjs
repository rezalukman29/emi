const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/calendarFilters.ts'), 'utf8');
const lib = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: lib });

const ev = (id, name, location) => ({ id, name, location, booking_from: '2026-11-10', booking_to: '2026-11-12' });
const A = ev(1, 'Wedding Spring Garden', 'Bali'), B = ev(2, 'Gala Night', 'Jakarta'), C = ev(3, 'Baby Shower', 'Bali');
const days = [
  { date: '2026-11-10', events: [A, B] },
  { date: '2026-11-11', events: [A, B, C] },
  { date: '2026-11-12', events: [C] },
];
const clashes = [
  { item_id: 10, item_name: 'Tiffany Chair', from: '2026-11-10', to: '2026-11-11', shortage: 20, demand: 120, stock: 100, events: [{ id: 1, name: A.name, qty: 60 }, { id: 2, name: B.name, qty: 60 }] },
  { item_id: 11, item_name: 'Round Table', from: '2026-11-11', to: '2026-11-11', shortage: 0, demand: 10, stock: 30, events: [{ id: 1, name: A.name, qty: 5 }, { id: 3, name: C.name, qty: 5 }] },
];
const F = (patch = {}) => ({ ...lib.EMPTY_CALENDAR_FILTERS, ...patch });
const ids = r => [...r.eventIds].sort();
// Objects come from a vm context (other prototypes), so compare plain copies.
const plain = value => JSON.parse(JSON.stringify(value));
const eq = (actual, expected) => assert.deepEqual(plain(actual), expected);

test('no filters keeps every event and clash', () => {
  const r = lib.filterCalendar(days, clashes, F(), '2026-11');
  eq(ids(r), [1, 2, 3]);
  assert.equal(r.clashes.length, 2);
  eq(r.summary, { events: 3, daysWithClashes: 2, itemsClashing: 2, itemsShort: 1 });
  assert.equal(lib.isFiltering(F()), false);
});

test('location keeps its events and only clashes involving them', () => {
  const r = lib.filterCalendar(days, clashes, F({ locations: ['Jakarta'] }), '2026-11');
  eq(ids(r), [2]);
  eq(r.clashes.map(c => c.item_id), [10]);
  eq(r.eventsByDay.get('2026-11-11').map(e => e.id), [2]);
  assert.equal(lib.activeFilterCount(F({ locations: ['Jakarta'] })), 1);
});

test('search matches event name, location or a clashing item name', () => {
  eq(ids(lib.filterCalendar(days, clashes, F({ search: 'gala' }), '2026-11')), [2]);
  eq(ids(lib.filterCalendar(days, clashes, F({ search: 'BALI' }), '2026-11')), [1, 3]);
  const byItem = lib.filterCalendar(days, clashes, F({ search: 'round table' }), '2026-11');
  eq(ids(byItem), [1, 3]);
  eq(byItem.clashes.map(c => c.item_id), [11]);
});

test('picking items keeps the events that book them; per-day counts follow', () => {
  const r = lib.filterCalendar(days, clashes, F({ itemIds: [11] }), '2026-11');
  eq(ids(r), [1, 3]);
  eq([...r.clashCountByDay.keys()], ['2026-11-11']);
  eq(r.clashCountByDay.get('2026-11-11'), { clash: 1, short: 0 });
});

test('shortages view and "only events with clashes" combine', () => {
  const r = lib.filterCalendar(days, clashes, F({ clashView: 'shortages', onlyWithClashes: true }), '2026-11');
  eq(ids(r), [1, 2]);
  assert.equal(r.summary.itemsShort, 1);
  assert.equal(r.summary.itemsClashing, 1);
});

test('option lists are distinct and sorted', () => {
  eq(lib.monthLocations(days), ['Bali', 'Jakarta']);
  eq(lib.monthEvents(days).map(e => e.id), [3, 2, 1]);
  eq(lib.monthItems(clashes).map(i => i.name), ['Round Table', 'Tiffany Chair']);
});
