# CGI Retail & Consumer Services — managementprototype

High-fidelity, werkend prototype van een vernieuwde **CGI Retail & Consumer
Services**-pagina (NL). Bedoeld om de voorgestelde herinrichting te presenteren
aan het managementteam van CGI Retail & Consumer Services.

> **Management concept — niet voor publicatie.** Alle conceptcontent is in de
> pagina zichtbaar gelabeld. Er worden geen gegevens verzonden; alle formulieren
> zijn niet-functioneel.

## Openen

```
index.html      ← dubbelklikken of openen in de browser
styles.css
script.js
assets/         ← SVG-placeholders (logo, beeld, avatar, partnerlogo, favicon)
README.md
```

Geen buildstap, geen frameworks, geen externe requests. Werkt lokaal via
`file://` en op elke statische host (bijv. GitHub Pages).

---

## Visuele bron: screenshots van de live EN-pagina

De styling is overgenomen van **https://www.cgi.com/en/retail-consumer-services**,
op basis van paginascreenshots (desktop) die door de opdrachtgever zijn
aangeleverd. `cgi.com` is vanuit deze omgeving niet bereikbaar — de
netwerk-gateway weigert het domein met een 403 op CONNECT, voor curl, WebFetch
én headless Chromium. De HTML/CSS en de originele assets konden dus niet worden
ingelezen; alles hieronder is uit de beelden afgeleid.

### Wat één-op-één is overgenomen

| Element | Overgenomen |
| --- | --- |
| Header | Witte balk, rood CGI-logo links, `Services / Industries / Insights / Careers / Investors` met chevrons, zoekicoon, rechts `Contact ǀ 🌐 Global ǀ EN` met verticale scheidingslijnen |
| Kleurgebruik | Paars als dominante kleur voor álle koppen, cijfers en linkteksten; rood alleen in logo en gradient |
| Gradient | Rood → magenta → paars, verticaal in de balken naast statistieken en capabilities, diagonaal in het hero-blok |
| Cards | Platte, lichte lavendelblokken: geen schaduw, geen border, geen border radius |
| Hero | Links tekst op grijs vlak, rechts beeld tot de paginarand, gradient-blok over de onderhoek van het beeld |
| Voice of Our Clients | Lavendel band, gecentreerde kop met vetgezette aanloop, drie kolommen met gradientbalk links, groot paars cijfer |
| Capabilities | Accordionrijen in lavendel met magenta plus-icoon, gradientlijn links van de stapel |
| Contentcards | Beeld boven, type-label, paarse titel, lange dunne pijl onderaan; sectiekop "News and thought leadership", afsluitend "See more →" |
| Typografie | Sentence case, koppen in medium gewicht, geen uppercase eyebrows |
| CTA-vorm | Arrow-link met lange dunne pijl als primaire linkvorm |
| Footer | Gradientband "How can we help?" met witte pill-button, daaronder drie vlakken: wit (logo, tagline, bedrijfstekst, "Learn more about CGI →", copyright), grijs (Company / Resource center / Support) en lavendel (Discover more about CGI, Subscribe-button, Follow us met LinkedIn/X/YouTube/Facebook) |
| Buttons | Pill-vorm — het enige element op de site met ronde hoeken. Wit met paarse tekst op de gradient, paars met witte tekst op licht |
| VOOC-cijfers | `#1`, `78%`, `68%`, `209 klantgesprekken` — letterlijk van de live pagina, inclusief de bijbehorende claimregels (Engelse origineel staat als commentaar in `index.html`) |
| Capability-labels | `Managed IT services`, `Store operations`, `E-commerce`, `Point-of-sales (POS)`, `Omnichannel customer experience`, `Data-driven retail and AI`, `IT modernization/cloud migration`, `Supply chain agility and optimization`, `Sustainable retail` |

### Wat nog niet is geverifieerd

