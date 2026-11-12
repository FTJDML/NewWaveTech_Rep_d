// A pursuit is one JSON document in memory. The db capability stores documents of at most 256 KiB, so a pursuit is
// stored as many small documents ("shards") under  pursuits/<id>/…  and put back together when it is opened.
const LIMIT = 225000; // bytes per document (platform limit: 256 KiB)
const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const sizeOf = (o) => { const s = JSON.stringify(o); return enc ? enc.encode(s).length : s.length; };
export const CHUNK = 55000; // characters per source chunk

/** Make a document fit: drop optional fields first, then shorten the biggest string field. */
function fit(o, bigKey, optional = []) {
  if (sizeOf(o) <= LIMIT) return o;
  const c = { ...o };
  for (const k of optional) if (c[k] !== undefined) { delete c[k]; if (sizeOf(c) <= LIMIT) return c; }
  if (typeof c[bigKey] === 'string') {
    const rest = sizeOf({ ...c, [bigKey]: '' });
    const ratio = Math.max(1, sizeOf(c[bigKey]) / Math.max(1, c[bigKey].length)); // bytes per character of this very text
    let keep = Math.max(1000, Math.floor((LIMIT - rest - 400) / ratio));
    c[bigKey] = c[bigKey].slice(0, keep) + '\n[… ingekort bij opslaan: te groot voor één opslag-document]';
    c.cut = true;
    while (sizeOf(c) > LIMIT && keep > 1000) { keep = Math.floor(keep * 0.8); c[bigKey] = c[bigKey].slice(0, keep) + '\n[… ingekort bij opslaan]'; }
  }
  return c;
}

export function summaryOf(p) {
  const mods = p.modules || {};
  const done = Object.entries(mods).filter(([, m]) => m && m.status === 'done').map(([k]) => k);
  const doing = Object.entries(mods).filter(([, m]) => m && m.status === 'doing').map(([k]) => k);
  const conds = [];
  for (const dec of p.decisions || []) for (const c of dec.conditions || []) conds.push(c);
  return {
    done, doing, sources: (p.sources || []).length,
    casepack: !!(p.casepack && p.casepack.docs && Object.values(p.casepack.docs).some((d) => d && d.text)),
    openConditions: conds.filter((c) => c.status === 'open').length,
    conditions: conds.filter((c) => c.status === 'open' && c.due).slice(0, 12).map((c) => ({ text: c.text, due: c.due, owner: c.owner })),
    ledgerModule: p.ledger?.current ? p.ledger.current.module : null,
  };
}

const slimMsg = (m) => { const { values, ...rest } = m; return rest; };

/** → [{ path, data }] children first (no core). */
export function childShards(p) {
  const root = `pursuits/${p.id}`;
  const out = [];
  for (const [mid, m] of Object.entries(p.modules || {})) {
    if (!m) continue;
    out.push({ path: `${root}/mod/${mid}`, data: { id: mid, status: m.status || 'todo', startedAt: m.startedAt || null, doneAt: m.doneAt || null, page: m.page || {}, checks: m.checks || {} } });
    for (const [k, v] of Object.entries(m.data || {})) out.push({ path: `${root}/mdata/${mid}~${k}`, data: fit({ mid, key: k, value: typeof v === 'string' ? v : v ?? null }, 'value') });
    if (m.gate) out.push({ path: `${root}/gate/${mid}`, data: fit({ id: mid, gate: m.gate }, 'x', ['gate']) });
    for (const [tn, arr] of Object.entries(m.threads || {})) arr.forEach((msg, i) => out.push({ path: `${root}/msg/${msg.id}`, data: fit({ ...slimMsg(msg), mod: mid, thread: tn, ord: i }, 'content') }));
  }
  for (const s of p.sources || []) {
    const text = s.text || '';
    const parts = Math.max(1, Math.ceil(text.length / CHUNK));
    const { text: _t, ...meta } = s;
    out.push({ path: `${root}/src/${s.id}`, data: { ...meta, parts, text: text.slice(0, CHUNK) } });
    for (let k = 1; k < parts; k++) out.push({ path: `${root}/src/${s.id}~${k + 1}`, data: { sid: s.id, k: k + 1, text: text.slice(k * CHUNK, (k + 1) * CHUNK) } });
  }
  for (const [key, d] of Object.entries(p.casepack?.docs || {})) if (d) out.push({ path: `${root}/cp/${key}`, data: fit({ key, ...d }, 'text', ['prev']) });
  (p.ledger?.history || []).forEach((h, i) => out.push({ path: `${root}/lh/${String(i + 1).padStart(4, '0')}`, data: fit({ n: i + 1, ...h }, 'text') }));
  for (const a of p.artefacts || []) out.push({ path: `${root}/art/${a.id}`, data: fit({ ...a }, 'content') });
  return out;
}

