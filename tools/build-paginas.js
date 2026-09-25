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
    <h3>${L.esc(c.name)}</h3>
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
    <a class="pill" href="/kennisbank/">Kennisbank</a>
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

/* ---------- /dierenarts-in-de-buurt ---------- */
function buurtPage() {
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Dierenarts in de buurt', url: '/dierenarts-in-de-buurt' }];
  const byCity = {};
  for (const c of withProv) (byCity[c.city] ||= []).push(c);
  const topSteden = Object.entries(byCity).sort((a, b) => b[1].length - a[1].length).slice(0, 20);
  const cityCount = Object.keys(byCity).length;

  const faqs = [
    { q: 'Hoe vind ik een dierenarts bij mij in de buurt?', a: `Voer hierboven uw postcode of plaats in. U krijgt direct een lijst van klinieken bij u in de buurt, gerangschikt op afstand, met adres, telefoonnummer en openingstijden. Alle ${CLINICS.length} dierenklinieken in Nederland staan vermeld.` },
    { q: 'Wanneer moet ik met spoed naar de dierenarts?', a: 'Bel direct bij ademnood, bewusteloosheid of stuipen, heftig bloedverlies, vermoeden van vergiftiging, een verkeersongeval, een opgezette buik met vergeefs braken (maagdraaiing) of aanhoudend braken. Twijfelt u? Bel altijd eerst; een dierenarts kan telefonisch inschatten hoe urgent het is.' },
    { q: 'Wat kost een bezoek aan de dierenarts?', a: 'Een regulier consult kost gemiddeld €40 tot €70, afhankelijk van de praktijk en (bij honden) het formaat van het dier. Vaccinaties, operaties en spoedconsulten hebben eigen tarieven. Gebruik de Dierenarts kosten wijzer voor een indicatie op maat van diersoort, formaat en regio.' },
    { q: 'Wat is het verschil tussen een dierenarts en een dierenziekenhuis?', a: 'Een reguliere dierenartspraktijk behandelt de meeste dagelijkse zorg: consulten, vaccinaties, kleine ingrepen. Een dierenziekenhuis heeft vaak meerdere dierenartsen met specialisaties, eigen diagnostische apparatuur (röntgen, echografie, soms MRI/CT) en is vaker 24/7 open voor spoedgevallen. Voor complexe diagnostiek of specialistische zorg verwijst uw eigen dierenarts u vaak door naar een dierenziekenhuis.' }
  ];

  const ld = [
    {
      '@type': 'WebPage',
      '@id': L.SITE + '/dierenarts-in-de-buurt#webpage',
      name: 'Dierenarts in de buurt zoeken',
      description: `Zoek een dierenarts bij u in de buurt op postcode of plaats. Alle ${CLINICS.length} dierenklinieken in Nederland, verdeeld over ${cityCount} plaatsen.`,
      url: L.SITE + '/dierenarts-in-de-buurt',
      inLanguage: 'nl-NL',
      isPartOf: { '@id': L.SITE + '/#organization' }
    },
    L.faqLd(faqs),
    L.breadcrumbLd(crumbs)
  ];

  const body = `${L.breadcrumbHtml(crumbs)}
<div class="card">
  <h1>Dierenarts in de buurt zoeken</h1>
  <p class="subtitle">Alle ${CLINICS.length} dierenklinieken in Nederland, verdeeld over ${cityCount} plaatsen. Voer uw postcode of plaats in voor de dichtstbijzijnde klinieken.</p>
  <form action="/" method="get" style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
    <input type="text" name="postcode" placeholder="Postcode of plaats, bijv. 1012 AB of Utrecht" required
      style="flex:1; min-width:220px; padding:12px 14px; border:1px solid var(--line); border-radius:8px; font-size:15px;">
    <button type="submit" class="btn">Zoek dierenarts →</button>
  </form>
  <div class="tag-row" style="margin-top:16px;">
    <a class="pill pill-red" href="/spoedhulp">⚡ Spoedhulp nodig? Direct naar 24/7 klinieken</a>
  </div>
</div>

<section class="card">
  <h2>Grootste plaatsen</h2>
  <div class="tag-row">
    ${topSteden.map(([city, l]) => `<a class="pill" href="/${citySlug(city)}">${L.esc(city)} (${l.length})</a>`).join('\n    ')}
  </div>
  <p style="margin-top:16px;"><a href="/provincies">Alle plaatsen per provincie →</a></p>
</section>

<section class="card">
  <h2>Provincies</h2>
  <div class="tag-row">
    ${PROVINCES.map(p => `<a class="pill" href="/dierenklinieken-${L.slugify(p)}">${L.esc(p)}</a>`).join('\n    ')}
  </div>
</section>

<section class="card">
  <h2>Wanneer gaat u naar de spoeddienst?</h2>
  <p>Bel altijd eerst. Bij ademnood, bewusteloosheid of stuipen, heftig bloedverlies, vermoeden van vergiftiging, een verkeersongeval, een opgezette buik met vergeefs braken (maagdraaiing) of aanhoudend braken telt elke minuut.</p>
  <p style="margin-top:12px;"><a href="/spoedhulp">Alle klinieken met 24/7 spoedhulp →</a></p>
</section>

<section class="card">
  <h2>Wat kost een bezoek aan de dierenarts?</h2>
  <p>Een regulier consult kost gemiddeld €40 tot €70. Tarieven verschillen per praktijk, per diersoort en (bij honden) per formaat, en zijn in Nederland vrij.</p>
  <div class="tag-row" style="margin-top:12px;">
    <a class="pill" href="/kennisbank/wat-kost-een-dierenarts-algemene-richtprijzen">Richtprijzen per behandeling</a>
    <a class="pill" href="/?view=kostenwijzer">Kosten wijzer — indicatie op maat</a>
  </div>
</section>

<section class="card">
  <h2>Dierenarts of dierenziekenhuis — wat is het verschil?</h2>
  <p>Een reguliere praktijk behandelt de meeste dagelijkse zorg: consulten, vaccinaties, kleine ingrepen. Een dierenziekenhuis heeft vaak meerdere dierenartsen met specialisaties, eigen diagnostische apparatuur en is vaker 24/7 open. Voor complexe diagnostiek verwijst uw eigen dierenarts u vaak door.</p>
</section>

${L.faqHtml(faqs)}`;

  return L.page({
    title: `Dierenarts in de buurt — ${CLINICS.length} klinieken op postcode | Dierenkliniek.nl`,
    description: `Zoek een dierenarts bij u in de buurt op postcode of plaats. Alle ${CLINICS.length} dierenklinieken in Nederland, in ${cityCount} plaatsen, onafhankelijk overzicht.`,
    canonical: '/dierenarts-in-de-buurt', bodyHtml: body, jsonld: ld, lastmod: BUILD_DATE, ogType: 'website'
  });
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
      <h2 style="font-size:15px;font-weight:700;margin-bottom:4px;">${L.esc(r.p)}</h2>
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
    <a class="pill" href="/kennisbank/">Kennisbank (${KB_ARTICLES.length} artikelen)</a>
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

/* ---------- /specialisme-<naam> en /specialismen ---------- */
const SPECIALISMEN = [
  { naam: 'Honden', slug: 'specialisme-honden', beschrijving: 'Zoekt u een dierenkliniek met specifieke expertise in honden? Alle onderstaande klinieken hebben honden als aandachtsgebied, van gezinshonden tot werk- en jachthonden. Bij vragen over vaccinaties, castratie, gewicht of gedrag helpen zij u met deskundig advies.' },
  { naam: 'Katten', slug: 'specialisme-katten', beschrijving: 'Katten hebben een andere aanpak nodig dan honden: stressarm omgaan met de patiënt, kattenspecifieke ziekten zoals nierproblemen en een rustige wachtruimte. Deze klinieken hebben katten als aandachtsgebied.' },
  { naam: 'Konijnen', slug: 'specialisme-konijnen', beschrijving: 'Konijnen zijn geen kleine katten of honden: ze hebben eigen veterinaire zorg nodig, van gebitscontrole tot narcose die op hun stofwisseling is afgestemd. Deze klinieken hebben konijnen als aandachtsgebied.' },
  { naam: 'Knaagdieren', slug: 'specialisme-knaagdieren', beschrijving: 'Cavia, hamster, chinchilla, degoe of rat: knaagdieren vereisen specifieke expertise vanwege hun kleine formaat en snelle stofwisseling. Deze klinieken hebben knaagdieren als aandachtsgebied.' },
  { naam: 'Vogels', slug: 'specialisme-vogels', beschrijving: 'Papegaaien, kanaries, agapornis of roofvogels: vogels vragen om een aviaire dierenarts met specifieke kennis van hun anatomie en gedrag. Deze klinieken hebben vogels als aandachtsgebied.' },
  { naam: 'Exoten', slug: 'specialisme-exoten', beschrijving: 'Voor exotische huisdieren zoals reptielen, spinnen, egels of zeldzame vogelsoorten heeft u een dierenarts nodig met ervaring buiten de gangbare huisdieren. Deze klinieken hebben exoten als aandachtsgebied.' },
  { naam: 'Chirurgie', slug: 'specialisme-chirurgie', beschrijving: 'Voor operaties, van routine-castraties tot orthopedische ingrepen zoals kruisbandreconstructies of botbreuken, is chirurgische expertise en de juiste apparatuur nodig. Deze klinieken hebben chirurgie als aandachtsgebied.' },
  { naam: 'Cardiologie', slug: 'specialisme-cardiologie', beschrijving: 'Voor hartklachten bij honden (met name bepaalde rassen) en katten (zoals hypertrofe cardiomyopathie) is cardiologische diagnostiek en behandeling nodig. Deze klinieken hebben cardiologie als aandachtsgebied.' },
  { naam: 'Dermatologie', slug: 'specialisme-dermatologie', beschrijving: 'Bij chronische jeuk, kale plekken, huidontstekingen en allergieën is dermatologische expertise waardevol om de oorzaak te vinden in plaats van alleen de symptomen te bestrijden. Deze klinieken hebben dermatologie als aandachtsgebied.' },
  { naam: 'Tandheelkunde', slug: 'specialisme-tandheelkunde', beschrijving: 'Tandsteen, wortelontstekingen en tandextracties vereisen professionele apparatuur en ervaring. Deze klinieken hebben tandheelkunde als aandachtsgebied.' },
  { naam: 'Echografie', slug: 'specialisme-echografie', beschrijving: 'Voor diagnostiek van buikklachten, drachtcontroles, hartonderzoek en het opsporen van tumoren is echografie een waardevol hulpmiddel zonder de patiënt te belasten. Deze klinieken hebben echografie als aandachtsgebied.' },
  { naam: 'Spoed 24/7', slug: 'specialisme-spoed', beschrijving: 'Bij levensbedreigende situaties telt elke minuut. Deze klinieken bieden 24 uur per dag, 7 dagen per week spoedhulp. Bel altijd eerst voordat u vertrekt.' }
];

function specialismePage(spec) {
  const list = withProv.filter(c => (c.specs || []).includes(spec.naam))
    .sort((a, b) => a.city.localeCompare(b.city, 'nl') || a.name.localeCompare(b.name, 'nl'));
  const n = list.length;
  const cities = [...new Set(list.map(c => c.city))].sort((a, b) => a.localeCompare(b, 'nl'));
  const byCity = {};
  for (const c of list) (byCity[c.city] ||= []).push(c);
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Specialismen', url: '/specialismen' }, { name: spec.naam, url: '/' + spec.slug }];
  const desc = `${n} dierenklinieken met specialisme ${spec.naam} in Nederland, in ${cities.length} plaatsen. Vergelijk en vind een kliniek bij u in de buurt.`;

  const topSteden = Object.entries(byCity).sort((a, b) => b[1].length - a[1].length).slice(0, 12);

  const faqs = [
    { q: `Hoeveel dierenklinieken hebben ${spec.naam} als specialisme?`, a: `In totaal hebben ${n} dierenklinieken in Nederland ${spec.naam} als aandachtsgebied opgegeven op Dierenkliniek.nl, verspreid over ${cities.length} plaatsen.` },
    { q: `Welke plaatsen hebben de meeste klinieken met specialisme ${spec.naam}?`, a: topSteden.length ? `De meeste klinieken met dit specialisme staan in ${topSteden.slice(0, 5).map(([city, l]) => `${city} (${l.length})`).join(', ')}.` : `Deze klinieken staan verspreid over heel Nederland.` },
    { q: `Hoe vind ik een kliniek met specialisme ${spec.naam} bij mij in de buurt?`, a: 'Gebruik de postcodezoeker op de homepage, of blader hieronder door de klinieken gegroepeerd per plaats. Elke kliniekpagina toont adres, telefoonnummer en de overige aandachtsgebieden.' }
  ];

  const ld = [
    {
      '@type': 'CollectionPage',
      name: `Dierenklinieken met specialisme ${spec.naam}`,
      description: desc,
      url: L.SITE + '/' + spec.slug,
      inLanguage: 'nl-NL',
      isPartOf: { '@id': L.SITE + '/#organization' },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: n,
        itemListElement: list.map((c, i) => ({
          '@type': 'ListItem', position: i + 1,
          item: {
            '@type': 'VeterinaryCare', name: c.name, url: L.SITE + '/' + c.slug, telephone: c.phone,
            address: { '@type': 'PostalAddress', streetAddress: c.address, postalCode: c.postcode, addressLocality: c.city, addressCountry: 'NL' }
          }
        }))
      }
    },
    L.faqLd(faqs),
    L.breadcrumbLd(crumbs)
  ];

  const body = `${L.breadcrumbHtml(crumbs)}
<div class="card">
  <h1>Dierenartsen gespecialiseerd in ${L.esc(spec.naam.toLowerCase())}</h1>
  <p class="subtitle">${n} ${n === 1 ? 'kliniek' : 'klinieken'} in ${cities.length} plaatsen</p>
  <p>${L.esc(spec.beschrijving)}</p>
</div>

${topSteden.length ? `<section class="card">
  <h2>Belangrijkste plaatsen</h2>
  <p>Deze plaatsen hebben de meeste klinieken met specialisme ${L.esc(spec.naam)}:</p>
  <div class="tag-row">
    ${topSteden.map(([city, l]) => `<a class="pill" href="/${citySlug(city)}">${L.esc(city)} (${l.length})</a>`).join('\n    ')}
  </div>
</section>` : ''}

<section class="card">
  <h2>Alle ${n} klinieken met specialisme ${L.esc(spec.naam)}</h2>
  <p>Gegroepeerd per plaats, alfabetisch gesorteerd:</p>
  ${cities.map(city => `<h3 style="margin-top:24px;">${L.esc(city)} <a href="/${citySlug(city)}" style="font-size:14px;font-weight:500;margin-left:8px;">(alle klinieken in ${L.esc(city)} →)</a></h3>
  ${clinicList(byCity[city])}`).join('\n  ')}
</section>

${L.faqHtml(faqs)}

<section class="card">
  <h2>Andere specialismen</h2>
  <div class="tag-row">
    ${SPECIALISMEN.filter(s => s.slug !== spec.slug).map(s => `<a class="pill" href="/${s.slug}">${L.esc(s.naam)}</a>`).join('\n    ')}
  </div>
</section>`;

  return {
    slug: spec.slug,
    html: L.page({
      title: `Dierenarts ${spec.naam.toLowerCase()} — ${n} klinieken | Dierenkliniek.nl`,
      description: desc.slice(0, 158),
      canonical: '/' + spec.slug, bodyHtml: body, jsonld: ld, lastmod: BUILD_DATE, ogType: 'website'
    })
  };
}