| Wat | Status | Waar te wijzigen |
| --- | --- | --- |
| Webfont | CGI gebruikt een humanistische sans (Effra-achtig). `Effra` staat vooraan in de stack, met `Source Sans 3` uit Google Fonts als vrij substituut. | `styles.css` → `--font-sans` |
| Exacte kleurwaarden | Uit de screenshots gesampled, niet uit de CSS gelezen. CGI-rood is wel hard: Pantone 186C / `#E31937`. | `styles.css` → `:root` |
| Contentbreedte | Op de screenshots loopt de content vrijwel tot de paginarand; hier `1600px` met smalle gutters. | `styles.css` → `--container` |
| Mobiel gedrag | Alleen desktopscreenshots ontvangen; de responsive opbouw is een aanname binnen dezelfde stijl. | `styles.css`, media queries |

### Twee bewuste keuzes

1. **Header in het Engels, body in het Nederlands.** De shell is exact overgenomen
   van de EN-pagina die als designbron is aangewezen; de inhoud blijft Nederlands
   omdat het prototype voor een NL-publiek en een NL-MT is bedoeld. Voor de echte
   NL-pagina worden dit de Nederlandse menulabels.
2. **De hero-headline is over H1 en subregel verdeeld** — "Retailtechnologie die
   werkt" / "Van strategie tot winkelvloer" — omdat de live pagina exact dat
   patroon gebruikt (`Retail, consumer & services` / `Helping you deliver on your
   brand promise`). De inhoud van de gevraagde headline blijft daarmee intact.

## Beeldmateriaal in het prototype

Er zijn twee soorten beeld:

**1. Eigen CGI-retailfoto's** — acht slots staan aangesloten op
`assets/img/photos/`. Zolang een bestand daar nog niet staat, valt het
`<img>`-element automatisch terug op de placeholder-illustratie
(`data-fallback`, afgehandeld in `script.js`). Zodra de foto in de map staat,
verschijnt hij — zonder verdere aanpassing aan de code.

| Bestand | Plek in de pagina | Onderwerp |
| --- | --- | --- |
| `hero-checkout.jpg` | Hero, rechterkolom | Klant aan de kassa met telefoon in de hand |
| `transform-store-floor.jpg` | Domein 1 — Retail Technology Transformation | Klant bekijkt kleding aan een rek |
| `data-ar-shopping.jpg` | Domein 2 — Retail Data, Cloud & AI | AR-app op telefoon in een kledingwinkel |
| `operations-rituals-storefront.jpg` | Domein 3 — Retail Operations & Managed IT | Winkelpui Rituals in shopping mall |
| `usecase-pos-scan.jpg` | Domein 1, use case platformselectie | Barcode van een telefoon scannen bij de kassa |
| `usecase-unified-commerce.jpg` | Domein 1, use case unified commerce | Buy Now Pay Later-app op de telefoon |
| `usecase-supply-chain.jpg` | Domein 2, use case datafundament | Pakketten op een rollenbaan |
| `usecase-payment-terminal.jpg` | Domein 3, use case support | Contactloos betalen op een pinautomaat |

Zie `assets/img/photos/README.md` voor de exacte bestandsnamen en het toevoegen
ervan. **Let op:** waar een herkenbare winkelformule of merknaam in beeld staat,
is dat feitelijk een klantverwijzing — laat dat bevestigen vóór extern gebruik.

**2. Gegenereerde placeholder-illustraties** in de CGI-merkkleuren
(`assets/img/`, aangemaakt door `tools/make-placeholders.js`) voor alle overige
posities. Ze zijn er om de pagina als demo vol en afgemaakt te laten aanvoelen;
het is uitdrukkelijk geen definitieve fotografie. Iedere illustratie draagt
linksboven een klein `placeholder`-vlaggetje. Deze omgeving heeft geen toegang
tot beeldbanken en een gepubliceerd artifact mag geen externe hosts laden — vandaar
gegenereerd in plaats van stock.

