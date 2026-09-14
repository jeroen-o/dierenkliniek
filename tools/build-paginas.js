// Genereert statische landingspagina's die voorheen alleen als SPA-view bestonden:
// spoedhulp, provincie-overzicht, 12 provinciepagina's en het glossarium.
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const DATA = require('./extract-data');

const ROOT = L.ROOT;
const BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const { CLINICS, GLOSSARIUM, KB_ARTICLES } = DATA;

const { PROVINCE_DESCRIPTIONS, provinceOf, clinicSlug, citySlug } = L;

const articleSlug = (a) => L.slugify(a.title);

const withProv = CLINICS.map(c => ({ ...c, prov: provinceOf(c), slug: clinicSlug(c) }));
const PROVINCES = Object.keys(PROVINCE_DESCRIPTIONS);
const spoed = withProv.filter(c => (c.tags || []).includes('spoed'));

const urls = [];
function write(file, html, url) {
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), html);
  urls.push(url);
}

function clinicList(list) {
  return `<div class="grid-cards">
  ${list.map(c => `<a class="link-card" href="/${c.slug}">
    <h4>${L.esc(c.name)}</h4>
    <p>${L.esc(c.address)}, ${L.esc(c.postcode)} ${L.esc(c.city)}<br>📞 ${L.esc(c.phone)}</p>
  </a>`).join('\n  ')}
</div>`;
}

/* ---------- /spoedhulp ---------- */
function spoedPage() {
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Spoedhulp 24/7', url: '/spoedhulp' }];
  const byProv = {};
  for (const c of spoed) { (byProv[c.prov || 'Overig'] ||= []).push(c); }

  const faqs = [
    { q: 'Wanneer moet ik met spoed naar de dierenarts?', a: 'Bel direct bij ademnood, bewustzijnsverlies of stuipen, heftig bloedverlies, vermoeden van vergiftiging, een verkeersongeval, een opgezette buik met vergeefs braken (maagdraaiing) of aanhoudend braken. Twijfelt u? Bel altijd eerst; een dierenarts kan telefonisch inschatten hoe urgent het is.' },
    { q: 'Kan ik &rsquo;s nachts zomaar bij een spoedkliniek terecht?', a: 'Bel altijd eerst. Spoedklinieken werken met een dienstdoende dierenarts en willen weten dat u onderweg bent, zodat zij zich kunnen voorbereiden. Sommige praktijken verwijzen buiten kantooruren door naar een regionale spoeddienst.' },
    { q: 'Wat kost een spoedconsult bij de dierenarts?', a: 'Een spoedconsult buiten openingstijden is duurder dan een regulier consult. Tarieven verschillen per praktijk en zijn in Nederland vrij. Vraag bij het telefoongesprek naar het verwachte consulttarief, zodat u niet voor verrassingen staat.' },
    { q: 'Hoeveel dierenklinieken in Nederland bieden 24/7 spoedhulp?', a: `Op Dierenkliniek.nl staan ${spoed.length} klinieken met 24/7 spoedhulp, verspreid over heel Nederland. Hieronder vindt u ze per provincie.` }
  ];

  const ld = [
    {
      '@type': 'WebPage',
      '@id': L.SITE + '/spoedhulp#webpage',
      name: 'Dierenarts spoedhulp 24/7',
      description: `${spoed.length} dierenklinieken in Nederland met 24/7 spoeddienst, gerangschikt per provincie.`,
      url: L.SITE + '/spoedhulp',
      inLanguage: 'nl-NL',
      isPartOf: { '@id': L.SITE + '/#organization' },
      mainEntity: {
        '@type': 'ItemList',
        name: 'Dierenklinieken met 24/7 spoedhulp',
        numberOfItems: spoed.length,
        itemListElement: spoed.map((c, i) => ({
          '@type': 'ListItem', position: i + 1,
          item: {
            '@type': 'VeterinaryCare',
            name: c.name,
            url: L.SITE + '/' + c.slug,
            telephone: c.phone,
            address: {
              '@type': 'PostalAddress', streetAddress: c.address, postalCode: c.postcode,
              addressLocality: c.city, addressCountry: 'NL'
            },
            openingHoursSpecification: {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              opens: '00:00', closes: '23:59'
            }
          }
        }))
      }
    },
    L.faqLd(faqs),
    L.breadcrumbLd(crumbs)
  ];

  const body = `${L.breadcrumbHtml(crumbs)}
<div class="card">
  <h1>Dierenarts met spoed nodig? ${spoed.length} klinieken met 24/7 spoedhulp</h1>
  <p class="subtitle">Bel altijd eerst. Hieronder staan alle bij ons bekende dierenklinieken met een 24-uurs spoeddienst, gerangschikt per provincie.</p>
  <div class="callout callout-red">
    <strong>Direct handelen bij:</strong> ademnood, bewusteloosheid of stuipen, heftig bloedverlies, vermoeden van vergiftiging,
    een verkeersongeval, opgezette buik met vergeefs braken (maagdraaiing) of meer dan twee uur persen bij een bevalling.
    Bel de dichtstbijzijnde kliniek <em>voordat</em> u vertrekt.
  </div>
  <div class="tag-row">
    ${PROVINCES.filter(p => byProv[p]).map(p => `<a class="pill pill-red" href="#${L.slugify(p)}">${L.esc(p)} (${byProv[p].length})</a>`).join('\n    ')}
  </div>
</div>

${PROVINCES.filter(p => byProv[p]).map(p => `<section class="card" id="${L.slugify(p)}">
  <h2>Spoedhulp in ${L.esc(p)} — ${byProv[p].length} klinieken</h2>
  ${clinicList(byProv[p])}
  <p style="margin-top:14px;"><a href="/dierenklinieken-${L.slugify(p)}">Alle dierenklinieken in ${L.esc(p)} →</a></p>
</section>`).join('\n')}

${L.faqHtml(faqs)}

<section class="card">
  <h2>Twijfelt u of het spoed is?</h2>
  <p>De kennisbank helpt u de ernst inschatten voordat u belt.</p>
  <div class="tag-row">
    <a class="pill" href="/kennisbank/wanneer-is-iets-echt-een-spoedgeval">Wanneer is iets écht spoed?</a>
    <a class="pill" href="/kennisbank/categorie-spoed">Alle artikelen over spoed</a>
    <a class="pill" href="/">Zoek op postcode</a>
  </div>
</section>`;

  return L.page({
    title: `Dierenarts spoedhulp 24/7 — ${spoed.length} klinieken per provincie | Dierenkliniek.nl`,
    description: `Direct een spoeddierenarts nodig? ${spoed.length} dierenklinieken met 24/7 spoeddienst in Nederland, per provincie met telefoonnummer en adres.`,
    canonical: '/spoedhulp', bodyHtml: body, jsonld: ld, lastmod: BUILD_DATE, ogType: 'website'
  });
}

