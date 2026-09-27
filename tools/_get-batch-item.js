// Helper: print one or a range of items from data/mailronde-batch.json as compact JSON lines.
// Usage: node tools/_get-batch-item.js <startIndex> <count>
const fs = require('fs');
const path = require('path');
const batch = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mailronde-batch.json'), 'utf8'));
const start = parseInt(process.argv[2] || '0', 10);
const count = parseInt(process.argv[3] || '1', 10);
const slice = batch.slice(start, start + count);
for (const item of slice) console.log(JSON.stringify(item));
