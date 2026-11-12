// Orchestration of every module: which Workflow Skill / prompt runs when, with which inputs, in which thread,
// and what the result feeds. The prompt texts themselves live in skills.json (verbatim from the guides); M10–M14 get theirs via the Prompt Library.
import { getPrompt, FW } from './framework.js';
import { resolvePrompt, ledgerBlock, extractBlock, extractStarQuestions, extractHtml, cleanInline, findTables, nextStageNeeds, hoursSummary, dateEn } from './engine.js';

export const ROUTES = {
  tender: 'Tender / RFP', renewal: 'Renewal', change: 'Change request', own: 'Own proposal', direct: 'Direct award',
};
const isTenderLike = (p) => ['tender', 'direct'].includes(p.meta?.route || 'tender');

export const FORMS = ['T&M (incl. capped)', 'Fixed price', 'Managed service', 'Outcome-based', 'Hybrid / gain-share'];
export const HOURS_STAGES = ['1 Understand', '2 Assess', '3 Propose', '4 Define', '5 Build', '6 Test', '7 Show'];

// ---- small helpers ---------------------------------------------------------------------------
export function sectionBetween(text, startRe, endRe) {
  const m = startRe.exec(text || ''); if (!m) return '';
  const rest = text.slice(m.index);
  const e = endRe ? endRe.exec(rest.slice(m[0].length)) : null;
  return (e ? rest.slice(0, m[0].length + e.index) : rest).trim();
}
export const lastMsg = (mod, thread = 'main', role = 'assistant', stepId) => {
  const arr = (mod?.threads?.[thread] || []).filter((m) => m.role === role && (!stepId || m.step === stepId));
  return arr.length ? arr[arr.length - 1].content : '';
};
const stripDemo = (t) => String(t || '').replace(/^> \*\*DEMO-OUTPUT\*\*[^\n]*\n\n?/, '');
export const art = (p, id) => (p.artefacts || []).find((a) => a.id === id);
export const artHtmlList = (p) => (p.artefacts || []).filter((a) => a.kind === 'html' && /prototype/i.test(a.name));
export function artefactOp(modId, id, name, kind, content, note) {
  return { op: 'upsert', path: ['artefacts'], key: 'id', value: { id, name, kind, content, module: modId, at: new Date().toISOString(), note: note || '' } };
}
const caseSlug = (p) => (p.meta?.client || 'case').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'case';
export const caseFile = (p, suffix, ext = 'html') => `${caseSlug(p)}_${suffix}.${ext}`;

function renderP(ctx, modId, pid, vals) {
  const pr = getPrompt(modId, pid);
  if (!pr || !String(pr.text || '').trim()) throw new Error(`De officiële prompt ${modId} · ${pid} is nog niet toegevoegd. Plak hem in de Bibliotheek (${modId} → Bewerk); daarna werkt deze module direct.`);
  return resolvePrompt(pr, ctx.settings, vals);
}
/** M10–M14: the official prompts are added later and may name their placeholders differently — make sure every typed input
 *  reaches the model even if a placeholder is not recognised. (No effect when the placeholder was filled.) */
function ensure(text, pairs) {
  const missing = pairs.filter(([, v]) => String(v ?? '').trim() && !text.includes(String(v).trim()));
  return missing.length ? text + '\n\nINPUTS FROM THE APP (use these wherever the skill asks for them)\n' + missing.map(([k, v]) => `- ${k}: ${String(v).trim()}`).join('\n') : text;
}
const skillMsg = (ctx, modId, pid, vals, { ledger = true, before = '', after = '' } = {}) => {
  let t = renderP(ctx, modId, pid, vals);
  if (before) t += '\n\n' + before;
  if (ledger) t += '\n\n--- My Pursuit Ledger (latest) ---\n' + (ctx.ledger || '(none yet)');
  if (after) t += '\n\n' + after;
  return t;
};
const hasDocsNote = 'none';

export function hoursText(u = {}) {
  const h = u.hours || {};
  const lines = ['Stage | Hours today (my estimate) | Where the time goes'];
  HOURS_STAGES.forEach((s, i) => lines.push(`${s} | ${h['s' + (i + 1)] || ''} | ${h['w' + (i + 1)] || ''}`));
  lines.push(`My last pursuit: ${h.last || ''}`, `Pursuits I lead in a typical year: ${h.perYear || ''}`, `Where it hurt most: ${h.hurt || ''}`);
  return lines.join('\n');
}
function workflowRowsText(p) {
  const rows = [];
  for (let n = 0; n <= 13; n++) {
    const m = p.modules?.['M' + n]; const r = m?.gate?.row; if (!r) continue;
    rows.push(`M${n} | ${r.stage} | ${r.trigger} | ${r.input} | ${r.skill} | ${r.humanCheck} | ${r.output} | first step: ${m.page?.firstStep?.what || ''} | my note: ${m.page?.note || ''}`);
  }
  return rows.length ? 'Stage-module | Stage | Trigger | Input | Workflow Skill | Human check | Output | My first step | My note\n' + rows.join('\n') : '(no gate rows yet)';
}

const NOTES_INPUT = (label, rows = 5) => ({ key: 'NOTES', type: 'textarea', rows, label, placeholder: 'Leeg laten = "none" (de AI gebruikt dan de documenten in je werkruimte)', help: 'Heb je geen documenten? Schrijf hier de notities in een paar zinnen uit.' });
const notesVal = (v, ctx) => (String(v.NOTES || '').trim() || (ctx.hasDocs ? hasDocsNote : 'none'));

