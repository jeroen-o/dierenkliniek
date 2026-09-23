// Genereert statische HTML voor de 64 kennisbank-artikelen plus overzichtspagina's.
// Reden: de kennisbank bestond alleen client-side (?article=slug). AI-crawlers
// (GPTBot, PerplexityBot, ClaudeBot) voeren geen JavaScript uit en zagen dus niets.
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const DATA = require('./extract-data');

const ROOT = L.ROOT;
const OUT = path.join(ROOT, 'kennisbank');
const BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);

const { KB_ARTICLES, KB_CATEGORIES, KB_ANIMALS, CLINICS } = DATA;
const catBySlug = Object.fromEntries(KB_CATEGORIES.map(c => [c.slug, c]));
const animalBySlug = Object.fromEntries(KB_ANIMALS.map(a => [a.slug, a]));

// Zes artikelen hebben geen excerpt in de dataset; val terug op de eerste
// zinnen van de tekst zodat elke pagina een bruikbare meta description krijgt.
function autoExcerpt(html) {
  const plain = L.stripTags(html);
  let out = '';
  for (const sentence of plain.split(/(?<=[.!?])\s+/)) {
    if ((out + ' ' + sentence).trim().length > 155) break;
    out = (out + ' ' + sentence).trim();
  }
  return out || plain.slice(0, 152).trim() + '…';
}

const articles = KB_ARTICLES.map(a => ({
  ...a,
  slug: L.slugify(a.title),
  excerpt: (a.excerpt && a.excerpt.trim()) ? a.excerpt : autoExcerpt(a.content),
  hasOwnExcerpt: !!(a.excerpt && a.excerpt.trim())
}));
const bySlug = Object.fromEntries(articles.map(a => [a.slug, a]));
if (Object.keys(bySlug).length !== articles.length) throw new Error('Dubbele artikel-slug');

// Grootste steden voor interne linking naar de stadpagina's.
const cityCounts = {};
for (const c of CLINICS) cityCounts[c.city] = (cityCounts[c.city] || 0) + 1;
const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 12)
  .map(([city, n]) => ({ city, n, url: '/dierenarts-' + L.slugify(city) }));

const DISCLAIMER = `<div class="callout">
  <strong>Let op:</strong> dit artikel is algemene voorlichting en vervangt geen diagnose van een dierenarts.
  Twijfelt u over de gezondheid van uw dier? <a href="/">Zoek een dierenarts bij u in de buurt</a> of
  bekijk de <a href="/spoedhulp">klinieken met 24/7 spoedhulp</a>.
</div>`;

function related(a) {
  const sameAnimal = articles.filter(x => x.id !== a.id && a.animal && x.animal === a.animal);
  const sameCat = articles.filter(x => x.id !== a.id && x.category === a.category && !sameAnimal.includes(x));
  const rest = articles.filter(x => x.id !== a.id && !sameAnimal.includes(x) && !sameCat.includes(x));
  return [...sameAnimal, ...sameCat, ...rest].slice(0, 6);
}

// level: welke koptekst de kaarten krijgen, afhankelijk van wat eraan
// voorafgaat op de paginda — h3 als er al een h2 boven de grid staat, h2 als
// de grid direct na de h1 komt (geen niveau overslaan).
function cardGrid(list, level = 'h3') {
  return `<div class="grid-cards">
  ${list.map(x => `<a class="link-card" href="/kennisbank/${x.slug}">
    <${level} style="${level === 'h2' ? 'font-size:15px;font-weight:700;margin-bottom:4px;' : ''}">${L.esc(x.title)}</${level}>
    <p>${L.esc(x.excerpt.slice(0, 110))}${x.excerpt.length > 110 ? '…' : ''}</p>
  </a>`).join('\n  ')}
</div>`;
}

function cityLinks() {
  return `<section class="card">
  <h2>Direct een dierenarts vinden</h2>
  <p>Zoek een kliniek in uw plaats of bekijk het volledige overzicht van alle ${CLINICS.length} dierenklinieken in Nederland.</p>
  <div class="tag-row">
    ${topCities.map(c => `<a class="pill" href="${c.url}">Dierenarts ${L.esc(c.city)}</a>`).join('\n    ')}
  </div>
  <p style="margin-top:16px;"><a class="btn" href="/">Zoek op postcode →</a> <a class="btn btn-outline" href="/spoedhulp">⚡ Spoedhulp 24/7</a></p>
</section>`;
}

