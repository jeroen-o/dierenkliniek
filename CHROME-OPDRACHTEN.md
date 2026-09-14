# Opdrachten voor Claude in Chrome

De Chrome-extensie werkt in jouw eigen browser, waar je al bent ingelogd bij
Google en Bing. Daardoor kan die wel klikken op plekken die een losse sessie
niet kan bereiken.

Open de extensie op het juiste tabblad en plak de opdracht die je nodig hebt.
Kijk mee tijdens het uitvoeren: deze accounts bevatten instellingen die je site
uit de zoekresultaten kunnen halen als er iets misgaat.

Alles hieronder gaat over het domein **dierenkliniek.nl**.

---

## 1. Google Search Console

Open eerst https://search.google.com/search-console en plak dan:

```
Ik werk aan de property dierenkliniek.nl in Google Search Console.

Voer deze stappen uit en meld na elke stap wat je ziet:

1. Controleer of dierenkliniek.nl als property bestaat. Zo niet, meld dat en
   stop, want verificatie moet ik zelf via DNS doen.

2. Ga naar Sitemaps. Verwijder bestaande inzendingen die een fout of
   waarschuwing tonen. Dien daarna deze vijf sitemaps in:
     sitemap.xml
     sitemap-hoofdpaginas.xml
     sitemap-artikelen.xml
     sitemap-steden.xml
     sitemap-klinieken.xml
   De sitemap-index bevat 1098 URL's.

3. Gebruik de URL-inspectie en vraag indexering aan voor deze vier adressen,
   een voor een. Wacht per adres tot de test klaar is:
     https://dierenkliniek.nl/spoedhulp
     https://dierenkliniek.nl/kennisbank
     https://dierenkliniek.nl/provincies
     https://dierenkliniek.nl/over-ons

4. Open Instellingen en dan Gebruikers en machtigingen. Meld welke gebruikers
   er staan en met welke rechten. Voeg niemand toe.

5. Open het rapport Pagina's onder Indexering. Meld de tien grootste redenen
   waarom pagina's niet geïndexeerd zijn, met het aantal per reden.

Wijzig verder niets. Verwijder geen property, verander geen instellingen voor
land, domeinvoorkeur of verwijderingsverzoeken.
```

Stap 3 is het belangrijkst. Het aanvragen van indexering bestaat alleen in deze
interface en kan door geen enkele API worden gedaan.

---

## 2. Bing Webmaster Tools

Open eerst https://www.bing.com/webmasters en plak dan:

```
Ik werk aan dierenkliniek.nl in Bing Webmaster Tools.

1. Controleer of de site is toegevoegd. Zo niet, gebruik de optie om te
   importeren uit Google Search Console en meld wat er gebeurt.

2. Ga naar Sitemaps en dien in:
     https://dierenkliniek.nl/sitemap.xml

3. Ga naar Instellingen en dan API-toegang. Meld of er al een API-sleutel
   bestaat. Maak er geen aan en toon de sleutel niet.

4. Open IndexNow onder Configureren. Meld of Bing de sleutel van de site
   herkent. Het sleutelbestand staat op
   https://dierenkliniek.nl/bd61b19141f75bbbf27f47e12141d768.txt

5. Open het rapport Site-scan en meld de belangrijkste bevindingen.
```

---

## 3. Google Bedrijfsprofiel

Open eerst https://business.google.com en plak dan:

```
Ik maak een Google Bedrijfsprofiel aan voor Dierenkliniek.nl.

Belangrijk: dit is een informatieplatform over dierenklinieken, geen
dierenartsenpraktijk. Kies als categorie iets in de richting van uitgeverij,
internetbedrijf of informatiedienst. Kies uitdrukkelijk NIET dierenarts of
dierenkliniek, want dat is misleidend voor mensen die zorg zoeken.

Gebruik exact deze gegevens:
  Naam       Dierenkliniek.nl
  Adres      Darthuizerberg 1, 3825 BK Amersfoort
  Telefoon   06-59115265
  Website    https://dierenkliniek.nl
  E-mail     info@dierenkliniek.nl

Loop het aanmaakproces door tot het punt waarop verificatie wordt gevraagd.
Stop daar en meld welke verificatiemethoden worden aangeboden.

Vul niets in waar je naar moet raden. Vraag het mij.
```

---

## 4. Wikidata

Dit is de sterkste stap voor vindbaarheid in AI-assistenten. Taalmodellen putten
zwaar uit Wikidata voor feiten over organisaties.

Open eerst https://www.wikidata.org en plak dan:

```
Ik wil een Wikidata-item aanmaken voor Dierenkliniek.nl.

Zoek eerst of er al een item bestaat voor dierenkliniek.nl. Zo ja, meld het
Q-nummer en stop.

Bestaat het nog niet, maak dan een item met:
  Label (nl)        Dierenkliniek.nl
  Beschrijving (nl) Nederlandse online gids van dierenartsenpraktijken
  Label (en)        Dierenkliniek.nl
  Beschrijving (en) Dutch online directory of veterinary practices

Eigenschappen:
  instance of (P31)          online database
  country (P17)              Netherlands
  official website (P856)    https://dierenkliniek.nl
  language of work (P407)    Dutch
  headquarters location      Amersfoort

Voeg geen claims toe die je niet uit de website zelf kunt afleiden. Wikidata
verwijdert items zonder bron, dus verzin niets over oprichtingsjaar, omvang of
bezoekersaantallen.
```

---

## Wat de extensie niet kan overnemen

Domeinverificatie via DNS gaat bij je domeinprovider, niet in Search Console.
Zet daar een TXT-record dat Google je geeft. Dat is eenmalig en blijft geldig
als de site ooit verhuist.

## Liever niet klikken maar automatiseren

Voor het terugkerende werk, sitemaps opnieuw indienen en prestatiecijfers
ophalen, staat werkende code klaar in `tools/`. Die heeft alleen twee sleutels
nodig. Zie AANMELDEN-EN-SEO.md, het blok over de twee sleutels. Dat blijft
draaien zonder dat er iemand hoeft te klikken.
