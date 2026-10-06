const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');

// DOM/transport unit doubles, not a browser rendering or Google integration test.
function clientHarness(options = {}) {
  const elements = new Map();
  const calls = [];
  const storage = options.storage || new Map();
  const timers = new Map();
  let timerId = 0;
  let focus = null;
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', type: id === 'team-code' ? 'password' : '', textContent: '',
      disabled: false, dataset: {}, attributes: {}, handlers: {},
      setAttribute(key, value) { this.attributes[key] = value; },
      removeAttribute(key) { delete this.attributes[key]; },
      addEventListener(type, handler) { this.handlers[type] = handler; },
      focus() { focus = id; }
    });
    return elements.get(id);
  }
  function runner(success, failure) {
    const api = {
      withSuccessHandler: callback => runner(callback, failure),
      withFailureHandler: callback => runner(success, callback)
    };
    for (const method of ['runPocCheck', 'writePocProbe', 'getPocProbe']) {
      api[method] = (...args) => calls.push({ method, args, success, failure });
    }
    return api;
  }
  const google = { script: { run: runner() } };
  const context = vm.createContext({
    document: { getElementById: element }, window: options.noGoogle ? {} : { google }, google,
    crypto: { randomUUID }, Intl, Date,
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem(key, value) { if (options.storageError) throw new Error('denied'); storage.set(key, value); },
      removeItem: key => storage.delete(key)
    },
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id)
  });
  const code = fs.readFileSync(path.join(__dirname, '../src/Client.html'), 'utf8')
    .replace(/^<script>\s*|\s*<\/script>\s*$/g, '');
  vm.runInContext(code, context);
  return {
    element, calls, storage,
    get focus() { return focus; },
    click(id) { const el = element(id); if (!el.disabled) el.handlers.click.call(el, {}); },
    submit() { element('access-form').handlers.submit({ preventDefault() {} }); },
    timeout() { [...timers.values()].forEach(callback => callback()); }
  };
}

test('empty credential focuses associated error; preview cannot claim Google success', () => {
  const h = clientHarness({ noGoogle: true });
  h.submit();
  assert.equal(h.focus, 'team-code');
  assert.equal(h.element('team-code').attributes['aria-invalid'], 'true');
  assert.equal(h.calls.length, 0);
  h.element('team-code').value = 'fixture';
  h.submit();
  assert.match(h.element('status').textContent, /Apps Script/);
});

test('duplicate clicks blocked; timeout and reload preserve ID; stale callback ignored', () => {
  const h = clientHarness();
  h.element('team-code').value = 'fixture';
  h.click('write-button');
  h.click('write-button');
  assert.equal(h.calls.length, 1);
  const id = h.calls[0].args[1];
  h.timeout();
  assert.equal(h.element('new-button').disabled, true);
  h.click('write-button');
  assert.equal(h.calls[1].args[1], id);
  h.calls[0].success({ ok: true, data: { probe: { probeId: 'stale' } } });
  assert.notEqual(h.element('write-result').textContent, 'พบรายการ: stale');
  h.calls[1].success({ ok: true, data: { probe: { probeId: 'confirmed' }, repeated: true } });
  assert.equal(h.element('new-button').disabled, false);
  const reloaded = clientHarness({ storage: h.storage });
  assert.equal(reloaded.element('request-result').textContent, id);
  assert.equal(reloaded.element('new-button').disabled, true);
  assert.equal(reloaded.element('team-code').value, '');
  assert.deepEqual([...h.storage.values()], [id]);
});

test('failure and not-found keep same request pending until server confirms', () => {
  const h = clientHarness();
  h.element('team-code').value = 'fixture';
  h.click('write-button');
  h.calls[0].failure(new Error('secret should never be shown'));
  assert.doesNotMatch(h.element('status').textContent, /secret/);
  h.click('lookup-button');
  h.calls[1].success({ ok: true, data: { probe: null } });
  assert.equal(h.element('new-button').disabled, true);
  h.click('write-button');
  assert.equal(h.calls[2].args[1], h.calls[0].args[1]);
  h.calls[2].success({ ok: true, data: { probe: { probeId: 'known' } } });
  h.click('new-button');
  assert.equal(h.storage.size, 0);
  h.click('write-button');
  assert.notEqual(h.calls[3].args[1], h.calls[0].args[1]);
});

test('storage failure blocks mutation; authentication failures associate field error', () => {
  const h = clientHarness({ storageError: true });
  h.element('team-code').value = 'fixture';
  h.click('write-button');
  assert.equal(h.calls.length, 0);
  h.submit();
  h.calls[0].success({ ok: false, code: 'AUTH', message: 'รหัสทีมไม่ถูกต้อง' });
  assert.equal(h.element('field-error').textContent, 'รหัสทีมไม่ถูกต้อง');
  assert.equal(h.focus, 'team-code');
});

test('empty success, unavailable email, literal text rendering and clear credential', () => {
  const h = clientHarness();
  h.element('team-code').value = 'fixture';
  h.submit();
  h.calls[0].success({ ok: true, data: {
    message: '<img onerror=bad>', timeZone: 'Asia/Bangkok', observedEmail: '',
    probeCount: 0, checkedAt: '2026-10-06T00:00:00.000Z'
  } });
  assert.match(h.element('read-result').textContent, /<img onerror=bad>/);
  assert.match(h.element('status').textContent, /ยังไม่มีรายการ/);
  assert.match(h.element('email-result').textContent, /ไม่ส่งอีเมล/);
  h.click('toggle-code');
  assert.equal(h.element('team-code').type, 'text');
  h.click('clear-code');
  assert.equal(h.element('team-code').value, '');
  assert.equal(h.element('team-code').type, 'password');
});
