// Runs steps and gates: builds the prompt, streams the answer, persists the thread, parses results into the Ledger.
import { S, patch, streamAI, saveUser } from './state.js';
import { FW, getPrompt } from './framework.js';
import { FLOWS, art } from './flows.js';
import {
  buildSystem, buildSystemEx, utf8Bytes, normalizeMessages, ledgerBlock, resolvePrompt, parseGate, nextStageNeeds, decisionLine, DEFAULT_BANNER,
  hoursSummary, estimateTokens, todayIso, dateEn,
} from './engine.js';
import { uid, modal, h, copyText, icon, toast, autoGrow, downloadText } from './ui.js';
import { hoursFilled } from './flows.js';

export const running = { id: null, abort: null };

export function settingsOf(p) {
  const m = p.meta || {};
  return { mode: m.mode || 'practice', discipline: !!m.discipline, banner: m.banner || DEFAULT_BANNER, language: m.language || 'en', gateHint: m.gateHint !== false };
}

export function makeCtx(modId) {
  const p = S.p;
  const mod = p.modules?.[modId] || {};
  const ledger = ledgerBlock(p);
  const docs = (p.sources || []).some((s) => s.include !== false && s.text) || Object.values(p.casepack?.docs || {}).some((d) => d && d.text);
  return {
    p, mod, modId, settings: settingsOf(p), ledger, hasLedger: !!ledger, hasDocs: docs, user: S.user, hoursFilled: hoursFilled(S.user),
    needsFor(m) { return nextStageNeeds(ledger).filter((n) => new RegExp('\\b' + m + '\\b').test(n.for)).map((n) => `Next stage needs — for ${n.for}: ${n.text}`); },
  };
}

const attachText = (att) => (att || []).map((a) => `\n\n<attached_file name="${a.name}">\n${a.text}\n</attached_file>`).join('');

export function threadOf(modId, name = 'main') { return S.p.modules?.[modId]?.threads?.[name] || []; }

function ensureModule(P, modId) {
  const ops = [];
  const m = P.modules?.[modId];
  if (!m) ops.push({ op: 'set', path: ['modules', modId], value: { status: 'doing', startedAt: new Date().toISOString(), threads: {}, data: {}, page: {} } });
  else if (!m.status || m.status === 'todo') ops.push({ op: 'set', path: ['modules', modId, 'status'], value: 'doing' }, { op: 'set', path: ['modules', modId, 'startedAt'], value: new Date().toISOString() });
  return ops;
}

/** Workspace system prompt, shortened to the per-call limit of the platform (artifact: 256 KiB for everything one call carries). */
export function sysFor(P, settings, scope, otherBytes = 0) {
  const limit = S.config?.maxPromptBytes || 0;
  const maxBytes = limit ? Math.max(30000, limit - otherBytes - 8000) : undefined;
  return buildSystemEx(P, settings, scope === 'casepack' ? 'casepack' : undefined, { maxBytes });
}

/** Build the exact user message of a step (also used by the "Bekijk prompt" preview). */
export function previewStep(modId, step, values) {
  const ctx = makeCtx(modId);
  const b = step.build(ctx, values || {});
  const content = typeof b === 'string' ? b : b.content + attachText(b.attach);
  const scope = step.scope || 'workspace';
  const system = scope === 'private' ? '' : sysFor(S.p, ctx.settings, scope, utf8Bytes(content)).text;
  return { content, system, tokens: estimateTokens(system) + estimateTokens(content), ctx };
}

