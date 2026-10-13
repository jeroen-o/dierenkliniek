// Terugbelverzoek / contactaanvraag per kliniekpagina.
//
// Statische site zonder backend (GitHub Pages): net als het aanmeldformulier
// voor klinieken bouwt dit een mailto: met alle gegevens overzichtelijk op
// een rij. De aanvraag gaat naar het e-mailadres van de kliniek zelf (uit
// data-kliniek-email op het formulier), niet naar dierenkliniek.nl — de
// consument stuurt 'm met één klik vanuit het eigen mailprogramma.
function submitTerugbel(e) {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  const kliniekEmail = form.dataset.kliniekEmail;
  const kliniekNaam = form.dataset.kliniekNaam || 'uw kliniek';

  const subject = `Contactaanvraag via Dierenkliniek.nl — ${data.get('uw_naam') || 'nieuwe aanvraag'}`;
  const lines = [
    `Contactaanvraag voor ${kliniekNaam} via dierenkliniek.nl`,
    `Datum: ${new Date().toLocaleDateString('nl-NL')}`,
    '',
    `Diersoort: ${data.get('diersoort') || '-'}`,
    `Korte omschrijving: ${data.get('klacht') || '-'}`,
    `Voorkeursdagdeel: ${data.get('dagdeel') || '-'}`,
    '',
    `Naam: ${data.get('uw_naam') || '-'}`,
    `Telefoonnummer: ${data.get('uw_telefoon') || '-'}`,
    `E-mailadres: ${data.get('uw_email') || '-'}`,
    '',
    '─────────────────────',
    `Verzonden via ${window.location.href.split('?')[0]}`,
  ];
  const body = lines.join('\n');

  const url = `mailto:${kliniekEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;

  const btn = form.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.textContent = '✓ E-mail geopend in uw mailprogramma';
  btn.disabled = true;

  setTimeout(() => {
    if (!confirm('Werd uw mailprogramma geopend? Klik OK als alles goed ging. Klik Annuleren om de tekst te kopiëren en zelf te versturen.')) {
      const ta = document.createElement('textarea');
      ta.className = 'terugbel-fallback';
      ta.value = body;
      btn.parentNode.insertBefore(ta, btn.nextSibling);
      const note = document.createElement('p');
      note.className = 'form-note';
      note.innerHTML = `Kopieer bovenstaande tekst en stuur deze handmatig naar <strong>${kliniekEmail}</strong>.`;
      ta.parentNode.insertBefore(note, ta.nextSibling);
      ta.select();
    }
  }, 1500);

  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 8000);
}
