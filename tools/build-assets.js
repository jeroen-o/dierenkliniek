// Schrijft de gedeelde CSS van de statisch gegenereerde pagina's naar losse,
// cachebare bestanden in /css/, in plaats van dat elke pagina zijn eigen
// <style>-blok meedraagt.
//
// Zonder dit stond dezelfde ~9,5KB CSS (stad.css + extra.css) inline in elk
// van de ruim 1700 kliniek-, stad-, provincie-, specialisme- en
// kennisbankpagina's. Nu laadt de browser die CSS één keer en hergebruikt
// 'm bij elke volgende pagina — geen render-blocking herhaling meer per
// navigatie.
const fs = require('fs');
const path = require('path');
const L = require('./layout');

const ROOT = L.ROOT;
const SJABLOON = path.join(ROOT, 'tools', 'sjabloon');
const CSS_DIR = path.join(ROOT, 'css');
fs.mkdirSync(CSS_DIR, { recursive: true });

const bestanden = {
  'stad.css': fs.readFileSync(path.join(SJABLOON, 'stad.css'), 'utf8'),
  'kliniek.css': fs.readFileSync(path.join(SJABLOON, 'kliniek.css'), 'utf8'),
  'extra.css': L.EXTRA_CSS,
  // De social-icon-CSS uit build-social.js: die injecteert zichzelf in
  // vrijwel elk HTML-bestand (ook index.html), dus dit is de meest gedeelde
  // regel CSS van de hele site.
  'social.css': require('./build-social-css')
};

// Lichte minifier voor de losse CSS-bestanden: minder bytes over de lijn,
// zonder dat de leesbare bron (tools/sjabloon/*.css) erop achteruitgaat —
// die blijft ongemoeid, alleen de output in /css/ wordt verkleind.
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')      // commentaar
    .replace(/\s*\n\s*/g, ' ')             // regeleindes + inspringing
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')     // spaties rond scheidingstekens
    .replace(/;}/g, '}')                   // overbodige laatste ;
    .trim();
}

for (const [naam, inhoud] of Object.entries(bestanden)) {
  fs.writeFileSync(path.join(CSS_DIR, naam), minifyCss(inhoud));
}

console.log(`css-bestanden geschreven: ${Object.keys(bestanden).map(n => `${n} (${minifyCss(bestanden[n]).length}b)`).join(', ')}`);
