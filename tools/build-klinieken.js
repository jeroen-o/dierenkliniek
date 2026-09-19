// Genereert de kliniekpagina's en de stadpagina's uit CLINICS in index.html.
//
//   node tools/build-klinieken.js
//
// Tot nu toe waren deze pagina's ooit als kant-en-klare bestanden geupload en
// paste alleen enrich-klinieken.js er achteraf blokken in. Een correctie in de
// data kwam daardoor niet op de pagina terecht. Nu is index.html de enige bron:
// elke kliniek krijgt een pagina, elke plaats een overzicht, en de vaste
// onderdelen (header, footer, CSS) komen uit tools/sjabloon/.
//
// Wat hier NIET gebeurt, doen de volgende bouwstappen: enrich-klinieken.js voegt
// het uitgebreide schema, de FAQ, openingstijden en Plus-profielen toe, en
// build-social.js zet de sociale links in de footer. Draai dus altijd
// node tools/build.js, dat de stappen in de juiste volgorde uitvoert.
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const DATA = require('./extract-data');
const O = require('./openingstijden');

const ROOT = L.ROOT;
const SITE = L.SITE;
const { esc, clinicSlug, citySlug, provinceOf, slugify } = L;
const { CLINICS, KB_ARTICLES } = DATA;
const TIJDEN = O.laad();

const BADGE_JS = L.sjabloon('badge-kopieer.js').trimEnd();

/* ---------------- helpers ---------------- */

// Een telefoonnummer zoals de praktijk het schrijft ("0575 - 587 880",
// "+31 6 11599398") wordt in de tel:-link teruggebracht tot cijfers en de plus.
const telHref = (p) => 'tel:' + String(p).replace(/[^\d+]/g, '');
const waHref = (w) => 'https://wa.me/' + String(w).replace(/\D/g, '');

