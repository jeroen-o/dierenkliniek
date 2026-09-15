// Gedeelde logica voor openingstijden.
//
// De tijden staan in data/openingstijden.json, met de kliniek-slug als sleutel:
//
//   {
//     "dierenkliniek-vondelpark-dierenarts-in-amsterdam": {
//       "ma": "08:00-18:00",
//       "di": "08:00-18:00",
//       "wo": "08:00-12:00, 13:00-18:00",
//       "do": "08:00-18:00",
//       "vr": "08:00-17:00",
//       "za": "09:00-12:00",
//       "zo": "gesloten",
//       "bron": "website kliniek, gecontroleerd 2026-09-15"
//     }
//   }
//
// Een dag mag meerdere blokken hebben, gescheiden door een komma. "gesloten"
// (of een lege waarde) betekent dicht. Een dag die ontbreekt is onbekend en
// wordt nergens getoond: onbekend is iets anders dan gesloten.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BESTAND = path.join(ROOT, 'data', 'openingstijden.json');

const DAGEN = [
  { kort: 'ma', naam: 'Maandag', schema: 'Monday' },
  { kort: 'di', naam: 'Dinsdag', schema: 'Tuesday' },
  { kort: 'wo', naam: 'Woensdag', schema: 'Wednesday' },
  { kort: 'do', naam: 'Donderdag', schema: 'Thursday' },
  { kort: 'vr', naam: 'Vrijdag', schema: 'Friday' },
  { kort: 'za', naam: 'Zaterdag', schema: 'Saturday' },
  { kort: 'zo', naam: 'Zondag', schema: 'Sunday' }
];

function laad() {
  if (!fs.existsSync(BESTAND)) return {};
  try {
    return JSON.parse(fs.readFileSync(BESTAND, 'utf8'));
  } catch (e) {
    throw new Error('data/openingstijden.json is geen geldige JSON: ' + e.message);
  }
}

// "08:00-12:00, 13:00-18:00" -> [{opens:'08:00', closes:'12:00'}, {...}]
// Geeft een lege lijst terug bij "gesloten" of onleesbare invoer.
function blokken(waarde) {
  if (!waarde) return [];
  const tekst = String(waarde).trim().toLowerCase();
  if (!tekst || tekst === 'gesloten' || tekst === 'dicht') return [];
  const uit = [];
  for (const deel of tekst.split(',')) {
    const m = deel.trim().match(/^(\d{1,2})[:.](\d{2})\s*[-–tot]+\s*(\d{1,2})[:.](\d{2})$/);
    if (!m) continue;
    const opens = String(m[1]).padStart(2, '0') + ':' + m[2];
    const closes = String(m[3]).padStart(2, '0') + ':' + m[4];
    uit.push({ opens, closes });
  }
  return uit;
}

// Klopt de invoer? Geeft een lijst met problemen terug, leeg als alles goed is.
function controleer(tijden) {
  const fouten = [];
  for (const [slug, dagen] of Object.entries(tijden)) {
    for (const d of DAGEN) {
      const waarde = dagen[d.kort];
      if (waarde === undefined) continue;
      const tekst = String(waarde).trim().toLowerCase();
      if (!tekst || tekst === 'gesloten' || tekst === 'dicht') continue;
      const b = blokken(waarde);
      if (!b.length) {
        fouten.push(`${slug} ${d.kort}: "${waarde}" is niet te lezen (verwacht 08:00-18:00 of gesloten)`);
        continue;
      }
      for (const { opens, closes } of b) {
        if (opens >= closes) fouten.push(`${slug} ${d.kort}: sluit (${closes}) niet na openen (${opens})`);
      }
    }
  }
  return fouten;
}

// Zijn deze tijden door de praktijk zelf bevestigd? Zo niet, dan gaan ze niet
// het schema in. Google bouwt daar "nu open"-labels op, en die mogen niet op een
// aanname rusten: iemand rijdt er met een ziek dier op af.
function bevestigd(dagen) {
  return !!(dagen && dagen.bron && !dagen.onbevestigd);
}

// schema.org openingHoursSpecification. Dagen die niet zijn opgegeven, komen er
// niet in: we beweren niets over wat we niet weten. Onbevestigde tijden leveren
// helemaal geen schema op.
function schemaVoor(dagen) {
  if (!dagen || !bevestigd(dagen)) return null;
  const uit = [];
  for (const d of DAGEN) {
    const waarde = dagen[d.kort];
    if (waarde === undefined) continue;
    const b = blokken(waarde);
    if (!b.length) {
      // Expliciet gesloten: schema.org drukt dat uit met gelijke tijden.
      uit.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'https://schema.org/' + d.schema,
        opens: '00:00',
        closes: '00:00'
      });
      continue;
    }
    for (const { opens, closes } of b) {
      uit.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'https://schema.org/' + d.schema,
        opens,
        closes
      });
    }
  }
  return uit.length ? uit : null;
}

// Zichtbare tabel voor op de kliniekpagina.
function tabelVoor(dagen, esc) {
  if (!dagen) return null;
  const rijen = DAGEN
    .filter(d => dagen[d.kort] !== undefined)
    .map(d => {
      const b = blokken(dagen[d.kort]);
      const tekst = b.length ? b.map(x => `${x.opens} - ${x.closes}`).join(' en ') : 'Gesloten';
      const dicht = b.length === 0;
      return `<tr><th scope="row">${d.naam}</th><td${dicht ? ' class="dicht"' : ''}>${esc(tekst)}</td></tr>`;
    });
  if (!rijen.length) return null;
  const bron = bevestigd(dagen)
    ? `<p class="tijden-bron">Bron: ${esc(dagen.bron)}</p>`
    : `<p class="tijden-onbevestigd">Deze tijden zijn nog niet door de praktijk bevestigd. Bel voordat u langskomt.</p>`;
  return `<table class="openingstijden">
      <caption class="visueel-verborgen">Openingstijden</caption>
      <tbody>
        ${rijen.join('\n        ')}
      </tbody>
    </table>
    ${bron}`;
}

// Korte samenvatting voor de FAQ, bijvoorbeeld "ma-vr 08:00-18:00, za 09:00-12:00".
function samenvatting(dagen) {
  if (!dagen) return null;
  const delen = DAGEN
    .filter(d => dagen[d.kort] !== undefined)
    .map(d => {
      const b = blokken(dagen[d.kort]);
      return b.length
        ? `${d.naam.toLowerCase()} ${b.map(x => x.opens + ' tot ' + x.closes).join(' en ')}`
        : `${d.naam.toLowerCase()} gesloten`;
    });
  return delen.length ? delen.join(', ') : null;
}

module.exports = { DAGEN, laad, blokken, controleer, bevestigd, schemaVoor, tabelVoor, samenvatting, BESTAND };
