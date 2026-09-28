// Gedeelde layout voor statisch gegenereerde pagina's.
// Header, footer en CSS staan als losse sjabloonbestanden in tools/sjabloon/,
// zodat de huisstijl op alle gegenereerde pagina's exact gelijk blijft en op
// één plek te wijzigen is.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://dierenkliniek.nl';
const SJABLOON = path.join(__dirname, 'sjabloon');
const sjabloon = (naam) => fs.readFileSync(path.join(SJABLOON, naam), 'utf8');

const HEADER = sjabloon('header.html').trimEnd();
const FOOTER = sjabloon('footer.html').trimEnd();

// Piepklein, blokkerend script dat de opgeslagen a11y-voorkeuren (tekstgrootte/
// contrast/dyslexie) meteen toepast, vóór de eerste render — zodat een
// bezoeker die dit al had ingesteld geen "flits" van de standaardweergave
// ziet. Het volledige widget-script (knop + paneel bouwen) mag wél met defer,
// dat hoeft niet het parsen van de pagina te blokkeren.
const A11Y_INLINE = `<script>(function(){try{var p=JSON.parse(localStorage.getItem('dk_a11y_prefs_v1')||'{}'),r=document.documentElement;if(p.tekst==='lg')r.classList.add('a11y-text-lg');if(p.tekst==='xl')r.classList.add('a11y-text-xl');if(p.contrast)r.classList.add('a11y-contrast');if(p.dyslexie)r.classList.add('a11y-dyslexie');}catch(e){}})();</script>`;
const A11Y_HEAD = `<link rel="stylesheet" href="/css/a11y.css">
${A11Y_INLINE}
<script src="/js/a11y-widget.js" defer></script>`;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Zet URL's in een (al met esc() geëscapete) tekst om in klikbare links, voor
// vrije tekst (c.desc) die af en toe een website of boekingslink noemt.
const URL_RE = /(https?:\/\/[^\s<]+)|((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:nl|com|online|org|eu|net)(?:\/[^\s<]*)?)/gi;
function linkify(escapedText) {
  return String(escapedText || '').replace(URL_RE, (match) => {
    let trail = '';
    while (/[.,;:!?)]$/.test(match)) {
      trail = match.slice(-1) + trail;
      match = match.slice(0, -1);
    }
    const href = /^https?:\/\//i.test(match) ? match : `https://${match}`;
    return `<a href="${href}" target="_blank" rel="noopener">${match}</a>${trail}`;
  });
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['"`]/g, '')
    .replace(/&/g, ' en ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

const EXTRA_CSS = `
  .prose h2 { font-size: 26px; font-weight: 800; letter-spacing: -0.01em; margin: 32px 0 12px; }
  .prose h3 { font-size: 20px; font-weight: 700; margin: 26px 0 10px; }
  .prose p { margin-bottom: 16px; }
  .prose ul, .prose ol { padding-left: 22px; margin-bottom: 16px; }
  .prose ul { list-style: disc; }
  .prose ol { list-style: decimal; }
  .prose ul li, .prose ol li { padding: 4px 0; border-bottom: none; display: list-item; }
  .prose table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .prose th, .prose td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 15px; }
  .meta-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; color: #6b7280; font-size: 14px; margin-bottom: 24px; }
  .pill { display: inline-block; background: #f0f9ff; color: #0070AC; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; text-decoration: none; }
  .pill-red { background: #FEF2F2; color: #B32E1E; }
  .grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  .link-card { display: block; padding: 16px; border: 1px solid #e5e7eb; border-radius: 10px; text-decoration: none; color: #0a1628; transition: all .2s; background: #fff; }
  .link-card:hover { border-color: #00A1E4; background: #f0f9ff; }
  .link-card h3 { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
  .link-card p { font-size: 13px; color: #6b7280; margin: 0; }
  .tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 0; }
  .faq details { border-bottom: 1px solid #eef2f6; padding: 12px 0; }
  .faq summary { cursor: pointer; font-weight: 700; }
  .faq details p { margin: 10px 0 0; color: #0a1628; font-weight: 700; }
  .callout { background: #FFF7ED; border-left: 4px solid #FF6B35; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 15px; }
  .callout-red { background: #FEF2F2; border-left-color: #E63946; }
  .toc { background: #F8FBFD; border: 1px solid #E5EDF3; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; }
  .toc ul { list-style: none; padding: 0; }
  .kliniek-fotos { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 16px; }
  .kliniek-fotos img { width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 10px; display: block; }
  .openingstijden { width: 100%; max-width: 420px; border-collapse: collapse; }
  .openingstijden th, .openingstijden td { text-align: left; padding: 9px 4px; border-bottom: 1px solid #eef2f6; font-size: 15px; }
  .openingstijden th { font-weight: 600; color: #4A5C70; width: 45%; }
  .openingstijden td { font-variant-numeric: tabular-nums; }
  .openingstijden td.dicht { color: #627080; }
  .tijden-bron { font-size: 13px; color: #627080; margin-top: 10px; }
  .tijden-onbevestigd { font-size: 13.5px; color: #78350F; background: #FEF3C7; border-left: 3px solid #F59E0B; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-top: 12px; }
  .visueel-verborgen { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .toc li { padding: 5px 0; border-bottom: none; }
`;

// Officiele profielen van Dierenkliniek.nl. Voeg een nieuwe regel toe zodra een
// profiel live staat, draai daarna: node tools/build.js
const SOCIALE_PROFIELEN = [
  'https://www.linkedin.com/company/dierenkliniek-nl/',
  'https://www.facebook.com/dierenkliniek.nl',
  'https://www.instagram.com/dierenkliniek.nl/'
];

// Merkglyphs als inline SVG (geen extra requests, schaalt mee, neemt de
// omringende tekstkleur over) — gedeeld door build-social.js (footer van de
// site zelf) en build-klinieken.js (social-links van een individuele kliniek).
const SOCIAL_GLYPHS = {
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

// Organization-schema dat op elke gegenereerde pagina hoort (entiteitsconsistentie
// voor Google Knowledge Graph en AI-assistenten).
const ORGANIZATION = {
  '@type': 'Organization',
  '@id': SITE + '/#organization',
  name: 'Dierenkliniek.nl',
  url: SITE + '/',
  logo: { '@type': 'ImageObject', url: SITE + '/logo-512.png', width: 512, height: 512 },
  email: 'info@dierenkliniek.nl',
  telephone: '+31659115265',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Darthuizerberg 1',
    postalCode: '3825 BK',
    addressLocality: 'Amersfoort',
    addressCountry: 'NL'
  },
  areaServed: { '@type': 'Country', name: 'Nederland' },
  // sameAs koppelt de officiele profielen aan deze organisatie. Google en
  // taalmodellen gebruiken dat om te bepalen dat het steeds om dezelfde
  // partij gaat. Vul een profiel pas in als het echt bestaat en beheerd wordt.
  sameAs: SOCIALE_PROFIELEN,
  // Bereikbaarheid van het eigen kantoor in Amersfoort, opgegeven door de
  // exploitant. Dit zegt niets over de openingstijden van de klinieken.
  openingHoursSpecification: [
      {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "https://schema.org/Monday",
          "opens": "12:30",
          "closes": "17:00"
      },
      {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "https://schema.org/Tuesday",
          "opens": "09:00",
          "closes": "17:00"
      },
      {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "https://schema.org/Wednesday",
          "opens": "09:00",
          "closes": "17:00"
      },
      {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "https://schema.org/Thursday",
          "opens": "09:00",
          "closes": "17:00"
      },
      {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "https://schema.org/Friday",
          "opens": "09:00",
          "closes": "17:00"
      },
      {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "https://schema.org/Saturday",
          "opens": "00:00",
          "closes": "00:00"
      },
      {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "https://schema.org/Sunday",
          "opens": "00:00",
          "closes": "00:00"
      }
  ]
};

function breadcrumbLd(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: SITE + it.url
    }))
  };
}

