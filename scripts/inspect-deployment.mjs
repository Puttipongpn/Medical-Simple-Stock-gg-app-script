// Read-only deployment inspection using clasp's existing login. Never prints tokens.
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const claspRoot = path.join(process.env.APPDATA, 'npm/node_modules/@google/clasp');
const scriptId = JSON.parse(fs.readFileSync('.clasp.json', 'utf8')).scriptId;
const { initAuth } = await import(pathToFileURL(path.join(claspRoot, 'build/src/auth/auth.js')));
const { credentials } = await initAuth({});
if (!credentials) throw new Error('Not logged in');
try {
  const response = await credentials.request({
    url: `https://script.googleapis.com/v1/projects/${encodeURIComponent(scriptId)}/deployments`,
    params: { pageSize: 100 }
  });
  console.log(JSON.stringify((response.data.deployments || []).map(d => ({
    deploymentId: d.deploymentId,
    versionNumber: d.deploymentConfig?.versionNumber,
    description: d.deploymentConfig?.description,
    entryPoints: d.entryPoints
  })), null, 2));
  const content = await credentials.request({
    url: `https://script.googleapis.com/v1/projects/${encodeURIComponent(scriptId)}/content`
  });
  console.log(JSON.stringify({
    remoteFiles: (content.data.files || []).map(file => file.name),
    hasDoGet: (content.data.files || []).some(file => file.source?.includes('function doGet()')),
    manifest: (() => {
      const manifest = (content.data.files || []).find(file => file.name === 'appsscript');
      return manifest ? JSON.parse(manifest.source) : null;
    })()
  }, null, 2));
} catch (error) {
  console.error('Deployment inspection failed. HTTP status:', error.response?.status || 'unavailable');
  process.exitCode = 1;
}
