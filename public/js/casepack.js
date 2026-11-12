// Case Pack: the six documents + canvas + header. Derived from the Case Builder prompt (Step 2) for REAL pursuits:
// same structure and §-numbering, but real names and figures are used as given and nothing is invented.
import { CASEPACK_KEYS, CASEPACK_TITLES, workspaceFiles, dateEn, utf8Bytes } from './engine.js';
import { ROUTES } from './flows.js';

export const BUILDER_PROMPT = `CASE PACK BUILDER — live case
(Derived from the Case Builder prompt, Step 2 — adapted for a real pursuit: real names, figures and dates are used exactly as the sources give them; nothing is shifted, aliased or invented.)

You are my case designer for the CGI AI-Native DCS pursuit framework. Turn the sources below into my Case Pack: six documents, a case canvas and a case header, in English.

RULES
- Facts come only from the sources below. Tag every line or table cell with F [source — file name and page or section], A (assumption) or H (hypothesis to validate). Where the sources are silent, write "Not provided — needs validation" — never invent a plausible detail. These gaps are the questions a director would chase: keep them visible, do not fill them.
- Same names, figures and dates everywhere. If two sources contradict each other, say so in one line, tag both and mark it "Not provided — needs validation" (which source holds).
- No legal conclusion — record legal points as questions for Legal. Never decide bid / no-bid, price, margin or staffing, and never assess a named person.
- Numbered sections (§1, §2 …) in every document, so that modules can cite "02 §3". Tables where they help. No word limits: be complete but compact.

THE SIX DOCUMENTS
01 Client brief — client name; sector; size; strategy; the problem in numbers; why now; what we have heard (conversation notes and summaries, tagged F with their source).
02 Opportunity or RFP summary — what is being bought; scope in and out; requirements R1–Rn, each Must or Should as the RFP marks them (unmarked: H); evaluation criteria with their published weights (say so if they do not add up to 100%; none published: H, "how the client will decide"); evaluators by role (each profiled in 04); dated timeline; budget range or value; procurement and contact rules (page limits, exclusions, who may be contacted and how); permitted contract forms, payment and liability; incumbent and competitors. Without an RFP (renewal, change request, own proposal, direct award): cover the same points for the client's own decision.
03 Current state and risks — the process and systems today; baseline figures with units (inflow, team capacity, backlog, cycle time, error rate, cost per work item) — only those the sources give, reconciled if they disagree; the client's outcome as they would put it: one metric with start and stop events, baseline and target in the same unit, by when, who measures it, how often, from which system (a missing part: "Not provided — needs validation"); the data (categories, personal or not) and the client's rules for AI; constraints; past attempts; adoption risks.
04 Stakeholder notes — every person the sources mention: name · role · wants · fears · stance on CGI and past contact with us · one paraphrased remark. Mark the sponsor and the evaluation panel. Look for: decision-maker, CFO, procurement, IT or architecture, data protection or risk, operational owner, front-line user, sceptic — a role the sources do not show: "Not provided — needs validation".
05 User reality — the primary user's day in time-stamped steps (task, tool, time or pain); workarounds; what they would never let a machine decide; the work items they handle (cases, claims …): the 5–6 fields they look at and each field's possible values. Not in the sources: "Not provided — needs validation".
06 Evidence themes — our history with this client (current work, past bids, contacts) and what the contact rules mean for it; what CGI could show (no invented references: "comparable delivery — reference to validate"); delivery constraints; role profiles we staff from (title and skills, never an assessment of a person).
Then the CASE CANVAS, as short lines: client · sector and any account · my role · the situation in one sentence · what I must decide or achieve in the next 60 days · who decides, influences, uses (roles) · the outcome and its baseline · what is sourced, what is assumed, what is missing.
Then the CASE HEADER: three sentences I can paste at the top of any new chat — the case in one line, the six documents, and "Use only these documents; where they are silent, write 'Not provided — needs validation'."

OUTPUT FORMAT — start every part with its delimiter on its own line, exactly as below, and write nothing outside the parts:
=== 01 Client brief ===
=== 02 Opportunity or RFP summary ===
=== 03 Current state and risks ===
=== 04 Stakeholder notes ===
=== 05 User reality ===
=== 06 Evidence themes ===
=== Case canvas ===
=== Case header ===`;