function breadcrumbHtml(items) {
  const parts = items.map((it, i) =>
    i === items.length - 1
      ? `<span>${esc(it.name)}</span>`
      : `<a href="${esc(it.url)}">${esc(it.name)}</a> ›`
  );
  return `<nav class="breadcrumb" aria-label="Kruimelpad">${parts.join('\n  ')}</nav>`;
}

// Data leverde lang voor elke kliniek dezelfde placeholder-omschrijving
// ("Veterinaire kliniek in X. Volledige zorg voor gezelschapsdieren.") —
// diezelfde tekst stond zichtbaar op 1079 pagina's. Waar de data een
// specialisme of 24/7-spoeddienst vermeldt, gebruiken we dat in plaats van de
// placeholder. Een kliniek met een eigen, afwijkende tekst in c.desc (43
// stuks) behoudt die altijd; hier verzinnen we niets bij wat we niet weten.
const GENERIEKE_DESC = /^Veterinaire kliniek in [^.]+\.(\s*Volledige zorg voor gezelschapsdieren\.)?$/;
function beschrijvingVoor(c) {
  if (c.desc && !GENERIEKE_DESC.test(c.desc)) return c.desc;
  const specs = c.specs || [];
  const isSpoed = (c.tags || []).includes('spoed');
  let zin = `Dierenarts in ${c.city}`;
  if (isSpoed && specs.length) zin += ` met 24/7 spoedhulp, gespecialiseerd in ${specs.join(', ')}`;
  else if (isSpoed) zin += ' met 24/7 spoedhulp';
  else if (specs.length) zin += ` gespecialiseerd in ${specs.join(', ')}`;
  return zin + '.';
}