| Plek | Bestand | Verhouding |
| --- | --- | --- |
| Hero (terugval) | `hero-store.svg` | 8:5 |
| Domein-intro's (terugval) | `transform-consulting.svg`, `data-dashboard.svg`, `operations-field.svg` | 16:9 |
| Use cases (9×) | `usecase-*.svg` | 18:11 |
| Frameworks | `framework.svg` | 16:10 |
| Cases, events, insights, careers | `card-*.svg`, `event.svg`, `careers.svg` | 43:25 |
| Experts, user stories | `avatar-placeholder.svg` | 1:1 |
| Partner- en klantlogo's | `partner-placeholder.svg` | neutraal, gestippeld kader |

Alle verhoudingen liggen vast in de CSS (`object-fit: cover`), dus vervangen
geeft geen layout shift.

## Beeldbeheer op de gepubliceerde pagina

Op de artifact-URL staat bovenaan een uitklapbaar paneel **Beeldbeheer** waarmee
de eigenaar zelf foto's kan plaatsen, zonder tussenkomst van code:

1. per plek een bestand kiezen;
2. de pagina verkleint het beeld in de browser (max. 1800 px breed, JPEG q0.82);
3. het beeld komt direct op zijn plek te staan;
4. de pagina publiceert zichzelf opnieuw op dezelfde URL, zodat iedereen met de
   link de foto ziet.

Technisch: `photo-admin.js` bewaart de beelden als data-URI in het JSON-blok
`#photo-store` in de pagina zelf en roept `claude.use("artifact").publish()` aan
met een complete, opgeschoonde vervangende pagina. Er gaat niets naar een externe
server. De knop *Alle foto's downloaden met de juiste bestandsnaam* levert de
verkleinde bestanden terug met exact de namen die `assets/img/photos/` verwacht,
zodat ze eenvoudig in de repo te zetten zijn.

Het paneel verschijnt alleen wanneer de pagina als artifact draait én de
weergave schrijfrechten heeft; lokaal en in een productieversie blijft het
verborgen. Verwijder voor productie het blok `#photo-admin`, `photo-admin.js` en
het bijbehorende CSS-blok.

**Let op bij de volgorde:** publiceert de pagina zichzelf (na een upload) en
publiceer ik daarna opnieuw vanuit de repo, dan overschrijft die publicatie de
via het paneel geplaatste foto's. Zet de foto's daarom ook in
`assets/img/photos/`, of laat het weten vóór een nieuwe publicatie vanuit de repo.

## Opbouw per expertisedomein

De drie domeinen staan niet meer in één doorlopend gekleurd blok. Elk domein
heeft nu een **eigen band** met een vaste, scanbare opbouw:

1. intro in twee kolommen: vraagstuk en CGI point of view naast een beeld;
2. capabilities (accordion met gradientlijn) naast klantuitkomsten, bewijs en de
   concrete eerste stap;
3. **Use cases** — drie tegels met beeld, thema en één regel uitleg;
4. **User story** — quote met placeholder-attributie, naast een **framework**-blok
   met visual en aanvraag-CTA;
5. **Klanten binnen dit domein** — vier logo-placeholders.

Ieder subblok heeft een kop met daarnaast een conceptmarkering, zodat in één
oogopslag duidelijk is wat nog vervangen moet worden. De use cases bevatten
bewust **geen aantallen of percentages**: ze beschrijven het type vraagstuk, niet
een resultaat.

Nieuw te vervangen bij productie: negen use cases, drie user-story-quotes met
attributie, drie frameworks en twaalf klantlogo's (alleen met schriftelijke
goedkeuring).

## A. Wat is behouden?

* **CGI-shell**: utility bar, header met logo, hoofdnavigatie (`Wat we doen`,
  `Sectoren`, `Insights`, `Carrières`, `Over ons`), zoekicoon en Contact-button.
  Geen globale menu-items toegevoegd, verwijderd of hernoemd.
