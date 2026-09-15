// Profielgegevens die klinieken zelf aanleveren: foto's en een eigen omschrijving.
//
// Deze horen bij het Plus- en Premium-pakket. Ze staan in data/profielen.json met
// de kliniek-slug als sleutel:
//
//   {
//     "dierenkliniek-vondelpark-dierenarts-in-amsterdam": {
//       "omschrijving": "Wij zijn een kleine praktijk in Oud-Zuid met ...",
//       "fotos": [
//         { "bestand": "fotos/dierenkliniek-vondelpark-gevel.jpg",
//           "alt": "De gevel van Dierenkliniek Vondelpark aan de Sophialaan" }
//       ],
//       "bron": "aangeleverd door de praktijk, 2026-10-03"
//     }
//   }
//
// De inhoud komt van de praktijk zelf. Wij verzinnen hier niets: een kliniek
// zonder eigen omschrijving houdt de standaardtekst uit de dataset.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BESTAND = path.join(ROOT, 'data', 'profielen.json');

// Alleen deze pakketten hebben recht op een eigen profiel. Staat er toch iets
// voor een Basis-kliniek, dan wordt het niet getoond: dat voorkomt dat een oud
// abonnement stilzwijgend blijft doorlopen.
const PAKKETTEN_MET_PROFIEL = new Set(['plus', 'top']);

function laad() {
  if (!fs.existsSync(BESTAND)) return {};
  try {
    return JSON.parse(fs.readFileSync(BESTAND, 'utf8'));
  } catch (e) {
    throw new Error('data/profielen.json is geen geldige JSON: ' + e.message);
  }
}

function magProfiel(kliniek) {
  return PAKKETTEN_MET_PROFIEL.has(kliniek.tier);
}

function omschrijvingVoor(kliniek, profiel) {
  if (!magProfiel(kliniek) || !profiel || !profiel.omschrijving) return null;
  const tekst = String(profiel.omschrijving).trim();
  return tekst.length ? tekst : null;
}

function fotosVoor(kliniek, profiel) {
  if (!magProfiel(kliniek) || !profiel || !Array.isArray(profiel.fotos)) return [];
  return profiel.fotos
    .filter(f => f && f.bestand && fs.existsSync(path.join(ROOT, f.bestand)))
    .map(f => ({
      bestand: '/' + String(f.bestand).replace(/^\/+/, ''),
      // Een alt-tekst is verplicht: zonder beschrijving is een foto onbruikbaar
      // voor schermlezers en levert hij niets op in Google Afbeeldingen.
      alt: (f.alt && String(f.alt).trim()) || `${kliniek.name} in ${kliniek.city}`
    }));
}

// Zichtbaar fotoblok voor op de kliniekpagina.
function galerijHtml(fotos, esc) {
  if (!fotos.length) return null;
  return `<div class="kliniek-fotos">
      ${fotos.map(f =>
        `<img src="${esc(f.bestand)}" alt="${esc(f.alt)}" loading="lazy" decoding="async" width="640" height="427">`
      ).join('\n      ')}
    </div>`;
}

// Controle vooraf: meldt profielen die niet getoond kunnen worden.
function controleer(profielen, klinieken, clinicSlug) {
  const perSlug = Object.fromEntries(klinieken.map(c => [clinicSlug(c), c]));
  const meldingen = [];
  for (const [slug, p] of Object.entries(profielen)) {
    const c = perSlug[slug];
    if (!c) { meldingen.push(`${slug}: onbekende kliniek`); continue; }
    if (!magProfiel(c)) meldingen.push(`${slug}: pakket "${c.tier}" heeft geen recht op een eigen profiel`);
    for (const f of (p.fotos || [])) {
      if (!f.bestand) { meldingen.push(`${slug}: foto zonder bestandsnaam`); continue; }
      if (!fs.existsSync(path.join(ROOT, f.bestand))) meldingen.push(`${slug}: foto ontbreekt op schijf (${f.bestand})`);
      if (!f.alt) meldingen.push(`${slug}: foto zonder alt-tekst (${f.bestand})`);
    }
  }
  return meldingen;
}

module.exports = { laad, magProfiel, omschrijvingVoor, fotosVoor, galerijHtml, controleer, BESTAND, PAKKETTEN_MET_PROFIEL };
