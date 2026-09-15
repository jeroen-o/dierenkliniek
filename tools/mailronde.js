// Stelt de mailronde naar de vermelde klinieken samen.
//
//   node tools/mailronde.js voorbeeld [slug]   toont één volledig ingevulde mail
//   node tools/mailronde.js lijst              toont wie er een mail zou krijgen
//   node tools/mailronde.js export             schrijft alle mails naar data/mailronde.json
//
// Dit script verstuurt niets. Verzenden gebeurt pas na akkoord, in een aparte stap.
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const O = require('./openingstijden');
const DATA = require('./extract-data');

const ROOT = L.ROOT;
const SITE = L.SITE;
const TIJDEN = O.laad();

// Eén adres kan meerdere praktijken bedienen (ketens, gedeelde postbussen).
// Die krijgen één mail waarin alle vestigingen staan, geen stapel losse mails.
function ontvangers() {
  const perAdres = new Map();
  for (const c of DATA.CLINICS) {
    const mail = (c.email || '').trim().toLowerCase();
    if (!mail || !mail.includes('@')) continue;
    if (!perAdres.has(mail)) perAdres.set(mail, []);
    perAdres.get(mail).push(c);
  }
  return [...perAdres.entries()].map(([email, klinieken]) => ({ email, klinieken }));
}

function onderwerp(o) {
  return o.klinieken.length === 1
    ? `Kloppen de gegevens van ${o.klinieken[0].name} op Dierenkliniek.nl?`
    : `Kloppen de gegevens van uw ${o.klinieken.length} vestigingen op Dierenkliniek.nl?`;
}

function vestigingsblok(c) {
  const slug = L.clinicSlug(c);
  const dagen = TIJDEN[slug];
  const tijden = O.samenvatting(dagen);
  const specs = (c.specs || []).join(', ');
  return [
    `${c.name} in ${c.city}`,
    `  Pagina:      ${SITE}/${slug}`,
    `  Adres:       ${c.address}, ${c.postcode} ${c.city}`,
    `  Telefoon:    ${c.phone || '(niet bij ons bekend)'}`,
    `  Website:     ${c.website || '(niet bij ons bekend)'}`,
    specs ? `  Specialisme: ${specs}` : null,
    tijden ? `  Openingstijden die wij nu tonen: ${tijden}` : null
  ].filter(Boolean).join('\n');
}

function tekst(o) {
  const een = o.klinieken.length === 1;
  const c = o.klinieken[0];
  const badgeUrl = `${SITE}/${L.clinicSlug(c)}`;

  return `Goedendag,

${een ? `${c.name} staat vermeld op Dierenkliniek.nl` : `Uw ${o.klinieken.length} vestigingen staan vermeld op Dierenkliniek.nl`}, een overzicht van ruim 600 dierenklinieken in Nederland. Uw vermelding is gratis en blijft gratis, inclusief telefoonnummer, e-mailadres en website. Betaalde pakketten geven extra profielfuncties en een hogere positie binnen 10 kilometer van de zoekopdracht, maar houden nooit een andere praktijk uit de resultaten.

Wij mailen u om twee redenen.

1. KLOPPEN DE GEGEVENS?

Dit hebben wij staan:

${o.klinieken.map(vestigingsblok).join('\n\n')}

Klopt er iets niet? Antwoord op deze mail met de juiste gegevens, dan passen wij het aan. Een correctie is meestal binnen een dag doorgevoerd.

2. UW OPENINGSTIJDEN

Op dit moment tonen wij standaardtijden met de duidelijke melding erbij dat die niet door u zijn bevestigd en dat bezoekers eerst moeten bellen. Dat is geen prettige oplossing, en wij vervangen het graag door uw echte tijden.

Stuur ze in een antwoord op deze mail, bijvoorbeeld zo:

  maandag t/m vrijdag 08:00-18:00
  woensdagmiddag gesloten
  zaterdag 09:00-12:00
  zondag gesloten

Zodra wij uw tijden hebben, verdwijnt de melding en tonen wij ze als bevestigd. Dat helpt ook uw vindbaarheid: Google kan dan bij uw praktijk "nu open" tonen.

GRATIS BADGE VOOR UW WEBSITE

Op uw pagina staat een badge klaar met uw eigen praktijknaam erop, in vier varianten en met een handleiding. Plaatsen kost twee minuten en laat uw bezoekers zien dat u onafhankelijk vermeld staat:

${badgeUrl}

Met vriendelijke groet,

Amanda van Warmerhof
Dierenkliniek.nl
info@dierenkliniek.nl · 06-59115265
Darthuizerberg 1, 3825 BK Amersfoort

---
U ontvangt deze mail omdat uw praktijk is opgenomen in ons overzicht van
Nederlandse dierenklinieken. Wilt u geen mail meer van ons, antwoord dan met
"afmelden". Wilt u de vermelding zelf laten verwijderen, antwoord dan met
"verwijderen", dan halen wij de pagina offline.`;
}

const opdracht = process.argv[2] || 'lijst';
const lijst = ontvangers();

if (opdracht === 'lijst') {
  const meervoudig = lijst.filter(o => o.klinieken.length > 1);
  console.log(`Ontvangers: ${lijst.length} adressen voor ${lijst.reduce((n, o) => n + o.klinieken.length, 0)} praktijken.`);
  console.log(`Daarvan ${meervoudig.length} adressen met meerdere vestigingen (die krijgen één mail).`);
  console.log(`Zonder e-mailadres, dus geen mail: ${DATA.CLINICS.length - lijst.reduce((n, o) => n + o.klinieken.length, 0)} praktijken.`);
} else if (opdracht === 'voorbeeld') {
  const slug = process.argv[3];
  const o = slug
    ? lijst.find(x => x.klinieken.some(c => L.clinicSlug(c) === slug))
    : lijst.find(x => x.klinieken.length === 1);
  if (!o) { console.error('Niet gevonden.'); process.exit(1); }
  console.log('Aan:       ' + o.email);
  console.log('Onderwerp: ' + onderwerp(o));
  console.log('\n' + tekst(o));
} else if (opdracht === 'export') {
  const uit = lijst.map(o => ({ email: o.email, onderwerp: onderwerp(o), tekst: tekst(o) }));
  fs.writeFileSync(path.join(ROOT, 'data', 'mailronde.json'), JSON.stringify(uit, null, 2));
  console.log(`data/mailronde.json geschreven: ${uit.length} mails. Er is niets verstuurd.`);
} else if (opdracht === 'csv') {
  // Kolommen die elk mailprogramma en elk mailplatform kan samenvoegen.
  const esc = (v) => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  const regels = ['email,onderwerp,tekst'];
  for (const o of lijst) regels.push([o.email, onderwerp(o), tekst(o)].map(esc).join(','));
  const dest = path.join(ROOT, 'data', 'mailronde.csv');
  fs.writeFileSync(dest, regels.join('\n') + '\n');
  console.log(`data/mailronde.csv geschreven: ${lijst.length} mails. Er is niets verstuurd.`);
} else {
  console.error('Gebruik: lijst | voorbeeld [slug] | export | csv');
  process.exit(1);
}
