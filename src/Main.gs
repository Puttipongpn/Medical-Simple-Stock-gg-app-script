function doGet() {
  return HtmlService.createTemplateFromFile('StockIndex').evaluate()
    .setTitle('คลังอุปกรณ์การแพทย์')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include_(filename) {
  if (['Styles', 'Client', 'StockStyles', 'StockClient'].indexOf(filename) < 0) throw new Error('Unknown template');
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Shared code authorizes access; observed email is diagnostic evidence only. */
function runPocCheck(credential) {
  return response_(function () {
    var config = getConfig_();
    authorize_(credential, config);
    return withScriptLock_(function () {
      var spreadsheet = openPocSpreadsheet_(config);
      var rows = readPocRows_(getPocSheet_(spreadsheet));
      var email = '';
      try { email = Session.getActiveUser().getEmail() || ''; } catch (ignored) { /* May be unavailable. */ }
      return {
        checkedAt: new Date().toISOString(),
        timeZone: spreadsheet.getSpreadsheetTimeZone(),
        observedEmail: email,
        authentication: 'TEAM_CODE',
        probeCount: rows.length,
        message: 'อ่านแท็บทดสอบสำเร็จ'
      };
    });
  });
}

/** Fixed marker only; this endpoint does not accept stock or arbitrary text. */
function writePocProbe(credential, requestId) {
  return response_(function () {
    var config = getConfig_();
    authorize_(credential, config);
    requestId = validateRequestId_(requestId);
    return withScriptLock_(function () {
      var sheet = getPocSheet_(openPocSpreadsheet_(config));
      var rows = readPocRows_(sheet);
      var existing = rows.find(function (row) { return row.requestId === requestId; });
      if (existing) return { probe: existing, repeated: true };
      var probe = {
        probeId: Utilities.getUuid(), requestId: requestId,
        createdAt: new Date().toISOString(), kind: POC_KIND_
      };
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, POC_HEADERS_.length)
        .setNumberFormat('@')
        .setValues([[probe.probeId, probe.requestId, probe.createdAt, probe.kind]]);
      return { probe: probe, repeated: false };
    });
  });
}

function getPocProbe(credential, requestId) {
  return response_(function () {
    var config = getConfig_();
    authorize_(credential, config);
    requestId = validateRequestId_(requestId);
    return withScriptLock_(function () {
      var rows = readPocRows_(getPocSheet_(openPocSpreadsheet_(config)));
      return { probe: rows.find(function (row) { return row.requestId === requestId; }) || null };
    });
  });
}
