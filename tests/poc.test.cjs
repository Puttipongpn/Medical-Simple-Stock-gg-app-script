const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, TEST_CODE, REQUEST_ID } = require('./harness.cjs');

function ready(options) {
  const harness = createHarness(options);
  harness.app.setupPoc_();
  return harness;
}

test('missing config fails closed without opening a spreadsheet', () => {
  for (const properties of [{ APP_ENV: 'production' }, { TEAM_ACCESS_CODE: '' }, { SPREADSHEET_ID: '' }]) {
    const h = createHarness({ properties });
    assert.equal(h.app.runPocCheck(TEST_CODE).code, 'CONFIG');
    assert.equal(h.calls.open, 0);
  }
});

test('every data endpoint rejects wrong credentials before Sheets access', () => {
  for (const method of ['runPocCheck', 'writePocProbe', 'getPocProbe']) {
    for (const code of ['', 'wrong', null, {}, TEST_CODE + 'x']) {
      const h = createHarness();
      assert.equal(h.app[method](code, REQUEST_ID).code, 'AUTH');
      assert.equal(h.calls.open, 0);
      assert.equal(h.calls.writes, 0);
    }
  }
});

test('setup is repeatable and preserves existing probes and unrelated sheets', () => {
  const h = ready();
  h.createSheet('Notes').rows = [['keep me']];
  h.app.writePocProbe(TEST_CODE, REQUEST_ID);
  const snapshot = JSON.stringify([...h.sheets]);
  const writes = h.calls.writes;
  h.app.setupPoc_();
  assert.equal(JSON.stringify([...h.sheets]), snapshot);
  assert.equal(h.calls.writes, writes);
  assert.deepEqual([...h.sheets.keys()], ['POC_Checks', 'Notes']);
});

test('setup refuses stock workbooks and incorrect existing schema without overwriting', () => {
  const h = createHarness();
  h.createSheet('Movements').rows = [['existing stock']];
  assert.throws(() => h.app.setupPoc_(), /ไฟล์ทดสอบ/);
  assert.equal(h.calls.writes, 0);
  const other = createHarness();
  other.createSheet('POC_Checks').rows = [['wrong-header']];
  assert.throws(() => other.app.setupPoc_(), /โครงสร้าง/);
  assert.equal(other.calls.writes, 0);
});

test('empty sheet reads successfully; unavailable email is valid and never inferred', () => {
  for (const options of [{}, { emailError: true }, { email: 'fixture@example.invalid' }]) {
    const h = ready(options);
    const result = h.app.runPocCheck(TEST_CODE);
    assert.equal(result.ok, true);
    assert.equal(result.data.probeCount, 0);
    assert.equal(result.data.observedEmail, options.email || '');
    assert.equal(result.data.authentication, 'TEAM_CODE');
    assert.equal(typeof result.data.checkedAt, 'string');
    assert.equal(JSON.stringify(result).includes(TEST_CODE), false);
  }
});

test('write uses one row; retry and lookup return the original ID and timestamp', () => {
  const h = ready();
  const first = h.app.writePocProbe(TEST_CODE, REQUEST_ID);
  const second = h.app.writePocProbe(TEST_CODE, REQUEST_ID.toUpperCase());
  assert.equal(first.ok, true);
  assert.equal(first.data.repeated, false);
  assert.equal(second.data.repeated, true);
  assert.equal(JSON.stringify(second.data.probe), JSON.stringify(first.data.probe));
  assert.equal(h.calls.writes, 2); // Header plus exactly one marker.
  assert.equal(h.sheets.get('POC_Checks').rows.length, 2);
  assert.equal(h.app.getPocProbe(TEST_CODE, REQUEST_ID).data.probe.probeId, first.data.probe.probeId);
  assert.equal(h.app.getPocProbe(TEST_CODE, '22222222-2222-4222-8222-222222222222').data.probe, null);
});

test('unknown completion after flush failure can be retried without another row', () => {
  const options = {};
  const h = ready(options);
  options.flushError = true;
  assert.equal(h.app.writePocProbe(TEST_CODE, REQUEST_ID).code, 'SERVICE');
  assert.equal(h.calls.release, 2);
  options.flushError = false;
  assert.equal(h.app.writePocProbe(TEST_CODE, REQUEST_ID).data.repeated, true);
  assert.equal(h.sheets.get('POC_Checks').rows.length, 2);
});

test('lock timeout produces no write; successful operations flush before release', () => {
  const options = {};
  const h = ready(options);
  options.lockTimeout = true;
  const before = h.calls.writes;
  assert.equal(h.app.writePocProbe(TEST_CODE, REQUEST_ID).code, 'BUSY');
  assert.equal(h.calls.writes, before);
  assert.equal(h.calls.release, 1);
  assert.equal(h.calls.timeout, 5000);
  options.lockTimeout = false;
  h.app.writePocProbe(TEST_CODE, REQUEST_ID);
  assert.deepEqual(h.calls.events.slice(-4), ['lock', 'write', 'flush', 'release']);
});

test('write errors release lock and redact service internals', () => {
  const options = {};
  const h = ready(options);
  options.writeError = true;
  const result = h.app.writePocProbe(TEST_CODE, REQUEST_ID);
  assert.equal(result.code, 'SERVICE');
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(h.calls.release, 2);
});

test('timezone mismatch and missing setup fail safely', () => {
  const h = createHarness();
  assert.equal(h.app.runPocCheck(TEST_CODE).code, 'SETUP');
  for (const options of [{ sheetTimezone: 'UTC' }, { scriptTimezone: 'UTC' }]) {
    const other = createHarness(options);
    assert.equal(other.app.runPocCheck(TEST_CODE).code, 'TIMEZONE');
    assert.equal(other.calls.writes, 0);
    assert.equal(other.calls.release, 1);
  }
});

test('formula, duplicate IDs, partial rows and invalid timestamps stop reads and writes', () => {
  const corruptions = [
    sheet => { sheet.formulas = true; },
    sheet => { sheet.rows.push([...sheet.rows[1]]); },
    sheet => { sheet.rows[1][0] = ''; },
    sheet => { sheet.rows[1][2] = '2026-02-31T00:00:00.000Z'; },
    sheet => { sheet.rows[1][2] = new Date(); },
    sheet => { sheet.rows[1][3] = '=IMPORTXML("bad")'; }
  ];
  for (const corrupt of corruptions) {
    const h = ready();
    h.app.writePocProbe(TEST_CODE, REQUEST_ID);
    corrupt(h.sheets.get('POC_Checks'));
    const before = h.calls.writes;
    assert.equal(h.app.runPocCheck(TEST_CODE).code, 'INTEGRITY');
    assert.equal(h.app.writePocProbe(TEST_CODE, REQUEST_ID).code, 'INTEGRITY');
    assert.equal(h.calls.writes, before);
  }
});

test('malformed and formula-like request IDs are rejected before lock or write', () => {
  for (const requestId of ['=1+1', '', null, 123, {}, 'not-a-uuid']) {
    const h = ready();
    assert.equal(h.app.writePocProbe(TEST_CODE, requestId).code, 'REQUEST');
    assert.equal(h.calls.writes, 1);
    assert.equal(h.calls.lock, 1);
  }
});
