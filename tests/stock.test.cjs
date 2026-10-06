const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, REQUEST_ID } = require('./harness.cjs');

function ready() {
  const h = createHarness({ properties: { APP_ENV: 'stock' } });
  assert.equal(h.app.setupStock_().ready, true);
  return h;
}

function item(h) {
  const result = h.app.saveItem({ code: 'US-01', name: 'อัลตราซาวด์', unit: 'เครื่อง' });
  assert.equal(result.ok, true, result.message);
  return result.data.id;
}

function move(h, id, type, quantity, requestId = REQUEST_ID) {
  return h.app.saveMovement({ requestId, itemId: id, type, quantity,
    date: '2026-10-06', detail: 'ทดสอบ', operator: 'ผู้ทดสอบ' });
}

test('receive 5 + 2 and issue 1 leaves 6; one row per request', () => {
  const h = ready(), id = item(h);
  assert.equal(move(h, id, 'OPENING', 5).ok, true);
  assert.equal(move(h, id, 'RECEIVE', 2, '22222222-2222-4222-8222-222222222222').ok, true);
  assert.equal(move(h, id, 'ISSUE', 1, '33333333-3333-4333-8333-333333333333').data.balance, 6);
  assert.equal(h.app.listStock().data.items[0].balance, 6);
  assert.equal(h.sheets.get('Movements').rows.length, 4);
  assert.equal(h.calls.flush, h.calls.release);
});

test('write responses contain the updated view and reuse the validated sheet reads', () => {
  const h = ready();
  const beforeItem = h.calls.reads;
  const created = h.app.saveItem({ code: 'US-01', name: 'อัลตราซาวด์', unit: 'เครื่อง' });
  assert.equal(h.calls.reads - beforeItem, 2);
  assert.equal(created.data.snapshot.items[0].balance, 0);
  const beforeMove = h.calls.reads;
  const received = move(h, created.data.id, 'RECEIVE', 5);
  assert.equal(h.calls.reads - beforeMove, 2);
  assert.equal(received.data.snapshot.items[0].balance, 5);
  assert.equal(received.data.snapshot.movements[0].id, received.data.id);
  const repeated = move(h, created.data.id, 'RECEIVE', 5);
  assert.equal(repeated.data.snapshot.items[0].balance, 5);
  assert.equal(repeated.data.snapshot.movements.length, 1);
});

test('reject overspend and replay without extra movement', () => {
  const h = ready(), id = item(h);
  assert.equal(move(h, id, 'RECEIVE', 5).ok, true);
  const before = h.sheets.get('Movements').rows.length;
  assert.equal(move(h, id, 'RECEIVE', 5).data.repeated, true);
  assert.equal(move(h, id, 'RECEIVE', 6).code, 'DUPLICATE');
  assert.equal(move(h, id, 'ISSUE', 6, '22222222-2222-4222-8222-222222222222').code, 'STOCK');
  assert.equal(h.sheets.get('Movements').rows.length, before);
});

test('reject duplicate item code and unit change after history', () => {
  const h = ready(), id = item(h);
  assert.equal(h.app.saveItem({ code: 'us-01', name: 'ซ้ำ', unit: 'เครื่อง' }).code, 'DUPLICATE');
  move(h, id, 'RECEIVE', 1);
  assert.equal(h.app.saveItem({ id, code: 'US-01', name: 'ใหม่', unit: 'ชิ้น' }).code, 'INPUT');
});

test('stock opens without a team code property or credential', () => {
  const h = createHarness({ properties: { APP_ENV: 'stock', TEAM_ACCESS_CODE: '' } });
  assert.equal(h.app.setupStock_().ready, true);
  assert.equal(h.app.listStock().ok, true);
  assert.equal(h.app.saveItem({ code: 'US-01', name: 'อัลตราซาวด์', unit: 'เครื่อง' }).ok, true);
});

test('two different items can be created sequentially without reusing the first ID', () => {
  const h = ready();
  const first = h.app.saveItem({ id: '', code: 'US-01', name: 'อัลตราซาวด์', unit: 'เครื่อง' });
  const second = h.app.saveItem({ id: '', code: 'BP-02', name: 'เครื่องวัดความดัน', unit: 'เครื่อง' });
  assert.equal(first.ok, true, first.message);
  assert.equal(second.ok, true, second.message);
  assert.notEqual(first.data.id, second.data.id);
  assert.equal(h.app.listStock().data.items.length, 2);
});

test('reject future dates and issues that would make historical balance negative', () => {
  const h = ready(), id = item(h);
  const input = { itemId: id, type: 'ISSUE', quantity: 1, detail: '', operator: 'ผู้ทดสอบ' };
  assert.equal(h.app.saveMovement({ ...input, requestId: REQUEST_ID,
    date: '2999-01-01' }).code, 'INPUT');
  assert.equal(h.app.saveMovement({ ...input, type: 'RECEIVE', quantity: 5,
    requestId: REQUEST_ID, date: '2026-10-05' }).ok, true);
  assert.equal(h.app.saveMovement({ ...input,
    requestId: '22222222-2222-4222-8222-222222222222', date: '2026-10-06' }).ok, true);
  const before = h.sheets.get('Movements').rows.length;
  assert.equal(h.app.saveMovement({ ...input,
    requestId: '33333333-3333-4333-8333-333333333333', date: '2026-10-04' }).code, 'STOCK');
  assert.equal(h.sheets.get('Movements').rows.length, before);
});

