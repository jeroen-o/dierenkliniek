// Genereert de badge-bestanden (SVG + PNG + ZIP) voor klinieken die nog geen
// badge hebben. Draai na het toevoegen van nieuwe klinieken aan CLINICS:
//
//   node tools/generate-badges.js
//
// Dit hoort niet bij node tools/build.js: badges zijn eenmalige, statische
// bestanden per kliniek (geen afgeleide van live data zoals de HTML-pagina's),
// dus ze worden alleen aangemaakt als ze nog ontbreken, nooit overschreven.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const L = require('./layout');
const { CLINICS } = require('./extract-data');

const ROOT = L.ROOT;
const BADGES = path.join(ROOT, 'badges');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PARTNER_SVG = (naam) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
  <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00A1E4"/><stop offset="100%" stop-color="#0070AC"/></linearGradient></defs>
  <rect width="220" height="220" rx="24" fill="url(#bg)"/>
  <circle cx="110" cy="62" r="34" fill="white" opacity="0.15"/>
  <g transform="translate(88, 43) scale(2.0)" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="4" cy="11" r="2"/><path d="M8 22c0-3 2-5 4-5s4 2 4 5-2 4-4 4-4-1-4-4z"/></g>
  <text x="110" y="118" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="600" opacity="0.85" letter-spacing="1.5">PARTNER VAN</text>
  <text x="110" y="142" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="17" font-weight="800" letter-spacing="-0.4">Dierenkliniek.nl</text>
  <line x1="55" y1="158" x2="165" y2="158" stroke="white" stroke-width="1" opacity="0.3"/>
  <text x="110" y="180" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="11" font-weight="600" opacity="0.95">${esc(naam)}</text>
</svg>`;

const VERMELD_SVG = (naam) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00A1E4"/><stop offset="100%" stop-color="#003E7E"/></linearGradient></defs>
  <rect width="180" height="180" rx="20" fill="url(#bg)"/>
  <g transform="translate(66, 22) scale(2.0)" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="4" cy="11" r="2"/><path d="M8 22c0-3 2-5 4-5s4 2 4 5-2 4-4 4-4-1-4-4z"/></g>
  <text x="90" y="108" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="600" opacity="0.85" letter-spacing="1.2">VERMELD OP</text>
  <text x="90" y="128" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="15" font-weight="800" letter-spacing="-0.3">Dierenkliniek.nl</text>
  <line x1="42" y1="140" x2="138" y2="140" stroke="white" stroke-width="1" opacity="0.3"/>
  <text x="90" y="158" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="600" opacity="0.9">${esc(naam)}</text>
</svg>`;

// Generieke varianten (geen klinieknaam) — identiek voor elke kliniek.
const BANNER_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="340" height="90" viewBox="0 0 340 90">
  <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00A1E4"/><stop offset="100%" stop-color="#0070AC"/></linearGradient></defs>
  <rect width="340" height="90" rx="14" fill="url(#bg)"/>
  <circle cx="45" cy="45" r="26" fill="white" opacity="0.15"/>
  <g transform="translate(29, 27) scale(1.35)" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="4" cy="11" r="2"/><path d="M8 22c0-3 2-5 4-5s4 2 4 5-2 4-4 4-4-1-4-4z"/></g>
  <text x="85" y="40" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12" font-weight="500" opacity="0.85">Wij zijn te vinden op</text>
  <text x="85" y="62" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="20" font-weight="800" letter-spacing="-0.5">Dierenkliniek.nl</text>
  <text x="85" y="78" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" opacity="0.7">Vergelijk 600+ dierenklinieken</text>
</svg>`;

const ROND_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0070AC"/><stop offset="100%" stop-color="#003E7E"/></linearGradient></defs>
  <rect width="180" height="180" rx="90" fill="url(#bg)"/>
  <g transform="translate(65, 38) scale(2.1)" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="4" cy="11" r="2"/><path d="M8 22c0-3 2-5 4-5s4 2 4 5-2 4-4 4-4-1-4-4z"/></g>
  <text x="90" y="118" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="500" opacity="0.85" letter-spacing="0.8">ONAFHANKELIJK</text>
  <text x="90" y="134" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="500" opacity="0.85" letter-spacing="0.8">VERMELD OP</text>
  <text x="90" y="155" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="15" font-weight="800" letter-spacing="-0.3">Dierenkliniek.nl</text>
</svg>`;