* **CGI-footer**: linkgroepen, nieuwsbriefcomponent, socialmedia-links,
  juridische links (privacyverklaring, cookiebeleid, juridische informatie,
  toegankelijkheid, sitemap) en copyright.
* **Visuele stijl**: witte basis, ruime witruimte, rood als enige accentkleur,
  rechte hoeken, squared buttons, tinted secties als ritme, geen gradients,
  geen animatie-effecten buiten hover en accordion.
* **Bestaande designcomponenten**: breadcrumb, eyebrow + heading + lead,
  cardgrids van drie, statistiekenblok met bronvermelding, accordion, filterchips,
  donker CTA-paneel, contentcards met contenttype-label.
* **Bestaande, goedgekeurde content**: de Voice of Our Clients-cijfers, de IDC
  MarketScape-erkenning en drie bestaande CGI-contentitems met hun echte URL's.
* **Eén pagina**: alles staat op één lange one-pager. Geen nieuwe
  landingspagina's, subsites of aparte pagina's per expertisedomein.

## B. Wat is veranderd?

| Onderdeel | Verandering |
| --- | --- |
| **Hero** | Één overkoepelende belofte (“Retailtechnologie die werkt — van strategie tot winkelvloer”), korte propositie, primaire + secundaire CTA. |
| **Claimstrip** | Direct onder de hero — de drie expertisedomeinen zijn binnen het eerste zichtbare deel van de pagina herkenbaar en aanklikbaar. |
| **Ankerbalk** | Compacte, sticky in-page navigatie (6 ankers) met markering van de actieve sectie. |
| **Marktblok** | Kort marktverhaal + bestaande VOOC-cijfers met bronverwijzing, in plaats van een brede algemene introductie. |
| **Drie claims** | Visueel gelijkwaardige cards die samen één verhaal vertellen: **Transform → Create value → Run**. |
| **Verdieping per claim** | Vaste structuur per domein: klantprobleem → CGI point of view → capabilities (accordion) → klantuitkomsten → bewijs → eerste stap → CTA. |
| **Klantcases** | Drie conceptcases met identieke opbouw (vraagstuk, aanpak, illustratief resultaat), uitklapbaar. |
| **Entry offerings** | Drie concrete, laagdrempelige startpunten (review, value scan, benchmark) met formuliermodal. |
| **Insights & research** | Zes contentcards met filter op expertisedomein + één conceptonderzoek. |
| **Events** | Drie conceptformats met doelgroep en periode. |
| **Partners** | Compacte sectie over oplossingsonafhankelijkheid met neutrale logo-placeholders. |
| **Experts** | Eén gezicht per expertisedomein met contact-CTA (namen nog als placeholder). |
| **Vacatures** | Nieuwe, vaste sectie met drie dummyvacaturecards en een algemene careers-CTA. |
| **CTA's** | Meerdere relevante, sectie-specifieke CTA's in plaats van alleen een algemeen contactblok. |

## C. Welke content is dummy?

Alle onderstaande items zijn in de pagina zichtbaar gelabeld en in de HTML
gemarkeerd met een commentaar (`REPLACE`, `VERIFY`, `PLACEHOLDER`).

**Conceptcases** — label *“Conceptvoorbeeld — te vervangen door goedgekeurde CGI-klantcase”*
1. Van versnipperde initiatieven naar één bestuurbare retail technology roadmap
2. Van veelbelovende AI-pilots naar toepassingen die dagelijks worden gebruikt
3. Eén supportmodel voor een complexe internationale winkeloperatie

**Concept offerings** — label *“Concept offering”*
1. Retail Technology Transformation Review
2. Retail Data & AI Value Scan
3. Retail IT Operations Benchmark

