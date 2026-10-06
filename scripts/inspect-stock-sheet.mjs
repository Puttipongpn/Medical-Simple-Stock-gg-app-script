// Read-only diagnostic. Prints counts and value types, never cell contents or tokens.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const id = process.argv[2];
if (!/^[A-Za-z0-9_-]{20,}$/.test(id || '')) throw new Error('Spreadsheet ID required');
const claspRoot = path.join(process.env.APPDATA, 'npm/node_modules/@google/clasp');
const { initAuth } = await import(pathToFileURL(path.join(claspRoot, 'build/src/auth/auth.js')));
const { credentials } = await initAuth({});
if (!credentials) throw new Error('clasp login required');
try {
  const response = await credentials.request({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values:batchGet`,
    params: { ranges: ['Items!A1:F1000', 'Movements!A1:M1000'], valueRenderOption: 'UNFORMATTED_VALUE' }
  });
  for (const valueRange of response.data.valueRanges || []) {
    const rows = valueRange.values || [];
    console.log(JSON.stringify({
      range: valueRange.range, count: Math.max(0, rows.length - 1),
      headerColumns: rows[0]?.length || 0,
      rowShapes: rows.slice(1).map(row => row.length),
      fieldTypes: rows.slice(1).map(row => row.map(value => typeof value))
    }));
  }
} catch (error) {
  console.error('Read-only sheet inspection failed. HTTP status:', error.response?.status || 'unavailable');
  process.exitCode = 1;
}