export function manualAsk({ title, content, system }) {
  return new Promise((resolve, reject) => {
    const ta = h('textarea', { rows: 10, placeholder: 'Plak hier het antwoord van je AI-tool…', class: 'mono' });
    autoGrow(ta);
    const body = h('div', { class: 'stack' },
      h('p', { class: 'muted' }, 'Kopieer-modus: er is geen AI-koppeling ingesteld. Plak onderstaande prompt in je goedgekeurde AI-omgeving (zelfde werkruimte met je Case Pack) en plak het antwoord hier terug.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => copyText(content, 'Prompt gekopieerd') }, icon('copy', 16), 'Kopieer prompt'),
        system ? h('button', { class: 'btn ghost', onclick: () => downloadText('werkruimte-bestanden.md', system) }, icon('download', 16), 'Download werkruimte-bestanden') : null),
      h('pre', { class: 'code small' }, content.length > 6000 ? content.slice(0, 6000) + '\n… (ingekort in dit venster; de kopieerknop kopieert alles)' : content), ta);
    modal({ title, body, wide: true, onClose: () => reject(new Error('Geannuleerd')), actions: [{ label: 'Annuleren', kind: 'ghost', onClick: () => reject(new Error('Geannuleerd')) }, { label: 'Antwoord verwerken', kind: 'primary', onClick: () => { if (!ta.value.trim()) { toast('Plak eerst het antwoord', 'error'); return false; } resolve(ta.value); } }] });
  });
}

/**
 * Run one step (or a free-text chat turn). onUpdate({ phase:'start'|'delta'|'done'|'error', text, userMsg })
 * Persists user + assistant message and result ops only on success.
 */
export async function runStep(modId, step, values, { freeText, onUpdate, regenerate } = {}) {
  if (running.id) throw new Error('Er loopt al een AI-aanroep. Wacht tot die klaar is of stop hem.');
  const P = S.p;
  const pid = P.id;
  const ctx = makeCtx(modId);
  if (step.guard && freeText === undefined) { const g = step.guard(ctx, values || {}); if (g) throw new Error(g); }
  if (step.ledgerNeeded !== false && freeText === undefined && !ctx.hasLedger && modId !== 'M0' && !step.noLedgerCheck && !['s2a', 's2b', 's2c'].includes(step.id)) {
    const needs = step.id === 's1' || !!step.requiresLedger;
    if (needs && modId !== 'M14') throw new Error('Er is nog geen Pursuit Ledger. Draai eerst M0 (of gebruik "Snelstart" op het overzicht).');
  }
  let content, attach;
  if (freeText !== undefined) content = freeText;
  else { const b = step.build(ctx, values || {}); content = typeof b === 'string' ? b : b.content + attachText(b.attach); attach = typeof b === 'string' ? null : b.attach; }

  const threadName = step.thread || 'main';
  const existing = threadOf(modId, threadName);
  const userMsg = { id: uid('m'), role: 'user', content, step: step.id, ts: new Date().toISOString(), kind: freeText !== undefined ? 'chat' : 'prompt', values: freeText === undefined ? values : undefined };
  const basePath = ['modules', modId, 'threads', threadName];

  if (step.noReply) { await patch([...ensureModule(P, modId), { op: 'push', path: basePath, value: userMsg }], { pid }); onUpdate && onUpdate({ phase: 'done' }); return { ok: true }; }

  const scope = step.scope || 'workspace';
  const messages = normalizeMessages([...existing, userMsg]);
  const sys = scope === 'private' ? { text: '', truncated: [] } : sysFor(P, ctx.settings, scope, messages.reduce((a, m) => a + utf8Bytes(m.content), 0));
  const system = sys.text;
  if (sys.truncated.length) toast('Niet alles paste in één Claude-aanroep: ' + sys.truncated.map((x) => `${x.name} (${Math.round((x.shown / x.total) * 100)}%)`).join(', ') + ' is ingekort. Het Case Pack blijft compleet; zet bronnen uit of splits ze voor meer.', 'info', 9000);
  const maxTokens = step.maxTokens || 12000;
  const t0 = Date.now();
  let text, usage;
  onUpdate && onUpdate({ phase: 'start', userMsg });
  const ac = new AbortController();
  running.id = modId + ':' + step.id; running.abort = () => ac.abort();
  try {
    if (S.config.provider === 'manual' || (!S.config.hasKey && S.config.provider !== 'mock')) {
      text = await manualAsk({ title: step.title, content, system }); usage = { manual: true };
    } else {
      ({ text, usage } = await streamAI({ system, messages, maxTokens, signal: ac.signal, onDelta: (t) => onUpdate && onUpdate({ phase: 'delta', text: t }) }));
    }
    if (!text.trim()) throw new Error('Het model gaf een leeg antwoord. Probeer opnieuw.');
  } catch (e) {
    running.id = null; running.abort = null;
    if (ac.signal.aborted) { onUpdate && onUpdate({ phase: 'error', error: 'Gestopt', partial: undefined }); return { ok: false, aborted: true }; }
    onUpdate && onUpdate({ phase: 'error', error: e.message, partial: e.partial });
    return { ok: false, error: e.message };
  }
  running.id = null; running.abort = null;
  const asst = { id: uid('m'), role: 'assistant', content: text, step: step.id, ts: new Date().toISOString(), usage: usage ? { in: usage.input, out: usage.output, model: usage.model, truncated: !!usage.truncated, ms: Date.now() - t0 } : undefined };
  const ops = [...ensureModule(P, modId), { op: 'push', path: basePath, value: userMsg }, { op: 'push', path: basePath, value: asst }];
  if (step.onResult && !asst.usage?.truncated) {
    try {
      const extra = step.onResult({ ...ctx, mod: { ...(P.modules?.[modId] || {}), threads: { ...(P.modules?.[modId]?.threads || {}), [threadName]: [...existing, userMsg, asst] } } }, text);
      if (extra) ops.push(...extra);
    } catch (e) { console.error('onResult', e); }
  }
  await patch(ops, { pid });
  onUpdate && onUpdate({ phase: 'done', msg: asst });
  return { ok: true, msg: asst, pid };
}

