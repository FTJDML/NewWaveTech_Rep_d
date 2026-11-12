// Plain-hash routes: ASCII letters, digits and hyphens only (works as a deep link inside a claude.ai artifact too).
//   #home · #new · #library · #library-M10 · #me · #instellingen · #help
//   #<id>  #<id>-sources  #<id>-casepack  #<id>-casepack-build  #<id>-ledger  #<id>-map  #<id>-artefacts  #<id>-M3
export const R = {
  home: () => '#home',
  new: () => '#new',
  library: (mod) => (mod ? `#library-${mod}` : '#library'),
  me: () => '#me',
  settings: () => '#instellingen',
  help: () => '#help',
  p: (id) => `#${id}`,
  view: (id, v) => `#${id}-${v}`,
  mod: (id, m) => `#${id}-${m}`,
  build: (id) => `#${id}-casepack-build`,
};
export const go = (hash) => { location.hash = String(hash).replace(/^#/, ''); };

const NAMES = ['home', 'new', 'library', 'me', 'instellingen', 'help'];
const VIEWS = ['sources', 'casepack', 'ledger', 'map', 'artefacts'];
export function parseHash(hash = location.hash) {
  const t = String(hash || '').replace(/^#\/?/, '').split(/[-/]/).filter(Boolean);
  if (!t.length || t[0] === 'home') return { name: 'home' };
  if (NAMES.includes(t[0])) return { name: t[0], arg: t[1] };
  if (/^p[0-9a-z_]{4,}$/i.test(t[0])) {
    const r = { name: 'pursuit', id: t[0], view: 'overview' };
    if (VIEWS.includes(t[1])) { r.view = t[1]; r.build = t[2] === 'build'; }
    else if (/^M\d+$/.test(t[1] || '')) { r.view = 'module'; r.mod = t[1]; }
    return r;
  }
  return { name: 'notfound' };
}
