# Dierenkliniek.nl

Statische site op GitHub Pages: een overzicht van dierenklinieken in Nederland,
met zoeken op postcode, een spoedoverzicht en een kennisbank.

Live op https://dierenkliniek.nl

## Hoe de site is opgebouwd

`index.html` is de hele applicatie: opmaak, logica en data in één bestand. De
datasets staan er als JavaScript-array in:

| Variabele | Inhoud |
| --- | --- |
| `CLINICS` | 605 klinieken met adres, contactgegevens en specialisaties |
| `KB_ARTICLES` | 64 kennisbankartikelen |
| `GLOSSARIUM` | 40 veterinaire termen |

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

Pas de data aan in `index.html` en draai daarna:

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
| `extract-data.js` | leest de datasets uit `index.html` |
| `layout.js` | gedeelde opmaak, header, footer en schema-helpers |
| `build-kennisbank.js` | 78 kennisbankpagina's |
| `build-paginas.js` | spoedhulp, provincies en glossarium |
| `build-vertrouwenspaginas.js` | over ons, onafhankelijkheid, contact, partners |
| `enrich-klinieken.js` | voegt FAQ en schema toe aan kliniek- en stadpagina's |
| `fix-links.js` | wijst interne links naar de canonieke URL |
| `build-sitemaps.js` | vier sitemaps plus de index |
| `build-llms.js` | `llms.txt` en `llms-full.txt` voor AI-assistenten |
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

## Let op

Het IndexNow-sleutelbestand in de repo-root (`bd61b19141f75bbbf27f47e12141d768.txt`)
moet blijven staan. Zoekmachines controleren het bij elke melding.