/** The answer was cut off at the token limit: ask to continue and merge into the same message. */
export async function continueMessage(modId, step, msg, { onUpdate } = {}) {
  const P = S.p; const pid = P.id;
  const threadName = step.thread || 'main';
  const arr = threadOf(modId, threadName);
  const idx = arr.findIndex((m) => m.id === msg.id);
  if (idx < 0) throw new Error('Bericht niet gevonden');
  const ctx = makeCtx(modId);
  const scope = step.scope || 'workspace';
  const messages = normalizeMessages([...arr.slice(0, idx + 1), { role: 'user', content: 'Continue from where you stopped.' }]);
  const system = scope === 'private' ? '' : sysFor(P, ctx.settings, scope, messages.reduce((a, m) => a + utf8Bytes(m.content), 0)).text;
  const ac = new AbortController(); running.id = 'cont'; running.abort = () => ac.abort();
  onUpdate && onUpdate({ phase: 'start' });
  try {
    const { text, usage } = await streamAI({ system, messages, maxTokens: step.maxTokens || 12000, signal: ac.signal, onDelta: (t) => onUpdate && onUpdate({ phase: 'delta', text: msg.content + t }) });
    running.id = null;
    const merged = msg.content + text;
    await patch([{ op: 'set', path: ['modules', modId, 'threads', threadName, idx, 'content'], value: merged }, { op: 'set', path: ['modules', modId, 'threads', threadName, idx, 'usage'], value: { ...(msg.usage || {}), truncated: !!usage?.truncated, out: (msg.usage?.out || 0) + (usage?.output || 0) } }], { pid });
    if (step.onResult && !usage?.truncated) { const extra = step.onResult({ ...ctx, mod: { ...(P.modules?.[modId] || {}), threads: { ...(P.modules?.[modId]?.threads || {}), [threadName]: arr.map((m, i) => (i === idx ? { ...m, content: merged } : m)) } } }, merged); if (extra?.length) await patch(extra, { pid }); }
    onUpdate && onUpdate({ phase: 'done' });
  } catch (e) { running.id = null; onUpdate && onUpdate({ phase: 'error', error: ac.signal.aborted ? 'Gestopt' : e.message }); }
}

export function stopRunning() { running.abort && running.abort(); }

export function editMessage(modId, thread, id, content) {
  const arr = threadOf(modId, thread); const idx = arr.findIndex((m) => m.id === id);
  if (idx < 0) return Promise.resolve();
  return patch([{ op: 'set', path: ['modules', modId, 'threads', thread, idx, 'content'], value: content }, { op: 'set', path: ['modules', modId, 'threads', thread, idx, 'edited'], value: true }]);
}

