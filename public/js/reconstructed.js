// M10–M14: the participant guides for these modules were not part of the material supplied (M0–M9 were).
// The cards (steps, "good looks like", "stuck", "not a tender", "you leave with") are taken verbatim from the
// Participant Workbook. The Workflow Skill prompts below are RECONSTRUCTIONS written from those card
// descriptions, in the style of M0–M9 (same RULES block, STEPS / OUTPUT / HUMAN CHECK).
// Replace them with the official prompts in the Prompt Library (Bibliotheek → Bewerk) as soon as available.

export const RULES = `RULES
Facts come only from my case documents in this workspace, my Pursuit Ledger and this chat — no mail, chat, file or web search. Outside code, fictional records and test tasks, start every line or table cell with F [source] (document and section, "Ledger" or "my notes"), A (assumption) or H (hypothesis to validate). Where the sources are silent, write "Not provided — needs validation". Never decide bid / no-bid, price, margin, staffing or legal terms, and never assess a named person: mark such points "for DCS decision". Anonymised or synthetic material only; if you see a real name or personal data, say so once and continue without it.`;

const DISC_TAIL = ' If information is missing, write: "Not provided — needs validation." Do not fill gaps unless labelled as an assumption. Close with one line: "Further detail available on request." Nothing after it. A turn that ends on a question or a request to me ends on that line, without this line. (Remove this block after the workshop to receive the full output.)';
const disc = (limits) => 'Workshop output discipline — Return only what is requested above. No introduction, no recap, no commentary. Hard limits (source tags and labels not counted): ' + limits + '.' + DISC_TAIL;

const MISSING = 'A required input is missing? Ask once, in one line; then write "Not provided — needs validation" and continue.';
const LEDGER_IN = 'My Pursuit Ledger — pasted below this skill. Required: if it is missing, ask me for it before anything else.';

const M10_P1 = `WORKFLOW SKILL M10 · AI annex and revised offer
Stage 5 of 7 · Build · AI-Native DCS Academy
Use when: team and adoption hold and the offer must answer the client's AI questions inside the client's rules. Not for: legal conclusions, price, margin or contract signature.

INPUTS
1. ${LEDGER_IN} Answer any "Next stage needs — for M10" line first (Assumption · Dependency · Risk with contingency).
2. The RFP or opportunity documents and my case documents in this workspace.
3. What is confirmed in writing — a client policy, a signed clause, an approved tool: [CONFIRMED — or "none"]
4. Where and when I go live first: [FIRST RELEASE — e.g. "site A, week 6"]
${MISSING}

${RULES}

STEPS
1. The annex — six answers, D1–D6: the six questions an AI-literate buyer asks. Nothing is claimed without a source: a control is "in place" only where a document, my Ledger or [CONFIRMED] says so; otherwise "planned" or "to validate" (owner, date).
D1 How we used AI — in preparing this offer and in delivery: where, for what, with which human check. Name the tool class only — "[our enterprise AI tool]" — never a brand.
D2 What it costs to run — the cost drivers and the formula that links them; never a unit price or a total unless a source gives one.
D3 Who is accountable — by role, ours and the client's.
D4 How it is governed — human confirmation of AI output, audit log, change control of models and prompts, incident route; add what my contract form obliges us to govern (outcome-linked: measurement integrity; managed service: run and monitoring; fixed price: change control; T&M: reporting and the path to a measured form).
D5 What happens to the client's data — categories, personal or not, location, retention, use for training, against the client's rules for AI in my documents; a conflict is a question for counsel, never an answer.
D6 Who keeps the gain — per my contract-form lean in my Ledger, with its precondition.
2. Revise the offer: my first release ([FIRST RELEASE]) and my "Next stage needs — for M10" lines appear word for word; add the team lines from M9; define the outcome metric — metric · start and stop events · baseline · target · by when · who measures · how often · from which system (from my Ledger; a missing part: "Not provided — needs validation"). Nothing new is promised; no price, discount or margin.
3. Legal or regulatory points: record each as a question for counsel, never as a conclusion.
4. Self-check: no brand name in D1; no unit price or total in D2; every "in place" has a source; every legal line is a question; nothing decided for me.

OUTPUT
(1) The annex: one table, 6 rows, columns Question · Our answer · Status (in place · planned · to validate) · Source, or owner and date. (2) Governance for my contract form: max 5 lines. (3) The revised offer: one table, columns Offer line · Content · Source; then the outcome metric definition: one table, 8 rows. (4) Questions for counsel: max 5 lines.

HUMAN CHECK — mine, before the gate
- "In place" appears only where a source or written confirmation says so.
- My "for M10" lines and my first release appear in the offer unchanged.
- I can say how we use AI, and who checks it, in 30 seconds.

{{DISCIPLINE}}`;

