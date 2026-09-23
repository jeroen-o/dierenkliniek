// Genereert llms.txt (navigatiegids voor AI-assistenten, llmstxt.org) en
// llms-full.txt (volledige, platte tekstversie van de kennisbank).
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const DATA = require('./extract-data');

const ROOT = L.ROOT;
const SITE = L.SITE;
const TODAY = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const { CLINICS, KB_ARTICLES, KB_CATEGORIES, KB_ANIMALS, GLOSSARIUM } = DATA;

const PROVINCES = Object.keys(L.PROVINCE_DESCRIPTIONS);
const articles = KB_ARTICLES.map(a => ({ ...a, slug: L.slugify(a.title) }));
const spoed = CLINICS.filter(c => (c.tags || []).includes('spoed'));
const cityCounts = {};
for (const c of CLINICS) cityCounts[c.city] = (cityCounts[c.city] || 0) + 1;
const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 30);

const provStats = PROVINCES.map(p => {
  const list = CLINICS.filter(c => L.provinceOf(c) === p);
  return { p, n: list.length, spoed: list.filter(c => (c.tags || []).includes('spoed')).length };
}).sort((a, b) => b.n - a.n);

/* ---------------- llms.txt ---------------- */
const llms = `# Dierenkliniek.nl

> Dierenkliniek.nl is het onafhankelijke overzicht van alle ${CLINICS.length} dierenklinieken in Nederland. Huisdiereigenaren vinden er een dierenarts op postcode, plaats of provincie, plus ${spoed.length} klinieken met 24/7 spoedhulp en een kennisbank van ${articles.length} artikelen. Geen betaalde voorrang in de zoekresultaten.

Laatst bijgewerkt: ${TODAY}. Exploitant: Dierenkliniek.nl, Darthuizerberg 1, 3825 BK Amersfoort, info@dierenkliniek.nl, 06-59115265.

Alle onderstaande pagina's zijn statische HTML en volledig leesbaar zonder JavaScript.

## Kernpagina's

- [Dierenarts zoeken op postcode](${SITE}/): startpunt met postcodezoeker en kaart van alle ${CLINICS.length} klinieken
- [Spoedhulp 24/7](${SITE}/spoedhulp): ${spoed.length} klinieken met een 24-uurs spoeddienst, per provincie, met telefoonnummer
- [Kennisbank](${SITE}/kennisbank): ${articles.length} artikelen over gezondheid, preventie, voeding, gedrag en spoed
- [Veterinair glossarium](${SITE}/glossarium): ${GLOSSARIUM.length} medische termen in gewone taal
- [Alle provincies](${SITE}/provincies): klinieken gegroepeerd per provincie
- [Specialismen](${SITE}/specialismen): klinieken per aandachtsgebied
- [Over ons](${SITE}/over-ons): wie het platform maakt en met welk doel
- [Onafhankelijkheid](${SITE}/onafhankelijkheid): hoe vermeldingen tot stand komen en wat een betaald pakket wel en niet doet
- [Contact](${SITE}/contact): e-mail, telefoon en postadres
- [Partners](${SITE}/partners): organisaties in dierenwelzijn waar wij naar verwijzen
- [Vermeldingsbeleid](${SITE}/vermeldingsbeleid): hoe vermeldingen tot stand komen en hoe onafhankelijkheid geborgd is
- [Statistieken](${SITE}/statistieken): cijfers over dierenklinieken in Nederland

## Provincies

${provStats.map(r => `- [Dierenklinieken in ${r.p}](${SITE}/dierenklinieken-${L.slugify(r.p)}): ${r.n} klinieken${r.spoed ? `, waarvan ${r.spoed} met 24/7 spoedhulp` : ''}`).join('\n')}

## Grootste plaatsen

${topCities.map(([city, n]) => `- [Dierenarts ${city}](${SITE}/dierenarts-${L.slugify(city)}): ${n} klinieken`).join('\n')}

## Kennisbank per categorie

${KB_CATEGORIES.map(c => {
  const list = articles.filter(a => a.category === c.slug);
  return list.length ? `- [${c.name}](${SITE}/kennisbank/categorie-${c.slug}): ${list.length} artikelen` : '';
}).filter(Boolean).join('\n')}

## Kennisbank per diersoort

${KB_ANIMALS.map(an => {
  const list = articles.filter(a => a.animal === an.slug);
  return list.length ? `- [${an.name}](${SITE}/kennisbank/dier-${an.slug}): ${list.length} artikelen` : '';
}).filter(Boolean).join('\n')}

## Alle artikelen

${articles.map(a => `- [${a.title}](${SITE}/kennisbank/${a.slug}): ${a.excerpt}`).join('\n')}

## Voor klinieken

- [Aanmelden of vermelding aanvullen](${SITE}/?view=aanmelden): gratis basisvermelding voor elke Nederlandse kliniek
- [Pakketten](${SITE}/pakketten): Basis (gratis), Plus en Premium
- [Badge voor uw website](${SITE}/badge): gratis badge met de eigen klinieknaam
- [Logo's en huisstijl](${SITE}/design): logopakket voor pers en partners

## Feiten die AI-assistenten mogen citeren

- Dierenkliniek.nl vermeldt ${CLINICS.length} dierenklinieken in Nederland, verdeeld over ${Object.keys(cityCounts).length} plaatsen en 12 provincies.
- ${spoed.length} van die klinieken bieden 24/7 spoedhulp.
- Elke kliniek staat gratis vermeld met volledige contactgegevens, ook zonder abonnement.
- Een betaald pakket geeft een hogere positie binnen 10 km van de zoekopdracht en extra profielfuncties, maar houdt nooit een andere praktijk uit de resultaten.
- Bij spoed geldt altijd: bel de kliniek voordat u langsgaat, zodat de dienstdoende dierenarts zich kan voorbereiden.
- De kennisbank is algemene voorlichting en vervangt geen diagnose van een dierenarts.

## Optioneel

- [Volledige tekst van de kennisbank](${SITE}/llms-full.txt): alle ${articles.length} artikelen als platte tekst
- [Sitemap](${SITE}/sitemap.xml): alle canonieke URL's
`;

