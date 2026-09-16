// Praat met de Google Search Console API.
//
//   node tools/search-console.js sitemaps    toont de status van alle ingediende sitemaps
//   node tools/search-console.js indienen    dient de vier sitemaps opnieuw in
//   node tools/search-console.js rapport     schrijft een prestatierapport naar rapporten/
//   node tools/search-console.js inspect     controleert de indexeringsstatus van kernpagina's
//   node tools/search-console.js dekking     dagelijkse steekproef door alle sitemap-URL's;
//                                              schrijft problemen naar rapporten/dekking-laatste.json
//
// Vereist de omgevingsvariabele GOOGLE_SERVICE_ACCOUNT_JSON. Het service-account
// moet in Search Console als gebruiker zijn toegevoegd: leesrechten volstaan voor
// rapport en inspect, voor indienen is het recht "eigenaar" of "volledig" nodig.
const fs = require('fs');
const path = require('path');
const { getAccessToken, readKey } = require('./google-auth');

const ROOT = path.join(__dirname, '..');
const SITE = process.env.GSC_SITE_URL || 'sc-domain:dierenkliniek.nl';
const SCOPE = 'https://www.googleapis.com/auth/webmasters';
const SITEMAPS = [
  'https://dierenkliniek.nl/sitemap.xml',
  'https://dierenkliniek.nl/sitemap-hoofdpaginas.xml',
  'https://dierenkliniek.nl/sitemap-artikelen.xml',
  'https://dierenkliniek.nl/sitemap-steden.xml',
  'https://dierenkliniek.nl/sitemap-klinieken.xml'
];
const KERNPAGINAS = [
  'https://dierenkliniek.nl/',
  'https://dierenkliniek.nl/spoedhulp',
  'https://dierenkliniek.nl/kennisbank',
  'https://dierenkliniek.nl/provincies',
  'https://dierenkliniek.nl/glossarium'
];

const base = 'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(SITE);

async function call(token, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (e) { body = { raw: text }; }
  if (!res.ok) {
    const reden = body && body.error ? body.error.message : text.slice(0, 200);
    throw new Error(`HTTP ${res.status} op ${url.replace(/\?.*$/, '')}: ${reden}`);
  }
  return body;
}

function datum(dagenGeleden) {
  const d = new Date(Date.now() - dagenGeleden * 86400000);
  return d.toISOString().slice(0, 10);
}

/* ---------------- sitemaps tonen ---------------- */
async function toonSitemaps(token) {
  const body = await call(token, base + '/sitemaps');
  const lijst = (body && body.sitemap) || [];
  if (!lijst.length) {
    console.log('Er zijn nog geen sitemaps ingediend voor ' + SITE);
    return;
  }
  console.log(`Sitemaps voor ${SITE}:\n`);
  for (const s of lijst) {
    const inhoud = (s.contents || []).map(c => `${c.submitted} ${c.type}`).join(', ');
    console.log(`  ${s.path}`);
    console.log(`    laatst opgehaald: ${s.lastDownloaded || 'nog niet'}`);
    console.log(`    fouten: ${s.errors || 0} · waarschuwingen: ${s.warnings || 0}`);
    if (inhoud) console.log(`    inhoud: ${inhoud}`);
  }
}

/* ---------------- sitemaps indienen ---------------- */
async function dienIn(token) {
  for (const sitemap of SITEMAPS) {
    const url = base + '/sitemaps/' + encodeURIComponent(sitemap);
    try {
      await call(token, url, { method: 'PUT' });
      console.log('ingediend: ' + sitemap);
    } catch (e) {
      console.log('mislukt:   ' + sitemap + ' — ' + e.message);
    }
  }
}