/** Remove everything from step index k onward (all threads of the module). */
export function resetFrom(modId, k) {
  const flow = FLOWS[modId]; const drop = new Set(flow.steps.slice(k).map((s) => s.id)); drop.add('gate');
  const m = S.p.modules?.[modId]; if (!m?.threads) return Promise.resolve();
  const ops = [];
  for (const [name, arr] of Object.entries(m.threads)) ops.push({ op: 'set', path: ['modules', modId, 'threads', name], value: arr.filter((x) => !drop.has(x.step)) });
  ops.push({ op: 'set', path: ['modules', modId, 'gate'], value: null }, { op: 'set', path: ['modules', modId, 'status'], value: 'doing' });
  return patch(ops);
}

// ------------------------------------------------------------------------------------------------
// The gate
// ------------------------------------------------------------------------------------------------
const GATE_HINT = '(Format for the app — the content above is unchanged: begin part (1) with the line "## (1) Human checks", part (2) with "## (2) Workflow row" and part (3) with "## (3) Pursuit Ledger". In part (3) start each of the eight fields on its own line with its number and name in bold, e.g. "**1 Case** …". Use Markdown tables with a header row.)';

export function composeGate(modId, { decision, note, caseDate } = {}) {
  const ctx = makeCtx(modId);
  const flow = FLOWS[modId];
  const lines = [];
  const dl = decisionLine(decision);
  if (dl && flow.gate?.kind === 'decision') lines.push(dl);
  if (note && String(note).trim()) lines.push((flow.gate?.prefix || '') + String(note).trim());
  const cd = caseDate !== undefined ? caseDate : S.p.meta?.caseDate;
  if (cd) lines.push('Case date: ' + dateEn(cd) + '.');
  const gate = getPrompt(modId, 'GATE');
  const text = resolvePrompt(gate, ctx.settings, {});
  const ledger = ctx.ledger ? '\n\n--- My Pursuit Ledger (latest) ---\n' + ctx.ledger : '';
  return (lines.length ? lines.join('\n') + '\n\n' : '') + text + (ctx.settings.gateHint ? '\n\n' + GATE_HINT : '') + ledger;
}

/** Run the gate in the module's main chat. Returns parsed result; saving into Ledger/Workflow is a separate, human-confirmed step. */
export async function runGate(modId, opts, { onUpdate } = {}) {
  const step = { id: 'gate', title: 'Gate', thread: 'main', scope: 'workspace', maxTokens: 16000, build: () => composeGate(modId, opts) };
  const res = await runStep(modId, step, {}, { onUpdate });
  if (!res.ok) return res;
  const parsed = parseGate(res.msg.content);
  await patch([{ op: 'set', path: ['modules', modId, 'gate'], value: { runAt: new Date().toISOString(), msgId: res.msg.id, truncated: !!res.msg.usage?.truncated, raw: res.msg.content, parsed, saved: false, input: { decision: opts?.decision || null, note: opts?.note || '', caseDate: opts?.caseDate || S.p?.meta?.caseDate || '' } } }], { pid: res.pid });
  return { ok: true, parsed };
}