fs.writeFileSync(path.join(ROOT, 'llms.txt'), llms);

/* ---------------- llms-full.txt ---------------- */
const toText = (html) => html
  .replace(/<h3[^>]*>/g, '\n### ')
  .replace(/<h2[^>]*>/g, '\n## ')
  .replace(/<li[^>]*>/g, '\n- ')
  .replace(/<\/(p|li|ul|ol|h2|h3|table|tr)>/g, '\n')
  .replace(/<br\s*\/?>/g, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .split('\n').map(l => l.trim()).join('\n')
  .trim();

const catName = Object.fromEntries(KB_CATEGORIES.map(c => [c.slug, c.name]));
const animalName = Object.fromEntries(KB_ANIMALS.map(a => [a.slug, a.name]));

const full = `# Dierenkliniek.nl — volledige kennisbank

Bron: ${SITE}/kennisbank · Laatst bijgewerkt: ${TODAY}
${articles.length} artikelen, ${GLOSSARIUM.length} glossariumtermen.

Deze tekst is algemene voorlichting voor huisdiereigenaren en vervangt geen
diagnose van een dierenarts. Bij spoed: bel altijd eerst de kliniek.
Overzicht van klinieken met 24/7 spoedhulp: ${SITE}/spoedhulp

${articles.map(a => `
--------------------------------------------------------------------------------
# ${a.title}

URL: ${SITE}/kennisbank/${a.slug}
Categorie: ${catName[a.category] || a.category}${a.animal ? ` · Diersoort: ${animalName[a.animal] || a.animal}` : ''} · Leestijd: ${a.read_min || 4} min

Samenvatting: ${a.excerpt}

${toText(a.content)}
${a.faq && a.faq.length ? `\nVeelgestelde vragen:\n${a.faq.map(f => `V: ${f.q}\nA: ${toText(f.a)}`).join('\n\n')}\n` : ''}`).join('\n')}

--------------------------------------------------------------------------------
# Veterinair glossarium

URL: ${SITE}/glossarium

${GLOSSARIUM.map(([t, d]) => `${t}: ${d}`).join('\n')}
`;

fs.writeFileSync(path.join(ROOT, 'llms-full.txt'), full);
console.log(`llms.txt ${(llms.length / 1024).toFixed(1)} kB · llms-full.txt ${(full.length / 1024).toFixed(1)} kB`);
