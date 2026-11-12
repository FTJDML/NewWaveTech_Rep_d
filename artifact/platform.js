// The claude.ai artifact runtime: capabilities arrive asynchronously through window.claude.use(name) and may be null.
export const P = { db: null, sample: null, user: null, downloads: null, me: null, canWrite: null, maxPromptBytes: 256 * 1024 - 4096, ready: false };

const grab = async (name) => { try { return (window.claude && (await window.claude.use(name))) || null; } catch { return null; } };

export async function initPlatform() {
  const [db, sample, user, downloads] = await Promise.all(['db', 'sample', 'user', 'downloads'].map(grab));
  Object.assign(P, { db, sample, user, downloads });
  if (user) {
    try { P.me = await user.me(); } catch { P.me = null; }
    try { P.canWrite = await user.can('data.write'); } catch { P.canWrite = null; }
  }
  if (sample) { try { const l = await sample.limits(); if (l?.maxPromptBytes) P.maxPromptBytes = Math.min(l.maxPromptBytes, 256 * 1024) - 4096; } catch { /* keep default */ } }
  P.ready = true;
  return P;
}

/** Names are resolved at render time (the platform advises never to store them). */
export async function nameFor(ids) {
  const out = {};
  const list = [...new Set((ids || []).filter(Boolean))];
  if (!list.length) return out;
  try { const ps = P.user ? await P.user.profiles(list) : {}; for (const id of list) out[id] = ps[id]?.name || ''; } catch { /* unresolved */ }
  return out;
}
