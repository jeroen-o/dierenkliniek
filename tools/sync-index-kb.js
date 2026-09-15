// Schrijft een lichte kennisbank-index in index.html: alleen wat de SPA nodig
// heeft om de lijst te tonen en te doorzoeken. De volledige artikeltekst blijft
// in data/kennisbank.json en wordt gelezen door de statische pagina's.
//
// Het zoekveld bevat de eerste zinnen van elk artikel, zodat zoeken op inhoud
// blijft werken zonder dat de hele tekst mee de homepage in gaat.
const fs = require('fs');
const path = require('path');
const L = require('./layout');

const ROOT = L.ROOT;
const artikelen = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'kennisbank.json'), 'utf8'));

const ZOEKLENGTE = 220;

function zoektekst(html) {
  return L.stripTags(html).slice(0, ZOEKLENGTE);
}

const licht = artikelen.map(a => ({
  id: a.id,
  category: a.category,
  animal: a.animal,
  title: a.title,
  excerpt: a.excerpt,
  read_min: a.read_min,
  zoek: zoektekst(a.content)
}));

const index = path.join(ROOT, 'index.html');
let src = fs.readFileSync(index, 'utf8');

// Vind de bestaande array, ongeacht of die nog de volledige tekst bevat.
const start = src.indexOf('const KB_ARTICLES = [');
if (start === -1) throw new Error('KB_ARTICLES niet gevonden in index.html');
const open = src.indexOf('[', start);
let depth = 0, inStr = null, escaped = false, eind = -1;
for (let i = open; i < src.length; i++) {
  const ch = src[i];
  if (escaped) { escaped = false; continue; }
  if (ch === '\\') { escaped = true; continue; }
  if (inStr) { if (ch === inStr) inStr = null; continue; }
  if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
  if (ch === '[') depth++;
  else if (ch === ']') { depth--; if (depth === 0) { eind = i + 1; break; } }
}
if (eind === -1) throw new Error('Onafgesloten KB_ARTICLES in index.html');

const oudeLengte = eind - open;

const nieuw = `[
// Lichte index: titel, samenvatting en de eerste zinnen om op te zoeken. De
// volledige tekst staat in data/kennisbank.json en wordt gerenderd als
// statische pagina onder /kennisbank/. Aanpassen doe je in dat databestand,
// daarna: node tools/build.js
${licht.map(a => JSON.stringify(a)).join(',\n')}
]`;

src = src.slice(0, open) + nieuw + src.slice(eind);
fs.writeFileSync(index, src);

console.log(
  `KB_ARTICLES in index.html: ${Math.round(oudeLengte / 1024)} kB → ${Math.round(nieuw.length / 1024)} kB ` +
  `(${artikelen.length} artikelen, ${Math.round((oudeLengte - nieuw.length) / 1024)} kB bespaard)`
);