function articlePage(a) {
  const cat = catBySlug[a.category] || { name: 'Kennisbank', slug: 'praktisch' };
  const animal = a.animal ? animalBySlug[a.animal] : null;
  const crumbs = [
    { name: 'Home', url: '/' },
    { name: 'Kennisbank', url: '/kennisbank' },
    { name: cat.name, url: '/kennisbank/categorie-' + cat.slug },
    { name: a.title, url: '/kennisbank/' + a.slug }
  ];
  const desc = a.excerpt.length > 155 ? a.excerpt.slice(0, 152).trim() + '…' : a.excerpt;
  const plain = L.stripTags(a.content);

  const ld = [
    {
      '@type': 'Article',
      '@id': L.SITE + '/kennisbank/' + a.slug + '#article',
      headline: a.title,
      description: a.excerpt,
      articleSection: cat.name,
      inLanguage: 'nl-NL',
      wordCount: plain.split(' ').length,
      timeRequired: 'PT' + (a.read_min || 4) + 'M',
      datePublished: BUILD_DATE,
      dateModified: BUILD_DATE,
      author: { '@id': L.SITE + '/#organization' },
      publisher: { '@id': L.SITE + '/#organization' },
      image: L.SITE + '/og-image.png',
      mainEntityOfPage: { '@type': 'WebPage', '@id': L.SITE + '/kennisbank/' + a.slug },
      about: animal ? { '@type': 'Thing', name: animal.name } : { '@type': 'Thing', name: 'Diergezondheid' },
      isAccessibleForFree: true,
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.tldr'] }
    },
    L.breadcrumbLd(crumbs),
    ...(a.faq && a.faq.length ? [L.faqLd(a.faq)] : [])
  ];

  const body = `${L.breadcrumbHtml(crumbs)}
<article class="card prose">
  <h1>${L.esc(a.title)}</h1>
  <div class="meta-row">
    <a class="pill" href="/kennisbank/categorie-${cat.slug}">${L.esc(cat.name)}</a>
    ${animal ? `<a class="pill" href="/kennisbank/dier-${animal.slug}">${animal.emoji} ${L.esc(animal.name)}</a>` : ''}
    <span>${a.read_min || 4} min lezen</span>
    <span>Laatst bijgewerkt: ${BUILD_DATE}</span>
  </div>
  ${a.hasOwnExcerpt ? `<p class="tldr callout"><strong>In het kort:</strong> ${L.esc(a.excerpt)}</p>` : ''}
  ${a.content}
  ${DISCLAIMER}
</article>

${a.faq && a.faq.length ? L.faqHtml(a.faq) : ''}

<section class="card">
  <h2>Verder lezen</h2>
  ${cardGrid(related(a))}
  <p style="margin-top:16px;"><a href="/kennisbank/">Alle ${articles.length} artikelen in de kennisbank →</a></p>
</section>

${cityLinks()}`;

  // Titel binnen de weergavegrens van Google houden: het merksuffix vervalt
  // zodra de artikeltitel zelf al lang is.
  // Twee titels zijn te lang om automatisch in te korten zonder betekenisverlies.
  const TITLE_OVERRIDES = {
    'golden-retriever-veelvoorkomende-gezondheidsproblemen-en-levensverwachting':
      'Golden Retriever — gezondheidsproblemen en levensverwachting',
    'hond-geeft-over-wat-te-doen-wanneer-thuis-afwachten-en-wanneer-naar-de-dierenarts':
      'Hond geeft over — thuis afwachten of naar de dierenarts?'
  };
  if (TITLE_OVERRIDES[a.slug]) {
    return L.page({
      title: TITLE_OVERRIDES[a.slug], description: desc, canonical: '/kennisbank/' + a.slug,
      bodyHtml: body, jsonld: ld, lastmod: BUILD_DATE, ogType: 'article'
    });
  }

  const suffix = ' | Kennisbank Dierenkliniek.nl';
  const shortSuffix = ' | Dierenkliniek.nl';
  const pageTitle = (a.title + suffix).length <= 68 ? a.title + suffix
    : (a.title + shortSuffix).length <= 70 ? a.title + shortSuffix
    : a.title;

  return L.page({
    title: pageTitle,
    description: desc,
    canonical: '/kennisbank/' + a.slug,
    bodyHtml: body,
    jsonld: ld,
    lastmod: BUILD_DATE,
    ogType: 'article'
  });
}

