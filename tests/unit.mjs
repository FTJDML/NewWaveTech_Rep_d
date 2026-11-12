// Unit tests: prompt fidelity, practice patches, placeholder filling for every step, output parsers.
//   node --test tests/unit.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skills = JSON.parse(fs.readFileSync(path.join(root, 'public/data/skills.json'), 'utf8'));
globalThis.fetch = async (u) => ({ ok: true, json: async () => (String(u).includes('skills.json') ? skills : {}) });

const E = await import('../public/js/engine.js');
const { FW, loadFramework, getPrompt } = await import('../public/js/framework.js');
const { FLOWS } = await import('../public/js/flows.js');
const { RECONSTRUCTED } = await import('../public/js/reconstructed.js');
const { parseCasePack } = await import('../public/js/casepack.js');
await loadFramework();

const allPrompts = () => Object.entries(FW.modules).flatMap(([m, mod]) => mod.prompts.map((p) => ({ m, p })));

test('framework: 15 modules, M0–M9 verbatim from the guides, M10–M14 flagged as reconstructed', () => {
  assert.equal(Object.keys(FW.modules).length, 15);
  for (let i = 0; i <= 9; i++) assert.ok(!FW.modules['M' + i].reconstructed, 'M' + i);
  for (let i = 10; i <= 14; i++) assert.ok(FW.modules['M' + i].reconstructed, 'M' + i);
  assert.ok(FW.gate.text.includes('GATE — close this module'));
});

test('every module has a flow and every flow step builds a prompt that exists', () => {
  for (const id of Object.keys(FW.modules)) assert.ok(FLOWS[id], 'flow ' + id);
  for (const { m, p } of allPrompts()) assert.ok(p.text.length > 20, `${m} ${p.id}`);
});

test('workshop mode + discipline on reproduces the original text exactly', () => {
  for (const { p } of allPrompts()) {
    const out = E.resolvePrompt(p, { mode: 'workshop', discipline: true }, {});
    const orig = p.text.replace('{{DISCIPLINE}}', p.discipline || '').replace(/\n{3,}/g, '\n\n').trim();
    assert.equal(out, orig);
  }
});

test('practice patches: every patch matches somewhere (none is dead), discipline off removes the block', () => {
  const texts = allPrompts().map(({ p }) => p.text).concat(FW.gate.text);
  for (const pt of E.practicePatches({})) assert.ok(texts.some((t) => t.includes(pt.find)), 'dead patch: ' + pt.id);
  const m3 = getPrompt('M3', 'P1');
  const off = E.resolvePrompt(m3, { mode: 'practice', discipline: false }, { NOTES: 'none' });
  assert.ok(!/Workshop output discipline/.test(off));
  assert.ok(!/Anonymised or synthetic material only/.test(off));
  assert.ok(/Real client material is permitted/.test(off));
  const on = E.resolvePrompt(m3, { mode: 'practice', discipline: true }, { NOTES: 'none' });
  assert.ok(/Workshop output discipline/.test(on));
  const m7 = E.resolvePrompt(getPrompt('M7', 'P1'), { mode: 'practice', banner: 'Demo — fictional data' }, {});
  assert.ok(m7.includes('Demo — fictional data') && !m7.includes('Workshop demonstrator'));
});

