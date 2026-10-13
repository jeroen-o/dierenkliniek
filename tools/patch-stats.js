// Houdt een paar veelgebruikte statistieken in index.html (aantal klinieken,
// plaatsen, kennisbank-artikelen) gelijk aan de echte data.
//
// Zonder dit bleven deze cijfers hangen op het moment van schrijven, terwijl
// de dataset ondertussen doorgroeide: "1.127 klinieken" en "255+ artikelen"
// stonden nog op tientallen plekken (meta-tags, JSON-LD, hero-tekst,
// homepage-stats, about- en English-pagina) terwijl de site al 1.317
// klinieken en 507 artikelen telde. Dit draait elke build en overschrijft
// het huidige getal door het actuele, ongeacht wat er nu staat.
//
// Elke vervanging is anchored aan de vaste omringende tekst (niet een kaal
// "match elk getal"), en telt het aantal vervangingen: wijkt dat af van wat
// hieronder verwacht wordt, dan waarschuwt het script in de buildoutput in
// plaats van stil te falen — bijvoorbeeld wanneer de omringende tekst ooit
// verandert.
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const DATA = require('./extract-data');

const ROOT = L.ROOT;
const INDEX_PAD = path.join(ROOT, 'index.html');

const { CLINICS, KB_ARTICLES } = DATA;
const aantalKlinieken = CLINICS.length;
const aantalPlaatsen = new Set(CLINICS.map(c => c.city)).size;
const aantalArtikelen = KB_ARTICLES.length;

const nl = (n) => n.toLocaleString('nl-NL');
const en = (n) => n.toLocaleString('en-US');

let html = fs.readFileSync(INDEX_PAD, 'utf8');
let gewaarschuwd = 0;

function vervang(zoek, vervanger, verwacht) {
  let n = 0;
  html = html.replace(zoek, (...args) => { n++; return vervanger(...args); });
  if (n !== verwacht) {
    console.warn(`  let op: patch-stats.js verwachtte ${verwacht}x "${zoek}", vond ${n}x`);
    gewaarschuwd++;
  }
}

const KLINIEKEN_NL = nl(aantalKlinieken);
const KLINIEKEN_EN = en(aantalKlinieken);
const PLAATSEN_NL = nl(aantalPlaatsen);
const ARTIKELEN_NL = nl(aantalArtikelen);

// Nederlandstalige vermeldingen van het aantal klinieken — elk anchored aan
// de vaste tekst erna, zodat alleen deze specifieke zinnen worden geraakt.
vervang(/\d[\d.]*(?= dierenklinieken in Nederland)/g, () => KLINIEKEN_NL, 7);
vervang(/\d[\d.]*(?= klinieken in heel Nederland)/g, () => KLINIEKEN_NL, 1);
vervang(/\d[\d.]*(?= dierenklinieken op ons platform)/g, () => KLINIEKEN_NL, 1);
vervang(/\d[\d.]*(?= klinieken in \d[\d.]* plaatsen)/, () => KLINIEKEN_NL, 1);
vervang(/(?<=klinieken in )\d[\d.]*(?= plaatsen)/, () => PLAATSEN_NL, 1);
vervang(/\d[\d.]*(?= Nederlandse dierenklinieken eerlijk naast elkaar)/, () => KLINIEKEN_NL, 1);
vervang(/\d[\d.]*(?= dierenklinieken in heel Nederland — verspreid)/, () => KLINIEKEN_NL, 1);
vervang(/\d[\d.]*(?= Nederlandse klinieken op één plek)/, () => KLINIEKEN_NL, 1);
vervang(/<span class="num"><span>\d[\d.]*<\/span><\/span>\s*\n\s*<span class="lbl">Klinieken in Nederland<\/span>/,
  () => `<span class="num"><span>${KLINIEKEN_NL}</span></span>\n            <span class="lbl">Klinieken in Nederland</span>`, 1);

// Engelstalige vermelding (komma-notatie).
vervang(/\d[\d,]*(?= Dutch veterinary clinics)/, () => KLINIEKEN_EN, 1);

// Kennisbank-tegeltje op de homepage.
vervang(/\d+\+?(?=<\/span>\s*\n\s*<span class="lbl">Kennisbank-artikelen<\/span>)/, () => `${ARTIKELEN_NL}+`, 1);

fs.writeFileSync(INDEX_PAD, html);

console.log(`patch-stats.js: ${aantalKlinieken} klinieken, ${aantalPlaatsen} plaatsen, ${aantalArtikelen} kennisbank-artikelen${gewaarschuwd ? ` (${gewaarschuwd} waarschuwing(en), zie hierboven)` : ''}`);
