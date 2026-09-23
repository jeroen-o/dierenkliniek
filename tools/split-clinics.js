// Eenmalige stap: haalt CLINICS uit index.html en zet het als bron van
// waarheid in data/clinics.json — zelfde aanpak als split-kennisbank.js.
//
// Reden: alle 1.127 klinieken (incl. e-mailadres) stonden inline in
// index.html en werden bij elk bezoek aan de homepage meegeladen (~440 kB
// aan JSON, het grootste deel van het paginagewicht). tools/extract-data.js
// leest CLINICS voortaan uit dit bestand; index.html haalt de data zelf op
// via fetch() in plaats van hem inline mee te dragen (zie build-clinics.js
// voor de publieke, e-mailloze variant die de browser ophaalt).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function grabArray(name) {
  const start = src.indexOf('const ' + name + ' = [');
  if (start === -1) throw new Error('Niet gevonden: ' + name);
  const open = src.indexOf('[', start);
  let depth = 0, inStr = null, escaped = false;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (inStr) { if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  throw new Error('Onafgesloten array: ' + name);
}

const klinieken = vm.runInNewContext('(' + grabArray('CLINICS') + ')');
const dest = path.join(ROOT, 'data');
fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(path.join(dest, 'clinics.json'), JSON.stringify(klinieken, null, 2));

const bytes = JSON.stringify(klinieken).length;
console.log(`data/clinics.json geschreven: ${klinieken.length} klinieken, ${Math.round(bytes / 1024)} kB`);