/* ---------- /dierenklinieken-<provincie> ---------- */
function provinciePage(prov) {
  const list = withProv.filter(c => c.prov === prov).sort((a, b) => a.city.localeCompare(b.city, 'nl') || a.name.localeCompare(b.name, 'nl'));
  const cities = [...new Set(list.map(c => c.city))].sort((a, b) => a.localeCompare(b, 'nl'));
  const spoedIn = list.filter(c => (c.tags || []).includes('spoed'));
  const slug = 'dierenklinieken-' + L.slugify(prov);
  const crumbs = [
    { name: 'Home', url: '/' },
    { name: 'Provincies', url: '/provincies' },
    { name: prov, url: '/' + slug }
  ];
  const desc = `${list.length} dierenklinieken in ${prov}, verdeeld over ${cities.length} plaatsen. ${spoedIn.length} bieden 24/7 spoedhulp.`;

  const faqs = [
    { q: `Hoeveel dierenklinieken zijn er in ${prov}?`, a: `In ${prov} staan ${list.length} dierenklinieken vermeld op Dierenkliniek.nl, verspreid over ${cities.length} plaatsen.` },
    { q: `Welke dierenklinieken in ${prov} hebben 24/7 spoedhulp?`, a: spoedIn.length ? `${spoedIn.length} klinieken in ${prov} bieden een 24-uurs spoeddienst, waaronder ${spoedIn.slice(0, 3).map(c => c.name + ' in ' + c.city).join(', ')}. Bekijk het volledige overzicht op de spoedhulp-pagina.` : `Er staan op dit moment geen klinieken met een eigen 24/7 spoeddienst in ${prov} vermeld. Kijk op de spoedhulp-pagina voor de dichtstbijzijnde spoedkliniek in een aangrenzende provincie.` },
    { q: `Hoe kies ik een dierenarts in ${prov}?`, a: 'Let op reisafstand (zeker bij spoed), de specialisaties die de praktijk aanbiedt en of de kliniek ervaring heeft met uw diersoort. Op elke kliniekpagina vindt u adres, telefoonnummer, website en specialisaties.' }
  ];

  const ld = [
    {
      '@type': 'CollectionPage',
      name: `Dierenklinieken in ${prov}`,
      description: desc,
      url: L.SITE + '/' + slug,
      inLanguage: 'nl-NL',
      isPartOf: { '@id': L.SITE + '/#organization' },
      about: { '@type': 'AdministrativeArea', name: prov, address: { '@type': 'PostalAddress', addressRegion: prov, addressCountry: 'NL' } },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: list.length,
        itemListElement: list.map((c, i) => ({
          '@type': 'ListItem', position: i + 1,
          item: {
            '@type': 'VeterinaryCare', name: c.name, url: L.SITE + '/' + c.slug, telephone: c.phone,
            address: { '@type': 'PostalAddress', streetAddress: c.address, postalCode: c.postcode, addressLocality: c.city, addressRegion: prov, addressCountry: 'NL' }
          }
        }))
      }
    },
    L.faqLd(faqs),
    L.breadcrumbLd(crumbs)
  ];

  const byCity = {};
  for (const c of list) (byCity[c.city] ||= []).push(c);

  const body = `${L.breadcrumbHtml(crumbs)}
<div class="card">
  <h1>Dierenklinieken in ${L.esc(prov)}</h1>
  <p class="subtitle">${list.length} klinieken in ${cities.length} plaatsen${spoedIn.length ? ` · ${spoedIn.length} met 24/7 spoedhulp` : ''}</p>
  <p>${L.esc(PROVINCE_DESCRIPTIONS[prov] || '')}</p>
  <div class="tag-row">
    <a class="pill pill-red" href="/spoedhulp">⚡ Spoedhulp 24/7</a>
    <a class="pill" href="/">Zoek op postcode</a>
    <a class="pill" href="/kennisbank">Kennisbank</a>
  </div>
</div>

<section class="card">
  <h2>Plaatsen in ${L.esc(prov)}</h2>
  <div class="tag-row">
    ${cities.map(city => `<a class="pill" href="/${citySlug(city)}">${L.esc(city)} (${byCity[city].length})</a>`).join('\n    ')}
  </div>
</section>

${spoedIn.length ? `<section class="card">
  <h2>24/7 spoedhulp in ${L.esc(prov)}</h2>
  ${clinicList(spoedIn)}
