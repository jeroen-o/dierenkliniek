// Eenmalige stap: haalt KB_ARTICLES uit index.html en zet het als bron van
// waarheid in data/kennisbank.json.
//
// Reden: de volledige tekst van alle 64 artikelen stond inline in index.html en
// werd bij elk bezoek aan de homepage meegeladen, terwijl diezelfde tekst ook
// als statische pagina bestaat. Dat was een kwart van het paginagewicht.
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

const artikelen = vm.runInNewContext('(' + grabArray('KB_ARTICLES') + ')');
const dest = path.join(ROOT, 'data');
fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(path.join(dest, 'kennisbank.json'), JSON.stringify(artikelen, null, 2));

const bytes = JSON.stringify(artikelen).length;
console.log(`data/kennisbank.json geschreven: ${artikelen.length} artikelen, ${Math.round(bytes / 1024)} kB`);
