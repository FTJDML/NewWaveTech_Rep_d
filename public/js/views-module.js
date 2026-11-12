import { h, icon, toast, modal, confirmBox, fmtDate, fmtDateTime, uid, autoGrow, clear, copyText, debounce } from './ui.js';
import { S, patch, saveUser } from './state.js';
import { FW, getPrompt } from './framework.js';
import { mountMarkdown } from './md.js';
import { ROUTES, FLOWS, FORMS, moduleCards, lastMsg, art, artHtmlList, hoursText } from './flows.js';
import {
  STAGES, stageOf, extractStarQuestions, parseLedger, parseGate, decisionLine, todayIso, estimateTokens, fmtTokens, nextStageNeeds, dateEn, LEDGER_FIELDS,
} from './engine.js';
import { makeCtx, runStep, runGate, saveGate, stopRunning, running, previewStep, editMessage, resetFrom, continueMessage, composeGate, markModuleDone, threadOf, reparseGate, gateStep } from './runtime.js';
import { modStatus, modTitle, nextModule, OPTIONAL } from './helpers.js';
import { previewHtml } from './views-pursuit.js';
import { hoursEditor } from './views-misc.js';

const stripDemo = (t) => String(t || '').replace(/^> \*\*DEMO-OUTPUT\*\*[^\n]*\n\n?/, '');

