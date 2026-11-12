// The artifact build against a fake claude.ai runtime (tests/harness): db limits, sample limits, downloads.
//   node tools/build-artifact.mjs && node tests/e2e-artifact.cjs
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const path = require('path'); const fs = require('fs');
const FILE = 'file://' + path.resolve(__dirname, '../dist/artifact-test.html');
const DOCX = process.env.TESTDOCX || '';
const SHOTS = process.env.SHOTS || '';
let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.log('  ✗ FAIL:', m); } else console.log('  ✓', m); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_INTERNET|net::|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }); };
  const url = (h = 'home', q = '') => `${FILE}${q}#${h}`;
  const step = (t) => page.locator('.step', { has: page.locator('.step-head h3', { hasText: t }) }).first();
  const openStep = async (t) => { const s = step(t); if (!(await s.evaluate((e) => e.classList.contains('open')))) await s.locator('.step-head').click(); return s; };
  const fieldIn = (scope, label) => scope.locator('.field', { has: page.locator('label.f', { hasText: label }) }).first().locator('input,textarea,select').first();
  const doneWait = (t) => page.waitForFunction((t) => { const st = [...document.querySelectorAll('.step')].find((x) => x.querySelector('.step-head h3')?.textContent.includes(t)); return st && st.classList.contains('done') && !document.querySelector('.streaming') && !document.querySelector('.run-btn[disabled]'); }, t, { timeout: 30000 });
  async function run(t, fills = {}) { const s = await openStep(t); for (const [l, v] of Object.entries(fills)) await fieldIn(s, l).fill(v); await s.locator('.run-btn').first().click(); await doneWait(t); }
  async function gate({ decision, conds = [] } = {}) {
    const g = page.locator('.gate');
    if (decision) {
      await g.locator('.field', { hasText: 'Besluit' }).locator('input').fill(decision);
      for (let i = 0; i < conds.length; i++) { if (i > 0) await g.locator('button', { hasText: 'Voorwaarde toevoegen' }).click(); const row = g.locator('.cond').nth(i); await row.locator('input').nth(0).fill(conds[i].text); await row.locator('input').nth(1).fill(conds[i].owner); await row.locator('input').nth(2).fill(conds[i].due); }
    }
    await g.locator('.run-btn', { hasText: 'Gate uitvoeren' }).click();
    await page.waitForSelector('.gate button:has-text("Bevestigen en opslaan")', { timeout: 30000 });
    await page.locator('.gate button:has-text("Bevestigen en opslaan")').click();
    await page.waitForSelector('.gate .callout.green', { timeout: 10000 });
  }
  const strays = (label) => page.evaluate((label) => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const t = w.currentNode; if (/^\s*(null|undefined|NaN|\[object Object\])\s*$/.test(t.data) || /nullnull|undefinedundefined/.test(t.data)) out.push(label + ': ' + t.data.trim().slice(0, 30) + ' in ' + t.parentElement.className); } return out; }, label);
  const flushDb = () => page.waitForFunction(() => { const s = window.__db.store; return Object.keys(s).length > 0; }).then(() => page.waitForTimeout(1600));

  // ------------------------------------------------------------------------
  console.log('Boot, demo case, M0');
  await page.goto(url()); await page.evaluate(() => localStorage.removeItem('__fakedb')); await page.goto(url('home')); await page.reload();
  await page.waitForSelector('.hero h1');
  ok((await page.locator('.ai-chip').innerText()).includes('Claude'), 'Claude-capability herkend (chip)');
  ok(!(await page.locator('.brand .logo').count()), 'geen merknaam in de kop zolang het team er geen instelt');
  await page.click('text=Probeer de voorbeeldcase'); await page.waitForSelector('.nextstep');
  const PID = (await page.evaluate(() => location.hash)).replace('#', '').split('-')[0];
  ok(/^p[0-9a-f]{10}$/.test(PID), 'pursuit-id is hash-vriendelijk: ' + PID);
  await page.click('text=Snelstart M0'); await page.waitForURL(/-M0$/, { timeout: 30000 }); await page.waitForSelector('.gate button:has-text("Bevestigen en opslaan")');
  await page.click('.gate button:has-text("Bevestigen en opslaan")'); await page.waitForSelector('.gate .callout.green');
  ok(true, 'M0 snelstart + gate via de sample-capability');
  { const bad = []; for (const r of ['', '-sources', '-casepack', '-ledger', '-map', '-artefacts', '-M0', '-M3']) { await page.goto(url(PID + r)); await page.waitForTimeout(350); bad.push(...(await strays(r || 'cockpit'))); } for (const r of ['library', 'me', 'instellingen', 'help', 'new', 'home']) { await page.goto(url(r)); await page.waitForTimeout(250); bad.push(...(await strays(r))); } ok(!bad.length, 'geen losse "null"/"undefined"-tekst in de schermen' + (bad.length ? ': ' + bad.join(' | ') : '')); }

  console.log('M2 / M3 / M4');
  await page.goto(url(PID + '-M2')); await page.waitForSelector('.mhead h1');
  await run('Ontdek de klant');
  ok((await (await openStep('Het gesprek')).locator('.quick button', { hasText: '★' }).count()) >= 3, 'M2: ★-vragen uit het antwoord');
  await gate();
  await page.goto(url(PID + '-M3')); await page.waitForSelector('.mhead h1');
  await run('Beoordeel de opportunity');
  await run('De pursuit committee', { 'Pursuit-kosten': '350 hours' });
  await gate({ decision: 'bid with conditions', conds: [{ text: 'References confirmed', owner: 'Delivery lead', due: '2026-11-20' }] });
  await page.goto(url(PID + '-M4')); await page.waitForSelector('.mhead h1');
  await run('v1 van je zwakste'); await run('De evaluator');
  const calls = await page.evaluate(() => window.__sample.calls);
  const ev = calls[calls.length - 1];
  ok(ev.turns === 1 && ev.bytes < 20000, `blinde evaluator: aparte aanroep zonder werkruimte (${ev.turns} beurt, ${ev.bytes} B)`);
  ok(calls.filter((c) => c.turns >= 2).length > 3 && calls.every((c) => c.cache === false), 'workspace-aanroepen: werkruimte als eerste beurt, cache uit');
  ok(calls.every((c) => c.bytes <= 262144), 'alle aanroepen binnen 256 KiB');

  console.log('Opslag (db-capability)');
  await flushDb();
  const keys = await page.evaluate(() => Object.keys(window.__db.store));
  const byColl = {}; for (const k of keys) { const parts = k.split('/'); const c = parts.length === 2 ? 'core' : parts[2]; byColl[c] = (byColl[c] || 0) + 1; }
  ok(byColl.core >= 1 && byColl.msg >= 10 && byColl.cp === 8 && byColl.lh >= 3 && byColl.mod >= 4 && byColl.gate >= 3, 'pursuit opgeslagen als shards: ' + JSON.stringify(byColl));
  ok(!(await page.locator('.toast.error').count()), 'geen opslagfouten (documentgrootte en padgrammatica gecontroleerd door de harness)');

  console.log('Herladen: alles komt terug uit de opslag');
  await page.goto(url('home')); await page.reload(); await page.waitForSelector('.pcard');
  ok((await page.locator('.pcard').count()) === 1, 'dashboard toont de bewaarde pursuit');
  await page.goto(url(PID + '-ledger')); await page.waitForSelector('.lfields');
  ok((await page.locator('.lfield').count()) === 8, 'Ledger hersteld (8 velden)');
  await page.goto(url(PID + '-M3')); await page.waitForSelector('.mhead h1');
  ok(await step('De pursuit committee').evaluate((e) => e.classList.contains('done')), 'M3-stappen en gesprekken hersteld');
  await page.goto(url(PID)); await page.waitForSelector('.nextstep');
  ok((await page.locator('.card.top.red .src-item').count()) >= 1, 'voorwaarden uit besluit hersteld in de cockpit');

  console.log('Teamgenoot wijzigt de pursuit');
  await page.evaluate((id) => { const k = 'pursuits/' + id; const d = window.__db.store[k]; window.__db.store[k] = { ...d, rev: d.rev + 5, meta: { ...d.meta, title: 'Titel gewijzigd door collega' } }; window.__db.notify(); }, PID);
  await page.waitForFunction(() => document.body.innerText.includes('Titel gewijzigd door collega'), null, { timeout: 15000 });
  ok(true, 'wijziging van een collega verschijnt zonder verversen');

  console.log('Context-budget (256 KiB per aanroep)');
  await page.goto(url(PID + '-sources')); await page.waitForSelector('.drop');
  await page.locator('button:has-text("Tekst plakken")').click();
  await page.locator('.modal textarea').fill(('Dit is een hele lange aanbestedingstekst met eisen en criteria. ').repeat(11000));
  await page.locator('.modal button:has-text("Toevoegen")').click(); await page.waitForTimeout(500);
  await page.goto(url(PID + '-M5')); await page.waitForSelector('.mhead h1');
  await run('Waarde en contractvorm');
  const calls2 = await page.evaluate(() => window.__sample.calls);
  ok(calls2[calls2.length - 1].bytes <= 262144 && calls2[calls2.length - 1].bytes > 200000, `grote bron ingekort tot binnen de limiet (${calls2[calls2.length - 1].bytes} B)`);

  console.log('Uploads en export');
  await page.goto(url('new')); await page.waitForSelector('form');
  await page.locator('.field', { hasText: 'Klant' }).first().locator('input').fill('Acme Water');
  if (DOCX) { await page.setInputFiles('input[type=file]', DOCX); await page.waitForSelector('.src-item', { timeout: 20000 }); ok((await page.locator('.src-item').first().innerText()).includes('Case_Pack'), 'Word-bestand gelezen in de browser'); }
  await page.locator('button:has-text("Tekst plakken")').click(); await page.locator('.modal textarea').fill('Gesprek: de COO wil lekkages sneller vinden.'); await page.locator('.modal button:has-text("Toevoegen")').click();
  await page.click('button:has-text("Pursuit aanmaken")'); await page.waitForURL(/casepack-build$/); await page.waitForSelector('.tabs button.on', { timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes('Nog leeg'), null, { timeout: 30000 });
  ok(true, 'Case Pack gebouwd uit bronnen');
  await page.goto(url(PID)); await page.waitForSelector('.nextstep');
  await page.locator('.side a', { hasText: 'Exporteer dossier' }).click(); await page.waitForTimeout(1500);
  const dls = await page.evaluate(() => window.__downloads);
  ok(dls.length >= 1 && /\.docx$/.test(dls[0].filename) && dls[0].head === 'PK' && dls[0].size > 6000, `dossier als .docx aangeboden (${dls[0] && dls[0].size} B)`);
  await shot('art-overview');

  console.log('Zonder capabilities');
  await page.goto(url('home', '?nocaps=sample')); await page.reload(); await page.waitForSelector('.hero h1');
  ok((await page.locator('.ai-chip').innerText()).includes('Kopieer-modus'), 'zonder Claude: kopieer-modus');
  await page.goto(url('home', '?nocaps=db')); await page.reload(); await page.waitForSelector('.hero h1');
  await page.click('text=Probeer de voorbeeldcase'); await page.waitForSelector('.nextstep');
  ok(true, 'zonder opslag (db null): app werkt in het geheugen');

  console.log('\nConsole/page errors:', errs.length ? errs : 'none');
  failures += errs.length;
  await b.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL OK');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('E2E-artifact crashed:', e); process.exit(2); });