function specialismenPage() {
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Specialismen', url: '/specialismen' }];
  const rows = SPECIALISMEN.map(s => ({ ...s, n: withProv.filter(c => (c.specs || []).includes(s.naam)).length }));

  const ld = [
    {
      '@type': 'CollectionPage',
      name: 'Specialismen van dierenklinieken',
      url: L.SITE + '/specialismen',
      inLanguage: 'nl-NL',
      mainEntity: {
        '@type': 'ItemList', numberOfItems: rows.length,
        itemListElement: rows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.naam, url: L.SITE + '/' + r.slug }))
      }
    },
    L.breadcrumbLd(crumbs)
  ];

  const body = `${L.breadcrumbHtml(crumbs)}
<div class="card">
  <h1>Specialismen van dierenklinieken</h1>
  <p class="subtitle">Op Dierenkliniek.nl kunt u dierenartsen filteren op specialisme. Bekijk hieronder alle ${rows.length} specialismen die klinieken hebben opgegeven:</p>
</div>
<section class="card">
  <div class="grid-cards">
    ${rows.map(r => `<a class="link-card" href="/${r.slug}">
      <h2 style="font-size:15px;font-weight:700;margin-bottom:4px;">${L.esc(r.naam)}</h2>
      <p>${r.n} klinieken · ${L.esc(r.beschrijving.slice(0, 90))}…</p>
    </a>`).join('\n    ')}
  </div>
</section>`;

  return L.page({
    title: `Specialismen — ${rows.length} aandachtsgebieden | Dierenkliniek.nl`,
    description: `Bekijk alle ${rows.length} specialismen van Nederlandse dierenklinieken: chirurgie, cardiologie, tandheelkunde, exoten, spoed 24/7 en meer.`,
    canonical: '/specialismen', bodyHtml: body, jsonld: ld, lastmod: BUILD_DATE, ogType: 'website'
  });
}

