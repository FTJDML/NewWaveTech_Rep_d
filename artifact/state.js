// Artifact build of the client state. Same exports as public/js/state.js, but everything runs in the browser:
// storage = db capability (sharded documents) or memory, AI = sample capability, files = downloads capability.
import { applyOps } from '../public/js/ops.js';
import { toast, hooks } from '../public/js/ui.js';
import { utf8Bytes } from '../public/js/engine.js';
import { P, initPlatform, nameFor } from './platform.js';
import { childShards, coreOf, assemble, summaryOf, SUBS } from './shards.js';
import { extractFile as extract } from './extract.js';
import { buildDocxBlob } from './docx.js';
import SKILLS from '../public/data/skills.json';
import DEMO from '../public/data/demo-velmora.json';

export const platform = { kind: 'artifact' };
export const S = { config: null, me: null, list: [], p: null, user: null, listeners: new Set(), saving: 0, saveError: null };
export const onChange = (fn) => { S.listeners.add(fn); return () => S.listeners.delete(fn); };
const emit = (what) => S.listeners.forEach((f) => { try { f(what); } catch (e) { console.error(e); } });

const lsGet = (k, d = '') => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
export const userName = () => lsGet('pn.user');
export const setUserName = (n) => lsSet('pn.user', n);
export const flush = () => Promise.all([...docs.values()].map((e) => e.flushing || Promise.resolve()));
export const api = async () => { throw new Error('Geen server in het artifact'); };

const rid = (n = 5) => { const a = new Uint8Array(n); (crypto || window.crypto).getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); };

// ---------------------------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------------------------
export async function loadConfig() {
  if (!P.ready) await initPlatform();
  const tier = lsGet('pn.tier', 'default');
  S.config = {
    platform: 'artifact', provider: 'artifact', model: 'Claude', hasKey: !!P.sample, locked: true, version: '1.0 (artifact)',
    maxPromptBytes: P.maxPromptBytes, storage: P.db ? 'db' : 'memory', canWrite: P.canWrite, modelTier: ['quick', 'default', 'complex'].includes(tier) ? tier : 'default',
  };
  S.config.brand = await loadBrand();
  const nm = (P.me && P.me.name) || '';
  S.me = { name: nm || 'Gebruiker', source: 'artifact', id: P.me?.id || null };
  emit('config');
  return S.config;
}
async function loadBrand() { // organisation wordmark in the header: empty by default, set by the team in Settings
  if (P.db) { try { const d = await P.db.doc('config/brand').get(); if (d.exists) return String(d.data().text || ''); } catch { /* fall through */ } }
  return lsGet('pn.brand', '');
}
export async function setBrand(text) {
  const t = String(text || '').slice(0, 24);
  lsSet('pn.brand', t);
  if (S.config) S.config.brand = t;
  if (P.db) { try { await P.db.doc('config/brand').set({ text: t }); } catch (e) { toast('Merknaam bewaren mislukt: ' + (e.message || e.code), 'error'); } }
  emit('config');
}
export function setModelTier(t) { lsSet('pn.tier', t); if (S.config) S.config.modelTier = t; emit('config'); }

// ---------------------------------------------------------------------------------------------
// pursuits: in-memory documents, persisted as shards
// ---------------------------------------------------------------------------------------------
const docs = new Map(); // id → { doc, last:Map(path→json), coreSig, timer, flushing, dirty }
const mem = new Map();  // fallback when the db capability is not available
let unsubList = null, listReady = null;

const j = (o) => JSON.stringify(o);
const sig = (core) => j({ ...core, rev: 0, updatedAt: 0 });

function entryFor(doc) {
  let e = docs.get(doc.id);
  if (!e) { e = { doc, last: new Map(), coreSig: '', timer: null, flushing: null, dirty: false }; docs.set(doc.id, e); }
  e.doc = doc;
  return e;
}
function remember(e) { // what the database holds now == what we would write now
  e.last = new Map(childShards(e.doc).map((s) => [s.path, j(s.data)]));
  e.coreSig = sig(coreOf(e.doc));
}

function schedule(id, delay = 700) {
  const e = docs.get(id); if (!e || !P.db) return;
  e.dirty = true; clearTimeout(e.timer);
  e.timer = setTimeout(() => { e.flushing = (e.flushing || Promise.resolve()).then(() => doFlush(e)).catch((err) => console.error(err)); }, delay);
}

async function pool(tasks, n = 4) {
  let i = 0;
  const run = async () => { while (i < tasks.length) { const t = tasks[i++]; await t(); } };
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, run));
}

