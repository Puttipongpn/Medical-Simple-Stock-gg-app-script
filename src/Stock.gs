var ITEM_HEADERS_ = ['item_id', 'item_code', 'name', 'unit', 'active', 'created_at'];
var MOVEMENT_HEADERS_ = ['movement_id', 'request_id', 'payload', 'occurred_date', 'created_at',
  'item_id', 'item_code', 'item_name', 'unit', 'type', 'quantity_delta', 'detail', 'operator'];

function stockBook_() {
  var config = getConfig_();
  if (config.environment !== 'stock') fail_('CONFIG', 'ผู้ดูแลต้องตั้ง APP_ENV เป็น stock');
  var book = SpreadsheetApp.openById(config.spreadsheetId);
  if (Session.getScriptTimeZone() !== 'Asia/Bangkok' ||
      book.getSpreadsheetTimeZone() !== 'Asia/Bangkok') fail_('TIMEZONE', 'ตั้งเขตเวลา Script และ Sheet เป็น Asia/Bangkok');
  return book;
}

function stockSheet_(book, name, headers) {
  var sheet = book.getSheetByName(name);
  if (!sheet) fail_('SETUP', 'ให้เจ้าของรัน setupStock_ ก่อนใช้งาน');
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() !== headers.length) fail_('SCHEMA', 'โครงสร้าง Sheet ไม่ตรง');
  var range = sheet.getRange(1, 1, sheet.getLastRow(), headers.length);
  var values = range.getValues();
  if (JSON.stringify(values[0]) !== JSON.stringify(headers) ||
      range.getFormulas().some(function (row) { return row.some(Boolean); })) {
    fail_('INTEGRITY', 'พบหัวตารางไม่ตรงหรือสูตรในข้อมูล กรุณาให้ผู้ดูแลตรวจสอบ');
  }
  return { sheet: sheet, rows: values.slice(1) };
}

function textField_(value, name, limit, required) {
  if (typeof value !== 'string') fail_('INPUT', name + 'ไม่ถูกต้อง');
  var clean = value.trim();
  if ((required && !clean) || clean.length > limit || /^[=+@\-\t\r]/.test(clean)) fail_('INPUT', name + 'ไม่ถูกต้อง');
  return clean;
}

