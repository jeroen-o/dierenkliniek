// Geeft de vertrouwenspagina's een eigen, indexeerbare URL.
//
// Over ons, onafhankelijkheid, contact en partners stonden wel als HTML in
// index.html, maar deelden allemaal de URL van de homepage. Daardoor had geen
// van die pagina's een eigen canonical, titel of vermelding in de zoekresultaten.
// Juist deze pagina's gebruiken Google en AI-assistenten om te beoordelen of een
// site betrouwbaar is.
//
// De inhoud, opmaak, header en footer komen rechtstreeks uit index.html, zodat
// er maar één bron van waarheid blijft.
const fs = require('fs');
const path = require('path');
const L = require('./layout');

const ROOT = L.ROOT;
const SITE = L.SITE;
const BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const STYLE = (src.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
const HEADER = (src.match(/<header>[\s\S]*?<\/header>/) || [''])[0];
const FOOTER = (src.match(/<footer>[\s\S]*?<\/footer>/) || [''])[0];

// Haalt één <div class="view" data-view="..."> uit index.html, inclusief de
// geneste div's.
function grabView(name) {
  const open = `<div class="view" data-view="${name}">`;
  const start = src.indexOf(open);
  if (start === -1) throw new Error('View niet gevonden: ' + name);
  let depth = 0, i = start;
  for (;;) {
    const nextOpen = src.indexOf('<div', i + 1);
    const nextClose = src.indexOf('</div>', i + 1);
    if (nextClose === -1) throw new Error('Onafgesloten view: ' + name);
    if (nextOpen !== -1 && nextOpen < nextClose) { depth++; i = nextOpen; }
    else if (depth === 0) return src.slice(start, nextClose + 6);
    else { depth--; i = nextClose; }
  }
}

const PAGINAS = [
  {
    view: 'about',
    slug: 'over-ons',
    title: 'Over Dierenkliniek.nl — wie wij zijn en waarom',
    description: 'Dierenkliniek.nl is het onafhankelijke overzicht van alle dierenklinieken in Nederland. Lees wie erachter zit en hoe het platform werkt.',
    kruimel: 'Over ons',
    schema: () => ({
      '@type': 'AboutPage',
      '@id': SITE + '/over-ons#webpage',
      name: 'Over Dierenkliniek.nl',
      url: SITE + '/over-ons',
      inLanguage: 'nl-NL',
      mainEntity: { '@id': SITE + '/#organization' }
    })
  },
  {
    view: 'onafhankelijkheid',
    slug: 'onafhankelijkheid',
    title: 'Onafhankelijkheidsverklaring | Dierenkliniek.nl',
    description: 'Hoe Dierenkliniek.nl onafhankelijk blijft: geen betaalde posities in de zoekresultaten, gratis basisvermelding en een vast vermeldingsbeleid.',
    kruimel: 'Onafhankelijkheid',
    schema: () => ({
      '@type': 'WebPage',
      '@id': SITE + '/onafhankelijkheid#webpage',
      name: 'Onafhankelijkheidsverklaring',
      url: SITE + '/onafhankelijkheid',
      inLanguage: 'nl-NL',
      about: { '@id': SITE + '/#organization' },
      publisher: { '@id': SITE + '/#organization' }
    })
  },
  {
    view: 'contact',
    slug: 'contact',
    title: 'Contact opnemen met Dierenkliniek.nl',
    description: 'Vragen over een vermelding, een correctie of samenwerking? Neem contact op met Dierenkliniek.nl in Amersfoort.',
    kruimel: 'Contact',
    schema: () => ({
      '@type': 'ContactPage',
      '@id': SITE + '/contact#webpage',
      name: 'Contact',
      url: SITE + '/contact',
      inLanguage: 'nl-NL',
      mainEntity: {
        '@type': 'ContactPoint',
        contactType: 'klantenservice',
        email: 'info@dierenkliniek.nl',
        telephone: '+31659115265',
        availableLanguage: ['nl', 'en'],
        areaServed: 'NL'
      }
    })
  },
  {
    view: 'partners',
    slug: 'partners',
    title: 'Partners van Dierenkliniek.nl',
    description: 'De organisaties in dierenwelzijn en diergeneeskunde waar Dierenkliniek.nl naar verwijst en mee samenwerkt.',
    kruimel: 'Partners',
    schema: () => ({
      '@type': 'CollectionPage',
      '@id': SITE + '/partners#webpage',
      name: 'Partners van Dierenkliniek.nl',
      url: SITE + '/partners',
      inLanguage: 'nl-NL',
      isPartOf: { '@id': SITE + '/#organization' }
    })
  }
];

function render(p) {
  const inhoud = grabView(p.view)
    // De view is in de SPA verborgen tot hij actief wordt; op een eigen pagina
    // moet hij meteen zichtbaar zijn.
    .replace(`<div class="view" data-view="${p.view}">`, `<div class="view active" data-view="${p.view}">`);

  const crumbs = [{ name: 'Home', url: '/' }, { name: p.kruimel, url: '/' + p.slug }];
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [L.ORGANIZATION, p.schema(), L.breadcrumbLd(crumbs)]
  };

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${L.esc(p.title)}</title>
<meta name="description" content="${L.esc(p.description)}">
<link rel="canonical" href="${SITE}/${p.slug}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta property="og:type" content="website">
<meta property="og:title" content="${L.esc(p.title)}">
<meta property="og:description" content="${L.esc(p.description)}">
<meta property="og:url" content="${SITE}/${p.slug}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="nl_NL">
<meta property="og:site_name" content="Dierenkliniek.nl">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${L.esc(p.title)}">
<meta name="twitter:description" content="${L.esc(p.description)}">
<meta name="twitter:image" content="${SITE}/og-image.png">
<meta name="geo.region" content="NL">
<meta name="geo.placename" content="Nederland">
<link rel="alternate" hreflang="nl" href="${SITE}/${p.slug}">
<link rel="alternate" hreflang="x-default" href="${SITE}/${p.slug}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#00A1E4">
<script type="application/ld+json">
${JSON.stringify(graph, null, 2)}
</script>
<style>${STYLE}
/* Op een eigen pagina is er maar één view en die is altijd zichtbaar. */
.view { display: block; }
.dk-kruimel { max-width: 1280px; margin: 0 auto; padding: 18px 24px 0; font-size: 14px; color: #627080; }
.dk-kruimel a { color: #0070AC; }
</style>
</head>
<body>
${HEADER}
<nav class="dk-kruimel" aria-label="Kruimelpad">
  <a href="/">Home</a> › <span>${L.esc(p.kruimel)}</span>
</nav>
<main>
${inhoud}
</main>
${FOOTER}
</body>
</html>
`;
}

const urls = [];
for (const p of PAGINAS) {
  fs.writeFileSync(path.join(ROOT, p.slug + '.html'), render(p));
  urls.push('/' + p.slug);
  console.log('geschreven: /' + p.slug);
}
fs.writeFileSync(path.join(__dirname, 'vertrouwens-urls.json'), JSON.stringify(urls, null, 2));
console.log(`vertrouwenspagina's: ${urls.length}`);
