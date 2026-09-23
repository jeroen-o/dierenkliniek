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
for (const name of ['KB_CATEGORIES', 'KB_ANIMALS', 'GLOSSARIUM']) {
  out[name] = vm.runInNewContext('(' + grab(name) + ')');
}
// Postcodebereiken per provincie (viercijferig). Ontbreekt de tabel, dan valt
// layout.provinceOf terug op de grovere tweecijferige PROVINCE_LOOKUP.
try { out.PROVINCE_RANGES = vm.runInNewContext('(' + grab('PROVINCE_RANGES') + ')'); } catch (e) { out.PROVINCE_RANGES = []; }

// De artikelen en de klinieken staan niet meer inline in index.html maar in
// eigen databestanden, zodat die tekst niet bij elk bezoek aan de homepage
// wordt meegeladen. index.html haalt CLINICS zelf op via fetch() (zie
// build-clinics.js voor de publieke, e-mailloze variant).
const KB_PAD = path.join(ROOT, 'data', 'kennisbank.json');
if (!fs.existsSync(KB_PAD)) {
  throw new Error('data/kennisbank.json ontbreekt. Draai eerst: node tools/split-kennisbank.js');
}
out.KB_ARTICLES = JSON.parse(fs.readFileSync(KB_PAD, 'utf8'));

const CLINICS_PAD = path.join(ROOT, 'data', 'clinics.json');
if (!fs.existsSync(CLINICS_PAD)) {
  throw new Error('data/clinics.json ontbreekt. Draai eerst: node tools/split-clinics.js');
}
out.CLINICS = JSON.parse(fs.readFileSync(CLINICS_PAD, 'utf8'));
module.exports = out;

if (require.main === module) {
  const dest = process.argv[2] || path.join(ROOT, 'tools', 'data.json');
  fs.writeFileSync(dest, JSON.stringify(out));
  for (const k of Object.keys(out)) console.log(k, out[k].length);
}