export function coreOf(p) {
  return {
    id: p.id, rev: p.rev || 1, createdAt: p.createdAt, updatedAt: p.updatedAt, ownerId: p.ownerId || null,
    meta: p.meta || {}, decisions: p.decisions || [], evidence: p.evidence || [],
    ledger: { current: p.ledger?.current ? fit({ ...p.ledger.current }, 'text') : null },
    cp: { builtAt: p.casepack?.builtAt || null },
    summary: summaryOf(p),
  };
}

/** Put a pursuit back together from its core document and the contents of its sub-collections (arrays of {id, ...data}). */
export function assemble(core, c) {
  const p = {
    id: core.id, rev: core.rev || 1, createdAt: core.createdAt, updatedAt: core.updatedAt, ownerId: core.ownerId || null, owner: '',
    meta: core.meta || {}, decisions: core.decisions || [], evidence: core.evidence || [],
    ledger: { current: core.ledger?.current || null, history: [] }, casepack: { docs: {}, builtAt: core.cp?.builtAt || undefined },
    sources: [], modules: {}, artefacts: [],
  };
  const chunks = {};
  for (const d of c.src || []) { if (d.sid) (chunks[d.sid] = chunks[d.sid] || []).push(d); }
  for (const d of (c.src || []).filter((x) => !x.sid)) {
    const rest = (chunks[d.id] || []).sort((a, b) => a.k - b.k).map((x) => x.text).join('');
    const { parts, id, ...meta } = d;
    p.sources.push({ id, ...meta, text: (d.text || '') + rest });
  }
  p.sources.sort((a, b) => (a.addedAt || '').localeCompare(b.addedAt || ''));
  for (const d of c.cp || []) { const { key, id, ...rest } = d; p.casepack.docs[d.key || id] = rest; }
  p.ledger.history = (c.lh || []).sort((a, b) => (a.n || 0) - (b.n || 0)).map(({ n, id, ...h }) => h);
  for (const d of c.mod || []) { const { id, ...m } = d; p.modules[id] = { ...m, threads: {}, data: {} }; }
  for (const d of c.mdata || []) { const m = p.modules[d.mid] || (p.modules[d.mid] = { status: 'todo', threads: {}, data: {}, page: {} }); m.data[d.key] = d.value; }
  for (const d of c.gate || []) { const m = p.modules[d.id]; if (m) m.gate = d.gate; }
  const msgs = (c.msg || []).sort((a, b) => (a.ord || 0) - (b.ord || 0));
  for (const d of msgs) {
    const { mod, thread, ord, ...msg } = d;
    const m = p.modules[mod] || (p.modules[mod] = { status: 'doing', threads: {}, data: {}, page: {} });
    (m.threads[thread] = m.threads[thread] || []).push(msg);
  }
  p.artefacts = (c.art || []).sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  return p;
}

export const SUBS = ['src', 'cp', 'lh', 'mod', 'mdata', 'gate', 'msg', 'art'];
