// Extraheert de datasets uit index.html zodat build-scripts ze kunnen gebruiken.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function grab(name) {
  const start = src.indexOf('const ' + name + ' = [');
  if (start === -1) throw new Error('Niet gevonden: ' + name);
  const open = src.indexOf('[', start);
  let depth = 0, inStr = null, esc = false;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (inStr) { if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  throw new Error('Onafgesloten array: ' + name);
}

const out = {};
for (const name of ['KB_ARTICLES', 'KB_CATEGORIES', 'KB_ANIMALS', 'GLOSSARIUM', 'CLINICS']) {
  out[name] = vm.runInNewContext('(' + grab(name) + ')');
}
module.exports = out;

if (require.main === module) {
  const dest = process.argv[2] || path.join(ROOT, 'tools', 'data.json');
  fs.writeFileSync(dest, JSON.stringify(out));
  for (const k of Object.keys(out)) console.log(k, out[k].length);
}
