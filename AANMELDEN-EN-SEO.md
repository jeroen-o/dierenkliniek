# Draaiboek: aanmelden en vindbaar worden

Dit is het vervolg op de technische SEO/GEO-optimalisatie. De stappen hieronder
vragen om accounts en kunnen daarom niet door een script worden uitgevoerd.
Volg de volgorde: de eerste blok levert het meeste resultaat per bestede minuut.

## Twee routes

Er zijn twee manieren om het aanmeldwerk te doen.

**Met de hand, of met Claude in Chrome.** Die extensie werkt in je eigen
browser, waar je al bent ingelogd. Kant-en-klare opdrachten om te plakken staan
in CHROME-OPDRACHTEN.md. Alleen deze route kan indexering aanvragen en een
Bedrijfsprofiel aanmaken.

**Geautomatiseerd.** Voor het terugkerende werk staat werkende code in `tools/`.
Die heeft twee sleutels nodig, zie het blok verderop. Dit blijft draaien zonder
dat er iemand hoeft te klikken, maar kan de twee dingen hierboven niet.

De routes vullen elkaar aan. Doe de eenmalige stappen in de browser en laat de
herhaling aan de automatisering over.

## Belangrijk: gebruik een domeinproperty, geen www-property

De site draait op `dierenkliniek.nl`, zonder www. Het CNAME-bestand wijst naar dat
adres, alle 1.092 pagina's dragen een canonical zonder www en in de sitemaps
staat geen enkele www-URL. GitHub Pages stuurt `www.dierenkliniek.nl` door naar
het adres zonder www.

Er bestaat in Search Console een geverifieerde property voor
`https://www.dierenkliniek.nl/`. Dat is een URL-prefix-property en die bevat
daardoor geen enkele pagina van deze site. Sitemaps die daar worden ingediend,
worden wel opgehaald maar tellen niet mee, en het rapport blijft op nul
geïndexeerde pagina's staan.

De oplossing is een **domeinproperty**: die wordt geverifieerd met een DNS-TXT-record
bij de domeinprovider en dekt www en non-www, http en https, in één keer.

1. Maak in Search Console een property van het type Domein aan voor `dierenkliniek.nl`.
2. Zet het TXT-record bij de domeinprovider, niet in Search Console.
3. Dien daar de vijf sitemaps opnieuw in.
4. Vraag indexering opnieuw aan voor de adressen zonder www.

De oude www-property mag blijven staan. De scripts in `tools/` gaan al uit van
de domeinproperty: `GSC_SITE_URL` heeft als standaardwaarde
`sc-domain:dierenkliniek.nl`.


## Vaste bedrijfsgegevens (NAP)

Gebruik deze exact gelijk op elke plek waar je Dierenkliniek.nl aanmeldt.
Afwijkingen in spelling verzwakken het entiteitssignaal naar Google en
AI-assistenten.

```
Naam      Dierenkliniek.nl
Adres     Darthuizerberg 1, 3825 BK Amersfoort
E-mail    info@dierenkliniek.nl
Telefoon  06-59115265
KvK       32109426
Website   https://dierenkliniek.nl
Logo      https://dierenkliniek.nl/logo-512.png
```

---

## Blok 1 — Zoekmachines (dag 1, circa 45 minuten)

