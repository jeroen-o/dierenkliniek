// Bouwt alle gegenereerde bestanden opnieuw. Draai dit na iedere wijziging in
// de datasets in index.html (CLINICS, KB_ARTICLES, GLOSSARIUM).
//
//   node tools/build.js
//
// Daarna committen en pushen; de GitHub Action meldt de wijzigingen bij IndexNow aan.
const { execFileSync } = require('child_process');
const steps = [
  'build-kennisbank.js',
  'build-paginas.js',
  'build-vertrouwenspaginas.js',
  'enrich-klinieken.js',
  'fix-links.js',
  'build-sitemaps.js',
  'build-llms.js'
];
for (const s of steps) {
  process.stdout.write(`▶ ${s}\n  `);
  console.log(execFileSync('node', [__dirname + '/' + s], { encoding: 'utf8' }).trim());
}
console.log('\nKlaar. Controleer met: git status');
