// Haalt een OAuth-token op voor de Search Console API met een Google
// service-account-sleutel. Geen externe pakketten: de JWT wordt met de
// ingebouwde crypto-module ondertekend.
//
// De sleutel wordt gelezen uit de omgevingsvariabele GOOGLE_SERVICE_ACCOUNT_JSON
// en staat nooit in de repository. In GitHub Actions komt die uit een secret.
const crypto = require('crypto');

const b64url = (input) => Buffer.from(input)
  .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function readKey() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON ontbreekt. Zet de inhoud van het service-account-bestand ' +
      'in die omgevingsvariabele, of in het gelijknamige GitHub-secret.'
    );
  }
  let key;
  try {
    key = JSON.parse(raw);
  } catch (e) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON bevat geen geldige JSON: ' + e.message);
  }
  if (!key.client_email || !key.private_key) {
    throw new Error('Het service-account mist client_email of private_key.');
  }
  return key;
}

async function getAccessToken(scopes) {
  const key = readKey();
  const now = Math.floor(Date.now() / 1000);
  const audience = key.token_uri || 'https://oauth2.googleapis.com/token';
  const claim = {
    iss: key.client_email,
    scope: Array.isArray(scopes) ? scopes.join(' ') : scopes,
    aud: audience,
    iat: now,
    exp: now + 3600
  };

  const unsigned = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
    '.' + b64url(JSON.stringify(claim));
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(key.private_key);
  const assertion = unsigned + '.' + signature.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch(audience, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Token ophalen mislukt (HTTP ${res.status}): ${body.error_description || body.error || 'onbekende fout'}. ` +
      `Controleer of ${key.client_email} in Search Console is toegevoegd als gebruiker.`
    );
  }
  return body.access_token;
}

module.exports = { getAccessToken, readKey };
