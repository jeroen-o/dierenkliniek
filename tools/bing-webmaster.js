// Praat met de Bing Webmaster API.
//
//   node tools/bing-webmaster.js sitemaps       dient de sitemaps in
//   node tools/bing-webmaster.js urls [u1 u2]   meldt URL's aan (zonder argumenten: alle uit all-urls.json)
//   node tools/bing-webmaster.js quota          toont hoeveel URL's je vandaag nog mag indienen
//
// Vereist de omgevingsvariabele BING_WEBMASTER_API_KEY. Die sleutel maak je in
// Bing Webmaster Tools onder Instellingen, API-toegang.
//
// Let op: deze API is niet bereikbaar vanuit elke omgeving. In GitHub Actions
// werkt hij wel.
const fs = require('fs');
const path = require('path');

const SITE = process.env.BING_SITE_URL || 'https://dierenkliniek.nl';
const KEY = process.env.BING_WEBMASTER_API_KEY;
const API = 'https://ssl.bing.com/webmaster/api.svc/json/';
const SITEMAPS = [
  'https://dierenkliniek.nl/sitemap.xml',
  'https://dierenkliniek.nl/sitemap-hoofdpaginas.xml',
  'https://dierenkliniek.nl/sitemap-artikelen.xml',
  'https://dierenkliniek.nl/sitemap-steden.xml',
  'https://dierenkliniek.nl/sitemap-klinieken.xml'
];

if (!KEY) {
  console.error(
    'BING_WEBMASTER_API_KEY ontbreekt. Maak een sleutel in Bing Webmaster Tools ' +
    '(Instellingen, API-toegang) en zet die in die omgevingsvariabele of in het ' +
    'gelijknamige GitHub-secret.'
  );
  process.exit(1);
}

async function call(methode, payload) {
  const res = await fetch(`${API}${methode}?apikey=${encodeURIComponent(KEY)}`, {
    method: payload ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (e) { body = { raw: text.slice(0, 300) }; }
  if (!res.ok) {
    const reden = (body && body.Message) || (body && body.raw) || res.statusText;
    throw new Error(`HTTP ${res.status} op ${methode}: ${reden}`);
  }
  return body;
}

async function sitemaps() {
  for (const feed of SITEMAPS) {
    try {
      await call('SubmitSitemap', { siteUrl: SITE, feedUrl: feed });
      console.log('ingediend: ' + feed);
    } catch (e) {
      console.log('mislukt:   ' + feed + ' — ' + e.message);
    }
  }
}

async function quota() {
  const body = await call('GetUrlSubmissionQuota?siteUrl=' + encodeURIComponent(SITE));
  const d = body && body.d ? body.d : body;
  console.log(`Dagelijkse ruimte: ${d.DailyQuota} · maandelijks: ${d.MonthlyQuota}`);
}

async function urls(lijst) {
  if (!lijst.length) {
    const bestand = path.join(__dirname, 'all-urls.json');
    if (!fs.existsSync(bestand)) {
      console.error("Geen URL's opgegeven en tools/all-urls.json bestaat niet. Draai eerst node tools/build.js");
      process.exit(1);
    }
    lijst = JSON.parse(fs.readFileSync(bestand, 'utf8'));
  }
  lijst = lijst.map(u => u.startsWith('http') ? u : SITE + (u.startsWith('/') ? '' : '/') + u);

  // Bing neemt maximaal 500 URL's per verzoek en kent een dagelijkse limiet die
  // per site verschilt. Bij overschrijding stoppen we netjes.
  const batches = [];
  for (let i = 0; i < lijst.length; i += 500) batches.push(lijst.slice(i, i + 500));

  for (const [i, batch] of batches.entries()) {
    try {
      await call('SubmitUrlBatch', { siteUrl: SITE, urlList: batch });
      console.log(`batch ${i + 1}/${batches.length}: ${batch.length} URL's aangemeld`);
    } catch (e) {
      console.log(`batch ${i + 1}/${batches.length}: ${e.message}`);
      if (/quota/i.test(e.message)) {
        console.log('Dagelijkse limiet bereikt. De rest volgt bij de volgende run.');
        break;
      }
    }
  }
}

(async () => {
  const opdracht = process.argv[2] || 'sitemaps';
  console.log(`Site: ${SITE}\n`);
  if (opdracht === 'sitemaps') await sitemaps();
  else if (opdracht === 'urls') await urls(process.argv.slice(3));
  else if (opdracht === 'quota') await quota();
  else {
    console.error('Onbekende opdracht: ' + opdracht + '\nGebruik: sitemaps | urls | quota');
    process.exit(1);
  }
})().catch(e => { console.error('\n' + e.message); process.exit(1); });