**Conceptartikelen** — label *“Concept content”*
1. Van AI-pilot naar meetbare retailwaarde (artikel)
2. Waarom retailtransformaties vastlopen tussen strategie en uitvoering (viewpoint)
3. The Always-On Store (executive brief)

**Conceptonderzoek** — label *“Concept voor toekomstige ontwikkeling — nog niet gepubliceerd onderzoek”*
* CGI Retail Technology Outlook 2027

**Conceptevents** — label *“Concept event — datum en programma nog te bevestigen”*
1. Executive roundtable: AI voorbij de pilotfase (november 2026)
2. Retail Operations Breakfast: The Always-On Store (Q1 2027)
3. CGI Retail Technology Outlook (Q2 2027)

**Expertplaceholders** — label *“Placeholder — naam, functietitel, foto en contactgegevens nog aan te leveren”*
* Chris `[achternaam]` — Retail Technology Transformation & Business Consulting
* Floris `[achternaam]` — Retail Data, Cloud & AI
* `[volledige naam JK]` — Retail Operations & Managed IT Services

Achternamen, functietitels en LinkedIn-URL's zijn **niet** verzonnen; ze staan als
zichtbare placeholder-token in de pagina. De korte biografieën zijn conceptteksten
op basis van het expertisedomein en moeten door de betrokkenen worden bevestigd.

**Dummyvacatures** — label *“Dummy vacature — niet daadwerkelijk openstaand”*
1. Senior Retail Business Consultant — Retail Technology Transformation
2. Data & AI Consultant — Retail — Retail Data, Cloud & AI
3. Service Manager / SIAM Consultant — Retail Operations & Managed IT

**Overige placeholders**
* Logo (`assets/cgi-logo.svg`, `assets/cgi-logo-invert.svg`) — neutrale tekstuele
  weergave, géén officieel merkasset.
* Hero-beeld (`assets/placeholder-retail.svg`) — 4:3, zelfde verhouding als een
  definitief beeld, zodat er geen layout shift ontstaat.
* Expertfoto's (`assets/avatar-placeholder.svg`) en partnerlogo's
  (`assets/partner-placeholder.svg`).
* Alle formulieren: modal, nieuwsbrief. Submit toont uitsluitend de melding
  *“Dit is een managementprototype. Er zijn geen gegevens verzonden.”*

**Wat expliciet niet is gedaan** (§21): geen echte klantnamen of klantlogo's,
geen verzonnen omzet-, kosten- of besparingspercentages, geen conceptresultaten
gepresenteerd als feit (alles staat als *illustratief resultaat*), geen
ongeverifieerde partnerlogo's, geen niet-bestaand onderzoek als gepubliceerd
gepresenteerd, geen dummyvacature die op een echte openstaande functie lijkt.

## D. Wat moet voor productie worden aangeleverd?

1. **Definitieve teksten** — eindredactie hero, marktblok, claims en verdieping.
2. **Goedgekeurde klantcases** — inclusief schriftelijke toestemming voor
   klantnaam en/of logo, of geanonimiseerde variant.
3. **Klantlogo's** — alleen met bestaande publieke toestemming.
4. **Resultaten en metrics** — geverifieerde, door de klant goedgekeurde cijfers
   ter vervanging van de illustratieve resultaten.
5. **Definitieve expertprofielen** — volledige namen, functietitels, foto's,
   biografieën, LinkedIn-URL's en de gewenste contactroute.
6. **Actuele vacatures** — feed of handmatige selectie uit het centrale
   CGI-vacaturesysteem, inclusief locatie en ervaringsniveau.
7. **Downloads en frameworks** — de daadwerkelijke review-, scan- en
   benchmark-onepagers achter de offering-CTA's.
8. **Eventdata** — definitieve datum, locatie, programma en inschrijfroute.
9. **Fotografie / video** — bestaande CGI-retailassets voor hero en secties.
10. **Goedgekeurde CTA's** — definitieve labels en bestemmingen (formulier,
    Marketo/CMS-formulier of mailto).
