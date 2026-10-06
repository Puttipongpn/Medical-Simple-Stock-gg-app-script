// Deployment recovery only: use clasp's existing login without printing credentials.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const claspRoot = path.join(process.env.APPDATA, 'npm/node_modules/@google/clasp');
try {
  const { initAuth } = await import(pathToFileURL(path.join(claspRoot, 'build/src/auth/auth.js')));
  const { credentials } = await initAuth({});
  if (!credentials) throw new Error('Not logged in');
  const result = await credentials.request({
    url: 'https://www.googleapis.com/drive/v3/files',
    params: {
      q: "trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet' and name = 'Medical Stock - Phase 0 POC'",
      fields: 'files(id,name,createdTime,webViewLink),nextPageToken',
      pageSize: 100
    }
  });
  console.log(JSON.stringify(result.data, null, 2));
} catch (error) {
  console.error('POC file lookup failed. HTTP status:', error.response?.status || 'unavailable');
  process.exitCode = 1;
}
