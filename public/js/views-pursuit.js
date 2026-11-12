import { h, append, icon, toast, modal, confirmBox, fmtDate, fmtDateTime, relTime, daysUntil, uid, autoGrow, clear, copyText, downloadText, downloadBlob, slugify, refreshApp } from './ui.js';
import { S, patch, streamAI, saveUser, flush, previewUrl, exportDocx, removePursuit, saveFile, platform } from './state.js';
import { FW } from './framework.js';
import { mountMarkdown, renderMarkdown } from './md.js';
import {
  STAGES, CASEPACK_KEYS, CASEPACK_TITLES, findTables, cleanInline, parseLedger, parseOpenItems, nextStageNeeds, findGaps, todayIso, dateEn, estimateTokens, fmtTokens, hoursSummary, parseHours, LEDGER_FIELDS, ledgerBlock,
} from './engine.js';
import { ROUTES, HOURS_STAGES, FLOWS } from './flows.js';
import { ORDER, OPTIONAL, modTitle, modStatus, nextModule, stageState, progress, allConditions, dueState, refDate, available } from './helpers.js';
import { viewSources } from './views-sources.js';
import { builderMessage, parseCasePack, packChecks } from './casepack.js';
import { settingsOf, manualAsk, makeCtx, runStep, runGate, saveGate, composeGate, explainError } from './runtime.js';
import { viewModule } from './views-module.js';
import { R, go } from './routes.js';

// ------------------------------------------------------------------------------------------------
export function previewHtml(html, title = 'Prototype') {
  const frame = h('iframe', { class: 'preview-frame', sandbox: 'allow-scripts', title });
  let url = null;
  previewUrl(html).then((u) => { if (u) { url = u; frame.src = u; } else frame.srcdoc = html; }).catch((e) => toast('Voorbeeld mislukt: ' + e.message, 'error'));
  modal({ title, wide: true, body: h('div', { class: 'stack' }, h('div', { class: 'callout' }, h('b', null, 'Sandbox'), 'Het prototype draait geïsoleerd: geen netwerk, geen toegang tot de app of je gegevens. Klik de hele storyline door en controleer wat het doet voor je het laat zien.'), frame),
    actions: [platform.kind === 'server' ? { label: 'Open in nieuw tabblad', kind: 'ghost', keep: true, onClick: () => { if (url) window.open(url, '_blank', 'noopener'); } } : null, { label: 'Download .html', kind: 'ghost', keep: true, onClick: () => saveFile(slugify(title) + '.html', html, 'text/html') }, { label: 'Sluiten', kind: 'primary' }].filter(Boolean) });
}

export async function exportDossier(p, which = 'all') {
  const sections = [];
  const docs = p.casepack?.docs || {};
  const m = p.meta || {};
  const cur = p.ledger?.current;
  sections.push({ title: 'Pursuit-samenvatting', markdown: [`**Klant:** ${m.client || ''}`, `**Opportunity:** ${m.title || ''}`, `**Route:** ${ROUTES[m.route] || ''}`, m.submissionDate ? `**Inschrijving:** ${dateEn(m.submissionDate)}` : '', m.decisionDate ? `**Gunning:** ${dateEn(m.decisionDate)}` : '', `**Eigenaar:** ${p.owner || ''}`, `**Gegenereerd:** ${new Date().toLocaleString('nl-NL')}`].filter(Boolean).join('\n\n') });
  if (cur) sections.push({ title: 'Pursuit Ledger — ' + cur.module, markdown: cur.text });
  const conds = allConditions(p);
  if (conds.length) sections.push({ title: 'Besluiten en voorwaarden', markdown: '| Besluit | Voorwaarde | Eigenaar | Uiterlijk | Status |\n|---|---|---|---|---|\n' + conds.map((c) => `| ${c.decision.module}: ${c.decision.text.replace(/\|/g, '/')} | ${c.text.replace(/\|/g, '/')} | ${c.owner || ''} | ${c.due ? dateEn(c.due) : ''} | ${c.status} |`).join('\n') });
  for (const k of CASEPACK_KEYS) if (docs[k]?.text) sections.push({ title: (/^\d/.test(k) ? k + ' ' : '') + CASEPACK_TITLES[k], markdown: docs[k].text, pageBreak: k === '01' });
  for (const id of ORDER) {
    const mod = p.modules?.[id]; if (!mod?.threads) continue;
    const parts = [];
    for (const step of FLOWS[id].steps) {
      for (const tn of Object.keys(mod.threads)) {
        const msgs = mod.threads[tn].filter((x) => x.step === step.id && x.role === 'assistant');
        msgs.forEach((x) => parts.push(`## ${step.title}${tn !== 'main' ? ' (privé-chat: ' + tn + ')' : ''}\n\n` + x.content.replace(/^> \*\*DEMO-OUTPUT\*\*[^\n]*\n\n?/, '')));
      }
    }
    const gate = mod.threads.main?.filter((x) => x.step === 'gate' && x.role === 'assistant').pop();
    if (gate) parts.push('## Gate\n\n' + gate.content.replace(/^> \*\*DEMO-OUTPUT\*\*[^\n]*\n\n?/, ''));
    if (parts.length) sections.push({ title: `${id} · ${modTitle(id)}`, markdown: parts.join('\n\n'), pageBreak: true });
  }
  for (const a of p.artefacts || []) if (a.kind === 'md' && !/Build Package|Client pack/.test(a.name)) sections.push({ title: 'Artefact — ' + a.name, markdown: a.content });
  const brand = S.config && S.config.brand !== undefined ? S.config.brand : 'CGI'; // artifact: only what the team has set
  const blob = await exportDocx({ title: `${m.client || 'Pursuit'} — ${m.title || 'dossier'}`, subtitle: `${brand ? brand + ' ' : ''}Pursuit Navigator · AI-Native DCS`, brand, sections, filename: slugify(m.client + '-' + m.title) + '-dossier' });
  saveFile(slugify(m.client + '-' + m.title) + '-dossier.docx', blob);
}