function stockState_(book) {
  var itemData = stockSheet_(book, 'Items', ITEM_HEADERS_);
  var movementData = stockSheet_(book, 'Movements', MOVEMENT_HEADERS_);
  var itemRows = itemData.rows, movementRows = movementData.rows;
  var byId = Object.create(null), byCode = Object.create(null), requests = Object.create(null);
  var movementIds = Object.create(null), reversedIds = Object.create(null);
  var items = itemRows.map(function (row) {
    if (!isUuid_(row[0]) || typeof row[1] !== 'string' || !row[1] ||
        typeof row[2] !== 'string' || !row[2] || typeof row[3] !== 'string' || !row[3] ||
        (row[4] !== 'TRUE' && row[4] !== 'FALSE') || byId[row[0]] || byCode[row[1].toLowerCase()]) {
      fail_('INTEGRITY', 'ข้อมูลอุปกรณ์ผิดรูปแบบหรือรหัสซ้ำ');
    }
    var item = { id: row[0], code: row[1], name: row[2], unit: row[3],
      active: row[4] === 'TRUE', balance: 0 };
    byId[item.id] = item; byCode[item.code.toLowerCase()] = item;
    return item;
  });
  var movements = movementRows.map(function (row) {
    if (!isUuid_(row[0]) || movementIds[row[0]] || !isUuid_(row[1]) || requests[row[1]] ||
        typeof row[2] !== 'string' || !row[2] || !/^\d{4}-\d{2}-\d{2}$/.test(row[3]) ||
        typeof row[4] !== 'string' || !Number.isFinite(Date.parse(row[4])) ||
        !byId[row[5]] || !Number.isSafeInteger(row[10]) || row[10] === 0 ||
        ['OPENING', 'RECEIVE', 'ISSUE', 'REVERSAL'].indexOf(row[9]) < 0 ||
        (row[9] === 'ISSUE' && row[10] >= 0) ||
        (['OPENING', 'RECEIVE'].indexOf(row[9]) >= 0 && row[10] <= 0)) {
      fail_('INTEGRITY', 'ประวัติ stock ผิดรูปแบบหรือ request ID ซ้ำ');
    }
    var reversesId = '';
    if (row[9] === 'REVERSAL') {
      var parsed;
      try { parsed = JSON.parse(row[2]); } catch (ignored) { /* Rejected below. */ }
      reversesId = Array.isArray(parsed) && parsed[0] === 'REVERSAL' ? parsed[1] : '';
      var target = movementIds[reversesId];
      if (!isUuid_(reversesId) || !target || target.type === 'REVERSAL' ||
          reversedIds[reversesId] || target.itemId !== row[5] ||
          row[10] !== -target.delta || row[3] < target.date ||
          row[6] !== target.code || row[7] !== target.name || row[8] !== target.unit ||
          typeof row[11] !== 'string' || !row[11] || parsed[2] !== row[11] ||
          parsed[3] !== row[12]) {
        fail_('INTEGRITY', 'ข้อมูลกลับรายการไม่ตรงกับรายการต้นทาง');
      }
      reversedIds[reversesId] = true;
      target.reversed = true;
    }
    requests[row[1]] = row; movementIds[row[0]] = true;
    byId[row[5]].balance += row[10];
    if (!Number.isSafeInteger(byId[row[5]].balance) || byId[row[5]].balance < 0) {
      fail_('INTEGRITY', 'ยอดคงเหลือจากประวัติผิดปกติ');
    }
    var movement = { id: row[0], requestId: row[1], date: row[3], createdAt: row[4],
      itemId: row[5], code: row[6], name: row[7], unit: row[8], type: row[9],
      quantity: Math.abs(row[10]), delta: row[10], detail: row[11], operator: row[12],
      reversesId: reversesId, reversed: false };
    movementIds[row[0]] = movement;
    return movement;
  });
  var historical = Object.create(null);
  movements.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).forEach(function (move) {
    var balance = (historical[move.itemId] || 0) + move.delta;
    if (balance < 0) fail_('INTEGRITY', 'พบยอดย้อนหลังติดลบ กรุณาให้ผู้ดูแลตรวจสอบ');
    historical[move.itemId] = balance;
  });
  return { items: items, byId: byId, byCode: byCode, movements: movements,
    requests: requests, itemData: itemData, movementData: movementData };
}

function stockSnapshot_(state) {
  return { items: state.items, movements: state.movements.slice(-100).reverse() };
}

function listStock() {
  return response_(function () {
    return withScriptLock_(function () {
      var state = stockState_(stockBook_());
      return stockSnapshot_(state);
    });
  });
}

/** A small per-item period summary, calculated from all movement rows. */
function getSummary(startDate, endDate) {
  return response_(function () {
    [startDate, endDate].forEach(function (date) {
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date + 'T00:00:00Z')) ||
          new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) {
        fail_('INPUT', 'ช่วงวันที่ไม่ถูกต้อง');
      }
    });
    if (startDate > endDate || endDate > Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd')) {
      fail_('INPUT', 'ช่วงวันที่ไม่ถูกต้อง');
    }
    return withScriptLock_(function () {
      var state = stockState_(stockBook_());
      var summary = state.items.map(function (item) {
        return { code: item.code, name: item.name, unit: item.unit,
          opening: 0, received: 0, issued: 0, correction: 0, closing: 0, id: item.id };
      });
      var byId = Object.create(null);
      summary.forEach(function (row) { byId[row.id] = row; });
      state.movements.forEach(function (move) {
        var row = byId[move.itemId];
        if (move.date < startDate) row.opening += move.delta;
        else if (move.date <= endDate) {
          if (move.type === 'REVERSAL') row.correction += move.delta;
          else if (move.type === 'ISSUE') row.issued += move.quantity;
          else row.received += move.quantity;
        }
      });
      return summary.map(function (row) {
        row.closing = row.opening + row.received - row.issued + row.correction;
        delete row.id;
        return row;
      });
    });
  });
}