test('placeholders are filled; nothing is left unresolved by any flow step', () => {
  const SAMPLE = { NOTES: 'n', FIG: 'f', 'BID EFFORT': '350 h', MARGIN: 'standard', CRITERION: 'from the Ledger', DRAFT: 'draft text', FIGURES: 'x', FIRST: 'week 6', CONFIRMED: 'none', OCC: 'o', REV: 'r', DATE: '2026-12-20', ROLE: 'VP', CASEB: 'case b text', SIGN: 's', FACTS: 'see Ledger', MEETING: 'm', CHANGE: 'one fix', V2: 'v2', PACK: 'pack', CARD: 'card', RS: 'rs', Q1: 'first q', BLIND: 'not run', LINES: 'none', T1: 'a', T2: 'b', DEC: 'a: phase 2 for R5 — cap', LEAN: 'Fixed price', HOURS: '', PKG: 'pkg', TOUCH: '', ROLES: '', COST: '', TPL: '' };
  const ctx = { p: { meta: { route: 'tender' }, artefacts: [{ id: 'm6-package', content: 'pkg' }], modules: {} }, settings: { mode: 'practice', discipline: false, banner: 'B' }, ledger: '**1 Case** x', hasDocs: true, hasLedger: true, user: { hours: { s1: '12' }, firstUse: {} }, mod: { threads: {}, data: { evaluatorPack: 'pack', scorecard: 'sc', v2: 'v2', review: '' } }, needsFor: () => [], modId: 'M3' };
  let n = 0;
  for (const [id, flow] of Object.entries(FLOWS)) {
    for (const step of flow.steps) {
      const vals = {};
      for (const i of step.inputs || []) vals[i.key] = i.type === 'card' ? { n: 1, figure: 'cap €1.44 M', clientText: '' } : i.type === 'proto' ? { name: 'p.html', html: '<html></html>' } : i.type === 'skillpick' ? 'M3:P1' : (SAMPLE[i.key] ?? 'x');
      const b = step.build({ ...ctx, modId: id }, vals);
      const text = typeof b === 'string' ? b : b.content;
      assert.ok(text && text.length > 5, `${id}.${step.id} builds`);
      assert.ok(!/\{\{DISCIPLINE\}\}/.test(text), `${id}.${step.id} discipline token`);
      const left = text.match(/\[(NOTES|BID EFFORT|MARGIN|CRITERION|MY DRAFT|MY FIGURES|CARD|BLIND SCORES|PASTE THE EVALUATOR PACK HERE|EVALUATOR PACK|PASTE v2 FROM YOUR M4 CHAT|QUESTION 1|CHANGE|PASTE THE DRAFT HERE|CONFIRMED|FIRST RELEASE|FIGURES|SIGN-OFF|COMMERCIAL FACTS|MEETING|OCCASION|REVIEWER|DATE|ROLE|CASE B|M11 LINES)\b/);
      assert.ok(!left, `${id}.${step.id}: unresolved placeholder ${left && left[0]}`);
      n++;
    }
  }
  assert.ok(n >= 35);
});

test('parseGate: tolerant of the formats a model may use', () => {
  const row = '| Stage | Module | Trigger (when I will run this) | Input | Workflow Skill | Human check | Output |\n|---|---|---|---|---|---|---|\n| 2 Assess | M3 | RFP lands | RFP | M3 | weights | bid |';
  const variants = {
    hinted: `## (1) Human checks\n- a — shown\n- b — missing\n\n## (2) Workflow row\n${row}\n\n## (3) Pursuit Ledger\n**1 Case** A\n**2 Cast** B\n**3 One truth** C\n**4 Stage reached** M3\n**5 Decisions I took** —\n**6 Artefacts** x\n**7 Open — to validate** y\n**8 Next stage needs** Next stage needs — for M4: z`,
    colon: `**(1)** checks\n1. one — shown\n\n**(2)**\n${row}\n\n**(3)**\n**1 Case:** A\n**2 Cast:** B\n**3 One truth:** C\n**4 Stage reached:** M3\n**5 Decisions I took:** —\n**6 Artefacts:** x\n**7 Open — to validate:** y\n**8 Next stage needs:** z`,
    dotted: `(1) one — shown\n${row}\n\`\`\`\n1. **Case** — A\n2. **Cast** — B\n3. **One truth** — C\n4. **Stage reached** — M3\n5. **Decisions I took** — —\n6. **Artefacts** — x\n7. **Open - to validate** — y\n8. **Next stage needs** — z\n\`\`\``,
    multiline: `${row}\n\n**1 Case**\nA line\n\n**2 Cast**\n- r1\n- r2\n\n**3 One truth**\nC\n\n**4 Stage reached**\nM3\n\n**5 Decisions I took**\n—\n\n**6 Artefacts**\nx\n\n**7 Open — to validate**\ny\n\n**8 Next stage needs**\nz\n\nFurther detail available on request.`,
  };
  for (const [k, v] of Object.entries(variants)) {
    const r = E.parseGate(v);
    assert.ok(r.row && r.row.module === 'M3', k + ' row');
    assert.ok(r.ledger, k + ' ledger');
    assert.equal(Object.keys(r.ledger.fields).length, 8, k + ' 8 fields: ' + Object.keys(r.ledger.fields));
    assert.ok(!/Further detail/.test(r.ledger.text), k + ' trailer stripped');
    assert.ok(/^\*\*1|^1/.test(r.ledger.text), k + ' ledger starts at field 1: ' + r.ledger.text.slice(0, 12));
  }
  assert.equal(E.parseGate(variants.hinted).checks.length, 2);
});

test('hours: same reading as the Excel template', () => {
  assert.equal(E.parseHours('12'), 12); assert.equal(E.parseHours('12h'), 12); assert.equal(E.parseHours('35–40'), 35); assert.equal(E.parseHours('~8'), 8);
  assert.equal(E.parseHours('two days'), null); assert.equal(E.parseHours(''), null); assert.equal(E.parseHours('12 h — estimate'), 12);
  const s = E.hoursSummary({ s1: '12', s2: '35–40', s3: 'two days', s4: 'skipped' });
  assert.deepEqual([s.sum, s.counted], [47, 2]);
});

test('decision line and dates', () => {
  const d = E.decisionLine({ text: 'bid with conditions', conditions: [{ text: 'refs', owner: 'Delivery lead', due: '2026-11-20' }], flip: { text: 'incumbent', owner: 'Legal', due: '2026-12-01' } });
  assert.equal(d, 'Decision: bid with conditions, with these conditions — refs — owner Delivery lead — by 20 November 2026.\nFlip fact to watch: incumbent — owner Legal — by 1 December 2026.');
  assert.equal(E.decisionLine({ text: '' }), '');
});

test('extractors: ★ questions, evaluator pack, html, next-stage lines, gaps, open items', () => {
  const md = '| # | Question | If |\n|---|---|---|\n| 1 ★ | What is success? | x |\n| 2 | Other | y |\n| 3 ★ | Who owns it? | z |';
  assert.deepEqual(E.extractStarQuestions(md), ['What is success?', 'Who owns it?']);
  assert.equal(E.extractBlock('intro\n### FOR THE EVALUATOR\ncrit\nv1 text\n\nFurther detail available on request.', /FOR THE EVALUATOR/i), '### FOR THE EVALUATOR\ncrit\nv1 text');
  const h = E.extractHtml('text\n```html\n<!DOCTYPE html><html><body>x</body></html>\n```');
  assert.ok(h.complete && h.html.startsWith('<!DOCTYPE'));
  assert.equal(E.extractHtml('```html\n<!DOCTYPE html><html><body>cut').complete, false);
  assert.deepEqual(E.nextStageNeeds('Next stage needs — for M4: Value\nNext stage needs — for M7 and M11: my file').map((x) => x.for), ['M4', 'M7 and M11']);
  assert.equal(E.findGaps('a\nCriterion — Not provided — needs validation\nb').length, 1);
  const oi = E.parseOpenItems('Budget owner · with CFO · by 12 Nov\n- Baseline — Finance — by 1 Dec');
  assert.deepEqual([oi[0].what, oi[0].who, oi[0].when], ['Budget owner', 'with CFO'.replace('with ', ''), '12 Nov']);
  assert.equal(oi[1].who, 'Finance');
});

test('case pack parser splits on delimiters', () => {
  const r = parseCasePack('=== 01 Client brief ===\n§1 a\n=== 02 Opportunity or RFP summary ===\n§1 b\n=== Case canvas ===\nc\n=== Case header ===\nh');
  assert.deepEqual(Object.keys(r), ['01', '02', 'canvas', 'header']);
});

test('messages: consecutive same-role merged, local/hidden dropped, starts with user', () => {
  const m = E.normalizeMessages([{ role: 'assistant', content: 'x' }, { role: 'user', content: 'a' }, { role: 'user', content: 'b' }, { role: 'assistant', content: 'c', local: true }, { role: 'assistant', content: 'd' }]);
  assert.deepEqual(m, [{ role: 'user', content: 'a\n\nb' }, { role: 'assistant', content: 'd' }]);
});

test('system prompt: practice vs workshop standing instructions', () => {
  const p = { meta: {}, casepack: { docs: { '01': { text: 'brief' } } }, sources: [{ name: 'rfp.pdf', type: 'rfp', text: 'RFP TEXT', include: true }, { name: 'off.pdf', text: 'EXCLUDED', include: false }] };
  const s = E.buildSystem(p, { mode: 'practice' });
  assert.ok(s.includes('RFP TEXT') && !s.includes('EXCLUDED') && s.includes('Case Pack — 01 Client brief'));
  assert.ok(!/anonymised case/.test(s));
  assert.ok(/anonymised case/.test(E.buildSystem(p, { mode: 'workshop' })));
  assert.ok(!E.buildSystem(p, { mode: 'practice' }, 'casepack').includes('RFP TEXT'));
});