const HANDLEIDING = (naam, slug) => `============================================================
HANDLEIDING BADGE — ${naam}
============================================================

Uw persoonlijke pagina op Dierenkliniek.nl:
https://dierenkliniek.nl/${slug}


== WAT ZIT ER IN DEZE ZIP? ==

1. badge-partner.svg / .png
   Vierkante badge met "PARTNER VAN Dierenkliniek.nl" en uw klinieknaam.
   Geschikt als prominente vermelding op uw contact- of over-ons-pagina.

2. badge-vermeld.svg / .png
   Kleinere badge met "VERMELD OP Dierenkliniek.nl" en uw klinieknaam.
   Subtiel te plaatsen in uw footer of sidebar.

3. badge-banner.svg
   Horizontale banner-variant (generiek, geen klinieknaam).

4. badge-rond.svg
   Ronde variant (generiek, geen klinieknaam).

5. Dit bestand (handleiding.txt).


== WAAROM EEN BADGE PLAATSEN? ==

Steeds meer huisdiereigenaren checken online voordat ze een dierenarts
bezoeken. Een badge op uw website:

  - Straalt vertrouwen uit — u wordt onafhankelijk vermeld
  - Verlaagt drempel — bezoekers kunnen doorklikken voor meer info
  - Verbetert uw SEO — een backlink van uw eigen website naar uw
    Dierenkliniek.nl-pagina helpt Google om uw pagina beter te indexeren
  - Werkt beide kanten op — uw eigen website krijgt ook meer vertrouwen
    door onafhankelijke vermelding


== HOE INSTALLEER IK DE BADGE OP MIJN WEBSITE? ==

STAP 1: Upload de gewenste badge (.svg of .png) naar uw website
        via uw contentbeheer-systeem (bijvoorbeeld WordPress "Media",
        of via FTP naar uw server).

STAP 2: Voeg een HTML-blok toe aan uw pagina. In WordPress heet dit
        een "Custom HTML"-blok, in Wix "Embed HTML", in Squarespace
        "Code Block", etc.

STAP 3: Kopieer een van de onderstaande code-snippets en pas de
        afbeeldings-URL aan naar het pad waar u de badge heeft geupload.


== KOPIEERBARE HTML-CODE ==

--- VARIANT A: Grote partner badge (aanbevolen) ---

<a href="https://dierenkliniek.nl/${slug}"
   target="_blank"
   title="Partner van Dierenkliniek.nl"
   rel="noopener">
  <img src="[URL_NAAR_UW_GEUPLOADE_BADGE]/badge-partner.png"
       alt="Partner van Dierenkliniek.nl — ${naam}"
       width="200" height="200">
</a>


--- VARIANT B: Kleine 'Vermeld op' badge (subtieler) ---

<a href="https://dierenkliniek.nl/${slug}"
   target="_blank"
   title="Vermeld op Dierenkliniek.nl"
   rel="noopener">
  <img src="[URL_NAAR_UW_GEUPLOADE_BADGE]/badge-vermeld.png"
       alt="Vermeld op Dierenkliniek.nl — ${naam}"
       width="160" height="160">
</a>


--- VARIANT C: Zonder eigen upload (badge vanaf Dierenkliniek.nl laden) ---

Wilt u de badge niet zelf uploaden? Gebruik dan onze publieke URL:

<a href="https://dierenkliniek.nl/${slug}"
   target="_blank"
   title="Partner van Dierenkliniek.nl"
   rel="noopener">
  <img src="https://dierenkliniek.nl/badge-partner.svg"
       alt="Partner van Dierenkliniek.nl"
       width="200" height="200">
</a>

LET OP: deze variant toont de generieke badge zonder uw klinieknaam.


== BELANGRIJK: NIET NOFOLLOW ==

Uw webbouwer of SEO-plugin kan proberen om alle uitgaande links
automatisch een rel="nofollow" attribuut te geven. Voor deze
badge-link is dat NIET nodig.

Een normale link (zonder nofollow) van uw kliniek-website naar
uw Dierenkliniek.nl-pagina helpt beide sites: uw eigen SEO
verbetert door de bevestigde partner-relatie, en uw pagina op
Dierenkliniek.nl krijgt ook een kwaliteitsboost bij Google.


== VRAGEN OF HULP NODIG? ==

Als uw website wordt beheerd door een webbouwer, stuur hem/haar
dit hele bestand met de vraag: "graag deze badge toevoegen aan
onze website". Alle info die nodig is staat hierboven.

Vragen kunt u sturen naar: info@dierenkliniek.nl


============================================================
WWW.DIERENKLINIEK.NL — HET ONAFHANKELIJKE PLATFORM
============================================================
`;