async function doFlush(e) {
  if (!e.dirty || !P.db) return;
  e.dirty = false;
  const db = P.db, p = e.doc;
  const kids = childShards(p);
  const cur = new Map(kids.map((s) => [s.path, s]));
  const tasks = [];
  const writes = [];
  for (const [path, s] of cur) { const str = j(s.data); if (e.last.get(path) !== str) { writes.push([path, str]); tasks.push(() => db.doc(path).set(s.data)); } }
  const gone = [...e.last.keys()].filter((path) => !cur.has(path));
  for (const path of gone) tasks.push(() => db.doc(path).delete());
  const core0 = coreOf(p);
  const changedCore = sig(core0) !== e.coreSig;
  if (!tasks.length && !changedCore) return;
  p.rev = (p.rev || 0) + 1; p.updatedAt = new Date().toISOString();
  S.saving++;
  try {
    await pool(tasks, 4);
    await db.doc(`pursuits/${p.id}`).set({ ...coreOf(p), ownerId: p.ownerId || null });
    for (const [path, str] of writes) e.last.set(path, str);
    for (const path of gone) e.last.delete(path);
    e.coreSig = sig(coreOf(p));
    S.saveError = null;
  } catch (err) {
    e.dirty = true; S.saveError = err.message || String(err);
    const msg = err.code === 'quota_exceeded' ? 'De opslag van dit artifact is vol: verwijder oude pursuits of exporteer een back-up.' : err.code === 'invalid_argument' && P.canWrite === false ? 'Je hebt geen schrijfrechten in dit artifact: wijzigingen worden niet bewaard.' : 'Opslaan mislukt: ' + (err.message || err.code);
    toast(msg, 'error', 8000);
  } finally { S.saving--; emit('saved'); }
}

async function readColl(path) {
  const snap = await P.db.collection(path).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function loadPursuit(id) {
  if (!P.db) { const m = mem.get(id); if (!m) throw new Error('Pursuit niet gevonden'); return m; }
  const coreSnap = await P.db.doc(`pursuits/${id}`).get();
  if (!coreSnap.exists) throw new Error('Pursuit niet gevonden (verwijderd, of je hebt er geen toegang toe)');
  const core = coreSnap.data();
  const parts = await Promise.all(SUBS.map((s) => readColl(`pursuits/${id}/${s}`)));
  const c = {}; SUBS.forEach((s, i) => { c[s] = parts[i]; });
  const p = assemble({ id, ...core }, c);
  const names = await nameFor([p.ownerId]); p.owner = names[p.ownerId] || '';
  return p;
}

export async function openPursuit(id) {
  if (S.p && S.p.id === id) return S.p;
  let e = docs.get(id);
  if (!e) { const p = await loadPursuit(id); e = entryFor(p); remember(e); }
  S.p = e.doc;
  emit('pursuit');
  return S.p;
}
export function closePursuit() { S.p = null; }

export function patch(ops, { silent, pid } = {}) {
  const e = docs.get(pid || S.p?.id);
  if (!e) return Promise.resolve();
  applyOps(e.doc, ops);
  e.doc.updatedAt = new Date().toISOString();
  if (!P.db) mem.set(e.doc.id, e.doc);
  schedule(e.doc.id);
  if (!silent && S.p && S.p.id === e.doc.id) emit('patched');
  return Promise.resolve();
}

export async function createPursuit(doc) {
  const id = 'p' + rid(5);
  const now = new Date().toISOString();
  const d = Object.assign({ meta: {}, sources: [], casepack: { docs: {} }, ledger: { current: null, history: [] }, evidence: [], decisions: [], modules: {}, artefacts: [] }, doc || {}, { id, rev: 1, createdAt: now, updatedAt: now, ownerId: P.me?.id || null, owner: P.me?.name || '' });
  const e = entryFor(d);
  if (P.db) { e.dirty = true; e.flushing = doFlush(e); await e.flushing; } else mem.set(id, d);
  S.p = null;
  await loadList();
  return d;
}

export async function removePursuit(id) {
  const e = docs.get(id);
  if (P.db) {
    const paths = e ? [...e.last.keys()] : [];
    if (!e) { const p = await loadPursuit(id); for (const s of childShards(p)) paths.push(s.path); }
    clearTimeout(e?.timer); if (e) e.dirty = false;
    await pool(paths.map((path) => () => P.db.doc(path).delete()), 4);
    await P.db.doc(`pursuits/${id}`).delete();
  } else mem.delete(id);
  docs.delete(id);
  S.list = S.list.filter((x) => x.id !== id);
  if (S.p?.id === id) S.p = null;
}

// list + live changes of teammates (one subscription on the small core documents)
const toSummary = (d) => ({ id: d.id, rev: d.rev, createdAt: d.createdAt, updatedAt: d.updatedAt, ownerId: d.ownerId, owner: '', meta: d.meta, ...(d.summary || {}) });
function startList() {
  if (unsubList || !P.db) return;
  let first = true;
  listReady = new Promise((resolve) => {
    const timer = setTimeout(resolve, 8000);
    unsubList = P.db.collection('pursuits').onSnapshot(async (snap) => {
      const cores = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => c && c.meta && c.id);
      const list = cores.map(toSummary);
      const names = await nameFor(list.map((x) => x.ownerId));
      list.forEach((x) => { x.owner = names[x.ownerId] || ''; });
      S.list = list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      if (first) { first = false; clearTimeout(timer); resolve(); }
      emit('list');
      // a teammate changed the pursuit that is open here → reload it
      const open = S.p && cores.find((c) => c.id === S.p.id);
      const e = open && docs.get(open.id);
      if (open && e && open.rev > (e.doc.rev || 0) && !e.dirty && !e.flushing && !S.saving) {
        try { const fresh = await loadPursuit(open.id); e.doc = fresh; entryFor(fresh); remember(e); S.p = fresh; emit('remote'); } catch { /* ignore */ }
      }
    }, () => { clearTimeout(timer); resolve(); });
  });
}
export async function loadList() {
  if (P.db) { startList(); await listReady; }
  else S.list = [...mem.values()].map((d) => ({ id: d.id, rev: d.rev, createdAt: d.createdAt, updatedAt: d.updatedAt, owner: d.owner, meta: d.meta, ...summaryOf(d) })).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  emit('list');
  return S.list;
}

