import { h, icon, toast, modal, confirmBox, fmtDate, relTime, uid, autoGrow, clear, copyText, refreshApp } from './ui.js';
import { S, api, patch, userName } from './state.js';
import { estimateTokens, fmtTokens, buildSystem } from './engine.js';
import { settingsOf } from './runtime.js';
import { mountMarkdown } from './md.js';

export const SOURCE_TYPES = {
  rfp: 'RFP / tender-document', opportunity: 'Opportunity-omschrijving', conversation: 'Klantgesprek — notities / samenvatting', transcript: 'Transcript',
  email: 'E-mail / Q&A', internal: 'Interne notitie', other: 'Overig document',
};
const guessType = (name) => (/rfp|tender|aanbesteding|itt|rfi|bestek|inschrijv/i.test(name) ? 'rfp' : /transcript|opname/i.test(name) ? 'transcript' : /notule|minutes|gesprek|meeting|call|samenvatting|summary/i.test(name) ? 'conversation' : /mail|eml|q&a|vragen/i.test(name) ? 'email' : 'other');

async function readFile(file) {
  if (file.size > 40 * 1024 * 1024) throw new Error(`${file.name} is groter dan 40 MB`);
  const buf = await file.arrayBuffer();
  const un = userName();
  const res = await fetch('/api/extract', { method: 'POST', headers: { 'x-filename': encodeURIComponent(file.name), ...(un ? { 'x-user-name': encodeURIComponent(un) } : {}) }, body: buf });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || 'Lezen mislukt');
  return j;
}

export function pasteForm(onAdd, preset = {}) {
  const name = h('input', { type: 'text', value: preset.name || '', placeholder: 'bijv. Gespreksnotitie intake 12 nov' });
  const type = h('select', null, Object.entries(SOURCE_TYPES).map(([k, l]) => h('option', { value: k, selected: k === (preset.type || 'conversation') }, l)));
  const date = h('input', { type: 'date', value: preset.date || new Date().toISOString().slice(0, 10) });
  const text = h('textarea', { rows: 12, placeholder: 'Plak hier de tekst: notities, samenvatting, transcript, e-mail …' }); autoGrow(text);
  modal({
    title: 'Tekst toevoegen', wide: true,
    body: h('div', { class: 'stack' }, h('div', { class: 'grid g2' }, h('div', null, h('label', { class: 'f' }, 'Naam'), name), h('div', null, h('label', { class: 'f' }, 'Soort'), type)), h('div', { style: { maxWidth: '240px' } }, h('label', { class: 'f' }, 'Datum van het gesprek / document'), date), h('div', null, h('label', { class: 'f' }, 'Tekst'), text)),
    actions: [{ label: 'Annuleren', kind: 'ghost' }, { label: 'Toevoegen', kind: 'primary', onClick: () => { if (!text.value.trim()) { toast('Plak eerst tekst', 'error'); return false; } onAdd({ name: name.value.trim() || 'Notitie ' + date.value, type: type.value, date: date.value, text: text.value.trim(), origin: 'paste', chars: text.value.length }); } }],
  });
}