const M10_P2 = `Act as the client's data protection officer from the cast in my Pursuit Ledger — by role. You read the AI annex D1–D6 and the revised offer above before they reach the client. Careful, precise, unimpressed by adjectives. Use only my case documents, my Ledger and this chat; where they are silent, ask as a DPO plausibly would and mark it [simulated].

(1) The three answers in D1–D6 you would accept as written, with the source that carries each. (2) The three you would challenge — a claim without a source, a control marked "in place" without evidence, a conflict with the client's rules for AI — each with the question you would ask. (3) What you would need to see on categories, location, retention and training use before you agree. (4) Questions for counsel that the annex must not answer itself — never a legal conclusion. (5) The 30-second answer: how we use AI and who checks it, written as I would say it aloud — max 70 words, first person plural, no brand, no figure I did not give.

Then ask me one follow-up: "Who pays if your AI gets it wrong?" and wait. After my answer, score it 1–5 with two lines (what convinced you, what did not), marked "rehearsed — not validated".

{{DISCIPLINE}}`;

const M11_P1 = `WORKFLOW SKILL M11 · Quick user test — my own run
Stage 6 of 7 · Test · AI-Native DCS Academy
Use when: a prototype exists and nobody outside the team has seen it yet. Not for: production testing, accuracy claims or effort estimates.

INPUTS
1. ${LEDGER_IN}
2. My latest prototype file (the _v2.html, or _v1.html if I made no change) — attached or pasted below my Ledger. Required: without it, ask me for it once and do nothing else.
3. My M11 lines: the lines headed "Next stage needs — for M11" in my Ledger. None: write "none" — the test then uses my primary user.
${MISSING}

${RULES}

STEPS
1. My M11 lines, word for word. Name the persona to test with: the group my M9 line names, else the primary user from my cast, tagged F or H.
2. The two tasks a sceptical user of that persona would do first — each from my build package or Ledger (story ID, storyline step), in the user's words. Tell me to open the prototype and click them myself now. Stop and wait for my reply in this form: "MY RUN — 1: … · 2: …" (what I did, what happened, where I hesitated).
3. When I reply: one line per task — worked · worked with friction · failed — with my own words as the evidence, tagged F [my run]. Nothing about the prototype that I did not report. Then the one question I could not answer by clicking.

OUTPUT
First answer: (1) my M11 lines, (2) the two tasks; then stop. Second answer, after MY RUN: (3) my run, two lines; the open question.

HUMAN CHECK — mine, before the gate
- I clicked my own two tasks before the simulated user did.
- The tasks come from my build package, not from the model's imagination.

{{DISCIPLINE}}`;

const M11_P2 = `You are the primary user — a sceptical person who has never seen this prototype and owes its makers nothing. Use only the prototype file in this chat and the lines I paste below (the persona and my M11 lines) — no mail, chat, file or web search, and nothing from other chats.

PERSONA AND MY M11 LINES
[M11 LINES — persona and lines pasted by the app]

Click through the prototype as that user would and report, in the first person: (1) Three tasks you try, in order — each: what you expected · what you did · what happened · where you hesitated. (2) The one issue most likely to make you stop using it, and why. (3) Where a reason line, "Suggestion — a human decides", Confirm, Change or Reject made you trust it more or less. (4) One fix, as one sentence I can paste into "Change exactly one thing". (5) Your verdict on the prototype hypothesis (if the user can do X, the metric moves): supported, contradicted or not tested — marked "rehearsed — not validated".

{{DISCIPLINE}}`;

const M11_P3 = `Change exactly one thing in the prototype: [CHANGE — one sentence, e.g. the fix from the simulated user's report]. If it asks for two different changes, apply only the first. Keep everything else identical — the same screens, records, banner, suggestions, confirm steps and log. Add no feature, screen, record or styling. Return the complete updated HTML file in one code block.

{{DISCIPLINE}}`;

