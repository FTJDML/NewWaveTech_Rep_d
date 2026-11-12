// Client state: config, current pursuit (optimistic ops synced to the server), personal workflow, AI streaming.
import { applyOps } from './ops.js';
import { toast, downloadBlob, downloadText } from './ui.js';

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

// ---------------------------------------------------------------------------------------------
// Backend helpers. The server build implements them with fetch; the artifact build (artifact/state.js)
// replaces this whole module with an in-browser implementation of the same exports.
// ---------------------------------------------------------------------------------------------
export const platform = { kind: 'server' };
export async function getData(name) { return (await fetch(name === 'skills' ? '/data/skills.json' : '/data/demo-velmora.json')).json(); }
export async function loadPrompts() { try { return await (await fetch('/api/prompts')).json(); } catch { return {}; } }
export async function savePrompts(o) {
  const r = await fetch('/api/prompts', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) });
  if (!r.ok) throw new Error('Opslaan van prompts mislukt');
  return r.json();
}
export async function extractFile(file) {
  if (file.size > 40 * 1024 * 1024) throw new Error(`${file.name} is groter dan 40 MB`);
  const buf = await file.arrayBuffer();
  const un = userName();
  const res = await fetch('/api/extract', { method: 'POST', headers: { 'x-filename': encodeURIComponent(file.name), ...(un ? { 'x-user-name': encodeURIComponent(un) } : {}) }, body: buf });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || 'Lezen mislukt');
  return j;
}
export async function exportDocx(payload) { return (await api('/export/docx', { method: 'POST', body: payload })).blob(); }
/** URL of a sandboxed copy of an AI-written prototype, or null (the caller then uses srcdoc). */
export async function previewUrl(html) { return (await api('/preview', { method: 'POST', body: { html } })).url; }
export async function removePursuit(id) { await api('/pursuits/' + id, { method: 'DELETE' }); S.list = S.list.filter((x) => x.id !== id); }
export function saveFile(name, data, mime) { return data instanceof Blob ? downloadBlob(name, data) : downloadText(name, data, mime); }
export async function backupDownload() { const j = await api('/backup'); downloadText('pursuit-navigator-backup.json', JSON.stringify(j), 'application/json'); }
export async function backupRestore(obj) { return api('/backup', { method: 'POST', body: obj }); }
export async function saveConfig(f) { await api('/config', { method: 'PUT', body: f }); await loadConfig(); }
export async function testConnection() { return api('/config/test', { method: 'POST', body: {} }); }
export function setModelTier() { /* the server build picks the model in Settings → provider */ }
export function setBrand() { /* server build: branding is fixed in the page */ }
