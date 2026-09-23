// Verrijkt de 605 kliniekpagina's en 369 stadpagina's:
//  - uitgebreider schema.org (@id-graph, areaServed, hasMap, knowsAbout, FAQPage)
//  - een zichtbare FAQ-sectie met feitelijke antwoorden uit de eigen dataset
//  - interne links naar provincie-, spoedhulp- en kennisbankpagina's
// Het script is idempotent: eerder toegevoegde blokken worden vervangen.
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const DATA = require('./extract-data');
const O = require('./openingstijden');
const P = require('./profielen');

const TIJDEN = O.laad();
const PROFIELEN = P.laad();

const ROOT = L.ROOT;
const { CLINICS } = DATA;

const { provinceOf, clinicSlug, citySlug } = L;

const START = '<!-- dk:seo-start -->';
const END = '<!-- dk:seo-end -->';

function stripOld(html) {
  const re = new RegExp(START + '[\\s\\S]*?' + END, 'g');
  return html.replace(re, '');
}

function injectBeforeMainEnd(html, block) {
  const i = html.lastIndexOf('</main>');
  if (i === -1) return null;
  return html.slice(0, i) + START + '\n' + block + '\n' + END + '\n' + html.slice(i);
}

function injectLd(html, obj) {
  // Voeg een extra JSON-LD blok toe direct voor </head>, met marker zodat het
  // bij een volgende run wordt vervangen.
  const i = html.indexOf('</head>');
  if (i === -1) return html;
  const block = `${START}
<script type="application/ld+json">
${JSON.stringify(obj, null, 2)}
</script>
${END}
`;
  return html.slice(0, i) + block + html.slice(i);
}

// Google kapt titels rond 60-65 tekens af. Laat het merksuffix weg zodra de
// naam van de kliniek zelf al lang is.
function fixTitle(html, name, city) {
  const suffix = ' | Dierenkliniek.nl';
  const full = `${name} — dierenarts in ${city}`;
  let title;
  if ((full + suffix).length <= 65) title = full + suffix;
  else if (full.length <= 70) title = full;
  else if (`${name} — ${city}`.length <= 70) title = `${name} — ${city}`;
  else title = name.length <= 70 ? name : name.slice(0, 67).trim() + '…';
  return html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + title.replace(/</g, '&lt;') + '</title>');
}

function fixCityTitle(html, city, n) {
  const suffix = ' | Dierenkliniek.nl';
  const options = n === 1 ? [
    `Dierenarts ${city} — 1 kliniek`,
    `Dierenarts ${city}`
  ] : [
    `Dierenarts ${city} — ${n} klinieken vergelijken`,
    `Dierenarts ${city} — ${n} klinieken`,
    `Dierenarts ${city}`
  ];
  let title = options.find(o => (o + suffix).length <= 65);
  title = title ? title + suffix : options[options.length - 1];
  return html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + title.replace(/</g, '&lt;') + '</title>');
}

const SITE = L.SITE;
const ORG_REF = { '@id': SITE + '/#organization' };

let clinicCount = 0, cityCount = 0, missing = [];

