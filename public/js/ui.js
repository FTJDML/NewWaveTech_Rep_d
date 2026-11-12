// DOM helpers, icons, toast / modal, small utilities.
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'open' || k === 'hidden' || k === 'readOnly' || k === 'required') { if (v) el[k] = true; }
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, children);
  return el;
}
export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = (p = 'i') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

const ICONS = {
  chevron: 'M9 6l6 6-6 6', chevronDown: 'M6 9l6 6 6-6', check: 'M5 12.5l4.5 4.5L19 7.5', x: 'M6 6l12 12M18 6L6 18', plus: 'M12 5v14M5 12h14',
  play: 'M7 5v14l12-7z', stop: 'M7 7h10v10H7z', copy: 'M9 9h10v10H9zM5 15V5h10', edit: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4',
  trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13', upload: 'M12 16V4M7 9l5-5 5 5M5 20h14', download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  alert: 'M12 4l9 16H3zM12 10v4M12 17v.5', info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8v.5', lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z',
  refresh: 'M20 12a8 8 0 11-2.3-5.7M20 4v5h-5', send: 'M4 12l16-8-6 16-3-6z', home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  book: 'M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h10', list: 'M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5',
  flag: 'M6 21V4M6 5h11l-2 4 2 4H6', users: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M16 11a2.5 2.5 0 100-5M18 20a5 5 0 00-3-4.6',
  folder: 'M3 6h7l2 2h9v11H3z', map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14', gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2 .3-1.3-1.3.3-2-3-1-1 2h-2l-1-2-3 1 .3 2L6 8.3 4 8l-1 3 2 1v2l-2 1 1 3 2-.3 1.3 1.3-.3 2 3 1 1-2h2l1 2 3-1-.3-2 1.3-1.3 2 .3 1-3-2-1z',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5M12 17v.5', arrowRight: 'M5 12h14M13 6l6 6-6 6', arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 17a5 5 0 100-10 5 5 0 000 10zM12 13a1 1 0 100-2 1 1 0 000 2z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  chat: 'M4 5h16v11H9l-5 4z', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', table: 'M4 5h16v14H4zM4 10h16M10 5v14', calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
};
export function icon(name, size = 18, cls = '') {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
  if (cls) svg.setAttribute('class', 'ic ' + cls); else svg.setAttribute('class', 'ic');
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', ICONS[name] || ICONS.info); svg.append(p);
  return svg;
}

export function toast(msg, kind = 'info', ms = 3800) {
  let box = document.getElementById('toasts');
  if (!box) { box = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
  const t = h('div', { class: 'toast ' + kind }, kind === 'error' ? icon('alert', 18) : kind === 'ok' ? icon('check', 18) : icon('info', 18), h('span', null, msg));
  box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
}

export function modal({ title, body, actions = [], wide = false, onClose }) {
  const back = h('div', { class: 'modal-back' });
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const box = h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title || '' },
    h('div', { class: 'modal-head' }, h('h3', null, title || ''), h('button', { class: 'icon-btn', onclick: close, 'aria-label': 'Sluiten' }, icon('x'))),
    h('div', { class: 'modal-body' }, body),
    actions.length ? h('div', { class: 'modal-foot' }, actions.map((a) => h('button', { class: 'btn ' + (a.kind || 'ghost'), onclick: async () => { const r = a.onClick ? await a.onClick(close) : undefined; if (r !== false && !a.keep) close(); } }, a.label))) : null);
  back.append(box);
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(back);
  const f = box.querySelector('input,textarea,select,button.primary'); f && f.focus();
  return { close, box };
}
export function confirmBox(title, text, okLabel = 'Doorgaan', kind = 'danger') {
  return new Promise((resolve) => {
    let done = false;
    const m = modal({
      title, body: h('p', null, text), onClose: () => { if (!done) resolve(false); },
      actions: [{ label: 'Annuleren', kind: 'ghost', onClick: () => { done = true; resolve(false); } }, { label: okLabel, kind, onClick: () => { done = true; resolve(true); } }],
    });
    return m;
  });
}

export async function copyText(text, msg = 'Gekopieerd') {
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = text; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast(msg, 'ok', 1800);
}
/** The artifact build routes saves through its `downloads` capability (plain <a download> is inert there). */
export const hooks = { save: null };
export function downloadText(name, text, mime = 'text/plain;charset=utf-8') {
  if (hooks.save) return hooks.save(name, text, mime);
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export function downloadBlob(name, blob) {
  if (hooks.save) return hooks.save(name, blob, blob.type);
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function autoGrow(ta) {
  const f = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 520) + 'px'; };
  ta.addEventListener('input', f); setTimeout(f, 0); return ta;
}

export const debounce = (fn, ms = 600) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); fn(...a); }; return d; };
export const fmtDate = (iso) => { if (!iso) return ''; const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso); return isNaN(d) ? iso : d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }); };
export const fmtDateTime = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
export function relTime(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'zojuist'; if (s < 3600) return Math.floor(s / 60) + ' min geleden'; if (s < 86400) return Math.floor(s / 3600) + ' uur geleden';
  if (s < 86400 * 14) return Math.floor(s / 86400) + ' dagen geleden'; return fmtDate(iso);
}
export function daysUntil(iso, ref) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const a = new Date(iso + 'T00:00:00'); const b = ref ? new Date(ref + 'T00:00:00') : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');
  return Math.round((a - b) / 86400000);
}
export function slugify(s) { return String(s || 'pursuit').toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'pursuit'; }

/** Re-render the current route from the in-memory state (used instead of a full page reload). */
export const refreshApp = () => window.dispatchEvent(new Event('pn:refresh'));
