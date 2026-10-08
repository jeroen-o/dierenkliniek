// Genereert een "Kennispartner van Dierenkliniek.nl"-badge voor een dierenarts
// die een kennisbank-artikel heeft geclaimd. Claims worden handmatig
// beoordeeld (zie artikel-claimen in index.html, die opent een mailtje) — dus
// dit script draait per goedgekeurde claim, niet batchgewijs zoals
// generate-badges.js voor klinieken.
//
// Gebruik:
//   node tools/generate-kennispartner-badge.js <artikel-slug> "<praktijknaam>"
//
// Bijv.:
//   node tools/generate-kennispartner-badge.js "kennelhoest-bij-honden" "Dierenartsenpraktijk De Linde"
//
// Output in badges/kennisbank/<artikel-slug>/:
//   kennispartner-badge.svg/.png, kennispartner-badge-klein.svg/.png,
//   handleiding.txt, kennispartner-<artikel-slug>.zip
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const L = require('./layout');

const ROOT = L.ROOT;
const SITE = L.SITE;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const [, , slugArg, praktijkArg] = process.argv;
if (!slugArg || !praktijkArg) {
  console.error('Gebruik: node tools/generate-kennispartner-badge.js <artikel-slug> "<praktijknaam>"');
  process.exit(1);
}

const kennisbankPath = path.join(ROOT, 'data', 'kennisbank.json');
const artikelen = JSON.parse(fs.readFileSync(kennisbankPath, 'utf8'));
const artikel = artikelen.find(a => L.slugify(a.title) === slugArg);
if (!artikel) {
  console.error(`Geen artikel gevonden met slug "${slugArg}" (vergelijk met L.slugify(title)).`);
  process.exit(1);
}
const titel = artikel.title;
const artikelUrl = `${SITE}/kennisbank/${slugArg}`;

// Groot: vierkante badge voor op een contact- of over-ons-pagina.
const BADGE_SVG = (praktijk, titel) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00A1E4"/><stop offset="100%" stop-color="#0070AC"/></linearGradient></defs>
  <rect width="240" height="240" rx="26" fill="url(#bg)"/>
  <circle cx="120" cy="66" r="36" fill="white" opacity="0.15"/>
  <g transform="translate(97, 46) scale(2.1)" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v18H6.5A2.5 2.5 0 0 0 4 22.5V4.5z"/>
    <path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H13v18h4.5a2.5 2.5 0 0 1 2.5 2.5V4.5z"/>
  </g>
  <text x="120" y="124" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="600" opacity="0.85" letter-spacing="1.5">KENNISPARTNER VAN</text>
  <text x="120" y="148" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="18" font-weight="800" letter-spacing="-0.4">Dierenkliniek.nl</text>
  <line x1="60" y1="164" x2="180" y2="164" stroke="white" stroke-width="1" opacity="0.3"/>
  <text x="120" y="186" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="11" font-weight="600" opacity="0.95">${esc(praktijk)}</text>
  <text x="120" y="204" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" opacity="0.75">Vakinhoudelijk aanspreekpunt</text>
</svg>`;

// Klein: subtielere variant voor footer/sidebar, zonder artikeltitel.
const BADGE_KLEIN_SVG = (praktijk) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="190" height="190" viewBox="0 0 190 190">
  <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00A1E4"/><stop offset="100%" stop-color="#003E7E"/></linearGradient></defs>
  <rect width="190" height="190" rx="21" fill="url(#bg)"/>
  <g transform="translate(69, 24) scale(1.8)" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v18H6.5A2.5 2.5 0 0 0 4 22.5V4.5z"/>
    <path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H13v18h4.5a2.5 2.5 0 0 1 2.5 2.5V4.5z"/>
  </g>
  <text x="95" y="108" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="600" opacity="0.85" letter-spacing="1.1">KENNISPARTNER VAN</text>
  <text x="95" y="128" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="15" font-weight="800" letter-spacing="-0.3">Dierenkliniek.nl</text>
  <line x1="46" y1="140" x2="144" y2="140" stroke="white" stroke-width="1" opacity="0.3"/>
  <text x="95" y="160" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="600" opacity="0.9">${esc(praktijk)}</text>
</svg>`;

