// A stand-in for the claude.ai artifact runtime (window.claude): db, sample, user, downloads — strict enough to catch the same
// mistakes the real one would (document size, path grammar, prompt size), backed by the demo AI (server/mock.js).
import { mockStream } from '../../server/mock.js';

const LS = '__fakedb';
const load = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } };
let store = load();
const persist = () => { try { localStorage.setItem(LS, JSON.stringify(store)); } catch { /* ignore */ } };
const subs = new Set();
const bytes = (o) => new TextEncoder().encode(JSON.stringify(o)).length;
const SEG = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const segs = (p) => { const s = String(p).split('/'); if (s.some((x) => !SEG.test(x) || x === '.' || x === '..') || s.join('/').length > 1000 || s.length > 16) throw new TypeError('bad path ' + p); return s; };
const err = (code, message) => Object.assign(new Error(message), { code, message });
window.__db = { get store() { return store; }, reset() { store = {}; persist(); }, writes: 0, notify };

function snapDoc(path) { const exists = Object.prototype.hasOwnProperty.call(store, path); const data = exists ? JSON.parse(JSON.stringify(store[path])) : undefined; return { id: path.split('/').pop(), exists, data: () => data, metadata: { fromCache: false, hasPendingWrites: false } }; }
function collDocs(path) { const n = path.split('/').length + 1; return Object.keys(store).filter((k) => k.startsWith(path + '/') && k.split('/').length === n).sort().map(snapDoc); }
function notify() { for (const s of [...subs]) s(); }

function docRef(path) {
  if (segs(path).length % 2) throw new TypeError('document path needs an even number of segments: ' + path);
  return {
    id: path.split('/').pop(), path,
    async get() { return snapDoc(path); },
    async set(data) { if (bytes(data) > 256 * 1024) throw err('invalid_argument', 'document over 256 KiB: ' + path); store[path] = JSON.parse(JSON.stringify(data)); window.__db.writes++; persist(); notify(); },
    async update(data) { if (!(path in store)) throw err('invalid_argument', 'no such document'); store[path] = { ...store[path], ...JSON.parse(JSON.stringify(data)) }; persist(); notify(); },
    async delete() { delete store[path]; window.__db.writes++; persist(); notify(); },
    onSnapshot(next) { let last = ''; const fire = () => { const s = snapDoc(path); const k = JSON.stringify(s.data()); if (k !== last) { last = k; next(s); } }; subs.add(fire); setTimeout(fire, 0); return () => subs.delete(fire); },
    collection(c) { return collRef(path + '/' + c); },
  };
}
function collRef(path) {
  if (segs(path).length % 2 === 0) throw new TypeError('collection path needs an odd number of segments: ' + path);
  const q = {
    path,
    async get() { const docs = collDocs(path); return { docs, size: docs.length, empty: !docs.length }; },
    doc(id) { return docRef(path + '/' + (id || 'a' + Math.random().toString(36).slice(2, 10))); },
    async add(data) { const r = q.doc(); await r.set(data); return r; },
    onSnapshot(next) { let last = ''; const fire = () => { const docs = collDocs(path); const k = JSON.stringify(docs.map((d) => d.data())); if (k !== last) { last = k; next({ docs, size: docs.length, empty: !docs.length, docChanges: () => [] }); } }; subs.add(fire); setTimeout(fire, 0); return () => subs.delete(fire); },
  };
  return q;
}
const db = { doc: docRef, collection: collRef };

// ---- sample (Claude) ----
const MAXP = 256 * 1024;
window.__sample = { calls: [], fail: null };
async function sample(input, opts = {}) {
  const turns = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
  if (!turns.length || turns[0].role !== 'user' || turns[turns.length - 1].role !== 'user') throw { code: 'invalid_request', message: 'turns must start and end with user' };
  const total = turns.reduce((a, t) => a + new TextEncoder().encode(t.content).length, 0);
  window.__sample.calls.push({ bytes: total, turns: turns.length, tier: opts.modelTier, cache: opts.cache });
  if (total > MAXP) throw { code: 'prompt_too_large', message: 'over 256 KiB' };
  if (window.__sample.fail) throw { code: window.__sample.fail, message: 'forced' };
  let text = '', truncated = false;
  const req = { system: '', messages: turns.map((t) => ({ role: t.role, content: t.content })) };
  try {
    await mockStream(req, { delta: (t) => { text += t; opts.onText && opts.onText({ text, delta: t }); }, usage: (u) => { truncated = !!u.truncated; } }, opts.signal);
  } catch (e) { if (opts.signal?.aborted) throw { code: 'cancelled', message: 'cancelled', text }; throw { code: 'upstream_error', message: String(e.message), text }; }
  return { text, truncated, modelTierApplied: opts.modelTier || 'default' };
}
sample.limits = async () => ({ maxPromptBytes: MAXP });
sample.json = async (i, o) => JSON.parse((await sample(i, o)).text);

window.__downloads = [];
const user = {
  isOwner: async () => true, canEdit: async () => true, can: async () => true,
  me: async () => ({ id: 'u_test1', name: 'Test Director', avatarUrl: '', color: '#5236AB', email: null, isOwner: true, canEdit: true }),
  id: async () => 'u_test1',
  profiles: async (ids) => Object.fromEntries([].concat(ids).map((id) => [id, { id, name: id === 'u_test1' ? 'Test Director' : 'Collega', avatarUrl: '', color: '#999', email: null, isMe: id === 'u_test1', guest: false }])),
};
const downloads = { save: async ({ filename, data }) => { const size = data instanceof Blob ? data.size : new TextEncoder().encode(String(data)).length; let head = ''; if (data instanceof Blob) head = String.fromCharCode(...new Uint8Array(await data.slice(0, 2).arrayBuffer())); window.__downloads.push({ filename, size, head }); return { status: 'saved' }; } };

const caps = { db, sample, user, downloads };
const params = new URLSearchParams(location.search);
window.claude = { use: async (name) => (params.get('nocaps') === name || (params.get('nocaps') === 'all') ? null : caps[name] || null) };
