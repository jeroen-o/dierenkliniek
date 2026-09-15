// Leest openingstijden uit een CSV en schrijft ze naar data/openingstijden.json.
//
//   node tools/import-openingstijden.js sjabloon           maakt een leeg invulbestand met alle 605 klinieken
//   node tools/import-openingstijden.js import <bestand>   leest een ingevulde CSV in
//   node tools/import-openingstijden.js status             toont hoeveel klinieken tijden hebben
//
// Kolommen: slug, naam, plaats, ma, di, wo, do, vr, za, zo, bron
// Een dagcel bevat "08:00-18:00", of "08:00-12:00, 13:00-18:00" bij een
// middagpauze, of "gesloten". Laat de cel leeg als de tijd onbekend is: leeg
// betekent onbekend, niet dicht.
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const O = require('./openingstijden');
const DATA = require('./extract-data');

const ROOT = L.ROOT;
const KOLOMMEN = ['slug', 'naam', 'plaats', 'ma', 'di', 'wo', 'do', 'vr', 'za', 'zo', 'bron'];

function csvCel(waarde) {
  const s = String(waarde == null ? '' : waarde);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function parseCsv(tekst) {
  const rijen = [];
  let rij = [], cel = '', inQuote = false;
  for (let i = 0; i < tekst.length; i++) {
    const c = tekst[i];
    if (inQuote) {
      if (c === '"') {
        if (tekst[i + 1] === '"') { cel += '"'; i++; }
        else inQuote = false;
      } else cel += c;
      continue;
    }
    if (c === '"') { inQuote = true; continue; }
    if (c === ',' || c === ';') { rij.push(cel); cel = ''; continue; }
    if (c === '\n') { rij.push(cel); rijen.push(rij); rij = []; cel = ''; continue; }
    if (c === '\r') continue;
    cel += c;
  }
  if (cel !== '' || rij.length) { rij.push(cel); rijen.push(rij); }
  return rijen.filter(r => r.some(x => String(x).trim() !== ''));
}

function sjabloon() {
  const bestaand = O.laad();
  const rijen = DATA.CLINICS
    .map(c => ({ slug: L.clinicSlug(c), naam: c.name, plaats: c.city }))
    .sort((a, b) => a.plaats.localeCompare(b.plaats, 'nl') || a.naam.localeCompare(b.naam, 'nl'));

  const regels = [KOLOMMEN.join(',')];
  for (const r of rijen) {
    const t = bestaand[r.slug] || {};
    regels.push([
      r.slug, r.naam, r.plaats,
      t.ma || '', t.di || '', t.wo || '', t.do || '', t.vr || '', t.za || '', t.zo || '',
      t.bron || ''
    ].map(csvCel).join(','));
  }

  const dest = path.join(ROOT, 'data', 'openingstijden-sjabloon.csv');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, regels.join('\n') + '\n');
  console.log(`Sjabloon geschreven: data/openingstijden-sjabloon.csv (${rijen.length} klinieken)`);
  console.log('Open het in Excel of Numbers, vul de dagen in en draai daarna:');
  console.log('  node tools/import-openingstijden.js import data/openingstijden-sjabloon.csv');
}

function importeer(bestand) {
  if (!bestand || !fs.existsSync(bestand)) {
    console.error('Geef een bestaand CSV-bestand op.');
    process.exit(1);
  }
  const rijen = parseCsv(fs.readFileSync(bestand, 'utf8'));
  const kop = rijen.shift().map(h => h.trim().toLowerCase());
  const idx = Object.fromEntries(KOLOMMEN.map(k => [k, kop.indexOf(k)]));
  if (idx.slug === -1) {
    console.error('De kolom "slug" ontbreekt. Gebruik het sjabloon als uitgangspunt.');
    process.exit(1);
  }

  const geldigeSlugs = new Set(DATA.CLINICS.map(c => L.clinicSlug(c)));
  const uit = {};
  let gevuld = 0, onbekend = [];

  for (const rij of rijen) {
    const slug = (rij[idx.slug] || '').trim();
    if (!slug) continue;
    if (!geldigeSlugs.has(slug)) { onbekend.push(slug); continue; }

    const dagen = {};
    for (const d of ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']) {
      if (idx[d] === -1) continue;
      const waarde = (rij[idx[d]] || '').trim();
      if (waarde) dagen[d] = waarde;
    }
    const bron = idx.bron === -1 ? '' : (rij[idx.bron] || '').trim();
    if (bron) dagen.bron = bron;

    // Alleen opslaan als er echt een dag is ingevuld.
    if (Object.keys(dagen).filter(k => k !== 'bron').length) { uit[slug] = dagen; gevuld++; }
  }

  const fouten = O.controleer(uit);
  if (fouten.length) {
    console.error(`\n${fouten.length} regels zijn niet te lezen. Er is niets opgeslagen:\n`);
    console.error(fouten.slice(0, 20).map(f => '  ' + f).join('\n'));
    if (fouten.length > 20) console.error(`  … en nog ${fouten.length - 20}`);
    process.exit(1);
  }

  fs.writeFileSync(O.BESTAND, JSON.stringify(uit, null, 2));
  console.log(`data/openingstijden.json geschreven: ${gevuld} klinieken met tijden.`);
  if (onbekend.length) {
    console.log(`\nLet op: ${onbekend.length} regels hadden een onbekende slug en zijn overgeslagen:`);
    console.log(onbekend.slice(0, 5).map(s => '  ' + s).join('\n'));
  }
  console.log('\nDraai nu: node tools/build.js');
}

function status() {
  const tijden = O.laad();
  const totaal = DATA.CLINICS.length;
  const met = Object.keys(tijden).length;
  console.log(`Openingstijden bekend: ${met} van de ${totaal} klinieken (${(met / totaal * 100).toFixed(1)}%)`);
  if (!met) {
    console.log('\nNog geen tijden. Maak een invulbestand met:');
    console.log('  node tools/import-openingstijden.js sjabloon');
    return;
  }
  const fouten = O.controleer(tijden);
  console.log(fouten.length ? `Problemen: ${fouten.length}` : 'Alle regels zijn leesbaar.');
  fouten.slice(0, 10).forEach(f => console.log('  ' + f));
}

const opdracht = process.argv[2] || 'status';
if (opdracht === 'sjabloon') sjabloon();
else if (opdracht === 'import') importeer(process.argv[3]);
else if (opdracht === 'status') status();
else {
  console.error('Gebruik: sjabloon | import <bestand> | status');
  process.exit(1);
}