function saveItem(input) {
  return response_(function () {
    input = input || {};
    var code = textField_(input.code, 'รหัสอุปกรณ์', 40, true);
    var name = textField_(input.name, 'ชื่ออุปกรณ์', 120, true);
    var unit = textField_(input.unit, 'หน่วยนับ', 30, true);
    var id = input.id || '';
    if (id && !isUuid_(id)) fail_('INPUT', 'รหัสรายการอุปกรณ์ไม่ถูกต้อง');
    return withScriptLock_(function () {
      var book = stockBook_(), state = stockState_(book), existing = id && state.byId[id];
      if (id && !existing) fail_('INPUT', 'ไม่พบอุปกรณ์ที่จะแก้ไข');
      var duplicate = state.byCode[code.toLowerCase()];
      if (duplicate && duplicate.id !== id) fail_('DUPLICATE', 'รหัสอุปกรณ์นี้มีแล้ว');
      var data = state.itemData;
      if (existing) {
        if (state.movements.some(function (move) { return move.itemId === id; }) && existing.unit !== unit) {
          fail_('INPUT', 'เปลี่ยนหน่วยนับไม่ได้เมื่อมีประวัติแล้ว');
        }
        var row = data.rows.findIndex(function (value) { return value[0] === id; }) + 2;
        data.sheet.getRange(row, 2, 1, 3).setNumberFormat('@').setValues([[code, name, unit]]);
        existing.code = code; existing.name = name; existing.unit = unit;
        return { id: id, updated: true, snapshot: stockSnapshot_(state) };
      }
      id = Utilities.getUuid();
      data.sheet.getRange(data.sheet.getLastRow() + 1, 1, 1, ITEM_HEADERS_.length)
        .setNumberFormat('@').setValues([[id, code, name, unit, 'TRUE', new Date().toISOString()]]);
      state.items.push({ id: id, code: code, name: name, unit: unit, active: true, balance: 0 });
      return { id: id, updated: false, snapshot: stockSnapshot_(state) };
    });
  });
}

function saveMovement(input) {
  return response_(function () {
    input = input || {};
    var requestId = validateRequestId_(input.requestId);
    var itemId = textField_(input.itemId, 'อุปกรณ์', 40, true);
    var type = input.type;
    if (['OPENING', 'RECEIVE', 'ISSUE'].indexOf(type) < 0) fail_('INPUT', 'ประเภทรายการไม่ถูกต้อง');
    var quantity = Number(input.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) fail_('INPUT', 'จำนวนต้องเป็นจำนวนเต็มบวก');
    var date = textField_(input.date, 'วันที่', 10, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date + 'T00:00:00Z')) ||
        new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) fail_('INPUT', 'วันที่ไม่ถูกต้อง');
    if (date > Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd')) {
      fail_('INPUT', 'วันที่รายการต้องไม่เป็นวันในอนาคต');
    }
    var detail = textField_(input.detail || '', 'รายละเอียด', 200, false);
    var operator = textField_(input.operator, 'ผู้บันทึก', 80, true);
    var payload = JSON.stringify([itemId, type, quantity, date, detail, operator]);
    return withScriptLock_(function () {
      var book = stockBook_(), state = stockState_(book), existing = state.requests[requestId];
      if (existing) {
        if (existing[2] !== payload) fail_('DUPLICATE', 'รหัสคำขอนี้เคยใช้กับข้อมูลอื่น');
        return { id: existing[0], repeated: true, balance: state.byId[itemId] ? state.byId[itemId].balance : null,
          snapshot: stockSnapshot_(state) };
      }
      var item = state.byId[itemId];
      if (!item || !item.active) fail_('INPUT', 'ไม่พบอุปกรณ์ที่ใช้งานได้');
      if (type === 'OPENING' && state.movements.some(function (move) { return move.itemId === itemId; })) {
        fail_('INPUT', 'ยอดเริ่มต้นต้องเป็นรายการแรกของอุปกรณ์');
      }
      if (type === 'ISSUE' && quantity > item.balance) fail_('STOCK', 'ยอดคงเหลือไม่พอจ่าย');
      if (type === 'ISSUE') {
        var dated = state.movements.filter(function (move) { return move.itemId === itemId; });
        dated.push({ date: date, type: type, quantity: quantity });
        dated.sort(function (a, b) { return a.date.localeCompare(b.date); });
        var datedBalance = 0;
        dated.forEach(function (move) {
          datedBalance += move.delta === undefined ? -move.quantity : move.delta;
          if (datedBalance < 0) fail_('STOCK', 'วันที่นี้ทำให้ยอดย้อนหลังติดลบ');
        });
      }
      var delta = type === 'ISSUE' ? -quantity : quantity, id = Utilities.getUuid();
      var sheet = state.movementData.sheet;
      var targetRow = sheet.getLastRow() + 1;
      sheet.getRange(targetRow, 1, 1, MOVEMENT_HEADERS_.length).setNumberFormat('@');
      sheet.getRange(targetRow, 11).setNumberFormat('0');
      var createdAt = new Date().toISOString();
      sheet.getRange(targetRow, 1, 1, MOVEMENT_HEADERS_.length)
        .setValues([[id, requestId, payload, date, createdAt, item.id,
          item.code, item.name, item.unit, type, delta, detail, operator]]);
      item.balance += delta;
      state.movements.push({ id: id, requestId: requestId, date: date, createdAt: createdAt,
        itemId: item.id, code: item.code, name: item.name, unit: item.unit, type: type,
        quantity: quantity, delta: delta, detail: detail, operator: operator,
        reversesId: '', reversed: false });
      return { id: id, repeated: false, balance: item.balance, snapshot: stockSnapshot_(state) };
    });
  });
}

