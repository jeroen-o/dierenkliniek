// Meldt gewijzigde of alle URL's aan bij IndexNow.
// IndexNow bedient Bing, Yandex, Seznam, Naver en Yep in één call.
// Gebruik: node tools/indexnow.js            → alle URL's uit tools/all-urls.json
//          node tools/indexnow.js url1 url2  → alleen deze URL's
//          DRY_RUN=1 node tools/indexnow.js  → alleen tonen wat verstuurd zou worden
const fs = require('fs');
const path = require('path');

const HOST = 'dierenkliniek.nl';
const KEY = (fs.readdirSync(path.join(__dirname, '..'))
  .find(f => /^[0-9a-f]{16,}\.txt$/.test(f)) || '').replace(/\.txt$/, '');
if (!KEY) { console.error('Geen IndexNow-sleutelbestand gevonden in de repo-root.'); process.exit(1); }

const ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://search.seznam.cz/indexnow',
  'https://yandex.com/indexnow'
];

// Betekenis van de statuscodes volgens indexnow.org, zodat een mislukte run
// zichzelf verklaart in het logboek van de workflow.
const UITLEG = {
  200: 'aangenomen',
  202: 'aangenomen, sleutel wordt nog geverifieerd',
  400: 'ongeldig verzoek',
  403: 'sleutel afgewezen: het bestand op keyLocation is niet bereikbaar of bevat een andere sleutel',
  404: 'endpoint bestaat niet meer of de sleutel staat niet op de opgegeven plek',
  422: "URL's horen niet bij dit domein, of de sleutel klopt niet",
  429: 'te veel verzoeken'
};

const args = process.argv.slice(2);
let urls = args.length
  ? args
  : JSON.parse(fs.readFileSync(path.join(__dirname, 'all-urls.json'), 'utf8'));
urls = urls.map(u => u.startsWith('http') ? u : `https://${HOST}${u.startsWith('/') ? '' : '/'}${u}`);

const CHUNK = 10000; // IndexNow-limiet per verzoek
const chunks = [];
for (let i = 0; i < urls.length; i += CHUNK) chunks.push(urls.slice(i, i + CHUNK));

(async () => {
  console.log(`IndexNow: ${urls.length} URL's, sleutel ${KEY}`);
  if (process.env.DRY_RUN) { console.log(urls.slice(0, 5).join('\n') + '\n…'); return; }
  for (const endpoint of ENDPOINTS) {
    for (const [i, chunk] of chunks.entries()) {
      const body = { host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: chunk };
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify(body)
        });
        const uitleg = UITLEG[res.status] ? ' — ' + UITLEG[res.status] : '';
        let extra = '';
        if (!res.ok) {
          const tekst = await res.text().catch(() => '');
          if (tekst.trim()) extra = '\n    antwoord: ' + tekst.trim().slice(0, 200);
        }
        console.log(`${endpoint} batch ${i + 1}/${chunks.length}: HTTP ${res.status}${uitleg}${extra}`);
      } catch (e) {
        console.log(`${endpoint} batch ${i + 1}/${chunks.length}: mislukt — ${e.message}`);
      }
    }
  }
})();
