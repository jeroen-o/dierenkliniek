/* Toegankelijkheidswidget: zichtbaar op elke pagina van de site (niet alleen
 * de onder-de-motorkap WCAG-fixes zoals de skip-link en focus-outlines).
 * Bouwt zijn eigen knop + paneel via JS, zodat dit ene bestand voldoende is
 * voor alle ~2000 statisch gegenereerde pagina's én de SPA (index.html) —
 * er hoeft geen HTML te worden aangepast in honderden sjablonen.
 *
 * Voorkeuren (tekstgrootte, contrast, dyslexie-lettertype) worden alleen
 * lokaal in de browser van de bezoeker bewaard (localStorage), nooit naar
 * een server gestuurd.
 */
(function () {
  var STORAGE_KEY = 'dk_a11y_prefs_v1';
  var root = document.documentElement;

  function laadPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function bewaarPrefs(p) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) {}
  }

  var TEKST_KLASSEN = ['a11y-text-lg', 'a11y-text-xl'];

  function toepassen(p) {
    TEKST_KLASSEN.forEach(function (k) { root.classList.remove(k); });
    if (p.tekst === 'lg') root.classList.add('a11y-text-lg');
    if (p.tekst === 'xl') root.classList.add('a11y-text-xl');
    root.classList.toggle('a11y-contrast', !!p.contrast);
    root.classList.toggle('a11y-dyslexie', !!p.dyslexie);
  }

  // Meteen toepassen, nog voor de rest van deze functie — voorkomt een
  // zichtbare "flits" van de standaardweergave bij een bezoeker die al
  // voorkeuren had ingesteld.
  var prefs = laadPrefs();
  toepassen(prefs);

  function bouwUI() {
    var wrap = document.createElement('div');
    wrap.className = 'a11y-widget';
    wrap.innerHTML =
      '<button type="button" class="a11y-toggle-btn" id="a11yToggleBtn" ' +
        'aria-expanded="false" aria-controls="a11yPanel" aria-haspopup="true" ' +
        'aria-label="Toegankelijkheidsopties">' +
        '<span aria-hidden="true">&#9881;</span>' +
      '</button>' +
      '<div class="a11y-panel" id="a11yPanel" role="dialog" aria-modal="false" ' +
          'aria-labelledby="a11yPanelTitle" hidden>' +
        '<h2 id="a11yPanelTitle">Toegankelijkheid</h2>' +
        '<section>' +
          '<h3 id="a11yTekstLabel">Tekstgrootte</h3>' +
          '<div class="a11y-btn-row" role="group" aria-labelledby="a11yTekstLabel">' +
            '<button type="button" data-tekst="">A<span class="sr-only-a11y"> (standaard)</span></button>' +
            '<button type="button" data-tekst="lg">A<span aria-hidden="true">+</span><span class="sr-only-a11y"> (groter)</span></button>' +
            '<button type="button" data-tekst="xl">A<span aria-hidden="true">++</span><span class="sr-only-a11y"> (grootst)</span></button>' +
          '</div>' +
        '</section>' +
        '<section>' +
          '<label class="a11y-switch-row">' +
            '<input type="checkbox" id="a11yContrastToggle">' +
            '<span>Hoog contrast</span>' +
          '</label>' +
        '</section>' +
        '<section>' +
          '<label class="a11y-switch-row">' +
            '<input type="checkbox" id="a11yDyslexieToggle">' +
            '<span>Dyslexievriendelijk lettertype</span>' +
          '</label>' +
        '</section>' +
        '<div class="a11y-panel-actions">' +
          '<button type="button" id="a11yResetBtn" class="a11y-reset-btn">Alles resetten</button>' +
        '</div>' +
        '<p class="a11y-panel-footnote"><a href="/toegankelijkheid">Toegankelijkheidsverklaring</a></p>' +
      '</div>';
    document.body.appendChild(wrap);

    var btn = wrap.querySelector('#a11yToggleBtn');
    var panel = wrap.querySelector('#a11yPanel');
    var contrastBox = wrap.querySelector('#a11yContrastToggle');
    var dyslexieBox = wrap.querySelector('#a11yDyslexieToggle');
    var tekstBtns = Array.prototype.slice.call(wrap.querySelectorAll('[data-tekst]'));

    function syncUI() {
      contrastBox.checked = !!prefs.contrast;
      dyslexieBox.checked = !!prefs.dyslexie;
      tekstBtns.forEach(function (b) {
        var actief = (prefs.tekst || '') === b.getAttribute('data-tekst');
        b.setAttribute('aria-pressed', actief ? 'true' : 'false');
      });
    }
    syncUI();

    function opslaanEnToepassen() {
      bewaarPrefs(prefs);
      toepassen(prefs);
      syncUI();
    }

    function openPaneel() {
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', onKeydown);
      document.addEventListener('click', onBuitenklik, true);
      var eersteKnop = panel.querySelector('button, input');
      if (eersteKnop) eersteKnop.focus();
    }
    function sluitPaneel(focusTerug) {
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('click', onBuitenklik, true);
      if (focusTerug) btn.focus();
    }
    function onKeydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); sluitPaneel(true); }
    }
    function onBuitenklik(e) {
      if (!wrap.contains(e.target)) sluitPaneel(false);
    }

    btn.addEventListener('click', function () {
      if (panel.hidden) openPaneel(); else sluitPaneel(true);
    });
    tekstBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        prefs.tekst = b.getAttribute('data-tekst') || undefined;
        opslaanEnToepassen();
      });
    });
    contrastBox.addEventListener('change', function () {
      prefs.contrast = contrastBox.checked;
      opslaanEnToepassen();
    });
    dyslexieBox.addEventListener('change', function () {
      prefs.dyslexie = dyslexieBox.checked;
      opslaanEnToepassen();
    });
    wrap.querySelector('#a11yResetBtn').addEventListener('click', function () {
      prefs = {};
      opslaanEnToepassen();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bouwUI);
  } else {
    bouwUI();
  }
})();