/* ---------------- prestatierapport ---------------- */
async function rapport(token) {
  const periode = { startDate: datum(30), endDate: datum(2) };

  async function query(dimensies, extra = {}) {
    return call(token, base + '/searchAnalytics/query', {
      method: 'POST',
      body: JSON.stringify({ ...periode, dimensions: dimensies, rowLimit: 200, ...extra })
    });
  }

  const [totaal, paginas, zoektermen, landen] = await Promise.all([
    query([]),
    query(['page']),
    query(['query']),
    query(['country'])
  ]);

  const som = (totaal.rows && totaal.rows[0]) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const groepeer = (rows, prefix) => (rows || [])
    .filter(r => r.keys[0].includes(prefix))
    .reduce((acc, r) => {
      acc.clicks += r.clicks; acc.impressions += r.impressions; acc.n += 1; return acc;
    }, { clicks: 0, impressions: 0, n: 0 });

  const rapportData = {
    site: SITE,
    periode,
    gegenereerd: new Date().toISOString(),
    totaal: {
      klikken: som.clicks,
      vertoningen: som.impressions,
      ctr: Number((som.ctr * 100).toFixed(2)),
      gemiddeldePositie: Number(som.position.toFixed(1))
    },
    perSectie: {
      kennisbank: groepeer(paginas.rows, '/kennisbank'),
      steden: groepeer(paginas.rows, '/dierenarts-'),
      provincies: groepeer(paginas.rows, '/dierenklinieken-'),
      klinieken: groepeer(paginas.rows, '-dierenarts-in-'),
      spoedhulp: groepeer(paginas.rows, '/spoedhulp')
    },
    topPaginas: (paginas.rows || []).slice(0, 40).map(r => ({
      url: r.keys[0], klikken: r.clicks, vertoningen: r.impressions,
      positie: Number(r.position.toFixed(1))
    })),
    topZoektermen: (zoektermen.rows || []).slice(0, 40).map(r => ({
      term: r.keys[0], klikken: r.clicks, vertoningen: r.impressions,
      positie: Number(r.position.toFixed(1))
    })),
    landen: (landen.rows || []).slice(0, 10).map(r => ({
      land: r.keys[0], klikken: r.clicks, vertoningen: r.impressions
    }))
  };

  const map = path.join(ROOT, 'rapporten');
  fs.mkdirSync(map, { recursive: true });
  const bestand = path.join(map, `zoekprestaties-${periode.endDate}.json`);
  fs.writeFileSync(bestand, JSON.stringify(rapportData, null, 2));
  fs.writeFileSync(path.join(map, 'zoekprestaties-laatste.json'), JSON.stringify(rapportData, null, 2));

  console.log(`Periode ${periode.startDate} tot ${periode.endDate}`);
  console.log(`  klikken:      ${rapportData.totaal.klikken}`);
  console.log(`  vertoningen:  ${rapportData.totaal.vertoningen}`);
  console.log(`  gem. positie: ${rapportData.totaal.gemiddeldePositie}`);
  for (const [naam, v] of Object.entries(rapportData.perSectie)) {
    console.log(`  ${naam.padEnd(12)} ${String(v.clicks).padStart(5)} klikken · ${String(v.impressions).padStart(6)} vertoningen · ${v.n} pagina's`);
  }
  console.log('\nOpgeslagen in ' + path.relative(ROOT, bestand));
}

/* ---------------- indexeringsstatus ---------------- */
async function inspect(token) {
  for (const url of KERNPAGINAS) {
    try {
      const body = await call(token, 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE, languageCode: 'nl' })
      });
      const r = (body && body.inspectionResult && body.inspectionResult.indexStatusResult) || {};
      console.log(`${url}`);
      console.log(`  verdict: ${r.verdict || 'onbekend'} · dekking: ${r.coverageState || 'onbekend'}`);
      if (r.lastCrawlTime) console.log(`  laatst gecrawld: ${r.lastCrawlTime}`);
    } catch (e) {
      console.log(`${url}\n  mislukt: ${e.message}`);
    }
  }
}

/* ---------------- dagelijkse dekkingscontrole ---------------- */
// Vervangt de e-mailmeldingen van Search Console door een directe, dagelijkse
// bevraging van de URL Inspection API. Google's index-coverage-rapport zelf is
// niet via de API op te vragen, maar per-URL-inspectie wel — dat geeft dezelfde
// "waarom is dit niet geïndexeerd"-informatie, alleen per URL in plaats van in
// bulk. Met ~1700 URL's en een quotum van 2000 opvragingen per dag wordt in
// dagporties geroteerd: elke URL komt zo ongeveer één keer per maand aan de beurt,
// en de kernpagina's lopen elke dag mee.
const DEKKING_STATUS = path.join(ROOT, 'data', 'dekking-status.json');
const DEKKING_RAPPORT = path.join(ROOT, 'rapporten', 'dekking-laatste.json');
const DAGPORTIE = Number(process.env.DEKKING_DAGPORTIE) || 80;

