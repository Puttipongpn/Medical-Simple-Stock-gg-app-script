const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');

// Synthetic fixtures only. These are not credentials for a real deployment.
const TEST_CODE = 'fixture-only-not-a-deployed-secret';
const REQUEST_ID = '11111111-1111-4111-8111-111111111111';

function createHarness(options = {}) {
  const calls = { open: 0, reads: 0, formulaReads: 0, writes: 0, release: 0, flush: 0, lock: 0, events: [] };
  const properties = {
    APP_ENV: 'poc', SPREADSHEET_ID: 'fixture-spreadsheet-identifier', TEAM_ACCESS_CODE: TEST_CODE,
    ...options.properties
  };
  const sheets = new Map();
  function createSheet(name) {
    const sheet = {
      rows: [], formulas: false,
      getLastRow() { return this.rows.length; },
      getLastColumn() { return Math.max(0, ...this.rows.map(row => row.length)); },
      setFrozenRows() {},
      getRange(start, column, count, width) {
        return {
          getValues: () => { calls.reads++; return Array.from({ length: count }, (_, i) =>
            Array.from({ length: width }, (_, j) => sheet.rows[start - 1 + i]?.[column - 1 + j] ?? '')); },
          getFormulas: () => { calls.formulaReads++; return Array.from({ length: count }, () =>
            Array.from({ length: width }, () => sheet.formulas ? '=1' : '')); },
          setNumberFormat() { return this; },
          setValues(values) {
            if (options.writeError) throw new Error('private service diagnostics');
            calls.writes++;
            calls.events.push('write');
            values.forEach((row, i) => { sheet.rows[start - 1 + i] = [...row]; });
            return this;
          }
        };
      }
    };
    sheets.set(name, sheet);
    return sheet;
  }
  const spreadsheet = {
    getSheetByName: name => sheets.get(name) || null,
    insertSheet: createSheet,
    getSpreadsheetTimeZone: () => options.sheetTimezone || 'Asia/Bangkok'
  };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key] ?? null }) },
    SpreadsheetApp: {
      openById() { calls.open++; if (options.openError) throw new Error('private-file-id'); return spreadsheet; },
      flush() { calls.flush++; calls.events.push('flush'); if (options.flushError) throw new Error('flush failed'); }
    },
    Session: {
      getScriptTimeZone: () => options.scriptTimezone || 'Asia/Bangkok',
      getActiveUser: () => ({ getEmail: () => {
        if (options.emailError) throw new Error('unavailable');
        return options.email || '';
      } })
    },
    Utilities: { getUuid: randomUUID, formatDate: date =>
      new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) },
    LockService: { getScriptLock: () => ({
      tryLock(timeout) { calls.lock++; calls.events.push('lock'); calls.timeout = timeout; return !options.lockTimeout; },
      releaseLock() { calls.release++; calls.events.push('release'); }
    }) }
  });
  for (const name of fs.readdirSync(path.join(__dirname, '../src')).filter(name => name.endsWith('.gs'))) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', name), 'utf8'), context, { filename: name });
  }
  return { app: context, calls, sheets, createSheet, properties };
}
module.exports = { createHarness, TEST_CODE, REQUEST_ID };