// ---------------------------------------------------------------------------------------------
// personal workflow (hours, first use): private subtree of this viewer
// ---------------------------------------------------------------------------------------------
const profilePath = () => (P.me?.id ? `data/users/${P.me.id}/profile` : null);
export async function loadUser() {
  let data = null;
  if (P.db && profilePath()) { try { const s = await P.db.doc(profilePath()).get(); data = s.exists ? s.data() : null; } catch { /* fall back */ } }
  if (!data) { try { data = JSON.parse(lsGet('pn.profile', 'null')); } catch { data = null; } }
  S.user = { name: S.me?.name, hours: {}, firstUse: {}, ...(data || {}) };
  return S.user;
}
let userTimer = null;
export async function saveUser(patchData) {
  S.user = { ...S.user, ...patchData };
  const { hours, firstUse } = S.user;
  lsSet('pn.profile', j({ hours, firstUse }));
  if (P.db && profilePath()) {
    clearTimeout(userTimer);
    await new Promise((resolve) => { userTimer = setTimeout(async () => { try { await P.db.doc(profilePath()).set({ hours: hours || {}, firstUse: firstUse || {} }); } catch (e) { toast('Je persoonlijke werkwijze kon niet worden bewaard: ' + (e.message || e.code), 'error'); } resolve(); }, 300); });
  }
  emit('user');
  return S.user;
}

// ---------------------------------------------------------------------------------------------
// team-wide prompt overrides (official M10–M14 prompts)
// ---------------------------------------------------------------------------------------------
export async function loadPrompts() {
  if (P.db) { try { const s = await P.db.doc('config/prompts').get(); if (s.exists) return s.data().overrides || {}; return {}; } catch { /* fall through */ } }
  try { return JSON.parse(lsGet('pn.prompts', '{}')); } catch { return {}; }
}
export async function savePrompts(o) {
  const clean = {};
  for (const [k, v] of Object.entries(o || {})) if (/^(M\d+:P\d|GATE)$/.test(k) && v && typeof v.text === 'string') clean[k] = { text: v.text, at: v.at || new Date().toISOString(), by: String(v.by || '').slice(0, 80) };
  if (P.db) await P.db.doc('config/prompts').set({ overrides: clean });
  else lsSet('pn.prompts', j(clean));
  return clean;
}

// ---------------------------------------------------------------------------------------------
// data files, extraction, export, preview, download
// ---------------------------------------------------------------------------------------------
export async function getData(name) { return name === 'skills' ? SKILLS : DEMO; }
export const extractFile = extract;
export async function exportDocx(payload) { return buildDocxBlob(payload); }
export async function previewUrl() { return null; } // artifact: the iframe uses srcdoc inside the sandboxed frame

