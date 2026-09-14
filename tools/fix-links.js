// Vervangt in alle statische pagina's de niet-canonieke SPA-links door de
// statische equivalenten, zodat interne linkwaarde naar de canonieke URL gaat.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const MAP = {
  '/?view=spoedhulp': '/spoedhulp',
  '/?view=kennisbank': '/kennisbank',
  '/?view=glossarium': '/glossarium',
  '/?view=provincies': '/provincies',
  '/?view=about': '/over-ons',
  '/?view=onafhankelijkheid': '/onafhankelijkheid',
  '/?view=contact': '/contact',
  '/?view=partners': '/partners'
};

// index.html en zijn back-upkopie houden hun SPA-navigatie; de vier
// vertrouwenspagina's tonen hun eigen inhoud en linken dus niet naar zichzelf.
const SKIP = new Set(['index.html', 'dierenkliniek.html']);
let files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !SKIP.has(f));
files = files.concat(fs.readdirSync(path.join(ROOT, 'kennisbank')).map(f => 'kennisbank/' + f));

let changed = 0, replacements = 0;
for (const f of files) {
  const p = path.join(ROOT, f);
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  for (const [from, to] of Object.entries(MAP)) {
    const re = new RegExp('href="' + from.replace(/[?]/g, '\\?') + '"', 'g');
    const hits = (s.match(re) || []).length;
    if (hits) { s = s.replace(re, 'href="' + to + '"'); replacements += hits; }
  }
  if (s !== before) { fs.writeFileSync(p, s); changed++; }
}
console.log(`links bijgewerkt: ${replacements} in ${changed} bestanden`);