/** Append one opposite movement. The original row is never edited or deleted. */
function reverseMovement(input) {
  return response_(function () {
    input = input || {};
    var requestId = validateRequestId_(input.requestId);
    var targetId = input.movementId;
    if (!isUuid_(targetId)) fail_('INPUT', 'ไม่พบรายการที่ต้องการกลับ');
    var reason = textField_(input.reason, 'เหตุผล', 200, true);
    var operator = textField_(input.operator, 'ผู้บันทึก', 80, true);
    var payload = JSON.stringify(['REVERSAL', targetId, reason, operator]);
    return withScriptLock_(function () {
      var book = stockBook_(), state = stockState_(book);
      var existing = state.requests[requestId];
      if (existing) {
        if (existing[2] !== payload) fail_('DUPLICATE', 'รหัสคำขอนี้เคยใช้กับข้อมูลอื่น');
        return { id: existing[0], reversedId: targetId, repeated: true,
          balance: state.byId[existing[5]].balance, snapshot: stockSnapshot_(state) };
      }
      var target = state.movements.find(function (move) { return move.id === targetId; });
      if (!target || target.type === 'REVERSAL') fail_('INPUT', 'กลับรายการนี้ไม่ได้');
      if (target.reversed) fail_('DUPLICATE', 'รายการนี้ถูกกลับแล้ว');
      var item = state.byId[target.itemId], delta = -target.delta;
      if (item.balance + delta < 0) fail_('STOCK', 'ยอดคงเหลือไม่พอสำหรับกลับรายการนี้');
      var id = Utilities.getUuid(), date = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
      var sheet = state.movementData.sheet;
      var targetRow = sheet.getLastRow() + 1;
      sheet.getRange(targetRow, 1, 1, MOVEMENT_HEADERS_.length).setNumberFormat('@');
      sheet.getRange(targetRow, 11).setNumberFormat('0');
      var createdAt = new Date().toISOString();
      sheet.getRange(targetRow, 1, 1, MOVEMENT_HEADERS_.length).setValues([[
        id, requestId, payload, date, createdAt, target.itemId,
        target.code, target.name, target.unit, 'REVERSAL', delta, reason, operator
      ]]);
      item.balance += delta;
      target.reversed = true;
      state.movements.push({ id: id, requestId: requestId, date: date, createdAt: createdAt,
        itemId: target.itemId, code: target.code, name: target.name, unit: target.unit,
        type: 'REVERSAL', quantity: Math.abs(delta), delta: delta, detail: reason,
        operator: operator, reversesId: targetId, reversed: false });
      return { id: id, reversedId: targetId, repeated: false,
        balance: item.balance, snapshot: stockSnapshot_(state) };
    });
  });
}

/** Run in the editor only on a dedicated stock test workbook. Never clears existing cells. */
function setupStock_() {
  return withScriptLock_(function () {
    var book = stockBook_();
    [['Items', ITEM_HEADERS_], ['Movements', MOVEMENT_HEADERS_]].forEach(function (spec) {
      var sheet = book.getSheetByName(spec[0]);
      if (!sheet) sheet = book.insertSheet(spec[0]);
      if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, spec[1].length).setNumberFormat('@').setValues([spec[1]]);
        sheet.setFrozenRows(1);
      }
      stockSheet_(book, spec[0], spec[1]);
    });
    return { ready: true };
  });
}
