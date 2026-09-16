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

// Verzendregister: wie heeft de mail al gehad. Voorkomt dat een praktijk twee
// keer wordt aangeschreven als een ronde halverwege afbreekt.
const REGISTER = path.join(ROOT, 'data', 'mailronde-verzonden.json');
function verzonden() {
  if (!fs.existsSync(REGISTER)) return {};
  try { return JSON.parse(fs.readFileSync(REGISTER, 'utf8')); } catch (e) { return {}; }
}
function noteer(email, id) {
  const r = verzonden();
  r[email.toLowerCase()] = { id, op: new Date().toISOString() };
  fs.writeFileSync(REGISTER, JSON.stringify(r, null, 2));
}

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Opgemaakte versie, zoals goedgekeurd. Tabellen en inline stijlen omdat
// mailprogramma's geen stylesheets of moderne opmaak ondersteunen.
function html(o) {
  const een = o.klinieken.length === 1;
  const c = o.klinieken[0];
  const paginaUrl = `${SITE}/${L.clinicSlug(c)}`;
  const rij = (label, waarde) =>
    `<tr><td style="padding:4px 18px;width:120px;color:#0070AC;">${label}</td><td style="padding:4px 18px 4px 0;">${waarde}</td></tr>`;

  const blokken = o.klinieken.map(k => {
    const slug = L.clinicSlug(k);
    const tijden = O.samenvatting(TIJDEN[slug]);
    const specs = (k.specs || []).join(', ');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eaf6fc;border-left:4px solid #00A1E4;font-size:14px;line-height:1.5;margin-bottom:12px;">
      <tr><td style="padding:14px 18px 6px 18px;font-size:16px;font-weight:bold;color:#003E7E;" colspan="2">${esc(k.name)} in ${esc(k.city)}</td></tr>
      ${rij('Pagina', `<a href="${SITE}/${slug}" style="color:#0070AC;">dierenkliniek.nl/${slug}</a>`)}
      ${rij('Adres', esc(k.address) + ', ' + esc(k.postcode) + ' ' + esc(k.city))}
      ${rij('Telefoon', k.phone ? esc(k.phone) : '<em>niet bij ons bekend</em>')}
      ${rij('Website', k.website ? `<a href="${esc(k.website)}" style="color:#0070AC;">${esc(k.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : '<em>niet bij ons bekend</em>')}
      ${specs ? rij('Specialisme', esc(specs)) : ''}
      ${tijden ? `<tr><td style="padding:4px 18px 14px 18px;color:#0070AC;vertical-align:top;">Openingstijden<br><span style="font-size:12px;color:#0a1628;">zoals wij nu tonen</span></td><td style="padding:4px 18px 14px 0;">${esc(tijden)}</td></tr>` : ''}
    </table>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(onderwerp(o))}</title></head>
<body style="margin:0;padding:0;background:#f0f5f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f5f9;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#0a1628;font-size:16px;line-height:1.55;">
  <tr><td style="background:#003E7E;background-image:linear-gradient(135deg,#00A1E4 0%,#003E7E 100%);padding:26px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:14px;vertical-align:middle;"><img src="${SITE}/logo-pack/dierenkliniek-nl-icon-512.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;border-radius:10px;"></td>
      <td style="vertical-align:middle;font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:0.2px;">Dierenkliniek.nl</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px 32px 8px 32px;">
    <p style="margin:0 0 16px 0;">Geachte heer / mevrouw,</p>
    <p style="margin:0 0 16px 0;">${een ? esc(c.name) + ' staat vermeld' : 'Uw ' + o.klinieken.length + ' vestigingen staan vermeld'} op Dierenkliniek.nl, het overzicht van ruim 1100 dierenklinieken in Nederland. Wij willen dierenartsen en dierenklinieken graag in het zonnetje zetten: huisdiereigenaren vinden bij ons snel de praktijk bij hen in de buurt, met uw telefoonnummer, e-mailadres en website direct in beeld. Uw vermelding is gratis en blijft gratis.</p>
    <p style="margin:0 0 8px 0;">Wij mailen u om twee redenen.</p>
  </td></tr>
  <tr><td style="padding:16px 32px 8px 32px;">
    <h2 style="margin:0 0 12px 0;font-size:18px;line-height:1.3;color:#003E7E;">1. Kloppen de gegevens?</h2>
    <p style="margin:0 0 12px 0;">Dit hebben wij staan:</p>
    ${blokken}
    <p style="margin:14px 0 0 0;">Klopt er iets niet? Antwoord op deze mail met de juiste gegevens, dan passen wij het aan. Een correctie is meestal binnen een dag doorgevoerd.</p>
  </td></tr>
  <tr><td style="padding:24px 32px 8px 32px;">
    <h2 style="margin:0 0 12px 0;font-size:18px;line-height:1.3;color:#003E7E;">2. Uw openingstijden</h2>
    <p style="margin:0 0 12px 0;">Op dit moment tonen wij standaardtijden met de duidelijke melding erbij dat die niet door u zijn bevestigd en dat bezoekers eerst moeten bellen. Dat is geen prettige oplossing, en wij vervangen het graag door uw echte tijden.</p>
    <p style="margin:0 0 8px 0;">Stuur ze in een antwoord op deze mail, bijvoorbeeld zo:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:1.6;background:#eaf6fc;">
      <tr><td style="padding:10px 18px;">maandag t/m vrijdag 08:00&ndash;18:00<br>woensdagmiddag gesloten<br>zaterdag 09:00&ndash;12:00<br>zondag gesloten</td></tr>
    </table>
    <p style="margin:0;">Zodra wij uw tijden hebben, verdwijnt de melding en tonen wij ze als bevestigd. Dat helpt ook uw vindbaarheid: Google kan dan bij uw praktijk &ldquo;nu open&rdquo; tonen.</p>
  </td></tr>
  <tr><td style="padding:24px 32px 8px 32px;">
    <h2 style="margin:0 0 12px 0;font-size:18px;line-height:1.3;color:#003E7E;">Gratis badge voor uw website</h2>
    <p style="margin:0 0 16px 0;">Op uw pagina staat een badge klaar met uw eigen praktijknaam erop, in vier varianten en met een handleiding. Plaatsen kost twee minuten en laat uw bezoekers zien dat u vermeld staat. Bovendien levert het u meer bezoek op: de badge linkt naar uw pagina op Dierenkliniek.nl, en die verwijst huisdiereigenaren weer door naar uw eigen website.</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#00A1E4;border-radius:6px;">
      <a href="${paginaUrl}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">Bekijk uw pagina en badge</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:28px 32px 32px 32px;">
    <p style="margin:0 0 4px 0;">Met vriendelijke groet,</p>
    <p style="margin:0;font-size:15px;line-height:1.5;"><strong style="color:#003E7E;">Team van Dierenkliniek.nl</strong><br>
    <a href="mailto:info@dierenkliniek.nl" style="color:#0070AC;">info@dierenkliniek.nl</a> &middot; 06-59115265<br>
    Darthuizerberg 1, 3825 BK Amersfoort</p>
  </td></tr>
  <tr><td style="background:#003E7E;padding:18px 32px;font-size:12px;line-height:1.5;color:#cfe8f6;">
    U ontvangt deze mail omdat uw praktijk is opgenomen in ons overzicht van Nederlandse dierenklinieken. Wilt u geen mail meer van ons, antwoord dan met &ldquo;afmelden&rdquo;. Wilt u de vermelding zelf laten verwijderen, antwoord dan met &ldquo;verwijderen&rdquo;, dan halen wij de pagina offline.<br><br>
    <span style="color:#ffffff;">&copy; 2026 Dierenkliniek.nl</span> &middot; <a href="${SITE}/" style="color:#ffffff;">dierenkliniek.nl</a> &middot; <a href="${SITE}/?view=privacy" style="color:#ffffff;">Privacyverklaring</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}

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

${een ? `${c.name} staat vermeld op Dierenkliniek.nl` : `Uw ${o.klinieken.length} vestigingen staan vermeld op Dierenkliniek.nl`}, een overzicht van ruim 1100 dierenklinieken in Nederland. Uw vermelding is gratis en blijft gratis, inclusief telefoonnummer, e-mailadres en website. Betaalde pakketten geven extra profielfuncties en een hogere positie binnen 10 kilometer van de zoekopdracht, maar houden nooit een andere praktijk uit de resultaten.

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

Op uw pagina staat een badge klaar met uw eigen praktijknaam erop, in vier varianten en met een handleiding. Plaatsen kost twee minuten en laat uw bezoekers zien dat u vermeld staat:

${badgeUrl}

Met vriendelijke groet,

Team van Dierenkliniek.nl
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
} else if (opdracht === 'batch') {
  // Schrijft de volgende N nog niet verstuurde mails weg, klaar om te versturen.
  const n = parseInt(process.argv[3] || '25', 10);
  const al = verzonden();
  const open = lijst.filter(o => !al[o.email.toLowerCase()]).slice(0, n);
  const uit = open.map(o => ({ email: o.email, onderwerp: onderwerp(o), tekst: tekst(o), html: html(o) }));
  fs.writeFileSync(path.join(ROOT, 'data', 'mailronde-batch.json'), JSON.stringify(uit, null, 2));
  console.log(`${uit.length} mails klaargezet in data/mailronde-batch.json`);
  console.log(`Al verstuurd: ${Object.keys(al).length} · nog open: ${lijst.length - Object.keys(al).length}`);
} else if (opdracht === 'noteer') {
  noteer(process.argv[3], process.argv[4] || 'handmatig');
  console.log('genoteerd: ' + process.argv[3]);
} else if (opdracht === 'status') {
  const al = verzonden();
  console.log(`Verstuurd: ${Object.keys(al).length} van ${lijst.length} adressen.`);
} else {
  console.error('Gebruik: lijst | voorbeeld [slug] | export | csv | batch [n] | noteer <email> <id> | status');
  process.exit(1);
}
