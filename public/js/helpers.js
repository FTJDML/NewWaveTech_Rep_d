import { FW } from './framework.js';
import { STAGES, stageOf, todayIso } from './engine.js';
import { daysUntil } from './ui.js';

export const ORDER = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M13', 'M14'];
export const OPTIONAL = new Set(['M1', 'M14']); // personal workflow modules: once per quarter / at the end
export const modTitle = (id) => FW.modules[id]?.title || id;
export const modStatus = (p, id) => p.modules?.[id]?.status || 'todo';

export function nextModule(p) {
  for (const id of ORDER) if (!OPTIONAL.has(id) && modStatus(p, id) !== 'done') return id;
  for (const id of ORDER) if (modStatus(p, id) !== 'done') return id;
  return null;
}
export function stageState(p, n) {
  const mods = STAGES.find((s) => s.n === n).modules.filter((m) => !OPTIONAL.has(m));
  const ids = mods.length ? mods : STAGES.find((s) => s.n === n).modules;
  const st = ids.map((m) => modStatus(p, m));
  if (st.every((s) => s === 'done')) return 'done';
  if (st.some((s) => s !== 'todo')) return 'doing';
  return 'todo';
}
export function progress(p) {
  const req = ORDER.filter((m) => !OPTIONAL.has(m));
  const done = req.filter((m) => modStatus(p, m) === 'done').length;
  return { done, total: req.length, pct: Math.round((done / req.length) * 100) };
}
export function allConditions(p) {
  const out = [];
  for (const d of p.decisions || []) {
    (d.conditions || []).forEach((c) => out.push({ ...c, decision: d }));
    if (d.flip?.text) out.push({ id: d.id + '-flip', text: 'Flip fact: ' + d.flip.text, owner: d.flip.owner, due: d.flip.due, status: d.flipStatus || 'open', decision: d, flip: true });
  }
  return out;
}
export const refDate = (p) => p.meta?.caseDate || todayIso();
export function dueState(p, c) {
  if (c.status === 'met') return 'met';
  const d = daysUntil(c.due, refDate(p));
  if (d === null) return 'nodate';
  if (d < 0) return 'late'; if (d <= 7) return 'soon'; return 'ok';
}
export const routeWord = { tender: 'tender', direct: 'direct award', renewal: 'renewal', change: 'change request', own: 'own proposal' };
export function casePackStatus(p) {
  const docs = p.casepack?.docs || {};
  return Object.values(docs).filter((d) => d?.text).length;
}
export function ledgerAge(p) { return p.ledger?.current?.at || null; }
export { STAGES, stageOf };
