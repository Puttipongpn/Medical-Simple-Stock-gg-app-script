const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness() {
  const elements = new Map(), calls = [], storage = new Map(), documentHandlers = {}, timers = [];
  function node(tag = 'div') {
    return {
      tag, value: '', textContent: '', dataset: {}, children: [], handlers: {}, disabled: false,
      classList: { toggle() {} },
      addEventListener(type, fn) { this.handlers[type] = fn; },
      append(...children) { this.children.push(...children); },
      replaceChildren() { this.children = []; },
      reset() { /* Reproduce hidden input state persisting across form reset. */ },
      focus() {}
    };
  }
  function get(id) { if (!elements.has(id)) elements.set(id, node()); return elements.get(id); }
  const nav = Array.from({ length: 4 }, () => node('button'));
  const views = Array.from({ length: 4 }, () => node('section'));
  function runner(success, failure) {
    const api = {
      withSuccessHandler(fn) { return runner(fn, failure); },
      withFailureHandler(fn) { return runner(success, fn); }
    };
    for (const method of ['listStock', 'saveItem', 'saveMovement', 'getSummary', 'reverseMovement']) {
      api[method] = function (...args) { calls.push({ method, args, success, failure }); };
    }
    return api;
  }
  const context = vm.createContext({
    document: {
      getElementById: get, createElement: node,
      visibilityState: 'visible', addEventListener(type, fn) { documentHandlers[type] = fn; },
      querySelectorAll(selector) { return selector === 'nav button' ? nav : selector === '.view' ? views : []; }
    },
    google: { script: { run: runner() } },
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    },
    Date, JSON, setInterval: (fn, delay) => timers.push({ fn, delay }),
    crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' }
  });
  const source = fs.readFileSync(path.join(__dirname, '../src/StockClient.html'), 'utf8')
    .replace(/^<script>\s*|\s*<\/script>\s*$/g, '');
  vm.runInContext(source, context);
  return { get, calls, storage, timers, documentHandlers, context, click(id) { get(id).handlers.click({}); },
    submit(id) { get(id).handlers.submit({ preventDefault() {} }); } };
}

test('switching from edit to add clears the hidden item ID', () => {
  const h = harness();
  h.calls[0].success({ ok: true, data: { items: [
    { id: 'first-id', code: 'US-01', name: 'เครื่องแรก', unit: 'เครื่อง', active: true, balance: 1 }
  ], movements: [] } });
  h.get('items-list').children[0].children[0].handlers.click();
  assert.equal(h.get('item-id').value, 'first-id');
  assert.match(h.get('item-mode').textContent, /กำลังแก้ไข/);
  h.click('item-clear');
  assert.equal(h.get('item-id').value, '');
  h.get('item-code').value = 'BP-02';
  h.get('item-name').value = 'เครื่องที่สอง';
  h.get('item-unit').value = 'ชิ้น';
  h.submit('item-form');
  assert.equal(h.calls[1].method, 'saveItem');
  assert.equal(h.calls[1].args[0].id, '');
});

test('history reversal submits the selected row once and keeps its retry ID', () => {
  const h = harness();
  h.calls[0].success({ ok: true, data: { items: [], movements: [
    { id: '11111111-1111-4111-8111-111111111111', itemId: 'item-1',
      code: 'US-01', name: 'เครื่องแรก', unit: 'เครื่อง', date: '2026-10-06',
      type: 'RECEIVE', quantity: 5, delta: 5, detail: '', operator: 'ผู้ทดสอบ', reversed: false }
  ] } });
  const row = h.get('history-list').children[0];
  assert.equal(row.children[6].children[0].textContent, 'ยกเลิก');
  row.children[6].children[0].handlers.click();
  assert.equal(h.get('reversal-form').hidden, false);
  h.get('reversal-reason').value = 'บันทึกผิด';
  h.get('reversal-operator').value = 'ผู้ทดสอบ';
  h.submit('reversal-form');
  assert.equal(h.calls[1].method, 'reverseMovement');
  assert.equal(h.calls[1].args[0].movementId, '11111111-1111-4111-8111-111111111111');
  assert.equal(h.storage.size, 1);
  h.calls[1].failure(new Error('network'));
  h.submit('reversal-form');
  assert.equal(h.calls[2].args[0].requestId, h.calls[1].args[0].requestId);
  h.calls[2].success({ ok: true, data: { balance: 0 } });
  assert.equal(h.storage.size, 0);
  assert.equal(h.get('reversal-form').hidden, true);
});

test('successful movement uses the server snapshot without another read request', () => {
  const h = harness();
  const equipment = { id: 'item-1', code: 'US-01', name: 'เครื่องแรก', unit: 'เครื่อง', active: true, balance: 0 };
  h.calls[0].success({ ok: true, data: { items: [equipment], movements: [] } });
  h.get('movement-item').value = 'item-1';
  h.get('type').value = 'RECEIVE';
  h.get('quantity').value = '5';
  h.get('date').value = '2026-10-06';
  h.get('operator').value = 'ผู้ทดสอบ';
  h.submit('movement-form');
  assert.equal(h.calls[1].method, 'saveMovement');
  h.calls[1].success({ ok: true, data: { repeated: false, balance: 5,
    snapshot: { items: [{ ...equipment, balance: 5 }], movements: [] } } });
  assert.equal(h.calls.length, 2);
  assert.match(h.get('balances-list').children[0].children[2].textContent, /5 เครื่อง/);
  assert.equal(h.storage.size, 0);
  assert.equal(h.timers[0].delay, 30000);
});

test('background refresh waits for 30 seconds and skips hidden tabs or pending writes', () => {
  const h = harness();
  h.calls[0].success({ ok: true, data: { items: [], movements: [] } });
  const future = Date.now() + 31000;
  h.context.Date = class extends Date { static now() { return future; } };
  h.context.document.visibilityState = 'hidden';
  h.timers[0].fn();
  assert.equal(h.calls.length, 1);
  h.context.document.visibilityState = 'visible';
  h.storage.set('medical-stock.pending-movement', 'pending');
  h.timers[0].fn();
  assert.equal(h.calls.length, 1);
  h.storage.clear();
  h.timers[0].fn();
  assert.equal(h.calls[1].method, 'listStock');
});

test('report displays received, issued, cancelled and closing without opening column', () => {
  const h = harness();
  h.calls[0].success({ ok: true, data: { items: [], movements: [] } });
  h.click('report-load');
  assert.equal(h.calls[1].method, 'getSummary');
  assert.equal(h.calls[1].args.length, 2);
  h.calls[1].success({ ok: true, data: [{ code: 'US-01', name: 'เครื่องแรก', unit: 'เครื่อง',
    opening: 3, received: 2, issued: 1, correction: -1, closing: 3 }] });
  const values = h.get('summary-list').children[0].children.map(cell => cell.textContent);
  assert.deepEqual(values, ['US-01 เครื่องแรก', '2 เครื่อง', '1 เครื่อง', '-1 เครื่อง', '3 เครื่อง']);
});