function faqLd(faqs) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

function faqHtml(faqs, heading = 'Veelgestelde vragen') {
  return `<section class="card faq">
  <h2>${esc(heading)}</h2>
  ${faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${f.a}</p></details>`).join('\n  ')}
</section>`;
}

function page(opts) {
  const {
    title, description, canonical, bodyHtml,
    jsonld = [], lastmod, ogType = 'article', geo, extraHead = '', robots
  } = opts;

  const graph = { '@context': 'https://schema.org', '@graph': [ORGANIZATION, ...jsonld] };

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(SITE + canonical)}">
<meta name="robots" content="${esc(robots || 'index, follow, max-image-preview:large, max-snippet:-1')}">
<meta property="og:type" content="${esc(ogType)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(SITE + canonical)}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="nl_NL">
<meta property="og:site_name" content="Dierenkliniek.nl">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/og-image.png">
<meta name="geo.region" content="NL">
<meta name="geo.placename" content="${esc(geo && geo.place || 'Nederland')}">${geo && geo.position ? `
<meta name="geo.position" content="${esc(geo.position)}">
<meta name="ICBM" content="${esc(geo.position.replace(';', ', '))}">` : ''}
<link rel="alternate" hreflang="nl" href="${esc(SITE + canonical)}">
<link rel="alternate" hreflang="x-default" href="${esc(SITE + canonical)}">
<meta name="author" content="Dierenkliniek.nl">
<meta name="publisher" content="Dierenkliniek.nl">${lastmod ? `
<meta name="last-modified" content="${esc(lastmod)}">` : ''}
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#00A1E4">
${extraHead}
<script type="application/ld+json">
${JSON.stringify(graph, null, 2)}
</script>
<link rel="stylesheet" href="/css/stad.css">
<link rel="stylesheet" href="/css/extra.css">
${A11Y_HEAD}
</head>
<body>
<a href="#main-content" class="skip-link">Ga direct naar de inhoud</a>
${HEADER}
<main id="main-content" tabindex="-1">
${bodyHtml}
</main>
${FOOTER}
</body>
</html>
`;
}

// --- Gedeelde helpers die data uit index.html hergebruiken -------------------
const vm = require('vm');
const indexSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function grabObject(name) {
  const start = indexSrc.indexOf('const ' + name + ' = {');
  if (start === -1) throw new Error('Niet gevonden: ' + name);
  const open = indexSrc.indexOf('{', start);
  let depth = 0, inStr = null, escaped = false;
  for (let i = open; i < indexSrc.length; i++) {
    const ch = indexSrc[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (inStr) { if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return vm.runInNewContext('(' + indexSrc.slice(open, i + 1) + ')'); }
  }
  throw new Error('Onafgesloten object: ' + name);
}

const CLINIC_SLUG_OVERRIDES = grabObject('CLINIC_SLUG_OVERRIDES');
const PROVINCE_LOOKUP = grabObject('PROVINCE_LOOKUP');
const PROVINCE_DESCRIPTIONS = grabObject('PROVINCE_DESCRIPTIONS');

// Identiek aan clinicSlug() in index.html, inclusief collision-overrides.
function clinicSlug(c) {
  if (c && c.id != null && CLINIC_SLUG_OVERRIDES[String(c.id)]) return CLINIC_SLUG_OVERRIDES[String(c.id)];
  return slugify(c.name) + '-dierenarts-in-' + slugify(c.city);
}
const citySlug = (city) => 'dierenarts-' + slugify(city);

// Identiek aan getProvinceFromPostcode() in index.html: eerst de viercijferige
// bereiken, dan pas de grove tweecijferige tabel als vangnet.
const PROVINCE_RANGES = require('./extract-data').PROVINCE_RANGES;
function provinceOf(c) {
  const pc = String(c.postcode || '').replace(/\s/g, '');
  const pc4 = parseInt(pc.slice(0, 4), 10);
  const bereik = PROVINCE_RANGES.find(([van, tot]) => pc4 >= van && pc4 <= tot);
  if (bereik) return bereik[2];
  return PROVINCE_LOOKUP[pc.slice(0, 2)] || null;
}

module.exports = { SITE, ROOT, page, esc, linkify, stripTags, slugify, breadcrumbLd, breadcrumbHtml, faqLd, faqHtml, ORGANIZATION, SOCIALE_PROFIELEN, SOCIAL_GLYPHS,
  clinicSlug, citySlug, provinceOf, PROVINCE_LOOKUP, PROVINCE_DESCRIPTIONS, CLINIC_SLUG_OVERRIDES, HEADER, FOOTER, sjabloon, EXTRA_CSS, beschrijvingVoor, A11Y_HEAD };