const M12_P1 = `WORKFLOW SKILL M12 · Bid-board note and delivery sign-off
Stage 7 of 7 · Show · AI-Native DCS Academy
Use when: the offer is ready for submission and delivery and my VP must sign what we promise. Not for: taking the board's decision, pricing or legal conclusions.

INPUTS
1. ${LEDGER_IN}
2. Finance's figures: [FIGURES — finance's figures exactly as given, "illustrative", or "not yet"]
3. Who signs, and when: [SIGN-OFF — roles and date]
4. My unit's bid-board template, only if I give it under my Ledger.
${MISSING}

${RULES}

STEPS
1. Compliance: every client Must — comply · partially comply · do not comply, with source (document and section); the exclusion rules of the procurement process checked one by one.
2. Finance's figures, word for word as I gave them — none computed, no total, share or margin of yours: the maximum against the cap or budget in the client's rules, stated as given. "not yet": write "Not provided — needs validation" and make obtaining finance's figures the first condition (owner, calendar date).
3. Delivery: key roles and readiness from M9, the contract-form preconditions from M5, the AI annex from M10, the prototype from M11 — each met · open · at risk, with source.
4. Every earlier condition in my Ledger (bid, reopen, earlier bid-board conditions): met · open · missed — "met" only with evidence in my documents, my Ledger or this chat; otherwise open, or missed where its date is on or before my case date or today.
5. The decision asked of the bid board, in my route's words (tender: submit · submit with conditions · do not submit; renewal: renew · reshape · let go; change request: accept · reshape · decline), marked "for DCS decision", with the conditions you propose (owner by role, calendar date, A). You never take the decision.
6. Sign-off agenda: who signs which line, from [SIGN-OFF]; anything simulated reads "rehearsed — not validated".

OUTPUT
(1) The note's header line. (2) Compliance: one table. (3) Figures: one table — Item · As given by finance · Cap or budget · Source. (4) Delivery: one table. (5) Conditions: one table — Condition · Owner · Date · Status · Evidence. (6) The decision asked, and the proposed conditions. (7) The sign-off agenda.

HUMAN CHECK — mine, before the gate
- My figures appear word for word — none computed, the maximum against the cap.
- Every earlier condition reads met, open or missed — with evidence.
- The verdict reads "rehearsed — not validated"; the real sign-off is booked.

{{DISCIPLINE}}`;

const M12_P2 = `From now on you are our delivery lead from the cast in my Pursuit Ledger — by role. You read the bid-board note above and must sign that we can deliver what the offer promises. Direct, experienced, unwilling to sign hope. Use only my case documents, my Ledger and this chat; where they are silent, ask as a delivery lead plausibly would and mark it [simulated].

Ask four questions, one at a time, in this order: scope and the estimate behind the figures · team and key roles by the start · dependencies and the client's commitments · the first release date and what happens if it slips. After each of my answers, score it 1–5 with two lines (what convinced you, what did not). A figure I cannot source scores 1–2. Never propose a price, a number of days or a figure yourself.

After my fourth answer, or when I write "end the rehearsal", leave the role and give: readiness 1–5, marked "rehearsed — not validated" · the two commitments you would refuse to sign today · the evidence that would change that (owner by role, by when).

{{DISCIPLINE}}`;

