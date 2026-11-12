// Client state: config, current pursuit (optimistic ops synced to the server), personal workflow, AI streaming.
import { applyOps } from './ops.js';
import { toast } from './ui.js';

export const S = { config: null, me: null, list: [], p: null, user: null, listeners: new Set(), saving: 0, saveError: null };
export const onChange = (fn) => { S.listeners.add(fn); return () => S.listeners.delete(fn); };
const emit = (what) => S.listeners.forEach((f) => { try { f(what); } catch (e) { console.error(e); } });

export function userName() { try { return localStorage.getItem('pn.user') || ''; } catch { return ''; } }
export function setUserName(n) { try { localStorage.setItem('pn.user', n); } catch { /* ignore */ } }

export async function api(path, { method = 'GET', body, raw, headers = {} } = {}) {
  const h = { ...headers };
  const un = userName(); if (un) h['x-user-name'] = encodeURIComponent(un);
  let payload;
  if (raw !== undefined) payload = raw; else if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch('/api' + path, { method, headers: h, body: payload });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res;
}

export async function loadConfig() { S.config = await api('/config'); S.me = S.config.me; emit('config'); return S.config; }
export async function loadList() { S.list = await api('/pursuits'); emit('list'); return S.list; }
export async function loadUser() { S.user = await api('/me/workflow'); return S.user; }
export async function saveUser(patch) { S.user = await api('/me/workflow', { method: 'PUT', body: patch }); emit('user'); return S.user; }

let poll = null;
export async function openPursuit(id) {
  if (S.p && S.p.id === id) return S.p;
  stopPoll();
  S.p = await api('/pursuits/' + id);
  startPoll();
  emit('pursuit');
  return S.p;
}
export function closePursuit() { stopPoll(); S.p = null; }
function startPoll() {
  poll = setInterval(async () => {
    if (!S.p || S.saving || document.hidden) return;
    try {
      const r = await api('/pursuits/' + S.p.id + '/rev');
      if (r.rev > S.p.rev && !S.saving) { S.p = await api('/pursuits/' + S.p.id); emit('remote'); }
    } catch { /* offline: ignore */ }
  }, 9000);
}
function stopPoll() { if (poll) clearInterval(poll); poll = null; }

let queue = Promise.resolve();
/** Apply ops locally right away, persist in order on the server. */
export function patch(ops, { silent, pid } = {}) {
  const p = S.p;
  if (pid && (!p || p.id !== pid)) { // the user navigated to another pursuit while an AI call was running: write straight to the server
    return api('/pursuits/' + pid, { method: 'PATCH', body: { ops } }).catch((e) => toast('Opslaan mislukt: ' + e.message, 'error', 6000));
  }
  if (!p) return Promise.resolve();
  applyOps(p, ops);
  p.updatedAt = new Date().toISOString();
  S.saving++;
  const id = p.id;
  queue = queue.then(async () => {
    try {
      const r = await api('/pursuits/' + id, { method: 'PATCH', body: { ops } });
      if (S.p && S.p.id === id) { S.p.rev = r.rev; }
      S.saveError = null;
    } catch (e) {
      S.saveError = e.message; toast('Opslaan mislukt: ' + e.message, 'error', 6000);
    } finally { S.saving--; emit('saved'); }
  });
  if (!silent) emit('patched');
  return queue;
}
export const flush = () => queue;

export async function createPursuit(doc) {
  const d = await api('/pursuits', { method: 'POST', body: doc });
  S.p = null; await loadList();
  return d;
}

/** Stream an AI call. Returns { text, usage }. Throws on error. */
export async function streamAI({ system, messages, maxTokens, onDelta, signal }) {
  const h = { 'content-type': 'application/json' };
  const un = userName(); if (un) h['x-user-name'] = encodeURIComponent(un);
  const res = await fetch('/api/ai/stream', { method: 'POST', headers: h, body: JSON.stringify({ system, messages, maxTokens }), signal });
  if (!res.ok) { let m = res.statusText; try { m = (await res.json()).error || m; } catch { /* ignore */ } throw new Error(m); }
  const reader = res.body.getReader(); const dec = new TextDecoder();
  let buf = '', text = '', usage = null, err = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const raw = buf.slice(0, i); buf = buf.slice(i + 2);
      let ev = 'message'; let data = '';
      for (const line of raw.split('\n')) { if (line.startsWith('event:')) ev = line.slice(6).trim(); else if (line.startsWith('data:')) data += line.slice(5).trim(); }
      if (!data) continue;
      let j; try { j = JSON.parse(data); } catch { continue; }
      if (ev === 'delta') { text += j.t; onDelta && onDelta(text, j.t); }
      else if (ev === 'usage') usage = j;
      else if (ev === 'error') err = j.message;
    }
  }
  if (err) throw Object.assign(new Error(err), { partial: text });
  return { text, usage };
}
