# Eigen retailfoto's — hier plaatsen

Deze map is bedoeld voor de **eigen CGI-retailfoto's**. Zolang een bestand hier
niet staat, valt de pagina automatisch terug op de placeholder-illustratie uit
`assets/img/` (via `data-fallback` op het `<img>`-element in `index.html`).
Zodra het bestand er staat, verschijnt de foto — zonder verdere aanpassing.

| Bestandsnaam | Gebruikt in | Gewenste verhouding | Foto |
| --- | --- | --- | --- |
| `hero-checkout.jpg` | Hero, rechterkolom | ca. 16:10, min. 1200 px breed | Klant aan de kassa met telefoon in de hand |
| `operations-rituals-storefront.jpg` | Expertisedomein 3 — Retail Operations & Managed IT, intro | ca. 16:9, min. 1200 px breed | Winkelpui Rituals in shopping mall |
| `data-ar-shopping.jpg` | Expertisedomein 2 — Retail Data, Cloud & AI, intro | ca. 3:2, min. 1000 px breed | AR-app op telefoon in een kledingwinkel |
| `usecase-pos-scan.jpg` | Expertisedomein 1 — use case "Platformselectie voor meerdere landen" | ca. 3:2, min. 800 px breed | Barcode van een telefoon scannen bij de kassa |

## Toevoegen

Via de GitHub-webinterface: open deze map op branch
`claude/cgi-retail-consumer-prototype-sfq4ka`, kies **Add file → Upload files**,
sleep de vier bestanden erin met exact bovenstaande namen en commit.

Of lokaal: bestanden in deze map zetten, dan `git add assets/img/photos && git commit && git push`.

## Let op

* De bestandsnamen moeten exact overeenkomen (kleine letters, `.jpg`).
* `object-fit: cover` staat in de CSS, dus afwijkende verhoudingen worden netjes
  gevuld zonder layout shift.
* Rechten: alleen beeld gebruiken waarvan CGI de rechten heeft. Waar een
  herkenbare winkelformule of merknaam in beeld staat, is dat feitelijk een
  klantverwijzing — laat dat vóór extern gebruik bevestigen.
