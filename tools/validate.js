// Controleert de hele site op SEO-basishygiëne: canonical, title, description,
// h1, valide JSON-LD en interne links die nergens heen wijzen.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const files = [];
(function walk(dir, prefix = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    // tools/sjabloon bevat losse header- en footerfragmenten, geen pagina's
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'badges' || e.name === 'logo-pack' || e.name === 'tools') continue;
    const rel = prefix + e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), rel + '/');
    else if (e.name.endsWith('.html')) files.push(rel);
  }
})(ROOT);

const problems = [];
const canonicals = new Map();
const pages = new Set(files.map(f => '/' + f.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '')));
pages.add('/');

const assets = new Set();
for (const e of fs.readdirSync(ROOT)) assets.add('/' + e);

let ldBlocks = 0;
for (const f of files) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const get = (re) => (s.match(re) || [])[1];

  const canonical = get(/<link rel="canonical" href="([^"]+)"/);
  const title = get(/<title>([\s\S]*?)<\/title>/);
  const desc = get(/<meta name="description" content="([^"]*)"/);
  const h1 = (s.match(/<h1[^>]*>/g) || []).length;
  const noindex = /content="noindex/.test(s);

  if (!canonical) problems.push(`${f}: geen canonical`);
  if (!title) problems.push(`${f}: geen title`);
  else if (title.length > 75) problems.push(`${f}: title ${title.length} tekens (>75)`);
  if (!desc) problems.push(`${f}: geen meta description`);
  else if (desc.length > 165) problems.push(`${f}: description ${desc.length} tekens (>165)`);
  if (h1 === 0) problems.push(`${f}: geen h1`);

  if (canonical && !noindex) {
    if (canonicals.has(canonical)) problems.push(`${f}: canonical botst met ${canonicals.get(canonical)}`);
    else canonicals.set(canonical, f);
  }

  for (const m of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    ldBlocks++;
    try { JSON.parse(m[1]); } catch (e) { problems.push(`${f}: ongeldige JSON-LD (${e.message.slice(0, 50)})`); }
  }

  for (const m of s.matchAll(/href="(\/[^"#?]*)"/g)) {
    if (m[1].includes('${')) continue; // template-literal in inline JavaScript
    const href = m[1].replace(/\/$/, '') || '/';
    if (assets.has(href) || assets.has(href + '.html')) continue;
    if (pages.has(href)) continue;
    if (fs.existsSync(path.join(ROOT, href.slice(1)))) continue;
    problems.push(`${f}: dode interne link ${href}`);
  }
}

console.log(`gecontroleerd: ${files.length} pagina's, ${ldBlocks} JSON-LD blokken, ${canonicals.size} unieke canonicals`);
if (!problems.length) { console.log('geen problemen gevonden'); process.exit(0); }
const counts = {};
for (const p of problems) {
  const key = p.replace(/^[^:]+: /, '').replace(/\d+/g, 'N').replace(/ \S+$/, m => / link/.test(p) ? ' …' : m);
  counts[key] = (counts[key] || 0) + 1;
}
console.log(`\n${problems.length} bevindingen:`);
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${v}× ${k}`);
console.log('\nVoorbeelden:');
console.log(problems.slice(0, 15).map(p => '  ' + p).join('\n'));
