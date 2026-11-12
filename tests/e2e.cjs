// End-to-end walk-through with the demo AI provider (AI_PROVIDER=mock). Requires Playwright (not a project dependency).
//   AI_PROVIDER=mock PORT=3111 DATA_DIR=/tmp/pn-e2e node server/index.js &   then   node tests/e2e.cjs
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const BASE = process.env.BASE || 'http://localhost:3111';
const SHOTS = process.env.SHOTS || '';
const fs = require('fs');
const FILE = process.env.TESTPDF || '';
let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.log('  ✗ FAIL:', m); } else console.log('  ✓', m); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('pn.user', 'E2E Director'); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }); };

  // ---------- helpers ----------
  const step = (t) => page.locator('.step', { has: page.locator('.step-head h3', { hasText: t }) }).first();
  const openStep = async (t) => { const s = step(t); if (!(await s.evaluate((e) => e.classList.contains('open')))) await s.locator('.step-head').click(); return s; };
  const fieldIn = (scope, label) => scope.locator('.field', { has: page.locator('label.f', { hasText: label }) }).first().locator('input,textarea,select').first();
  const stepDone = (t) => page.waitForFunction((t) => {
    const st = [...document.querySelectorAll('.step')].find((x) => x.querySelector('.step-head h3')?.textContent.includes(t));
    return st && st.classList.contains('done') && !document.querySelector('.streaming') && !document.querySelector('.run-btn[disabled]'); // buttons are re-enabled by the re-render that follows a finished call
  }, t, { timeout: 30000 });
  async function run(t, fills = {}, { btn, clicks = [] } = {}) {
    const s = await openStep(t);
    for (const [label, val] of Object.entries(fills)) await fieldIn(s, label).fill(val);
    for (const c of clicks) await s.locator('button', { hasText: c }).first().click();
    await s.locator('.run-btn', { hasText: btn || '' }).first().click();
    try { await stepDone(t); } catch (e) {
      const diag = await page.evaluate((t) => { const st = [...document.querySelectorAll('.step')].find((x) => x.querySelector('.step-head h3')?.textContent.includes(t)); return { cls: st?.className, err: [...document.querySelectorAll('.err')].map((x) => x.innerText.slice(0, 200)), disabled: [...document.querySelectorAll('.run-btn[disabled]')].length, streaming: !!document.querySelector('.streaming'), toasts: document.getElementById('toasts')?.innerText }; }, t);
      console.log('  … diagnose stap "' + t + '":', JSON.stringify(diag)); throw e;
    }
  }
  async function chat(t, text) {
    const s = await openStep(t);
    await s.locator('.chatbox textarea').fill(text);
    const before = await s.locator('.out').count();
    await s.locator('.chatbox .run-btn').click();
    await page.waitForFunction(({ t, before }) => { const st = [...document.querySelectorAll('.step')].find((x) => x.querySelector('.step-head h3')?.textContent.includes(t)); return st && st.querySelectorAll('.out:not(.streaming)').length > before && !document.querySelector('.run-btn[disabled]'); }, { t, before }, { timeout: 30000 });
  }
  async function gate({ decision, conds = [], flip, note } = {}) {
    const g = page.locator('.gate');
    if (decision) { await g.locator('input[placeholder]').filter({ hasNot: page.locator('x') }).first(); }
    if (decision) {
      await g.locator('.field', { hasText: 'Besluit' }).locator('input').fill(decision);
      for (let i = 0; i < conds.length; i++) {
        if (i > 0) await g.locator('button', { hasText: 'Voorwaarde toevoegen' }).click();
        const row = g.locator('.cond').nth(i);
        await row.locator('input').nth(0).fill(conds[i].text); await row.locator('input').nth(1).fill(conds[i].owner); await row.locator('input').nth(2).fill(conds[i].due);
      }
    }
    if (note) await g.locator('.field input').last().fill(note);
    await g.locator('.run-btn', { hasText: 'Gate uitvoeren' }).click();
    await page.waitForSelector('.gate button:has-text("Bevestigen en opslaan")', { timeout: 30000 });
    await page.locator('.gate button:has-text("Bevestigen en opslaan")').click();
    await page.waitForSelector('.gate .callout.green', { timeout: 10000 });
  }
  const mod = async (id) => { await page.goto(`${BASE}/#/p/${PID}/m/${id}`); await page.waitForSelector('.mhead h1'); };
  let PID;

  // ---------- 1 dashboard + demo ----------
  console.log('Dashboard & voorbeeldcase');
  await page.goto(BASE + '/'); await page.waitForSelector('.hero h1');
  await page.click('text=Probeer de voorbeeldcase'); await page.waitForSelector('.nextstep');
  PID = page.url().split('/p/')[1].split('/')[0];
  ok(!!PID, 'voorbeeldcase aangemaakt: ' + PID);
  await shot('10-overview');

  // ---------- 2 M0 quickstart ----------
  console.log('M0 snelstart');
  await page.click('text=Snelstart M0'); await page.waitForURL(/\/m\/M0/, { timeout: 30000 }); await page.waitForSelector('.gate button:has-text("Bevestigen en opslaan")');
  await page.click('.gate button:has-text("Bevestigen en opslaan")'); await page.waitForSelector('.gate .callout.green');
  ok(true, 'M0 gate opgeslagen (Ledger v0)');

  // ---------- 3 M1 ----------
  console.log('M1');
  await mod('M1');
  const s1 = await openStep('Breng mijn workflow');
  await s1.locator('.run-btn').click(); // guard: no hours yet → error toast / message
  await page.waitForTimeout(300);
  ok(await s1.locator('.runbar').innerText().then((t) => /Vul eerst/.test(t)), 'M1 guard: eerst uren invullen');
  const hrs = s1.locator('table.tbl tbody tr').first().locator('input');
  await hrs.nth(0).fill('12'); await hrs.nth(1).fill('chasing context');
  await s1.locator('table.tbl tbody tr').nth(2).locator('input').nth(0).fill('35–40');
  await page.waitForTimeout(700);
  await run('Breng mijn workflow');
  await run('De VP-uitdaging');
  await gate({ note: 'Propose, Define and Assess' });
  ok(true, 'M1 afgerond');

  // ---------- 4 M2 ----------
  console.log('M2');
  await mod('M2');
  await run('Ontdek de klant');
  const s2 = await openStep('Het gesprek');
  ok((await s2.locator('.quick button', { hasText: '★' }).count()) >= 3, 'M2: ★-vragen herkend uit tabel');
  await s2.locator('.quick button', { hasText: '★' }).first().click();
  await run('Het gesprek');
  await chat('Het gesprek', 'Who owns the handoffs today?');
  await chat('Het gesprek', 'end the meeting');
  ok((await page.locator('.callout.green', { hasText: 'Simulatie afgerond' }).count()) === 1, 'M2: simulatie afgerond');
  await gate();

  // ---------- 5 M3 ----------
  console.log('M3');
  await mod('M3');
  await run('Beoordeel de opportunity');
  await run('De pursuit committee', { 'Pursuit-kosten': '350 hours plus 2 travel days' });
  await gate({ decision: 'bid with conditions', conds: [{ text: 'References confirmed', owner: 'Delivery lead', due: '2026-11-20' }, { text: 'Legal review of liability', owner: 'Legal', due: '2026-12-01' }] });
  ok(true, 'M3 gate met besluit');

  // ---------- 6 M4 ----------
  console.log('M4');
  await mod('M4');
  await run('v1 van je zwakste');
  await run('De evaluator');
  await run('Terugkoppelen');
  await run('Optioneel: v2 opnieuw', {}, {});
  await gate({ decision: 'send v2 to bid team', conds: [{ text: 'Evidence from CFO', owner: 'CFO', due: '2026-11-25' }] });

  // ---------- 7 M5 ----------
  console.log('M5');
  await mod('M5');
  await run('Waarde en contractvorm');
  const s5 = await openStep('Jouw voorkeursvorm');
  await s5.locator('.quick button', { hasText: 'Fixed price' }).click();
  await run('Jouw voorkeursvorm');
  await run('De CFO');
  await chat('De CFO', 'We would validate the baseline with finance.');
  await chat('De CFO', 'stop');
  await gate();

  // ---------- 8 M6 / M7 ----------
  console.log('M6 / M7');
  await mod('M6');
  await run('Deel 1');
  await run('Deel 2');
  await gate();
  await page.goto(`${BASE}/#/p/${PID}/artefacts`); await page.waitForSelector('.src-item');
  ok((await page.locator('.src-item', { hasText: 'M6 Build Package' }).count()) === 1, 'M6 Build Package artefact opgeslagen');
  await mod('M7');
  await run('Bouw het klikbare prototype');
  await run('Review in zes punten');
  await run('Wijzig precies één ding');
  await gate();
  await page.goto(`${BASE}/#/p/${PID}/artefacts`); await page.waitForSelector('.src-item');
  ok((await page.locator('.src-item', { hasText: 'Prototype v2' }).count()) === 1, 'Prototype v1/v2 artefacten');
  await shot('20-artefacts');

  // ---------- 9 M8..M10 ----------
  console.log('M8–M10');
  await mod('M8');
  const s8 = await openStep('Land de verandering');
  await s8.locator('input[placeholder*="cap"]').fill('cap €1.44 M (−20%)');
  await run('Land de verandering');
  const s8b = await openStep('Jouw besluiten');
  await s8b.locator('input[placeholder*="gekozen optie"]').first().fill('phase 2 for R5');
  await s8b.locator('input[placeholder="waarom"]').first().fill('cap');
  await run('Jouw besluiten');
  await run('Blinde re-score');
  await run('De hold-test');
  await gate();
  await mod('M9');
  await run('Team en skills');
  await run('Deel 2');
  await gate();
  console.log('M10–M14: no official prompts yet → add them later through the library');
  await mod('M10');
  ok(await page.locator('.callout.amber', { hasText: 'Nog niet beschikbaar' }).count() === 1, 'M10 zonder officiële prompts: uitleg in plaats van verzonnen prompt');
  ok(await step('AI-annex').locator('.run-btn').first().isDisabled(), 'M10: uitvoeren staat uit zolang de prompt ontbreekt');
  await page.goto(`${BASE}/#/p/${PID}`); await page.waitForSelector('.nextstep');
  ok(!/M1[0-4]/.test(await page.locator('.nextstep h2').innerText()), 'volgende-stap slaat modules zonder prompts over');
  const stub = JSON.parse(fs.readFileSync(__dirname + '/fixtures/stub-prompts-m10-m14.json', 'utf8'));
  await page.goto(`${BASE}/#/library/M10`); await page.waitForSelector('.empty-slot');
  await page.locator('.card.top', { hasText: 'P1 ·' }).locator('button:has-text("Plak de officiële prompt")').click();
  await page.locator('.modal textarea').fill(stub['M10:P1'].text + '\n\nWorkshop output discipline — Return only what is requested above. Max 50 words.');
  await page.locator('.modal button:has-text("Opslaan")').click(); await page.waitForTimeout(600);
  const cur = await (await fetch(BASE + '/api/prompts')).json();
  ok(cur['M10:P1'] && /Workshop output discipline/.test(cur['M10:P1'].text), 'officiële prompt via de bibliotheek bewaard (gedeeld op de server)');
  const merged = { ...stub, ...cur };
  await fetch(BASE + '/api/prompts', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(merged) });
  await page.goto(`${BASE}/#/p/${PID}/m/M10`); await page.waitForSelector('.mhead h1');
  ok(await page.locator('.callout.amber', { hasText: 'Nog niet beschikbaar' }).count() === 0, 'M10 is actief zodra de prompt is toegevoegd');
  await mod('M10');
  await run('AI-annex', { 'Eerste release': 'site A, week 6' });
  await run('De DPO');
  await chat('De DPO', 'The vendor remains accountable under the contract; we carry the review.');
  await gate();

  // ---------- 10 M11..M14 ----------
  console.log('M11–M14');
  await mod('M11');
  await run('Mijn eigen run');
  await run('Mijn run terugmelden', { 'Taak 1': 'Opened queue, confirmed case 1, hesitated at log', 'Taak 2': 'Rejected case 2' });
  await run('Test-lite');
  await run('Wijzig precies één ding', { 'Wijziging': 'Add the time to every audit log line' });
  await run('Testrecord');
  await gate({ decision: 'freeze prototype_frozen.html', conds: [{ text: 'Re-click task 1', owner: 'DCS', due: '2026-11-18' }] });
  await mod('M12');
  await run('De bid-board notitie', { 'Wie tekent': 'VP Consulting, 18 Dec' });
  await run('De delivery lead');
  await chat('De delivery lead', 'end the rehearsal');
  await gate({ decision: 'submit with conditions', conds: [{ text: 'Finance figures in', owner: 'Finance', due: '2026-12-10' }] });
  await mod('M13');
  await run('Vijf slides', { 'De meeting': 'COO + CFO, 20 min, 12 Jan' });
  await run('De repetitie');
  await chat('De repetitie', 'end the rehearsal');
  await gate();
  await mod('M14');
  await run('Sluit mijn workflow af', { 'Echte gelegenheid': 'bid review X, 3 Dec', 'Reviewer': 'Senior Pursuit Manager' });
  await run('Mijn Workflow Portrait', { '30-dagen review': '2026-12-20', 'Wie vertel': 'VP Consulting' });
  await run('Eén play, case B', { 'Case B': 'A short opportunity note about a utility company that wants faster leak detection.' });
  await page.locator('.gate button', { hasText: 'Markeer als afgerond' }).click(); await page.waitForSelector('.gate .chip.green');

  // ---------- 11 cockpit pages ----------
  console.log('Cockpit');
  await page.goto(`${BASE}/#/p/${PID}`); await page.waitForSelector('.nextstep');
  ok(/Alle modules zijn afgerond/.test(await page.locator('.nextstep').innerText()), 'overzicht: alle modules afgerond');
  ok((await page.locator('.card.top.red .src-item').count()) >= 4, 'voorwaarden zichtbaar in cockpit');
  await shot('30-overview-done');
  await page.goto(`${BASE}/#/p/${PID}/ledger`); await page.waitForSelector('.lfields');
  ok((await page.locator('.lfield').count()) === 8, 'Ledger: 8 velden');
  await shot('31-ledger');
  await page.goto(`${BASE}/#/p/${PID}/map`); await page.waitForSelector('.wmap');
  ok((await page.locator('.wmap th.lit').count()) >= 6, 'Workflow-map: stages lit');
  await shot('32-map');
  const dl = page.waitForEvent('download');
  await page.goto(`${BASE}/#/p/${PID}`);
  await page.locator('.side a', { hasText: 'Exporteer dossier' }).click();
  const d = await dl; const path = await d.path(); const buf = fs.readFileSync(path);
  ok(buf.length > 8000 && buf.slice(0, 2).toString() === 'PK', `dossier .docx (${buf.length} bytes)`);

  // ---------- 12 library / me / settings / help ----------
  for (const [r, sel] of [['library', '.ws'], ['me', '.card.top'], ['settings', '.card.top'], ['help', '.card.top']]) { await page.goto(`${BASE}/#/${r}`); await page.waitForSelector(sel); }
  ok(true, 'bibliotheek, werkwijze, instellingen, help laden');
  await page.goto(`${BASE}/#/library/M10`); await page.waitForSelector('.card.top .code, pre.code');
  await shot('40-library');

  // ---------- 13 new pursuit with upload + casepack build ----------
  console.log('Nieuwe pursuit met upload');
  await page.goto(BASE + '/#/new'); await page.waitForSelector('form');
  await page.locator('.field', { hasText: 'Klant' }).first().locator('input').fill('Acme Water');
  await page.locator('.field', { hasText: 'Opportunity' }).first().locator('input').fill('Leak detection');
  if (FILE) { await page.setInputFiles('input[type=file]', FILE); await page.waitForSelector('.src-item', { timeout: 20000 }); ok(true, 'PDF-bron gelezen'); }
  await page.locator('button:has-text("Tekst plakken")').click();
  await page.locator('.modal textarea').fill('Gesprek 12 nov: de COO wil lekkages sneller vinden. Budget 1,2 miljoen.');
  await page.locator('.modal button:has-text("Toevoegen")').click();
  await page.click('button:has-text("Pursuit aanmaken")');
  await page.waitForURL(/casepack/); await page.waitForSelector('.tabs button.on', { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('.tabs button:not(:has(*))').length > 0 && !document.body.innerText.includes('Nog leeg'), null, { timeout: 30000 });
  ok((await page.locator('.card.tint .chip').first().innerText()).includes('/8'), 'Case Pack gebouwd uit bronnen');
  await shot('50-casepack');

  console.log('\nConsole/page errors:', errs.length ? errs : 'none');
  if (errs.length) failures += errs.length;
  await b.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL OK');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('E2E crashed:', e); process.exit(2); });
