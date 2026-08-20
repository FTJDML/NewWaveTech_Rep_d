# Eigen retailfoto's — hier plaatsen

Deze map is bedoeld voor de **eigen CGI-retailfoto's**. Alle acht slots in de
pagina staan er al op aangesloten. Zolang een bestand hier niet staat, valt het
`<img>`-element automatisch terug op de placeholder-illustratie uit
`assets/img/` (via `data-fallback`, afgehandeld in `script.js`). Zodra het
bestand er staat, verschijnt de foto — zonder verdere aanpassing aan de code.

## De acht bestanden

| Bestandsnaam | Plek in de pagina | Onderwerp | Verhouding |
| --- | --- | --- | --- |
| `hero-checkout.jpg` | Hero, rechterkolom | Klant aan de kassa met telefoon in de hand | ca. 16:10, min. 1200 px breed |
| `transform-store-floor.jpg` | Domein 1 — Retail Technology Transformation, intro | Klant bekijkt kleding aan een rek | ca. 16:9, min. 1200 px breed |
| `data-ar-shopping.jpg` | Domein 2 — Retail Data, Cloud & AI, intro | AR-app op telefoon in een kledingwinkel | ca. 16:9, min. 1200 px breed |
| `operations-rituals-storefront.jpg` | Domein 3 — Retail Operations & Managed IT, intro | Winkelpui Rituals in shopping mall | ca. 16:9, min. 1200 px breed |
| `usecase-pos-scan.jpg` | Domein 1, use case "Platformselectie voor meerdere landen" | Barcode van een telefoon scannen bij de kassa | ca. 18:11, min. 800 px breed |
| `usecase-unified-commerce.jpg` | Domein 1, use case "Winkel en online in één commerce-fundament" | Buy Now Pay Later-app op de telefoon | ca. 18:11, min. 800 px breed |
| `usecase-supply-chain.jpg` | Domein 2, use case "Eén datafundament voor winkel, online en supply chain" | Pakketten op een rollenbaan | ca. 18:11, min. 800 px breed |
| `usecase-payment-terminal.jpg` | Domein 3, use case "Support over meerdere landen" | Contactloos betalen op een pinautomaat | ca. 18:11, min. 800 px breed |

## Toevoegen

Via de GitHub-webinterface: open deze map op branch
`claude/cgi-retail-consumer-prototype-sfq4ka`, kies **Add file → Upload files**,
sleep de bestanden erin met exact bovenstaande namen en commit.

Of lokaal: bestanden in deze map zetten, dan
`git add assets/img/photos && git commit && git push`.

Het mag ook stap voor stap — elk bestand dat er staat wordt getoond, de rest
blijft de illustratie.

## Let op

* De bestandsnamen moeten exact overeenkomen (kleine letters, `.jpg`).
* `object-fit: cover` staat in de CSS, dus afwijkende verhoudingen worden netjes
  gevuld zonder layout shift.
* Rechten: alleen beeld gebruiken waarvan CGI de rechten heeft. Waar een
  herkenbare winkelformule of merknaam in beeld staat — zoals de Rituals-pui —
  is dat feitelijk een klantverwijzing. Laat dat bevestigen vóór extern gebruik.
* Voor het gepubliceerde artifact (één zelfstandig HTML-bestand) worden de foto's
  als data-URI ingebed; dat gebeurt bij het opnieuw genereren van dat bestand,
  niet automatisch bij het toevoegen hier.