// ------------------------------------------------------------------------------------------------
export function wsLayout(p, active, content) {
  const link = (href, ic, label, key, badge) => h('a', { class: 'nl' + (active === key ? ' on' : ''), href }, icon(ic, 18), label, badge ? h('span', { class: 'badge-num', style: { marginLeft: 'auto' } }, badge) : null);
  const gaps = Object.values(p.casepack?.docs || {}).reduce((a, d) => a + (d?.text ? (d.text.match(/Not provided\s*[—–-]\s*needs validation/gi) || []).length : 0), 0);
  const modLinks = [];
  const m0 = modStatus(p, 'M0');
  const modItem = (id) => h('a', { class: 'mod' + (active === id ? ' on' : '') + (available(id) ? '' : ' soon'), href: R.mod(p.id, id), title: available(id) ? '' : 'Officiële prompts nog niet toegevoegd' }, h('span', { class: 'sdot ' + modStatus(p, id) }, modStatus(p, id) === 'done' ? icon('check', 11) : null), h('span', null, id + ' · ' + modTitle(id)), available(id) ? null : h('span', { class: 'xs muted', style: { marginLeft: 'auto' } }, 'binnenkort'));
  modLinks.push(h('div', { class: 'stg' }, 'FUNDAMENT'), modItem('M0'));
  for (const s of STAGES) { modLinks.push(h('div', { class: 'stg' }, `${s.n} · ${s.name.toUpperCase()}`)); s.modules.forEach((id) => modLinks.push(modItem(id))); }
  const prog = progress(p);
  const side = h('aside', { class: 'side' },
    h('a', { href: R.home(), class: 'small' }, '← Alle pursuits'),
    h('div', { style: { margin: '10px 0 4px' } }, h('div', { class: 'pclient' }, p.meta.client || 'Klant'), h('div', { class: 'ptitle' }, p.meta.title || '')),
    h('div', { class: 'row', style: { gap: '6px', margin: '6px 0' } }, h('span', { class: 'chip purple' }, ROUTES[p.meta.route] || 'Tender / RFP'), p.meta.demo ? h('span', { class: 'chip amber' }, 'voorbeeldcase') : null),
    h('div', { class: 'progress', title: `${prog.done} van ${prog.total} modules` }, h('i', { style: { width: prog.pct + '%' } })), h('div', { class: 'xs muted', style: { marginTop: '4px' } }, `${prog.done} van ${prog.total} modules afgerond`),
    h('h4', null, 'Cockpit'),
    h('div', { class: 'cockpit' },
      link(R.p(p.id), 'home', 'Overzicht', 'overview'),
      link(R.view(p.id, 'sources'), 'folder', 'Bronnen', 'sources', null),
      link(R.view(p.id, 'casepack'), 'layers', 'Case Pack', 'casepack', gaps || null),
      link(R.view(p.id, 'ledger'), 'book', 'Pursuit Ledger', 'ledger'),
      link(R.view(p.id, 'map'), 'map', 'Workflow-map', 'map'),
      link(R.view(p.id, 'artefacts'), 'file', 'Artefacten', 'artefacts', null)),
    h('details', { class: 'modnav', open: !window.matchMedia('(max-width: 980px)').matches || /^M\d+$/.test(active) && false }, h('summary', null, 'Modules'), ...modLinks),
    h('h4', null, 'Beheer'),
    h('a', { class: 'nl', href: '#', onclick: (e) => { e.preventDefault(); pursuitSettings(p); } }, icon('gear', 18), 'Pursuit-instellingen'),
    h('a', { class: 'nl', href: '#', onclick: async (e) => { e.preventDefault(); try { await exportDossier(p); toast('Dossier gedownload', 'ok'); } catch (err) { toast(err.message, 'error'); } } }, icon('download', 18), 'Exporteer dossier (Word)'));
  return h('div', { class: 'ws' }, side, h('div', { class: 'ws-main' }, content));
}

function pursuitSettings(p) {
  const m = { ...p.meta };
  const f = (k, label, type = 'text', help) => h('div', { class: 'field' }, h('label', { class: 'f' }, label), h('input', { type, value: m[k] || '', oninput: (e) => { m[k] = e.target.value; } }), help ? h('div', { class: 'help' }, help) : null);
  const route = h('select', { onchange: (e) => { m.route = e.target.value; } }, Object.entries(ROUTES).map(([k, l]) => h('option', { value: k, selected: k === m.route }, l)));
  const mode = h('select', { onchange: (e) => { m.mode = e.target.value; } }, h('option', { value: 'practice', selected: (m.mode || 'practice') === 'practice' }, 'Praktijk — echte namen en cijfers toegestaan (aanbevolen)'), h('option', { value: 'workshop', selected: m.mode === 'workshop' }, 'Workshop — letterlijk de originele (geanonimiseerde) prompts'));
  const lang = h('select', { onchange: (e) => { m.language = e.target.value; } }, h('option', { value: 'en', selected: (m.language || 'en') === 'en' }, 'English (framework-standaard)'), h('option', { value: 'nl', selected: m.language === 'nl' }, 'Nederlands (labels blijven Engels) — experimenteel'));
  modal({
    title: 'Pursuit-instellingen', wide: true,
    body: h('div', { class: 'stack' },
      h('div', { class: 'grid g2' }, f('client', 'Klant'), f('title', 'Opportunity'), h('div', { class: 'field' }, h('label', { class: 'f' }, 'Route'), route), f('sector', 'Sector'), f('role', 'Mijn rol'), f('submissionDate', 'Inschrijfdatum', 'date'), f('decisionDate', 'Gunning', 'date'), f('caseDate', 'Casusdatum (afgesloten casus)', 'date', 'Leeg bij een lopende pursuit.')),
      h('hr'), h('h4', null, 'Prompts'),
      h('div', { class: 'field' }, h('label', { class: 'f' }, 'Modus'), mode, h('div', { class: 'help' }, 'Elke afwijking van de workshop-tekst zie je in de Bibliotheek.')),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!m.discipline, onchange: (e) => { m.discipline = e.target.checked; } }), h('span', null, h('b', null, 'Workshop output discipline (woordlimieten) aanzetten'), h('div', { class: 'help' }, 'Uit = volledige output (zoals de gidsen voorschrijven na de workshop). Aan = korte, afgekapte antwoorden zoals in de workshop.'))),
      h('div', { class: 'field', style: { marginTop: '12px' } }, h('label', { class: 'f' }, 'Banner in prototypes'), h('input', { type: 'text', value: m.banner || '', placeholder: 'Demonstrator — synthetic data — not production', oninput: (e) => { m.banner = e.target.value; } })),
      h('div', { class: 'field' }, h('label', { class: 'f' }, 'Antwoordtaal van de AI'), lang, h('div', { class: 'help' }, 'Kies bij de start; wissel niet halverwege (de Ledger wordt woordelijk doorgegeven).')),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: m.gateHint !== false, onchange: (e) => { m.gateHint = e.target.checked; } }), h('span', null, 'Opmaakhint voor de app toevoegen aan het gate (helpt het resultaat automatisch te verwerken; wijzigt de inhoud niet).')),
      h('hr'), h('button', { class: 'btn danger', onclick: async () => { if (await confirmBox('Pursuit verwijderen?', 'Deze pursuit wordt verwijderd (op de server blijft een kopie in de map data/trash).', 'Verwijderen')) { await removePursuit(p.id); go(R.home()); } } }, icon('trash', 16), 'Pursuit verwijderen')),
    actions: [{ label: 'Annuleren', kind: 'ghost' }, { label: 'Opslaan', kind: 'primary', onClick: async () => { await patch([{ op: 'set', path: ['meta'], value: m }]); toast('Opgeslagen', 'ok'); refreshApp(); } }],
  });
}

