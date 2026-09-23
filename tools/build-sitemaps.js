// Bouwt alle sitemaps opnieuw op basis van de werkelijke bestanden op schijf.
// Query-string URL's van de SPA zijn vervangen door de statische equivalenten,
// zodat crawlers alleen canonieke, indexeerbare URL's te zien krijgen.
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const DATA = require('./extract-data');
const KB_DATES = require('./kb-dates');

const ROOT = L.ROOT;
const SITE = L.SITE;
const TODAY = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const { CLINICS, KB_ARTICLES, KB_CATEGORIES, KB_ANIMALS } = DATA;

const PROVINCES = Object.keys(L.PROVINCE_DESCRIPTIONS);
const cities = [...new Set(CLINICS.map(c => c.city))].sort((a, b) => a.localeCompare(b, 'nl'));
const articles = KB_ARTICLES.map(a => ({ ...a, slug: L.slugify(a.title) }));

// lastmod is optioneel overschreven — anders staat elke URL op de builddatum
// van vandaag, wat Google leert negeren zodra dat overal hetzelfde is (zie
// kennisbankartikelen hieronder, die hun echte wijzigingsdatum meekrijgen).
const u = (loc, priority, changefreq, lastmod) =>
  `  <url><loc>${SITE}${loc.replace(/&/g, '&amp;')}</loc><lastmod>${lastmod || TODAY}</lastmod>` +
  `<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

function urlset(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

const exists = (p) => fs.existsSync(path.join(ROOT, p));

/* ---- hoofdpagina's ---- */
const hoofd = [
  u('/', '1.0', 'daily'),
  u('/spoedhulp', '0.95', 'weekly'),
  u('/dierenarts-in-de-buurt', '0.9', 'weekly'),
  u('/provincies', '0.8', 'weekly'),
  u('/kennisbank', '0.9', 'weekly'),
  u('/glossarium', '0.7', 'monthly'),
  u('/specialismen', '0.8', 'monthly'),
  u('/pakketten', '0.9', 'monthly'),
  u('/badge', '0.6', 'monthly'),
  u('/vermeldingsbeleid', '0.6', 'monthly'),
  u('/statistieken', '0.6', 'weekly'),
  u('/design', '0.5', 'monthly'),
  ...PROVINCES.map(p => u('/dierenklinieken-' + L.slugify(p), '0.85', 'weekly')),
  ...['honden', 'katten', 'konijnen', 'knaagdieren', 'vogels', 'exoten', 'chirurgie', 'cardiologie',
      'dermatologie', 'tandheelkunde', 'echografie', 'spoed']
    .filter(s => exists('specialisme-' + s + '.html'))
    .map(s => u('/specialisme-' + s, '0.75', 'monthly')),
  // SPA-views zonder statisch equivalent
  ...['over-ons', 'onafhankelijkheid', 'contact', 'partners']
    .filter(s => exists(s + '.html'))
    .map(s => u('/' + s, '0.7', 'monthly')),
  // Views zonder eigen statische pagina, maar wel index,follow
  // (zie NOINDEX_VIEWS in index.html).
  ...['aanmelden', 'english', 'vaccinatieplanner', 'kostenwijzer', 'beslisboom']
    .map(v => u('/?view=' + v, '0.6', 'monthly')),
  ...['privacy', 'voorwaarden', 'cookies']
    .map(v => u('/?view=' + v, '0.3', 'yearly')),
];

/* ---- kennisbank ---- */
const kb = [
  u('/kennisbank', '0.9', 'weekly'),
  ...KB_CATEGORIES.filter(c => articles.some(a => a.category === c.slug))
    .map(c => u('/kennisbank/categorie-' + c.slug, '0.75', 'weekly')),
  ...KB_ANIMALS.filter(an => articles.some(a => a.animal === an.slug))
    .map(an => u('/kennisbank/dier-' + an.slug, '0.75', 'weekly')),
  ...articles.map(a => u('/kennisbank/' + a.slug, '0.7', 'monthly', KB_DATES.datumsVoor(a.id, TODAY).dateModified))
];

/* ---- klinieken en steden ---- */
const klinieken = CLINICS.map(c => L.clinicSlug(c))
  .filter(s => exists(s + '.html'))
  .sort()
  .map(s => u('/' + s, '0.6', 'monthly'));

const steden = cities.map(c => L.citySlug(c))
  .filter(s => exists(s + '.html'))
  .map(s => u('/' + s, '0.8', 'weekly'));

fs.writeFileSync(path.join(ROOT, 'sitemap-hoofdpaginas.xml'), urlset(hoofd));
fs.writeFileSync(path.join(ROOT, 'sitemap-artikelen.xml'), urlset(kb));
fs.writeFileSync(path.join(ROOT, 'sitemap-klinieken.xml'), urlset(klinieken));
fs.writeFileSync(path.join(ROOT, 'sitemap-steden.xml'), urlset(steden));

const children = ['sitemap-hoofdpaginas.xml', 'sitemap-artikelen.xml', 'sitemap-steden.xml', 'sitemap-klinieken.xml'];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${children.map(c => `  <sitemap>\n    <loc>${SITE}/${c}</loc>\n    <lastmod>${TODAY}</lastmod>\n  </sitemap>`).join('\n')}
</sitemapindex>
`);

// Platte lijst met alle canonieke URL's — input voor de IndexNow-ping.
const all = [...hoofd, ...kb, ...steden, ...klinieken]
  .map(line => (line.match(/<loc>([^<]*)<\/loc>/) || [])[1])
  .filter(Boolean)
  .map(s => s.replace(/&amp;/g, '&'));
fs.writeFileSync(path.join(ROOT, 'tools', 'all-urls.json'), JSON.stringify(all, null, 2));

console.log(`sitemaps: hoofd ${hoofd.length}, kennisbank ${kb.length}, steden ${steden.length}, klinieken ${klinieken.length}, totaal ${all.length}`);