// ---- flows -------------------------------------------------------------------------------------
export const FLOWS = {
  M0: {
    steps: [
      { id: 's1', title: 'Mijn case in vijf regels', min: 5, desc: 'Setup-check: kan de AI al je documenten lezen? Daarna je case in vijf regels en Ledger v0 (Case en Open — to validate).', ledgerNeeded: false,
        build: (c) => renderP(c, 'M0', 'P1', {}) + `\n\nMy route: ${ROUTES[c.p.meta?.route] || 'tender'}.` },
      { id: 's2a', optional: true, title: 'Oefening: vind de fouten (stap 1)', min: 6, thread: 'seed', scope: 'casepack',
        desc: 'Optioneel, aanrader voor nieuwe teamleden. Een privé-chat schrijft een samenvatting met vier geplante fouten. Zoek ze zelf, naast je Case Pack — pas daarna "reveal".',
        build: (c) => renderP(c, 'M0', 'P2', {}) },
      { id: 's2b', optional: true, title: 'Oefening: tweede privé-check (optioneel)', min: 3, thread: 'check', scope: 'casepack',
        desc: 'Een tweede privé-chat controleert de samenvatting claim voor claim tegen het Case Pack — zonder het antwoordblad te kennen.',
        inputs: [{ key: 'DRAFT', type: 'textarea', rows: 5, required: true, label: 'Samenvatting (concept) die gecontroleerd wordt', default: (c) => stripDemo(lastMsg(c.mod, 'seed', 'assistant', 's2a')) }],
        build: (c, v) => renderP(c, 'M0', 'P3', { 'PASTE THE DRAFT HERE': v.DRAFT }) },
      { id: 's2c', optional: true, title: 'Oefening: onthul het antwoordblad', min: 2, thread: 'seed', scope: 'casepack',
        desc: 'Pas nadat je alle claims zelf hebt gemarkeerd: ondersteund, tegengesproken of niet in mijn pack.',
        build: (c) => renderP(c, 'M0', 'P4', {}) },
    ],
    gate: { kind: 'none' },
  },

  M1: {
    steps: [
      { id: 's1', title: 'Breng mijn workflow in kaart', min: 8, maxTokens: 8000,
        desc: 'Leest je eigen uren (formulier "Mijn werkwijze") precies zoals je ze schreef en noemt de drie stages die het waard zijn om te veranderen.',
        inputs: [{ key: 'HOURS', type: 'hours', label: 'Mijn workflow-formulier (Hours A3:C14)', help: 'Een getal eerst ("12", "35–40"). Het model telt of rondt nooit af — de optelsom doet de app.' }],
        guard: (c) => (c.hoursFilled ? null : 'Vul eerst minstens één stage in bij "Mijn werkwijze" (of hieronder).'),
        build: (c) => skillMsg(c, 'M1', 'P1', {}, { after: 'MY WORKFLOW FORM (sheet Hours, A3:C14)\n' + hoursText(c.user) }) },
      { id: 's2', title: 'De VP-uitdaging', min: 5, desc: 'Je VP daagt je uren, je drie stages en je menselijke checks uit. Beslis: houden of één stage wisselen.', build: (c) => renderP(c, 'M1', 'P2', {}) },
    ],
    gate: { kind: 'note', label: 'Workflow note (M1) — Artefacts, not a decision: I keep …', prefix: 'Workflow note (M1) — Artefacts, not a decision: I keep ', hint: 'Welke drie stages houd je (of welke wissel je)? Dit wordt een Artefact — geen besluit.' },
  },

  M2: {
    steps: [
      { id: 's1', title: 'Ontdek de klant en zet de cast neer', min: 14, maxTokens: 12000,
        desc: 'Klantpakket met F/A/H, de cast (rollen), de beslisser als hypothese (H1–H3) en vijf vragen voor je volgende contact — drie met ★.',
        inputs: [NOTES_INPUT('Notities (6–10 zinnen, optioneel)')],
        build: (c, v) => {
          const rl = ['renewal', 'change'].includes(c.p.meta?.route) ? 'Decision-maker: the role that signs the renewal or approves the change; lead evaluator: the role that scores our service.' : '';
          return skillMsg(c, 'M2', 'P1', { NOTES: notesVal(v, c) }, { before: rl });
        },
        onResult: (c, text) => [artefactOp('M2', 'm2-pack', 'M2 · Client pack, cast & persona', 'md', text)] },
      { id: 's2', title: 'Het gesprek (simulatie)', min: 14, maxTokens: 4000,
        desc: 'De AI speelt de beslisser in je volgende toegestane contact. Stel één vraag per bericht, maximaal vijf. Eindig met "end the meeting" voor de debrief.',
        inputs: [
          { key: 'Q1', type: 'star', label: 'Eerste vraag (★)', help: 'Kies een ★-vraag uit het pakket of typ zelf. Zeg hem eerst hardop: zou de klant hem willen beantwoorden?' },
          { key: 'REHEARSAL', type: 'check', label: 'Contactregels onbekend / tender loopt → start met "rehearsal"', help: 'In een lopende tender oefen je het volgende toegestane gesprek (geen ontdekking).' },
        ],
        build: (c, v) => renderP(c, 'M2', 'P2', { 'QUESTION 1': (v.REHEARSAL ? 'rehearsal — ' : '') + (v.Q1 || '').trim() }),
        chat: { max: 5, endLabel: 'end the meeting', endText: 'end the meeting', placeholder: 'Je volgende vraag aan de klant…' } },
    ],
    gate: { kind: 'none', hint: 'Geen besluit in deze module. Plak je drie ★-vragen in de echte uitnodiging of Q&A voordat je afsluit.' },
  },

  M3: {
    steps: [
      { id: 's1', title: 'Beoordeel de opportunity', min: 14, maxTokens: 14000,
        desc: 'Leest de RFP zoals het panel: snapshot, zwaarste eisen, eerlijke scores en win themes. Lees eerst de scores en de "for M4"-regel.',
        inputs: [NOTES_INPUT('Notities (8–12 zinnen, alleen als er geen RFP in de werkruimte staat)', 6)],
        build: (c, v) => skillMsg(c, 'M3', 'P1', { NOTES: notesVal(v, c) }) },
      { id: 's2', title: 'De pursuit committee', min: 10, maxTokens: 8000,
        desc: 'Een sceptisch committee: win-kansband, expected value in woorden, aanbeveling met gedateerde voorwaarden, vijf vragen aan de klant, drie risico\'s. Speel daarna je eigen VP: streep de zwakste voorwaarde.',
        inputs: [
          { key: 'BID EFFORT', type: 'text', required: true, label: 'Pursuit-kosten: uren van het héle biedteam', placeholder: 'bijv. 350 hours plus 2 travel days' },
          { key: 'MARGIN', type: 'text', required: true, label: 'CGI-margeaanname', placeholder: '"standard" of het cijfer van finance', default: () => 'standard' },
        ],
        build: (c, v) => renderP(c, 'M3', 'P2', { 'BID EFFORT': v['BID EFFORT'], MARGIN: v.MARGIN }) },
    ],
    gate: { kind: 'decision', hint: 'Jíj beslist, het model adviseert. Eén regel, per voorwaarde een eigenaar (rol) en een kalenderdatum. Nog niet klaar? Laat leeg — het gate houdt het Open.', conditionsRequired: true, flip: true, placeholder: 'bid / renew / accept / reshape — wat verandert er, in één regel' },
  },

  M4: {
    steps: [
      { id: 's1', title: 'v1 van je zwakste criterium', min: 10, maxTokens: 12000,
        desc: 'Schrijft v1 van het criterium dat de meeste gewogen punten verliest — of neemt jouw eigen concept letterlijk over — en pakt het in voor een evaluator die jouw bedoeling nooit zag.',
        inputs: [
          { key: 'CRITERION', type: 'text', label: 'Criterium', default: () => 'from the Ledger', help: 'Standaard het criterium uit de regel "Next stage needs — for M4" in je Ledger. Gelijkspel of ander criterium: typ het hier.' },
          { key: 'DRAFT', type: 'textarea', rows: 6, label: 'Eigen concept (optioneel, tot ±350 woorden)', placeholder: 'Leeg = de AI schrijft v1' },
        ],
        build: (c, v) => {
          const draft = String(v.DRAFT || '').trim();
          return skillMsg(c, 'M4', 'P1', { CRITERION: (v.CRITERION || '').trim() || 'from the Ledger', 'MY DRAFT': draft ? 'below' : 'none' }, { after: draft ? 'MY DRAFT:\n' + draft : '' });
        },
        onResult: (c, text) => [{ op: 'set', path: ['modules', 'M4', 'data', 'evaluatorPack'], value: extractBlock(text, /FOR THE EVALUATOR/i) }] },
      { id: 's2', title: 'De evaluator — blind, in een privé-chat', min: 7, thread: 'evaluator', scope: 'private', maxTokens: 6000,
        desc: 'De app start automatisch een aparte chat zonder jouw Ledger, notities of documenten: alleen het blok "FOR THE EVALUATOR". Schat eerst zelf je eindscore (1–5) op je pagina.',
        guard: (c, v) => (String(v?.PACK || c.mod?.data?.evaluatorPack || '').trim() ? null : 'Voer eerst stap 1 uit (of plak het blok "FOR THE EVALUATOR" hieronder).'),
        inputs: [{ key: 'PACK', type: 'textarea', rows: 8, label: 'Evaluator-blok (uit stap 1, aan te passen)', default: (c) => c.mod?.data?.evaluatorPack || '' }],
        build: (c, v) => renderP(c, 'M4', 'P2', { 'EVALUATOR PACK': v.PACK }),
        onResult: (c, text) => [{ op: 'set', path: ['modules', 'M4', 'data', 'scorecard'], value: stripDemo(text) }] },
      { id: 's3', title: 'Terugkoppelen: gaps, v2 en scorelijn', min: 10, maxTokens: 12000,
        desc: 'De scorekaart gaat automatisch terug naar de M4-chat. Lees gaps (met eigenaar en datum), v2 en de scorelijn voor je Ledger.',
        inputs: [{ key: 'CARD', type: 'textarea', rows: 6, label: 'Scorekaart van de evaluator', default: (c) => c.mod?.data?.scorecard || stripDemo(lastMsg(c.mod, 'evaluator', 'assistant', 's2')) }],
        guard: (c, v) => (String(v?.CARD || c.mod?.data?.scorecard || lastMsg(c.mod, 'evaluator', 'assistant', 's2')).trim() ? null : 'Eerst de evaluator draaien (stap 2) — of plak de scorekaart hieronder.'),
        build: (c, v) => 'Scorecard from the evaluator (private chat):\n\n' + v.CARD,
        onResult: (c, text) => [{ op: 'set', path: ['modules', 'M4', 'data', 'v2'], value: sectionBetween(text, /^[#*\s(]*(?:\(b\)\s*)?v2\b[^\n]*/im, /^[#*\s(]*(?:\(c\)|compliance)/im) }] },
      { id: 's4', optional: true, title: 'Optioneel: v2 opnieuw laten scoren', min: 5, thread: 'evaluator', scope: 'private', maxTokens: 4000,
        desc: 'Zelfde privé-chat: "RE-SCORE" met v2. Tijd over? Dan zie je of v2 echt hoger scoort — of alleen beter klinkt.',
        inputs: [{ key: 'V2', type: 'textarea', rows: 8, label: 'v2 (uit de M4-chat)', default: (c) => c.mod?.data?.v2 || '' }],
        build: (c, v) => renderP(c, 'M4', 'P3', { 'PASTE v2 FROM YOUR M4 CHAT': v.V2 }) },
      { id: 's5', optional: true, title: 'Optioneel: re-score terugkoppelen', min: 2, maxTokens: 3000,
        desc: 'De scorelijn in je Ledger krijgt er v2 bij: "blind v1 [x]/5 → v2 [y]/5 (M4), rehearsed — not validated".',
        inputs: [{ key: 'RS', type: 'textarea', rows: 5, label: 'Re-score van de evaluator', default: (c) => stripDemo(lastMsg(c.mod, 'evaluator', 'assistant', 's4')) }],
        build: (c, v) => 'Re-score from the evaluator (private chat), v2:\n\n' + v.RS },
    ],
    gate: { kind: 'decision', hint: 'Besluit in één regel, per voorwaarde een eigenaar en een datum. Je assessed score blijft; de blinde score staat ernaast.', conditionsRequired: true, placeholder: 'bijv. send v2 to the bid team after evidence is in' },
  },

  M5: {
    steps: [
      { id: 's1', title: 'Waarde en contractvorm', min: 16, maxTokens: 14000,
        desc: 'Waardeverhaal dat een CFO kan toetsen, de commerciële regels van de klant, de contractvorm-matrix (wie houdt de AI-winst?) en daarna het pricing input pack voor finance. Deel 1 stopt met een vraag.',
        inputs: [{ key: 'FIG', type: 'textarea', rows: 3, label: 'Mijn eigen cijfers (inspanning, kostenranges, productiviteit)', placeholder: 'Leeg = "none". Het model verzint nooit een cijfer.' }],
        build: (c, v) => skillMsg(c, 'M5', 'P1', { 'MY FIGURES': String(v.FIG || '').trim() || 'none' }) },
      { id: 's2', title: 'Jouw voorkeursvorm', min: 3, maxTokens: 14000,
        desc: 'Antwoord in één regel met de vorm waar je naartoe neigt — of "continue" voor de hypothese van het model.',
        inputs: [{ key: 'LEAN', type: 'lean', label: 'Mijn voorkeur' }],
        build: (c, v) => (v.LEAN || 'continue').trim() },
      { id: 's3', title: 'De CFO (simulatie)', min: 11, maxTokens: 4000,
        desc: 'Vijf vragen, één voor één: waarde en baseline · meting en attributie · contractvorm en wie de AI-winst houdt · prijslogica · run-kosten. Zeg bij twijfel wat je zou valideren en met wie — dat scoort hoger dan gokken.',
        build: (c) => renderP(c, 'M5', 'P2', {}),
        chat: { max: 5, endLabel: 'stop', endText: 'stop', placeholder: 'Jouw antwoord aan de CFO…' } },
    ],
    gate: { kind: 'lean', hint: 'Dit is géén "Decision": het is jouw voorkeur (H), voor besluit met finance.', prefix: 'My lean (H), for DCS decision with finance: ' },
  },

  M6: {
    steps: [
      { id: 's1', title: 'Deel 1 — journey, scope en stories', min: 12, maxTokens: 14000,
        desc: 'User journey (6 stappen), scope-lijnen op de prioriteit van de klant en maximaal acht stories met tests. Controleer: elke klant-Must blijft Must of staat als "phase 2 — client must accept".',
        build: (c) => skillMsg(c, 'M6', 'P1', {}),
        guardMsg: 'De user van wie de journey is? Staat die niet in je Ledger: voeg één regel onder je Ledger toe.' },
      { id: 's2', optional: true, title: 'Optioneel: de kwaliteitspoort', min: 4, maxTokens: 6000,
        desc: 'Drie reviewers uit de cast (primaire gebruiker, privacy/risk, hoofdevaluator) leggen hun bezwaar neer. Deel 2 past de wijzigingen toe.', build: (c) => renderP(c, 'M6', 'P2', {}) },
      { id: 's3', title: 'Deel 2 — build package', min: 10, maxTokens: 32000,
        desc: 'NFR\'s, hypothese, scope lock (3 schermen), 8 fictieve records, storyline en de master build prompt voor het prototype. Wordt bewaard als één bestand: "M6 Build Package".',
        build: () => 'build package',
        onResult: (c, text) => {
          const m = c.mod?.threads?.main || [];
          const get = (id) => stripDemo((m.filter((x) => x.role === 'assistant' && x.step === id).pop() || {}).content || '');
          const parts = ['# M6 Build Package', '## Part 1', get('s1')];
          if (get('s2')) parts.push('## Quality gate', get('s2'));
          parts.push('## Part 2', stripDemo(text));
          return [artefactOp('M6', 'm6-package', 'M6 Build Package', 'md', parts.join('\n\n'))];
        } },
    ],
    gate: { kind: 'decision', optional: true, hint: 'Alleen invullen als je in deze module een besluit nam.' },
  },

  M7: {
    steps: [
      { id: 's1', title: 'Bouw het klikbare prototype', min: 16, maxTokens: 32000,
        desc: 'Eén HTML-bestand, synthetische data, een mens beslist elke suggestie. Het M6 Build Package wordt automatisch meegestuurd.',
        inputs: [{ key: 'PKG', type: 'textarea', rows: 6, label: 'Build Package (Part 1 + Part 2)', default: (c) => art(c.p, 'm6-package')?.content || '', help: 'Automatisch uit M6. Plak hier je eigen Build Package als je M6 buiten de app deed.' }],
        guard: (c, v) => (String(v?.PKG || art(c.p, 'm6-package')?.content || '').trim() ? null : 'Eerst M6 afronden — M7 bouwt uitsluitend vanuit het Build Package.'),
        build: (c, v) => ({ content: skillMsg(c, 'M7', 'P1', {}), attach: [{ name: 'M6 Build Package.md', text: v.PKG }] }),
        onResult: (c, text) => { const h = extractHtml(text); return h ? [artefactOp('M7', 'm7-v1', 'Prototype v1', 'html', h.html, h.complete ? '' : 'Code mogelijk afgebroken (geen </html>)')] : []; } },
      { id: 's2', title: 'Review in zes punten', min: 6, maxTokens: 8000,
        desc: 'Een sceptische reviewer toetst banner, scope, "een mens beslist", traceerbaarheid, eerlijkheid en doorloopbaarheid — en schrijft de Demo Notes.',
        build: (c) => renderP(c, 'M7', 'P2', {}),
        onResult: (c, text) => [{ op: 'set', path: ['modules', 'M7', 'data', 'review'], value: stripDemo(text) }] },
      { id: 's3', title: 'Wijzig precies één ding → v2', min: 4, maxTokens: 32000,
        desc: 'Het eerstgerangschikte punt uit de review, in één zin. Alles Pass? Dan geen wijziging: v1 is je bestand.',
        inputs: [{ key: 'CHANGE', type: 'textarea', rows: 2, required: true, label: 'Wijziging (één zin)', default: (c) => firstFix(c.mod?.data?.review) }],
        build: (c, v) => renderP(c, 'M7', 'P3', { CHANGE: v.CHANGE }),
        onResult: (c, text) => { const h = extractHtml(text); return h ? [artefactOp('M7', 'm7-v2', 'Prototype v2', 'html', h.html, h.complete ? '' : 'Code mogelijk afgebroken')] : []; } },
    ],
    gate: { kind: 'decision', optional: true, hint: 'Alleen invullen als je in deze module een besluit nam.' },
  },

  M8: {
    steps: [
      { id: 's1', title: 'Land de verandering en breng de impact in kaart', min: 11, maxTokens: 14000,
        desc: 'Kies een kaart (1–8 zijn oefen-scenario\'s — stresstests op je eigen case — Kaart 0 is de échte wijziging van je klant). Typ zelf het nieuwe cijfer of de datum: het model rekent het nooit uit.',
        inputs: [{ key: 'CARD', type: 'card', label: 'Wijzigingskaart' }, { key: 'TOUCH', type: 'textarea', rows: 3, label: 'Regels die geraakt worden (optioneel)', placeholder: 'bijv. M6-stories, M4-fragment' }, { key: 'PKG', type: 'check', label: 'M6 Build Package meesturen' }],
        guard: (c, v) => (v && v.CARD && v.CARD.n !== 0 && !String(v.CARD.figure || '').trim() ? 'Typ het nieuwe cijfer of de datum bij de kaart.' : null),
        build: (c, v) => {
          const k = v.CARD || { n: 0 };
          const card = k.n === 0 ? '0' : `${k.n} · ${String(k.figure).trim()}`;
          const under = [];
          if (k.n === 0 && String(k.clientText || '').trim()) under.push("MY CLIENT'S CHANGE:\n" + k.clientText.trim());
          if (String(v.TOUCH || '').trim()) under.push('LINES THE CHANGE TOUCHES:\n' + v.TOUCH.trim());
          const pkg = v.PKG && art(c.p, 'm6-package');
          return { content: skillMsg(c, 'M8', 'P1', { CARD: card }, { after: under.join('\n\n') }), attach: pkg ? [{ name: 'M6 Build Package.md', text: pkg.content }] : [] };
        } },
      { id: 's2', title: 'Jouw besluiten — één regel per rij', min: 9, maxTokens: 14000,
        desc: 'Het model past uitsluitend jouw besluiten toe (voor → na). Een klant-Must die verschuift staat als "partially comply — moved". Geef per rij letter, optie en waarom.',
        inputs: [{ key: 'DEC', type: 'rows8', label: 'Besluiten per rij' }],
        build: (c, v) => v.DEC,
        onResult: (c, text) => [{ op: 'set', path: ['modules', 'M8', 'data', 'pack'], value: extractBlock(text, /EVALUATOR PACK/i) }] },
      { id: 's3', title: 'Blinde re-score (alleen lopende tender)', min: 6, thread: 'blind', scope: 'private', maxTokens: 5000, optional: true,
        desc: 'Privé-chat met alleen het EVALUATOR PACK. Overslaan als het geen live tender is.',
        inputs: [{ key: 'PACK', type: 'textarea', rows: 8, label: 'EVALUATOR PACK', default: (c) => c.mod?.data?.pack || '' }],
        build: (c, v) => renderP(c, 'M8', 'P2', { 'PASTE THE EVALUATOR PACK HERE': v.PACK }) },
      { id: 's4', title: 'De hold-test', min: 6, maxTokens: 10000,
        desc: 'Een sceptische kwaliteitsreview: blijven je klant-Musts, bewijs en minimumkwaliteit overeind? Stille drops worden bovenaan gemeld — stuur de "put back"-regel terug.',
        inputs: [{ key: 'BLIND', type: 'textarea', rows: 4, label: 'Blinde scores', default: (c) => stripDemo(lastMsg(c.mod, 'blind', 'assistant', 's3')) || 'not run' }],
        build: (c, v) => renderP(c, 'M8', 'P3', { 'BLIND SCORES': String(v.BLIND || '').trim() || 'not run' }) },
    ],
    gate: { kind: 'decision', optional: true, hint: 'Alleen invullen als je een besluit nam. Heeft de wijziging een "Reopen"-regel? Leg de keuze (keep / add a condition / stop) vast.', conditionsRequired: false },
  },

  M9: {
    steps: [
      { id: 's1', title: 'Team en skills: gap-map en route', min: 12, maxTokens: 14000,
        desc: 'Welke skills vraagt deze delivery, welke rolprofielen dekken ze (alleen rollen — nooit namen of beoordelingen), en per gat een route, een competentietest en een datum. Lees eerst de datumkolom.',
        inputs: [{ key: 'ROLES', type: 'textarea', rows: 3, label: 'Eigen rolprofielen (5–10 titels, geen namen)', placeholder: 'Leeg = de acht standaardprofielen. Case Pack met profielen in 06? Schrijf: "as in 06".' },
          { key: 'COST', type: 'text', label: 'Kostenranges (optioneel)', placeholder: 'bijv. €1–3k per certification' }],
        build: (c, v) => {
          const extra = [];
          if (String(v.ROLES || '').trim()) extra.push('Role profiles: ' + v.ROLES.trim().replace(/^as in 06$/i, 'as in 06'));
          if (String(v.COST || '').trim()) extra.push('Cost ranges: ' + v.COST.trim());
          return skillMsg(c, 'M9', 'P1', {}, { after: extra.join('\n') });
        } },
      { id: 's2', title: 'Deel 2 — verandering en adoptie aan klantzijde', min: 9, maxTokens: 10000,
        desc: 'De adoptieplan-lead die gereedschappen zag sterven: gebruikersgroepen, gedrag dat adoptie toont, klantcommitments en de regel voor Module 11.',
        inputs: [{ key: 'PERSONA', type: 'check', label: 'M2-persona meesturen', show: (c) => !!art(c.p, 'm2-pack') }, { key: 'JOURNEY', type: 'check', label: 'M6-journey meesturen', show: (c) => !!art(c.p, 'm6-package') }],
        build: (c, v) => {
          const under = [];
          if (v.PERSONA && art(c.p, 'm2-pack')) under.push('M2 PERSONA / CAST:\n' + art(c.p, 'm2-pack').content);
          if (v.JOURNEY && art(c.p, 'm6-package')) under.push('M6 JOURNEY (build package):\n' + art(c.p, 'm6-package').content.slice(0, 9000));
          return renderP(c, 'M9', 'P2', {}) + (under.length ? '\n\n' + under.join('\n\n') : '');
        } },
    ],
    gate: { kind: 'decision', optional: true, hint: 'Alleen invullen als je een besluit nam.' },
  },

  M10: {
    steps: [
      { id: 's1', title: 'AI-annex en herziene offerte', min: 12, maxTokens: 14000,
        desc: 'Beantwoordt de zes vragen van een AI-geletterde koper (D1–D6) zonder iets te claimen zonder bron, voegt de governance van je contractvorm toe en herziet de offerte.',
        inputs: [{ key: 'CONFIRMED', type: 'text', label: 'Schriftelijk bevestigd (policy, clausule, goedgekeurde tool)', default: () => 'none' }, { key: 'FIRST', type: 'text', label: 'Eerste release — waar en wanneer', placeholder: 'bijv. site A, week 6', required: true }],
        build: (c, v) => ensure(skillMsg(c, 'M10', 'P1', { CONFIRMED: (v.CONFIRMED || '').trim() || 'none', 'FIRST RELEASE': v.FIRST }), [['[CONFIRMED]', (v.CONFIRMED || '').trim() || 'none'], ['[FIRST RELEASE]', v.FIRST]]) },
      { id: 's2', title: 'De DPO — en dan hardop in 30 seconden', min: 9, maxTokens: 5000,
        desc: 'De DPO van de klant toetst het annex. Lees blok (5) en zeg het hardop in 30 seconden; beantwoord dan de vervolgvraag "who pays if your AI gets it wrong?".',
        build: (c) => renderP(c, 'M10', 'P2', {}),
        chat: { max: 1, endLabel: '', endText: '', placeholder: 'Jouw antwoord op de vervolgvraag…' } },
    ],
    gate: { kind: 'decision', optional: true, hint: 'Voorwaarden die vandaag vervallen, staan alleen op "met" als hun bewijs in deze chat staat.' },
  },

  M11: {
    steps: [
      { id: 's1', title: 'Mijn eigen run — de opener', min: 5, maxTokens: 6000,
        desc: 'Open je laatste prototype, klik zélf twee taken die een sceptische gebruiker zou doen — vóór de gesimuleerde gebruiker dat doet.',
        inputs: [{ key: 'FILE', type: 'proto', label: 'Prototype' }],
        guard: (c, v) => (v?.FILE?.html || artHtmlList(c.p).length ? null : 'Geen prototype gevonden. Bouw er een in M7, of plak de HTML hieronder.'),
        build: (c, v) => ({ content: skillMsg(c, 'M11', 'P1', {}), attach: [{ name: v.FILE.name || 'prototype.html', text: v.FILE.html }] }) },
      { id: 's2', title: 'Mijn run terugmelden', min: 2, maxTokens: 6000,
        desc: 'Schrijf wat je deed, wat er gebeurde en waar je aarzelde. Alleen wat jij meldt telt als bewijs.',
        inputs: [{ key: 'T1', type: 'text', label: 'Taak 1 — wat deed ik, wat gebeurde, waar aarzelde ik', required: true }, { key: 'T2', type: 'text', label: 'Taak 2', required: true }],
        build: (c, v) => `MY RUN — 1: ${v.T1} · 2: ${v.T2}` },
      { id: 's3', title: 'Test-lite — de gesimuleerde gebruiker (privé)', min: 8, thread: 'tester', scope: 'private', maxTokens: 8000,
        desc: 'Privé-chat met alleen het prototype en je M11-regels. Een sceptische gebruiker die het nog nooit zag.',
        inputs: [{ key: 'FILE', type: 'proto', label: 'Prototype' }, { key: 'LINES', type: 'textarea', rows: 4, label: 'M11-regels en persona', default: (c) => c.needsFor('M11').join('\n') || 'none — use my primary user' }],
        guard: (c, v) => (v?.FILE?.html || artHtmlList(c.p).length ? null : 'Geen prototype gevonden.'),
        build: (c, v) => ({ content: ensure(renderP(c, 'M11', 'P2', { 'M11 LINES': v.LINES, 'MY LINES': v.LINES }), [['[MY LINES]', v.LINES]]), attach: [{ name: v.FILE.name || 'prototype.html', text: v.FILE.html }] }) },
      { id: 's4', title: 'Wijzig precies één ding → frozen', min: 5, thread: 'tester', scope: 'private', maxTokens: 32000,
        desc: 'De fix van de gesimuleerde gebruiker, één zin. Het resultaat is je bevroren bestand; klik daarna wat je veranderde en je taak 1 opnieuw.',
        inputs: [{ key: 'CHANGE', type: 'textarea', rows: 2, required: true, label: 'Wijziging (één zin)', default: (c) => firstFix(lastMsg(c.mod, 'tester', 'assistant', 's3'), true) }],
        build: (c, v) => renderP(c, 'M11', 'P3', { CHANGE: v.CHANGE }),
        onResult: (c, text) => { const h = extractHtml(text); return h ? [artefactOp('M11', 'm11-frozen', 'Prototype frozen', 'html', h.html, h.complete ? '' : 'Code mogelijk afgebroken')] : []; } },
      { id: 's5', title: 'Testrecord naar de Freeze-chat', min: 2, noReply: true,
        desc: 'Het testrecord (jouw run, de gesimuleerde gebruiker en de wijziging) gaat naar de hoofdchat. Daarna je besluit en het gate.',
        build: (c) => 'TEST RECORD\n\n(1) My run:\n' + (c.mod?.threads?.main || []).filter((m) => m.step === 's2' && m.role === 'user').map((m) => m.content).join('\n') +
          '\n\n(2) Simulated user (private chat):\n' + stripDemo(lastMsg(c.mod, 'tester', 'assistant', 's3')) +
          '\n\n(3) Change made, frozen file saved as ' + caseFile(c.p, 'frozen') + ':\n' + ((c.mod?.threads?.tester || []).filter((m) => m.role === 'user' && m.step === 's4').pop()?.content || '').slice(0, 400) },
    ],
    gate: { kind: 'decision', hint: 'Bevriezen of niet: "Decision: freeze [file] — owner — by [date]" — of "Decision: escalate to [role]" als je eigen run op beide versies faalt.', placeholder: 'freeze ' + 'prototype_frozen.html', conditionsRequired: false },
  },

  M12: {
    steps: [
      { id: 's1', title: 'De bid-board notitie', min: 7, maxTokens: 14000,
        desc: 'Compliance, de cijfers van finance woord voor woord tegen de cap, delivery en elke eerdere voorwaarde — en een besluit dat het model nooit zelf neemt.',
        inputs: [{ key: 'FIG', type: 'textarea', rows: 3, required: true, label: 'Cijfers van finance (woordelijk), "illustrative" of "not yet"', placeholder: 'not yet', default: () => 'not yet' }, { key: 'SIGN', type: 'text', required: true, label: 'Wie tekent, en wanneer', placeholder: 'bijv. VP Consulting + Delivery Lead, 18 Dec' },
          { key: 'TPL', type: 'textarea', rows: 3, label: 'Eigen bid-board template (optioneel)' }],
        build: (c, v) => ensure(skillMsg(c, 'M12', 'P1', { FIGURES: v.FIG, 'SIGN-OFF': v.SIGN }, { after: String(v.TPL || '').trim() ? 'MY UNIT\'S BID-BOARD TEMPLATE:\n' + v.TPL.trim() : '' }), [['[FIGURES]', v.FIG], ['[SIGN-OFF]', v.SIGN]]) },
      { id: 's2', title: 'De delivery lead (simulatie)', min: 8, maxTokens: 4000,
        desc: 'Vier vragen, één voor één: scope en schatting · team en key roles · afhankelijkheden · eerste release en wat bij uitloop. Eindig met "end the rehearsal".',
        build: (c) => renderP(c, 'M12', 'P2', {}),
        chat: { max: 4, endLabel: 'end the rehearsal', endText: 'end the rehearsal', placeholder: 'Jouw antwoord aan de delivery lead…' } },
    ],
    gate: { kind: 'decision', hint: '"Decision: submit with conditions …" (renewal: renew/reshape/let go · change request: accept/reshape/decline), eigenaren en datums.', conditionsRequired: true, flip: false, placeholder: 'submit with conditions' },
  },

  M13: {
    steps: [
      { id: 's1', title: 'Vijf slides', min: 10, maxTokens: 12000,
        desc: 'Vijf slides waarvan de titels alleen al het betoog dragen, met je commerciële feiten woord voor woord. Lees de vijf titels los.',
        inputs: [{ key: 'FACTS', type: 'textarea', rows: 3, required: true, label: 'Commerciële feiten zoals ingediend', default: () => 'see Ledger' }, { key: 'MEETING', type: 'text', required: true, label: 'De meeting: wie (rollen), hoeveel minuten, wanneer', placeholder: 'bijv. COO + CFO, 20 min, 12 Jan' }],
        build: (c, v) => ensure(skillMsg(c, 'M13', 'P1', { 'COMMERCIAL FACTS': v.FACTS, MEETING: v.MEETING }), [['[COMMERCIAL FACTS]', v.FACTS], ['[MEETING]', v.MEETING]]) },
      { id: 's2', title: 'De repetitie — beslisser, dan CFO', min: 13, maxTokens: 4000,
        desc: 'Twee antwoorden aan de beslisser, dan "switch to the CFO", twee antwoorden, dan "end the rehearsal". Zeg elk antwoord eerst hardop: wat ontbrak als eerste — bewijs of een grens?',
        build: (c) => renderP(c, 'M13', 'P2', {}),
        chat: { max: 4, endLabel: 'end the rehearsal', endText: 'end the rehearsal', quick: [{ label: 'switch to the CFO', text: 'switch to the CFO' }], placeholder: 'Jouw antwoord…' } },
    ],
    gate: { kind: 'decision', optional: true, hint: 'Bid-board voorwaarden die nu vervallen? Eén regel elk: "met" met bewijs, of niet. Daarna het gate.' },
  },

  M14: {
    steps: [
      { id: 's1', title: 'Sluit mijn workflow af', min: 9, maxTokens: 10000,
        desc: 'Foutenlogboek, menselijke checks, de drie stages waarmee je maandag begint en een eerste echt gebruik binnen zeven dagen. De app levert je gate-rijen, uren en First-use-regels zelf aan.',
        inputs: [{ key: 'OCC', type: 'text', required: true, label: 'Echte gelegenheid (vergadering, deadline of besluit)', placeholder: 'bijv. bid review opportunity X, 3 Dec' }, { key: 'REV', type: 'text', required: true, label: 'Reviewer (een rol)', placeholder: 'bijv. Senior Pursuit Manager' }],
        build: (c, v) => ensure(skillMsg(c, 'M14', 'P1', { OCCASION: v.OCC, REVIEWER: v.REV }, { after: 'MY WORKFLOW ROWS\n' + workflowRowsText(c.p) + '\n\nMY HOURS (sheet Hours)\n' + hoursText(c.user) + '\nHours with this workflow: ' + [1, 2, 3, 4, 5, 6, 7].map((i) => `${HOURS_STAGES[i - 1]}: ${c.user?.hours?.['g' + i] || ''}`).join(' · ') + '\n\nFIRST USE\n' + Object.entries(c.user?.firstUse || {}).map(([k, v]) => `${k}: ${v}`).join('\n') }), [['my occasion for the first real use', v.OCC], ['my reviewer (a role)', v.REV]]) },
      { id: 's2', title: 'Mijn Workflow Portrait', min: 9, maxTokens: 24000,
        desc: 'Eén pagina, voor en na, als HTML-bestand — met je uren precies zoals je ze gaf.',
        inputs: [{ key: 'DATE', type: 'date', required: true, label: '30-dagen review op' }, { key: 'ROLE', type: 'text', required: true, label: 'Wie vertel je het (rol)' }],
        build: (c, v) => ensure(renderP(c, 'M14', 'P2', { DATE: dateEn(v.DATE), ROLE: v.ROLE }), [['my 30-day review date', dateEn(v.DATE)], ['who I tell (a role)', v.ROLE]]) + '\n\nMY HOURS SHEET (A3:J17)\n' + hoursText(c.user) + '\nHours with this workflow: ' + [1, 2, 3, 4, 5, 6, 7].map((i) => `${HOURS_STAGES[i - 1]}: ${c.user?.hours?.['g' + i] || ''}`).join(' · ') + '\n\n' + workflowRowsText(c.p),
        onResult: (c, text) => { const h = extractHtml(text); return h ? [artefactOp('M14', 'm14-portrait', 'Workflow Portrait', 'html', h.html)] : []; } },
      { id: 's3', title: 'Eén play, case B (transfer-run)', min: 10, thread: 'caseB', scope: 'private', maxTokens: 14000,
        desc: 'Kies één Workflow Skill en draai hem op nieuw materiaal dat hij nooit zag — zonder Ledger van deze case. Resultaat: een gelabeld concept, of een stop die benoemt wat ontbreekt.',
        inputs: [{ key: 'SKILL', type: 'skillpick', label: 'Workflow Skill' }, { key: 'CASEB', type: 'textarea', rows: 8, required: true, label: 'Case B — nieuwe, ongebruikte extract (RFP-pagina of korte opportunity-notitie)' }],
        build: (c, v) => {
          const [mid, pid] = String(v.SKILL || 'M3:P1').split(':');
          // case B has no Ledger and no workspace: every input of the skill points at case B or says "none"
          const NA = 'Not provided — needs validation';
          const defaults = { NOTES: 'see CASE B below', CRITERION: 'the criterion case B judges hardest', 'MY DRAFT': 'none', 'MY FIGURES': 'none', CONFIRMED: 'none', 'FIRST RELEASE': NA, FIGURES: 'not yet', 'SIGN-OFF': NA, 'COMMERCIAL FACTS': 'see case B', MEETING: NA, CARD: '0', OCCASION: NA, REVIEWER: NA };
          return renderP(c, mid, pid, defaults) + '\n\n' + renderP(c, 'M14', 'P3', { 'CASE B': v.CASEB });
        } },
    ],
    gate: { kind: 'none', skip: true, hint: 'Module 14 sluit deze case: geen nieuwe Ledger. Markeer de module als afgerond wanneer je eerste gebruik en 30-dagen review in je agenda staan.' },
  },
};

/** Best-effort: the first fix proposed by a review ("fix as one sentence"), to prefill "Change exactly one thing". */
export function firstFix(text, simulated) {
  const t = stripDemo(text || '');
  for (const tb of findTables(t)) {
    const fi = tb.header.findIndex((h) => /fix/i.test(h));
    const ri = tb.header.findIndex((h) => /result|pass|fail|verdict/i.test(h));
    if (fi >= 0) for (const r of tb.rows) if ((ri < 0 || /fail/i.test(r[ri] || '')) && cleanInline(r[fi]) && cleanInline(r[fi]) !== '—') return cleanInline(r[fi]);
  }
  const m = /(?:^|\n)\W*(?:\(4\)|4[.)])\s*(?:One fix[^:]*:)?\s*([^\n]{10,240})/i.exec(t);
  return m && simulated ? cleanInline(m[1]) : '';
}

export const flowOf = (modId) => FLOWS[modId];

export function moduleCards() {
  const t = (FW.modules.M8?.appendixB || []).find((x) => x.table);
  if (!t) return [];
  return t.table.slice(1).map((r) => ({ card: r[0], option: r[1], arrives: r[2], hits: r[3], forces: r[4], n: parseInt(r[0], 10) }));
}

export function hoursFilled(user) { return hoursSummary(user?.hours || {}).counted > 0; }