export async function saveFile(name, data, mime) {
  const dl = P.downloads;
  if (!dl) { toast('Downloaden is in deze weergave niet beschikbaar.', 'error'); return; }
  try { await dl.save({ filename: name, data: typeof data === 'string' || data instanceof Blob ? data : new Blob([data], { type: mime }) }); toast('Bestand aangeboden om op te slaan', 'ok', 2500); }
  catch (e) { if (e && e.code !== 'declined') toast('Opslaan mislukt: ' + (e.message || e.code), 'error'); }
}
hooks.save = (name, data, mime) => saveFile(name, data, mime);

export async function backupDownload() {
  const all = [];
  for (const s of S.list) { const e = docs.get(s.id); all.push(e ? e.doc : await loadPursuit(s.id)); }
  if (!P.db) for (const d of mem.values()) if (!all.includes(d)) all.push(d);
  const clean = all.map((d) => { const { owner, ...rest } = d; return rest; });
  await saveFile('pursuit-navigator-backup.json', JSON.stringify({ version: 'artifact-1', exportedAt: new Date().toISOString(), pursuits: clean }), 'application/json');
}
export async function backupRestore(obj) {
  let n = 0;
  for (const d of obj.pursuits || []) {
    if (!d || !d.id) continue;
    const id = /^[a-z0-9]+$/i.test(d.id) ? d.id : 'p' + rid(5); // ids from the server build contain an underscore
    const doc = { ...d, id, ownerId: d.ownerId || P.me?.id || null };
    const e = entryFor(doc); e.dirty = true;
    if (P.db) { e.flushing = (e.flushing || Promise.resolve()).then(() => doFlush(e)); await e.flushing; } else mem.set(id, doc);
    n++;
  }
  await loadList();
  return { imported: n };
}
export async function saveConfig() { /* nothing to configure: the model runs through the viewer's Claude account */ }

// ---------------------------------------------------------------------------------------------
// AI: the sample capability (Claude on the viewer's own account)
// ---------------------------------------------------------------------------------------------
const CODE_MSG = {
  not_granted: 'Claude is voor dit artifact niet toegestaan. Sta het toe wanneer het scherm erom vraagt (of bij de rechten van het artifact) en probeer opnieuw.',
  sampling_disabled: 'Claude is voor dit account of deze organisatie niet beschikbaar.',
  rate_limited: 'Je gebruikslimiet bij Claude is bereikt, of er lopen te veel aanroepen tegelijk. Probeer het over enkele minuten opnieuw.',
  prompt_too_large: 'Te veel tekst voor één Claude-aanroep (maximaal 256 KiB). Zet bronnen uit (Bronnen → meenemen) of kies "Alleen Case Pack".',
  session_expired: 'Je sessie is verlopen: ververs de pagina en log opnieuw in.',
  refused: 'Claude wilde dit verzoek niet uitvoeren. Pas de invoer aan en probeer opnieuw.',
  empty_completion: 'Claude gaf geen antwoord. Probeer het opnieuw of vraag om minder tegelijk.',
  upstream_error: 'Tijdelijke fout bij Claude. Probeer het opnieuw.',
};
function sampleError(e) {
  const err = new Error((e && CODE_MSG[e.code]) || (e && e.message) || 'Onbekende fout bij Claude');
  err.code = e?.code; err.partial = e?.text;
  return err;
}

export async function streamAI({ system, messages, onDelta, signal }) {
  const sample = P.sample;
  if (!sample) throw new Error('Claude is in deze weergave niet beschikbaar.');
  const turns = [];
  if (system) turns.push({ role: 'user', content: system });
  for (const m of messages) turns.push({ role: m.role, content: m.content });
  const bytes = turns.reduce((a, t) => a + utf8Bytes(t.content), 0);
  if (bytes > P.maxPromptBytes + 4096) throw sampleError({ code: 'prompt_too_large' });
  try {
    const r = await sample(turns, { modelTier: S.config?.modelTier || 'default', cache: false, signal, onText: ({ text, delta }) => { onDelta && onDelta(text, delta); } });
    return { text: r.text, usage: { input: Math.round(bytes / 4), output: Math.round(r.text.length / 4), model: r.modelTierApplied || 'Claude', truncated: !!r.truncated } };
  } catch (e) { throw sampleError(e); }
}

export async function testConnection() {
  const t0 = Date.now();
  try {
    const r = await P.sample('Reply with the single word: OK', { modelTier: 'quick', cache: false });
    return { ok: true, reply: r.text.trim().slice(0, 40), ms: Date.now() - t0 };
  } catch (e) { return { ok: false, error: sampleError(e).message }; }
}
