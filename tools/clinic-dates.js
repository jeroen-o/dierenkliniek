// Berekent per kliniek een echte publicatie- en wijzigingsdatum uit de
// git-geschiedenis, naar het voorbeeld van kb-dates.js. Zonder dit stond
// elke kliniekpagina op de builddatum van vandaag, wat Google leert
// negeren zodra dat voor alle pagina's identiek is — zie het AI-verbeterplan.
//
// datePublished: datum van de oudste commit waarin de kliniek (op id)
//   voorkomt — vóór de migratie naar data/clinics.json stond de data in
//   CLINICS in index.html, dus die geschiedenis telt mee.
// dateModified: datum van de meest recente commit waarin de gegevens van
//   die specifieke kliniek écht zijn veranderd.
const { execFileSync } = require('child_process');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function grabClinics(html) {
  const start = html.indexOf('const CLINICS = [');
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

function clinicsAt(hash) {
  try {
    const json = execFileSync('git', ['show', `${hash}:data/clinics.json`], { cwd: ROOT, maxBuffer: 1024 * 1024 * 50, stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    return JSON.parse(json);
  } catch (e) {}
  try {
    const html = execFileSync('git', ['show', `${hash}:index.html`], { cwd: ROOT, maxBuffer: 1024 * 1024 * 50, stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    const arr = grabClinics(html);
    return arr ? vm.runInNewContext('(' + arr + ')') : null;
  } catch (e) { return null; }
}

let cache = null;

function berekenAlle() {
  if (cache) return cache;
  let commits;
  try {
    commits = execFileSync('git', ['log', '--format=%H|%aI', '--reverse', '--', 'index.html', 'data/clinics.json'], { cwd: ROOT, maxBuffer: 1024 * 1024 * 20 })
      .toString().trim().split('\n').filter(Boolean)
      .map(l => { const [hash, date] = l.split('|'); return { hash, date }; });
  } catch (e) {
    cache = {};
    return cache;
  }

  const eerstGezien = {}, laatstGewijzigd = {}, vorigeContent = {};
  for (const { hash, date } of commits) {
    const clinics = clinicsAt(hash);
    if (!clinics) continue;
    for (const c of clinics) {
      if (!(c.id in eerstGezien)) eerstGezien[c.id] = date;
      const snapshot = JSON.stringify(c);
      const prev = vorigeContent[c.id];
      if (prev !== undefined && prev !== snapshot) laatstGewijzigd[c.id] = date;
      vorigeContent[c.id] = snapshot;
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

// Voor een kliniek zonder gitgeschiedenis (nog niet gecommit) valt dit terug
// op vandaag — dat is dan ook feitelijk correct.
function datumsVoor(id, fallback) {
  const alle = berekenAlle();
  return alle[id] || { datePublished: fallback, dateModified: fallback };
}

module.exports = { datumsVoor };