export async function viewModule(p, modId) {
  const mod = FW.modules[modId];
  const flow = FLOWS[modId];
  const root = h('div', null);
  const VKEY = `pn.vals.${p.id}.${modId}`;
  let vals = {};                        // step input values survive re-renders (and a page reload, via sessionStorage)
  try { vals = JSON.parse(sessionStorage.getItem(VKEY) || '{}'); } catch { vals = {}; }
  const persist = debounce(() => { try { sessionStorage.setItem(VKEY, JSON.stringify(vals, (k, v) => (k === 'html' ? '' : v))); } catch { /* quota */ } }, 400);
  root.addEventListener('input', persist); root.addEventListener('change', persist);
  let openIdx = null;                   // which step is expanded
  const live = {};                      // live streaming nodes by step id
  const errs = {};

  const state = () => p.modules?.[modId] || {};
  const stepDone = (s) => {
    const arr = Object.values(state().threads || {}).flat();
    return s.noReply ? arr.some((m) => m.step === s.id && m.role === 'user') : arr.some((m) => m.step === s.id && m.role === 'assistant');
  };
  const firstOpen = () => { const i = flow.steps.findIndex((s) => !s.optional && !stepDone(s)); return i < 0 ? Math.max(0, flow.steps.findIndex((s) => !stepDone(s))) : i; };

  function rerender() { if (!root.isConnected) return; const y = window.scrollY; clear(root); root.append(build()); window.scrollTo(0, y); }

  // ------------------------------------------------------------------------------------------
  function header() {
    const stg = modId === 'M0' ? 'Fundament' : `Stage ${stageOf(modId)} · ${STAGES[stageOf(modId) - 1].name}`;
    const st = modStatus(p, modId);
    const ctx = makeCtx(modId);
    return h('div', { class: 'mhead' },
      h('div', { class: 'eyebrow red' }, stg),
      h('h1', null, `${modId} · ${mod.title}`),
      h('p', { class: 'q' }, '“' + mod.question + '”'),
      h('p', { class: 'muted', style: { maxWidth: '78ch' } }, mod.intro),
      h('div', { class: 'row' }, h('span', { class: 'chip purple' }, icon('clock', 12), ` ± ${mod.minutes} min`), h('span', { class: 'chip ' + (st === 'done' ? 'green' : st === 'doing' ? 'amber' : '') }, st === 'done' ? 'afgerond' : st === 'doing' ? 'bezig' : 'nog niet gestart'), OPTIONAL.has(modId) ? h('span', { class: 'chip' }, 'persoonlijke module — optioneel per pursuit') : null,
        mod.reconstructed ? h('span', { class: 'chip amber', title: 'De officiële gids voor deze module zat niet in het aangeleverde materiaal' }, 'prompts gereconstrueerd uit werkboek') : null),
      mod.reconstructed ? h('div', { class: 'callout amber', style: { marginTop: '12px' } }, h('b', null, 'Let op'), `De deelnemersgids van ${modId} is niet meegeleverd. De kaart (stappen, checks, tips) is letterlijk uit het werkboek; de Workflow Skill-prompts zijn daaruit gereconstrueerd in dezelfde opbouw. Vervang ze door de officiële tekst via Bibliotheek → ${modId} → Bewerk zodra je die hebt.`) : null,
      !ctx.hasLedger && modId !== 'M0' ? h('div', { class: 'callout red', style: { marginTop: '12px' } }, h('b', null, 'Nog geen Ledger'), 'Elke skill leest de Pursuit Ledger. Draai eerst ', h('a', { href: `#/p/${p.id}/m/M0` }, 'M0'), ' (of gebruik "Snelstart" op het overzicht).') : null,
      !ctx.hasDocs ? h('div', { class: 'callout amber', style: { marginTop: '12px' } }, h('b', null, 'Lege werkruimte'), 'Er zijn nog geen bronnen of Case Pack. Voeg eerst de RFP en gesprekken toe — anders antwoordt elke skill met "Not provided — needs validation".') : null);
  }

  // ------------------------------------------------------------------------------------------
  function inputField(step, inp, ctx) {
    const key = inp.key;
    const sv = (vals[step.id] = vals[step.id] || {});
    if (inp.show && !inp.show(ctx)) return null;
    if (sv[key] === undefined) sv[key] = inp.default ? inp.default(ctx) : (inp.type === 'check' ? false : '');
    const lab = (t) => h('label', { class: 'f' }, t, inp.required ? h('span', { class: 'req' }, ' *') : null);
    const help = inp.help ? h('div', { class: 'help' }, inp.help) : null;
    const wrap = (...c) => h('div', { class: 'field' }, ...c);
    switch (inp.type) {
      case 'textarea': { const ta = h('textarea', { rows: inp.rows || 4, placeholder: inp.placeholder || '', oninput: (e) => { sv[key] = e.target.value; } }); ta.value = sv[key]; autoGrow(ta); return wrap(lab(inp.label), ta, help); }
      case 'text': case 'date': return wrap(lab(inp.label), h('input', { type: inp.type, value: sv[key], placeholder: inp.placeholder || '', oninput: (e) => { sv[key] = e.target.value; } }), help);
      case 'check': return wrap(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!sv[key], onchange: (e) => { sv[key] = e.target.checked; } }), h('span', null, inp.label, help)));
      case 'star': {
        const qs = extractStarQuestions(lastMsg(state(), 'main', 'assistant', 's1'));
        const ta = h('textarea', { rows: 2, placeholder: 'Typ je eerste vraag, of kies een ★-vraag hieronder', oninput: (e) => { sv[key] = e.target.value; } }); ta.value = sv[key]; autoGrow(ta);
        return wrap(lab(inp.label), ta, qs.length ? h('div', { class: 'quick' }, qs.map((q) => h('button', { type: 'button', onclick: () => { ta.value = q; sv[key] = q; ta.dispatchEvent(new Event('input')); } }, '★ ' + q))) : h('div', { class: 'help' }, 'Draai eerst stap 1: daar komen je drie ★-vragen uit.'), help);
      }
      case 'hours': return wrap(lab(inp.label), hoursEditor(S.user, async (u) => { await saveUser(u); }, { compact: true }), help);
      case 'lean': {
        const ta = h('input', { type: 'text', placeholder: 'bijv. Fixed price build; run cost separate', oninput: (e) => { sv[key] = e.target.value; } }); ta.value = sv[key];
        return wrap(lab(inp.label), h('div', { class: 'quick', style: { marginTop: 0, marginBottom: '8px' } }, FORMS.map((f) => h('button', { type: 'button', onclick: () => { ta.value = f; sv[key] = f; } }, f)), h('button', { type: 'button', onclick: () => { ta.value = 'continue'; sv[key] = 'continue'; } }, 'continue — toon de hypothese van het model')), ta, h('div', { class: 'help' }, 'Het model beslist niet: dit is jouw voorkeur (H), voor besluit met finance.'));
      }
      case 'card': {
        const cards = moduleCards();
        const cur = sv[key] || (sv[key] = { n: 1, figure: '', clientText: '' });
        const sel = h('select', { onchange: (e) => { cur.n = +e.target.value; draw(); } }, cards.map((c) => h('option', { value: c.n, selected: c.n === cur.n }, c.card)));
        const info = h('div'); const fig = h('div');
        const draw = () => {
          const c = cards.find((x) => x.n === cur.n) || {}; clear(info); clear(fig);
          info.append(h('div', { class: 'callout', style: { marginTop: '8px' } }, h('b', null, cur.n === 0 ? 'Échte wijziging' : 'Oefenkaart — geen klantinformatie'), h('div', { class: 'small' }, h('b', null, 'Optie: '), c.option), h('div', { class: 'small' }, h('b', null, 'Raakt eerst: '), c.hits), h('div', { class: 'small' }, h('b', null, 'Dwingt besluit af: '), c.forces)));
          if (cur.n === 0) { const ta = h('textarea', { rows: 6, placeholder: 'Plak de tekst die je klant stuurde (addendum, Q&A-antwoord, notulen, change request)', oninput: (e) => { cur.clientText = e.target.value; } }); ta.value = cur.clientText || ''; autoGrow(ta); fig.append(h('div', { class: 'field', style: { marginTop: '8px' } }, h('label', { class: 'f' }, 'Tekst van je klant'), ta)); }
          else { const i = h('input', { type: 'text', placeholder: 'bijv. cap €1.44 M (−20%)  ·  go-live 8 weeks earlier  ·  +30% volume', oninput: (e) => { cur.figure = e.target.value; } }); i.value = cur.figure || ''; fig.append(h('div', { class: 'field', style: { marginTop: '8px' } }, h('label', { class: 'f' }, 'Nieuw cijfer of nieuwe datum — typ het zelf', h('span', { class: 'req' }, ' *')), i, h('div', { class: 'help' }, 'Het model rekent nooit. Budgetrange van €1,2–1,8 M? Pas de kaart toe op de bovenkant: −20% op €1,8 M = cap €1.44 M.'))); }
        };
        draw();
        return wrap(lab(inp.label), sel, info, fig);
      }
      case 'rows8': {
        const cur = sv[key + '_rows'] || (sv[key + '_rows'] = { rows: { a: {}, b: {}, c: {}, d: {}, e: {}, f: {} }, reopen: 'none', cond: '' });
        const compose = () => {
          const lines = Object.entries(cur.rows).filter(([, r]) => (r.opt || '').trim()).map(([l, r]) => `${l}: ${r.opt.trim()}${(r.why || '').trim() ? ' — ' + r.why.trim() : ''}`);
          if (cur.reopen !== 'none') lines.push('Reopen: ' + (cur.reopen === 'add' ? 'add a condition — ' + (cur.cond || '[condition] — owner [role] — by [date]') : cur.reopen));
          sv[key] = lines.join('\n');
        };
        const labels = { a: '(a) Requirements, compliance, scores', b: '(b) Value and metric', c: '(c) Contract form, preconditions', d: '(d) Phase-1 stories and scope', e: '(e) Prototype', f: '(f) Cast and win themes' };
        const hint = lastMsg(state(), 'main', 'assistant', 's1');
        const rows = Object.keys(cur.rows).map((l) => h('div', { class: 'grid', style: { gridTemplateColumns: '170px 1fr 1fr', gap: '8px', marginBottom: '6px', alignItems: 'start' } }, h('div', { class: 'small', style: { fontWeight: 600, paddingTop: '9px' } }, labels[l]), h('input', { type: 'text', placeholder: 'gekozen optie (of "no change")', value: cur.rows[l].opt || '', oninput: (e) => { cur.rows[l].opt = e.target.value; compose(); } }), h('input', { type: 'text', placeholder: 'waarom', value: cur.rows[l].why || '', oninput: (e) => { cur.rows[l].why = e.target.value; compose(); } })));
        const reo = h('select', { onchange: (e) => { cur.reopen = e.target.value; compose(); } }, [['none', 'Geen reopen-regel in de map'], ['keep', 'Reopen: keep'], ['add', 'Reopen: add a condition (owner, date)'], ['stop', 'Reopen: stop']].map(([v, l]) => h('option', { value: v, selected: v === cur.reopen }, l)));
        const cond = h('input', { type: 'text', placeholder: 'voorwaarde — owner [rol] — by [datum]', value: cur.cond || '', oninput: (e) => { cur.cond = e.target.value; compose(); } });
        compose();
        return wrap(lab(inp.label), h('div', { class: 'help', style: { marginBottom: '8px' } }, 'Lees de impact-map hierboven; kies per rij één van de 2–3 opties (of beslis zelf). Het model past alleen toe wat je hier schrijft.'), ...rows, h('div', { class: 'grid g2', style: { marginTop: '8px' } }, reo, cond));
      }
      case 'proto': {
        const list = artHtmlList(p).slice().sort((a, b) => (a.id < b.id ? 1 : -1));
        const cur = sv[key] || (sv[key] = { name: '', html: '' });
        const pre = (cur.id && list.find((a) => a.id === cur.id)) || list.find((a) => a.id === 'm11-frozen') || list.find((a) => a.id === 'm7-v2') || list[0];
        if (!cur.html && pre) { cur.name = pre.name + '.html'; cur.html = pre.content; cur.id = pre.id; }
        const sel = h('select', { onchange: (e) => { const a = list.find((x) => x.id === e.target.value); if (a) { cur.name = a.name + '.html'; cur.html = a.content; cur.id = a.id; ta.value = ''; } else { cur.html = ta.value; cur.id = ''; } } }, list.map((a) => h('option', { value: a.id, selected: a.id === cur.id }, a.name)), h('option', { value: '' }, '— eigen HTML plakken —'));
        const ta = h('textarea', { rows: 3, placeholder: 'Plak hier de HTML van een prototype dat je buiten de app maakte', class: 'mono', oninput: (e) => { cur.html = e.target.value; cur.name = 'prototype.html'; sel.value = ''; cur.id = ''; } });
        return wrap(lab(inp.label), list.length ? sel : h('div', { class: 'callout amber' }, 'Nog geen prototype in de artefacten — bouw er een in M7, of plak hieronder de HTML.'), cur.html ? h('div', { class: 'row', style: { marginTop: '6px' } }, h('span', { class: 'chip green' }, `${fmtTokens(estimateTokens(cur.html))} tokens`), h('button', { type: 'button', class: 'btn ghost sm', onclick: () => previewHtml(cur.html, cur.name || 'Prototype') }, icon('eye', 14), 'Voorbeeld')) : null, ta);
      }
      case 'skillpick': {
        const opts = [];
        for (let n = 1; n <= 13; n++) { const m = FW.modules['M' + n]; (m?.prompts || []).forEach((pr) => { if (pr.id === 'P1' && /WORKFLOW SKILL/.test(pr.text)) opts.push([`M${n}:P1`, `M${n} · ${m.title}`]); }); }
        if (!sv[key]) sv[key] = 'M3:P1';
        return wrap(lab(inp.label), h('select', { onchange: (e) => { sv[key] = e.target.value; } }, opts.map(([v, l]) => h('option', { value: v, selected: v === sv[key] }, l))), h('div', { class: 'help' }, 'Het resultaat is een gelabeld concept — of een stop die zegt wat ontbreekt. Er gaat géén Ledger van deze case mee.'));
      }
      default: return null;
    }
  }

  // ------------------------------------------------------------------------------------------
  function messagesFor(step) {
    const out = [];
    const tname = step.thread || 'main';
    const arr = threadOf(modId, tname).filter((m) => m.step === step.id);
    const full = threadOf(modId, tname);
    arr.forEach((m) => {
      if (m.role === 'user') {
        if (m.kind === 'chat') out.push(h('div', { class: 'msg' }, h('div', { class: 'bubble-u' }, h('div', { class: 'xs muted' }, 'Jij'), h('div', { style: { whiteSpace: 'pre-wrap' } }, m.content))));
        else out.push(h('div', { class: 'msg' }, h('div', { class: 'bubble-sent' }, icon('send', 14), step.noReply ? 'Testrecord toegevoegd aan de chat' : `Prompt verstuurd · ≈ ${fmtTokens(estimateTokens(m.content))} tokens`, h('button', { class: 'mini', onclick: () => modal({ title: 'Verstuurd bericht', wide: true, body: h('pre', { class: 'code small' }, m.content), actions: [{ label: 'Kopieer', kind: 'ghost', keep: true, onClick: () => copyText(m.content) }, { label: 'Sluiten', kind: 'primary' }] }) }, 'Bekijk'))));
      } else {
        const isLast = full[full.length - 1]?.id === m.id;
        const body = h('div', { class: 'out md' }); mountMarkdown(body, stripDemo(m.content), { onHtml: (code) => previewHtml(code, step.title) });
        out.push(h('div', { class: 'msg' },
          h('div', { class: 'mbar' }, icon('spark', 14), h('b', null, 'AI'), m.edited ? h('span', { class: 'chip amber' }, 'door jou bewerkt') : null, m.usage?.model ? h('span', null, m.usage.model + (m.usage.in ? ` · ${fmtTokens(m.usage.in)} in / ${fmtTokens(m.usage.out)} uit` : '')) : null, h('span', { class: 'sp' }),
            h('button', { class: 'mini', onclick: () => copyText(stripDemo(m.content)) }, 'Kopieer'),
            h('button', { class: 'mini', onclick: () => editMsg(m, tname) }, 'Bewerk'),
            isLast && !step.chat ? h('button', { class: 'mini', onclick: () => redo(step) }, 'Opnieuw') : null),
          body,
          m.usage?.truncated ? h('div', { class: 'err' }, 'Het antwoord is afgekapt (token-limiet). ', h('button', { class: 'btn sm outline', onclick: () => cont(step, m) }, 'Doorgaan waar het stopte')) : null));
      }
    });
    return out;
  }

  function editMsg(m, tname) {
    const ta = h('textarea', { rows: 18, class: 'mono' }); ta.value = m.content; autoGrow(ta);
    modal({ title: 'Antwoord bewerken', wide: true, body: h('div', { class: 'stack' }, h('div', { class: 'callout' }, 'Corrigeer het model waar het fout zit — jij bent de menselijke check. Latere stappen en de Ledger lezen jouw versie.'), ta), actions: [{ label: 'Annuleren', kind: 'ghost' }, { label: 'Opslaan', kind: 'primary', onClick: async () => { await editMessage(modId, tname, m.id, ta.value); rerender(); } }] });
  }
  async function redo(step) {
    const idx = flow.steps.findIndex((s) => s.id === step.id);
    const later = flow.steps.slice(idx + 1).some(stepDone);
    if (later && !(await confirmBox('Stap opnieuw doen?', 'Latere stappen en een eventueel gate worden verwijderd, omdat ze op dit antwoord bouwen.', 'Opnieuw doen', 'primary'))) return;
    await resetFrom(modId, idx); openIdx = idx; rerender();
  }
  async function cont(step, m) {
    const box = live[step.id]; await continueMessage(modId, step, m, { onUpdate: (u) => { if (u.phase === 'done' || u.phase === 'error') { if (u.error) toast(u.error, 'error'); rerender(); } } });
  }

  // ------------------------------------------------------------------------------------------
  async function exec(step, free) {
    const sv = vals[step.id] || {};
    errs[step.id] = null;
    const holder = live[step.id];
    const streamNode = h('div', { class: 'msg' }, h('div', { class: 'mbar' }, icon('spark', 14), h('b', null, 'AI schrijft'), h('span', { class: 'dots' }), h('span', { class: 'sp' }), h('button', { class: 'btn sm danger', onclick: stopRunning }, icon('stop', 13), 'Stop')), h('div', { class: 'out streaming md' }, h('p', { class: 'muted' }, 'Verbinden met het model…')));
    holder.append(streamNode);
    const body = streamNode.querySelector('.out');
    let last = 0;
    document.querySelectorAll('.run-btn').forEach((b) => (b.disabled = true));
    const res = await runStep(modId, step, sv, {
      freeText: free,
      onUpdate: (u) => {
        if (u.phase === 'delta') { const now = Date.now(); if (now - last > 140) { last = now; mountMarkdown(body, u.text); } body.dataset.t = u.text; }
        if (u.phase === 'error') { /* handled below */ }
      },
    }).catch((e) => ({ ok: false, error: e.message }));
    if (!res.ok) {
      document.querySelectorAll('.run-btn').forEach((b) => (b.disabled = false));
      streamNode.remove();
      if (res.aborted) { toast('Gestopt', 'info'); }
      else { errs[step.id] = res.error; }
      rerender(); return;
    }
    const idx = flow.steps.findIndex((s) => s.id === step.id);
    const nextIdx = flow.steps.findIndex((s, i) => i > idx && !s.optional && !stepDone(s));
    openIdx = step.chat || res.msg?.usage?.truncated ? idx : (nextIdx >= 0 ? nextIdx : idx);
    rerender();
  }

  // ------------------------------------------------------------------------------------------
  function stepCard(step, i) {
    const ctx = makeCtx(modId);
    const done = stepDone(step);
    const open = openIdx === i;
    const body = h('div', { class: 'step-body' });
    const card = h('div', { class: 'step' + (done ? ' done' : '') + (open ? ' open' : '') },
      h('div', { class: 'step-head', onclick: () => { openIdx = open ? -1 : i; rerender(); } },
        h('div', { class: 'step-n' }, done ? icon('check', 17) : String(i + 1)), h('div', { class: 'grow' }, h('h3', null, step.title)),
        h('div', { class: 'meta' }, step.optional ? h('span', { class: 'chip' }, 'optioneel') : null, step.scope === 'private' ? h('span', { class: 'chip purple', title: 'Aparte chat zonder je Ledger of documenten' }, icon('lock', 11), ' privé-chat') : null, step.chat ? h('span', { class: 'chip rehearsed' }, 'simulatie') : null, step.min ? h('span', null, '± ' + step.min + ' min') : null, icon(open ? 'chevronDown' : 'chevron', 18))),
      open ? body : null);
    if (!open) return card;

    body.append(h('p', { class: 'step-desc' }, step.desc));
    const inputs = (step.inputs || []).map((inp) => inputField(step, inp, ctx)).filter(Boolean);
    const sv = (vals[step.id] = vals[step.id] || {});
    const msgs = messagesFor(step);
    const hasReply = done;
    const showForm = !step.chat || !hasReply;
    if (inputs.length && showForm) body.append(h('div', null, ...inputs));
    const holder = (live[step.id] = h('div'));
    const guard = step.guard && !step.chat ? step.guard(ctx, sv) : null;

    // prompt preview
    if (showForm) {
      const pre = h('details', { class: 'small', style: { marginBottom: '6px' } }, h('summary', { style: { cursor: 'pointer', color: 'var(--purple)', fontWeight: 600 } }, 'Bekijk de exacte prompt die wordt verstuurd'));
      pre.addEventListener('toggle', () => {
        if (!pre.open || pre.dataset.done) return; pre.dataset.done = '1';
        try { const pv = previewStep(modId, step, sv); pre.append(h('div', { class: 'muted xs', style: { margin: '6px 0' } }, `≈ ${fmtTokens(pv.tokens)} tokens incl. werkruimte-bestanden · ${step.scope === 'private' ? 'privé-chat: geen werkruimte, geen Ledger, geen eerdere chats' : 'systeemprompt = vaste instructies + Case Pack + bronnen'}`), h('pre', { class: 'code small' }, pv.content.length > 30000 ? pv.content.slice(0, 30000) + '\n… (ingekort in de weergave)' : pv.content), h('button', { class: 'mini', onclick: () => copyText(pv.content) }, 'Kopieer prompt')); }
        catch (e) { pre.append(h('div', { class: 'err' }, e.message)); }
      });
      body.append(pre);
    }

    // run bar
    if (showForm) {
      const label = step.noReply ? 'Toevoegen aan chat' : step.chat ? 'Start de simulatie' : done ? 'Opnieuw uitvoeren' : 'Uitvoeren';
      const missingNow = () => (step.inputs || []).filter((x) => x.required && (!sv[x.key] || !String(sv[x.key]).trim()) && !(x.show && !x.show(ctx))).map((x) => x.label);
      const btn = h('button', { class: 'btn primary run-btn', onclick: async () => { const missing = missingNow(); if (missing.length) { toast('Vul eerst in: ' + missing[0], 'error'); return; } if (done && !step.chat) { if (!(await confirmBox('Opnieuw uitvoeren?', 'Het huidige antwoord van deze stap (en latere stappen) wordt vervangen.', 'Opnieuw uitvoeren', 'primary'))) return; await resetFrom(modId, i); } exec(step); } }, step.noReply ? icon('check', 16) : icon('play', 16), label);
      body.append(h('div', { class: 'runbar' }, btn, guard ? h('span', { class: 'small', style: { color: 'var(--red-700)' } }, icon('alert', 15), ' ' + guard) : null, S.config.provider !== 'mock' && (S.config.provider === 'manual' || !S.config.hasKey) ? h('span', { class: 'chip amber' }, 'kopieer-modus') : null));
    }
    if (errs[step.id]) body.append(h('div', { class: 'err' }, h('b', null, 'Mislukt: '), errs[step.id]));
    body.append(...msgs, holder);

    // chat controls
    if (step.chat && hasReply) {
      const userTurns = threadOf(modId, step.thread || 'main').filter((m) => m.step === step.id && m.kind === 'chat').length;
      const ended = step.chat.endText && threadOf(modId, step.thread || 'main').some((m) => m.step === step.id && m.kind === 'chat' && m.content.trim().toLowerCase() === step.chat.endText.toLowerCase());
      const ta = h('textarea', { rows: 2, placeholder: step.chat.placeholder || 'Typ je bericht…', onkeydown: (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send.click(); } }); autoGrow(ta);
      const send = h('button', { class: 'btn primary run-btn', onclick: () => { const v = ta.value.trim(); if (!v) return; exec(step, v); } }, icon('send', 16), 'Verstuur');
      if (ended) body.append(h('div', { class: 'callout green', style: { marginTop: '14px' } }, h('b', null, 'Simulatie afgerond'), 'Lees de debrief. Een simulatie valideert niets: alles blijft "rehearsed — not validated" tot een echt gesprek.'));
      else {
        body.append(h('div', { class: 'chatbox' }, ta, send));
        const quick = [...(step.chat.quick || []), ...(step.chat.endText ? [{ label: step.chat.endLabel, text: step.chat.endText, end: true }] : [])];
        if (quick.length) body.append(h('div', { class: 'quick' }, quick.map((q) => h('button', { class: 'run-btn', onclick: () => exec(step, q.text), style: q.end ? { borderColor: 'var(--red)', color: 'var(--red-700)' } : null }, q.end ? '■ ' + q.label : q.label))));
        body.append(h('div', { class: 'row', style: { marginTop: '6px' } }, h('span', { class: 'xs muted' }, step.chat.max ? `Vragen gesteld: ${userTurns} (max ${step.chat.max}) · ` : '', 'Ctrl/⌘+Enter verstuurt'), h('button', { class: 'mini', onclick: () => redo(step) }, 'Simulatie opnieuw beginnen')));
      }
    }
    return card;
  }

  // ------------------------------------------------------------------------------------------
  function myPage() {
    const pg = (state().page || {});
    const p2 = mod.page2 || {};
    const save = (path, v) => patch([...(p.modules?.[modId] ? [] : [{ op: 'set', path: ['modules', modId], value: { status: 'todo', threads: {}, data: {}, page: {} } }]), { op: 'set', path: ['modules', modId, 'page', ...path], value: v }], { silent: true });
    const cell = (k, col) => { const ta = h('textarea', { rows: 2, onchange: (e) => save(['moment', k, col], e.target.value) }); ta.value = pg.moment?.[k]?.[col] || ''; autoGrow(ta); return ta; };
    const rowsDef = (p2.momentRows || []).filter((r) => !/^Time it takes$/.test(r));
    const hasTime = (p2.momentRows || []).includes('Time it takes');
    const body = h('div', { class: 'stack' });
    if (p2.momentQuestion) {
      body.append(h('div', null, h('h4', null, 'Workflow moment — drie minuten vóór het gate'), h('p', { class: 'small' }, p2.momentQuestion),
        h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'Today — how I do this now'), h('th', null, 'From now — how I want to do it'))),
          h('tbody', null, rowsDef.map((r) => h('tr', null, h('td', { style: { width: '22%', fontWeight: 600 } }, r), h('td', null, cell(r, 'today')), h('td', null, cell(r, 'from')))),
            hasTime ? h('tr', null, h('td', { style: { fontWeight: 600 } }, 'Time it takes'), h('td', null, h('input', { type: 'text', placeholder: 'uren (getal eerst)', value: pg.time?.today || '', onchange: (e) => save(['time', 'today'], e.target.value) })), h('td', null, h('input', { type: 'text', placeholder: 'uren — estimate, to measure', value: pg.time?.from || '', onchange: (e) => save(['time', 'from'], e.target.value) }))) : null))));
    }
    if (modId === 'M4') {
      body.append(h('div', null, h('h4', null, 'Mijn gok, dan de blinde score'), h('div', { class: 'grid g3' }, ['guess', 'blind', 'gap'].map((k, i) => h('div', null, h('label', { class: 'f' }, ['Mijn gok van het totaal (voor de evaluator)', 'Blinde score van de evaluator', 'Het verschil — de les'][i]), h('input', { type: 'text', placeholder: i < 2 ? '__ / 5' : '', value: pg.score?.[k] || '', onchange: (e) => save(['score', k], e.target.value) }))))));
    }
    const sug = p2.firstStepSuggestion;
    const fs = pg.firstStep || {};
    const what = h('input', { type: 'text', value: fs.what || '', placeholder: 'Wat precies — 30 minuten of minder', onchange: (e) => save(['firstStep', 'what'], e.target.value) });
    body.append(h('div', null, h('h4', null, 'Mijn eerste stap — binnen zeven dagen'),
      sug ? h('div', { class: 'small muted', style: { marginBottom: '6px' } }, 'Gebruik deze, of schrijf je eigen: ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); what.value = sug.replace(/_{2,}/g, '…'); what.dispatchEvent(new Event('change')); } }, '“' + sug + '”')) : null,
      h('div', { class: 'grid', style: { gridTemplateColumns: '2fr 1fr 1.4fr', gap: '8px' } }, what, h('input', { type: 'text', value: fs.when || '', placeholder: 'Wanneer', onchange: (e) => save(['firstStep', 'when'], e.target.value) }), h('input', { type: 'text', value: fs.where || '', placeholder: 'Op welk echt werk · met wie', onchange: (e) => save(['firstStep', 'where'], e.target.value) }))));
    body.append(h('div', null, h('label', { class: 'f' }, 'Mijn notitie — het model gecorrigeerd? Eén regel (Module 14 leest dit)'), h('input', { type: 'text', value: pg.note || '', placeholder: 'bijv. "Model rekende een totaal uit dat ik niet gaf — nu check ik altijd de uren-regel"', onchange: (e) => save(['note'], e.target.value) })));
    return h('details', { class: 'card top', style: { marginTop: '16px' }, open: false }, h('summary', { style: { cursor: 'pointer', fontWeight: 700 } }, 'Mijn pagina (werkboek) — workflow-moment en eerste stap'), h('div', { style: { marginTop: '14px' } }, body));
  }

  // ------------------------------------------------------------------------------------------
  function gatePanel() {
    const g = state().gate;
    const gk = flow.gate || { kind: 'none' };
    const wrap = h('div', { class: 'gate' }, h('div', { class: 'gate-head' }, icon('flag', 22), h('h3', null, 'Gate — sluit deze module'), h('span', { style: { marginLeft: 'auto', opacity: .85, fontSize: '.85rem' } }, '± 6 min')));
    const body = h('div', { class: 'gate-body stack' });
    wrap.append(body);
    if (gk.skip) {
      body.append(h('p', null, gk.hint), h('div', { class: 'row' }, modStatus(p, modId) === 'done' ? h('span', { class: 'chip green' }, 'afgerond') : h('button', { class: 'btn primary', onclick: async () => { await markModuleDone(modId); rerender(); toast('Module afgerond', 'ok'); } }, 'Markeer als afgerond')));
      return wrap;
    }
    if (g?.saved) {
      body.append(h('div', { class: 'callout green' }, h('b', null, 'Gate afgerond'), `Opgeslagen op ${fmtDateTime(g.savedAt)}. De Ledger en je workflow-map zijn bijgewerkt.`));
      body.append(reviewView(g, true));
      const nx = nextModule(p);
      body.append(h('div', { class: 'row' }, nx ? h('a', { class: 'btn primary', href: `#/p/${p.id}/m/${nx}` }, `Volgende: ${nx} · ${modTitle(nx)}`, icon('arrowRight', 16)) : null, h('button', { class: 'btn ghost', onclick: async () => { if (await confirmBox('Gate opnieuw doen?', 'De module wordt weer "bezig". De Ledger blijft de laatst opgeslagen versie tot je het gate opnieuw bevestigt.', 'Opnieuw', 'primary')) { await patch([{ op: 'set', path: ['modules', modId, 'gate'], value: null }, { op: 'set', path: ['modules', modId, 'status'], value: 'doing' }]); rerender(); } } }, 'Gate opnieuw uitvoeren')));
      return wrap;
    }
    const hcBlock = () => {
      const hc = state().checks || {};
      return h('div', null, h('h4', null, 'Menselijke checks — de jouwe, vóór je bevestigt'), h('div', { class: 'hc' }, mod.humanChecks.map((c, i) => h('label', null, h('input', { type: 'checkbox', checked: !!hc[i], onchange: (e) => patch([...(p.modules?.[modId] ? [] : [{ op: 'set', path: ['modules', modId], value: { status: 'todo', threads: {}, data: {}, page: {} } }]), { op: 'set', path: ['modules', modId, 'checks', i], value: e.target.checked }], { silent: true }) }), h('span', null, c)))));
    };
    if (g?.parsed && !g.saved) { body.append(hcBlock(), reviewView(g, false)); return wrap; }

    // ---- inputs of the gate
    body.append(h('p', null, 'Het gate toetst de menselijke checks van de skill die je draaide, schrijft één rij voor je workflow-map en een bijgewerkte Pursuit Ledger. ', h('b', null, 'Jij controleert het resultaat voordat het de nieuwe waarheid wordt.')));
    body.append(hcBlock());
    const gs = (vals.__gate = vals.__gate || { text: '', conds: [{ text: '', owner: '', due: '' }], flip: { text: '', owner: '', due: '' }, note: '', caseDate: p.meta.caseDate || '' });
    if (gk.kind === 'decision') {
      body.append(h('div', null, h('h4', null, 'Mijn besluit (optioneel)'), gk.hint ? h('p', { class: 'small muted' }, gk.hint) : null,
        h('div', { class: 'field' }, h('label', { class: 'f' }, 'Besluit — in één regel'), h('input', { type: 'text', placeholder: gk.placeholder || 'wat besluit je?', value: gs.text, oninput: (e) => { gs.text = e.target.value; } })),
        h('label', { class: 'f' }, 'Voorwaarden — elk met eigenaar (rol) en kalenderdatum'),
        h('div', { id: 'conds' }, ...gs.conds.map((c, ci) => condInputs(gs, c, ci))),
        h('button', { class: 'btn ghost sm', onclick: () => { gs.conds.push({ text: '', owner: '', due: '' }); rerender(); } }, icon('plus', 14), 'Voorwaarde toevoegen'),
        gk.flip ? h('div', { style: { marginTop: '14px' } }, h('label', { class: 'f' }, 'Flip fact to watch — het ene feit dat de aanbeveling zou omgooien'), h('div', { class: 'cond' }, h('input', { type: 'text', placeholder: 'het feit', value: gs.flip.text, oninput: (e) => { gs.flip.text = e.target.value; } }), h('input', { type: 'text', placeholder: 'eigenaar (rol)', value: gs.flip.owner, oninput: (e) => { gs.flip.owner = e.target.value; } }), h('input', { type: 'date', value: gs.flip.due, oninput: (e) => { gs.flip.due = e.target.value; } }), h('span'))) : null));
    } else if (gk.kind === 'note' || gk.kind === 'lean') {
      const def = gk.kind === 'lean' ? (vals.s2?.LEAN && vals.s2.LEAN !== 'continue' ? vals.s2.LEAN : '') : '';
      if (!gs.note && def) gs.note = def;
      body.append(h('div', { class: 'field' }, h('label', { class: 'f' }, gk.prefix || 'Notitie'), h('div', { class: 'help', style: { marginBottom: '4px' } }, gk.hint), h('input', { type: 'text', value: gs.note, placeholder: gk.kind === 'lean' ? 'form and parts, e.g. fixed price build; run cost separate' : 'de drie stages die ik houd …', oninput: (e) => { gs.note = e.target.value; } })));
    } else if (gk.hint) body.append(h('div', { class: 'callout' }, gk.hint));
    if (p.meta.caseDate) body.append(h('div', { class: 'callout amber' }, h('b', null, 'Casus uit het verleden'), `"Case date: ${dateEn(p.meta.caseDate)}." gaat automatisch mee, zodat voorwaarden vóór die datum niet als "missed" worden gelezen.`));
    // preview of gate prompt
    const pre = h('details', { class: 'small' }, h('summary', { style: { cursor: 'pointer', color: 'var(--purple)', fontWeight: 600 } }, 'Bekijk het gate-bericht'));
    pre.addEventListener('toggle', () => { if (pre.open) { pre.querySelector('pre')?.remove(); pre.append(h('pre', { class: 'code small' }, composeGate(modId, gateOpts(gs, gk)))); } });
    body.append(pre);
    const started = Object.values(state().threads || {}).flat().length > 0;
    const holder = h('div');
    body.append(h('div', { class: 'runbar' }, h('button', { class: 'btn primary run-btn', onclick: async () => {
      if (gk.conditionsRequired && gs.text.trim()) { const bad = gs.conds.filter((c) => c.text.trim() && (!c.owner.trim() || !c.due)); if (bad.length || !gs.conds.some((c) => c.text.trim())) { toast('Elke voorwaarde heeft een eigenaar (rol) en een kalenderdatum nodig.', 'error', 5500); return; } }
      if (!started) { toast('Draai eerst minstens één stap van deze module.', 'error'); return; }
      await runGateUi(gs, gk, holder);
    } }, icon('play', 16), 'Gate uitvoeren'), !started ? h('span', { class: 'small muted' }, 'Draai eerst de stappen hierboven.') : null), holder);
    return wrap;
  }
  const gateOpts = (gs, gk) => ({ decision: gk.kind === 'decision' && gs.text.trim() ? { text: gs.text, conditions: gs.conds, flip: gk.flip ? gs.flip : null } : null, note: gs.note, caseDate: gs.caseDate });
  function condInputs(gs, c, ci) {
    return h('div', { class: 'cond' }, h('input', { type: 'text', placeholder: 'voorwaarde', value: c.text, oninput: (e) => { c.text = e.target.value; } }), h('input', { type: 'text', placeholder: 'eigenaar (rol)', value: c.owner, oninput: (e) => { c.owner = e.target.value; } }), h('input', { type: 'date', value: c.due, oninput: (e) => { c.due = e.target.value; } }), h('button', { class: 'icon-btn', onclick: () => { gs.conds.splice(ci, 1); if (!gs.conds.length) gs.conds.push({ text: '', owner: '', due: '' }); rerender(); }, 'aria-label': 'Verwijder' }, icon('x', 16)));
  }
  async function runGateUi(gs, gk, holder) {
    const streamNode = h('div', { class: 'msg' }, h('div', { class: 'mbar' }, icon('spark', 14), h('b', null, 'Gate wordt uitgevoerd'), h('span', { class: 'dots' }), h('span', { class: 'sp' }), h('button', { class: 'btn sm danger', onclick: stopRunning }, icon('stop', 13), 'Stop')), h('div', { class: 'out streaming md' }, h('p', { class: 'muted' }, 'Verbinden met het model…')));
    holder.append(streamNode); const bodyEl = streamNode.querySelector('.out'); let last = 0;
    document.querySelectorAll('.run-btn').forEach((b) => (b.disabled = true));
    const res = await runGate(modId, gateOpts(gs, gk), { onUpdate: (u) => { if (u.phase === 'delta' && Date.now() - last > 160) { last = Date.now(); mountMarkdown(bodyEl, u.text); } } }).catch((e) => ({ ok: false, error: e.message }));
    document.querySelectorAll('.run-btn').forEach((b) => (b.disabled = false));
    if (!res.ok) { streamNode.remove(); if (!res.aborted) { errs.gate = res.error; holder.append(h('div', { class: 'err' }, res.error)); } return; }
    rerender();
  }

  function reviewView(g, saved) {
    const parsed = g.parsed || parseGate(g.raw || '');
    const edit = (vals.__rev = vals.__rev || {});
    if (!edit.init || edit.for !== g.runAt) { Object.assign(edit, { init: true, for: g.runAt, row: { ...(saved ? g.row : parsed.row) || {} }, ledger: saved ? g.ledgerText : parsed.ledger?.text || '' }); }
    const prevL = p.ledger?.history?.length > 1 ? parseLedger(p.ledger.history[p.ledger.history.length - 2].text) : (!saved && p.ledger?.current ? parseLedger(p.ledger.current.text) : null);
    const out = h('div', { class: 'review3' });
    if (!saved && g.truncated) {
      out.append(h('div', { class: 'err' }, h('b', null, 'Het gate-antwoord is afgekapt (token-limiet). '), 'Laat het model doorgaan voordat je opslaat. ', h('button', { class: 'btn sm outline', onclick: async (e) => {
        e.currentTarget.disabled = true; const msg = threadOf(modId, 'main').find((m) => m.id === g.msgId);
        await continueMessage(modId, gateStep(modId), msg, { onUpdate: () => {} }); await reparseGate(modId); vals.__rev = null; rerender();
      } }, 'Doorgaan waar het stopte')));
    }
    const checks = saved ? g.checks : parsed.checks;
    out.append(h('div', { class: 'card' }, h('h4', null, '(1) Menselijke checks — aangetoond, ontbrekend of aan jou om te bevestigen'), checks?.length ? h('ul', { style: { margin: 0, paddingLeft: '1.1em' } }, checks.map((c) => h('li', { class: 'small' }, (() => { const s = h('span'); s.innerHTML = c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\b(shown)\b/gi, '<span class="chip green">$1</span>').replace(/\b(missing)\b/gi, '<span class="chip red">$1</span>').replace(/\b(mine to confirm)\b/gi, '<span class="chip amber">$1</span>'); return s; })()))) : h('div', { class: 'muted small' }, 'Niet herkend in het antwoord — zie het ruwe antwoord hieronder.')));
    const keys = ['stage', 'module', 'trigger', 'input', 'skill', 'humanCheck', 'output'];
    const labels = ['Stage', 'Module', 'Trigger (when I will run this)', 'Input', 'Workflow Skill', 'Human check', 'Output'];
    out.append(h('div', { class: 'card' }, h('h4', null, '(2) Mijn workflow-rij → komt in je workflow-map'), parsed.row || saved ? h('div', { class: 'grid g2' }, keys.map((k, i) => h('div', null, h('label', { class: 'f' }, labels[i]), (() => { const ta = h('textarea', { rows: 2, disabled: saved, onchange: (e) => { edit.row[k] = e.target.value; } }); ta.value = edit.row[k] || ''; autoGrow(ta); return ta; })()))) : h('div', { class: 'callout amber' }, 'De workflow-rij is niet herkend. Je kunt hem handmatig invullen na opslaan via de pagina "Mijn pagina", of het gate opnieuw draaien.')));
    const L = edit.ledger ? parseLedger(edit.ledger) : null;
    const ledCard = h('div', { class: 'card' }, h('h4', null, '(3) Bijgewerkte Pursuit Ledger — controleer vooral velden 1–3 (vast blok)'));
    if (L && !saved) {
      ledCard.append(h('div', { class: 'lfields' }, LEDGER_FIELDS.map((f) => { const changed = prevL && (prevL.fields[f.n] || '') !== (L.fields[f.n] || ''); return h('div', { class: 'lfield' + (f.n <= 3 ? ' fixed' : '') }, h('h4', null, h('span', { class: 'num' }, f.n), f.name, !prevL ? h('span', { class: 'chip purple' }, 'nieuw') : changed ? h('span', { class: 'chip amber' }, 'gewijzigd') : h('span', { class: 'chip' }, 'ongewijzigd')), (() => { const d = h('div', { class: 'md' }); mountMarkdown(d, L.fields[f.n] || '—'); return d; })()); })));
    }
    if (!saved) {
      const ta = h('textarea', { rows: 12, class: 'mono' }); ta.value = edit.ledger; autoGrow(ta); ta.addEventListener('change', () => { edit.ledger = ta.value; rerender(); });
      ledCard.append(h('details', { style: { marginTop: '10px' }, open: !L }, h('summary', { style: { cursor: 'pointer', color: 'var(--purple)', fontWeight: 600 } }, L ? 'Ledger-tekst bewerken' : 'Ledger niet herkend — controleer en pas de tekst handmatig aan'), ta, h('div', { class: 'help' }, 'Dit is de tekst die vanaf nu onder elke skill wordt meegestuurd.')));
      if (!L || !L.complete) ledCard.append(h('div', { class: 'callout amber', style: { marginTop: '10px' } }, h('b', null, 'Let op'), L ? `Er zijn ${Object.keys(L.fields).length} van 8 velden herkend.` : 'De acht velden zijn niet herkend.', ' Controleer de tekst voordat je opslaat, of draai het gate opnieuw.'));
    } else { const d = h('div', { class: 'md' }); mountMarkdown(d, g.ledgerText || '—'); ledCard.append(d); }
    out.append(ledCard);
    if (!saved) {
      out.append(h('div', { class: 'row' }, h('button', { class: 'btn primary lg', onclick: async () => { if (!edit.ledger.trim()) { toast('Er is geen Ledger om op te slaan.', 'error'); return; } await saveGate(modId, { checks: parsed.checks, row: edit.row, ledgerText: edit.ledger }); vals.__rev = null; vals.__gate = null; toast('Gate opgeslagen — Ledger en map bijgewerkt', 'ok'); rerender(); } }, icon('check', 18), 'Bevestigen en opslaan'),
        h('button', { class: 'btn ghost', onclick: async () => { await patch([{ op: 'set', path: ['modules', modId, 'gate'], value: null }]); rerender(); } }, 'Verwerpen en opnieuw uitvoeren'),
        h('details', null, h('summary', { style: { cursor: 'pointer', color: 'var(--purple)', fontWeight: 600 } }, 'Ruw antwoord'), h('pre', { class: 'code small' }, g.raw))));
    }
    return out;
  }

  // ------------------------------------------------------------------------------------------
  function aside() {
    const route = p.meta.route || 'tender';
    const nt = mod.notATender;
    const side = h('div', { class: 'aside' });
    side.append(h('div', { class: 'card' }, h('h4', null, 'Zo werkt het (uit de gids)'), h('ol', { style: { margin: 0, paddingLeft: '1.2em' } }, mod.steps.map((s) => h('li', { class: 'small', style: { marginBottom: '6px' } }, s.do.length > 190 ? s.do.slice(0, 187) + '…' : s.do, ' ', h('span', { class: 'xs muted' }, `(${s.min} min · ${s.paste})`))))));
    side.append(h('div', { class: 'card' }, h('h4', null, 'Zo ziet goed eruit'), h('ul', null, mod.good.map((g) => h('li', null, g)))));
    if (mod.stuck?.length) side.append(h('div', { class: 'card' }, h('h4', null, 'Loop je vast?'), h('ul', null, mod.stuck.map((g) => h('li', null, g)))));
    if (nt) side.append(h('details', { class: 'card', open: route !== 'tender' }, h('summary', { style: { cursor: 'pointer', fontWeight: 700, color: 'var(--purple)', fontSize: '.8rem', letterSpacing: '.08em', textTransform: 'uppercase' } }, route !== 'tender' ? `Jouw route: ${ROUTES[route]}` : 'Geen tender?'), h('p', { class: 'small', style: { marginTop: '8px' } }, nt)));
    side.append(h('div', { class: 'card' }, h('h4', null, 'Je neemt mee'), h('p', { class: 'small', style: { margin: 0 } }, mod.leaveWith)));
    side.append(h('div', { class: 'card never' }, h('h4', { style: { color: 'var(--red)' } }, 'Verandert nooit'), h('ul', null, h('li', null, 'Het model rekent geen cijfer uit dat je niet gaf, beslist niet over bid, prijs of juridisch, en beoordeelt geen persoon met naam.'), h('li', null, 'Elke simulatie is "rehearsed — not validated".'), h('li', null, 'Een besluit heeft per voorwaarde een eigenaar en een datum.'))));
    const extra = (mod.appendixB || []).filter((x) => x.title && x.body && !/YOUR TOOL|TABLE PASTES|NO PRIVATE|CANNOT ATTACH|BUILDING YOUR WORKSPACE|NO CASE WORKSPACE|NO CASE PACK/.test(x.title));
    if (extra.length) side.append(h('details', { class: 'card' }, h('summary', { style: { cursor: 'pointer', fontWeight: 700, color: 'var(--purple)', fontSize: '.8rem', letterSpacing: '.08em', textTransform: 'uppercase' } }, 'Meer hulp (Appendix B)'), extra.map((x) => h('div', { style: { marginTop: '10px' } }, h('div', { class: 'xs', style: { fontWeight: 700, letterSpacing: '.06em' } }, x.title), h('div', { class: 'small' }, x.body)))));
    return side;
  }

  function build() {
    if (openIdx === null) openIdx = firstOpen();
    return h('div', null, header(), h('div', { class: 'mod-layout' }, h('div', null, ...flow.steps.map(stepCard), myPage(), gatePanel()), aside()));
  }
  root.append(build());
  return root;
}
