// Berekent per kennisbankartikel een echte publicatie- en wijzigingsdatum uit
// de git-geschiedenis, in plaats van overal de builddatum van vandaag te
// gebruiken. Google negeert datePublished/dateModified zodra die voor alle
// pagina's identiek zijn (geconstateerd in het AI-verbeterplan).
//
// datePublished: de datum van de oudste commit waarin het artikel (op id)
//   voorkomt — vóór de migratie naar data/kennisbank.json (15 sep 2026) stond
//   de inhoud in KB_ARTICLES in index.html, dus die geschiedenis telt mee.
// dateModified: de datum van de meest recente commit waarin de content van
//   dat specifieke artikel écht is veranderd (niet alleen "aangeraakt" doordat
//   de migratie het hele bestand herschreef).
const { execFileSync } = require('child_process');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function grabKbArticles(html) {
  const start = html.indexOf('const KB_ARTICLES = [');
  if (start === -1) return null;
  const open = html.indexOf('[', start);
  let depth = 0, inStr = null, esc = false;
  for (let i = open; i < html.length; i++) {
    const ch = html[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (inStr) { if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return html.slice(open, i + 1); }
  }
  return null;
}

function articlesAt(hash) {
  try {
    const json = execFileSync('git', ['show', `${hash}:data/kennisbank.json`], { cwd: ROOT, maxBuffer: 1024 * 1024 * 50, stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    return JSON.parse(json);
  } catch (e) {}
  try {
    const html = execFileSync('git', ['show', `${hash}:index.html`], { cwd: ROOT, maxBuffer: 1024 * 1024 * 50, stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    const arr = grabKbArticles(html);
    return arr ? vm.runInNewContext('(' + arr + ')') : null;
  } catch (e) { return null; }
}

let cache = null;

function berekenAlle() {
  if (cache) return cache;
  let commits;
  try {
    commits = execFileSync('git', ['log', '--format=%H|%aI', '--reverse', '--', 'index.html', 'data/kennisbank.json'], { cwd: ROOT, maxBuffer: 1024 * 1024 * 20 })
      .toString().trim().split('\n').filter(Boolean)
      .map(l => { const [hash, date] = l.split('|'); return { hash, date }; });
  } catch (e) {
    cache = {};
    return cache;
  }

  const eerstGezien = {}, laatstGewijzigd = {}, vorigeContent = {};
  for (const { hash, date } of commits) {
    const arts = articlesAt(hash);
    if (!arts) continue;
    for (const a of arts) {
      if (!(a.id in eerstGezien)) eerstGezien[a.id] = date;
      const prev = vorigeContent[a.id];
      if (prev !== undefined && prev !== a.content) laatstGewijzigd[a.id] = date;
      vorigeContent[a.id] = a.content;
    }
  }

  cache = {};
  for (const id of Object.keys(eerstGezien)) {
    cache[id] = {
      datePublished: eerstGezien[id].slice(0, 10),
      dateModified: (laatstGewijzigd[id] || eerstGezien[id]).slice(0, 10),
    };
  }
  return cache;
}

// Voor een artikel zonder gitgeschiedenis (nog niet gecommit) valt dit terug
// op vandaag — dat is dan ook feitelijk correct.
function datumsVoor(id, fallback) {
  const alle = berekenAlle();
  return alle[id] || { datePublished: fallback, dateModified: fallback };
}

module.exports = { datumsVoor };