| Waar | Wat doen | Let op |
| --- | --- | --- |
| [Google Search Console](https://search.google.com/search-console) | Domeineigendom verifiëren via DNS-TXT. Sitemap `https://dierenkliniek.nl/sitemap.xml` (opnieuw) indienen. | Verwijder eerst de oude inzending. Vraag daarna handmatige indexering aan voor `/spoedhulp`, `/kennisbank`, `/provincies` en `/glossarium`. |
| [Bing Webmaster Tools](https://www.bing.com/webmasters) | Site toevoegen, importeren uit Search Console. Sitemap indienen. | Bing voedt ChatGPT-zoekresultaten. Dit is dus ook een GEO-stap. |
| [Yandex Webmaster](https://webmaster.yandex.com) | Site toevoegen en sitemap indienen. | Klein verkeersaandeel, maar wel een extra crawler die de kennisbank ophaalt. |
| IndexNow | Niets te doen. | De sleutel staat live en de GitHub Action meldt elke wijziging automatisch aan bij Bing, Yandex en Seznam. |

De sleutel staat in de repo-root als bestand `bd61b19141f75bbbf27f47e12141d768.txt`.
Verwijder dat bestand nooit; IndexNow controleert het bij elke melding.

## Blok 2 — Bedrijfsprofielen en entiteit (week 1)

Dit blok bepaalt of Google en AI-assistenten Dierenkliniek.nl als een echte,
herkenbare organisatie zien in plaats van als een willekeurige website.

1. **Google Bedrijfsprofiel** op business.google.com. Categorie: informatiedienst
   of uitgeverij, niet dierenarts. Dierenkliniek.nl is een overzichtsplatform,
   geen kliniek; een verkeerde categorie levert klachten van echte klinieken op.
2. **Bing Places** op bingplaces.com, met dezelfde gegevens.
3. **Apple Business Connect** op businessconnect.apple.com. Dit voedt Apple Maps
   en Siri.
4. **Wikidata-item** aanmaken op wikidata.org. Dit is de sterkste GEO-stap die er
   is: taalmodellen putten zwaar uit Wikidata voor entiteitsfeiten. Vul in:
   officiële website, land, oprichtingsjaar, type (online databank),
   onderwerp (diergeneeskunde in Nederland).
5. **LinkedIn-bedrijfspagina** met exact dezelfde naam, logo en website-URL.
6. **Trustpilot** profiel claimen. Recensies daar verschijnen in AI-antwoorden op
   vragen als "is dierenkliniek.nl betrouwbaar".

Een Wikipedia-artikel is pas kansrijk als er onafhankelijke berichtgeving over
het platform bestaat. Maak er geen zelf aan zonder bronnen; dat wordt verwijderd
en schaadt het merk.

## Blok 3 — Branchegidsen en verwijzingen (week 2 tot 4)

Aanmelden bij algemene bedrijvengidsen levert weinig linkwaarde maar wel
consistentie van de bedrijfsgegevens:

- Goudengids.nl (gratis vermelding)
- Openingstijden.nl, Cylex, Bedrijvenpagina

Meer waard zijn inhoudelijke verwijzingen vanuit de sector. Benader deze met een
concreet aanbod, bijvoorbeeld de gratis badge of de provincie-overzichten:

- KNMvD (Koninklijke Nederlandse Maatschappij voor Diergeneeskunde)
- LICG (Landelijk InformatieCentrum Gezelschapsdieren)
- Dierenbescherming en Dibevo
- Faculteit Diergeneeskunde van de Universiteit Utrecht
- Regionale nieuwssites bij een nieuwswaardige publicatie uit `/statistieken`

**De badge is het beste linkbuilding-instrument dat er al ligt.** Elke kliniek
die de badge plaatst, levert een relevante inkomende link vanaf een
veterinaire website. 605 klinieken hebben een eigen badgepakket klaarstaan.
Een gerichte mailronde langs alle klinieken met de tekst "uw vermelding staat
live, hier is uw gratis badge" is waarschijnlijk meer waard dan alle
gidsvermeldingen bij elkaar.

## Blok 4 — AI-vindbaarheid (doorlopend)

Er bestaat geen aanmeldformulier voor ChatGPT, Claude, Gemini of Perplexity.
Vindbaarheid daar volgt uit drie dingen, die nu alle drie geregeld zijn:

1. **Crawlers toelaten.** Alle bekende AI-crawlers staan expliciet toegestaan in
   `robots.txt`.
2. **Content zonder JavaScript leesbaar.** Dit was het grootste probleem: de
   volledige kennisbank stond achter een `?article=`-parameter en werd
   client-side opgebouwd. Alle 64 artikelen zijn nu statische HTML.
3. **Structuur die modellen kunnen citeren.** `llms.txt` beschrijft de site,
   `llms-full.txt` bevat de complete kennisbank als platte tekst, en elke pagina
   draagt schema.org-markup met expliciete feiten.

Controleer maandelijks wat assistenten over de site zeggen. Stel in ChatGPT,
Claude, Gemini, Perplexity en Copilot dezelfde vragen:

- "Wat is de beste site om een dierenarts in Nederland te vinden?"
- "Welke dierenklinieken in Utrecht hebben 24/7 spoedhulp?"
- "Wat is dierenkliniek.nl?"

Noteert een assistent de site niet of noemt die verkeerde feiten, dan is dat een
directe aanwijzing welke pagina inhoudelijk tekortschiet.

## Blok 5 — Meten

- Search Console: let op impressies voor stad- en provinciepagina's, niet alleen
  op de homepage.
- Serververwijzingen van AI-assistenten zijn zichtbaar als referrer in de
  statistieken van GitHub Pages of een analyticspakket.
- Draai `node tools/validate.js` na elke inhoudelijke wijziging.

---

## De twee sleutels die de automatisering aanzetten

In `tools/` staat werkende code die met Google Search Console en Bing praat. Die
code doet niets tot jij twee secrets plaatst. Secrets zet je in GitHub onder
Settings, Secrets and variables, Actions, New repository secret. Ze komen nooit
in de code terecht en zijn na het opslaan ook voor jou niet meer leesbaar.

### GOOGLE_SERVICE_ACCOUNT_JSON

Een service-account is een robotaccount van Google. Je geeft dat account
leesrechten in Search Console; jouw eigen inloggegevens blijven buiten beeld.

1. Ga naar console.cloud.google.com en maak een project, bijvoorbeeld
   "dierenkliniek-seo".
2. Zet de Search Console API aan: APIs & Services, Library, zoek op
   "Google Search Console API", klik Enable.
3. Maak een service-account: IAM & Admin, Service Accounts, Create. Een naam
   volstaat, rollen kun je overslaan.
4. Open het service-account, tabblad Keys, Add key, Create new key, type JSON.
   Er wordt een bestand gedownload.
5. Kopieer het e-mailadres van het service-account. Dat eindigt op
   `.iam.gserviceaccount.com`.
6. Ga naar Search Console, Instellingen, Gebruikers en machtigingen, Gebruiker
   toevoegen. Plak dat e-mailadres. Kies **Eigenaar** als je wilt dat de
   automatisering ook sitemaps mag indienen; **Volledig** volstaat voor alleen
   rapportage.
7. Plak de **volledige inhoud** van het JSON-bestand als secret
   `GOOGLE_SERVICE_ACCOUNT_JSON`. Verwijder daarna het gedownloade bestand van
   je computer.

Testen: Actions, Zoekprestaties ophalen, Run workflow.

### BING_WEBMASTER_API_KEY

1. Ga naar bing.com/webmasters, Instellingen, API-toegang, API-sleutel.
2. Plak de sleutel als secret `BING_WEBMASTER_API_KEY`.

Zonder deze sleutel slaat de workflow het Bing-gedeelte over zonder te falen.
IndexNow bereikt Bing sowieso al, dus dit is aanvullend, geen vervanging.

### Wat de automatisering daarna doet

Elke maandagochtend, en verder op elk moment dat jij de workflow handmatig
start:

| Stap | Resultaat |
| --- | --- |
| Sitemaps opnieuw indienen | Google en Bing halen de actuele 1.098 URL's op |
| Indexeringsstatus kernpagina's | Zichtbaar in het logboek van de workflow |
| Prestatierapport | JSON in `rapporten/`, gesplitst per sectie |

Het rapport splitst klikken en vertoningen uit naar kennisbank, stadpagina's,
provinciepagina's, kliniekpagina's en spoedhulp. Zo zie je welk deel van de
nieuwe structuur aanslaat en welk deel aandacht nodig heeft.

### Handmatig draaien

```bash
export GOOGLE_SERVICE_ACCOUNT_JSON="$(cat ~/Downloads/sleutel.json)"
node tools/search-console.js sitemaps    # status van de ingediende sitemaps
node tools/search-console.js indienen    # sitemaps opnieuw indienen
node tools/search-console.js rapport     # prestatierapport wegschrijven
node tools/search-console.js inspect     # indexeringsstatus kernpagina's
```

### Wat een API niet kan

Handmatige indexering aanvragen, de knop "Verzoek om indexering" in Search
Console, bestaat alleen in de interface. Die vier verzoeken uit fase 1 moet je
dus zelf doen. Hetzelfde geldt voor domeinverificatie en voor het aanmaken van
een Google Bedrijfsprofiel.

---

## Onderhoud

De datasets staan in `index.html` (`CLINICS`, `KB_ARTICLES`, `GLOSSARIUM`).
Wijzig daar, en draai daarna:

```bash
node tools/build.js      # genereert alle statische pagina's, sitemaps en llms-bestanden
node tools/validate.js   # controleert canonicals, titels, schema en interne links
git add -A && git commit -m "…" && git push
```

De GitHub Action meldt de gewijzigde URL's daarna automatisch aan bij IndexNow.

## Bewuste keuze: geen sterbeoordelingen in de markup

De dataset bevat per kliniek een cijfer en een aantal beoordelingen. Die zijn
**niet** als `aggregateRating` in de schema.org-markup gezet, en dat is opzettelijk.
Google staat beoordelingsmarkup alleen toe als de beoordelingen op de pagina zelf
zichtbaar zijn en door het platform zelf zijn verzameld. Overgenomen cijfers van
elders markeren leidt tot een handmatige maatregel voor de hele site, en dat weegt
niet op tegen de sterretjes in de zoekresultaten.

Wil je die sterren wel, dan is de route: zelf beoordelingen verzamelen via een
eigen formulier, ze zichtbaar op de kliniekpagina tonen, en dan pas markeren.
