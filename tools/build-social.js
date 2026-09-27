// Zet de sociale profielen zichtbaar in de footer van elke pagina.
//
// De profielen stonden alleen in het Organization-schema (sameAs). Een zichtbare,
// klikbare link is zowel voor bezoekers als voor zoekmachines een sterker signaal:
// Google controleert of de verwijzing wederzijds is.
//
// De lijst komt uit SOCIALE_PROFIELEN in layout.js, zodat er maar één plek is om
// een profiel toe te voegen. Het script is idempotent.
const fs = require('fs');
const path = require('path');
const L = require('./layout');

const ROOT = L.ROOT;
const START = '<!-- dk:social-start -->';
const EIND = '<!-- dk:social-end -->';

// Merkglyphs als inline SVG: geen extra verzoeken, schaalt mee en neemt de
// kleur van de omringende tekst over. Gedeeld met build-klinieken.js, zie
// layout.js SOCIAL_GLYPHS.
const GLYPHS = L.SOCIAL_GLYPHS;

function herken(url) {
  if (/facebook\.com/.test(url)) return 'facebook';
  if (/linkedin\.com/.test(url)) return 'linkedin';
  if (/instagram\.com/.test(url)) return 'instagram';
  return null;
}

const profielen = L.SOCIALE_PROFIELEN
  .map(url => ({ url, soort: herken(url) }))
  .filter(p => p.soort);

if (!profielen.length) {
  console.log('Geen herkende profielen in SOCIALE_PROFIELEN; niets te doen.');
  process.exit(0);
}

// Losse, cachebare CSS in plaats van een <style>-blok in elke pagina — zie
// build-assets.js, dat dezelfde module naar /css/social.css schrijft.
// Non-blocking geladen (preload + onload-swap, met noscript-fallback): de
// footer-icoontjes hoeven de eerste weergave van de pagina niet op te houden.
const CSS = '\n<link rel="preload" href="/css/social.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">' +
  '\n<noscript><link rel="stylesheet" href="/css/social.css"></noscript>';

function blok() {
  const links = profielen.map(p => {
    const g = GLYPHS[p.soort];
    return `<a href="${p.url}" target="_blank" rel="me noopener" aria-label="${g.naam}" title="Dierenkliniek.nl op ${g.naam}">` +
      `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${g.pad}"/></svg></a>`;
  }).join('\n    ');
  return `${START}
  <div class="dk-social">
    ${links}
  </div>
  ${EIND}`;
}

// Het blok komt onder de tagline in de footer, waar de merknaam staat.
const ANKERS = [
  '<p class="footer-tagline">Het onafhankelijke overzicht van alle dierenklinieken in Nederland. Vind, vergelijk en kies met vertrouwen.</p>',
  '<p style="max-width: 320px; font-size: 14px;">Het onafhankelijke overzicht van alle dierenklinieken in Nederland. Vind, vergelijk en kies met vertrouwen.</p>'
];

function verwerk(bestand) {
  const p = path.join(ROOT, bestand);
  let s = fs.readFileSync(p, 'utf8');

  // Eerdere versie verwijderen zodat het script herhaalbaar is.
  s = s.replace(new RegExp(START + '[\\s\\S]*?' + EIND, 'g'), '').replace(/\n\s*\n\s*\n/g, '\n\n');

  // Migratie: het oude inline <style>-blok van vóór de overstap naar
  // /css/social.css verwijderen, anders houden bestaande pagina's de CSS
  // dubbel (inline én extern).
  s = s.replace(/\n?<style>\n\.dk-social \{[\s\S]*?<\/style>/, '');

  // Migratie: de oude blokkerende <link rel="stylesheet"> naar social.css
  // verwijderen, zodat pagina's die al eerder gebouwd zijn ook de nieuwe
  // non-blocking variant krijgen in plaats van hem over te slaan.
  s = s.replace(/\n?<link rel="stylesheet" href="\/css\/social\.css">/, '');

  const anker = ANKERS.find(a => s.includes(a));
  if (!anker) return false;

  s = s.replace(anker, anker + '\n  ' + blok());

  // CSS eenmalig meegeven, vlak voor het einde van de head.
  if (!s.includes('/css/social.css')) {
    const i = s.indexOf('</head>');
    if (i !== -1) s = s.slice(0, i) + CSS + '\n' + s.slice(i);
  }

  fs.writeFileSync(p, s);
  return true;
}

let n = 0;
const bestanden = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))
  .concat(fs.readdirSync(path.join(ROOT, 'kennisbank')).filter(f => f.endsWith('.html')).map(f => 'kennisbank/' + f));

for (const f of bestanden) { if (verwerk(f)) n++; }

console.log(`sociale links in de footer: ${n} pagina's, profielen: ${profielen.map(p => p.soort).join(', ')}`);