export function sourceAdder(onAdd) {
  const input = h('input', { type: 'file', multiple: true, class: 'hidden', accept: '.pdf,.docx,.txt,.md,.csv,.html,.htm,.rtf,.eml,.vtt,.srt,.json' });
  const status = h('div', { class: 'small muted', style: { marginTop: '8px' } });
  const typeSel = h('select', { style: { width: 'auto' } }, h('option', { value: 'auto' }, 'Soort: automatisch'), Object.entries(SOURCE_TYPES).map(([k, l]) => h('option', { value: k }, l)));
  const handle = async (files) => {
    for (const f of files) {
      status.textContent = 'Lezen: ' + f.name + ' …';
      try {
        const r = await readFile(f);
        if (!r.text) throw new Error('Geen tekst gevonden in ' + f.name);
        onAdd({ name: f.name, type: typeSel.value === 'auto' ? guessType(f.name) : typeSel.value, date: new Date().toISOString().slice(0, 10), text: r.text, origin: 'upload', chars: r.chars, pages: r.pages });
        (r.warnings || []).forEach((w) => toast(w, 'info', 6000));
      } catch (e) { toast(e.message, 'error', 6000); }
    }
    status.textContent = ''; input.value = '';
  };
  const drop = h('div', { class: 'drop', onclick: () => input.click(), ondragover: (e) => { e.preventDefault(); drop.classList.add('over'); }, ondragleave: () => drop.classList.remove('over'), ondrop: (e) => { e.preventDefault(); drop.classList.remove('over'); handle([...e.dataTransfer.files]); } },
    icon('upload', 28), h('div', { style: { fontWeight: 700, marginTop: '4px' } }, 'Sleep bestanden hierheen of klik om te kiezen'), h('div', { class: 'small muted' }, 'PDF, Word (.docx), tekst, Markdown, e-mail (.eml), transcripts (.vtt/.srt) · max. 40 MB'));
  input.addEventListener('change', () => handle([...input.files]));
  return h('div', { class: 'stack tight' }, drop, input, h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn ghost', onclick: () => pasteForm(onAdd) }, icon('edit', 16), 'Tekst plakken (gesprek, samenvatting, e-mail)'), typeSel), status);
}

function editSource(s) {
  const name = h('input', { type: 'text', value: s.name });
  const type = h('select', null, Object.entries(SOURCE_TYPES).map(([k, l]) => h('option', { value: k, selected: k === s.type }, l)));
  const date = h('input', { type: 'date', value: s.date || '' });
  const text = h('textarea', { rows: 16, class: 'mono' }); text.value = s.text; autoGrow(text);
  modal({
    title: 'Bron bewerken', wide: true,
    body: h('div', { class: 'stack' }, h('div', { class: 'grid g2' }, h('div', null, h('label', { class: 'f' }, 'Naam'), name), h('div', null, h('label', { class: 'f' }, 'Soort'), type)), h('div', { style: { maxWidth: '240px' } }, h('label', { class: 'f' }, 'Datum'), date), h('div', null, h('label', { class: 'f' }, 'Tekst'), text, h('div', { class: 'help' }, 'Corrigeer hier gerust extractiefouten (tabellen, koppen). De AI leest exact deze tekst.'))),
    actions: [{ label: 'Annuleren', kind: 'ghost' }, { label: 'Opslaan', kind: 'primary', onClick: async () => { const i = S.p.sources.findIndex((x) => x.id === s.id); await patch([{ op: 'set', path: ['sources', i], value: { ...s, name: name.value.trim() || s.name, type: type.value, date: date.value, text: text.value, chars: text.value.length } }]); refreshApp(); } }],
  });
}

export function viewSources() {
  const p = S.p;
  const box = h('div', { class: 'stack' });
  const render = () => {
    clear(box);
    const srcs = p.sources || [];
    const sys = buildSystem(p, settingsOf(p));
    const tok = estimateTokens(sys);
    box.append(
      h('div', { class: 'row between' }, h('div', null, h('div', { class: 'eyebrow' }, 'Bronnen'), h('h2', { style: { margin: 0 } }, 'Alles wat de AI mag lezen')),
        h('div', { class: 'chip ' + (tok > 150000 ? 'red' : tok > 90000 ? 'amber' : 'purple'), title: 'Schatting van de werkruimte-context per AI-aanroep' }, 'Context ≈ ' + fmtTokens(tok) + ' tokens')),
      h('p', { class: 'muted', style: { maxWidth: '72ch' } }, 'De werkruimte is wat in de gidsen de "documents in this workspace" heet: het Case Pack plus deze bronnen. Elke skill leest alleen deze bestanden, je Ledger en de chat — nooit het web of je mail.'),
      h('div', { class: 'card top' }, h('h3', null, 'Bron toevoegen'), sourceAdder(async (s) => {
        await patch([{ op: 'push', path: ['sources'], value: { ...s, id: uid('s'), addedAt: new Date().toISOString(), include: true } }]);
        toast(s.name + ' toegevoegd', 'ok'); render();
        if (Object.keys(p.casepack?.docs || {}).length) toast('Tip: werk het Case Pack bij met deze nieuwe bron (tab Case Pack).', 'info', 6500);
      })),
      h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, `${srcs.length} bron${srcs.length === 1 ? '' : 'nen'}`),
        h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'Context per aanroep:'), h('div', { class: 'seg' }, [['both', 'Case Pack + bronnen'], ['casepack', 'Alleen Case Pack'], ['sources', 'Alleen bronnen']].map(([k, l]) => h('button', { class: (p.meta.context || 'both') === k ? 'on' : '', onclick: async () => { await patch([{ op: 'set', path: ['meta', 'context'], value: k }]); render(); } }, l))))),
        srcs.length ? srcs.map((s) => h('div', { class: 'src-item' },
          h('div', { class: 'ico' }, icon('file', 20)),
          h('div', { class: 'grow' }, h('b', null, s.name), ' ', h('span', { class: 'chip purple' }, SOURCE_TYPES[s.type] || s.type),
            h('div', { class: 'small muted' }, (s.date ? fmtDate(s.date) + ' · ' : '') + fmtTokens(estimateTokens(s.text)) + ' tokens' + (s.pages ? ' · ' + s.pages + ' p.' : ''))),
          h('label', { class: 'check small', title: 'Meenemen in de werkruimte' }, h('input', { type: 'checkbox', checked: s.include !== false, onchange: async (e) => { const i = p.sources.findIndex((x) => x.id === s.id); await patch([{ op: 'set', path: ['sources', i, 'include'], value: e.target.checked }]); render(); } }), h('span', null, 'meenemen')),
          h('button', { class: 'icon-btn', title: 'Bekijk / bewerk', onclick: () => editSource(s) }, icon('edit', 18)),
          h('button', { class: 'icon-btn', title: 'Verwijderen', onclick: async () => { if (await confirmBox('Bron verwijderen?', `"${s.name}" wordt uit de werkruimte gehaald.`, 'Verwijderen')) { await patch([{ op: 'remove', path: ['sources'], id: s.id }]); render(); } } }, icon('trash', 18))))
          : h('div', { class: 'empty', style: { marginTop: '12px' } }, 'Nog geen bronnen. Voeg de RFP en je klantgesprekken toe.')));
  };
  render();
  return box;
}
