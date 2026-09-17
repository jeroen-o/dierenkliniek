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
// kleur van de omringende tekst over.
const GLYPHS = {
  facebook: {
    naam: 'Facebook',
    pad: 'M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z'
  },
  linkedin: {
    naam: 'LinkedIn',
    pad: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z'
  },
  instagram: {
    naam: 'Instagram',
    pad: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.26.07 1.64.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.26.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.26-.07-1.64-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.26-.06 1.64-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.71-2.13 1.38C1.34 2.68.93 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.71 1.46 1.38 2.13.67.67 1.34 1.08 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.3 1.46-.71 2.13-1.38.67-.67 1.08-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.3-.79-.71-1.46-1.38-2.13C21.32 1.34 20.65.93 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z'
  }
};

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
const CSS = '\n<link rel="stylesheet" href="/css/social.css">';

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
  .concat(fs.readdirSync(path.join(ROOT, 'kennisbank')).map(f => 'kennisbank/' + f));

for (const f of bestanden) { if (verwerk(f)) n++; }

console.log(`sociale links in de footer: ${n} pagina's, profielen: ${profielen.map(p => p.soort).join(', ')}`);
