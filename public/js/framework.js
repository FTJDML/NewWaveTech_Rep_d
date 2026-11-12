// Loads the extracted framework (skills.json, exact text of the guides) and merges the reconstructed M10–M14.
import { RECONSTRUCTED } from './reconstructed.js';

export const FW = { modules: {}, loaded: false, overrides: {} };

export async function loadOverrides() { try { return await (await fetch('/api/prompts')).json(); } catch { return {}; } }
export async function saveOverrides(o) {
  const r = await fetch('/api/prompts', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) });
  if (!r.ok) throw new Error('Opslaan van prompts mislukt');
  FW.overrides = await r.json();
}

export async function loadFramework() {
  if (FW.loaded) return FW;
  const r = await fetch('/data/skills.json'); const j = await r.json();
  FW.source = j.source;
  const mods = j.modules;
  for (const [k, v] of Object.entries(RECONSTRUCTED)) mods[k] = v;
  // the gate is identical in every module: keep one copy as FW.gate
  const gate = mods.M0.prompts.find((p) => p.id === 'GATE');
  FW.gate = gate;
  for (const m of Object.values(mods)) {
    m.id = 'M' + m.num;
    m.prompts = m.prompts.filter((p) => p.id !== 'GATE');
    m.humanChecks = ((m.prompts[0] && /HUMAN CHECK[^\n]*\n((?:- .*\n?)+)/.exec(m.prompts[0].text)) || [, ''])[1].split('\n').map((l) => l.replace(/^- /, '').trim()).filter(Boolean);
  }
  FW.modules = mods;
  FW.overrides = await loadOverrides();
  FW.loaded = true;
  return FW;
}

/** Prompt object with local overrides applied (Prompt Library → Bewerk). */
export function getPrompt(modId, pid) {
  if (pid === 'GATE') { const o = FW.overrides['GATE']; return o ? { ...FW.gate, text: o.text, overridden: true } : FW.gate; }
  const base = FW.modules[modId]?.prompts.find((p) => p.id === pid);
  if (!base) return null;
  const o = FW.overrides[modId + ':' + pid];
  return o ? { ...base, text: o.text, overridden: true } : base;
}