// ------------------------------------------------------------------------------------------------
export async function viewPursuit(route) {
  const p = S.p;
  const v = route.view;
  if (v === 'sources') return wsLayout(p, 'sources', viewSources());
  if (v === 'casepack') return wsLayout(p, 'casepack', viewCasePack(p, !!route.build));
  if (v === 'ledger') return wsLayout(p, 'ledger', viewLedger(p));
  if (v === 'map') return wsLayout(p, 'map', viewMap(p));
  if (v === 'artefacts') return wsLayout(p, 'artefacts', viewArtefacts(p));
  if (v === 'module' && FLOWS[route.mod]) return wsLayout(p, route.mod, await viewModule(p, route.mod));
  return wsLayout(p, 'overview', overview(p));
}

// ------------------------------------------------------------------------------------------------
function overview(p) {
  const nx = nextModule(p);
  const hasCP = Object.values(p.casepack?.docs || {}).some((d) => d?.text);
  const hasSrc = (p.sources || []).length > 0;
  const m = p.meta;
  const sub = daysUntil(m.submissionDate, m.caseDate);
  const box = h('div', { class: 'stack' });

  const head = h('div', null,
    h('div', { class: 'eyebrow red' }, m.client || 'Pursuit'), h('h1', { style: { margin: '.1em 0 .3em', fontSize: '2.1rem' } }, m.title || ''),
    h('div', { class: 'row' }, h('span', { class: 'chip purple' }, ROUTES[m.route] || 'Tender / RFP'), m.sector ? h('span', { class: 'chip' }, m.sector) : null, m.role ? h('span', { class: 'chip' }, 'Mijn rol: ' + m.role) : null,
      m.submissionDate ? h('span', { class: 'chip ' + (sub !== null && sub < 0 ? 'red' : sub !== null && sub <= 14 ? 'amber' : '') }, icon('calendar', 13), ' inschrijving ' + fmtDate(m.submissionDate) + (sub !== null ? (sub < 0 ? ` (${-sub} d geleden)` : ` (over ${sub} d)`) : '')) : null,
      m.decisionDate ? h('span', { class: 'chip' }, 'gunning ' + fmtDate(m.decisionDate)) : null, p.owner ? h('span', { class: 'chip' }, p.owner) : null));

  // ---- next step
  let nextCard;
  if (!hasSrc && !hasCP) nextCard = h('div', { class: 'nextstep' }, h('div', null, h('div', { class: 'eyebrow' }, 'Eerste stap'), h('h2', null, 'Voeg de RFP en je klantgesprekken toe'), h('p', null, 'Zonder bronnen heeft de AI niets om kritisch mee te kijken. Upload de RFP / opportunity-omschrijving en plak je gespreksnotities.')), h('a', { class: 'btn primary lg', href: R.view(p.id, 'sources') }, 'Bronnen toevoegen', icon('arrowRight', 18)));
  else if (!hasCP) nextCard = h('div', { class: 'nextstep' }, h('div', null, h('div', { class: 'eyebrow' }, 'Volgende stap'), h('h2', null, 'Bouw het Case Pack'), h('p', null, 'De AI zet je bronnen om in de zes documenten (01–06), de canvas en de header — met F/A/H-labels en een lijst van wat ontbreekt.')), h('a', { class: 'btn primary lg', href: R.build(p.id) }, 'Case Pack bouwen', icon('arrowRight', 18)));
  else if (nx) {
    const mod = FW.modules[nx];
    const quick = nx === 'M0' && !p.ledger?.current;
    nextCard = h('div', { class: 'nextstep' }, h('div', null, h('div', { class: 'eyebrow' }, modStatus(p, nx) === 'doing' ? 'Je bent bezig' : 'Volgende module'), h('h2', null, `${nx} · ${mod.title}`), h('p', null, mod.question + ' ' + mod.intro.split('. ')[0] + '.')),
      h('div', { class: 'row' }, quick ? h('button', { class: 'btn ghost lg', onclick: () => quickstart(p) }, icon('spark', 18), 'Snelstart M0 (automatisch)') : null, h('a', { class: 'btn primary lg', href: R.mod(p.id, nx) }, modStatus(p, nx) === 'doing' ? 'Verder' : 'Start', icon('arrowRight', 18))));
  } else {
    const pending = ORDER.filter((m) => !available(m));
    nextCard = h('div', { class: 'nextstep' }, h('div', null, h('div', { class: 'eyebrow' }, 'Klaar'), h('h2', null, pending.length ? 'Alle beschikbare modules zijn afgerond' : 'Alle modules zijn afgerond'),
      h('p', null, pending.length ? `${pending.join(', ')} volgen zodra de officiële prompts zijn toegevoegd (Bibliotheek). Exporteer ondertussen het dossier en boek de echte sign-off.` : 'Exporteer het dossier, boek de echte sign-off en plan je 30-dagen review.')), h('button', { class: 'btn primary lg', onclick: () => exportDossier(p) }, 'Exporteer dossier'));
  }

  // ---- journey
  const nxStage = nx ? STAGES.find((s) => s.modules.includes(nx))?.n : null;
  const journey = h('div', { class: 'journey' }, STAGES.map((s) => h('div', { class: 'jstage ' + (stageState(p, s.n) === 'done' ? 'done' : stageState(p, s.n) === 'doing' ? 'doing' : s.n === nxStage ? 'next' : '') },
    h('div', { class: 'n' }, 'STAGE ' + s.n), h('h4', null, s.name), s.modules.map((id) => h('a', { href: R.mod(p.id, id), title: `${id} · ${modTitle(id)}` + (available(id) ? '' : ' — officiële prompts nog niet toegevoegd'), style: available(id) ? null : { opacity: .5 } }, h('span', { class: 'sdot ' + modStatus(p, id), style: { width: '14px', height: '14px' } }, modStatus(p, id) === 'done' ? icon('check', 9) : null), h('b', null, id), h('span', { class: 'xs muted jt' }, modTitle(id)))))));

  // ---- strategy on a page
  const L = p.ledger?.current ? parseLedger(p.ledger.current.text) : null;
  const strat = h('div', { class: 'card top' }, h('div', { class: 'card-head' }, icon('target', 22), h('h3', null, 'Strategie op één pagina'), h('a', { class: 'btn ghost sm', style: { marginLeft: 'auto' }, href: R.view(p.id, 'ledger') }, 'Volledige Ledger')));
  if (L) {
    const fv = (n) => { const d = h('div', { class: 'md' }); mountMarkdown(d, L.fields[n] || '—'); return d; };
    strat.append(h('div', { class: 'stack' }, h('div', null, h('div', { class: 'eyebrow' }, '1 · Case'), fv(1)), h('div', null, h('div', { class: 'eyebrow red' }, '3 · One truth — besluit, scope, budget, metric, win themes'), fv(3))));
  } else strat.append(h('div', { class: 'empty' }, 'Nog geen Ledger. Draai M0 — daarna groeit hier de strategie mee met elke module.'));

  // ---- attention
  const conds = allConditions(p);
  const open = L ? parseOpenItems(L.fields[7]) : [];
  const needs = L ? nextStageNeeds(L.fields[8]) : [];
  const gapList = Object.entries(p.casepack?.docs || {}).flatMap(([k, d]) => (d?.text ? findGaps(d.text).map((g) => ({ k, g })) : []));
  const attention = h('div', { class: 'stack' },
    h('div', { class: 'card top red' }, h('div', { class: 'card-head' }, icon('flag', 22), h('h3', null, 'Voorwaarden & deadlines')),
      conds.length ? h('div', null, conds.map((c) => condRow(p, c))) : h('div', { class: 'muted small' }, 'Nog geen besluiten met voorwaarden. Ze ontstaan bij het gate van M3 en volgende modules.')),
    open.length ? h('div', { class: 'card top' }, h('div', { class: 'card-head' }, icon('alert', 22), h('h3', null, 'Open — to validate'), h('span', { class: 'chip' }, open.length)), h('ul', { style: { margin: 0, paddingLeft: '1.1em' } }, open.slice(0, 8).map((o) => h('li', { class: 'small' }, o.what, o.who ? h('span', { class: 'muted' }, ' — ' + o.who) : null, o.when ? h('span', { class: 'chip amber', style: { marginLeft: '6px' } }, o.when) : null)))) : null,
    needs.length ? h('div', { class: 'card top' }, h('div', { class: 'card-head' }, icon('arrowRight', 22), h('h3', null, 'Volgende stage heeft nodig')), needs.map((n) => h('div', { class: 'small', style: { marginBottom: '6px' } }, h('span', { class: 'chip next' }, 'for ' + n.for), ' ' + n.text))) : null,
    gapList.length ? h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('span', { class: 'chip gap' }, 'Not provided'), h('h3', null, `${gapList.length} gaten in het Case Pack`)), h('ul', { style: { margin: 0, paddingLeft: '1.1em' } }, gapList.slice(0, 6).map((x) => h('li', { class: 'small' }, h('b', null, x.k + ' · '), x.g.slice(0, 120)))), h('a', { class: 'small', href: R.view(p.id, 'casepack') }, 'Alle gaten bekijken →')) : null);

  let calls = 0, tin = 0, tout = 0;
  for (const mod of Object.values(p.modules || {})) for (const arr of Object.values(mod.threads || {})) for (const x of arr) if (x.role === 'assistant' && x.usage) { calls++; tin += x.usage.in || 0; tout += x.usage.out || 0; }
  const ask = clientAsk(p);
  append(box, [head, nextCard, h('div', null, h('h3', { style: { margin: '6px 0 10px' } }, 'De route'), journey), ask, h('div', { class: 'grid', style: { gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', alignItems: 'start' } }, strat, attention), calls ? h('div', { class: 'xs muted' }, `AI-gebruik in deze pursuit: ${calls} aanroepen · ${fmtTokens(tin)} tokens in · ${fmtTokens(tout)} tokens uit (schatting op basis van de provider; kosten volgens jullie tarief)`) : null]);
  return box;
}

/** "Wat de klant vraagt": requirements, criteria with weights and dates, read from the tables of Case Pack 02. */
function clientAsk(p) {
  const t2 = p.casepack?.docs?.['02']?.text;
  if (!t2) return null;
  const tabs = findTables(t2);
  const cell = (r, i) => cleanInline(r[i] || '');
  const reqT = tabs.find((t) => t.header.some((x) => /^(id|req)/i.test(x)) && t.header.some((x) => /priority|must|should/i.test(x)));
  const critT = tabs.find((t) => t.header.some((x) => /criteri/i.test(x)) && t.header.some((x) => /weight|gewicht/i.test(x)));
  const dateT = tabs.find((t) => t.header.some((x) => /event|milestone|datum|date/i.test(x)) && t.header.length <= 3 && t.rows.some((r) => !isNaN(Date.parse(cell(r, 1)))));
  if (!reqT && !critT && !dateT) return null;
  const card = h('div', { class: 'card top' }, h('div', { class: 'card-head' }, icon('target', 22), h('h3', null, 'Wat de klant vraagt'), h('a', { class: 'btn ghost sm', style: { marginLeft: 'auto' }, href: R.view(p.id, 'casepack') }, 'Case Pack 02')));
  const body = h('div', { class: 'grid g3', style: { alignItems: 'start' } });
  if (critT) {
    const pi = critT.header.findIndex((x) => /weight|gewicht/i.test(x));
    const rows = critT.rows.map((r) => ({ name: cell(r, 0), w: parseFloat(cell(r, pi).replace(',', '.')) })).filter((x) => x.name && Number.isFinite(x.w));
    const total = Math.round(rows.reduce((a, b) => a + b.w, 0) * 10) / 10;
    body.append(h('div', null, h('div', { class: 'eyebrow' }, 'Beoordeling'), rows.map((x) => h('div', { style: { margin: '6px 0' } }, h('div', { class: 'row between nowrap small', style: { alignItems: 'flex-start' } }, h('span', { class: 'grow' }, x.name), h('b', null, x.w + '%')), h('div', { class: 'progress' }, h('i', { style: { width: Math.min(100, x.w) + '%' } })))), h('div', { class: 'xs ' + (Math.round(total) === 100 ? 'muted' : ''), style: Math.round(total) === 100 ? null : { color: 'var(--red-700)', fontWeight: 700 } }, `Totaal ${total}%` + (Math.round(total) === 100 ? '' : ' — telt niet op tot 100%: controleer de bron'))));
  }
  if (reqT) {
    const pri = reqT.header.findIndex((x) => /priority|must|should/i.test(x));
    const rows = reqT.rows.map((r) => ({ id: cell(r, 0), pr: cell(r, pri), text: cell(r, reqT.header.length - 1) })).filter((x) => x.id);
    const must = rows.filter((x) => /must/i.test(x.pr)).length;
    body.append(h('div', null, h('div', { class: 'eyebrow' }, `Eisen · ${must} Must · ${rows.length - must} Should`), h('div', { style: { maxHeight: '220px', overflow: 'auto' } }, rows.map((x) => h('div', { class: 'small', style: { margin: '4px 0' } }, h('span', { class: 'chip ' + (/must/i.test(x.pr) ? 'red' : '') }, x.id + ' · ' + x.pr), ' ' + x.text.slice(0, 110))))));
  }
  if (dateT) {
    const rows = dateT.rows.map((r) => ({ ev: cell(r, 0), d: cell(r, 1), t: Date.parse(cell(r, 1)) })).filter((x) => !isNaN(x.t));
    const ref = new Date((refDate(p)) + 'T00:00:00').getTime();
    body.append(h('div', null, h('div', { class: 'eyebrow' }, 'Data'), rows.map((x) => { const d = Math.round((x.t - ref) / 86400000); return h('div', { class: 'small', style: { margin: '7px 0' } }, h('div', null, x.ev), h('span', { class: 'chip ' + (d < 0 ? '' : d <= 14 ? 'amber' : 'purple') }, x.d + (d > 0 ? ` · over ${d} d` : d === 0 ? ' · vandaag' : ' · geweest'))); })));
  }
  card.append(body);
  return card;
}

function condRow(p, c) {
  const st = dueState(p, c);
  const d = daysUntil(c.due, refDate(p));
  const chip = st === 'met' ? h('span', { class: 'chip green' }, 'voldaan') : st === 'late' ? h('span', { class: 'chip red' }, `${-d} d te laat`) : st === 'soon' ? h('span', { class: 'chip amber' }, d === 0 ? 'vandaag' : `over ${d} d`) : c.due ? h('span', { class: 'chip' }, fmtDate(c.due)) : h('span', { class: 'chip gap' }, 'geen datum');
  return h('div', { class: 'src-item', style: { padding: '9px 0' } },
    h('div', { class: 'grow' }, h('div', { class: 'small', style: { fontWeight: 600 } }, c.text), h('div', { class: 'xs muted' }, `${c.decision.module} · eigenaar: ${c.owner || '— niet ingevuld'}`)),
    chip, c.status !== 'met' && !c.flip ? h('button', { class: 'mini', onclick: () => markMet(p, c) }, 'Voldaan…') : null);
}
function markMet(p, c) {
  const ev = h('input', { type: 'text', placeholder: 'Bewijs (bijv. "reference approved by client, mail 12 Nov")' });
  const date = h('input', { type: 'date', value: todayIso() });
  modal({ title: 'Voorwaarde voldaan', body: h('div', { class: 'stack' }, h('div', { class: 'callout' }, c.text), h('div', null, h('label', { class: 'f' }, 'Bewijs'), ev, h('div', { class: 'help' }, 'Een voorwaarde staat in het volgende gate alleen op "met" als er bewijs is. Deze regel gaat als "Met: …" onder je Ledger mee.')), h('div', { style: { maxWidth: '220px' } }, h('label', { class: 'f' }, 'Datum'), date)),
    actions: [{ label: 'Annuleren', kind: 'ghost' }, { label: 'Vastleggen', kind: 'primary', onClick: async () => {
      if (!ev.value.trim()) { toast('Vul het bewijs in', 'error'); return false; }
      const di = p.decisions.findIndex((d) => d.id === c.decision.id);
      const ci = p.decisions[di].conditions.findIndex((x) => x.id === c.id);
      const n = ci + 1;
      await patch([{ op: 'set', path: ['decisions', di, 'conditions', ci, 'status'], value: 'met' }, { op: 'set', path: ['decisions', di, 'conditions', ci, 'evidence'], value: ev.value.trim() }, { op: 'push', path: ['evidence'], value: { id: uid('e'), text: `Met: condition ${n} (${c.text}) — ${ev.value.trim()}, ${dateEn(date.value)}.`, at: new Date().toISOString() } }]);
      refreshApp();
    } }] });
}

async function quickstart(p) {
  const el = h('div', { class: 'stack' }, h('p', null, 'M0 wordt automatisch doorlopen: de setup-check en je case in vijf regels, daarna het gate dat Ledger v0 schrijft. Je controleert het resultaat en bevestigt.'), h('div', { class: 'progress' }, h('i', { id: 'qs-bar', style: { width: '5%' } })), h('div', { id: 'qs-msg', class: 'muted small' }, 'Starten…'));
  const m = modal({ title: 'Snelstart M0', body: el });
  const setP = (w, t) => { el.querySelector('#qs-bar').style.width = w + '%'; el.querySelector('#qs-msg').textContent = t; };
  try {
    setP(15, 'Case in vijf regels…');
    const r1 = await runStep('M0', FLOWS.M0.steps[0], {}, {});
    if (!r1.ok) throw new Error(r1.error || 'Stap mislukt');
    setP(55, 'Gate — Ledger v0 schrijven…');
    const r2 = await runGate('M0', {});
    if (!r2.ok) throw new Error(r2.error || 'Gate mislukt');
    setP(100, 'Klaar');
    m.close();
    go(R.mod(p.id, 'M0'));
  } catch (e) { m.close(); toast(e.message, 'error', 7000); }
}

// ------------------------------------------------------------------------------------------------
function viewCasePack(p, autoBuild) {
  const box = h('div', { class: 'stack' });
  let cur = CASEPACK_KEYS.find((k) => p.casepack?.docs?.[k]?.text) || '01';
  let editing = false, building = false;

  async function build(mode, newIds) {
    if (building) return; building = true; render();
    const content = builderMessage(p, { mode, newSources: newIds || [], maxBytes: S.config.maxPromptBytes ? S.config.maxPromptBytes - 6000 : undefined });
    const live = h('div', { class: 'out streaming md' }, h('p', { class: 'muted dots' }, 'De AI leest je bronnen en schrijft het Case Pack'));
    const mdl = modal({ title: mode === 'update' ? 'Case Pack bijwerken' : 'Case Pack bouwen', wide: true, body: h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Dit kan een minuut duren bij een lange RFP. Je kunt ondertussen niets kwijtraken: het resultaat wordt pas bewaard als het compleet is.'), live), onClose: () => { ac.abort(); } });
    const ac = new AbortController();
    try {
      let text;
      if (S.config.provider === 'manual' || (!S.config.hasKey && S.config.provider !== 'mock')) { mdl.close(); text = await manualAsk({ title: 'Case Pack bouwen', content }); }
      else {
        ({ text } = await streamAI({ system: '', messages: [{ role: 'user', content }], maxTokens: 32000, signal: ac.signal, onDelta: (t) => { live.textContent = ''; const tail = t.slice(-1200); live.append(h('pre', { class: 'code small', style: { borderRadius: '6px' } }, `… ${fmtTokens(estimateTokens(t))} tokens geschreven\n\n` + tail)); } }));
        mdl.close();
      }
      const parsed = parseCasePack(text);
      const keys = Object.keys(parsed);
      if (keys.length < (mode === 'update' ? 1 : 3)) { showRaw(text); throw new Error('Het antwoord had niet de verwachte indeling (=== 01 Client brief === …). Je kunt de ruwe tekst bekijken en opnieuw proberen.'); }
      const ops = [];
      for (const k of keys) { const old = p.casepack?.docs?.[k]; ops.push({ op: 'set', path: ['casepack', 'docs', k], value: { text: parsed[k], source: 'ai', updatedAt: new Date().toISOString(), prev: old?.text || undefined } }); }
      ops.push({ op: 'set', path: ['casepack', 'builtAt'], value: new Date().toISOString() });
      await patch(ops);
      toast(`Case Pack ${mode === 'update' ? 'bijgewerkt' : 'gebouwd'} (${keys.length} onderdelen). Controleer het — jij bent de menselijke check.`, 'ok', 6000);
      cur = keys.includes('01') ? '01' : keys[0];
    } catch (e) { try { mdl.close(); } catch { /* closed */ } if (!ac.signal.aborted) toast(explainError(e.message), 'error', 9000); }
    building = false; render();
  }
  function showRaw(text) { modal({ title: 'Ruw antwoord', wide: true, body: h('pre', { class: 'code small' }, text), actions: [{ label: 'Kopieer', kind: 'ghost', keep: true, onClick: () => copyText(text) }, { label: 'Sluiten', kind: 'primary' }] }); }

  function render() {
    clear(box);
    const docs = p.casepack?.docs || {};
    const chk = packChecks(p);
    const any = chk.present.length > 0;
    box.append(h('div', { class: 'row between' }, h('div', null, h('div', { class: 'eyebrow' }, 'Case Pack'), h('h2', { style: { margin: 0 } }, 'De zes documenten waarop alle modules draaien')),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', disabled: building || !(p.sources || []).length, onclick: async () => { if (any && !(await confirmBox('Case Pack opnieuw bouwen?', 'Bestaande documenten worden vervangen (de vorige versie blijft per document herstelbaar). Handmatige wijzigingen gaan verloren.', 'Opnieuw bouwen', 'primary'))) return; build('build'); } }, icon('spark', 16), any ? 'Opnieuw bouwen uit bronnen' : 'Bouw Case Pack uit bronnen'),
        any ? h('button', { class: 'btn ghost', disabled: building || !(p.sources || []).length, onclick: () => pickNew() }, icon('refresh', 16), 'Bijwerken met nieuwe bron') : null)));
    if (!(p.sources || []).length && !any) box.append(h('div', { class: 'callout amber' }, h('b', null, 'Eerst bronnen'), 'Voeg de RFP en gespreksnotities toe op de pagina ', h('a', { href: R.view(p.id, 'sources') }, 'Bronnen'), '. Je kunt de documenten ook handmatig schrijven (kies hieronder een document en klik Bewerk).'));
    box.append(h('div', { class: 'card tint' }, h('div', { class: 'row between' }, h('b', null, 'Check je pack'),
      h('div', { class: 'row' }, h('span', { class: 'chip ' + (chk.missing.length ? 'amber' : 'green') }, `${chk.present.length}/8 onderdelen`), h('span', { class: 'chip ' + (chk.gaps ? 'gap' : 'green') }, `${chk.gaps} × Not provided — needs validation`), chk.weights ? h('span', { class: 'chip ' + (Math.round(chk.weights.total) === 100 ? 'green' : 'red') }, `gewichten totaal ${chk.weights.total}%`) : null)),
      h('div', { class: 'small muted', style: { marginTop: '6px' } }, 'Elk gat is een vraag voor je volgende klantcontact. Controleer ook: één outcome-metric in 03 met baseline en target in dezelfde eenheid, en geen cijfer of datum dat niet uit de bron komt.')));
    const tabs = h('div', { class: 'tabs' }, CASEPACK_KEYS.map((k) => h('button', { class: cur === k ? 'on' : '', onclick: () => { cur = k; editing = false; render(); } }, (/^\d/.test(k) ? k + ' ' : '') + CASEPACK_TITLES[k], docs[k]?.text ? '' : ' ○')));
    box.append(tabs);
    const d = docs[cur];
    const bar = h('div', { class: 'row between', style: { marginBottom: '8px' } }, h('div', { class: 'small muted' }, d?.updatedAt ? `${d.source === 'ai' ? 'Door AI geschreven' : d.source === 'demo' ? 'Voorbeeld (fictief)' : 'Handmatig'} · ${relTime(d.updatedAt)}` : 'Nog leeg'),
      h('div', { class: 'row' }, d?.prev ? h('button', { class: 'btn ghost sm', onclick: async () => { await patch([{ op: 'set', path: ['casepack', 'docs', cur], value: { text: d.prev, source: 'manual', updatedAt: new Date().toISOString(), prev: d.text } }]); render(); } }, 'Vorige versie') : null,
        d?.text ? h('button', { class: 'btn ghost sm', onclick: () => copyText(d.text) }, icon('copy', 14), 'Kopieer') : null, h('button', { class: 'btn outline sm', onclick: () => { editing = !editing; render(); } }, icon('edit', 14), editing ? 'Annuleer' : 'Bewerk')));
    box.append(bar);
    if (editing) {
      const ta = h('textarea', { rows: 22, class: 'mono' }); ta.value = d?.text || ''; autoGrow(ta);
      box.append(ta, h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { class: 'btn primary', onclick: async () => { await patch([{ op: 'set', path: ['casepack', 'docs', cur], value: { text: ta.value, source: 'manual', updatedAt: new Date().toISOString(), prev: d?.text } }]); editing = false; render(); } }, 'Opslaan'), h('span', { class: 'help' }, 'Gebruik §-nummers (§1, §2 …) en de labels F [bron] / A / H, zodat modules kunnen citeren.')));
    } else if (d?.text) { const out = h('div', { class: 'card md', style: { padding: '8px 22px 14px' } }); mountMarkdown(out, d.text); box.append(out); }
    else box.append(h('div', { class: 'empty' }, 'Dit onderdeel is nog leeg.'));
  }
  function pickNew() {
    const srcs = p.sources || [];
    const sel = new Set();
    const list = h('div', { class: 'stack tight' }, srcs.map((s) => h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e) => (e.target.checked ? sel.add(s.id) : sel.delete(s.id)) }), h('span', null, s.name, h('span', { class: 'muted small' }, ' · ' + fmtDate(s.date))))));
    modal({ title: 'Welke nieuwe bron(nen) verwerken?', body: h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'De AI past alleen de documenten aan die door de nieuwe bron veranderen en markeert elke wijziging.'), list), actions: [{ label: 'Annuleren', kind: 'ghost' }, { label: 'Bijwerken', kind: 'primary', onClick: () => { if (!sel.size) { toast('Kies minimaal één bron', 'error'); return false; } setTimeout(() => build('update', [...sel]), 50); } }] });
  }
  render();
  if (autoBuild && (p.sources || []).length && !Object.keys(p.casepack?.docs || {}).length) setTimeout(() => build('build'), 200);
  return box;
}