function alleSitemapUrls() {
  const bestanden = ['sitemap-hoofdpaginas.xml', 'sitemap-steden.xml', 'sitemap-klinieken.xml'];
  const urls = new Set(KERNPAGINAS);
  for (const bestand of bestanden) {
    const p = path.join(ROOT, bestand);
    if (!fs.existsSync(p)) continue;
    const xml = fs.readFileSync(p, 'utf8');
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1]);
  }
  return [...urls];
}

function laadDekkingStatus() {
  try { return JSON.parse(fs.readFileSync(DEKKING_STATUS, 'utf8')); } catch (e) { return {}; }
}

async function dekking(token) {
  const status = laadDekkingStatus();
  const urls = alleSitemapUrls();

  // Kernpagina's lopen elke dag mee; de rest roteert op basis van wanneer hij
  // voor het laatst is gecontroleerd (nooit gecontroleerd gaat voor).
  const kern = new Set(KERNPAGINAS);
  const rest = urls.filter(u => !kern.has(u))
    .sort((a, b) => (status[a] ? status[a].gecontroleerd : '') < (status[b] ? status[b].gecontroleerd : '') ? -1 : 1);
  const teControleren = [...KERNPAGINAS, ...rest.slice(0, Math.max(0, DAGPORTIE - KERNPAGINAS.length))];

  const problemen = [];
  const nu = new Date().toISOString();
  for (const url of teControleren) {
    try {
      const body = await call(token, 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE, languageCode: 'nl' })
      });
      const r = (body && body.inspectionResult && body.inspectionResult.indexStatusResult) || {};
      status[url] = {
        gecontroleerd: nu,
        verdict: r.verdict || 'ONBEKEND',
        coverageState: r.coverageState || '',
        lastCrawlTime: r.lastCrawlTime || null
      };
      if (r.verdict !== 'PASS') {
        problemen.push({ url, verdict: r.verdict || 'ONBEKEND', coverageState: r.coverageState || '(geen reden opgegeven)' });
      }
    } catch (e) {
      status[url] = { gecontroleerd: nu, verdict: 'FOUT', coverageState: e.message };
      problemen.push({ url, verdict: 'FOUT', coverageState: e.message });
    }
  }

  fs.mkdirSync(path.dirname(DEKKING_STATUS), { recursive: true });
  fs.writeFileSync(DEKKING_STATUS, JSON.stringify(status, null, 1) + '\n');

  fs.mkdirSync(path.dirname(DEKKING_RAPPORT), { recursive: true });
  fs.writeFileSync(DEKKING_RAPPORT, JSON.stringify({
    gegenereerd: nu,
    gecontroleerdVandaag: teControleren.length,
    totaalUrls: urls.length,
    problemen
  }, null, 2) + '\n');

  console.log(`Gecontroleerd: ${teControleren.length} van ${urls.length} URL's (cyclus van ~${Math.ceil(urls.length / DAGPORTIE)} dagen).`);
  if (problemen.length) {
    console.log(`\n${problemen.length} met een afwijkend verdict:`);
    for (const p of problemen) console.log(`  ${p.url}\n    ${p.verdict} — ${p.coverageState}`);
  } else {
    console.log('Geen afwijkingen in deze portie.');
  }
  // Bewust geen non-zero exit: dit script signaleert, de workflow eromheen
  // beslist (via het rapportbestand) of er een issue moet komen.
}

(async () => {
  const opdracht = process.argv[2] || 'sitemaps';
  const key = readKey();
  console.log(`Service-account: ${key.client_email}\nProperty: ${SITE}\n`);
  const token = await getAccessToken(SCOPE);
  if (opdracht === 'sitemaps') await toonSitemaps(token);
  else if (opdracht === 'indienen') await dienIn(token);
  else if (opdracht === 'rapport') await rapport(token);
  else if (opdracht === 'inspect') await inspect(token);
  else if (opdracht === 'dekking') await dekking(token);
  else {
    console.error('Onbekende opdracht: ' + opdracht);
    console.error('Gebruik: sitemaps | indienen | rapport | inspect | dekking');
    process.exit(1);
  }
})().catch(e => { console.error('\n' + e.message); process.exit(1); });
