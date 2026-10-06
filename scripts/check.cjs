const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
for (const name of fs.readdirSync(src).filter(name => name.endsWith('.gs'))) {
  new vm.Script(fs.readFileSync(path.join(src, name), 'utf8'), { filename: name });
}
for (const name of ['Client.html', 'StockClient.html']) {
  const client = fs.readFileSync(path.join(src, name), 'utf8').replace(/^<script>\s*|\s*<\/script>\s*$/g, '');
  new vm.Script(client, { filename: name });
  assert.doesNotMatch(client, /\.innerHTML\s*=|\b(?:alert|confirm|prompt)\s*\(/);
  assert.doesNotMatch(client, /(?:localStorage|sessionStorage)\.setItem\([^\n]*(?:credential|team.code)/i);
}
const manifest = JSON.parse(fs.readFileSync(path.join(src, 'appsscript.json'), 'utf8'));
assert.equal(manifest.timeZone, 'Asia/Bangkok');
assert.equal(manifest.runtimeVersion, 'V8');
const allowed = ['doGet', 'runPocCheck', 'writePocProbe', 'getPocProbe', 'listStock', 'saveItem', 'saveMovement', 'getSummary', 'reverseMovement'];
for (const name of fs.readdirSync(src).filter(name => name.endsWith('.gs'))) {
  const code = fs.readFileSync(path.join(src, name), 'utf8');
  for (const match of code.matchAll(/^function (\w+)\(/gm)) {
    assert.ok(match[1].endsWith('_') || allowed.includes(match[1]), `Unexpected public function ${match[1]}`);
  }
}
const design = fs.readFileSync(path.join(root, 'DESIGN.md'), 'utf8');
const styles = fs.readFileSync(path.join(src, 'Styles.html'), 'utf8');
const colors = design.match(/\ncolors:\n([\s\S]*?)\ntypography:/)[1];
for (const [, name, value] of colors.matchAll(/^  ([\w-]+): "(#[0-9a-f]+)"$/gm)) {
  const cssName = name.startsWith('scrollbar-') ? name : 'color-' + name;
  assert.ok(styles.includes(`--${cssName}: ${value};`), `Design token drift: ${name}`);
}
for (const [section, next, mapping] of [
  ['rounded', 'spacing', { control: 'radius-control', panel: 'radius-panel' }],
  ['spacing', 'omitted', { gap: 'space-gap', 'page-max': 'page-max' }]
]) {
  const block = design.match(new RegExp(`\\n${section}:\\n([\\s\\S]*?)\\n${next}:`))[1];
  for (const [, name, value] of block.matchAll(/^  ([\w-]+): "([^"]+)"$/gm)) {
    assert.ok(styles.includes(`--${mapping[name]}: ${value};`), `Design token drift: ${name}`);
  }
}
for (const [, name, value] of design.matchAll(/^  (body|heading|mono):\n    fontFamily: '([^']+)'/gm)) {
  assert.ok(styles.includes(`--font-${name}: ${value};`), `Design font drift: ${name}`);
}
console.log('PASS: server/client syntax, manifest, public API surface, client safety, design token mapping');