// ------------------------------------------------------------------------------------------------
function viewLedger(p) {
  const box = h('div', { class: 'stack' });
  let editing = false;
  const render = () => {
    clear(box);
    const cur = p.ledger?.current;
    const L = cur ? parseLedger(cur.text) : null;
    box.append(h('div', { class: 'row between' }, h('div', null, h('div', { class: 'eyebrow' }, 'Pursuit Ledger'), h('h2', { style: { margin: 0 } }, 'Eén waarheid, door alle modules gedragen')),
      cur ? h('div', { class: 'row' }, h('span', { class: 'chip purple' }, `na ${cur.module} · ${fmtDateTime(cur.at)}`), h('button', { class: 'btn ghost sm', onclick: () => copyText(ledgerBlock(p), 'Ledger gekopieerd') }, icon('copy', 14), 'Kopieer'), h('button', { class: 'btn outline sm', onclick: () => { editing = !editing; render(); } }, icon('edit', 14), editing ? 'Annuleer' : 'Bewerk')) : null));
    box.append(h('p', { class: 'muted', style: { maxWidth: '72ch' } }, 'Velden 1–3 zijn het vaste blok (woordelijk overgenomen, wijzigingen gemarkeerd met hun module). Velden 4–8 rollen mee. Het model legt alleen vast als besluit wat jij als besluit typte.'));
    if (!cur) { box.append(h('div', { class: 'empty' }, 'De Ledger ontstaat bij het gate van M0.')); return; }
    if (editing) {
      const ta = h('textarea', { rows: 24, class: 'mono' }); ta.value = cur.text; autoGrow(ta);
      box.append(ta, h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { class: 'btn primary', onclick: async () => { await patch([{ op: 'set', path: ['ledger', 'current', 'text'], value: ta.value }, { op: 'set', path: ['ledger', 'current', 'edited'], value: true }]); editing = false; render(); } }, 'Opslaan'), h('span', { class: 'help' }, 'Handmatig aangepaste Ledger wordt vanaf nu onder elke skill meegestuurd.')));
    } else if (L) {
      box.append(h('div', { class: 'lfields' }, LEDGER_FIELDS.map((f) => h('div', { class: 'lfield' + (f.n <= 3 ? ' fixed' : '') }, h('h4', null, h('span', { class: 'num' }, f.n), f.name, f.n <= 3 ? h('span', { class: 'chip red' }, 'vast blok') : null), (() => { const d = h('div', { class: 'md' }); mountMarkdown(d, L.fields[f.n] || '—'); return d; })()))));
    } else { const d = h('div', { class: 'card md' }); mountMarkdown(d, cur.text); box.append(d); }
    const decs = (p.decisions || []).slice().sort((a, b) => (a.at || '').localeCompare(b.at || ''));
    if (decs.length) box.append(h('div', { class: 'card top red' }, h('h3', null, 'Wat jij hebt vastgelegd'), h('p', { class: 'small muted' }, 'Alleen wat je zelf als besluit, voorkeur of notitie typte — de rest blijft "Open".'),
      decs.map((d) => h('div', { class: 'src-item' }, h('div', { class: 'grow' }, h('span', { class: 'chip ' + (d.kind === 'decision' ? 'red' : 'purple') }, d.module + ' · ' + (d.kind === 'decision' ? 'besluit' : d.kind === 'lean' ? 'voorkeur (H)' : 'notitie')), ' ', h('b', null, d.text), (d.conditions || []).map((c) => h('div', { class: 'small muted' }, '• ' + c.text + ' — ' + (c.owner || '?') + (c.due ? ' — ' + fmtDate(c.due) : '') + (c.status === 'met' ? ' ✓ voldaan' : ''))), d.flip ? h('div', { class: 'small muted' }, '⚑ flip fact: ' + d.flip.text) : null), h('div', { class: 'xs muted' }, fmtDate(d.at))))));
    const ev = (p.evidence || []).filter((e) => !e.applied);
    if (ev.length) box.append(h('div', { class: 'card' }, h('h3', null, 'Bewijsregels onder de Ledger'), h('p', { class: 'small muted' }, 'Gaan mee onder elke skill tot het volgende gate ze verwerkt.'), ev.map((e) => h('div', { class: 'small' }, '• ' + e.text))));
    const hist = (p.ledger.history || []).slice().reverse();
    if (hist.length > 1) box.append(h('div', { class: 'card' }, h('h3', null, 'Versies (zoals het blad "Ledger" in het Excel-werkboek)'), h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Na module'), h('th', null, 'Moment'), h('th', null, ''))), h('tbody', null, hist.map((x) => h('tr', null, h('td', null, x.module), h('td', null, fmtDateTime(x.at)), h('td', { class: 'right' }, h('button', { class: 'mini', onclick: () => modal({ title: 'Ledger na ' + x.module, wide: true, body: (() => { const d = h('div', { class: 'md' }); mountMarkdown(d, x.text); return d; })(), actions: [{ label: 'Kopieer', kind: 'ghost', keep: true, onClick: () => copyText(x.text) }, { label: 'Sluiten', kind: 'primary' }] }) }, 'Bekijk'))))))));
  };
  render();
  return box;
}

