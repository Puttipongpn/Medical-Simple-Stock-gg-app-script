/** Server-only configuration. Never return this object to the browser. */
function getConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var config = {
    environment: properties.getProperty('APP_ENV'),
    spreadsheetId: properties.getProperty('SPREADSHEET_ID'),
    teamCode: properties.getProperty('TEAM_ACCESS_CODE')
  };
  if (['poc', 'stock'].indexOf(config.environment) < 0 ||
      !/^[A-Za-z0-9_-]{20,}$/.test(config.spreadsheetId || '') ||
      (config.environment === 'poc' &&
        (typeof config.teamCode !== 'string' || config.teamCode.length < 5 ||
         config.teamCode.length > 256))) {
    fail_('CONFIG', 'ผู้ดูแลต้องตั้งค่า Script Properties สำหรับไฟล์ทดสอบให้ครบก่อน');
  }
  return config;
}

function authorize_(credential, config) {
  if (typeof credential !== 'string' || credential.length > 256) {
    fail_('AUTH', 'รหัสทีมไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่');
  }
  var difference = credential.length ^ config.teamCode.length;
  for (var i = 0; i < config.teamCode.length; i += 1) {
    difference |= config.teamCode.charCodeAt(i) ^ (credential.charCodeAt(i) || 0);
  }
  if (difference !== 0) fail_('AUTH', 'รหัสทีมไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่');
}

function fail_(code, message) {
  var error = new Error(message);
  error.publicCode = code;
  throw error;
}

/** Never expose raw Google errors, configuration, or submitted credentials. */
function response_(operation) {
  try {
    return { ok: true, data: operation() };
  } catch (error) {
    return {
      ok: false,
      code: error.publicCode || 'SERVICE',
      message: error.publicCode ? error.message :
        'เชื่อมต่อบริการไม่สำเร็จ ให้ผู้ดูแลตรวจสิทธิ์และการตั้งค่า แล้วลองตรวจผลอีกครั้ง'
    };
  }
}