export async function saveGate(modId, { checks, row, ledgerText }) {
  const now = new Date().toISOString();
  const g = S.p.modules?.[modId]?.gate || {};
  const ops = [];
  const flow = FLOWS[modId];
  if (ledgerText && ledgerText.trim()) {
    ops.push({ op: 'set', path: ['ledger', 'current'], value: { text: ledgerText.trim(), module: modId, at: now, caseDate: g.input?.caseDate || '' } });
    ops.push({ op: 'push', path: ['ledger', 'history'], value: { module: modId, at: now, text: ledgerText.trim(), caseDate: g.input?.caseDate || '' } });
    (S.p.evidence || []).forEach((e, i) => { if (!e.applied) ops.push({ op: 'set', path: ['evidence', i, 'applied'], value: true }); });
  }
  const inp = g.input || {};
  const dec = inp.decision;
  if (dec && String(dec.text || '').trim()) {
    ops.push({ op: 'upsert', path: ['decisions'], key: 'id', value: { id: modId + '-d', module: modId, kind: 'decision', text: dec.text.trim(), at: now, conditions: (dec.conditions || []).filter((c) => c.text?.trim()).map((c) => ({ id: uid('c'), text: c.text.trim(), owner: c.owner || '', due: c.due || '', status: 'open' })), flip: dec.flip?.text ? { text: dec.flip.text, owner: dec.flip.owner || '', due: dec.flip.due || '' } : null } });
  }
  if (inp.note && String(inp.note).trim() && flow.gate?.kind !== 'decision') ops.push({ op: 'upsert', path: ['decisions'], key: 'id', value: { id: modId + '-n', module: modId, kind: flow.gate?.kind || 'note', text: (flow.gate?.prefix || '') + inp.note.trim(), at: now, conditions: [] } });
  ops.push({ op: 'set', path: ['modules', modId, 'gate'], value: { ...g, saved: true, savedAt: now, checks: checks || g.parsed?.checks || [], row: row || g.parsed?.row || null, ledgerText: ledgerText || '' } });
  ops.push({ op: 'set', path: ['modules', modId, 'status'], value: 'done' }, { op: 'set', path: ['modules', modId, 'doneAt'], value: now });
  await patch(ops);
}

export function markModuleDone(modId) {
  const now = new Date().toISOString();
  return patch([...ensureModule(S.p, modId), { op: 'set', path: ['modules', modId, 'status'], value: 'done' }, { op: 'set', path: ['modules', modId, 'doneAt'], value: now }]);
}

export function moduleStatus(p, modId) { return p.modules?.[modId]?.status || 'todo'; }

export function ledgerFields(p) {
  const t = p.ledger?.current?.text;
  if (!t) return null;
  return import('./engine.js').then((e) => e.parseLedger(t));
}

/** After "continue" on a truncated gate answer: merge, re-parse and refresh the stored gate result. */
export async function reparseGate(modId) {
  const arr = threadOf(modId, 'main');
  const g = S.p.modules?.[modId]?.gate;
  const msg = arr.find((m) => m.id === g?.msgId);
  if (!msg) return;
  await patch([{ op: 'set', path: ['modules', modId, 'gate'], value: { ...g, raw: msg.content, parsed: parseGate(msg.content), truncated: !!msg.usage?.truncated } }]);
}
export function gateStep(modId) { return { id: 'gate', title: 'Gate', thread: 'main', scope: 'workspace', maxTokens: 16000 }; }

/** Add a practical hint to the most common provider errors. */
export function explainError(msg) {
  const m = String(msg || '');
  let hint = '';
  if (/prompt is too long|too long|context.{0,20}(length|window)|maximum context|too many tokens/i.test(m)) hint = 'De werkruimte is te groot voor het model. Zet bronnen uit bij Bronnen (vinkje "meenemen") of kies "Alleen Case Pack".';
  else if (/401|403|invalid.{0,12}(api.?key|x-api-key)|authentication|unauthori[sz]ed|permission/i.test(m)) hint = 'Controleer de API-sleutel en de rechten bij Instellingen → AI-koppeling.';
  else if (/429|rate.?limit|too many requests|quota/i.test(m)) hint = 'Limiet bereikt. Probeer het over een minuut opnieuw, of vraag een hogere limiet aan.';
  else if (/overload|529|503|502|temporar/i.test(m)) hint = 'De AI-provider is tijdelijk overbelast. Probeer het opnieuw.';
  else if (/model.{0,30}(not.?found|does not exist|unknown)|not_found/i.test(m)) hint = 'Controleer de modelnaam bij Instellingen → AI-koppeling.';
  else if (/failed to fetch|network|ENOTFOUND|ECONNREFUSED|fetch failed|getaddrinfo/i.test(m)) hint = 'De server kan de AI-provider niet bereiken. Controleer netwerk, proxy en base URL.';
  return hint ? m + ' — ' + hint : m;
}