// Afstand over de aardbol in kilometers (haversine), zoals de homepage rekent.
function afstandKm(a, b) {
  const R = 6371, rad = (d) => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const kmTekst = (d) => d.toFixed(1).replace('.', ',') + ' km';

// Google kapt titels rond 60-65 tekens af. Laat het merksuffix weg zodra de
// naam van de kliniek zelf al lang is. (Dezelfde regel als in enrich-klinieken.)
function kliniekTitel(name, city) {
  const suffix = ' | Dierenkliniek.nl';
  const full = `${name} — dierenarts in ${city}`;
  if ((full + suffix).length <= 65) return full + suffix;
  if (full.length <= 70) return full;
  if (`${name} — ${city}`.length <= 70) return `${name} — ${city}`;
  return name.length <= 70 ? name : name.slice(0, 67).trim() + '…';
}

function stadTitel(city, n) {
  const suffix = ' | Dierenkliniek.nl';
  const options = n === 1
    ? [`Dierenarts ${city} — 1 kliniek`, `Dierenarts ${city}`]
    : [`Dierenarts ${city} — ${n} klinieken vergelijken`, `Dierenarts ${city} — ${n} klinieken`, `Dierenarts ${city}`];
  const t = options.find(o => (o + suffix).length <= 65);
  return t ? t + suffix : options[options.length - 1];
}

// De meta description mag van validate.js hoogstens 165 tekens zijn.
function kortGenoeg(volledig, kort) {
  return volledig.length <= 165 ? volledig : kort;
}

// De kop van elke pagina. Dezelfde volgorde van meta-tags als de bestaande
// pagina's, plus hreflang zodat de canonieke taalversie expliciet is.
function head({ title, ogTitle, description, canonical, ogType, geo, jsonld, cssHref }) {
  const url = SITE + canonical;
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(ogTitle || title.replace(/ \| Dierenkliniek\.nl$/, ''))}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:locale" content="nl_NL">
<meta property="og:site_name" content="Dierenkliniek.nl">
<meta name="geo.region" content="NL">
<meta name="geo.placename" content="${esc(geo.place)}">${geo.lat && geo.lng ? `
<meta name="geo.position" content="${geo.lat};${geo.lng}">
<meta name="ICBM" content="${geo.lat}, ${geo.lng}">` : ''}
<link rel="alternate" hreflang="nl" href="${url}">
<link rel="alternate" hreflang="x-default" href="${url}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#00A1E4">
${jsonld.map(o => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`).join('\n')}
<link rel="stylesheet" href="${cssHref}">
</head>
<body>
${L.HEADER}
`;
}

function kaartje(c) {
  return `        <a href="/${clinicSlug(c)}" class="nearby-card">
          <h4>${esc(c.name)}</h4>
          <p>${esc(c.address)}, ${esc(c.postcode)} ${esc(c.city)}</p>
        </a>`;
}

/* ---------------- kliniekpagina ---------------- */

// Plaatsen met dezelfde provincie horen bij elkaar; de provincie van een plaats
// is die van de meerderheid van haar klinieken, zodat één afwijkende postcode
// een plaats niet in de verkeerde provincie zet.
const perStad = {};
for (const c of CLINICS) (perStad[c.city] = perStad[c.city] || []).push(c);

function provincieVanStad(city) {
  const telling = {};
  for (const c of perStad[city] || []) { const p = provinceOf(c); if (p) telling[p] = (telling[p] || 0) + 1; }
  const top = Object.entries(telling).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

function kliniekPagina(c) {
  const slug = clinicSlug(c);
  const url = SITE + '/' + slug;
  const specs = c.specs || [];
  const anderen = perStad[c.city].filter(o => o !== c);
  const buurt = CLINICS
    .filter(o => o.city !== c.city && o.lat && o.lng && c.lat && c.lng)
    .map(o => ({ o, d: afstandKm(c, o) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);

  const contactZin = [c.phone ? `Bel ${c.phone}` : '', c.website ? 'bezoek de website' : '']
    .filter(Boolean).join(' of ');
  const description = kortGenoeg(
    `${c.name} in ${c.city}. ${c.address}, ${c.postcode} ${c.city}.${contactZin ? ' ' + contactZin.charAt(0).toUpperCase() + contactZin.slice(1) + '.' : ''}`,
    `${c.name}, dierenarts in ${c.city}.${contactZin ? ' ' + contactZin.charAt(0).toUpperCase() + contactZin.slice(1) + '.' : ''}`
  );

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'VeterinaryCare',
    name: c.name,
    url,
    description: L.beschrijvingVoor(c),
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.address,
      postalCode: c.postcode,
      addressLocality: c.city,
      addressCountry: 'NL'
    },
    geo: (c.lat && c.lng) ? { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } : undefined,
    telephone: c.phone || undefined,
    email: c.email || undefined,
    sameAs: c.website ? [c.website] : undefined
  };
  const kruimels = [
    { name: 'Home', url: '/' },
    { name: `Dierenarts ${c.city}`, url: '/' + citySlug(c.city) },
    { name: c.name, url: '/' + slug }
  ];
  const breadcrumb = { '@context': 'https://schema.org', ...L.breadcrumbLd(kruimels) };

  const badgeCode = `<a href="${url}" target="_blank" title="Partner van Dierenkliniek.nl" rel="noopener"><img src="${SITE}/badges/${slug}-partner.png" alt="Partner van Dierenkliniek.nl — ${c.name}" width="200" height="200"></a>`;

  const knoppen = [
    (c.lat && c.lng) ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}" class="btn" target="_blank" rel="noopener">📍 Route via Google Maps</a>` : '',
    c.phone ? `<a href="${telHref(c.phone)}" class="btn btn-outline">📞 Bel ${esc(c.phone)}</a>` : '',
    c.whatsapp ? `<a href="${waHref(c.whatsapp)}" class="btn btn-whatsapp" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''
  ].filter(Boolean);

  const contact = [
    `<li><strong>Adres:</strong> ${esc(c.address)}, ${esc(c.postcode)} ${esc(c.city)}</li>`,
    c.phone ? `<li><strong>Telefoon:</strong> <a href="${telHref(c.phone)}">${esc(c.phone)}</a></li>` : '',
    c.email ? `<li><strong>E-mail:</strong> <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>` : '',
    c.website ? `<li><strong>Website:</strong> <a href="${esc(c.website)}" target="_blank" rel="noopener">${esc(c.website)}</a></li>` : ''
  ].filter(Boolean);

  const anderenBlok = anderen.length ? `  <div class="card">
    <h2>Andere klinieken in ${esc(c.city)}</h2>
    <p style="margin-bottom: 16px;">${anderen.length === 1
      ? `Er is nog <strong>1</strong> andere dierenkliniek in ${esc(c.city)}:`
      : `Er zijn nog <strong>${anderen.length}</strong> andere dierenklinieken in ${esc(c.city)}:`}</p>
    <div class="nearby-grid">
${anderen.map(kaartje).join('\n')}
    </div>
    <p style="margin-top: 20px;"><a href="/${citySlug(c.city)}" class="btn btn-outline">Alle klinieken in ${esc(c.city)} →</a></p>
  </div>

` : '';

  const buurtBlok = buurt.length ? `  <div class="card">
    <h2>Dichtstbijzijnde klinieken in de omgeving</h2>
    <p style="margin-bottom: 16px;">Vlakbij ${esc(c.city)} vindt u ook deze klinieken:</p>
    <div class="nearby-grid">
${buurt.map(({ o, d }) => `        <a href="/${clinicSlug(o)}" class="nearby-card">
          <h4>${esc(o.name)}</h4>
          <p>${esc(o.city)} · ${kmTekst(d)}</p>
        </a>`).join('\n')}
    </div>
    <p style="margin-top: 20px;"><a href="/" class="btn btn-outline">Zoek op uw postcode →</a></p>
  </div>

` : '';

  const body = `<main>
  <nav class="breadcrumb">
    <a href="/">Home</a> ›
    <a href="/${citySlug(c.city)}">Dierenarts ${esc(c.city)}</a> ›
    <span>${esc(c.name)}</span>
  </nav>
  <h1>${esc(c.name)}</h1>
  <p class="subtitle">Dierenarts in ${esc(c.city)}</p>
  <div class="card">
    <p>${esc(L.beschrijvingVoor(c))}</p>
    ${specs.length ? `<div class="specs">${specs.map(s => `<span class="spec">${esc(s)}</span>`).join('')}</div>` : ''}
    <div style="margin-top: 24px;">
      ${knoppen.join('\n      ')}
    </div>
  </div>
  <div class="card">
    <h2>Contactgegevens</h2>
    <ul>
        ${contact.join('\n        ')}
    </ul>
  </div>

${anderenBlok}${buurtBlok}  <div class="card badge-card">
    <div class="badge-header">
      <span class="badge-emoji">🏅</span>
      <div>
        <h2 style="margin: 0;">Gratis: badge voor uw website</h2>
        <p style="margin: 4px 0 0; color: #6b7280;">Toon aan uw bezoekers dat u vermeld staat op Dierenkliniek.nl. Bewezen manier om vertrouwen te bouwen én meer bezoekers te trekken.</p>
      </div>
    </div>
    <div class="badge-body">
      <div class="badge-preview">
        <img src="/badges/${slug}-partner.svg" alt="Uw persoonlijke partner-badge" width="200" height="200">
        <p class="badge-caption">Uw persoonlijke badge met uw klinieknaam erop</p>
      </div>
      <div class="badge-actions">
        <h3 style="font-size: 15px; margin: 0 0 8px;">📥 Download alles in één ZIP</h3>
        <p style="font-size: 13px; color: #6b7280; margin: 0 0 12px;">Bevat 4 badge-varianten (SVG + PNG) en een handleiding met uw kliniek-URL al ingevuld.</p>
        <a href="/badges/${slug}.zip" download class="btn btn-green btn-block">⬇ Download ZIP (${esc(c.name)})</a>

        <div class="badge-divider">of</div>

        <h3 style="font-size: 15px; margin: 0 0 8px;">📋 Kopieer HTML-code direct</h3>
        <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px;">Plak deze code in uw website (footer, contactpagina, sidebar):</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copyBadgeCode(this)">Kopieer</button>
          <pre id="badge-html-code">${esc(badgeCode)}</pre>
        </div>

      </div>
    </div>
    <div class="badge-help">
      <details>
        <summary>💬 Hulp nodig bij plaatsen?</summary>
        <div style="padding: 16px 0;">
          <p><strong>Voor WordPress:</strong> ga naar de pagina waar u de badge wilt tonen (bijvoorbeeld "Contact" of "Over ons"), klik op + om een blok toe te voegen, kies "Custom HTML", en plak de gekopieerde code.</p>
          <p><strong>Voor Wix / Squarespace / Jimdo:</strong> voeg een "Embed HTML"-widget toe waar u de badge wilt plaatsen en plak de code.</p>
          <p><strong>Uw webbouwer regelt uw site?</strong> Download de ZIP en stuur die naar hem/haar met de vraag: "Graag deze badge plaatsen in de footer/sidebar van onze website — de handleiding zit in de ZIP".</p>
          <p><strong>Volledige instructies</strong> staan ook op <a href="/badge">de algemene badge-pagina</a>.</p>
        </div>
      </details>
    </div>
  </div>

  <div class="card">
    <h2>Meer informatie</h2>
    <p>Deze vermelding maakt deel uit van <a href="/">Dierenkliniek.nl</a> — het onafhankelijke overzicht van alle ${CLINICS.length} dierenklinieken in Nederland.</p>
    <p style="margin-top: 12px;">Bent u de eigenaar van deze kliniek? <a href="/?view=aanmelden">Vul het aanmeldformulier in</a> om uw vermelding aan te vullen.</p>
  </div>

</main>
${L.FOOTER}
<script>
${BADGE_JS}
</script>
</body>
</html>
`;

  return head({
    title: kliniekTitel(c.name, c.city),
    ogTitle: `${c.name} — dierenarts in ${c.city}`,
    description,
    canonical: '/' + slug,
    ogType: 'business.business',
    geo: { place: c.city, lat: c.lat, lng: c.lng },
    jsonld: [ld, breadcrumb],
    cssHref: '/css/kliniek.css'
  }) + body;
}

/* ---------------- stadpagina ---------------- */

const SPOED_BADGE = '<span style="background:#FEE2E2;color:#B91C1C;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;margin-left:8px;">⚡ 24/7 spoed</span>';
const VERIFIED_BADGE = '<span style="background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;margin-left:8px;">✓ Geverifieerd</span>';

const isSpoed = (c) => (c.tags || []).includes('spoed');
const isVerified = (c) => (c.tags || []).includes('verified');

function stadPagina(city) {
  const slug = citySlug(city);
  const url = SITE + '/' + slug;
  // Alfabetisch op naam, ongeacht hoofdletters, zodat "dierenkliniek X" niet
  // onderaan bungelt. Betaalde pakketten krijgen hier geen voorrang: de
  // volgorde binnen een plaats is neutraal.
  const list = [...perStad[city]].sort((a, b) => a.name.localeCompare(b.name, 'nl', { sensitivity: 'base' }));
  const n = list.length;
  const prov = provincieVanStad(city);
  const spoed = list.filter(isSpoed).length;
  const verified = list.filter(isVerified).length;
  const eerste = perStad[city][0];

  const description = n === 1
    ? kortGenoeg(`1 dierenkliniek gevonden in ${city}: ${list[0].name}. Adres, telefoon en route via Dierenkliniek.nl.`,
                 `1 dierenkliniek gevonden in ${city}. Adres, telefoon en route via Dierenkliniek.nl.`)
    : `${n} dierenklinieken in ${city} vergelijken. Vind een dierenarts met openingstijden, adres, telefoon en route via Dierenkliniek.nl.`;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Dierenklinieken in ${city}`,
    description,
    url,
    about: {
      '@type': 'Place',
      name: city,
      address: { '@type': 'PostalAddress', addressLocality: city, ...(prov ? { addressRegion: prov } : {}), addressCountry: 'NL' }
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: n,
      itemListElement: list.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'VeterinaryCare',
          name: c.name,
          url: SITE + '/' + clinicSlug(c),
          address: { '@type': 'PostalAddress', streetAddress: c.address, postalCode: c.postcode, addressLocality: c.city, addressCountry: 'NL' },
          telephone: c.phone || undefined
        }
      }))
    }
  };
  const kruimels = [
    { name: 'Home', url: '/' },
    ...(prov ? [{ name: prov, url: '/dierenklinieken-' + slugify(prov) }] : []),
    { name: `Dierenarts ${city}`, url: '/' + slug }
  ];
  const breadcrumb = { '@context': 'https://schema.org', ...L.breadcrumbLd(kruimels) };

  // Feitelijke, per-plaats verschillende cijfers — geen vaste sjabloonzin.
  const beoordeeld = list.filter(c => c.rating && c.reviews);
  const gemGeoordeeld = beoordeeld.length
    ? (beoordeeld.reduce((s, c) => s + c.rating * c.reviews, 0) / beoordeeld.reduce((s, c) => s + c.reviews, 0))
    : null;
  const totaalReviews = beoordeeld.reduce((s, c) => s + c.reviews, 0);
  const bevestigdeTijden = list.filter(c => O.bevestigd(TIJDEN[clinicSlug(c)])).length;

  const overzichtPunten = [
    spoed ? `<li><strong>${spoed}</strong> ${spoed === 1 ? 'kliniek biedt' : 'klinieken bieden'} 24/7 spoedhulp</li>` : '',
    verified ? `<li><strong>${verified}</strong> ${verified === 1 ? 'kliniek is' : 'klinieken zijn'} geverifieerd</li>` : '',
    gemGeoordeeld ? `<li>Gemiddelde beoordeling <strong>${gemGeoordeeld.toFixed(1).replace('.', ',')}/5</strong> (op basis van ${totaalReviews} ${totaalReviews === 1 ? 'beoordeling' : 'beoordelingen'})</li>` : '',
    bevestigdeTijden ? `<li><strong>${bevestigdeTijden}</strong> van de ${n} ${n === 1 ? 'kliniek heeft' : 'klinieken hebben'} openingstijden die door de praktijk zelf zijn bevestigd</li>` : ''
  ].filter(Boolean);

  const kaarten = list.map(c => {
    const uren = O.kortSamenvatting(TIJDEN[clinicSlug(c)]);
    return `    <div class="clinic-card">
      <h3><a href="/${clinicSlug(c)}">${esc(c.name)}</a>${isSpoed(c) ? SPOED_BADGE : isVerified(c) ? VERIFIED_BADGE : ''}</h3>
      <p class="addr">${esc(c.address)}, ${esc(c.postcode)} ${esc(c.city)}</p>
      ${(c.specs || []).length ? `<p class="specs">${esc((c.specs || []).join(', '))}</p>` : ''}
      ${uren ? `<p class="hours-line" style="font-size:13px;color:#4a5568;margin-top:4px;">🕒 ${esc(uren)}</p>` : ''}
      ${c.rating && c.reviews ? `<p style="font-size:13px;color:#4a5568;margin-top:2px;">⭐ ${esc(String(c.rating).replace('.', ','))}/5 (${c.reviews} beoordelingen)</p>` : ''}
      <div class="actions">
        ${c.phone ? `<a href="${telHref(c.phone)}" class="btn btn-outline">📞 ${esc(c.phone)}</a>` : ''}
        <a href="/${clinicSlug(c)}" class="btn btn-primary">Meer info →</a>
      </div>
    </div>`;
  }).join('\n');

  // Dichtstbijzijnde klinieken buiten deze plaats — vooral waardevol bij weinig
  // eigen klinieken, en per plaats geografisch uniek (andere steden, andere
  // afstanden), dus geen sjabloonherhaling.
  const buurt = eerste.lat && eerste.lng ? CLINICS
    .filter(o => o.city !== city && o.lat && o.lng)
    .map(o => ({ o, d: afstandKm(eerste, o) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6) : [];
  const buurtBlok = buurt.length ? `
    <div class="card">
      <h2>Dichtstbijzijnde klinieken buiten ${esc(city)}</h2>
      <p style="margin-bottom: 16px;">${n === 1 ? 'Nog geen ruime keuze binnen de plaats zelf? ' : ''}Ook in de omgeving van ${esc(city)} vindt u deze klinieken:</p>
      <div class="nearby-grid">
${buurt.map(({ o, d }) => `        <a href="/${clinicSlug(o)}" class="nearby-card">
          <h4>${esc(o.name)}</h4>
          <p>${esc(o.city)} · ${kmTekst(d)}</p>
        </a>`).join('\n')}
      </div>
    </div>
` : '';

  // Twaalf andere plaatsen in dezelfde provincie, op alfabet.
  const anderePlaatsen = prov
    ? Object.keys(perStad).filter(s => s !== city && provincieVanStad(s) === prov).sort().slice(0, 12)
    : [];
  const anderePlaatsenBlok = anderePlaatsen.length ? `
    <div class="card">
      <h2>Andere plaatsen in ${esc(prov)}</h2>
      <p style="font-size:15px; line-height:1.9;">${anderePlaatsen.map(s => `<a href="/${citySlug(s)}">${esc(s)}</a>`).join(' · ')}</p>
    </div>
` : '';

  const body = `<main>
  <nav class="breadcrumb">
    <a href="/">Home</a> ›
    <a href="/provincies">Provincies</a> ›${prov ? `
    <a href="/dierenklinieken-${slugify(prov)}">${esc(prov)}</a> ›` : ''}
    <span>${esc(city)}</span>
  </nav>

  <h1>Dierenarts in ${esc(city)}</h1>
  <p class="subtitle">${n === 1 ? '1 kliniek' : `${n} klinieken`} in ${esc(city)} — vergelijk en kies met vertrouwen</p>

  <div class="card">
    <h2>Overzicht</h2>
    <p>${n === 1
      ? `In ${esc(city)} is één dierenkliniek gevestigd. Hieronder vindt u alle contactgegevens en de route.`
      : `In ${esc(city)} zijn ${n} dierenklinieken actief. U kunt ze hieronder vergelijken op adres, contactgegevens en specialisaties.`}</p>
    ${overzichtPunten.length ? `<ul style="margin-top:12px;">${overzichtPunten.join('')}</ul>` : ''}
    <p style="margin-top:16px;"><a href="/spoedhulp">📢 Spoedhulp nodig?</a> · <a href="/">🔍 Zoek op postcode</a> · <a href="/kennisbank">📖 Kennisbank</a></p>
  </div>

  <h2 style="font-size:24px; margin: 24px 0 16px;">${n === 1 ? `De kliniek in ${esc(city)}` : `Alle klinieken in ${esc(city)}`}</h2>

${kaarten}
${buurtBlok}${anderePlaatsenBlok}
  <div class="card">
    <h2>Vragen over uw huisdier?</h2>
    <p>Onze kennisbank bevat ${KB_ARTICLES.length} artikelen over gezondheid, verzorging en spoedhulp voor honden, katten en andere huisdieren.</p>
    <p style="margin-top: 16px;">
      <a href="/kennisbank" class="btn btn-primary">Bezoek de kennisbank →</a>
    </p>
  </div>

</main>
${L.FOOTER}
</body>
</html>
`;

  return head({
    title: stadTitel(city, n),
    ogTitle: `Dierenarts ${city} — ${n === 1 ? '1 kliniek' : `${n} klinieken`}`,
    description,
    canonical: '/' + slug,
    ogType: 'website',
    geo: { place: city, lat: eerste.lat, lng: eerste.lng },
    jsonld: [ld, breadcrumb],
    cssHref: '/css/stad.css'
  }) + body;
}

/* ---------------- schrijven ---------------- */

const geschreven = new Set();
let zonderBadge = [];

for (const c of CLINICS) {
  const slug = clinicSlug(c);
  fs.writeFileSync(path.join(ROOT, slug + '.html'), kliniekPagina(c));
  geschreven.add(slug + '.html');
  if (!fs.existsSync(path.join(ROOT, 'badges', slug + '-partner.svg'))) zonderBadge.push(slug);
}
for (const city of Object.keys(perStad)) {
  const slug = citySlug(city);
  fs.writeFileSync(path.join(ROOT, slug + '.html'), stadPagina(city));
  geschreven.add(slug + '.html');
}

// Pagina's van klinieken of plaatsen die niet meer in de data staan, blijven
// staan tot iemand ze bewust weghaalt: een verwijderde praktijk verdient een
// nette doorverwijzing, geen stille 404.
const verweesd = fs.readdirSync(ROOT)
  .filter(f => /^(dierenarts-.*|.*-dierenarts-in-.*)\.html$/.test(f) && !geschreven.has(f));

console.log(`kliniekpagina's: ${CLINICS.length} | stadpagina's: ${Object.keys(perStad).length}`);
if (zonderBadge.length) console.log(`let op: ${zonderBadge.length} klinieken zonder badge-bestanden in badges/: ${zonderBadge.slice(0, 5).join(', ')}${zonderBadge.length > 5 ? ' …' : ''}`);
if (verweesd.length) console.log(`verweesd (niet meer in de data): ${verweesd.slice(0, 8).join(', ')}${verweesd.length > 8 ? ' …' : ''}`);
