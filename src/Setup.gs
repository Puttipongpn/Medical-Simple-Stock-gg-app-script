/** Owner runs in editor only; trailing underscore blocks google.script.run. */
function setupPoc_() {
  var config = getConfig_();
  return withScriptLock_(function () {
    var spreadsheet = openPocSpreadsheet_(config);
    // Never reuse a stock workbook as a POC workspace.
    Object.keys(SCHEMA_DRAFT_).forEach(function (name) {
      if (spreadsheet.getSheetByName(name)) {
        fail_('TEST_FILE', 'ใช้ไฟล์ทดสอบแยกที่ไม่มี Items, Departments, Operators หรือ Movements');
      }
    });
    var sheet = spreadsheet.getSheetByName('POC_Checks');
    if (!sheet) sheet = spreadsheet.insertSheet('POC_Checks');
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, POC_HEADERS_.length).setValues([POC_HEADERS_]);
      sheet.setFrozenRows(1);
    }
    readPocRows_(sheet);
    return { ready: true, message: 'พร้อมทดสอบ ไม่ได้สร้างหรือแก้ยอดคลัง' };
  });
}