/* ---------- /dierenarts-op-de-eilanden (en losse pagina's voor Walcheren/Zuid-Beveland) ---------- */

// Klinieken per stad opzoeken voor de "bekijk klinieken"-links per eiland.
const eilandenByCity = {};
for (const c of withProv) (eilandenByCity[c.city] ||= []).push(c);
const eilandStadLink = (stad) => eilandenByCity[stad] && eilandenByCity[stad].length
  ? `<a class="pill" href="/${citySlug(stad)}">${L.esc(stad)} (${eilandenByCity[stad].length})</a>` : null;

const EILANDEN = [
    {
      id: 'de-waddeneilanden', tag: 'Noord-Holland &amp; Friesland · Waddenzee · 24.600 inwoners',
      titel: 'Dierenklinieken op de Waddeneilanden',
      paragrafen: [
        "De Nederlandse Waddeneilanden liggen als een parelsnoer voor de kust van Noord-Holland, Friesland en Groningen, gescheiden van het vasteland door de Waddenzee, het grootste getijdengebied van Europa en sinds 2009 UNESCO-werelderfgoed. Vijf eilanden zijn bewoond: Texel, Vlieland, Terschelling, Ameland en Schiermonnikoog, samen goed voor bijna vijfentwintigduizend vaste inwoners en jaarlijks miljoenen toeristen die de rust, het strand en de natuur komen zoeken.",
        "Elk eiland heeft een eigen karakter. Texel, het grootste, heeft zeven dorpen, een eigen schapenras en het Waddencentrum Ecomare. Vlieland is klein, autovrij en bosrijk, met één dorp en de uitgestrekte Vliehors. Terschelling heeft de Brandaris, een eigen taal, cranberry's en het Oerol-festival. Ameland kent vier dorpen en de wereldberoemde paardenreddingboot van Hollum. Schiermonnikoog is het kleinste bewoonde eiland, het eerste Nationaal Park van Nederland en heeft het breedste strand van Europa. Daarnaast liggen er onbewoonde eilanden en zandplaten als Rottumerplaat, Rottumeroog, Griend en Richel, die als broedgebied en zeehondenrustplaats dienen.",
        "Juist op de eilanden is een dierenkliniek dichtbij van groot belang. Wie met een ziek huisdier naar het vasteland moet, is afhankelijk van de veerdienst en verliest kostbare tijd; een dierenarts op het eiland zelf kan direct handelen bij spoedgevallen. De eilanden tellen bovendien veel dieren: schapen op Texel, paarden voor het strandwerk op Ameland en Terschelling, en de vele honden die met hun baasjes de kilometerslange stranden bezoeken. Veel vakantiegangers nemen hun huisdier mee, waardoor eilandpraktijken in het seizoen ook toeristen bijstaan. Dierenkliniek.nl brengt de dierenartsen en dierenklinieken op alle bewoonde Waddeneilanden overzichtelijk in kaart, zodat inwoners en bezoekers snel de juiste zorg vinden."
      ],
      kernenLabel: 'Bewoonde eilanden', kernen: ['Texel', 'Vlieland', 'Terschelling', 'Ameland', 'Schiermonnikoog'],
      weetje: "De Waddenzee is de belangrijkste tussenstop van West-Europa voor trekvogels: elk jaar passeren tien tot twaalf miljoen vogels het gebied op weg tussen Siberië, Scandinavië en Afrika, en op de zandplaten tussen de eilanden leven duizenden gewone en grijze zeehonden die er in het voorjaar en de winter hun jongen krijgen.",
      links: []
    },
    {
      id: 'de-zeeuwse-eilanden', tag: 'Zeeland · Zuidwestelijke delta · 330.000 inwoners',
      titel: 'Dierenklinieken op de Zeeuwse eilanden',
      paragrafen: [
        "Zeeland dankt zijn naam aan de eilanden en schiereilanden die samen de provincie vormen: Schouwen-Duiveland, Tholen met Sint Philipsland, Noord-Beveland, Walcheren en Zuid-Beveland, aangevuld met Zeeuws-Vlaanderen op het vasteland ten zuiden van de Westerschelde. Het Zuid-Hollandse Goeree-Overflakkee wordt landschappelijk en historisch tot dezelfde eilandengroep gerekend. Wat ooit losse eilanden waren, alleen per veerboot bereikbaar, is sinds de Deltawerken door dammen en bruggen verbonden tot één samenhangend gebied met ruim driehonderdduizend inwoners.",
        "De eilanden verschillen sterk van karakter. Schouwen-Duiveland heeft de monumentenstad Zierikzee en de badplaatsen Renesse en Burgh-Haamstede. Tholen is agrarisch en rustig, met het vestingstadje Tholen en ringdorpen als Sint-Maartensdijk. Noord-Beveland is klein en weids, met Colijnsplaat, Kortgene en Kamperland aan Oosterschelde en Veerse Meer. Walcheren is het dichtstbevolkte eiland met de provinciehoofdstad Middelburg, havenstad Vlissingen en badplaatsen als Domburg en Zoutelande. Zuid-Beveland heeft Goes als centrum en Yerseke als wereldberoemd oester- en mosseldorp. De watersnoodramp van 1953 trof alle eilanden zwaar en leidde tot de Deltawerken, met de Oosterscheldekering als bekendste bouwwerk.",
        "Een dierenkliniek in de buurt is op de Zeeuwse eilanden van extra waarde: de afstanden over dammen en dijken zijn groot en in het toeristenseizoen zijn de wegen druk. Het gebied telt veel dieren, van paarden en schapen op de dijken tot de honden en katten van inwoners en de talloze vakantiegangers die hun huisdier meenemen naar de kust. Dierenkliniek.nl brengt de dierenartsen en dierenklinieken op alle Zeeuwse eilanden overzichtelijk in kaart, zodat u snel de juiste zorg vindt, of u nu op Schouwen-Duiveland woont of een week op Walcheren verblijft."
      ],
      kernenLabel: 'Eilanden', kernen: ['Schouwen-Duiveland', 'Tholen', 'Sint Philipsland', 'Noord-Beveland', 'Walcheren', 'Zuid-Beveland', 'Goeree-Overflakkee'],
      weetje: "De Oosterschelde rond de Zeeuwse eilanden is het grootste Nationaal Park van Nederland en herbergt een van de grootste zeehondenpopulaties van de Delta, terwijl de bruinvis er in zulke aantallen voorkomt dat hij vanaf de dijken bij Zierikzee, Colijnsplaat en Wemeldinge regelmatig te zien is.",
      links: []
    },
    {
      id: 'texel', tag: 'Noord-Holland · Waddeneiland · 13.700 inwoners', titel: 'Dierenarts op Texel',
      paragrafen: [
        "Texel is het grootste en meest westelijke van de Nederlandse Waddeneilanden en ligt op een kwartier varen vanaf Den Helder, over het Marsdiep dat het eiland van het vasteland scheidt. Met ruim dertienduizend inwoners en jaarlijks zo'n een miljoen toeristen is Texel een eiland dat zowel een levendige eigen gemeenschap als een grote vakantiebestemming is, met zeven dorpen die elk hun eigen karakter hebben.",
        "Den Burg is het centrale dorp met winkels en de wekelijkse markt, De Koog het badplaatsje aan de Noordzeekust met de meeste hotels, Oudeschild het vissersdorp met de haven en het maritiem museum Kaap Skil, en Den Hoorn het pittoreske dorp met de witte kerk aan de zuidkant. Oosterend, De Cocksdorp en De Waal completeren de kernen, waarbij De Cocksdorp bij de vuurtoren op de noordpunt ligt. Texel was in de Gouden Eeuw een belangrijke ankerplaats voor de VOC-vloot, die op de Rede van Texel wachtte op gunstige wind, en kent nog altijd een eigen dialect en een sterke schapenhouderij: de Texelaar is wereldwijd een bekend vleesschapenras.",
        "Het eiland is voor een groot deel natuurgebied, met de Slufter, een uniek gebied waar de zee vrij in- en uitstroomt, De Muy met zijn lepelaarkolonie, en het Nationaal Park Duinen van Texel dat de hele westkust omvat. Het Waddencentrum Ecomare, met opvang voor zeehonden en vogels, laat bezoekers de bijzondere natuur van dichtbij zien. Texel telt meer schapen dan inwoners en heeft daarnaast veel paarden, honden en katten bij de bewoners."
      ],
      kernenLabel: 'Kernen', kernen: ['Den Burg', 'De Koog', 'Oudeschild', 'Den Hoorn', 'Oosterend', 'De Cocksdorp', 'De Waal', 'Oost', 'Midden-Eierland'],
      weetje: "Texel geldt als een van de beste vogeleilanden van Europa: er zijn meer dan driehonderd vogelsoorten waargenomen, in De Muy broedt een grote kolonie lepelaars, en op de zandplaten voor de kust rusten honderden zeehonden die door Ecomare worden opgevangen als ze ziek of verzwakt aanspoelen.",
      links: ['Den Burg']
    },
    {
      id: 'vlieland', tag: 'Friesland · Waddeneiland · 1.150 inwoners', titel: 'Dierenarts op Vlieland',
      paragrafen: [
        "Vlieland is het kleinste bewoonde Waddeneiland van Nederland en met ruim elfhonderd inwoners ook een van de kleinste gemeenten van het land. Het eiland heeft maar één dorp, Oost-Vlieland, met een enkele langgerekte Dorpsstraat vol historische kapiteinshuizen, want het tweede dorp West-Vlieland verdween in de achttiende eeuw volledig in zee. Vlieland is alleen bereikbaar met de veerboot vanuit Harlingen en is grotendeels autovrij: bezoekers moeten hun auto op het vasteland laten.",
        "De geschiedenis van het eiland is nauw verbonden met de zeevaart en de walvisvaart: in de zeventiende eeuw woonden er veel kapiteins en commandeurs die voor de VOC en op de walvisvaart uitvoeren, en hun rijkdom is nog zichtbaar in de statige huizen langs de Dorpsstraat. Museum Tromp's Huys, gevestigd in een van die kapiteinswoningen, vertelt het verhaal van dat verleden. Het westelijk deel van het eiland, de Vliehors, is een uitgestrekte zandvlakte die als militair oefenterrein wordt gebruikt en waar bezoekers alleen met de bekende Vliehors Expres, een omgebouwde legertruck, komen. Het dorp heeft een eigen basisschool, huisarts en dorpswinkel, en de gemeenschap is hecht en zelfredzaam.",
        "Buiten het dorp bestaat Vlieland vrijwel volledig uit duinen, bos en strand: het dennenbos werd in de negentiende eeuw aangeplant om het stuivende zand vast te leggen, en de duinen van het Waddenzeegebied zijn beschermd natuurgebied. Het eiland kent de minste lichtvervuiling van Nederland en is daardoor populair bij sterrenkijkers, terwijl de rust ook veel huisdierbezitters aantrekt die met hun hond vrijuit over de kilometerslange stranden kunnen lopen."
      ],
      kernenLabel: 'Kernen', kernen: ['Oost-Vlieland', 'Vliehors', "Kroon's Polders", 'Posthuys'],
      weetje: "Op de Vliehors, de grote zandvlakte aan de westkant van Vlieland, rusten honderden grijze en gewone zeehonden, en het eiland kent geen enkele inheemse ree, das of vos: de grootste wilde landzoogdieren zijn konijnen en hazen, waardoor de broedvogels er relatief veilig zijn.",
      links: []
    },
    {
      id: 'terschelling', tag: 'Friesland · Waddeneiland · 4.950 inwoners', titel: 'Dierenarts op Terschelling',
      paragrafen: [
        "Terschelling is na Texel het grootste Waddeneiland van Nederland en ligt op ongeveer twee uur varen vanuit Harlingen, of drie kwartier met de snelboot. Het eiland telt bijna vijfduizend inwoners, verdeeld over een reeks dorpen langs de waddenkant, met West-Terschelling als hoofdplaats en havenplaats, herkenbaar aan de Brandaris, de oudste nog werkende vuurtoren van Nederland uit 1594.",
        "De eilanders spreken van oudsher een eigen taal, het Terschellings, dat in drie varianten bestaat en verwant is aan het Fries. De geschiedenis van het eiland is doordrenkt van de zeevaart: veel Terschellingers waren loods, kapitein of walvisvaarder, en het Behouden Huys-museum in West vertelt onder meer het verhaal van Willem Barentsz, de beroemde ontdekkingsreiziger die op het eiland werd geboren. Terschelling is ook de bakermat van de cranberry: volgens de overlevering spoelde in de negentiende eeuw een vat cranberry's aan, waarna de bessen in de duinvalleien gingen groeien en het eiland zijn kenmerkende cranberryproducten kregen. Midsland, Hoorn, Formerum, Lies en Oosterend zijn kleinere dorpen met elk een eigen sfeer, en het jaarlijkse Oerol-festival verandert het hele eiland in juni in een openluchttheater.",
        "Het grootste deel van Terschelling is natuurgebied, met de Boschplaat aan de oostkant als een van de grootste kwelders van Europa en Europees natuurreservaat. De duinen, het aangeplante dennenbos en de kilometerslange stranden bieden een gevarieerd landschap, waar ook veel eilanders met hond, kat of paard wonen."
      ],
      kernenLabel: 'Kernen', kernen: ['West-Terschelling', 'Midsland', 'Hoorn', 'Formerum', 'Lies', 'Oosterend', 'Baaiduinen', 'Kinnum', 'Landerum', 'Hee', 'Kaart', 'Striep', 'Seerijp'],
      weetje: "Op de Boschplaat aan de oostkant van Terschelling broeden duizenden vogels op een van de grootste kwelders van Europa, en het eiland kent een eigen paardenras: de Terschellinger pony's die vrij in de duinen grazen en die van oudsher werden gebruikt voor het vervoer over het strand.",
      links: []
    },
    {
      id: 'ameland', tag: 'Friesland · Waddeneiland · 3.850 inwoners', titel: 'Dierenarts op Ameland',
      paragrafen: [
        "Ameland ligt tussen Terschelling en Schiermonnikoog en is bereikbaar met de veerboot vanuit Holwerd, een overtocht van ongeveer drie kwartier over de Waddenzee. Het eiland telt bijna vierduizend inwoners in vier dorpen: Hollum, Nes, Ballum en Buren, elk met een eigen karakter en een goed bewaarde historische kern met karakteristieke commandeurshuizen uit de tijd van de walvisvaart.",
        "Nes is de veerhaven en het levendige centrum met winkels en horeca, Hollum aan de westkant is het oudste dorp met de bekende rood-witte vuurtoren en het Reddingsmuseum, Ballum was eeuwenlang de zetel van de heren van Ameland, die het eiland als vrije heerlijkheid bestuurden, en Buren aan de oostkant is het rustigste dorp met het Landbouw- en Juttersmuseum. Ameland kent een bijzondere traditie: de paardenreddingboot van Hollum, die nog altijd enkele keren per jaar met tien paarden door de branding het water in wordt getrokken als demonstratie van hoe reddingen vroeger verliepen. Het eiland heeft ook een eigen bierbrouwerij, een zuivelboerderij en een vliegveld voor kleine vliegtuigen.",
        "De natuur van Ameland is afwisselend: brede stranden aan de Noordzee, uitgestrekte duinen met bos in het midden, en aan de oostkant het Oerd en de Hôn, een natuurreservaat met kwelders waar het eiland nog steeds aangroeit. De polders aan de waddenkant zijn belangrijk voor weidevogels en grazende ganzen. Veel eilanders houden dieren, van paarden voor het strandwerk tot honden en katten."
      ],
      kernenLabel: 'Kernen', kernen: ['Nes', 'Hollum', 'Ballum', 'Buren'],
      weetje: "De paardenreddingboot van Hollum is uniek in de wereld: tien Amelander paarden trekken de historische reddingboot dwars door de branding de zee in, een traditie die tot 1988 echte reddingen betrof en nu enkele keren per jaar wordt gedemonstreerd voor duizenden toeschouwers.",
      links: []
    },
    {
      id: 'schiermonnikoog', tag: 'Friesland · Waddeneiland · 950 inwoners', titel: 'Dierenarts op Schiermonnikoog',
      paragrafen: [
        "Schiermonnikoog is het kleinste bewoonde Waddeneiland qua inwoners en de kleinste gemeente van Nederland, met nog geen duizend inwoners die vrijwel allemaal in het enige dorp wonen dat dezelfde naam draagt als het eiland. Het eiland is bereikbaar met de veerboot vanuit Lauwersoog, is grotendeels autovrij voor bezoekers en dankt zijn naam aan de grijze monniken van het klooster Klaarkamp, die het eiland in de middeleeuwen in bezit hadden; een schier monnik is een grijze monnik.",
        "Het dorp, met zijn karakteristieke huizen, twee kerken en de Willemshof als centraal plein, ligt beschut in de duinen en heeft een dorpse gemeenschap met eigen school, huisarts en verenigingen. Het eiland was eeuwenlang particulier bezit van adellijke families en werd pas na de Tweede Wereldoorlog, als Duits vijandelijk vermogen, eigendom van de Nederlandse staat. In 1989 werd vrijwel het hele eiland aangewezen als Nationaal Park, het eerste van Nederland, waarmee de natuur formeel de hoofdrol kreeg. Het bezoekerscentrum in het dorp en de rode en witte vuurtoren behoren tot de bekendste herkenningspunten, en het Wassermann, een Duitse bunker uit de oorlog, biedt een weids uitzicht over het eiland.",
        "Het grootste deel van Schiermonnikoog bestaat uit strand, duinen, kwelders en polders. Het strand is met plaatselijk meer dan een kilometer breedte het breedste van Europa, en aan de oostkant groeit het eiland nog altijd door aanslibbing. De stilte en het gebrek aan verkeer maken het eiland geliefd bij rustzoekers, wandelaars en hondenbezitters."
      ],
      kernenLabel: 'Kernen', kernen: ['Schiermonnikoog (dorp)', 'Kooiplaats', 'Oosterkwelder', 'Westerplas', 'Banckspolder'],
      weetje: "Schiermonnikoog werd in 1989 het eerste Nationaal Park van Nederland, en op de Oosterkwelder rusten en broeden tienduizenden vogels, terwijl in het najaar tot een kwart miljoen trekvogels op het eiland neerstrijken om bij te tanken voordat ze verder trekken naar het zuiden.",
      links: []
    },
    {
      id: 'schouwen-duiveland', tag: 'Zeeland · Zeeuws eiland · 34.250 inwoners', titel: 'Dierenarts op Schouwen-Duiveland',
      paragrafen: [
        "Schouwen-Duiveland is het meest noordelijke Zeeuwse eiland en ontstond als gemeente in 1997 uit de samenvoeging van alle gemeenten op het eiland, met Zierikzee als historische hoofdplaats en bestuurlijk centrum. Het eiland is via de Zeelandbrug, bij de opening in 1965 de langste brug van Europa, verbonden met Noord-Beveland en via de Brouwersdam en de Grevelingendam met Goeree-Overflakkee en Sint Philipsland.",
        "Zierikzee is een van de mooiste kleine monumentensteden van Nederland, met stadspoorten, een havenkwartier en de Dikke Toren, een kathedraaltoren die nooit werd afgebouwd maar toch het silhouet van de stad bepaalt. Aan de westkant van het eiland liggen de badplaatsen Renesse, Burgh-Haamstede en Westenschouwen, met kilometerslange stranden die in de zomer honderdduizenden toeristen trekken, vooral uit Duitsland en België. Brouwershaven, Bruinisse en Dreischor zijn karakteristieke dorpen met ringkerken en oude havens, waarbij Bruinisse bekendstaat om zijn mosselvisserij. De watersnoodramp van 1953 trof het eiland zwaar en het Watersnoodmuseum in Ouwerkerk, gevestigd in de caissons waarmee het laatste dijkgat werd gedicht, herdenkt die geschiedenis.",
        "Het landschap van Schouwen-Duiveland is een afwisseling van open polders, dijken, kreken en het duingebied van de Kop van Schouwen, een van de grootste duingebieden van Zeeland. De Oosterschelde, het Grevelingenmeer en de Noordzee omringen het eiland en maken het tot een paradijs voor duikers, zeilers en vogelaars."
      ],
      kernenLabel: 'Kernen', kernen: ['Zierikzee', 'Renesse', 'Burgh-Haamstede', 'Bruinisse', 'Brouwershaven', 'Nieuwerkerk', 'Oosterland', 'Dreischor', 'Scharendijke', 'Ouwerkerk', 'Zonnemaire', 'Ellemeet', 'Kerkwerve', 'Serooskerke', 'Noordgouwe', 'Sirjansland'],
      weetje: "In de Oosterschelde rond Schouwen-Duiveland leven zeehonden en duizenden bruinvissen, en de kust bij Zierikzee en Burghsluis is een van de beste plekken van Nederland om deze kleine walvisachtige vanaf de dijk te zien opduiken, vooral in de zomermaanden.",
      links: ['Zierikzee', 'Burgh-Haamstede']
    },
    {
      id: 'tholen', tag: 'Zeeland · Zeeuws eiland · 26.000 inwoners', titel: 'Dierenarts op Tholen',
      paragrafen: [
        "Tholen is een gemeente die twee eilanden omvat: het eiland Tholen zelf en het kleinere Sint Philipsland, beide gelegen in het noordoosten van Zeeland tegen de grens met Noord-Brabant. De gemeente ontstond in 1971 uit de samenvoeging van alle dorpen op het eiland Tholen en werd in 1995 uitgebreid met Sint Philipsland, en is via de Oesterdam en de Philipsdam verbonden met de rest van Zeeland en het Brabantse vasteland.",
        "Het stadje Tholen is de historische hoofdplaats en een van de kleinste vestingstadjes van Nederland, met bewaard gebleven wallen, een stadhuis uit de vijftiende eeuw en de Grote Kerk aan een pittoreske markt. Sint-Maartensdijk, het grootste dorp, was ooit een heerlijkheid van de familie Van Borsele en kent een rijke geschiedenis rond het vroegere kasteel. De andere dorpen, zoals Poortvliet, Scherpenisse, Stavenisse, Sint-Annaland en Oud-Vossemeer, zijn typisch Zeeuwse ringdorpen met een kerk in het midden en een sterke agrarische en protestantse traditie. Sint-Annaland heeft een grote jachthaven aan de Oosterschelde en Stavenisse werd in 1953 zwaar getroffen door de watersnoodramp. Op Sint Philipsland ligt het gelijknamige dorp met Anna Jacobapolder als tweede kern.",
        "Het landschap van Tholen bestaat uit weidse akkerbouwpolders, dijken en de oevers van de Oosterschelde en het Krammer-Volkerak. Het eiland is minder toeristisch dan de andere Zeeuwse eilanden, waardoor rust en ruimte overheersen en de agrarische sector met uien, aardappelen en bieten het straatbeeld bepaalt."
      ],
      kernenLabel: 'Kernen', kernen: ['Tholen', 'Sint-Maartensdijk', 'Sint-Annaland', 'Poortvliet', 'Scherpenisse', 'Stavenisse', 'Oud-Vossemeer', 'Sint Philipsland', 'Anna Jacobapolder'],
      weetje: "In de Oosterschelde bij Tholen liggen de historische oesterputten van Yerseke aan de overkant, en de schorren en slikken langs de Thoolse kust zijn een belangrijk voedselgebied voor tienduizenden steltlopers, terwijl in het Krammer-Volkerak sinds enkele jaren weer zeearenden broeden.",
      links: []
    },
    {
      id: 'noord-beveland', tag: 'Zeeland · Zeeuws eiland · 7.600 inwoners', titel: 'Dierenarts op Noord-Beveland',
      paragrafen: [
        "Noord-Beveland is een van de kleinste en rustigste Zeeuwse eilanden en vormt sinds 1995 één gemeente, met Wissenkerke als bestuurlijke hoofdplaats en Kortgene en Kamperland als grootste kernen. Het eiland ligt tussen de Oosterschelde in het noorden en het Veerse Meer in het zuiden en is via de Zeelandbrug, de Oosterscheldekering, de Veerse Gatdam en de Zandkreekdam verbonden met Schouwen-Duiveland, Walcheren en Zuid-Beveland.",
        "De geschiedenis van het eiland is dramatisch: in 1530 en 1532 verdween heel Noord-Beveland bij stormvloeden onder water, en pas een halve eeuw later werd het land polder voor polder opnieuw bedijkt, te beginnen bij Colijnsplaat in 1598. Colijnsplaat is daarmee het oudste dorp van het huidige eiland, met een karakteristiek rechthoekig stratenpatroon en een levendige vissershaven aan de Oosterschelde. Kortgene aan het Veerse Meer heeft een grote jachthaven en Kamperland is het toeristische centrum met vakantieparken aan de Veerse Gatdam en het strand van de Banjaard, een van de mooiste stranden van Zeeland. Wissenkerke, Geersdijk en Kats zijn kleine agrarische dorpen te midden van de polders. Bij de Oosterscheldekering ligt Neeltje Jans, het waterpark en informatiecentrum over de Deltawerken.",
        "Het landschap van Noord-Beveland is open en weids, met kaarsrechte polderwegen, akkers met uien en aardappelen en lange dijken langs het water. Het Veerse Meer is een populair watersportgebied en de Oosterschelde is Nationaal Park, wat het eiland tot een geliefde bestemming maakt voor rustzoekers, fietsers, duikers en vogelaars."
      ],
      kernenLabel: 'Kernen', kernen: ['Wissenkerke', 'Kortgene', 'Kamperland', 'Colijnsplaat', 'Kats', 'Geersdijk'],
      weetje: "Voor de kust van Noord-Beveland liggen de zandplaten van de Oosterschelde waar honderden zeehonden rusten, goed te zien tijdens boottochten vanuit Colijnsplaat, en bij Neeltje Jans broeden duizenden grote sterns en visdiefjes op de werkeilanden van de Oosterscheldekering.",
      links: []
    },
    {
      id: 'walcheren', tag: 'Zeeland · Zeeuws eiland · 115.000 inwoners', titel: 'Dierenarts op Walcheren',
      paragrafen: [
        "Walcheren is het meest westelijke Zeeuwse eiland, al is het door de Sloedam en later de Sloehaven feitelijk met Zuid-Beveland verbonden, en omvat de gemeenten Middelburg, Vlissingen en Veere. Met ruim honderdduizend inwoners is het het dichtstbevolkte eiland van Zeeland en het bestuurlijke en economische hart van de provincie, met Middelburg als provinciehoofdstad en Vlissingen als havenstad aan de Westerschelde.",
        "Vlissingen is de geboortestad van admiraal Michiel de Ruyter en heeft met zijn boulevard aan de Westerschelde een van de weinige plekken in Nederland waar zeeschepen op enkele honderden meters afstand voorbijvaren. Veere is een miniatuurstadje met een rijke geschiedenis als handelsstad met Schotland, zichtbaar in de Schotse Huizen aan de kade en de imposante Grote Kerk. Domburg is de oudste badplaats van Zeeland, waar rond 1900 kunstenaars als Piet Mondriaan en Jan Toorop kwamen schilderen, en Westkapelle, Zoutelande en Oostkapelle zijn populaire badplaatsen aan de zonnigste kust van Nederland. In 1944 werd Walcheren door de geallieerden onder water gezet om de Duitse bezetter te verdrijven, wat het eiland zwaar trof en tot de Slag om de Schelde leidde, herdacht in het Polderhuis in Westkapelle.",
        "Het binnenland van Walcheren is een kleinschalig landschap van polders, elzenhagen en dorpen met ringkerken, ook wel de Tuin van Zeeland genoemd. De Manteling bij Domburg is een uniek duinbos, en het Veerse Meer aan de noordkant is een groot watersportgebied."
      ],
      kernenLabel: 'Kernen', kernen: ['Middelburg', 'Vlissingen', 'Veere', 'Domburg', 'Westkapelle', 'Zoutelande', 'Oostkapelle', 'Koudekerke', 'Arnemuiden', 'Serooskerke', 'Grijpskerke', 'Meliskerke', 'Aagtekerke', 'Biggekerke', 'Gapinge', 'Vrouwenpolder', 'Nieuw- en Sint Joosland', 'Souburg', 'Ritthem'],
      weetje: "Voor de boulevard van Vlissingen zwemmen regelmatig bruinvissen en zeehonden op enkele tientallen meters van het strand, en in de Manteling bij Domburg, een duinbos dat door de zeewind in een schuine vorm is gegroeid, leven reeën en dassen op steenworp afstand van de badplaats.",
      links: ['Middelburg', 'Vlissingen', 'Oostkapelle'],
      standalone: '/dierenarts-walcheren'
    },
    {
      id: 'zuid-beveland', tag: 'Zeeland · Zeeuws eiland · 97.000 inwoners', titel: 'Dierenarts op Zuid-Beveland',
      paragrafen: [
        "Zuid-Beveland is het grootste Zeeuwse eiland en omvat de gemeenten Goes, Kapelle, Reimerswaal en Borsele, met de stad Goes als centrum en zo'n zevenennegentigduizend inwoners in totaal. Het eiland ligt tussen de Oosterschelde in het noorden en de Westerschelde in het zuiden en is via de Kreekrakdam, waarover ook de A58 en de spoorlijn lopen, vast met Noord-Brabant verbonden, waardoor het feitelijk een schiereiland is.",
        "Goes is een historische stad met een goed bewaarde binnenstad, een historische haven en de Grote of Maria Magdalenakerk, en fungeert als winkel- en verzorgingscentrum voor heel Midden-Zeeland. Yerseke, in de gemeente Reimerswaal, is wereldberoemd om zijn oesters en mosselen, die er al sinds de negentiende eeuw worden gekweekt en verhandeld; de oesterputten en de mosselveiling trekken jaarlijks veel bezoekers. Kapelle en Wemeldinge staan bekend om de fruitteelt, met uitgestrekte boomgaarden die in het voorjaar bloeien. In de gemeente Borsele liggen ringdorpen als Heinkenszand en 's-Heerenhoek te midden van het kleinschalige landschap van de Zak van Zuid-Beveland, met zijn kronkelende dijken, bloemdijken en welen die herinneren aan oude dijkdoorbraken. Aan de Westerschelde ligt het havengebied Vlissingen-Oost met de kerncentrale van Borssele.",
        "Het landschap varieert van de open akkerbouwpolders in het oosten tot de intieme, bloemrijke dijken van de Zak van Zuid-Beveland in het westen. De Oosterschelde is Nationaal Park en de Westerschelde is een belangrijk vogelgebied, wat het eiland aantrekkelijk maakt voor natuurliefhebbers."
      ],
      kernenLabel: 'Kernen', kernen: ['Goes', 'Kapelle', 'Yerseke', 'Kruiningen', 'Krabbendijke', 'Rilland', 'Wemeldinge', 'Heinkenszand', "'s-Heerenhoek", 'Borssele', 'Nieuwdorp', 'Kloetinge', 'Wilhelminadorp', 'Kwadendamme', 'Ovezande', 'Nisse', 'Hansweert', 'Waarde', 'Oudelande', 'Ellewoutsdijk'],
      weetje: "In de Oosterschelde bij Yerseke leven de beroemde Zeeuwse oesters en mosselen, maar ook zeehonden en bruinvissen, en de bloemdijken van de Zak van Zuid-Beveland zijn een van de laatste plekken in Nederland waar zeldzame planten als de wilde marjolein en de kleine ratelaar massaal bloeien en talloze vlinders en bijen aantrekken.",
      links: ['Goes', 'Kapelle', 'Yerseke', 'Kruiningen', 'Heinkenszand'],
      standalone: '/dierenarts-zuid-beveland'
    },
    {
      id: 'goeree-overflakkee', tag: 'Zuid-Holland · Zuid-Hollands eiland · 51.500 inwoners', titel: 'Dierenarts op Goeree-Overflakkee',
      paragrafen: [
        "Goeree-Overflakkee is officieel een Zuid-Hollands eiland, maar wordt landschappelijk en historisch tot de Zeeuwse eilanden gerekend en vormt sinds 2013 één gemeente met Middelharnis als bestuurlijke hoofdplaats. Het eiland ontstond uit de samenvoeging van de eilanden Goeree en Overflakkee in de achttiende eeuw en is via de Haringvlietbrug, de Haringvlietdam, de Brouwersdam en de Grevelingendam verbonden met het vasteland en de Zeeuwse eilanden.",
        "Goedereede is een historisch stadje met een imposante toren die eeuwenlang als vuurtoren diende en waar de latere paus Adrianus VI pastoor was. Ouddorp aan de kop van Goeree is het toeristische centrum met brede stranden en campings, en Stellendam heeft een vissershaven en een visafslag. Middelharnis en Sommelsdijk vormen samen het grootste dorp met winkels en voorzieningen, Dirksland heeft het ziekenhuis van het eiland, en Oude-Tonge, Ooltgensplaat en Den Bommel zijn karakteristieke voorstraatdorpen aan de zuidkant. Het eiland heeft een sterk protestants karakter, met zondagsrust die nog op veel plaatsen wordt gehandhaafd, en een eigen dialect, het Flakkees. De watersnoodramp van 1953 trof het eiland zeer zwaar: in Oude-Tonge alleen al vielen meer dan driehonderd doden.",
        "Het landschap bestaat uit weidse akkerbouwpolders, met uien als kenmerkend gewas, en aan de kop van Goeree uit duinen en de Kwade Hoek, een natuurgebied dat nog aangroeit. Het Grevelingenmeer, het grootste zoutwatermeer van Europa, en het Haringvliet omringen het eiland en zijn belangrijke natuur- en watersportgebieden."
      ],
      kernenLabel: 'Kernen', kernen: ['Middelharnis', 'Sommelsdijk', 'Ouddorp', 'Goedereede', 'Stellendam', 'Dirksland', 'Melissant', 'Herkingen', 'Nieuwe-Tonge', 'Oude-Tonge', 'Ooltgensplaat', 'Den Bommel', 'Achthuizen', "Stad aan 't Haringvliet"],
      weetje: "Bij de Haringvlietsluizen en op de Kwade Hoek bij Goeree-Overflakkee rusten honderden zeehonden, en sinds de Haringvlietsluizen in 2018 op een kier werden gezet, trekken zalm en steur weer vanuit zee de rivieren op, terwijl in het Grevelingenmeer ook regelmatig bruinvissen worden gezien.",
      links: ['Sommelsdijk', 'Stellendam', 'Oude-Tonge']
    }
  ];

