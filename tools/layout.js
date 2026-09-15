// Gedeelde layout voor statisch gegenereerde pagina's.
// Header, footer en CSS worden uit een bestaande stadpagina gelezen zodat de
// huisstijl van de site exact gelijk blijft.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://dierenkliniek.nl';
const tpl = fs.readFileSync(path.join(ROOT, 'dierenarts-amsterdam.html'), 'utf8');

const STYLE = (tpl.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
const HEADER = (tpl.match(/<header class="site-header">[\s\S]*?<\/header>/) || [''])[0];
const FOOTER = (tpl.match(/<footer class="site-footer">[\s\S]*?<\/footer>/) || [''])[0];

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

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
  .link-card h4 { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
  .link-card p { font-size: 13px; color: #6b7280; margin: 0; }
  .tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 0; }
  .faq details { border-bottom: 1px solid #eef2f6; padding: 12px 0; }
  .faq summary { cursor: pointer; font-weight: 700; }
  .faq details p { margin: 10px 0 0; color: #4A5C70; }
  .callout { background: #FFF7ED; border-left: 4px solid #FF6B35; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 15px; }
  .callout-red { background: #FEF2F2; border-left-color: #E63946; }
  .toc { background: #F8FBFD; border: 1px solid #E5EDF3; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; }
  .toc ul { list-style: none; padding: 0; }
  .openingstijden { width: 100%; max-width: 420px; border-collapse: collapse; }
  .openingstijden th, .openingstijden td { text-align: left; padding: 9px 4px; border-bottom: 1px solid #eef2f6; font-size: 15px; }
  .openingstijden th { font-weight: 600; color: #4A5C70; width: 45%; }
  .openingstijden td { font-variant-numeric: tabular-nums; }
  .openingstijden td.dicht { color: #8A98A8; }
  .tijden-bron { font-size: 13px; color: #8A98A8; margin-top: 10px; }
  .tijden-onbevestigd { font-size: 13.5px; color: #78350F; background: #FEF3C7; border-left: 3px solid #F59E0B; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-top: 12px; }
  .visueel-verborgen { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .toc li { padding: 5px 0; border-bottom: none; }
`;

// Officiele profielen van Dierenkliniek.nl. Voeg een nieuwe regel toe zodra een
// profiel live staat, draai daarna: node tools/build.js
const SOCIALE_PROFIELEN = [
  'https://www.linkedin.com/company/146355905/',
  'https://www.facebook.com/dierenkliniek.nl',
  'https://www.instagram.com/dierenkliniek.nl/'
];

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
<style>${STYLE}${EXTRA_CSS}</style>
</head>
<body>
${HEADER}
<main>
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
const provinceOf = (c) => PROVINCE_LOOKUP[(c.postcode || '').replace(/\s/g, '').slice(0, 2)] || null;

module.exports = { SITE, ROOT, page, esc, stripTags, slugify, breadcrumbLd, breadcrumbHtml, faqLd, faqHtml, ORGANIZATION, SOCIALE_PROFIELEN,
  clinicSlug, citySlug, provinceOf, PROVINCE_LOOKUP, PROVINCE_DESCRIPTIONS, CLINIC_SLUG_OVERRIDES };