test('period summary uses every movement and keeps units separate', () => {
  const h = ready(), first = item(h);
  const second = h.app.saveItem({ code: 'BP-02', name: 'เครื่องวัดความดัน', unit: 'ชิ้น' }).data.id;
  const base = { detail: '', operator: 'ผู้ทดสอบ', date: '2026-10-01' };
  const add = (itemId, type, quantity, requestId, date) =>
    h.app.saveMovement({ ...base, itemId, type, quantity, requestId, date });
  assert.equal(add(first, 'RECEIVE', 5, REQUEST_ID, '2026-09-30').ok, true);
  assert.equal(add(first, 'RECEIVE', 2, '22222222-2222-4222-8222-222222222222', '2026-10-01').ok, true);
  assert.equal(add(first, 'ISSUE', 1, '33333333-3333-4333-8333-333333333333', '2026-10-02').ok, true);
  assert.equal(add(second, 'OPENING', 4, '44444444-4444-4444-8444-444444444444', '2026-10-01').ok, true);
  const result = h.app.getSummary('2026-10-01', '2026-10-06');
  assert.equal(result.ok, true, result.message);
  assert.deepEqual(Array.from(result.data, row => [row.code, row.unit, row.opening, row.received, row.issued, row.closing]), [
    ['US-01', 'เครื่อง', 5, 2, 1, 6], ['BP-02', 'ชิ้น', 0, 4, 0, 4]
  ]);
  assert.equal(h.app.getSummary('2026-10-07', '2026-10-01').code, 'INPUT');
});

test('reversal appends one opposite row, retries safely, and updates summary', () => {
  const h = ready(), id = item(h);
  const received = move(h, id, 'RECEIVE', 5, REQUEST_ID);
  const issued = move(h, id, 'ISSUE', 2, '22222222-2222-4222-8222-222222222222');
  assert.equal(received.ok, true); assert.equal(issued.ok, true);
  const input = { requestId: '33333333-3333-4333-8333-333333333333',
    movementId: issued.data.id, reason: 'บันทึกจ่ายผิด', operator: 'ผู้ทดสอบ' };
  const reversed = h.app.reverseMovement(input);
  assert.equal(reversed.ok, true, reversed.message);
  assert.equal(reversed.data.balance, 5);
  assert.equal(reversed.data.snapshot.items[0].balance, 5);
  assert.equal(reversed.data.snapshot.movements.find(row => row.id === issued.data.id).reversed, true);
  assert.equal(h.app.reverseMovement(input).data.repeated, true);
  assert.equal(h.app.reverseMovement({ ...input,
    requestId: '44444444-4444-4444-8444-444444444444' }).code, 'DUPLICATE');
  assert.equal(h.sheets.get('Movements').rows.length, 4);
  const state = h.app.listStock().data;
  assert.equal(state.items[0].balance, 5);
  assert.equal(state.movements.find(row => row.id === issued.data.id).reversed, true);
  const report = h.app.getSummary('2026-10-01', '2026-10-06').data[0];
  assert.deepEqual([report.received, report.issued, report.correction, report.closing], [5, 2, 2, 5]);
});

test('reversing a receipt that would make stock negative does not write', () => {
  const h = ready(), id = item(h);
  const received = move(h, id, 'RECEIVE', 5, REQUEST_ID);
  move(h, id, 'ISSUE', 4, '22222222-2222-4222-8222-222222222222');
  const before = h.sheets.get('Movements').rows.length;
  const result = h.app.reverseMovement({
    requestId: '33333333-3333-4333-8333-333333333333', movementId: received.data.id,
    reason: 'รับผิด', operator: 'ผู้ทดสอบ'
  });
  assert.equal(result.code, 'STOCK');
  assert.equal(h.sheets.get('Movements').rows.length, before);
  assert.equal(h.app.listStock().data.items[0].balance, 1);
});

test('reversal retry after an unknown flush result returns the same row', () => {
  const options = { properties: { APP_ENV: 'stock' }, flushError: false };
  const h = createHarness(options);
  h.app.setupStock_();
  const id = item(h);
  const original = move(h, id, 'RECEIVE', 2, REQUEST_ID);
  const input = { requestId: '22222222-2222-4222-8222-222222222222',
    movementId: original.data.id, reason: 'รับซ้ำ', operator: 'ผู้ทดสอบ' };
  const sheet = h.sheets.get('Movements');
  const before = sheet.rows.length;
  options.flushError = true;
  const first = h.app.reverseMovement(input);
  assert.equal(first.code, 'SERVICE');
  assert.equal(sheet.rows.length, before + 1);
  const writtenId = sheet.rows[before][0];
  options.flushError = false;
  const repeated = h.app.reverseMovement(input);
  assert.equal(repeated.data.repeated, true);
  assert.equal(repeated.data.id, writtenId);
  assert.equal(sheet.rows.length, before + 1);
});
