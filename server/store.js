import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applyOps } from '../public/js/ops.js';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
const P_DIR = path.join(DATA_DIR, 'pursuits');
const U_DIR = path.join(DATA_DIR, 'users');
const T_DIR = path.join(DATA_DIR, 'trash');
for (const d of [DATA_DIR, P_DIR, U_DIR, T_DIR]) fs.mkdirSync(d, { recursive: true });

const ID_RE = /^[a-z0-9_-]{6,64}$/i;
export const newId = (prefix = 'p') => prefix + '_' + crypto.randomBytes(6).toString('hex');
export const validId = (id) => typeof id === 'string' && ID_RE.test(id);

function atomicWrite(file, data) {
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}
function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

// ---------- pursuits ----------
const cache = new Map();
const pFile = (id) => path.join(P_DIR, id + '.json');

export function getPursuit(id) {
  if (!validId(id)) return null;
  if (cache.has(id)) return cache.get(id);
  const doc = readJson(pFile(id));
  if (doc) cache.set(id, doc);
  return doc;
}

export function listPursuits() {
  const out = [];
  for (const f of fs.readdirSync(P_DIR)) {
    if (!f.endsWith('.json')) continue;
    const id = f.slice(0, -5);
    const d = getPursuit(id);
    if (d) out.push(summary(d));
  }
  return out.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

function summary(d) {
  const mods = d.modules || {};
  const done = Object.entries(mods).filter(([, m]) => m && m.status === 'done').map(([k]) => k);
  const doing = Object.entries(mods).filter(([, m]) => m && m.status === 'doing').map(([k]) => k);
  const conds = [];
  for (const dec of d.decisions || []) for (const c of dec.conditions || []) conds.push(c);
  return {
    id: d.id, rev: d.rev, createdAt: d.createdAt, updatedAt: d.updatedAt, owner: d.owner,
    meta: d.meta, done, doing,
    sources: (d.sources || []).length,
    casepack: !!(d.casepack && d.casepack.docs && Object.keys(d.casepack.docs).length),
    openConditions: conds.filter((c) => c.status === 'open').length,
    conditions: conds.filter((c) => c.status === 'open' && c.due).map((c) => ({ text: c.text, due: c.due, owner: c.owner })),
    ledgerModule: d.ledger && d.ledger.current ? d.ledger.current.module : null,
  };
}

export function createPursuit(doc, owner) {
  const id = newId('p');
  const now = new Date().toISOString();
  const d = Object.assign({
    id, rev: 1, createdAt: now, updatedAt: now, owner: owner || '',
    meta: {}, sources: [], casepack: { docs: {} }, ledger: { current: null, history: [] },
    evidence: [], decisions: [], modules: {}, artefacts: [],
  }, doc || {}, { id, rev: 1, createdAt: now, updatedAt: now, owner: owner || (doc && doc.owner) || '' });
  cache.set(id, d);
  atomicWrite(pFile(id), JSON.stringify(d));
  return d;
}

export function patchPursuit(id, ops, baseRev) {
  const d = getPursuit(id);
  if (!d) return { error: 'not_found' };
  // work on a clone so a failing op list never leaves half-applied state
  const clone = structuredClone(d);
  try { applyOps(clone, ops); } catch (e) { return { error: 'bad_ops', message: e.message }; }
  clone.rev = (d.rev || 0) + 1;
  clone.updatedAt = new Date().toISOString();
  cache.set(id, clone);
  atomicWrite(pFile(id), JSON.stringify(clone));
  return { rev: clone.rev, updatedAt: clone.updatedAt, conflict: baseRev != null && baseRev !== d.rev };
}

export function deletePursuit(id) {
  const d = getPursuit(id);
  if (!d) return false;
  atomicWrite(path.join(T_DIR, id + '-' + Date.now() + '.json'), JSON.stringify(d));
  fs.rmSync(pFile(id), { force: true });
  cache.delete(id);
  return true;
}

export function replaceAll(docs) { // used by backup import
  let n = 0;
  for (const d of docs) {
    if (!d || !validId(d.id)) continue;
    cache.set(d.id, d);
    atomicWrite(pFile(d.id), JSON.stringify(d));
    n++;
  }
  return n;
}
export function exportAll() { return listPursuits().map((s) => getPursuit(s.id)); }

// ---------- users (personal workflow: hours, first use) ----------
export const slug = (s) => String(s || 'anonymous').toLowerCase().replace(/[^a-z0-9@._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'anonymous';
export function getUser(name) {
  const f = path.join(U_DIR, slug(name) + '.json');
  return readJson(f, { name, hours: {}, firstUse: {} });
}
export function saveUser(name, data) {
  const f = path.join(U_DIR, slug(name) + '.json');
  const cur = getUser(name);
  const next = Object.assign({}, cur, data, { name });
  atomicWrite(f, JSON.stringify(next));
  return next;
}

// ---------- config ----------
const CFG_FILE = path.join(DATA_DIR, 'config.json');
export function loadFileConfig() { return readJson(CFG_FILE, {}); }
export function saveFileConfig(cfg) {
  atomicWrite(CFG_FILE, JSON.stringify(cfg, null, 2));
  try { fs.chmodSync(CFG_FILE, 0o600); } catch { /* ignore */ }
}

// ---------- shared prompt overrides ----------
const PO_FILE = path.join(DATA_DIR, 'prompt-overrides.json');
export const getPromptOverrides = () => readJson(PO_FILE, {});
export function savePromptOverrides(o) {
  const clean = {};
  for (const [k, v] of Object.entries(o || {})) if (/^(M\d+:P\d|GATE)$/.test(k) && v && typeof v.text === 'string') clean[k] = { text: v.text, at: v.at || new Date().toISOString(), by: String(v.by || '').slice(0, 80) };
  atomicWrite(PO_FILE, JSON.stringify(clean, null, 1));
}