// Voor per-kliniek vergelijkingen: alle klinieken per plaats, en de landelijke
// lijst met 24/7 spoedklinieken (met coördinaten) om de dichtstbijzijnde te
// kunnen noemen voor praktijken die zelf geen spoeddienst hebben.
const perStadAlle = {};
for (const c of CLINICS) (perStadAlle[c.city] ||= []).push(c);
const spoedMetCoords = CLINICS.filter(c => (c.tags || []).includes('spoed') && c.lat && c.lng);
function afstandKm(a, b) {
  const R = 6371, rad = (d) => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/* ---------------- kliniekpagina's ---------------- */
for (const c of CLINICS) {
  const slug = clinicSlug(c);
  const file = path.join(ROOT, slug + '.html');
  if (!fs.existsSync(file)) { missing.push(slug); continue; }

  let html = stripOld(fs.readFileSync(file, 'utf8'));
  const prov = provinceOf(c);
  const url = SITE + '/' + slug;
  const specs = c.specs || [];
  const isSpoed = (c.tags || []).includes('spoed');
  const mapUrl = 'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(`${c.name}, ${c.address}, ${c.postcode} ${c.city}`);
  const dagen = TIJDEN[slug];
  const tijdenSchema = O.schemaVoor(dagen);
  const profiel = PROFIELEN[slug];
  const eigenOmschrijving = P.omschrijvingVoor(c, profiel);
  const fotos = P.fotosVoor(c, profiel);

  const anderenInStad = (perStadAlle[c.city] || []).filter(o => o !== c);
  const stadgenoten = perStadAlle[c.city] || [];
  const beoordeeldeStadgenoten = stadgenoten.filter(o => o.rating && o.reviews);
  const gemStad = beoordeeldeStadgenoten.length
    ? beoordeeldeStadgenoten.reduce((s, o) => s + o.rating * o.reviews, 0) / beoordeeldeStadgenoten.reduce((s, o) => s + o.reviews, 0)
    : null;
  const dichtstbijzijndeSpoed = (!isSpoed && c.lat && c.lng)
    ? spoedMetCoords.filter(o => o !== c).map(o => ({ o, d: afstandKm(c, o) })).sort((a, b) => a.d - b.d)[0]
    : null;

  const faqs = [
    {
      q: `Wat is het telefoonnummer van ${c.name}?`,
      a: `${c.name} is bereikbaar op ${c.phone}. De praktijk zit aan ${c.address}, ${c.postcode} ${c.city}${prov ? ` (${prov})` : ''}.`
    },
    {
      q: `Waar is ${c.name} gevestigd?`,
      a: `Het adres is ${c.address}, ${c.postcode} ${c.city}${prov ? `, provincie ${prov}` : ''}.`
    },
    {
      q: `Biedt ${c.name} 24/7 spoedhulp?`,
      a: isSpoed
        ? `Ja, ${c.name} staat bij ons vermeld als kliniek met een 24-uurs spoeddienst. Bel altijd eerst ${c.phone} voordat u langskomt.`
        : dichtstbijzijndeSpoed
          ? `Bij ${c.name} staat geen eigen 24/7 spoeddienst vermeld. De dichtstbijzijnde kliniek met 24-uurs spoedhulp in onze data is ${dichtstbijzijndeSpoed.o.name}${dichtstbijzijndeSpoed.d < 1 ? `, eveneens in ${c.city}` : ` in ${dichtstbijzijndeSpoed.o.city}, op ongeveer ${dichtstbijzijndeSpoed.d.toFixed(0)} km`}. Bel altijd eerst.`
          : `Bij ${c.name} staat geen eigen 24/7 spoeddienst vermeld. Bel de praktijk op ${c.phone} voor de dienstregeling buiten openingstijden, of bekijk het landelijke overzicht van klinieken met 24-uurs spoedhulp.`
    },
    specs.length ? {
      q: `Welke specialisaties heeft ${c.name}?`,
      a: `Bij deze praktijk staan de volgende aandachtsgebieden vermeld: ${specs.join(', ')}.`
    } : null,
    O.samenvatting(dagen) ? {
      q: `Wat zijn de openingstijden van ${c.name}?`,
      a: O.bevestigd(dagen)
        ? `${c.name} is geopend op ${O.samenvatting(dagen)}.`
        : `Bij ons staan deze tijden genoteerd: ${O.samenvatting(dagen)}. Ze zijn nog niet door de praktijk zelf bevestigd, dus bel ${c.phone} voordat u langskomt.`
    } : null,
    (c.rating && c.reviews && gemStad && stadgenoten.length > 1) ? {
      q: `Hoe scoort ${c.name} vergeleken met andere klinieken in ${c.city}?`,
      a: `${c.name} scoort ${String(c.rating).replace('.', ',')}/5 op basis van ${c.reviews} beoordelingen. Het gemiddelde van ${beoordeeldeStadgenoten.length} beoordeelde ${beoordeeldeStadgenoten.length === 1 ? 'kliniek' : 'klinieken'} in ${c.city} is ${gemStad.toFixed(1).replace('.', ',')}/5.`
    } : null,
    {
      q: `Zijn er meer dierenklinieken in ${c.city}?`,
      a: anderenInStad.length
        ? `Ja, naast ${c.name} ${anderenInStad.length === 1 ? 'staat er nog 1 andere kliniek' : `staan er nog ${anderenInStad.length} andere klinieken`} vermeld in ${c.city}: ${anderenInStad.map(o => o.name).join(', ')}. Bekijk de pagina Dierenarts ${c.city} voor alle contactgegevens${prov ? `, of de provinciepagina voor heel ${prov}` : ''}.`
        : `Nee, ${c.name} is de enige kliniek die wij in ${c.city} vermeld hebben staan${prov ? `. Op de provinciepagina van ${prov} vindt u wel andere klinieken in de omgeving` : ''}.`
    }
  ].filter(Boolean);

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url + '#webpage',
        url,
        name: `${c.name} — dierenarts in ${c.city}`,
        inLanguage: 'nl-NL',
        isPartOf: ORG_REF,
        about: { '@id': url + '#clinic' },
        primaryImageOfPage: { '@type': 'ImageObject', url: SITE + '/og-image.png' },
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.subtitle'] }
      },
      {
        '@type': 'VeterinaryCare',
        '@id': url + '#clinic',
        name: c.name,
        url,
        telephone: c.phone || undefined,
        email: c.email || undefined,
        description: eigenOmschrijving || L.beschrijvingVoor(c),
        image: fotos.length ? fotos.map(f => SITE + f.bestand) : SITE + '/og-image.png',
        hasMap: mapUrl,
        areaServed: [
          { '@type': 'City', name: c.city },
          ...(prov ? [{ '@type': 'AdministrativeArea', name: prov }] : [])
        ],
        address: {
          '@type': 'PostalAddress',
          streetAddress: c.address,
          postalCode: c.postcode,
          addressLocality: c.city,
          ...(prov ? { addressRegion: prov } : {}),
          addressCountry: 'NL'
        },
        geo: (c.lat && c.lng) ? { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } : undefined,
        ...(specs.length ? { knowsAbout: specs } : {}),
        // Een 24-uurs spoeddienst overschrijft de gewone openingstijden; anders
        // gelden de bevestigde tijden, als die er zijn.
        ...(isSpoed ? {
          openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            opens: '00:00', closes: '23:59'
          },
          availableService: { '@type': 'MedicalProcedure', name: 'Spoedhulp 24/7' }
        } : (tijdenSchema ? { openingHoursSpecification: tijdenSchema } : {})),
        ...(c.website ? { sameAs: [c.website] } : {}),
        subjectOf: { '@id': url + '#webpage' }
      },
      L.faqLd(faqs)
    ]
  };

  const galerij = P.galerijHtml(fotos, L.esc);
  const profielBlok = (eigenOmschrijving || galerij) ? `  <div class="card">
    <h2>Over ${L.esc(c.name)}</h2>
    ${eigenOmschrijving ? `<p>${L.esc(eigenOmschrijving)}</p>` : ''}
    ${galerij || ''}
  </div>

` : '';

  const tijdenTabel = O.tabelVoor(dagen, L.esc);
  const tijdenBlok = tijdenTabel ? `  <div class="card">
    <h2>Openingstijden</h2>
    ${tijdenTabel}
    ${isSpoed ? '<p style="margin-top:10px;">Deze praktijk biedt daarnaast 24/7 spoedhulp. Bel altijd eerst.</p>' : ''}
  </div>

` : '';

  const block = `${profielBlok}${tijdenBlok}  <div class="card faq">
    <h2>Veelgestelde vragen over ${L.esc(c.name)}</h2>
    ${faqs.map(f => `<details><summary>${L.esc(f.q)}</summary><p>${L.esc(f.a)}</p></details>`).join('\n    ')}
  </div>

  <div class="card">
    <h2>Verder zoeken</h2>
    <div class="tag-row" style="display:flex;flex-wrap:wrap;gap:8px;">
      <a class="spec" href="/${citySlug(c.city)}">Alle dierenartsen in ${L.esc(c.city)}</a>
      ${prov ? `<a class="spec" href="/dierenklinieken-${L.slugify(prov)}">Dierenklinieken in ${L.esc(prov)}</a>` : ''}
      <a class="spec" href="/spoedhulp">⚡ Spoedhulp 24/7</a>
      <a class="spec" href="/kennisbank/">Kennisbank</a>
      <a class="spec" href="/glossarium">Veterinair glossarium</a>
      ${specs.map(s => {
        const map = { 'Spoed 24/7': '/specialisme-spoed', 'Katten': '/specialisme-katten', 'Honden': '/specialisme-honden',
          'Knaagdieren': '/specialisme-knaagdieren', 'Konijnen': '/specialisme-konijnen', 'Exoten': '/specialisme-exoten',
          'Vogels': '/specialisme-vogels', 'Cardiologie': '/specialisme-cardiologie', 'Chirurgie': '/specialisme-chirurgie',
          'Dermatologie': '/specialisme-dermatologie', 'Echografie': '/specialisme-echografie', 'Tandheelkunde': '/specialisme-tandheelkunde' };
        return map[s] ? `<a class="spec" href="${map[s]}">${L.esc(s)}</a>` : '';
      }).filter(Boolean).join('\n      ')}
    </div>
  </div>`;

  let withBlock = injectBeforeMainEnd(html, block);
  if (!withBlock) { missing.push(slug + ' (geen </main>)'); continue; }
  withBlock = fixTitle(withBlock, c.name, c.city);
  fs.writeFileSync(file, injectLd(withBlock, graph));
  clinicCount++;
}

