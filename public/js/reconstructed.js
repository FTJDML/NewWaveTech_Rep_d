// M10–M14: the participant guides for these modules were not part of the supplied material (M0–M9 were).
// What IS known comes verbatim from the Participant Workbook: the card (steps, "good looks like", "stuck",
// "not a tender", "you leave with") and the page-2 prompts. The Workflow Skill prompts are deliberately EMPTY:
// the app never invents framework text. Paste the official prompts in the Prompt Library (Bibliotheek → module →
// Bewerk) and the module activates for the whole team. The placeholders the workbook names are already wired:
// [CONFIRMED] [FIRST RELEASE] (M10) · [MY LINES] (M11) · [FIGURES] [SIGN-OFF] (M12) · [COMMERCIAL FACTS] [MEETING] (M13).
// An earlier draft reconstruction lives in git history (commit a7cc067, public/js/reconstructed.js) and, as a
// test fixture, in tests/fixtures/stub-prompts-m10-m14.json.

const rows3 = (a) => a.map((x, i) => ({ n: String(i + 1), min: x[0], do: x[1], paste: x[2] }));

export const RECONSTRUCTED = {
  M10: {
    num: 10, stageName: 'Build', minutes: 45, title: 'AI Governance & Commercial Response', pending: true,
    moment: 'the AI annex and the revised offer', question: 'Team and adoption hold. Now the AI annex and the offer — inside the client\'s rules.',
    intro: 'Every AI-literate buyer asks six questions: how you used AI, what it costs to run, who is accountable, how it is governed, what happens to their data, who keeps the gain. One skill answers them honestly — nothing claimed without a source — adds what your contract form obliges you to govern, and revises the offer. The client\'s DPO tests it; you leave with a 30-second answer.',
    steps: rows3([[12, 'Annex and offer. New chat in your case workspace, "M10 · Annex": paste the skill; [CONFIRMED] = what is confirmed in writing (usually none); [FIRST RELEASE] = where and when you go live first. Your Ledger under it; send.', 'P1'], [9, 'The DPO, then aloud. Same chat: paste the review. Read block (5) — then say it aloud in 30 seconds, and answer the follow-up "who pays if your AI gets it wrong?". Save it in your phone notes.', 'P2'], [6, 'Gate. Same chat: paste the gate. Conditions due today read "met" only with evidence. Row M10, first step, Ledger.', 'Gate']]),
    good: ['"In place" only where a source or written confirmation says so', 'Your "for M10" lines and your first release appear in the offer unchanged', 'You can say how you use AI, and who checks it, in 30 seconds'],
    stuck: ['A tool brand in D1? Back to "[our enterprise AI tool]" — the name goes in the final document.', 'A unit price or total in D2? Where is the source? If none, it comes out — formula and drivers only.', 'A legal line reads as an answer? Turn it into a question for counsel.'],
    notATender: 'No tender, or a client who never asked about AI? Write the annex anyway: an AI-literate buyer asks these six questions sooner or later. Renewal or change request? "Phase 1" is the next contract period or the change itself; "first release" is the first date the client sees it working. No AI in your service today? The annex says so and invents none.',
    leaveWith: 'AI annex D1–D6 · governance for your contract form · revised offer with the team lines · outcome metric definition · DPO review · a 30-second answer on how you use AI',
    page2: { momentQuestion: 'When a client asks how you use AI today, who answers — and with what?', momentRows: ['When it starts', 'What I do · what AI does', 'What I check myself', 'Time it takes'], momentCols: ['Today — how I do this now', 'From now — how I want to do it'], firstStepSuggestion: 'Turn D1–D6 into a draft standard AI annex and send it to legal, by ______' },
    prompts: [
      { id: 'P1', title: 'Workflow Skill M10 — AI annex and revised offer', how: ['New chat in your case workspace, "M10 · Annex". [CONFIRMED]: what is confirmed in writing — usually "none". [FIRST RELEASE]: where and when you go live first. Paste your Ledger under the skill; send.'], text: '', discipline: '', missing: true },
      { id: 'P2', title: 'The DPO — and your 30 seconds', how: ['Same chat. Copy, paste, send. Answer the follow-up in your own words.'], text: '', discipline: '', missing: true },
    ],
    appendixB: [],
  },
  M11: {
    num: 11, stageName: 'Test', minutes: 30, title: 'Quick User Test & Freeze', pending: true,
    moment: 'before we submit', question: 'Before we submit, someone who has never seen it clicks it.',
    intro: 'Before anyone outside the team sees your prototype, someone who has never seen it clicks it — you first, then a sceptical simulated user in a private chat. One issue, one fix, a frozen file. Thirty minutes.',
    steps: rows3([[5, 'My own run. New chat in your case workspace, "M11 · Freeze": paste the opener with your Ledger under it. Open your latest prototype (_v2, or _v1 if you made no change); click two tasks a sceptical user would do; type "MY RUN — 1: … · 2: …".', 'P1'], [11, 'Test-lite. A private chat: attach the same file and paste the test-lite with your M11 lines. Then "Change exactly one thing" with its fix; save as [case]_frozen.html; on it, click what you changed, then your task 1 again.', 'P2 · P3'], [6, 'Freeze and gate. Back in "M11 · Freeze": paste the test record, then your decision line, then the gate.', 'P4 · Gate']]),
    good: ['You clicked your own two tasks before the simulated user did', 'One fix only — on the frozen file the change shows and task 1 still works', 'The verdict reads "rehearsed — not validated"'],
    stuck: ['No lines for M11 in your Ledger? Write "none" in [MY LINES]: the test uses your primary user.', 'ChatGPT or Gemini refuses the .html file? Attach a copy renamed to .txt.', 'No prototype file? Copy the last code block from your M7 chat and save it. None there: do not freeze — write a decision line with an owner and a date.', 'The fix broke something that worked? Save your previous file as _frozen; the fix goes to Open. Your own run fails on both? Do not freeze: "Decision: escalate to [role]".'],
    notATender: 'No tender? Same test: the frozen file is what your decision-maker clicks at your next meeting.',
    leaveWith: 'Frozen version · user test record · the verdict on your prototype hypothesis',
    page2: { momentQuestion: 'Who clicks your demos before a client does — today, and from now?', momentRows: ['When it starts', 'Who tests it · what AI does', 'What I check myself'], momentCols: ['Today — how I do this now', 'From now — how I want to do it'], firstStepSuggestion: 'Ask one colleague to click my next demo before it is shown — by ______' },
    prompts: [
      { id: 'P1', title: 'Workflow Skill M11 — my own run', how: ['New chat in your case workspace, "M11 · Freeze". Paste the skill, your Ledger under it; attach your latest prototype. Click the two tasks, then type "MY RUN — 1: … · 2: …".'], text: '', discipline: '', missing: true },
      { id: 'P2', title: 'Test-lite — the simulated user (private chat)', how: ['Private chat (tool card), never your workspace. Attach the same prototype file. Paste, with your M11 lines in place of the bracket.'], text: '', discipline: '', missing: true },
      { id: 'P3', title: 'Change exactly one thing', how: ['The simulated user\'s fix, one sentence. Save the result as [case]_frozen.html.'], text: '', discipline: '', missing: true },
    ],
    appendixB: [],
  },
  M12: {
    num: 12, stageName: 'Show', minutes: 35, title: 'Bid Board & Delivery Sign-off', pending: true,
    moment: 'submission on Friday', question: 'We submit on Friday. Delivery and my VP must sign what we promise.',
    intro: 'Delivery and your VP must sign what you promise. One skill writes the bid-board note — compliance, finance\'s figures word for word against the cap, delivery, every earlier condition — and asks for a decision it never takes. Then your delivery lead tests the estimate in four questions.',
    steps: rows3([[7, 'The note. New chat in your case workspace, "M12 · Bid board": paste the skill with [FIGURES] (finance\'s, illustrative, or "not yet") and [SIGN-OFF]; your Ledger under it — and your unit\'s template, if you have one. Send.', 'P1'], [8, 'The delivery lead. Same chat: paste the rehearsal. Four questions, one at a time; then write "end the rehearsal".', 'P2'], [5, 'Decide, then gate. One message: your decision line on top — "Decision: submit with conditions …" (or renew, reshape, let go — accept, reshape, decline), owners and dates — then the gate under it.', 'P3 · Gate']]),
    good: ['Your figures appear word for word — none computed, the maximum against the cap', 'Every earlier condition reads met, open or missed — with evidence', 'The verdict reads "rehearsed — not validated"; the real sign-off is booked'],
    stuck: ['No figures from finance? "not yet" — getting them becomes your first condition.', 'A total or a share appears that you never typed? "Out — the note carries finance\'s figures only."', 'A condition you met is marked missed? One line under your Ledger: "Met: condition 2 — evidence, date." Run it again.'],
    notATender: 'No formal tender? "Submission" is the date your offer goes to the client, "compliance" is the client\'s stated requirements, and the bid board is whoever in your unit approves the offer. The decision asked uses your route\'s words — renewal: renew, reshape or let go; change request: accept, reshape or decline.',
    leaveWith: 'Bid-board decision note · delivery-lead rehearsal and readiness score',
    page2: { momentQuestion: 'How does a bid get signed off in your unit today — by whom, on what, and how late?', momentRows: ['When it starts', 'What I bring · what AI does', 'What I check myself'], momentCols: ['Today — how I do this now', 'From now — how I want to do it'], firstStepSuggestion: 'Book the real sign-off now, with the notes table as the agenda — on ______' },
    prompts: [
      { id: 'P1', title: 'Workflow Skill M12 — the bid-board note', how: ['New chat in your case workspace, "M12 · Bid board". [FIGURES]: finance\'s figures exactly as given, "illustrative", or "not yet". [SIGN-OFF]: who signs, and when. Paste your Ledger under the skill; send.'], text: '', discipline: '', missing: true },
      { id: 'P2', title: 'The delivery lead', how: ['Same chat. Copy, paste, send. Four questions, one at a time; then write "end the rehearsal".'], text: '', discipline: '', missing: true },
    ],
    appendixB: [],
  },
  M13: {
    num: 13, stageName: 'Show', minutes: 50, title: 'Client Presentation', pending: true,
    moment: 'shortlisted: twenty minutes with the people who decide', question: 'We are shortlisted. Twenty minutes with the people who decide.',
    intro: 'Twenty minutes with the people who decide. One skill turns your Ledger into five slides whose titles alone carry the argument, with your commercial facts word for word. Then your decision-maker and CFO test you — and you answer aloud first, as you will in the room.',
    steps: rows3([[10, 'Five slides. New chat in your case workspace, "M13 · Presentation": paste the skill with [COMMERCIAL FACTS] (as submitted, or "see Ledger") and [MEETING]; your Ledger under it. Read the five titles alone.', 'P1'], [13, 'The rehearsal. Same chat: paste the rehearsal. Two answers to the decision-maker, then write "switch to the CFO"; two answers; then "end the rehearsal". Say each answer aloud first — what was missing: first, evidence or limit? — then type it.', 'P2'], [6, 'Gate. Bid-board conditions due? One line each — met with evidence, or not met. Then the gate.', 'Gate']]),
    good: ['Your commercial facts appear word for word — nothing new promised', 'You answered first, in one sentence, aloud', 'H1–H3 read "rehearsed — not validated"; the debrief names the next real step'],
    stuck: ['The mode line is wrong? Tell it in one line and run the skill again in the same chat.', 'No H1–H3 in your Ledger? Copy them from your Module 2 chat under your Ledger: "H1–H3: …".', 'No working prototype? The demonstrator slide becomes the user journey in three steps — and says so.'],
    notATender: 'Not a tender? The skill reads your Ledger: a direct award, a renewal or a change request is non-tender — the deck asks for one decision, with the client\'s criteria under Serves. Wrong mode? Tell it in one line and run it again.',
    leaveWith: 'Five-slide presentation · scored rehearsal with your decision-maker and CFO · v2',
    page2: { momentQuestion: 'How do you prepare orals or a decision meeting today — and which answer would you now say differently?', momentRows: ['When it starts', 'What I do · what AI does', 'What I check myself', 'Time it takes'], momentCols: ['Today — how I do this now', 'From now — how I want to do it'], firstStepSuggestion: 'Voice-memo my opening answer, and listen to it once, before my next client meeting on ______' },
    prompts: [
      { id: 'P1', title: 'Workflow Skill M13 — five slides', how: ['New chat in your case workspace, "M13 · Presentation". [COMMERCIAL FACTS]: as submitted, or "see Ledger". [MEETING]: who attends, how long, when. Paste your Ledger under the skill; send.'], text: '', discipline: '', missing: true },
      { id: 'P2', title: 'The rehearsal — decision-maker, then CFO', how: ['Same chat. Copy, paste, send. Answer aloud first, then type. "switch to the CFO", then "end the rehearsal".'], text: '', discipline: '', missing: true },
    ],
    appendixB: [],
  },
  M14: {
    num: 14, stageName: 'Show', minutes: 55, title: 'My Workflow from Monday', pending: true,
    moment: 'the award, and the Monday after', question: 'Whatever the award, this is the workflow I keep.',
    intro: 'Two days of rows, notes and first steps become the workflow you keep. One prompt closes it — error log, human checks, the three stages you start with, a first real use. One more draws your portrait: one page, before and after. Then you install one play in your own tool and prove it on a case it has never seen.',
    steps: rows3([[9, 'Close. New chat in your case workspace, "M14 · Close": paste the close with your occasion and your reviewer (a role), your sheets Workflow and Hours under it. Then type your hours with this workflow into the sheet Hours (column G) and paste the seven First use lines at First use, cell B4.', 'P1'], [9, 'Portrait. Same chat: paste the portrait with your 30-day review date, who you tell, and your sheet Hours A3:J17. Open it in the preview, or save as .html; print or keep.', 'P2'], [10, 'One play, case B. Install one Workflow Skill in your own tool (a Project, agent or Gem); in a new chat inside it, the transfer run with case B.', 'P3 · P4']]),
    good: ['Every correction from My note is in the log; your human checks are sharpened by it', 'Your portrait shows your hours exactly as you gave them', 'On case B: a labelled draft, or a stop that names what is missing'],
    stuck: ['No new material for case B? Mini-case B, Valewater — attach it and write "see the attached file".', 'The portrait stops before </html>? Send: "Return the complete file again — shorter text in the cells, every row and stage kept."'],
    notATender: 'Account work? Your three stages may be Understand, Propose and Show — the close chooses from your hours. Case B can be the next renewal or change request on your desk.',
    leaveWith: 'Your pursuit workflow, closed · three stages you start with on Monday · one skill proven on new material · the automated chain, seen',
    page2: { firstStepSuggestion: 'Run my [Mx] play on [occasion] on [date], reviewed by [role]; 30-day review on [date]' },
    prompts: [
      { id: 'P1', title: 'Workflow Skill M14 — close my workflow', how: ['New chat in your case workspace, "M14 · Close". [OCCASION] and [REVIEWER] (a role). Your workflow rows and Hours go under the skill.'], text: '', discipline: '', missing: true },
      { id: 'P2', title: 'The Workflow Portrait', how: ['Same chat. [DATE]: your 30-day review. [ROLE]: who you tell. Your Hours sheet goes under the prompt.'], text: '', discipline: '', missing: true },
      { id: 'P3', title: 'Transfer run — case B', how: ['A new chat with ONE skill installed. Paste this under the skill, with case B in place of the bracket.'], text: '', discipline: '', missing: true },
    ],
    appendixB: [],
  },
};