const eilandKop = (e) => e.titel.replace(/^Dierenklinieken? op /, '').replace(/^Dierenarts op /, '');

function eilandenPage() {
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Dierenarts op de eilanden', url: '/dierenarts-op-de-eilanden' }];
  const kop = eilandKop;
  const nav = EILANDEN.map(e => `<a href="${e.standalone || '#' + e.id}">${L.esc(kop(e))}</a>`).join('\n    ');

  const secties = EILANDEN.map(e => {
    const links = (e.links || []).map(eilandStadLink).filter(Boolean);
    if (e.standalone) {
      // Eigen pagina (regio met meerdere gemeenten/stadpagina's): op de hub
      // alleen een korte teaser, de volledige tekst staat op e.standalone.
      return `<a class="link-card" href="${e.standalone}" id="${e.id}" style="scroll-margin-top:16px; display:block;">
  <p class="subtitle" style="margin-bottom:4px;">${e.tag}</p>
  <h2 style="font-size:17px; font-weight:700; margin-bottom:6px;">${L.esc(e.titel)}</h2>
  <p>${L.esc(e.paragrafen[0])}</p>
  <p style="margin-top:8px; font-weight:700; color:#0070AC;">Lees meer over ${L.esc(kop(e))} →</p>
</a>`;
    }
    return `<section class="card" id="${e.id}" style="scroll-margin-top:16px;">
  <p class="subtitle" style="margin-bottom:4px;">${e.tag}</p>
  <h2>${L.esc(e.titel)}</h2>
  ${e.paragrafen.map(p => `<p>${L.esc(p)}</p>`).join('\n  ')}
  <div style="background:#f7f9fc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 20px; margin-top:12px;">
    <strong style="display:block; margin-bottom:6px; color:#0070AC; font-size:13px; text-transform:uppercase; letter-spacing:.03em;">${L.esc(e.kernenLabel)}</strong>
    ${L.esc(e.kernen.join(', '))}
  </div>
  <div style="background:#f0f9ff; border-left:4px solid #00A1E4; border-radius:8px; padding:14px 18px; margin-top:12px;">
    <strong>Leuk weetje:</strong> ${L.esc(e.weetje)}
  </div>
  ${links.length ? `<div class="tag-row" style="margin-top:14px;"><strong style="width:100%; font-size:13px; color:#0070AC; margin-bottom:4px;">Dierenklinieken:</strong>${links.join('\n    ')}</div>` : ''}
</section>`;
  }).join('\n');

  const ld = [
    {
      '@type': 'WebPage',
      '@id': L.SITE + '/dierenarts-op-de-eilanden#webpage',
      name: 'Dierenarts op de Zeeuwse eilanden en Waddeneilanden',
      description: 'Vind een dierenarts op de Waddeneilanden en de Zeeuwse eilanden: Texel, Vlieland, Terschelling, Ameland, Schiermonnikoog, Schouwen-Duiveland, Tholen, Noord-Beveland, Walcheren, Zuid-Beveland en Goeree-Overflakkee.',
      url: L.SITE + '/dierenarts-op-de-eilanden',
      inLanguage: 'nl-NL',
      isPartOf: { '@id': L.SITE + '/#organization' }
    },
    L.breadcrumbLd(crumbs)
  ];

  const body = `${L.breadcrumbHtml(crumbs)}
<div class="card">
  <h1>Dierenarts op de eilanden</h1>
  <p class="subtitle">Op zoek naar een dierenarts op een eiland? Hieronder vindt u de vijf bewoonde Waddeneilanden en de Zeeuwse eilanden, met een korte schets van het eiland, de dorpen en kernen, en een dierenweetje uit de omgeving. Op een eiland is een dierenarts dichtbij extra belangrijk: de veerboot maakt een spoedrit naar het vasteland lastig.</p>
  <div class="tag-row" style="margin-top:14px;">
    ${nav}
  </div>
</div>
${secties}`;

  return L.page({
    title: 'Dierenarts op de Zeeuwse eilanden en Waddeneilanden | Dierenkliniek.nl',
    description: 'Dierenarts op Texel, Vlieland, Terschelling, Ameland, Schiermonnikoog en de Zeeuwse eilanden. Overzicht per eiland met kernen en dierenklinieken.',
    canonical: '/dierenarts-op-de-eilanden', bodyHtml: body, jsonld: ld, lastmod: BUILD_DATE, ogType: 'website'
  });
}

