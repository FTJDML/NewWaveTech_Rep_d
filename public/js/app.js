import { h, clear, icon, toast, modal, $ } from './ui.js';
import { S, loadConfig, loadList, loadUser, openPursuit, closePursuit, onChange, userName, setUserName, api } from './state.js';
import { loadFramework } from './framework.js';
import { viewDashboard, viewNew, viewHelp } from './views-core.js';
import { viewPursuit } from './views-pursuit.js';
import { viewLibrary, viewMe, viewSettings } from './views-misc.js';
import { running } from './runtime.js';

const root = document.getElementById('app');
let mainEl;

function shell() {
  clear(root);
  const nav = h('nav', { class: 'nav', id: 'nav' });
  root.append(
    h('header', { class: 'topbar' }, h('div', { class: 'topbar-in' },
      h('a', { class: 'brand', href: '#/', 'aria-label': 'CGI Pursuit Navigator — home' }, h('span', { class: 'logo' }, 'CGI'), h('span', { class: 'sep' }), h('span', { class: 'name' }, 'Pursuit Navigator', h('small', null, 'AI-Native DCS framework'))),
      nav,
      h('div', { class: 'top-right', id: 'topright' }))),
    (mainEl = h('main', { class: 'wrap', id: 'main' })),
    h('footer', { class: 'footer' }, h('b', null, 'CGI'), ' Pursuit Navigator · gebaseerd op het AI-Native DCS-framework (v4.0) · Het model beslist nooit over bid, prijs, marge, staffing of juridische voorwaarden — dat doe jij.'));
  renderChrome();
  fetch('/brand/logo.svg').then(async (r) => { // drop the official CGI logo at public/brand/logo.svg to use it instead of the text wordmark
    if (r.ok && (r.headers.get('content-type') || '').includes('svg')) { const el = root.querySelector('.brand .logo'); if (el) { el.textContent = ''; el.append(h('img', { src: '/brand/logo.svg', alt: 'CGI', style: { height: '28px', display: 'block' } })); } }
  }).catch(() => {});
}

function renderChrome() {
  const route = parse();
  const nav = $('#nav');
  if (nav) {
    clear(nav);
    const items = [['#/', 'Pursuits', ['', 'p', 'new']], ['#/library', 'Bibliotheek', ['library']], ['#/me', 'Mijn werkwijze', ['me']], ['#/settings', 'Instellingen', ['settings']], ['#/help', 'Help', ['help']]];
    for (const [href, label, keys] of items) nav.append(h('a', { href, class: keys.includes(route[0] || '') ? 'active' : '' }, label));
  }
  const tr = $('#topright');
  if (tr) {
    clear(tr);
    const c = S.config;
    const mode = !c ? ['off', 'AI laden…'] : c.provider === 'mock' ? ['warn', 'Demo-modus (geen echte AI)'] : c.hasKey && c.provider !== 'manual' ? ['', (c.provider === 'anthropic' ? 'Claude' : 'OpenAI-compatibel') + ' · ' + c.model] : ['warn', 'Kopieer-modus (geen koppeling)'];
    tr.append(h('a', { class: 'ai-chip ' + mode[0], href: '#/settings', title: 'AI-koppeling' }, h('span', { class: 'dot' }), mode[1]));
    const nm = S.me?.name && S.me.name !== 'Gebruiker' ? S.me.name : userName() || 'Gebruiker';
    tr.append(h('button', { class: 'user-chip', onclick: askName, title: 'Naam wijzigen' }, h('span', { class: 'av' }, (nm[0] || '?').toUpperCase()), nm));
  }
}

function askName() {
  if (S.me?.source === 'sso') return;
  const input = h('input', { type: 'text', value: userName(), placeholder: 'Voor- en achternaam' });
  modal({
    title: 'Hoe heet je?', body: h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Je naam wordt gebruikt om je persoonlijke werkwijze (uren, first use) apart te bewaren en als eigenaar van je pursuits te tonen.'), input),
    actions: [{ label: 'Opslaan', kind: 'primary', onClick: async () => { const v = input.value.trim(); if (!v) return false; setUserName(v); await loadConfig(); await loadUser(); renderChrome(); route(); } }],
  });
}

const parse = () => (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean).map(decodeURIComponent);

let token = 0;
async function route() {
  const t = ++token;
  const seg = parse();
  renderChrome();
  let view;
  try {
    if (seg[0] !== 'p') closePursuit();
    if (!seg.length) { await loadList(); view = await viewDashboard(); }
    else if (seg[0] === 'new') view = await viewNew();
    else if (seg[0] === 'p' && seg[1]) { await openPursuit(seg[1]); view = await viewPursuit(seg.slice(2)); }
    else if (seg[0] === 'library') view = await viewLibrary(seg[1]);
    else if (seg[0] === 'me') view = await viewMe();
    else if (seg[0] === 'settings') view = await viewSettings();
    else if (seg[0] === 'help') view = await viewHelp();
    else view = h('div', { class: 'empty' }, 'Pagina niet gevonden. ', h('a', { href: '#/' }, 'Naar het overzicht'));
  } catch (e) {
    console.error(e);
    view = h('div', { class: 'card top red' }, h('h2', null, 'Er ging iets mis'), h('p', null, e.message), h('a', { class: 'btn ghost', href: '#/' }, 'Terug naar het overzicht'));
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
  if (S.me?.source !== 'sso' && !userName()) askName();
  route();
})();
