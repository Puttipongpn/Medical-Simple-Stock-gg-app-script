const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
let html = fs.readFileSync(path.join(src, 'Index.html'), 'utf8');
for (const name of ['Styles', 'Client']) {
  html = html.replace(`<?!= include_('${name}'); ?>`, () => fs.readFileSync(path.join(src, name + '.html'), 'utf8'));
}
html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>คลังอุปกรณ์ • ตัวอย่างบนเครื่อง ไม่เชื่อม Google</title>');
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifacts/local-preview.html'), html);
console.log('Created artifacts/local-preview.html; this is not a Google deployment.');
