import { h, clear, icon, toast, modal, $ } from './ui.js';
import { S, loadConfig, loadList, loadUser, openPursuit, closePursuit, onChange, userName, setUserName, platform } from './state.js';
import { loadFramework, refreshOverrides } from './framework.js';
import { viewDashboard, viewNew, viewHelp } from './views-core.js';
import { viewPursuit } from './views-pursuit.js';
import { viewLibrary, viewMe, viewSettings } from './views-misc.js';
import { running } from './runtime.js';
import { R, parseHash } from './routes.js';

const root = document.getElementById('app');
let mainEl;

function shell() {
  clear(root);
  const nav = h('nav', { class: 'nav', id: 'nav' });
  root.append(
    h('header', { class: 'topbar' }, h('div', { class: 'topbar-in' },
      h('a', { class: 'brand', href: R.home(), 'aria-label': 'Pursuit Navigator — home', id: 'brand' }),
      nav,
      h('div', { class: 'top-right', id: 'topright' }))),
    (mainEl = h('main', { class: 'wrap', id: 'main' })),
    h('footer', { class: 'footer' }, h('b', null, 'Pursuit Navigator'), ' · gebaseerd op het AI-Native DCS-framework (v4.0) · Het model beslist nooit over bid, prijs, marge, staffing of juridische voorwaarden — dat doe jij.'));
  renderChrome();
  if (platform.kind === 'server') fetch('/brand/logo.svg').then(async (r) => { // drop the official CGI logo at public/brand/logo.svg to use it instead of the text wordmark
    if (r.ok && (r.headers.get('content-type') || '').includes('svg')) { const el = root.querySelector('.brand .logo'); if (el) { el.textContent = ''; el.append(h('img', { src: '/brand/logo.svg', alt: 'CGI', style: { height: '28px', display: 'block' } })); } }
  }).catch(() => {});
}

function renderBrand() {
  const b = $('#brand'); if (!b) return;
  clear(b);
  const t = !S.config ? '' : S.config.brand !== undefined ? S.config.brand : 'CGI'; // artifact: empty until the team sets one
  if (t) b.append(h('span', { class: 'logo' }, t), h('span', { class: 'sep' }));
  b.append(h('span', { class: 'name' }, 'Pursuit Navigator', h('small', null, 'AI-Native DCS framework')));
}

function renderChrome() {
  renderBrand();
  const route = parseHash();
  const nav = $('#nav');
  if (nav) {
    clear(nav);
    const items = [[R.home(), 'Pursuits', ['home', 'new', 'pursuit']], [R.library(), 'Bibliotheek', ['library']], [R.me(), 'Mijn werkwijze', ['me']], [R.settings(), 'Instellingen', ['instellingen']], [R.help(), 'Help', ['help']]];
    for (const [href, label, keys] of items) nav.append(h('a', { href, class: keys.includes(route.name) ? 'active' : '' }, label));
  }
  const tr = $('#topright');
  if (tr) {
    clear(tr);
    const c = S.config;
    const mode = !c ? ['off', 'AI laden…'] : c.provider === 'artifact' ? (c.hasKey ? ['', 'Claude · jouw account'] : ['warn', 'Kopieer-modus (Claude niet beschikbaar)']) : c.provider === 'mock' ? ['warn', 'Demo-modus (geen echte AI)'] : c.hasKey && c.provider !== 'manual' ? ['', (c.provider === 'anthropic' ? 'Claude' : 'OpenAI-compatibel') + ' · ' + c.model] : ['warn', 'Kopieer-modus (geen koppeling)'];
    tr.append(h('a', { class: 'ai-chip ' + mode[0], href: R.settings(), title: 'AI-koppeling' }, h('span', { class: 'dot' }), mode[1]));
    const nm = S.me?.name && S.me.name !== 'Gebruiker' ? S.me.name : userName() || 'Gebruiker';
    tr.append(h('button', { class: 'user-chip', onclick: askName, title: 'Naam wijzigen' }, h('span', { class: 'av' }, (nm[0] || '?').toUpperCase()), nm));
  }
}

function askName() {
  if (S.me?.source === 'sso' || S.me?.source === 'artifact') return;
  const input = h('input', { type: 'text', value: userName(), placeholder: 'Voor- en achternaam' });
  modal({
    title: 'Hoe heet je?', body: h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Je naam wordt gebruikt om je persoonlijke werkwijze (uren, first use) apart te bewaren en als eigenaar van je pursuits te tonen.'), input),
    actions: [{ label: 'Opslaan', kind: 'primary', onClick: async () => { const v = input.value.trim(); if (!v) return false; setUserName(v); await loadConfig(); await loadUser(); renderChrome(); route(); } }],
  });
}

let token = 0;
async function route() {
  const t = ++token;
  const r = parseHash();
  renderChrome();
  let view;
  try {
    if (r.name !== 'pursuit') closePursuit();
    if (r.name === 'pursuit' || r.name === 'library') await refreshOverrides();
    if (r.name === 'home') { await loadList(); view = await viewDashboard(); }
    else if (r.name === 'new') view = await viewNew();
    else if (r.name === 'pursuit') { await openPursuit(r.id); view = await viewPursuit(r); }
    else if (r.name === 'library') view = await viewLibrary(r.arg);
    else if (r.name === 'me') view = await viewMe();
    else if (r.name === 'instellingen') view = await viewSettings();
    else if (r.name === 'help') view = await viewHelp();
    else view = h('div', { class: 'empty' }, 'Pagina niet gevonden. ', h('a', { href: R.home() }, 'Naar het overzicht'));
  } catch (e) {
    console.error(e);
    view = h('div', { class: 'card top red' }, h('h2', null, 'Er ging iets mis'), h('p', null, e.message), h('a', { class: 'btn ghost', href: R.home() }, 'Terug naar het overzicht'));
  }
  if (t !== token) return;
  clear(mainEl); mainEl.append(view); window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', route);
window.addEventListener('pn:refresh', route);
onChange((w) => {
  if (w === 'config') renderChrome();
  if (w === 'remote') { // a teammate changed this pursuit: refresh the view unless you are typing or a call is running
    const a = document.activeElement;
    if (running.id || document.querySelector('.modal-back') || (a && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName))) return;
    route();
  }
});

(async function boot() {
  shell();
  mainEl.append(h('div', { class: 'empty' }, 'Laden…'));
  try {
    await Promise.all([loadConfig(), loadFramework()]);
    await loadUser();
  } catch (e) {
    clear(mainEl); mainEl.append(h('div', { class: 'card top red' }, h('h2', null, 'De server is niet bereikbaar'), h('p', null, e.message)));
    return;
  }
  renderChrome();
  if (S.me?.source !== 'sso' && S.me?.source !== 'artifact' && !userName()) askName();
  route();
})();
