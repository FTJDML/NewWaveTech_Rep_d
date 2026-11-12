// Loads the extracted framework (skills.json, exact text of the guides) and merges the cards of M10–M14
// (their official prompts are added later through the Prompt Library).
import { RECONSTRUCTED } from './reconstructed.js';

export const FW = { modules: {}, loaded: false, overrides: {} };

export async function loadOverrides() { try { return await (await fetch('/api/prompts')).json(); } catch { return {}; } }
/** Teammates can add official prompts at any time: re-read them whenever a pursuit or the library is opened. */
export async function refreshOverrides() { FW.overrides = await loadOverrides(); return FW.overrides; }
export async function saveOverrides(o) {
  const r = await fetch('/api/prompts', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) });
  if (!r.ok) throw new Error('Opslaan van prompts mislukt');
  FW.overrides = await r.json();
}

const HC = /HUMAN CHECK[^\n]*\n((?:- .*\n?)+)/;
export const humanChecksIn = (text) => ((HC.exec(text || '') || [, ''])[1]).split('\n').map((l) => l.replace(/^- /, '').trim()).filter(Boolean);

export async function loadFramework() {
  if (FW.loaded) return FW;
  const r = await fetch('/data/skills.json'); const j = await r.json();
  FW.source = j.source;
  const mods = j.modules;
  for (const [k, v] of Object.entries(RECONSTRUCTED)) mods[k] = v;
  // the gate is identical in every module: keep one copy as FW.gate
  FW.gate = mods.M0.prompts.find((p) => p.id === 'GATE');
  for (const m of Object.values(mods)) {
    m.id = 'M' + m.num;
    m.prompts = m.prompts.filter((p) => p.id !== 'GATE');
  }
  FW.modules = mods;
  FW.overrides = await loadOverrides();
  FW.loaded = true;
  return FW;
}

/** A pasted official prompt still carries its "Workshop output discipline" paragraph: move it behind the on/off switch. */
export function splitDiscipline(text) {
  const m = /^Workshop output discipline —.*$/m.exec(text || '');
  if (!m) return { text: (text || '').trim(), discipline: '' };
  return { text: (text.slice(0, m.index) + '{{DISCIPLINE}}' + text.slice(m.index + m[0].length)).replace(/\n{3,}/g, '\n\n').trim(), discipline: m[0].trim() };
}

/** Prompt object with the team's overrides applied (Prompt Library → Bewerk). `missing` = no official text yet. */
export function getPrompt(modId, pid) {
  if (pid === 'GATE') {
    const o = FW.overrides.GATE;
    if (!o) return FW.gate;
    const sp = o.text.includes('{{DISCIPLINE}}') ? { text: o.text, discipline: FW.gate.discipline } : splitDiscipline(o.text);
    return { ...FW.gate, text: sp.text, discipline: sp.discipline || FW.gate.discipline, overridden: true };
  }
  const base = FW.modules[modId]?.prompts.find((p) => p.id === pid);
  if (!base) return null;
  const o = FW.overrides[modId + ':' + pid];
  if (!o) return { ...base, missing: !base.text };
  const sp = o.text.includes('{{DISCIPLINE}}') ? { text: o.text, discipline: base.discipline || '' } : splitDiscipline(o.text);
  return { ...base, text: sp.text, discipline: sp.discipline || base.discipline || '', overridden: true, missing: !sp.text.trim() };
}

/** A module can run once its main skill (P1) has official text. */
export const moduleAvailable = (modId) => !!getPrompt(modId, 'P1')?.text;
export const humanChecksOf = (modId) => humanChecksIn(getPrompt(modId, 'P1')?.text);