// ------------------------------------------------------------------------------------------------
function viewMap(p) {
  const u = S.user || {}; const hrs = u.hours || {};
  const sum = hoursSummary(hrs);
  const stageMods = STAGES.map((s) => s.modules);
  const lit = STAGES.map((s) => s.modules.some((m) => p.modules?.[m]?.gate?.saved));
  const rowOf = (m) => p.modules?.[m]?.gate?.row;
  const cell = (n, fn) => h('td', null, STAGES[n - 1].modules.map(fn).filter(Boolean));
  const litCount = lit.filter(Boolean).length;
  const modCount = ORDER.filter((m) => p.modules?.[m]?.gate?.saved).length;
  const perYear = parseHours(hrs.perYear);
  const table = h('table', { class: 'wmap' },
    h('thead', null, h('tr', null, h('th', null, ''), STAGES.map((s, i) => h('th', { class: lit[i] ? 'lit' : '' }, `${s.n} ${s.name}`, h('div', { class: 'xs muted' }, s.modules.join(' · ')))))),
    h('tbody', null,
      h('tr', null, h('td', { class: 'rowh' }, 'Today — hours'), STAGES.map((s, i) => h('td', { class: sum.per[i] ? 'heat' : '', style: sum.per[i] ? { background: `rgba(82,54,171,${Math.min(.3, .06 + sum.per[i] / 200)})` } : null }, h('b', null, hrs['s' + (i + 1)] || '')))),
      h('tr', null, h('td', { class: 'rowh' }, 'Today — where the time goes'), STAGES.map((s, i) => h('td', null, hrs['w' + (i + 1)] || ''))),
      h('tr', null, h('td', { class: 'rowh' }, 'From now — my Workflow Skills'), STAGES.map((s) => cell(s.n, (m) => rowOf(m) ? h('div', { style: { marginBottom: '4px' } }, h('span', { class: 'chip purple' }, m), ' ', rowOf(m).skill) : null))),
      h('tr', null, h('td', { class: 'rowh' }, 'I check'), STAGES.map((s) => cell(s.n, (m) => rowOf(m) ? h('div', { style: { marginBottom: '4px' } }, rowOf(m).humanCheck) : null))),
      h('tr', null, h('td', { class: 'rowh' }, 'My first step (7 days)'), STAGES.map((s) => cell(s.n, (m) => p.modules?.[m]?.page?.firstStep?.what ? h('div', { style: { marginBottom: '4px' } }, '☐ ' + p.modules[m].page.firstStep.what) : null))),
      h('tr', null, h('td', { class: 'rowh' }, 'Hours with this workflow'), STAGES.map((s, i) => h('td', null, h('b', null, hrs['g' + (i + 1)] || ''))))));
  const rows = ORDER.filter((m) => p.modules?.[m]?.gate?.row);
  const rowsTable = rows.length ? h('div', { class: 'wscroll' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Module', 'Stage', 'Trigger (when I will run this)', 'Input', 'Workflow Skill', 'Human check', 'Output', 'My first step (7 days)', 'My note'].map((x) => h('th', null, x)))),
    h('tbody', null, rows.map((m) => { const r = p.modules[m].gate.row; return h('tr', null, h('td', null, h('b', null, m)), ...[r.stage, r.trigger, r.input, r.skill, r.humanCheck, r.output].map((x) => h('td', { class: 'small' }, x)), h('td', { class: 'small' }, p.modules[m].page?.firstStep?.what || h('span', { class: 'muted' }, '—')), h('td', { class: 'small' }, p.modules[m].page?.note || h('span', { class: 'muted' }, '—'))); })))) : h('div', { class: 'empty' }, 'De rijen verschijnen automatisch na elk gate.');
  const csv = () => { const esc = (x) => '"' + String(x ?? '').replace(/"/g, '""') + '"'; const lines = [['Module', 'Stage', 'Trigger', 'Input', 'Workflow Skill', 'Human check', 'Output', 'First step', 'My note'].map(esc).join(';')]; for (const m of rows) { const r = p.modules[m].gate.row; lines.push([m, r.stage, r.trigger, r.input, r.skill, r.humanCheck, r.output, p.modules[m].page?.firstStep?.what, p.modules[m].page?.note].map(esc).join(';')); } downloadText('workflow-map.csv', '﻿' + lines.join('\n'), 'text/csv;charset=utf-8'); };
  return h('div', { class: 'stack' },
    h('div', { class: 'row between' }, h('div', null, h('div', { class: 'eyebrow' }, 'My Pursuit Workflow'), h('h2', { style: { margin: 0 } }, 'Workflow-map')), rows.length ? h('button', { class: 'btn ghost sm', onclick: csv }, icon('download', 14), 'Exporteer (CSV)') : null),
    h('div', { class: 'callout' }, h('b', null, 'Je map'), `${litCount} van 7 stages lit · ${modCount} van 14 modules in je workflow` + (sum.counted ? ` · Vandaag: ${sum.sum} h op je laatste pursuit (${sum.counted} van 7 stages geteld)` + (perYear ? ` × ${perYear} pursuits per jaar ≈ ${Math.round(sum.sum * perYear)} h per jaar` : '') : ' · Vul je uren in bij "Mijn werkwijze" voor de uren-rij.')),
    h('div', { class: 'wscroll' }, table),
    h('h3', { style: { marginTop: '14px' } }, 'Workflow-rijen uit de gates'), rowsTable,
    h('p', { class: 'xs muted' }, 'Je eerste stap (7 dagen) en je eigen notitie vul je in op de pagina "Mijn pagina" van elke module, vóór het gate. Uren komen uit "Mijn werkwijze" en zijn jouw schattingen tot je meet.'));
}

// ------------------------------------------------------------------------------------------------
function viewArtefacts(p) {
  const arts = (p.artefacts || []).slice().sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  const view = (a) => {
    if (a.kind === 'html') return previewHtml(a.content, a.name);
    const d = h('div', { class: 'md' }); mountMarkdown(d, a.content, { onHtml: (code) => previewHtml(code, a.name) });
    modal({ title: a.name, wide: true, body: d, actions: [{ label: 'Kopieer', kind: 'ghost', keep: true, onClick: () => copyText(a.content) }, { label: 'Download .md', kind: 'ghost', keep: true, onClick: () => downloadText(slugify(a.name) + '.md', a.content) }, { label: 'Sluiten', kind: 'primary' }] });
  };
  return h('div', { class: 'stack' },
    h('div', null, h('div', { class: 'eyebrow' }, 'Artefacten'), h('h2', { style: { margin: 0 } }, 'Bestanden die de modules doorgeven')),
    h('p', { class: 'muted', style: { maxWidth: '70ch' } }, 'Het M6 Build Package, prototypes (v1, v2, frozen) en het Workflow Portrait worden automatisch bewaard en door de volgende modules gebruikt — je hoeft niets te bewaren of te uploaden.'),
    arts.length ? h('div', { class: 'card' }, arts.map((a) => h('div', { class: 'src-item' }, h('div', { class: 'ico' }, icon(a.kind === 'html' ? 'play' : 'file', 20)), h('div', { class: 'grow' }, h('b', null, a.name), ' ', h('span', { class: 'chip' }, a.kind === 'html' ? 'HTML · klikbaar' : 'Markdown'), h('div', { class: 'small muted' }, `${a.module} · ${fmtDateTime(a.at)} · ${fmtTokens(estimateTokens(a.content))} tokens${a.note ? ' · ⚠ ' + a.note : ''}`)),
      h('button', { class: 'btn ghost sm', onclick: () => view(a) }, icon('eye', 14), a.kind === 'html' ? 'Open' : 'Bekijk'),
      h('button', { class: 'btn ghost sm', onclick: () => downloadText(a.kind === 'html' ? slugify(a.name) + '.html' : slugify(a.name) + '.md', a.content, a.kind === 'html' ? 'text/html' : 'text/plain') }, icon('download', 14)),
      h('button', { class: 'icon-btn', onclick: async () => { if (await confirmBox('Artefact verwijderen?', a.name, 'Verwijderen')) { await patch([{ op: 'remove', path: ['artefacts'], id: a.id }]); refreshApp(); } } }, icon('trash', 17))))) : h('div', { class: 'empty' }, 'Nog geen artefacten.'));
}