const M13_P1 = `WORKFLOW SKILL M13 · Five slides for the decision meeting
Stage 7 of 7 · Show · AI-Native DCS Academy
Use when: we are shortlisted or the decision meeting is booked, and the people who decide give us a short slot. Not for: new commitments, pricing or legal terms.

INPUTS
1. ${LEDGER_IN}
2. My commercial facts, exactly as submitted: [COMMERCIAL FACTS — as submitted, or "see Ledger"]
3. The meeting: [MEETING — who attends by role, minutes, date]
4. H1–H3 of the decision-maker in my Ledger. Missing: copy them from my M2 chat under my Ledger ("H1–H3: …").
${MISSING}

${RULES}

STEPS
1. Mode, one line first — choose it from my Ledger and say which: tender (the deck serves the published criteria) or non-tender (direct award, renewal, change request: the deck asks for one decision, with the client's criteria under "Serves").
2. Five slides whose titles alone carry the argument — a reader who sees only the five titles understands what we ask and why: 1 The result you want (their outcome, baseline and target, in their words) · 2 Why it works here (the approach in three moves, each tied to H1–H3 or a client Must) · 3 What you will see working (the demonstrator; none: the user journey in three steps — and say so) · 4 What it takes, and how we are paid (my commercial facts word for word; contract form; who keeps the AI gain) · 5 The decision we ask today (one decision, owner, date). Per slide: title (a full sentence, max 14 words) · three bullets at most · evidence tag F, A or H · "Serves:" the criterion or client need · what the speaker says in 20 seconds.
3. Never add a commitment, figure, reference or date that is not in my Ledger or documents; where a slide needs one: "Not provided — needs validation".
4. Self-check: my commercial facts appear word for word; nothing new is promised; the titles read alone make the argument.

OUTPUT
(1) The mode line. (2) The five titles, read alone, one line. (3) Five slide blocks. (4) The three questions the decision-maker and the CFO will ask first, from H1–H3 and the cast (H).

HUMAN CHECK — mine, before the gate
- My commercial facts appear word for word — nothing new promised.
- I can say each title aloud in one sentence.
- No working prototype? Slide 3 says so and shows the user journey.

{{DISCIPLINE}}`;

const M13_P2 = `From now on you play, in turn, the decision-maker and the CFO from the cast in my Pursuit Ledger — by role. Start as the decision-maker, speaking as its cast line and H1–H3 describe: short on time, courteous, direct. Use only my five slides, my case documents, my Ledger and this chat; where they are silent, ask as the role plausibly would and mark it [simulated].

Ask me two questions, one at a time, each taken from where my slides are weakest. After each of my answers, score it 1–5 with two lines: what was missing first — evidence or a limit — and what convinced you. When I write "switch to the CFO", play the CFO: two questions, same scoring, impatient with adjectives, never proposing a price or a figure. When I write "end the rehearsal", leave the role and give: readiness 1–5 per role, marked "rehearsed — not validated" · the one answer to change before the real meeting · H1–H3: supported, contradicted or not tested, one line each · the next real step (owner by role, calendar date) · v2 of the one slide that needs it.

{{DISCIPLINE}}`;

const M14_P1 = `WORKFLOW SKILL M14 · Close my workflow
Stage 7 of 7 · Show · AI-Native DCS Academy
Use when: the modules are done and I turn my rows, notes and first steps into the workflow I keep. Not for: measuring anyone else, targets for my team or pricing.

INPUTS
1. My Pursuit Ledger — pasted below this skill (optional here: my workflow rows are the source).
2. My workflow: my gate rows (stage · module · trigger · input · skill · human check · output) with my first step and my note — "My note" holds my corrections of the model — and my Hours (hours today and hours with this workflow), exactly as I wrote them.
3. My occasion for the first real use, and my reviewer (a role): [OCCASION — a real meeting, deadline or decision] · [REVIEWER — a role]
${MISSING}

${RULES}

STEPS
1. Error log: every correction from "My note" — what the model got wrong · in which skill · what I check now because of it. Nothing I did not write.
2. Human checks, sharpened: per skill I keep, the one check that would have caught the error; each names a source I can open.
3. The three stages I start with on Monday, chosen from my hours today (most hours, sharpest pain), my hours with this workflow and my notes — each with skill (module), trigger, input, human check, output. Hours are mine, as I wrote them: never rounded, totalled or estimated by you.
4. The first real use within seven days: the play (one skill) · the real occasion · date · input (what goes into my workspace) · human check and reviewer (role) · what I measure (effort including the reviewer's time and rework · quality · rework · reuse) · stop rule (when I do it by hand) · the 30-day review date.

OUTPUT
(1) Error log: one table. (2) Human checks: one line per skill. (3) The three stages: one table. (4) First use: one table, 7 rows.

HUMAN CHECK — mine, before the gate
- Every correction from My note is in the log; my human checks are sharper because of it.
- My hours appear exactly as I gave them.

{{DISCIPLINE}}`;