const HANDLEIDING = (praktijk, titel, artikelUrl, slug) => `============================================================
HANDLEIDING KENNISPARTNER-BADGE — ${praktijk}
============================================================

U bent vermeld als vakinhoudelijk aanspreekpunt bij het artikel:
"${titel}"

Uw artikelpagina:
${artikelUrl}


== WAT ZIT ER IN DEZE ZIP? ==

1. kennispartner-badge.svg / .png
   Vierkante badge met "KENNISPARTNER VAN Dierenkliniek.nl", uw
   praktijknaam en het artikel waar u aan gekoppeld bent.
   Geschikt voor op uw contact- of over-ons-pagina.

2. kennispartner-badge-klein.svg / .png
   Kleinere, subtielere variant zonder artikeltitel — geschikt voor
   in de footer of sidebar van uw website.

3. Dit bestand (handleiding.txt).


== WAAROM EEN BADGE PLAATSEN? ==

  - Toont bezoekers van uw website dat u als vakinhoudelijk
    aanspreekpunt wordt vermeld bij een artikel op een onafhankelijk
    platform
  - Een link vanaf uw eigen website naar uw artikelpagina helpt
    Google om die pagina beter te waarderen (een kwaliteitsbacklink)
  - Verwijst bezoekers die het achterliggende onderwerp verder
    willen lezen door naar het volledige artikel


== HOE INSTALLEER IK DE BADGE OP MIJN WEBSITE? ==

STAP 1: Upload de gewenste badge (.svg of .png) naar uw website
        via uw contentbeheer-systeem (bijvoorbeeld WordPress "Media",
        of via FTP naar uw server).

STAP 2: Voeg een HTML-blok toe aan uw pagina. In WordPress heet dit
        een "Custom HTML"-blok, in Wix "Embed HTML", in Squarespace
        "Code Block", etc.

STAP 3: Kopieer onderstaande code en pas de afbeeldings-URL aan naar
        het pad waar u de badge heeft geupload.


== KOPIEERBARE HTML-CODE ==

--- VARIANT A: Grote badge (aanbevolen) ---

<a href="${artikelUrl}"
   target="_blank"
   title="Kennispartner van Dierenkliniek.nl"
   rel="noopener">
  <img src="[URL_NAAR_UW_GEUPLOADE_BADGE]/kennispartner-badge.png"
       alt="Kennispartner van Dierenkliniek.nl — ${praktijk}"
       width="220" height="220">
</a>


--- VARIANT B: Kleine badge (subtieler) ---

<a href="${artikelUrl}"
   target="_blank"
   title="Kennispartner van Dierenkliniek.nl"
   rel="noopener">
  <img src="[URL_NAAR_UW_GEUPLOADE_BADGE]/kennispartner-badge-klein.png"
       alt="Kennispartner van Dierenkliniek.nl — ${praktijk}"
       width="170" height="170">
</a>


== BELANGRIJK: NIET NOFOLLOW ==

Een normale link (zonder rel="nofollow") van uw website naar uw
artikelpagina helpt beide kanten: uw eigen SEO profiteert van de
bevestigde vakinhoudelijke koppeling, en uw artikelpagina op
Dierenkliniek.nl krijgt een kwaliteitsboost bij Google.


== VRAGEN OF HULP NODIG? ==

Als uw website wordt beheerd door een webbouwer, stuur hem/haar dit
hele bestand met de vraag: "graag deze badge toevoegen aan onze
website". Alle info die nodig is staat hierboven.

Vragen kunt u sturen naar: info@dierenkliniek.nl


============================================================
WWW.DIERENKLINIEK.NL — HET ONAFHANKELIJKE PLATFORM
============================================================
`;

function launchBrowser() {
  // Deze omgeving provisioneert Chromium op een eigen pad dat niet matcht met
  // wat Playwright standaard verwacht (zelfde workaround als generate-badges.js).
  const exe = '/opt/pw-browsers/chromium';
  return chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
}

async function svgToPng(browser, svg, size) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 2 });
  const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  await page.goto(dataUrl);
  const buf = await page.screenshot({ omitBackground: false });
  await page.close();
  return buf;
}

(async () => {
  const outDir = path.join(ROOT, 'badges', 'kennisbank', slugArg);
  fs.mkdirSync(outDir, { recursive: true });

  const badgeSvg = BADGE_SVG(praktijkArg, titel);
  const badgeKleinSvg = BADGE_KLEIN_SVG(praktijkArg);
  const handleiding = HANDLEIDING(praktijkArg, titel, artikelUrl, slugArg);

  const browser = await launchBrowser();
  const badgePng = await svgToPng(browser, badgeSvg, 240);
  const badgeKleinPng = await svgToPng(browser, badgeKleinSvg, 190);
  await browser.close();

  fs.writeFileSync(path.join(outDir, 'kennispartner-badge.svg'), badgeSvg);
  fs.writeFileSync(path.join(outDir, 'kennispartner-badge.png'), badgePng);
  fs.writeFileSync(path.join(outDir, 'kennispartner-badge-klein.svg'), badgeKleinSvg);
  fs.writeFileSync(path.join(outDir, 'kennispartner-badge-klein.png'), badgeKleinPng);
  fs.writeFileSync(path.join(outDir, 'handleiding.txt'), handleiding);

  const zipPath = path.join(outDir, `kennispartner-${slugArg}.zip`);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  execFileSync('zip', ['-jq', zipPath,
    path.join(outDir, 'kennispartner-badge.svg'), path.join(outDir, 'kennispartner-badge.png'),
    path.join(outDir, 'kennispartner-badge-klein.svg'), path.join(outDir, 'kennispartner-badge-klein.png'),
    path.join(outDir, 'handleiding.txt')]);

  console.log(`klaar: badges/kennisbank/${slugArg}/`);
})();
