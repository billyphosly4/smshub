const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const raw = fs.readFileSync(indexPath, 'utf8');

// Priority: environment variable SERVER_URL, then first CLI arg
const serverUrl = process.env.SERVER_URL || process.argv[2] || '';

if (!serverUrl) {
  console.log('No SERVER_URL provided; replacing placeholder with empty string.');
}

const out = raw.replace(/content="__SERVER_URL__"/, `content="${serverUrl}"`);
fs.writeFileSync(indexPath, out, 'utf8');
console.log('Updated index.html with SERVER_URL:', serverUrl);
