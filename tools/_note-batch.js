// Helper: note several sent emails at once into data/mailronde-verzonden.json.
// Usage: node tools/_note-batch.js '[["email1","id1"],["email2","id2"]]'
const fs = require('fs');
const path = require('path');
const REGISTER = path.join(__dirname, '..', 'data', 'mailronde-verzonden.json');
function verzonden() {
  if (!fs.existsSync(REGISTER)) return {};
  try { return JSON.parse(fs.readFileSync(REGISTER, 'utf8')); } catch (e) { return {}; }
}
const pairs = JSON.parse(process.argv[2]);
const r = verzonden();
for (const [email, id] of pairs) {
  r[email.toLowerCase()] = { id, op: new Date().toISOString() };
}
fs.writeFileSync(REGISTER, JSON.stringify(r, null, 2));
console.log('genoteerd:', pairs.length);