11. **Technische formulierkoppelingen** — koppeling naar het bestaande
    CGI-formulier- en consentmechanisme, inclusief privacytekst.
12. **VOOC-cijfers** — bevestiging van jaartal, exacte percentages en
    bronvermelding zoals die op de live pagina staan.

## E. CMS-aannames

**Waarschijnlijk te bouwen met bestaande CGI-componenten**

| Sectie | Component-aanname |
| --- | --- |
| Header, utility bar, footer | Bestaande globale shell — ongewijzigd. |
| Hero | Bestaande hero met eyebrow, heading, tekst, twee CTA's en beeld/video. |
| Marktblok + statistieken | Tekstblok + bestaand statistiek-/cijfercomponent met bronregel. |
| Drie claim-cards | Bestaand 3-koloms cardcomponent (titel, tekst, link). |
| Verdieping per claim | Twee-koloms tekstblok + bestaand accordioncomponent. |
| Cases, offerings, events, insights, vacatures | Bestaand cardgrid-component met contenttype-label en CTA. |
| Contactsectie | Bestaand donker CTA-paneel met twee buttons. |
| Formulieren | Bestaand CGI-formuliercomponent in een modal of op een aparte laag. |

**Mogelijk maatwerk**

* De **claimstrip** onder de hero (drie korte ankerlinks) — kan waarschijnlijk
  ook met een bestaand 3-koloms link-component.
* De **sticky ankerbalk** met markering van de actieve sectie — als het CMS geen
  in-page-navigatiecomponent heeft, is dit een klein maatwerkcomponent of een
  niet-sticky linkrij.
* Het **filter op insightscards** — bestaat als patroon in het CGI Media Center;
  op een sectiepagina mogelijk maatwerk. Kan vervallen zonder gevolgen.
* De **conceptmarkering** bovenaan — uitsluitend prototype; verwijderen in
  productie (verwijder het `.concept-flag`-element en `body { padding-top }`).

**Optionele interacties**

* Insightsfilter, accordions in de cases, en de actieve-sectiemarkering in de
  ankerbalk zijn *nice to have*: zonder JavaScript blijft alle content leesbaar
  (accordionpanelen zijn dan open of standaard uitgeklapt te leveren) en werken
  alle ankerlinks.

**Vacatures actueel houden**

Aanbeveling: de vacaturesectie voeden vanuit het **centrale CGI-vacaturesysteem**
(feed/API of CMS-integratie), gefilterd op de business unit Retail & Consumer
Services, zodat er nooit verouderde functies op de pagina staan. Is die koppeling
niet beschikbaar, dan een **wekelijkse handmatige controle** met een vaste
eigenaar; de cards zijn zo opgebouwd dat alleen titel, expertisedomein, korte
introductie, locatie, ervaringsniveau en CTA-URL hoeven te worden vervangen
(`data-jobs-list` in `index.html` markeert het invoegpunt).

**Contentcards vervangen of uitbreiden**

Iedere contentcard is een zelfstandig `<article class="card card--content">` met
`data-claim="transform|data|run"` voor het filter. Vervangen = tekst, URL en
`data-claim` aanpassen; uitbreiden = card dupliceren. Het grid vult zichzelf
(3 → 2 → 1 kolom). Het verwijderen van het `concept-label`-element haalt de
dummy-markering weg.

---

## Extra managementoverzicht

| Huidige pagina | Voorgestelde pagina | Reden |
| --- | --- | --- |
| Brede algemene introductie | Scherpe overkoepelende marktbelofte | Sneller duidelijk waarvoor CGI staat |
| Lange lijst van diensten | Drie herkenbare claims | Meer focus en onderscheid |
| Algemene capabilities | Klantproblemen en uitkomsten | Meer klantgericht |
| Losse contentlinks | Geselecteerde content per claim | Sterkere thought leadership |
| Beperkt bewijsverhaal | Cases, proof en offerings | Meer geloofwaardigheid |
| Alleen algemeen contact | Meerdere relevante CTA's | Betere conversie |
| Geen zichtbare unitvacatures | Careers- en vacaturesectie | Ondersteunt teamgroei |

