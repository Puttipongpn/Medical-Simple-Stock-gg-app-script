function openPocSpreadsheet_(config) {
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  if (Session.getScriptTimeZone() !== 'Asia/Bangkok' ||
      spreadsheet.getSpreadsheetTimeZone() !== 'Asia/Bangkok') {
    fail_('TIMEZONE', 'ตั้งเขตเวลาของ Script และ Spreadsheet เป็น Asia/Bangkok ก่อนทดสอบ');
  }
  return spreadsheet;
}

function getPocSheet_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName('POC_Checks');
  if (!sheet) fail_('SETUP', 'ยังไม่มีแท็บทดสอบ ให้เจ้าของรัน setupPoc_ ใน Apps Script ก่อน');
  return sheet;
}

function isUuid_(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateRequestId_(requestId) {
  if (!isUuid_(requestId)) fail_('REQUEST', 'รหัสคำขอไม่ถูกต้อง ให้เปิดหน้าเว็บทดสอบใหม่');
  return requestId.toLowerCase();
}

/** Read the entire small POC ledger; refuse malformed/duplicate records. */
function readPocRows_(sheet) {
  if (sheet.getLastColumn() !== POC_HEADERS_.length || sheet.getLastRow() < 1) {
    fail_('SCHEMA', 'โครงสร้างแท็บทดสอบไม่ตรง กรุณาให้ผู้ดูแลตรวจสอบโดยไม่ล้างข้อมูล');
  }
  var range = sheet.getRange(1, 1, sheet.getLastRow(), POC_HEADERS_.length);
  var rows = range.getValues();
  if (range.getFormulas().some(function (row) { return row.some(Boolean); })) {
    fail_('INTEGRITY', 'พบสูตรในแท็บทดสอบ หยุดเขียนและให้ผู้ดูแลตรวจสอบ');
  }
  if (JSON.stringify(rows[0]) !== JSON.stringify(POC_HEADERS_)) {
    fail_('SCHEMA', 'หัวคอลัมน์แท็บทดสอบไม่ตรง กรุณาให้ผู้ดูแลตรวจสอบ');
  }
  var ids = Object.create(null);
  var requests = Object.create(null);
  return rows.slice(1).map(function (row) {
    if (!isUuid_(row[0]) || !isUuid_(row[1]) ||
        typeof row[2] !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row[2]) ||
        !Number.isFinite(Date.parse(row[2])) ||
        new Date(row[2]).toISOString() !== row[2] || row[3] !== POC_KIND_ ||
        ids[String(row[0]).toLowerCase()] || requests[String(row[1]).toLowerCase()]) {
      fail_('INTEGRITY', 'รายการทดสอบไม่ครบหรือมี ID ซ้ำ หยุดเขียนและให้ผู้ดูแลตรวจสอบ');
    }
    ids[row[0].toLowerCase()] = true;
    requests[row[1].toLowerCase()] = true;
    return { probeId: row[0], requestId: row[1].toLowerCase(), createdAt: row[2], kind: row[3] };
  });
}

function withScriptLock_(operation) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) fail_('BUSY', 'มีผู้อื่นกำลังทดสอบ กรุณาลองใหม่ด้วยรหัสคำขอเดิม');
  try {
    return operation();
  } finally {
    try {
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
  }
}