</section>` : ''}

<section class="card">
  <h2>Alle ${list.length} dierenklinieken in ${L.esc(prov)}</h2>
  ${clinicList(list)}
</section>

${L.faqHtml(faqs)}

<section class="card">
  <h2>Andere provincies</h2>
  <div class="tag-row">
    ${PROVINCES.filter(p => p !== prov).map(p => `<a class="pill" href="/dierenklinieken-${L.slugify(p)}">${L.esc(p)}</a>`).join('\n    ')}
  </div>
</section>`;

  return {
    slug,
    html: L.page({
      title: `Dierenarts in ${prov} — ${list.length} klinieken vergelijken | Dierenkliniek.nl`,
      description: desc.slice(0, 158),
      canonical: '/' + slug, bodyHtml: body, jsonld: ld, lastmod: BUILD_DATE, ogType: 'website',
      geo: { place: prov }
    })
  };
}

/* ---------- /provincies ---------- */
function provinciesPage() {
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Provincies', url: '/provincies' }];
  const rows = PROVINCES.map(p => {
    const list = withProv.filter(c => c.prov === p);
    return { p, n: list.length, cities: new Set(list.map(c => c.city)).size, spoed: list.filter(c => (c.tags || []).includes('spoed')).length };
  }).sort((a, b) => b.n - a.n);

  const ld = [
    {
      '@type': 'CollectionPage',
      name: 'Dierenklinieken per provincie',
      url: L.SITE + '/provincies',
      inLanguage: 'nl-NL',
      mainEntity: {
        '@type': 'ItemList', numberOfItems: rows.length,
        itemListElement: rows.map((r, i) => ({
          '@type': 'ListItem', position: i + 1, name: 'Dierenklinieken in ' + r.p,
          url: L.SITE + '/dierenklinieken-' + L.slugify(r.p)
        }))
      }
    },
    L.breadcrumbLd(crumbs)
  ];

  const body = `${L.breadcrumbHtml(crumbs)}
<div class="card">
  <h1>Dierenklinieken per provincie</h1>
  <p class="subtitle">Alle ${CLINICS.length} dierenklinieken in Nederland, verdeeld over de twaalf provincies.</p>
</div>
<section class="card">
  <div class="grid-cards">
    ${rows.map(r => `<a class="link-card" href="/dierenklinieken-${L.slugify(r.p)}">
      <h4>${L.esc(r.p)}</h4>
      <p>${r.n} klinieken · ${r.cities} plaatsen${r.spoed ? ` · ${r.spoed}× 24/7 spoed` : ''}</p>
    </a>`).join('\n    ')}
  </div>
</section>`;

  return L.page({
    title: `Dierenklinieken per provincie — alle ${CLINICS.length} klinieken | Dierenkliniek.nl`,
    description: `Bekijk alle ${CLINICS.length} dierenklinieken in Nederland per provincie: aantal klinieken, plaatsen en 24/7 spoeddiensten.`,
    canonical: '/provincies', bodyHtml: body, jsonld: ld, lastmod: BUILD_DATE, ogType: 'website'
  });
}