const M14_P2 = `Draw my Workflow Portrait: one page, before and after, as one HTML file — inline CSS and plain JavaScript, no libraries, no external calls, under 300 lines, one code block. Use only my Hours sheet and my workflow rows below, and this chat. Show my seven stages with hours today and hours with this workflow exactly as I wrote them (ranges as written; where a total is needed use only the totals I give; never compute, round or estimate a figure yourself), the three stages I start with, my first real use, my 30-day review date [DATE] and who I tell [ROLE]. Mark every estimate "estimate — to measure". Return the complete file from <!DOCTYPE html> to </html>.

{{DISCIPLINE}}`;

const M14_P3 = `TRANSFER RUN — case B
Run the workflow skill above in this chat on a case it has never seen. Use only case B below — nothing from other chats or documents, and no Ledger from case A. Where case B is silent, write "Not provided — needs validation". The result is a labelled draft (F, A or H), or a stop that names exactly what is missing before the skill can run.

CASE B
[CASE B — paste the new extract: an unused RFP page or a short opportunity note]`;

const rows3 = (a) => a.map((x, i) => ({ n: String(i + 1), min: x[0], do: x[1], paste: x[2] }));

export const RECONSTRUCTED = {
  M10: {
    num: 10, stageName: 'Build', minutes: 45, title: 'AI Governance & Commercial Response', reconstructed: true,
    moment: 'the AI annex and the revised offer', question: 'Team and adoption hold. Now the AI annex and the offer — inside the client\'s rules.',
    intro: 'Every AI-literate buyer asks six questions: how you used AI, what it costs to run, who is accountable, how it is governed, what happens to their data, who keeps the gain. One skill answers them honestly — nothing claimed without a source — adds what your contract form obliges you to govern, and revises the offer. The client\'s DPO tests it; you leave with a 30-second answer.',
    steps: rows3([[12, 'Annex and offer. New chat in your case workspace, "M10 · Annex": paste the skill; [CONFIRMED] = what is confirmed in writing (usually none); [FIRST RELEASE] = where and when you go live first. Your Ledger under it; send.', 'P1'], [9, 'The DPO, then aloud. Same chat: paste the review. Read block (5) — then say it aloud in 30 seconds, and answer the follow-up "who pays if your AI gets it wrong?". Save it in your phone notes.', 'P2'], [6, 'Gate. Same chat: paste the gate. Conditions due today read "met" only with evidence. Row M10, first step, Ledger.', 'Gate']]),
    good: ['"In place" only where a source or written confirmation says so', 'Your "for M10" lines and your first release appear in the offer unchanged', 'You can say how you use AI, and who checks it, in 30 seconds'],
    stuck: ['A tool brand in D1? Back to "[our enterprise AI tool]" — the name goes in the final document.', 'A unit price or total in D2? Where is the source? If none, it comes out — formula and drivers only.', 'A legal line reads as an answer? Turn it into a question for counsel.'],
    notATender: 'No tender, or a client who never asked about AI? Write the annex anyway: an AI-literate buyer asks these six questions sooner or later. Renewal or change request? "Phase 1" is the next contract period or the change itself; "first release" is the first date the client sees it working. No AI in your service today? The annex says so and invents none.',
    leaveWith: 'AI annex D1–D6 · governance for your contract form · revised offer with the team lines · outcome metric definition · DPO review · a 30-second answer on how you use AI',
    page2: { momentQuestion: 'When a client asks how you use AI today, who answers — and with what?', momentRows: ['When it starts', 'What I do · what AI does', 'What I check myself', 'Time it takes'], momentCols: ['Today — how I do this now', 'From now — how I want to do it'], firstStepSuggestion: 'Turn D1–D6 into a draft standard AI annex and send it to legal, by ______' },
    prompts: [
      { id: 'P1', title: 'Workflow Skill M10 — AI annex and revised offer', how: ['New chat in your case workspace, "M10 · Annex". [CONFIRMED]: what is confirmed in writing — usually "none". [FIRST RELEASE]: where and when you go live first. Paste your Ledger under the skill; send.'], text: M10_P1, discipline: disc('(1) max 25 words per cell; (2) max 5 lines of 25 words; (3) max 25 words per cell; (4) max 5 lines of 25 words') },
      { id: 'P2', title: 'The DPO — and your 30 seconds', how: ['Same chat. Copy, paste, send. Answer the follow-up in your own words.'], text: M10_P2, discipline: disc('five numbered blocks, max 80 words each; block (5) max 70 words; the score line max 40 words') },
    ],
    appendixB: [],
  },
  M11: {
    num: 11, stageName: 'Test', minutes: 30, title: 'Quick User Test & Freeze', reconstructed: true,
    moment: 'before we submit', question: 'Before we submit, someone who has never seen it clicks it.',
    intro: 'Before anyone outside the team sees your prototype, someone who has never seen it clicks it — you first, then a sceptical simulated user in a private chat. One issue, one fix, a frozen file. Thirty minutes.',
    steps: rows3([[5, 'My own run. New chat in your case workspace, "M11 · Freeze": paste the opener with your Ledger under it. Open your latest prototype (_v2, or _v1 if you made no change); click two tasks a sceptical user would do; type "MY RUN — 1: … · 2: …".', 'P1'], [11, 'Test-lite. A private chat: attach the same file and paste the test-lite with your M11 lines. Then "Change exactly one thing" with its fix; save as [case]_frozen.html; on it, click what you changed, then your task 1 again.', 'P2 · P3'], [6, 'Freeze and gate. Back in "M11 · Freeze": paste the test record, then your decision line, then the gate.', 'P4 · Gate']]),
    good: ['You clicked your own two tasks before the simulated user did', 'One fix only — on the frozen file the change shows and task 1 still works', 'The verdict reads "rehearsed — not validated"'],
    stuck: ['No lines for M11 in your Ledger? Write "none" in [MY LINES]: the test uses your primary user.', 'ChatGPT or Gemini refuses the .html file? Attach a copy renamed to .txt.', 'No prototype file? Copy the last code block from your M7 chat and save it. None there: do not freeze — write a decision line with an owner and a date.', 'The fix broke something that worked? Save your previous file as _frozen; the fix goes to Open. Your own run fails on both? Do not freeze: "Decision: escalate to [role]".'],
    notATender: 'No tender? Same test: the frozen file is what your decision-maker clicks at your next meeting.',
    leaveWith: 'Frozen version · user test record · the verdict on your prototype hypothesis',
    page2: { momentQuestion: 'Who clicks your demos before a client does — today, and from now?', momentRows: ['When it starts', 'Who tests it · what AI does', 'What I check myself'], momentCols: ['Today — how I do this now', 'From now — how I want to do it'], firstStepSuggestion: 'Ask one colleague to click my next demo before it is shown — by ______' },
    prompts: [
      { id: 'P1', title: 'Workflow Skill M11 — my own run', how: ['New chat in your case workspace, "M11 · Freeze". Paste the skill, your Ledger under it; attach your latest prototype. Click the two tasks, then type "MY RUN — 1: … · 2: …".'], text: M11_P1, discipline: disc('first answer: (1) max 60 words, (2) two tasks, max 25 words each; second answer max 80 words') },
      { id: 'P2', title: 'Test-lite — the simulated user (private chat)', how: ['Private chat (tool card), never your workspace. Attach the same prototype file. Paste, with your M11 lines in place of the bracket.'], text: M11_P2, discipline: disc('five numbered blocks; (1) three rows of max 40 words; (2) max 40 words; (3) max 40 words; (4) one sentence; (5) max 30 words') },
      { id: 'P3', title: 'Change exactly one thing', how: ['The simulated user\'s fix, one sentence. Save the result as [case]_frozen.html.'], text: M11_P3, discipline: disc('the complete HTML file in one code block, nothing else') },
    ],
    appendixB: [],
  },
  M12: {
    num: 12, stageName: 'Show', minutes: 35, title: 'Bid Board & Delivery Sign-off', reconstructed: true,
    moment: 'submission on Friday', question: 'We submit on Friday. Delivery and my VP must sign what we promise.',
    intro: 'Delivery and your VP must sign what you promise. One skill writes the bid-board note — compliance, finance\'s figures word for word against the cap, delivery, every earlier condition — and asks for a decision it never takes. Then your delivery lead tests the estimate in four questions.',
    steps: rows3([[7, 'The note. New chat in your case workspace, "M12 · Bid board": paste the skill with [FIGURES] (finance\'s, illustrative, or "not yet") and [SIGN-OFF]; your Ledger under it — and your unit\'s template, if you have one. Send.', 'P1'], [8, 'The delivery lead. Same chat: paste the rehearsal. Four questions, one at a time; then write "end the rehearsal".', 'P2'], [5, 'Decide, then gate. One message: your decision line on top — "Decision: submit with conditions …" (or renew, reshape, let go — accept, reshape, decline), owners and dates — then the gate under it.', 'P3 · Gate']]),
    good: ['Your figures appear word for word — none computed, the maximum against the cap', 'Every earlier condition reads met, open or missed — with evidence', 'The verdict reads "rehearsed — not validated"; the real sign-off is booked'],
    stuck: ['No figures from finance? "not yet" — getting them becomes your first condition.', 'A total or a share appears that you never typed? "Out — the note carries finance\'s figures only."', 'A condition you met is marked missed? One line under your Ledger: "Met: condition 2 — evidence, date." Run it again.'],
    notATender: 'No formal tender? "Submission" is the date your offer goes to the client, "compliance" is the client\'s stated requirements, and the bid board is whoever in your unit approves the offer. The decision asked uses your route\'s words — renewal: renew, reshape or let go; change request: accept, reshape or decline.',
    leaveWith: 'Bid-board decision note · delivery-lead rehearsal and readiness score',
    page2: { momentQuestion: 'How does a bid get signed off in your unit today — by whom, on what, and how late?', momentRows: ['When it starts', 'What I bring · what AI does', 'What I check myself'], momentCols: ['Today — how I do this now', 'From now — how I want to do it'], firstStepSuggestion: 'Book the real sign-off now, with the notes table as the agenda — on ______' },
    prompts: [
      { id: 'P1', title: 'Workflow Skill M12 — the bid-board note', how: ['New chat in your case workspace, "M12 · Bid board". [FIGURES]: finance\'s figures exactly as given, "illustrative", or "not yet". [SIGN-OFF]: who signs, and when. Paste your Ledger under the skill; send.'], text: M12_P1, discipline: disc('(2)–(5) max 20 words per cell, max 10 rows; (1) and (6) max 40 words; (7) max 6 lines') },
      { id: 'P2', title: 'The delivery lead', how: ['Same chat. Copy, paste, send. Four questions, one at a time; then write "end the rehearsal".'], text: M12_P2, discipline: disc('each in-role question max 40 words; the debrief max 120 words') },
    ],
    appendixB: [],
  },
  M13: {
    num: 13, stageName: 'Show', minutes: 50, title: 'Client Presentation', reconstructed: true,
    moment: 'shortlisted: twenty minutes with the people who decide', question: 'We are shortlisted. Twenty minutes with the people who decide.',
    intro: 'Twenty minutes with the people who decide. One skill turns your Ledger into five slides whose titles alone carry the argument, with your commercial facts word for word. Then your decision-maker and CFO test you — and you answer aloud first, as you will in the room.',
    steps: rows3([[10, 'Five slides. New chat in your case workspace, "M13 · Presentation": paste the skill with [COMMERCIAL FACTS] (as submitted, or "see Ledger") and [MEETING]; your Ledger under it. Read the five titles alone.', 'P1'], [13, 'The rehearsal. Same chat: paste the rehearsal. Two answers to the decision-maker, then write "switch to the CFO"; two answers; then "end the rehearsal". Say each answer aloud first — what was missing: first, evidence or limit? — then type it.', 'P2'], [6, 'Gate. Bid-board conditions due? One line each — met with evidence, or not met. Then the gate.', 'Gate']]),
    good: ['Your commercial facts appear word for word — nothing new promised', 'You answered first, in one sentence, aloud', 'H1–H3 read "rehearsed — not validated"; the debrief names the next real step'],
    stuck: ['The mode line is wrong? Tell it in one line and run the skill again in the same chat.', 'No H1–H3 in your Ledger? Copy them from your Module 2 chat under your Ledger: "H1–H3: …".', 'No working prototype? The demonstrator slide becomes the user journey in three steps — and says so.'],
    notATender: 'Not a tender? The skill reads your Ledger: a direct award, a renewal or a change request is non-tender — the deck asks for one decision, with the client\'s criteria under Serves. Wrong mode? Tell it in one line and run it again.',
    leaveWith: 'Five-slide presentation · scored rehearsal with your decision-maker and CFO · v2',
    page2: { momentQuestion: 'How do you prepare orals or a decision meeting today — and which answer would you now say differently?', momentRows: ['When it starts', 'What I do · what AI does', 'What I check myself', 'Time it takes'], momentCols: ['Today — how I do this now', 'From now — how I want to do it'], firstStepSuggestion: 'Voice-memo my opening answer, and listen to it once, before my next client meeting on ______' },
    prompts: [
      { id: 'P1', title: 'Workflow Skill M13 — five slides', how: ['New chat in your case workspace, "M13 · Presentation". [COMMERCIAL FACTS]: as submitted, or "see Ledger". [MEETING]: who attends, how long, when. Paste your Ledger under the skill; send.'], text: M13_P1, discipline: disc('(1) max 30 words; (2) one line; (3) per slide max 70 words; (4) three questions, max 20 words each') },
      { id: 'P2', title: 'The rehearsal — decision-maker, then CFO', how: ['Same chat. Copy, paste, send. Answer aloud first, then type. "switch to the CFO", then "end the rehearsal".'], text: M13_P2, discipline: disc('each in-role question max 40 words; the debrief max 200 words') },
    ],
    appendixB: [],
  },
  M14: {
    num: 14, stageName: 'Show', minutes: 55, title: 'My Workflow from Monday', reconstructed: true,
    moment: 'the award, and the Monday after', question: 'Whatever the award, this is the workflow I keep.',
    intro: 'Two days of rows, notes and first steps become the workflow you keep. One prompt closes it — error log, human checks, the three stages you start with, a first real use. One more draws your portrait: one page, before and after. Then you install one play in your own tool and prove it on a case it has never seen.',
    steps: rows3([[9, 'Close. New chat in your case workspace, "M14 · Close": paste the close with your occasion and your reviewer (a role), your sheets Workflow and Hours under it. Then type your hours with this workflow into the sheet Hours (column G) and paste the seven First use lines at First use, cell B4.', 'P1'], [9, 'Portrait. Same chat: paste the portrait with your 30-day review date, who you tell, and your sheet Hours A3:J17. Open it in the preview, or save as .html; print or keep.', 'P2'], [10, 'One play, case B. Install one Workflow Skill in your own tool (a Project, agent or Gem); in a new chat inside it, the transfer run with case B.', 'P3 · P4']]),
    good: ['Every correction from My note is in the log; your human checks are sharpened by it', 'Your portrait shows your hours exactly as you gave them', 'On case B: a labelled draft, or a stop that names what is missing'],
    stuck: ['No new material for case B? Mini-case B, Valewater — attach it and write "see the attached file".', 'The portrait stops before </html>? Send: "Return the complete file again — shorter text in the cells, every row and stage kept."'],
    notATender: 'Account work? Your three stages may be Understand, Propose and Show — the close chooses from your hours. Case B can be the next renewal or change request on your desk.',
    leaveWith: 'Your pursuit workflow, closed · three stages you start with on Monday · one skill proven on new material · the automated chain, seen',
    page2: { firstStepSuggestion: 'Run my [Mx] play on [occasion] on [date], reviewed by [role]; 30-day review on [date]' },
    prompts: [
      { id: 'P1', title: 'Workflow Skill M14 — close my workflow', how: ['New chat in your case workspace, "M14 · Close". [OCCASION] and [REVIEWER] (a role). Your workflow rows and Hours go under the skill.'], text: M14_P1, discipline: disc('(1) max 20 words per cell; (2) one line per skill, max 25 words; (3) max 20 words per cell; (4) 7 rows, max 20 words per cell') },
      { id: 'P2', title: 'The Workflow Portrait', how: ['Same chat. [DATE]: your 30-day review. [ROLE]: who you tell. Your Hours sheet goes under the prompt.'], text: M14_P2, discipline: disc('the complete HTML file in one code block, nothing else') },
      { id: 'P3', title: 'Transfer run — case B', how: ['A new chat with ONE skill installed. Paste this under the skill, with case B in place of the bracket.'], text: M14_P3, discipline: '' },
    ],
    appendixB: [],
  },
};