export const UPDATE_TAIL = `UPDATE MODE
Below are my current Case Pack and one or more NEW sources. Update the Case Pack with what the new sources add or change. Return ONLY the documents that change, each complete, with the same delimiter line, and keep their numbering. Keep every unchanged line word for word; mark each changed or added line with "(updated [today's date or source date])" at its end. If a new source contradicts the current pack, keep both versions, tag them and mark "Not provided — needs validation" (which holds). Never remove a gap unless a source answers it.`;

const DELIM = /^===\s*(.+?)\s*===\s*$/gm;

export function parseCasePack(text) {
  const t = String(text || '').replace(/^> \*\*DEMO-OUTPUT\*\*[^\n]*\n\n?/, '').replace(/```[a-z]*\n?/g, '');
  const found = [...t.matchAll(DELIM)];
  const out = {};
  found.forEach((m, i) => {
    const title = m[1].toLowerCase();
    let key = null;
    const num = /^(0[1-6])\b/.exec(title);
    if (num) key = num[1]; else if (/canvas/.test(title)) key = 'canvas'; else if (/header/.test(title)) key = 'header';
    if (!key) return;
    const body = t.slice(m.index + m[0].length, found[i + 1] ? found[i + 1].index : t.length).trim();
    if (body) out[key] = body;
  });
  return out;
}

export function builderMessage(p, { mode = 'build', newSources = [], maxBytes } = {}) {
  const m = p.meta || {};
  const lines = [BUILDER_PROMPT, '', `ROUTE: ${ROUTES[m.route] || 'Tender / RFP'}.${m.role ? ' MY ROLE: ' + m.role + '.' : ''}${m.client ? ' CLIENT: ' + m.client + '.' : ''}${m.title ? ' OPPORTUNITY: ' + m.title + '.' : ''}${m.caseDate ? ' CASE DATE: ' + dateEn(m.caseDate) + ' (the case is in the past — read dates against it).' : ''}`];
  if (m.submissionDate) lines.push(`Known dates: submission ${dateEn(m.submissionDate)}${m.decisionDate ? ', decision ' + dateEn(m.decisionDate) : ''}.`);
  // sources are shortened to fit one AI call where the platform limits the size of a call (artifact build)
  const room = () => (maxBytes ? Math.max(8000, maxBytes - utf8Bytes(lines.join('\n')) - 600) : undefined);
  if (mode === 'update') {
    lines.push('', UPDATE_TAIL, '', 'CURRENT CASE PACK');
    for (const k of CASEPACK_KEYS) { const d = p.casepack?.docs?.[k]; if (d?.text) lines.push(`=== ${/^\d/.test(k) ? k + ' ' : ''}${CASEPACK_TITLES[k]} ===`, d.text); }
    lines.push('', 'NEW SOURCES');
    const subset = { ...p, sources: (p.sources || []).filter((s) => newSources.includes(s.id)) };
    lines.push(...workspaceFiles(subset, { scope: 'sources', maxBytes: room() }));
  } else {
    lines.push('', 'SOURCES');
    const srcs = workspaceFiles(p, { scope: 'sources', maxBytes: room() });
    lines.push(...(srcs.length ? srcs : ['(no sources — write only the structure with "Not provided — needs validation")']));
  }
  return lines.join('\n');
}

export function packChecks(p) {
  const docs = p.casepack?.docs || {};
  const present = CASEPACK_KEYS.filter((k) => docs[k]?.text);
  const gaps = present.reduce((a, k) => a + (docs[k].text.match(/Not provided\s*[—–-]\s*needs validation/gi) || []).length, 0);
  // weights in 02 §… table: percentages that should total 100
  let weights = null;
  const d2 = docs['02']?.text || '';
  const m = d2.match(/(?:evaluation|criteri)[\s\S]{0,2500}/i);
  if (m) {
    const nums = [...m[0].matchAll(/\|\s*[^|\n]*\|\s*(\d{1,3}(?:[.,]\d+)?)\s*%/g)].map((x) => parseFloat(x[1].replace(',', '.')));
    if (nums.length) weights = { total: Math.round(nums.reduce((a, b) => a + b, 0) * 10) / 10, n: nums.length };
  }
  return { present, missing: CASEPACK_KEYS.filter((k) => !docs[k]?.text), gaps, weights, outcome: /03[\s\S]*?outcome/i.test(d2) ? true : !!(docs['03']?.text && /outcome/i.test(docs['03'].text)) };
}