/* ---------- /glossarium ---------- */
function glossariumPage() {
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Veterinair glossarium', url: '/glossarium' }];
  const terms = GLOSSARIUM.map(([term, def]) => ({ term, def }));
  const ld = [
    {
      '@type': 'DefinedTermSet',
      '@id': L.SITE + '/glossarium#termset',
      name: 'Veterinair glossarium',
      description: `${terms.length} medische termen die uw dierenarts gebruikt, in begrijpelijke taal uitgelegd.`,
      url: L.SITE + '/glossarium',
      inLanguage: 'nl-NL',
      hasDefinedTerm: terms.map(t => ({
        '@type': 'DefinedTerm', name: t.term, description: t.def,
        inDefinedTermSet: L.SITE + '/glossarium#termset'
      }))
    },
    L.breadcrumbLd(crumbs)
  ];

  const body = `${L.breadcrumbHtml(crumbs)}
<div class="card">
  <h1>Veterinair glossarium</h1>
  <p class="subtitle">${terms.length} termen die uw dierenarts gebruikt, in gewone taal uitgelegd.</p>
</div>
<section class="card prose">
  <dl>
    ${terms.map(t => `<dt id="${L.slugify(t.term)}" style="font-weight:700;margin-top:18px;">${L.esc(t.term)}</dt>
    <dd style="margin:6px 0 0;color:#4A5C70;">${L.esc(t.def)}</dd>`).join('\n    ')}
  </dl>
</section>
<section class="card">
  <h2>Meer uitleg nodig?</h2>
  <div class="tag-row">
    <a class="pill" href="/kennisbank">Kennisbank (${KB_ARTICLES.length} artikelen)</a>
    <a class="pill pill-red" href="/spoedhulp">⚡ Spoedhulp 24/7</a>
    <a class="pill" href="/">Zoek een dierenarts</a>
  </div>
</section>`;

  return L.page({
    title: `Veterinair glossarium — ${terms.length} dierenarts-termen uitgelegd | Dierenkliniek.nl`,
    description: `Wat betekent anesthesie, babesiose of castratie? ${terms.length} veterinaire termen begrijpelijk uitgelegd voor huisdiereigenaren.`,
    canonical: '/glossarium', bodyHtml: body, jsonld: ld, lastmod: BUILD_DATE, ogType: 'website'
  });
}

write('spoedhulp.html', spoedPage(), '/spoedhulp');
write('provincies.html', provinciesPage(), '/provincies');
for (const p of PROVINCES) { const r = provinciePage(p); write(r.slug + '.html', r.html, '/' + r.slug); }
write('glossarium.html', glossariumPage(), '/glossarium');

fs.writeFileSync(path.join(__dirname, 'pagina-urls.json'), JSON.stringify(urls, null, 2));
console.log('paginas: ' + urls.length + " URL's, spoedklinieken: " + spoed.length);