async function svgToPng(browser, svg, size) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 2 });
  const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  await page.goto(dataUrl);
  const buf = await page.screenshot({ omitBackground: false });
  await page.close();
  return buf;
}

(async () => {
  const ontbrekend = CLINICS.filter(c => !fs.existsSync(path.join(BADGES, L.clinicSlug(c) + '-partner.svg')));
  if (!ontbrekend.length) { console.log('alle klinieken hebben al een badge'); return; }
  console.log(`${ontbrekend.length} klinieken zonder badge, genereren...`);

  const browser = await chromium.launch();
  for (const c of ontbrekend) {
    const slug = L.clinicSlug(c);
    const partnerSvg = PARTNER_SVG(c.name);
    const vermeldSvg = VERMELD_SVG(c.name);
    const partnerPng = await svgToPng(browser, partnerSvg, 220);
    const vermeldPng = await svgToPng(browser, vermeldSvg, 180);
    const handleiding = HANDLEIDING(c.name, slug);

    fs.writeFileSync(path.join(BADGES, `${slug}-partner.svg`), partnerSvg);
    fs.writeFileSync(path.join(BADGES, `${slug}-vermeld.svg`), vermeldSvg);
    fs.writeFileSync(path.join(BADGES, `${slug}-partner.png`), partnerPng);
    fs.writeFileSync(path.join(BADGES, `${slug}-vermeld.png`), vermeldPng);
    fs.writeFileSync(path.join(BADGES, `${slug}-handleiding.txt`), handleiding);

    // Zip met de generieke bestandsnamen (badge-partner.svg etc.), zoals de
    // handleiding ze noemt — niet de site-brede slug-namen.
    const stage = fs.mkdtempSync('/tmp/badge-');
    fs.writeFileSync(path.join(stage, 'badge-partner.svg'), partnerSvg);
    fs.writeFileSync(path.join(stage, 'badge-vermeld.svg'), vermeldSvg);
    fs.writeFileSync(path.join(stage, 'badge-partner.png'), partnerPng);
    fs.writeFileSync(path.join(stage, 'badge-vermeld.png'), vermeldPng);
    fs.writeFileSync(path.join(stage, 'badge-banner.svg'), BANNER_SVG);
    fs.writeFileSync(path.join(stage, 'badge-rond.svg'), ROND_SVG);
    fs.writeFileSync(path.join(stage, 'handleiding.txt'), handleiding);
    const zipPath = path.join(BADGES, `${slug}.zip`);
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    execFileSync('zip', ['-jq', zipPath,
      path.join(stage, 'badge-partner.svg'), path.join(stage, 'badge-vermeld.svg'),
      path.join(stage, 'badge-partner.png'), path.join(stage, 'badge-vermeld.png'),
      path.join(stage, 'badge-banner.svg'), path.join(stage, 'badge-rond.svg'),
      path.join(stage, 'handleiding.txt')]);
    fs.rmSync(stage, { recursive: true, force: true });

    console.log('  ' + slug);
  }
  await browser.close();
  console.log('klaar');
})();
