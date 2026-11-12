# CGI Pursuit Navigator

Een begeleide pursuit-werkruimte voor Directors Consultancy Services (DCS) en hun team, gebouwd op het **CGI AI-Native DCS-framework**
(Workflow Skills, simulaties, gates en de Pursuit Ledger). Je levert een RFP of opportunity-omschrijving aan, plus klantgesprekken en
samenvattingen, en doorloopt stap voor stap de zeven stages — met AI als kritische sparringpartner. Geen Excel-werkboek, Word-bestanden
of losse chats meer: de app stuurt de prompts, bewaakt de Ledger, voert de gates uit en houdt je workflow-map bij.

> De tool volgt de aangeleverde workshopstukken (Participant Guides M0–M9, Participant Workbook, Case Builder Guide, My Pursuit Workflow)
> **letterlijk**; zie [Wat is anders dan in de workshop](#wat-is-anders-dan-in-de-workshop) voor de enige afwijkingen.

## Snel starten

```bash
npm install
npm start                # http://localhost:3000
```

Zonder AI-sleutel start de app in **kopieer-modus** (de app stelt de prompt samen, jij plakt hem in je goedgekeurde AI-tool). Wil je
eerst alleen rondkijken: `npm run demo` start de **demo-modus** (voorbeeldantwoorden, geen echte AI) — klik op *Probeer de voorbeeldcase*.

### AI koppelen

Via **Instellingen** in de app, of met omgevingsvariabelen (die gaan voor en zetten de koppeling vast):

| Variabele | Betekenis |
|---|---|
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (standaard `claude-sonnet-5-5`), `ANTHROPIC_BASE_URL` | Claude via de Anthropic API (of een gateway) |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | OpenAI, Azure OpenAI of een interne gateway (`/chat/completions`, streaming) |
| `OPENAI_AUTH_HEADER` (`Authorization` of `api-key`), `OPENAI_API_VERSION`, `OPENAI_TOKEN_PARAM` (`max_completion_tokens`/`max_tokens`) | Azure en oudere modellen |
| `AI_PROVIDER` | `anthropic` · `openai` · `manual` · `mock` (forceer een modus) |
| `MAX_OUTPUT_TOKENS` | bovengrens per antwoord (standaard 32000 / 16000 voor OpenAI-compatibel) |
| `PORT`, `HOST`, `DATA_DIR` | server en opslagmap (standaard `./data`) |
| `APP_PASSWORD` | eenvoudige Basic-auth voor de hele app (zet de app voor teamgebruik liever achter SSO) |

API-sleutels blijven op de server en gaan nooit naar de browser. **Gebruik uitsluitend een door CGI goedgekeurde zakelijke AI-omgeving** —
geen persoonlijke accounts. Echte klantgegevens zijn in deze tool toegestaan; in twijfel over een document of koppeling? Vraag eerst je account lead.

## Zo volgt de tool het framework

| Framework | In de tool |
|---|---|
| Case Pack (01–06, canvas, header) — Word-bestand | **Bronnen** (upload PDF/Word/tekst, plak gesprekken) → *Case Pack bouwen*: de AI schrijft 01–06 met §-nummering, F/A/H-labels en `Not provided — needs validation` voor gaten (afgeleid van de Case Builder, maar zonder verzonnen details of cijfer-verschuiving) |
| "Case workspace" in ChatGPT/Copilot/Gemini | Eén werkruimte per pursuit: vaste instructies + Case Pack + bronnen als systeemcontext; je kiest wat meegaat |
| Workflow Skill (P1) per module | De officiële prompt, automatisch aangevuld met je Ledger, je invoer ([NOTES], [BID EFFORT], [CARD] …) en eerdere artefacten |
| Simulaties (klant, CFO, delivery lead, DPO) | Chat in de module, met snelle antwoorden en de eindcommando's (`end the meeting`, `stop`, `switch to the CFO`, `end the rehearsal`) |
| "Private chat" (evaluator, blinde re-score, test-lite, case B) | Een aparte AI-aanroep zonder Ledger, documenten of eerdere chats — alleen wat de kaart voorschrijft |
| Kopiëren tussen chats (evaluator-blok, scorekaart, M6 Build Package → M7, prototype → M11) | Automatisch (en aanpasbaar) |
| Gate (closes every module) + Excel-bladen *Workflow*, *Ledger* | Gate draait in de module; resultaat verschijnt ter controle (checks · workflow-rij · nieuwe Ledger), jij bevestigt → Ledger en workflow-map worden bijgewerkt. Versiegeschiedenis per module |
| "Decision: … — owner — by [date]" | Besluitformulier met eigenaar + datum per voorwaarde; de cockpit bewaakt ze (te laat / binnen 7 dagen) en je legt bewijs vast ("Met: …") |
| Excel *Hours*, *My Workflow Map*, *First use* | **Mijn werkwijze** (uren per stage — de app rekent, nooit het model) en de **Workflow-map** per pursuit |
| "Mijn pagina" in het werkboek (workflow-moment, eerste stap, notitie) | Per module, opgeslagen in de pursuit |
| Prototype (één HTML-bestand) | Wordt als artefact bewaard, draait in een geïsoleerde sandbox (geen netwerk), download als `.html` |
| Word-uitwerkingen | **Exporteer dossier (Word)**: samenvatting, Ledger, besluiten, Case Pack, alle module-resultaten en artefacten |

Elke prompt die de app verstuurt is te bekijken (*Bekijk de exacte prompt*), te kopiëren en terug te vinden in de **Bibliotheek**.

## Wat is anders dan in de workshop

De standaardmodus is **Praktijk**. De prompts zijn woordelijk de workshop-prompts, met alleen deze aanpassingen (zichtbaar gemarkeerd in de Bibliotheek, per pursuit uit te zetten):

1. **Geen anonimisering.** De regel "Anonymised or synthetic material only …" is vervangen; "client alias" wordt "client name"; de cast mag functie én naam bevatten.
2. **Geen woordlimieten.** Het blok *Workshop output discipline* ("Remove this block after the workshop to receive the full output") staat uit. Aanzetten kan per pursuit.
3. **Prototype-banner** "Workshop demonstrator — …" is configureerbaar (standaard: *Demonstrator — synthetic data — not production*).
4. Een klein **opmaakhint** onder het gate helpt de app het resultaat (checks · rij · Ledger) automatisch te verwerken; de inhoud van het gate verandert niet.

*Workshop*-modus (per pursuit) geeft de originele, geanonimiseerde prompts terug. De drie dingen die nooit veranderen blijven overal van kracht:
het model rekent geen cijfer uit dat je niet gaf, beslist nooit over bid/prijs/marge/staffing/juridisch en beoordeelt geen persoon met naam; elke simulatie is
*rehearsed — not validated*; elk besluit heeft per voorwaarde een eigenaar en een datum.

### Let op: M10–M14

De deelnemersgidsen van **M10–M14** zaten niet in het aangeleverde materiaal (M0–M9 wel). De kaarten (stappen, "good looks like", "stuck", "not a tender") komen letterlijk uit het
werkboek; de **prompts zijn gereconstrueerd** uit die beschrijvingen, in dezelfde opbouw (RULES / STEPS / OUTPUT / HUMAN CHECK). Ze zijn in de app gemarkeerd. Plak de officiële
tekst in via **Bibliotheek → module → Bewerk** (gedeeld met het hele team; terugzetten kan altijd), of ververs `public/data/skills.json` met `tools/build-skills.py` als je de gidsen hebt.

## Teamgebruik

* **Opslag:** JSON-bestanden in `DATA_DIR` (één bestand per pursuit; verwijderde pursuits gaan naar `trash/`). Maak back-ups via *Instellingen → Back-up downloaden* of kopieer de map.
* **Identiteit:** achter SSO (Azure App Service Easy Auth, oauth2-proxy, …) leest de app de gebruiker uit de headers `X-MS-CLIENT-PRINCIPAL-NAME`, `X-Auth-Request-Email` of `X-Forwarded-Email`;
  anders vraagt de app om een naam (alleen om persoonlijke werkwijze en eigenaar te onderscheiden — geen beveiliging). Zonder SSO: gebruik `APP_PASSWORD` of een VPN/intranet.
* **Docker:** `docker build -t pursuit-navigator .` en `docker run -p 3000:3000 -v pn-data:/data -e ANTHROPIC_API_KEY=… pursuit-navigator`.
* **Samen werken:** wijzigingen worden als kleine patches opgeslagen en elke ±9 s gesynchroniseerd; twee mensen in dezelfde module tegelijk is niet de bedoeling (laatste schrijver wint per veld).

## Beveiliging

* API-sleutels staan alleen op de server (`data/config.json`, rechten 600, of omgevingsvariabelen).
* AI-gegenereerde HTML (prototypes) draait in een sandbox-iframe op een apart document met een CSP (`sandbox allow-scripts`, `default-src 'none'`): geen netwerk, geen toegang tot de app of cookies.
* Alle AI-uitvoer wordt als tekst ge-escaped voordat de opmaak wordt toegepast; de app-CSP staat geen externe scripts toe.
* De app laadt geen externe fonts of scripts: alles komt van je eigen server.

## Ontwikkeling

```bash
npm test                                  # unit- en protocoltests (prompt-fideliteit, parsers, Anthropic/OpenAI-streaming)
AI_PROVIDER=mock PORT=3111 DATA_DIR=/tmp/pn node server/index.js &
node tests/e2e.cjs                        # doorloopt M0–M14 in de browser (vereist Playwright), demo-modus
python3 -I tools/verify-skills.py "<map met de gidsen>" public/data/skills.json   # bewijst dat alle prompts identiek zijn aan de Word-gidsen
```

Structuur: `server/` (HTTP, opslag, AI-proxy met streaming, tekstextractie, Word-export) · `public/js/` (app, `engine.js` = prompt-opbouw en parsers, `flows.js` = orkestratie per module,
`runtime.js` = uitvoeren en gate, `views-*.js` = schermen) · `public/data/skills.json` (de prompts, letterlijk uit de gidsen).

## Bekende beperkingen

* Gescande PDF's hebben geen tekstlaag (geen OCR): plak de tekst of lever een doorzoekbare versie aan.
* Het gate-resultaat wordt automatisch herkend; lukt dat niet (een ander opmaakpatroon van het model), dan kun je de Ledger vóór het opslaan handmatig corrigeren.
* De AI-koppelingen zijn getest tegen nagebouwde API's (streaming, retries, fouten); test na het instellen met *Test verbinding*.