function indexPage() {
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Kennisbank', url: '/kennisbank' }];
  const ld = [
    {
      '@type': 'CollectionPage',
      '@id': L.SITE + '/kennisbank#collection',
      name: 'Kennisbank Dierenkliniek.nl',
      description: `${articles.length} artikelen over diergezondheid, preventie, voeding, gedrag en spoedhulp.`,
      url: L.SITE + '/kennisbank',
      inLanguage: 'nl-NL',
      isPartOf: { '@id': L.SITE + '/#organization' },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: articles.length,
        itemListElement: articles.map((a, i) => ({
          '@type': 'ListItem', position: i + 1, name: a.title,
          url: L.SITE + '/kennisbank/' + a.slug
        }))
      }
    },
    L.breadcrumbLd(crumbs)
  ];

  const catSections = KB_CATEGORIES.map(c => {
    const list = articles.filter(a => a.category === c.slug);
    if (!list.length) return '';
    return `<section class="card">
  <h2><a href="/kennisbank/categorie-${c.slug}" style="color:inherit;">${L.esc(c.name)}</a> <span style="color:#627080;font-weight:500;font-size:16px;">(${list.length})</span></h2>
  ${cardGrid(list)}
</section>`;
  }).join('\n');

  const body = `${L.breadcrumbHtml(crumbs)}
<div class="card">
  <h1>Kennisbank voor huisdiereigenaren</h1>
  <p class="subtitle">${articles.length} artikelen over gezondheid, preventie, voeding, gedrag en spoedhulp — geschreven voor eigenaren, zonder vakjargon.</p>
  <div class="tag-row">
    ${KB_ANIMALS.map(an => {
      const n = articles.filter(a => a.animal === an.slug).length;
      return n ? `<a class="pill" href="/kennisbank/dier-${an.slug}">${an.emoji} ${L.esc(an.name)} (${n})</a>` : '';
    }).filter(Boolean).join('\n    ')}
  </div>
</div>
${catSections}
${cityLinks()}`;

  return L.page({
    title: `Kennisbank — ${articles.length} artikelen over diergezondheid | Dierenkliniek.nl`,
    description: `${articles.length} artikelen over diergezondheid: spoedhulp, vaccinaties, voeding, gedrag en levensfasen. Begrijpelijk uitgelegd door Dierenkliniek.nl.`,
    canonical: '/kennisbank',
    bodyHtml: body,
    jsonld: ld,
    lastmod: BUILD_DATE,
    ogType: 'website'
  });
}

function facetPage(kind, item, list) {
  const isCat = kind === 'categorie';
  const slug = `${kind}-${item.slug}`;
  const label = isCat ? item.name : `${item.emoji} ${item.name}`;
  const crumbs = [
    { name: 'Home', url: '/' },
    { name: 'Kennisbank', url: '/kennisbank' },
    { name: item.name, url: '/kennisbank/' + slug }
  ];
  const title = isCat
    ? `${item.name} — kennisbank | Dierenkliniek.nl`
    : `Kennisbank ${item.name.toLowerCase()} — ${list.length} artikelen | Dierenkliniek.nl`;
  const desc = isCat
    ? `${list.length} artikelen over ${item.name.toLowerCase()} voor huisdiereigenaren. Praktische uitleg van Dierenkliniek.nl.`
    : `${list.length} artikelen over de gezondheid en verzorging van ${item.name.toLowerCase()}. Praktische uitleg van Dierenkliniek.nl.`;

  const ld = [
    {
      '@type': 'CollectionPage',
      name: item.name,
      url: L.SITE + '/kennisbank/' + slug,
      inLanguage: 'nl-NL',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: list.length,
        itemListElement: list.map((a, i) => ({
          '@type': 'ListItem', position: i + 1, name: a.title, url: L.SITE + '/kennisbank/' + a.slug
        }))
      }
    },
    L.breadcrumbLd(crumbs)
  ];

  const body = `${L.breadcrumbHtml(crumbs)}
<div class="card">
  <h1>${L.esc(label)}</h1>
  <p class="subtitle">${L.esc(desc)}</p>
</div>
<section class="card">
  ${cardGrid(list, 'h2')}
  <p style="margin-top:16px;"><a href="/kennisbank/">← Terug naar de kennisbank</a></p>
</section>
${cityLinks()}`;

  return L.page({
    title, description: desc, canonical: '/kennisbank/' + slug,
    bodyHtml: body, jsonld: ld, lastmod: BUILD_DATE, ogType: 'website'
  });
}

fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const a of articles) { fs.writeFileSync(path.join(OUT, a.slug + '.html'), articlePage(a)); n++; }
fs.writeFileSync(path.join(OUT, 'index.html'), indexPage()); n++;
for (const c of KB_CATEGORIES) {
  const list = articles.filter(a => a.category === c.slug);
  if (list.length) { fs.writeFileSync(path.join(OUT, 'categorie-' + c.slug + '.html'), facetPage('categorie', c, list)); n++; }
}
for (const an of KB_ANIMALS) {
  const list = articles.filter(a => a.animal === an.slug);
  if (list.length) { fs.writeFileSync(path.join(OUT, 'dier-' + an.slug + '.html'), facetPage('dier', an, list)); n++; }
}

const urls = [
  '/kennisbank',
  ...KB_CATEGORIES.filter(c => articles.some(a => a.category === c.slug)).map(c => '/kennisbank/categorie-' + c.slug),
  ...KB_ANIMALS.filter(an => articles.some(a => a.animal === an.slug)).map(an => '/kennisbank/dier-' + an.slug),
  ...articles.map(a => '/kennisbank/' + a.slug)
];
fs.writeFileSync(path.join(__dirname, 'kennisbank-urls.json'), JSON.stringify(urls, null, 2));
console.log('kennisbank: ' + n + ' bestanden, ' + urls.length + " URL's");
