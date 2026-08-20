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

## ⚠️ Belangrijk: visuele bronbeperking in deze omgeving

De opdracht vraagt om de live pagina
(`https://www.cgi.com/nl/nl/retail-en-consumenten-dienstverlening`) als *source
of truth* voor de visuele stijl. **De omgeving waarin dit prototype is gebouwd
had geen netwerktoegang tot `cgi.com`** (de egress-proxy blokkeerde het domein;
ook web.archive.org was niet bereikbaar). De pagina-HTML/CSS en de originele
assets konden daardoor niet worden ingelezen.

Wat wél is gebruikt:

* inhoudelijke content en bestaande URL's van cgi.com, verkregen via zoek-
  resultaten (zie *Bronnen* onderaan);
* een CGI-conforme, terughoudende enterprise-stijl: wit, ruime witruimte, rood
  accent, nagenoeg rechte hoeken, squared buttons, brede contentkolom.

Wat nog moet worden geverifieerd (aangeleverde screenshots of geëxporteerde CSS
zijn hiervoor voldoende):

| Wat | Waar te wijzigen | Status |
| --- | --- | --- |
| Exacte CGI-rood en secundaire merkkleuren | `styles.css` → `:root` `--cgi-red`, `--cgi-red-dark`, `--cgi-red-text` | benadering |
| CGI-webfont | `:root` `--font-sans` (nu systeemstack, zodat het offline werkt) | benadering |
| Maximale contentbreedte | `:root` `--container` (nu 1280px) | benadering |
| Border radius, cardschaduw | `:root` `--radius`, `--shadow-card` | benadering |
| Labels/volgorde hoofdnavigatie en footerlinks | `index.html`, blokken gemarkeerd met `VERIFY` | benadering |
| Voice of Our Clients-cijfers | `index.html` sectie `#markt`, gemarkeerd met `VERIFY` | overgenomen uit CGI VOOC-publicaties, één-op-één te controleren tegen de live pagina |
| Hero-beeld, expertfoto's, partnerlogo's | `assets/` | placeholder |

Alle merk-afhankelijke waarden staan als CSS-token in één blok bovenaan
`styles.css`. Het gelijktrekken van de huisstijl is daarmee een wijziging van
enkele regels, niet van de hele stylesheet. De structuur, content en interactie
van het prototype zijn onafhankelijk van die verificatie.

---

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

## Volgende stap: exacte visuele replica van cgi.com

De huidige styling is een **interpretatie**, geen replica — `www.cgi.com` was in
deze omgeving niet bereikbaar (gateway weigert CONNECT met 403). Twee dingen zijn
inmiddels wel hard geverifieerd en relevant voor de restyle:

* CGI-rood = **Pantone 186C / #E31937** (rgb 227, 25, 55) — klopt in de huidige tokens;
* de brandrefresh van 2021 stapte juist **weg van massief rood naar tinten paars**,
  met een rood-naar-donkerpaars gradient als alternatief logo en paars als
  dominante kleur op de site. De huidige styling mist dat volledig.

Zodra `www.cgi.com` op de network-allowlist van de omgeving staat (en er een
**nieuwe sessie** is gestart — de policy wordt bij containerstart toegepast):

```
node tools/extract-cgi-design.js
```

Dat legt in `design-source/` vast:

* volledige paginascreenshots (desktop + mobiel) van `/en`, `/en/retail-consumer-services`
  en de NL-pagina;
* `*-tokens.json` — alle CSS-variabelen, de kleuren- en fontinventarisatie, de
  typografische schaal per element, buttonstijlen, contentbreedtes, border radii,
  de navigatie- en footerlabels met hun URL's en de paginaoutline;
* `*-header.html` / `*-footer.html` — de markup van de shell, om 1:1 over te nemen;
* `css/` — de stylesheets van de pagina;
* `assets/` — de echte logo's en beelden.

Daarna is de restyle: tokens in `styles.css` vervangen door de gemeten waarden,
de shell-markup vervangen door de echte header/footer, en de placeholders in
`assets/` vervangen door de gedownloade CGI-assets. De contentstructuur van het
prototype (secties, claims, cases, offerings, events, experts, vacatures) blijft
daarbij ongewijzigd.
