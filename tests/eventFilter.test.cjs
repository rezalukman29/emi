const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const statuses = ['upcoming', 'on-going', 'ready-to-close', 'checking-inventory', 'returned-completed', 'transferred'];

function setup(success = true) {
  const calls = [];
  const exports = {};
  const response = { success, message: 'test', data: { data: [{ id: 1 }], total_records: 20, total_pages: 3 } };
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/hooks/api/useGetEvents.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require: name => name === 'react-query'
      ? { useQuery: (key, query, options) => ({ key, query, options }), useQueries: queries => queries }
      : name.includes('axios')
        ? { __esModule: true, default: { get: async (url, options) => { calls.push({ url, ...options }); return { data: response }; } } }
        : { LIFECYCLE_STATUSES: statuses },
  });
  return { ...exports, calls, response };
}

test('all six filters send v2 status, search and server pagination without date restriction', async () => {
  const api = setup();
  for (const status of statuses) {
    const result = await api.getEvents({ status, search: 'Wedding', page: 2, limit: 8 });
    const call = api.calls.at(-1);
    assert.equal(call.url, '/v2/event-filter');
    assert.equal(call.params.status, status);
    assert.equal(call.params.search, 'Wedding');
    assert.equal(call.params.page, 2);
    assert.equal(call.params.limit, 8);
    assert.equal(call.params.sort, 'DESC');
    assert.equal(call.params.event_start, undefined);
    assert.equal(result.data.total_records, 20);
  }
});

test('counts use unsearched totals, query keys separate filters and errors propagate', async () => {
  const api = setup();
  for (const query of api.useGetEventLifecycleCounts()) await query.queryFn();
  assert.equal(api.calls.length, 6);
  assert.ok(api.calls.every(call => call.params.limit === 1 && !call.params.search));
  assert.notEqual(JSON.stringify(api.default({ status: 'upcoming' }).key), JSON.stringify(api.default({ status: 'on-going' }).key));
  assert.equal(api.default({}, false).options.enabled, false);
  await assert.rejects(setup(false).getEvents({}), /test/);
});