// Losse pagina voor een eilandregio die meerdere gemeenten/stadpagina's omvat
// (Walcheren, Zuid-Beveland) — te veel eigen content en te veel echte
// klinieken-doorlinks om als sectie op de hub-pagina te verdrinken.
function eilandSubPage(e) {
  const kop = eilandKop(e);
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Dierenarts op de eilanden', url: '/dierenarts-op-de-eilanden' }, { name: kop, url: e.standalone }];
  const links = (e.links || []).map(eilandStadLink).filter(Boolean);
  const beschrijving = e.paragrafen[0].slice(0, 155).replace(/\s+\S*$/, '') + '…';

  const ld = [
    {
      '@type': 'WebPage',
      '@id': L.SITE + e.standalone + '#webpage',
      name: e.titel,
      description: beschrijving,
      url: L.SITE + e.standalone,
      inLanguage: 'nl-NL',
      isPartOf: { '@id': L.SITE + '/#organization' }
    },
    L.breadcrumbLd(crumbs)
  ];

  const body = `${L.breadcrumbHtml(crumbs)}
<div class="card">
  <p class="subtitle" style="margin-bottom:4px;">${e.tag}</p>
  <h1>${L.esc(e.titel)}</h1>
  ${e.paragrafen.map(p => `<p>${L.esc(p)}</p>`).join('\n  ')}
  <div style="background:#f7f9fc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 20px; margin-top:16px;">
    <strong style="display:block; margin-bottom:6px; color:#0070AC; font-size:13px; text-transform:uppercase; letter-spacing:.03em;">${L.esc(e.kernenLabel)}</strong>
    ${L.esc(e.kernen.join(', '))}
  </div>
  <div style="background:#f0f9ff; border-left:4px solid #00A1E4; border-radius:8px; padding:14px 18px; margin-top:12px;">
    <strong>Leuk weetje:</strong> ${L.esc(e.weetje)}
  </div>
  ${links.length ? `<div class="tag-row" style="margin-top:16px;"><strong style="width:100%; font-size:13px; color:#0070AC; margin-bottom:4px;">Dierenklinieken op ${L.esc(kop)}:</strong>${links.join('\n    ')}</div>` : ''}
  <p style="margin-top:16px;"><a href="/dierenarts-op-de-eilanden">← Alle eilanden</a></p>
</div>`;

  return L.page({
    title: `${e.titel} | Dierenkliniek.nl`,
    description: beschrijving,
    canonical: e.standalone, bodyHtml: body, jsonld: ld, lastmod: BUILD_DATE, ogType: 'website'
  });
}

write('spoedhulp.html', spoedPage(), '/spoedhulp');
write('dierenarts-op-de-eilanden.html', eilandenPage(), '/dierenarts-op-de-eilanden');
for (const e of EILANDEN.filter(x => x.standalone)) {
  write(e.standalone.slice(1) + '.html', eilandSubPage(e), e.standalone);
}
write('dierenarts-in-de-buurt.html', buurtPage(), '/dierenarts-in-de-buurt');
write('provincies.html', provinciesPage(), '/provincies');
for (const p of PROVINCES) { const r = provinciePage(p); write(r.slug + '.html', r.html, '/' + r.slug); }
write('glossarium.html', glossariumPage(), '/glossarium');
write('specialismen.html', specialismenPage(), '/specialismen');
for (const s of SPECIALISMEN) { const r = specialismePage(s); write(r.slug + '.html', r.html, '/' + r.slug); }

fs.writeFileSync(path.join(__dirname, 'pagina-urls.json'), JSON.stringify(urls, null, 2));
console.log('paginas: ' + urls.length + " URL's, spoedklinieken: " + spoed.length);
