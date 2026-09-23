// Schrijft de publieke, door de browser opgehaalde klinieken-dataset.
//
// data/clinics.json (met e-mailadres) blijft de interne bron voor de
// build-scripts die statische kliniekpagina's genereren — die tonen het
// e-mailadres al server-side, gericht op precies die ene praktijk.
// clinics.json in de site-root is wat de SPA zelf ophaalt voor zoeken,
// stadsweergaves en de homepage: zonder e-mailadres, zodat er geen bestand
// bestaat waarmee alle 1.127 adressen in één keer te verzamelen zijn.
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const { CLINICS } = require('./extract-data');

const publiek = CLINICS.map(({ email, ...rest }) => rest);
fs.writeFileSync(path.join(L.ROOT, 'clinics.json'), JSON.stringify(publiek));

const bytes = JSON.stringify(publiek).length;
console.log(`clinics.json geschreven: ${publiek.length} klinieken, ${Math.round(bytes / 1024)} kB (zonder e-mailadres)`);
