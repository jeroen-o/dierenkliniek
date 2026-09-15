# Dierenkliniek.nl

Statische site op GitHub Pages: een overzicht van dierenklinieken in Nederland,
met zoeken op postcode, een spoedoverzicht en een kennisbank.

Live op https://dierenkliniek.nl

## Hoe de site is opgebouwd

`index.html` bevat de applicatie: opmaak, logica en het grootste deel van de data.

| Waar | Inhoud |
| --- | --- |
| `index.html` → `CLINICS` | 605 klinieken met adres, contactgegevens en specialisaties |
| `index.html` → `GLOSSARIUM` | 40 veterinaire termen |
| `data/kennisbank.json` | 64 artikelen met volledige tekst |
| `data/openingstijden.json` | openingstijden per kliniek, met slug als sleutel |

De artikelen staan bewust apart. Hun volledige tekst is 220 kB en werd vroeger
bij elk bezoek aan de homepage meegeladen, terwijl diezelfde tekst ook als
statische pagina bestaat. `index.html` houdt nu alleen een lichte index over
(titel, samenvatting en de eerste zinnen om op te zoeken); `tools/sync-index-kb.js`
houdt die gelijk aan het databestand.

Daaromheen staan ruim duizend statische pagina's die uit diezelfde data worden
gegenereerd. Reden: zoekmachines en AI-assistenten moeten de inhoud kunnen lezen
zonder JavaScript uit te voeren.

| Wat | Aantal | Voorbeeld |
| --- | --- | --- |
| Kliniekpagina's | 605 | `/dierenkliniek-vondelpark-dierenarts-in-amsterdam` |
| Stadpagina's | 369 | `/dierenarts-amsterdam` |
| Provinciepagina's | 12 | `/dierenklinieken-utrecht` |
| Kennisbank | 78 | `/kennisbank/wanneer-is-iets-echt-een-spoedgeval` |
| Specialismen | 12 | `/specialisme-cardiologie` |
| Overig | 12 | `/spoedhulp`, `/over-ons`, `/glossarium` |

## Werkwijze bij een wijziging

Pas de data aan in `index.html` (klinieken, glossarium) of in
`data/kennisbank.json` (artikelen) en draai daarna:

```bash
node tools/build.js      # genereert alle pagina's, sitemaps en llms-bestanden
node tools/validate.js   # controleert canonicals, titels, schema en interne links
```

Commit en push pas als de validatie schoon doorloopt. Handmatig bewerken van een
gegenereerde pagina heeft geen zin: de volgende build overschrijft het.

## De scripts

| Bestand | Doet |
| --- | --- |
| `build.js` | draait alle onderstaande bouwstappen op volgorde |
| `extract-data.js` | leest de datasets uit `index.html` en `data/kennisbank.json` |
| `sync-index-kb.js` | schrijft de lichte kennisbank-index terug in `index.html` |
| `layout.js` | gedeelde opmaak, header, footer en schema-helpers |
| `build-kennisbank.js` | 78 kennisbankpagina's |
| `build-paginas.js` | spoedhulp, provincies en glossarium |
| `build-vertrouwenspaginas.js` | over ons, onafhankelijkheid, contact, partners |
| `enrich-klinieken.js` | voegt FAQ en schema toe aan kliniek- en stadpagina's |
| `fix-links.js` | wijst interne links naar de canonieke URL |
| `build-sitemaps.js` | vier sitemaps plus de index |
| `build-llms.js` | `llms.txt` en `llms-full.txt` voor AI-assistenten |
| `openingstijden.js` | leest, controleert en rendert openingstijden |
| `import-openingstijden.js` | sjabloon maken en ingevulde CSV inlezen |
| `validate.js` | controleert de hele site |
| `indexnow.js` | meldt wijzigingen bij Bing, Yandex en Seznam |
| `search-console.js` | sitemaps, indexeringsstatus en prestatierapport bij Google |
| `bing-webmaster.js` | sitemaps en URL-batches bij Bing |

## Workflows

| Workflow | Wanneer | Wat |
| --- | --- | --- |
| `indexnow.yml` | elke push naar main | meldt gewijzigde URL's aan bij Bing, Yandex en Seznam |
| `zoekprestaties.yml` | maandagochtend | dient sitemaps in en schrijft een rapport naar `rapporten/` |

De tweede workflow wacht op twee secrets en slaat zichzelf over zolang die
ontbreken. Zie `AANMELDEN-EN-SEO.md`.

## Verder lezen

- `AANMELDEN-EN-SEO.md` bevat het draaiboek voor zoekmachines, bedrijvengidsen
  en AI-vindbaarheid, plus de instelstappen voor de twee sleutels.
- `CHROME-OPDRACHTEN.md` bevat kant-en-klare opdrachten voor de dingen die
  alleen in een ingelogde browser kunnen.

## Openingstijden

De tijden staan in `data/openingstijden.json` met de kliniek-slug als sleutel.
Een dag mag meerdere blokken hebben (`09:00-12:00, 13:00-18:00`); `gesloten`
betekent dicht en een ontbrekende dag betekent onbekend.

Een regel telt pas als bevestigd wanneer er een `bron` in staat en `onbevestigd`
ontbreekt. Dat onderscheid bepaalt wat er gebeurt:

| | Zichtbaar op de pagina | In schema.org |
| --- | --- | --- |
| Bevestigd (met `bron`) | tabel plus bronvermelding | ja |
| Onbevestigd | tabel plus waarschuwing "bel eerst" | nee |

Onbevestigde tijden gaan bewust niet het schema in. Google bouwt daar de
"nu open"-labels op, en die mogen niet op een aanname rusten: iemand rijdt er
met een ziek dier op af.

Tijden verzamelen gaat via een CSV:

```bash
node tools/import-openingstijden.js sjabloon                        # invulbestand met alle klinieken
node tools/import-openingstijden.js import data/openingstijden-sjabloon.csv
node tools/import-openingstijden.js status                          # hoeveel er bekend zijn
```

Vul bij een bevestigde regel de kolom `bron` in, bijvoorbeeld
"opgave kliniek per e-mail, 2026-10-03". Daarmee verdwijnt de waarschuwing en
komt de kliniek in aanmerking voor de "nu open"-weergave in Google.

## Let op

Het IndexNow-sleutelbestand in de repo-root (`bd61b19141f75bbbf27f47e12141d768.txt`)
moet blijven staan. Zoekmachines controleren het bij elke melding.
