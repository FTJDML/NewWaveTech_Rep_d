// Demo provider: deterministic canned answers so the whole app can be clicked through without an AI key.
// Every answer is marked as demo output. NOT a substitute for the real model.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MARK = '> **DEMO-OUTPUT** — gegenereerd door de demo-modus, niet door een AI-model. Stel een AI-koppeling in via Instellingen voor echte resultaten.\n\n';

const HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Demo prototype</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;margin:0}header{background:#5236AB;color:#fff;padding:10px 16px}
.banner{background:#E31937;color:#fff;padding:6px 16px;font-size:13px}main{padding:16px}.card{border:1px solid #ddd;border-top:4px solid #5236AB;padding:12px;margin:8px 0}
button{padding:6px 12px;margin-right:6px;cursor:pointer}#log{font-size:12px;color:#555}</style></head><body>
<div class="banner">Demonstrator — synthetic data — not production</div><header><b>Queue</b></header>
<main><div class="card"><b>Case 1</b> — Suggestion — a human decides<br><small>Reason: matches rule R1</small><br>
<button onclick="d('Confirm')">Confirm</button><button onclick="d('Change')">Change</button><button onclick="d('Reject')">Reject</button></div>
<div id="log">Audit log:</div></main>
<script>function d(a){document.getElementById('log').innerHTML+='<br>'+new Date(0).toISOString()+' · reviewer · '+a;}</script></body></html>`;

function modOf(msgs) {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = /WORKFLOW SKILL M(\d+)/.exec(msgs[i].content || '');
    if (m) return +m[1];
  }
  return null;
}
function ledgerFrom(msgs) {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const c = msgs[i].content || '';
    const at = c.lastIndexOf('--- My Pursuit Ledger (latest) ---');
    if (at < 0) continue;
    const led = c.slice(at);
    const m = /\*\*1 Case\*\*([\s\S]*?)\*\*2 Cast\*\*([\s\S]*?)\*\*3 One truth\*\*([\s\S]*?)(?=\*\*4 Stage reached\*\*)/.exec(led);
    if (m) return { case: m[1].trim(), cast: m[2].trim(), truth: m[3].trim() };
  }
  return null;
}

const SKILL = {
  1: `## (1) My workflow today\n| Stage | Hours today | Where the time goes |\n|---|---|---|\n| 1 Understand | 12 — F [my form], estimate — to measure | F [my form] chasing context |\n| 2 Assess | Not provided — needs validation | — |\n\nAll seven stages: see form.\n\n## (2) Three stages to reclaim\n| Stage | Why this one | What AI takes off my desk | Good human check |\n|---|---|---|---|\n| 3 Propose | F [my form] rewrites | first draft | A — compare to RFP wording |`,
  2: `## (1) Pack\n**Context** — F [01 §1] mid-size client.\n**Unknowns** — Not provided — needs validation.\n\n## (2) Cast\n| Role | Wants here | Will test us on |\n|---|---|---|\n| Decision-maker | F [04] growth without hiring | H evidence of outcome |\n\n## (3) Persona of the decision-maker\n| Field | What we believe | Validating question |\n|---|---|---|\n| H1 | H — wants proof before scale | What would convince you? |\n\n**Next contact:** clarification meeting · 26 Nov.\n| # | Question | If surprised |\n|---|---|---|\n| 1 ★ | What does success look like at month six? | re-anchor value |\n| 2 ★ | Who owns the handoffs today? | scope |\n| 3 ★ | Which budget line funds this? | form |\n| 4 | How do you judge adoption? | plan |\n| 5 | What did the last attempt miss? | risk |`,
  3: `## (1) Snapshot\n| Item | Content |\n|---|---|\n| Buying | F [02 §1] diagnostic + pilot |\n| Budget | F [02 §6] range given |\n\n## (3) Evaluation\n| Criterion | Top score needs | Evidence today | Likely score | Action |\n|---|---|---|---|---|\n| Measured value and adoption | baseline, usable prototype | Not provided — needs validation | 2 | gather references |\n\nNext stage needs — for M4: Measured value and adoption — weight × (5 − score) = 36 × 3 = 108.\n\n## (4) Win themes\n1. **Measured, not promised** — H`,
  4: `Criterion: Measured value and adoption — weight 36% — not assessed.\nCompliance: R4 — partially, F [02 §3].\n\n### FOR THE EVALUATOR\nCriterion: Measured value and adoption (36%)\nElements: baseline · logic · prototype · commitments\n\n**v1**\n1. Our understanding … 2. Our approach … Evidence: Not provided — needs validation.`,
  5: `## (1) Value narrative\n| Field | Content |\n|---|---|\n| Metric | F [03 §3] days to approval |\n\n## (3) Matrix\n| | Fixed fee | Capped T&M |\n|---|---|---|\n| Who keeps the AI gain | us | client |\n\nWhich form do you lean towards? Name it, or reply continue for my hypothesis.`,
  6: `## Part 1\n### (1) Journey\n| Step | Today | Pain | Tomorrow |\n|---|---|---|---|\n| 1 | email | chasing | queue |\n\n### (3) Stories\n**S1** As a PDM analyst I need … Given/When/Then ×3\n\nReply build package for Part 2.`,
  7: `(1) Package complete.\n\n(2)\n\`\`\`html\n${HTML}\n\`\`\`\n\n(3) Storyline: 1. Open queue 2. Confirm case 1`,
  8: `## (1) The change\n1. A (practice card 1) Cap lowered — figure typed by you.\n\n## (2) Impact map\n| Output | Changes | Stays | Decision forced |\n|---|---|---|---|\n| (a) requirements | R5 | R1 | a1 phase · a2 cut · a3 decline — owner DCS, by Fri |\n\nYour decisions — one line per row: letter, option, why. I apply only these.`,
  9: `## (1) Gap map\n| Skill and source | Phase | Role profile | Coverage | Why |\n|---|---|---|---|---|\n| Evaluating AI output | pilot | solution architect | H not evidenced | F [06] |\n\n### (3) Offer lines\nNext stage needs — for M10: Assumption — H team of 5 by start.`,
};

function gate(msgs) {
  const mod = modOf(msgs);
  const n = mod == null ? 0 : mod;
  const prior = ledgerFrom(msgs);
  const date = new Date().toISOString().slice(0, 10);
  const caseLine = prior ? prior.case : 'Client · sector · what is being bought · my role';
  const cast = prior ? prior.cast : '- Decision-maker — wants growth — tests us on evidence (H1 H2 H3)';
  const truth = (prior ? prior.truth : 'Bid decision: Open') + (n ? `\n- (M${n}) updated in the demo run` : '');
  return `## (1) Human checks\n- Facts match sources — shown\n- Gaps are real — mine to confirm\n\n## (2) Workflow row\n| Stage | Module | Trigger (when I will run this) | Input | Workflow Skill | Human check | Output |\n|---|---|---|---|---|---|---|\n| ${n <= 2 ? '1 Understand' : n === 3 ? '2 Assess' : n <= 5 ? '3 Propose' : n === 6 ? '4 Define' : n <= 10 ? '5 Build' : n === 11 ? '6 Test' : '7 Show'} | M${n} | when the next brief lands | RFP + Ledger | M${n} skill | weights match RFP | output of M${n} |\n\n## (3) Pursuit Ledger\n**1 Case** ${caseLine}\n**2 Cast** ${cast}\n**3 One truth** ${truth}\n**4 Stage reached** M${n}, ${date}\n**5 Decisions I took** —\n**6 Artefacts** M${n} output (chat)\n**7 Open — to validate** Budget owner — with CFO — by ${date}\n**8 Next stage needs** Next stage needs — for M4: Measured value and adoption`;
}

function reply(req) {
  const msgs = req.messages;
  const last = msgs[msgs.length - 1].content || '';
  const userTurns = msgs.filter((m) => m.role === 'user').length;
  if (/CASE PACK BUILDER/.test(last)) {
    return `=== 01 Client brief ===\n§1 Client and context\nF [source] Demo client, retail, 3,400 stores.\n§2 Problem\nA — baseline 1,200 submissions per month.\n§3 Why now\nH — cloud programme.\n§4 What we heard\nNot provided — needs validation.\n=== 02 Opportunity or RFP summary ===\n§1 What is bought\nF [RFP] diagnostic and pilot.\n§3 Requirements\n| ID | Priority | Requirement |\n|---|---|---|\n| R1 | Must | Shared terminology |\n§4 Evaluation criteria\n| Criterion | Weight | What evaluators want |\n|---|---|---|\n| Measured value and adoption | 60% | baseline |\n| Price | 40% | transparent |\n=== 03 Current state and risks ===\n§1 Process\nF [notes] email and spreadsheets.\n§3 Outcome\nNot provided — needs validation.\n=== 04 Stakeholder notes ===\n§1 Decision-maker — wants growth.\n=== 05 User reality ===\n§1 A day — 08:30 inbox.\n=== 06 Evidence themes ===\n§1 History — Not provided — needs validation.\n=== Case canvas ===\nClient · sector · my role\n=== Case header ===\nThis is the case in one line. Use only these documents; where they are silent, write 'Not provided — needs validation'.`;
  }
  if (/GATE — close this module/.test(last)) return gate(msgs);
  if (/MY CASE IN FIVE LINES/.test(last)) {
    return `Setup check: I can read the Case Pack documents 01–06.\n\n1. F [01 §1] Client — mid-size retailer.\n2. F [02 §1] Need — tender for a diagnostic.\n3. A Outcome — Not provided — needs validation.\n4. F [02 §4] Decision — Director decides.\n5. H Us — incumbent is stronger.\n\n**1 Case** Client · retail · tender · DCS\n**2 Cast** —\n**3 One truth** —\n**4 Stage reached** —\n**5 Decisions I took** —\n**6 Artefacts** —\n**7 Open — to validate** Outcome metric — with CFO — by next week\n**8 Next stage needs** —`;
  }
  if (/PLANTED ERRORS · step 1/.test(last)) return '**Client summary (draft)**\n\nThe client has 5,000 stores. They submit by 1 March. A director said "we must move fast". Regulation 9/2026 requires AI audits.';
  if (/^reveal/i.test(last.trim()) || /PLANTED ERRORS · step 2/.test(last)) return '| Claim as written | Type | Correct fact and tag |\n|---|---|---|\n| 5,000 stores | number | 3,400 — F [01 §1] |\n| 1 March | date | 22 Dec — F [02 §5] |\n| quote | invented | not in pack |\n| Regulation 9/2026 | over-claim | not in pack |\n| extra claim | not covered | not in pack |\n\nDraft withdrawn — not used in my Ledger.';
  if (/PRIVATE CHECK/.test(last)) return '| Claim | Verdict | Tag |\n|---|---|---|\n| 5,000 stores | Contradicted | 3,400 — F [01 §1] |\n\nContradicted: 1 · Not in my pack: 1';
  if (/You are one of the client's evaluators|Act as one of the client's evaluators/.test(last) && /RE-SCORE/.test(last)) return '| Element | v1 | v2 | Change | Why |\n|---|---|---|---|---|\n| Baseline | 2 | 3 | +1 | more direct |\n\nOverall v2: 3/5. Cannot score higher without new evidence — role: CFO.';
  if (/You are one of the client's evaluators|Act as one of the client's evaluators/.test(last)) return '(1) | Element | Score | Convinced | Missing | Margin note |\n|---|---|---|---|---|\n| Baseline | 2 | clear | evidence | cite a source |\n\n(2) Three sentences lose points …\n(3) Claims without evidence …\n(4) Overall: **2/5**';
  if (/Act as a sceptical pursuit committee/.test(last)) return '(1) Win probability: medium — F [02 §4], A, H.\n(2) Expected value in words …\n(3) Recommendation: **bid with conditions** — for DCS decision. Conditions: 1. references — owner Delivery lead — by 2026-11-20 (A).\nFlip fact: incumbent exclusivity.\n(4) 1. … 2. … 3. … 4. … 5. …\n(5) Risks: 1. … 2. … 3. …';
  if (/^From now on you are the CFO/.test(last)) return 'Q1 (value and baseline): What is the baseline, and who signed it off?';
  if (userTurns > 1 && /CFO/.test(msgs[0].content || '') && /From now on you are the CFO/.test(msgs.map((m) => m.content).join('\n'))) {
    if (/^stop$/i.test(last.trim()) || userTurns >= 7) return '**Readiness: 3/5 — rehearsed — not validated.** Fix two answers; six items to validate with finance.';
    return `Score 3/5 — convinced: specific; not: unsourced. Next question (${Math.min(5, userTurns - 1)} of 5): … `;
  }
  if (/The conversation\. You are the cast role/.test(last)) return 'Mode: shaping. Thank you for coming — go ahead, first question?\n\n(Answer to your question, as the role would give it) [simulated]';
  if (/end the meeting/i.test(last)) return '**Debrief** — readiness 3/5 · worked: … · missed: … · H1: not tested — rehearsed — not validated.';
  if (/Quality gate\./.test(last)) return '| Reviewer | Objection | Change |\n|---|---|---|\n| Primary user | F [05] too many clicks | H merge steps |\n\n(a) yes — all Musts keep priority. (b) yes — humans decide.';
  if (/Act as a sceptical reviewer of my prototype/.test(last)) return '| # | Point | Result | Evidence | Fix |\n|---|---|---|---|---|\n| 1 | Banner | Pass | F [screen 1] | — |\n| 4 | Traceable | Fail | F [screen 2] | Add the time to every log line |\n\n**Demo Notes v1** — What it demonstrates … does not prove … validate next …';
  if (/Change exactly one thing/.test(last)) return '```html\n' + HTML.replace('Audit log:', 'Audit log (v2):') + '\n```';
  if (/Part 2 — the client's side/.test(last)) return '(1) User groups … (2) Adoption … (3) Client commitments … (5) Next stage needs — for M11: team leads · loses visibility · …';
  if (/Act as a sceptical quality reviewer of this pursuit/.test(last)) return '(1) Hold test\n| Invariant | Before | After | Verdict | Fix |\n|---|---|---|---|---|\n| 1 Compliance | all Musts | R5 moved | at risk | declare |\n(2) No silent drops found\n(3) None found\n(4) conditional — owner CFO — by Friday';
  const m = modOf(msgs);
  if (/build package/i.test(last) && m === 6) return '## Part 2\n(4) NFRs … (6) Scope lock — 3 screens … (9) Master prompt: one HTML file …\n\nNext stage needs — for M7 and M11: my M6 Build Package file.';
  if (/^continue$/i.test(last.trim()) || (m === 5 && userTurns === 2)) return '## Part 2\n(4) My lean (H): hypothesis — capped T&M. (5) Pricing input pack: scope basis — to enter — DCS / finance.';
  if (/^a:/i.test(last.trim()) && m === 8) return '## Answer 2\n(3) Deltas\n| Output | Before | After |\n|---|---|---|\n| R5 | Must | partially comply — moved |\n\n(4) **EVALUATOR PACK**\nThe change as written … revised response …';
  if (m && SKILL[m]) return SKILL[m];
  return 'Mock reply to: ' + last.slice(0, 120).replace(/\n/g, ' ');
}

export async function mockStream(req, cb, signal) {
  const text = MARK + reply(req);
  for (let i = 0; i < text.length; i += 60) {
    if (signal?.aborted) throw new Error('aborted');
    cb.delta(text.slice(i, i + 60));
    await sleep(6);
  }
  const inTok = Math.round(((req.system || '').length + req.messages.reduce((a, m) => a + (m.content || '').length, 0)) / 4);
  cb.usage({ input: inTok, output: Math.round(text.length / 4), model: 'demo', truncated: false });
}