/* ---------------- stadpagina's ---------------- */
const cities = [...new Set(CLINICS.map(c => c.city))];
for (const city of cities) {
  const slug = citySlug(city);
  const file = path.join(ROOT, slug + '.html');
  if (!fs.existsSync(file)) { missing.push(slug); continue; }

  let html = stripOld(fs.readFileSync(file, 'utf8'));
  const list = CLINICS.filter(c => c.city === city);
  const prov = provinceOf(list[0]);
  const spoedIn = list.filter(c => (c.tags || []).includes('spoed'));
  const url = SITE + '/' + slug;
  const allSpecs = [...new Set(list.flatMap(c => c.specs || []))];
  const beoordeeld = list.filter(c => c.rating && c.reviews);
  const gemGeoordeeld = beoordeeld.length
    ? (beoordeeld.reduce((s, c) => s + c.rating * c.reviews, 0) / beoordeeld.reduce((s, c) => s + c.reviews, 0))
    : null;
  const totaalReviews = beoordeeld.reduce((s, c) => s + c.reviews, 0);
  const bevestigdeTijden = list.filter(c => O.bevestigd(TIJDEN[clinicSlug(c)]));
  const buiten = CLINICS
    .filter(c => c.city !== city && c.lat && c.lng && list[0].lat && list[0].lng)
    .map(c => ({ c, d: Math.hypot((c.lat - list[0].lat) * 111, (c.lng - list[0].lng) * 68) }))
    .sort((a, b) => a.d - b.d)[0];

  const faqs = [
    {
      q: `Hoeveel dierenklinieken zijn er in ${city}?`,
      a: `In ${city} ${list.length === 1 ? 'staat 1 dierenkliniek' : `staan ${list.length} dierenklinieken`} vermeld op Dierenkliniek.nl${prov ? `, provincie ${prov}` : ''}.`
    },
    {
      q: `Welke dierenarts in ${city} heeft 24/7 spoedhulp?`,
      a: spoedIn.length
        ? `${spoedIn.length === 1 ? 'Eén kliniek' : `${spoedIn.length} klinieken`} in ${city} ${spoedIn.length === 1 ? 'biedt' : 'bieden'} 24-uurs spoedhulp: ${spoedIn.map(c => `${c.name} (${c.phone})`).join(', ')}. Bel altijd eerst.`
        : buiten
          ? `In ${city} staat geen kliniek met een eigen 24/7 spoeddienst vermeld. De dichtstbijzijnde optie in onze data is ${buiten.c.name} in ${buiten.c.city}, op ongeveer ${buiten.d.toFixed(0)} km. Bel altijd eerst, of bekijk het landelijke spoedoverzicht.`
          : `In ${city} staat geen kliniek met een eigen 24/7 spoeddienst vermeld. Bel uw eigen praktijk voor de dienstregeling of bekijk het landelijke spoedoverzicht voor de dichtstbijzijnde spoedkliniek.`
    },
    allSpecs.length ? {
      q: `Welke specialisaties vind ik bij dierenartsen in ${city}?`,
      a: `Bij de klinieken in ${city} staan onder meer deze aandachtsgebieden vermeld: ${allSpecs.join(', ')}.`
    } : null,
    bevestigdeTijden.length ? {
      q: `Zijn de openingstijden van dierenartsen in ${city} bevestigd?`,
      a: bevestigdeTijden.length === list.length
        ? `Ja, van alle ${list.length === 1 ? 'kliniek' : `${list.length} klinieken`} in ${city} zijn de openingstijden door de praktijk zelf doorgegeven en bevestigd.`
        : `Van ${bevestigdeTijden.length} van de ${list.length} klinieken in ${city} zijn de openingstijden door de praktijk zelf bevestigd (${bevestigdeTijden.map(c => c.name).join(', ')}). Bel bij de overige vooraf om de actuele tijden te checken.`
    } : null,
    gemGeoordeeld ? {
      q: `Hoe goed scoren de dierenartsen in ${city}?`,
      a: `De klinieken in ${city} scoren gemiddeld ${gemGeoordeeld.toFixed(1).replace('.', ',')} van de 5, op basis van in totaal ${totaalReviews} beoordelingen bij ${beoordeeld.length} van de ${list.length} ${list.length === 1 ? 'kliniek' : 'klinieken'}.`
    } : null,
    {
      q: `Hoe kies ik de juiste dierenarts in ${city}?`,
      a: list.length === 1
        ? `${city} heeft op dit moment één vermelde praktijk: ${list[0].name}${list[0].specs && list[0].specs.length ? `, met als aandachtsgebieden ${list[0].specs.join(', ')}` : ''}. Sluit die niet aan bij uw huisdier of wilt u vergelijken, dan vindt u via de link hierboven ook de dichtstbijzijnde klinieken buiten ${city}.`
        : `Kijk naar reisafstand (zeker bij spoed), de vermelde specialisaties en of de praktijk ervaring heeft met uw diersoort. Van de ${list.length} klinieken in ${city} tonen we per praktijk adres, telefoonnummer, website${bevestigdeTijden.length ? ' en bevestigde openingstijden' : ''}.`
    }
  ].filter(Boolean);

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url + '#webpage',
        url,
        name: `Dierenarts in ${city}`,
        inLanguage: 'nl-NL',
        isPartOf: ORG_REF,
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.subtitle'] }
      },
      L.faqLd(faqs)
    ]
  };

  const block = `  <div class="card faq">
    <h2>Veelgestelde vragen over dierenartsen in ${L.esc(city)}</h2>
    ${faqs.map(f => `<details><summary>${L.esc(f.q)}</summary><p>${L.esc(f.a)}</p></details>`).join('\n    ')}
  </div>

  <div class="card">
    <h2>Verder zoeken</h2>
    <div class="tag-row" style="display:flex;flex-wrap:wrap;gap:8px;">
      ${prov ? `<a class="spec" href="/dierenklinieken-${L.slugify(prov)}">Alle klinieken in ${L.esc(prov)}</a>` : ''}
      <a class="spec" href="/provincies">Alle provincies</a>
      <a class="spec" href="/spoedhulp">⚡ Spoedhulp 24/7</a>
      <a class="spec" href="/kennisbank/">Kennisbank</a>
      <a class="spec" href="/kennisbank/wanneer-is-iets-echt-een-spoedgeval">Wanneer is iets écht spoed?</a>
      <a class="spec" href="/glossarium">Veterinair glossarium</a>
    </div>
  </div>`;

  let withBlock = injectBeforeMainEnd(html, block);
  if (!withBlock) { missing.push(slug + ' (geen </main>)'); continue; }
  withBlock = fixCityTitle(withBlock, city, list.length);
  fs.writeFileSync(file, injectLd(withBlock, graph));
  cityCount++;
}

console.log('klinieken verrijkt:', clinicCount, '| steden verrijkt:', cityCount, '| ontbrekend:', missing.length);
if (missing.length) console.log('ontbrekend:', missing.slice(0, 10).join(', '));
