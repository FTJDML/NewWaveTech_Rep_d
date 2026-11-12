// Edge cases: guards, truncation + continue, errors, leaving while a call runs, evidence lines, workshop mode,
// prompt overrides, manual (copy) mode.   Needs two servers:
//   AI_PROVIDER=mock PORT=3111 DATA_DIR=/tmp/pn-e2e2 node server/index.js &
//   PORT=3112 DATA_DIR=/tmp/pn-e2e3 node server/index.js &      (no AI key → copy mode)
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const BASE = process.env.BASE || 'http://localhost:3111';
const MANUAL = process.env.MANUAL || 'http://localhost:3112';
let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.log('  ✗ FAIL:', m); } else console.log('  ✓', m); };
const jpost = async (u, body, method = 'POST') => (await fetch(u, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('pn.user', 'Edge Tester'); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });

  const step = (t) => page.locator('.step', { has: page.locator('.step-head h3', { hasText: t }) }).first();
  const openStep = async (t) => { const s = step(t); if (!(await s.evaluate((e) => e.classList.contains('open')))) await s.locator('.step-head').click(); return s; };
  const fieldIn = (scope, label) => scope.locator('.field', { has: page.locator('label.f', { hasText: label }) }).first().locator('input,textarea,select').first();
  const doneWait = (t) => page.waitForFunction((t) => { const st = [...document.querySelectorAll('.step')].find((x) => x.querySelector('.step-head h3')?.textContent.includes(t)); return st && st.classList.contains('done') && !document.querySelector('.streaming'); }, t, { timeout: 30000 });
  async function run(t, fills = {}) { const s = await openStep(t); for (const [l, v] of Object.entries(fills)) await fieldIn(s, l).fill(v); await s.locator('.run-btn').first().click(); await doneWait(t); }
  const toast = () => page.locator('#toasts').innerText().catch(() => '');

  // a pursuit with one source, created through the API
  const mk = async (base, name) => (await jpost(base + '/api/pursuits', { meta: { client: name, title: 'Edge case ' + name, route: 'tender', mode: 'practice', discipline: false, context: 'both' }, sources: [{ id: 's_1', name: 'RFP.txt', type: 'rfp', text: 'The client wants faster leak detection. Budget EUR 1.2M. Decision by 1 March 2027. Criteria: value 60%, price 40%.', include: true }], casepack: { docs: { '01': { text: '§1 Client\nF [RFP.txt] Leak detection.' } } } }));
  const P = await mk(BASE, 'Edge Water'); const base = `${BASE}/#/p/${P.id}`;

  console.log('Guards');
  await page.goto(`${base}/m/M3`); await page.waitForSelector('.mhead h1');
  ok(await page.locator('.callout.red', { hasText: 'Nog geen Ledger' }).count() === 1, 'zonder Ledger: waarschuwing bovenaan de module');
  const s3 = await openStep('Beoordeel de opportunity'); await s3.locator('.run-btn').click(); await page.waitForTimeout(400);
  ok(/Ledger/.test(await step('Beoordeel').innerText()), 'zonder Ledger: skill draait niet, melding getoond');

  console.log('M0 snelstart + truncation/continue');
  await page.goto(base); await page.click('text=Snelstart M0'); await page.waitForURL(/\/m\/M0/, { timeout: 30000 }); await page.waitForSelector('.gate button:has-text("Bevestigen en opslaan")');
  await page.click('.gate button:has-text("Bevestigen en opslaan")'); await page.waitForSelector('.gate .callout.green');
  await page.goto(`${base}/m/M3`); await page.waitForSelector('.mhead h1');
  const a = await openStep('Beoordeel de opportunity'); await fieldIn(a, 'Notities').fill('MOCK_TRUNCATE'); await a.locator('.run-btn').click();
  await page.waitForSelector('.err button:has-text("Doorgaan")', { timeout: 20000 });
  ok(true, 'afgekapt antwoord → knop "Doorgaan"');
  await page.click('.err button:has-text("Doorgaan")');
  await page.waitForFunction(() => document.body.innerText.includes('CONTINUED-PART'), null, { timeout: 20000 });
  ok(!(await page.locator('.err button:has-text("Doorgaan")').count()), 'doorgaan voegt het vervolg toe in hetzelfde antwoord');

  console.log('Errors');
  await step('De pursuit committee').locator('.step-head').click();
  const c = await openStep('De pursuit committee'); await fieldIn(c, 'Pursuit-kosten').fill('MOCK_ERROR'); await c.locator('.run-btn').first().click();
  await page.waitForSelector('.err', { timeout: 10000 });
  ok(/overloaded/.test(await page.locator('.err').first().innerText()), 'API-fout wordt getoond');
  ok(!(await step('De pursuit committee').evaluate((e) => e.classList.contains('done'))), 'mislukte stap blijft "niet gedaan"');
  await fieldIn(await openStep('De pursuit committee'), 'Pursuit-kosten').fill('350 hours');
  await step('De pursuit committee').locator('.run-btn').first().click(); await doneWait('De pursuit committee');
  ok(true, 'opnieuw proberen lukt na de fout');

  console.log('Decision → condition → evidence line under the Ledger');
  const g = page.locator('.gate');
  await g.locator('.field', { hasText: 'Besluit' }).locator('input').fill('bid with conditions');
  const row = g.locator('.cond').nth(0); await row.locator('input').nth(0).fill('Reference approved'); await row.locator('input').nth(1).fill('Delivery lead'); await row.locator('input').nth(2).fill('2026-11-20');
  // required owner/date check
  await row.locator('input').nth(1).fill(''); await g.locator('.run-btn', { hasText: 'Gate uitvoeren' }).click(); await page.waitForTimeout(300);
  ok(/eigenaar/.test(await toast()), 'voorwaarde zonder eigenaar wordt geweigerd');
  await row.locator('input').nth(1).fill('Delivery lead');
  await g.locator('.run-btn', { hasText: 'Gate uitvoeren' }).click(); await page.waitForSelector('.gate button:has-text("Bevestigen en opslaan")', { timeout: 30000 });
  await page.click('.gate button:has-text("Bevestigen en opslaan")'); await page.waitForSelector('.gate .callout.green');
  await page.goto(base); await page.waitForSelector('.nextstep');
  await page.locator('button:has-text("Voldaan…")').first().click();
  await page.locator('.modal input[type=text]').fill('mail from client, reference approved');
  await page.locator('.modal button:has-text("Vastleggen")').click(); await page.waitForTimeout(800);
  await page.goto(`${base}/m/M4`); await page.waitForSelector('.mhead h1');
  const m4 = await openStep('v1 van je zwakste'); await m4.locator('details summary').first().click(); await page.waitForSelector('details pre.code');
  const prompt = await m4.locator('details pre.code').first().innerText();
  ok(/Met: condition 1 \(Reference approved\) — mail from client, reference approved, /.test(prompt), 'bewijsregel "Met: condition 1 …" staat onder de Ledger in de volgende skill');
  ok(/--- My Pursuit Ledger \(latest\) ---/.test(prompt) && !/Workshop output discipline/.test(prompt) && !/Anonymised or synthetic/.test(prompt), 'praktijkmodus: geen discipline-blok, geen anonimiseringsregel');

  console.log('Truncated gate → continue → complete Ledger');
  await page.goto(`${base}/m/M5`); await page.waitForSelector('.mhead h1');
  await run('Waarde en contractvorm');
  const lean = await openStep('Jouw voorkeursvorm'); await lean.locator('.quick button', { hasText: 'Fixed price' }).click(); await lean.locator('.run-btn').first().click(); await doneWait('Jouw voorkeursvorm');
  await page.locator('.gate input[placeholder*="form and parts"]').fill('MOCK_TRUNCATE fixed price build');
  await page.locator('.gate .run-btn', { hasText: 'Gate uitvoeren' }).click();
  await page.waitForSelector('.gate .err button:has-text("Doorgaan")', { timeout: 30000 });
  ok(true, 'afgekapt gate-antwoord → "Doorgaan" bij de review');
  await page.click('.gate .err button:has-text("Doorgaan")');
  await page.waitForSelector('.gate button:has-text("Bevestigen en opslaan")', { timeout: 20000 });
  await page.waitForFunction(() => !document.querySelector('.gate .err button'), null, { timeout: 20000 });
  await page.click('.gate button:has-text("Bevestigen en opslaan")'); await page.waitForSelector('.gate .callout.green', { timeout: 10000 });
  ok(true, 'na doorgaan is het gate compleet en op te slaan');

  console.log('Workshop mode');
  await page.goto(base); await page.locator('.side a', { hasText: 'Pursuit-instellingen' }).click();
  await page.locator('.modal select').nth(1).selectOption('workshop');
  await page.locator('.modal label.check', { hasText: 'Workshop output discipline' }).locator('input').check();
  await page.locator('.modal button:has-text("Opslaan")').click(); await page.waitForTimeout(800);
  await page.goto(`${base}/m/M4`); await page.waitForSelector('.mhead h1');
  const m4b = await openStep('v1 van je zwakste'); await m4b.locator('details summary').first().click(); await page.waitForSelector('details pre.code');
  const prompt2 = await m4b.locator('details pre.code').first().innerText();
  ok(/Workshop output discipline/.test(prompt2) && /Anonymised or synthetic material only/.test(prompt2), 'workshopmodus: origineel inclusief discipline en anonimisering');

  console.log('Leaving while a call runs');
  const Q = await mk(BASE, 'Leave Co'); const baseQ = `${BASE}/#/p/${Q.id}`;
  await page.goto(baseQ); await page.click('text=Snelstart M0'); await page.waitForURL(/\/m\/M0/, { timeout: 30000 }); await page.waitForSelector('.gate button:has-text("Bevestigen en opslaan")'); await page.click('.gate button:has-text("Bevestigen en opslaan")'); await page.waitForSelector('.gate .callout.green');
  await page.goto(`${baseQ}/m/M2`); await page.waitForSelector('.mhead h1');
  const m2 = await openStep('Ontdek de klant'); await fieldIn(m2, 'Notities').fill('MOCK_SLOW'); await m2.locator('.run-btn').click();
  await page.waitForSelector('.streaming'); await page.goto(BASE + '/#/'); await page.waitForSelector('.hero h1');
  await page.waitForTimeout(6000);
  const doc = await (await fetch(`${BASE}/api/pursuits/${Q.id}`)).json();
  const thread = doc.modules.M2?.threads?.main || [];
  ok(thread.some((m) => m.role === 'assistant' && m.step === 's1'), 'antwoord is bewaard ook nadat je wegnavigeerde');

  console.log('Prompt library override');
  await page.goto(`${BASE}/#/library/M10`); await page.waitForSelector('pre.code');
  await page.locator('.card.top', { hasText: 'P2 ·' }).locator('button:has-text("Bewerk")').click();
  const ta = page.locator('.modal textarea'); await ta.fill((await ta.inputValue()) + '\nOFFICIAL-TEXT-MARKER'); await page.locator('.modal button:has-text("Opslaan")').click(); await page.waitForTimeout(500);
  const ov = await (await fetch(BASE + '/api/prompts')).json();
  ok(ov['M10:P2']?.text.includes('OFFICIAL-TEXT-MARKER'), 'prompt-override wordt gedeeld op de server bewaard');
  await jpost(BASE + '/api/prompts', {}, 'PUT');

  console.log('Sources & Case Pack editing');
  await page.goto(`${base}/sources`); await page.waitForSelector('.src-item');
  await page.locator('.src-item button[title="Bekijk / bewerk"]').click(); await page.locator('.modal textarea').fill('Edited source text with new budget EUR 2M.'); await page.locator('.modal button:has-text("Opslaan")').click(); await page.waitForTimeout(800);
  const d2 = await (await fetch(`${BASE}/api/pursuits/${P.id}`)).json();
  ok(d2.sources[0].text.startsWith('Edited source'), 'bron bewerkt en bewaard');

  console.log('Backup');
  const bk = await (await fetch(BASE + '/api/backup')).json();
  ok(bk.pursuits.length >= 2, 'back-up bevat de pursuits');

  console.log('Copy (manual) mode');
  const R = await mk(MANUAL, 'Manual Co');
  await page.goto(`${MANUAL}/#/p/${R.id}/m/M0`); await page.waitForSelector('.mhead h1');
  ok(await page.locator('.ai-chip', { hasText: 'Kopieer-modus' }).count() === 1, 'AI-chip toont kopieer-modus');
  const m0 = await openStep('Mijn case in vijf regels'); await m0.locator('.run-btn').click();
  await page.waitForSelector('.modal textarea');
  ok((await page.locator('.modal pre.code').innerText()).includes('MY CASE IN FIVE LINES'), 'kopieer-modus toont de volledige prompt');
  await page.locator('.modal textarea').fill('1. F [01] Client — leak detection.\n**1 Case** Manual Co · water · tender · DCS');
  await page.locator('.modal button:has-text("Antwoord verwerken")').click();
  await doneWait('Mijn case in vijf regels');
  ok(true, 'plak-antwoord wordt verwerkt als resultaat van de stap');

  console.log('\nConsole/page errors:', errs.length ? errs : 'none');
  failures += errs.length;
  await b.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL OK');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('E2E-edge crashed:', e); process.exit(2); });