---

## Responsive en accessibility — uitgevoerde controles

Geautomatiseerd getest met Chromium (Playwright) op 1440×900, 1280×800,
834×1112 en 390×844:

* geen horizontale overflow op alle vier de breedtes;
* geen console- of scriptfouten;
* één `<h1>`, geen overgeslagen headingniveaus (h1 → h2 → h3 → h4 → h5);
* WCAG 2.1 AA-kleurcontrast voor alle zichtbare tekst (geautomatiseerd
  gecontroleerd; kleine rode tekst gebruikt daarom `--cgi-red-text`, een
  fractie donkerder dan het accentrood);
* alle afbeeldingen hebben een alt-tekst, alle formuliervelden een `<label>`;
* zichtbare focusstates (`:focus-visible`), skip-link naar de hoofdinhoud;
* toetsenbordnavigatie: accordions (`aria-expanded`/`aria-controls`), filter
  (`aria-pressed`), modal met focus trap en sluiten via `Esc`;
* ankerlinks houden rekening met de sticky header + ankerbalk
  (`scroll-margin-top` op basis van `--sticky-offset`) — geverifieerd dat de
  doelheading niet achter de sticky balken valt;
* beelden hebben vaste `width`/`height` → geen layout shift;
* mobiel: menu klapt uit/in, cards stapelen naar één kolom, hero toont eerst de
  boodschap en dan het beeld;
* `prefers-reduced-motion` schakelt smooth scrolling en transities uit.

## Bronnen voor de overgenomen, bestaande content

* [Retail- en consumenten dienstverlening | CGI NL](https://www.cgi.com/nl/nl/retail-en-consumenten-dienstverlening)
* [CGI Voice of Our Clients (NL)](https://www.cgi.com/nl/nl/voice-of-our-clients) — retail, consumer goods & wholesale
* [Unified Commerce is de nieuwe realiteit in retail](https://www.cgi.com/nl/nl/artikelen/retail-en-consumenten-dienstverlening/unified-commerce-de-nieuwe-realiteit-retail)
* [Van data naar meetbare retailwaarde: AI voorbij de pilotfase](https://www.cgi.com/nl/nl/blog/retail-en-consumenten-dienstverlening/data-naar-meetbare-retailwaarde-ai-voorbij-pilot-fase)
* [CGI erkend als Belangrijke Speler in wereldwijde retaildienstverlening (IDC MarketScape 2024)](https://www.cgi.com/nl/nl/nieuws/retail-en-consumenten-dienstverlening/cgi-erkend-als-belangrijke-speler-retaildienstverlening)
* [Retail Implementatie & Roll-Outs (Unified Commerce)](https://www.cgi.com/nl/nl/retail-implementatie-and-roll-outs)
* [Media center — Retail- en consumenten dienstverlening](https://www.cgi.com/nl/nl/mediacenter/retail-en-consumenten-dienstverlening)

---

## Verdere verfijning

`tools/extract-cgi-design.js` staat klaar om, zodra `www.cgi.com` bereikbaar is
(domein op de network-allowlist van de omgeving + een **nieuwe sessie**, omdat de
policy bij containerstart wordt toegepast), de exacte bron vast te leggen in
`design-source/`: alle CSS-variabelen, de kleuren- en fontinventarisatie, de
typografische schaal, buttonstijlen, contentbreedtes, de header/footer-markup, de
stylesheets en de echte assets. Daarmee kunnen de zes openstaande punten in de
tabel hierboven exact worden gemaakt.

Zonder die toegang helpen: een screenshot van de **footer**, van de **mobiele**
weergave, en van een pagina met een **button** erop.
