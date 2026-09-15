// Bouwt een zoekindex voor de kennisbank: per artikel de volledige tekst als
// platte tekst. De SPA laadt dit bestand pas wanneer iemand echt zoekt, zodat
// zoeken op inhoud blijft werken zonder de homepage zwaarder te maken.
const fs = require('fs');
const path = require('path');
const L = require('./layout');

const ROOT = L.ROOT;
const artikelen = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'kennisbank.json'), 'utf8'));

const index = artikelen.map(a => ({
  id: a.id,
  t: L.stripTags(a.content).toLowerCase()
}));

const dest = path.join(ROOT, 'data', 'kennisbank-zoek.json');
fs.writeFileSync(dest, JSON.stringify(index));
console.log(`data/kennisbank-zoek.json: ${index.length} artikelen, ${Math.round(fs.statSync(dest).size / 1024)} kB`);
