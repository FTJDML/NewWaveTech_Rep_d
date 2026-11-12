import { h, icon, toast, modal, confirmBox, fmtDate, fmtDateTime, uid, autoGrow, clear, copyText, downloadText, debounce, esc, append } from './ui.js';
import { S, api, saveUser, loadUser, userName } from './state.js';
import { FW, getPrompt, saveOverrides, moduleAvailable } from './framework.js';
import { STAGES, practicePatches, patchText, hoursSummary, parseHours, DEFAULT_BANNER } from './engine.js';
import { HOURS_STAGES } from './flows.js';

const HINTS = [
  'Kennis van de klant en de mensen; account planning; vroege gesprekken. Bijv. meetings vóór de RFP, wie beslist, wat ze echt willen.',
  'Kwalificeren: bid / no-bid, voorwaarden, interne goedkeuring. Bijv. het go/no-go gesprek, het kwalificatieformulier, akkoord van je VP of bid board.',
  'Het antwoord schrijven; value case; pricing-input; contractvorm. Bijv. de aanpak en antwoorden, referenties en bewijs, prijsrondes met finance.',
  'Oplossing, scope, eisen en specificaties voor het team. Bijv. wat in/uit scope is, aannames, wat het delivery-team bouwt.',
  'Demo of prototype; wijzigingen en addenda; team en staffing; AI- of governance-annex; definitief aanbod.',
  'Reviews en kwaliteitschecks vóór indiening. Bijv. red-team of colour reviews, een collega die meeleest, compliance-checks.',
  'Bid board, indienen, presentatie of orals, overdracht. Bijv. het bid board, indienen, orals en de dry run, overdracht aan delivery.',
];

/** Hours form (sheet "Hours" of My Pursuit Workflow): numbers first, ranges allowed, the app does the sums. */
export function hoursEditor(user, onSave, { compact } = {}) {
  const u = user || { hours: {} };
  const hrs = (u.hours = u.hours || {});
  const wrap = h('div');
  const totals = h('div', { class: 'callout', style: { marginTop: '10px' } });
  const save = debounce(() => onSave({ hours: hrs }), 500);
  const upd = () => {
    const s = hoursSummary(hrs); const py = parseHours(hrs.perYear); const g = (() => { let sum = 0, n = 0; for (let i = 1; i <= 7; i++) { const v = parseHours(hrs['g' + i]); if (v !== null) { sum += v; n++; } } return { sum, n }; })();
    clear(totals); append(totals, [h('b', null, 'Totalen (door de app berekend — nooit door het model)'), h('div', null, s.counted ? `Vandaag: ${s.sum} h · ${s.counted} van 7 stages geteld (een bereik telt met de ondergrens; woorden tellen niet)` : 'Vul je uren in: een getal eerst, bijv. "12" of "35–40".'), g.n ? h('div', null, `Met deze workflow: ${g.sum} h · ${g.n} van 7 stages${s.counted ? ` · uren terug: ${Math.round((s.sum - g.sum) * 10) / 10} h` : ''}`) : null, py && s.counted ? h('div', null, `× ${py} pursuits per jaar ≈ ${Math.round(s.sum * py)} h per jaar`) : null]);
  };
  const inp = (key, ph, extra) => { const el = h('input', { type: 'text', placeholder: ph || '', value: hrs[key] || '', oninput: (e) => { hrs[key] = e.target.value; upd(); save(); }, ...(extra || {}) }); return el; };
  const rows = HOURS_STAGES.map((st, i) => h('tr', null, h('td', { style: { fontWeight: 700, whiteSpace: 'nowrap' } }, st), h('td', { style: { width: '120px' } }, inp('s' + (i + 1), '12 of 35–40')), h('td', null, inp('w' + (i + 1), 'waar gaat de tijd heen?')),
    compact ? null : h('td', { style: { width: '120px' } }, inp('g' + (i + 1), 'met workflow')), compact ? null : h('td', { class: 'xs muted', style: { maxWidth: '260px' } }, HINTS[i])));
  wrap.append(h('div', { class: 'wscroll' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Stage'), h('th', null, 'Hours today (estimate)'), h('th', null, 'Where the time goes'), compact ? null : h('th', null, 'Hours with this workflow (M14)'), compact ? null : h('th', null, 'Wat het betekent'))), h('tbody', null, rows))),
    h('div', { class: 'grid g3', style: { marginTop: '10px' } }, h('div', null, h('label', { class: 'f' }, 'My last pursuit'), inp('last', 'type klant · wat gekocht · won/lost/open · wanneer')), h('div', null, h('label', { class: 'f' }, 'Pursuits I lead in a typical year'), inp('perYear', 'bijv. 5')), h('div', null, h('label', { class: 'f' }, 'Where it hurt most'), inp('hurt', 'welke stages, en waarom'))), totals);
  upd();
  return wrap;
}

export async function viewMe() {
  await loadUser();
  const u = S.user;
  const fu = (u.firstUse = u.firstUse || {});
  const items = [['play', 'The play — welke Workflow Skill (module en naam)'], ['occasion', 'De echte gelegenheid — opportunity en de meeting, deadline of beslissing'], ['date', 'Datum — binnen zeven dagen'], ['input', 'Input die ik gebruik (en de laatste Ledger)'], ['check', 'Menselijke check en reviewer (rol)'], ['measure', 'Wat ik meet: effort (incl. reviewer en rework) · kwaliteit · rework · hergebruik'], ['stop', 'Stop-regel — wanneer ik het met de hand doe'], ['d7', '7-dagencheck — gedraaid? ja/nee, wat gebeurde er'], ['d30date', '30-dagen review — datum (zet het nu in je agenda)'], ['d30', '30-dagen review — resultaat: effort · kwaliteit · rework · reuse → keep · adapt · stop']];
  const saveFu = debounce(() => saveUser({ firstUse: fu }), 600);
  return h('div', { style: { maxWidth: '1100px' } },
    h('div', { class: 'eyebrow red' }, 'Persoonlijk'), h('h1', null, 'Mijn werkwijze'),
    h('p', { class: 'lead muted', style: { maxWidth: '70ch' } }, 'Dit is jouw eigen tijd — niet die van een pursuit. Module 1 leest het formulier, Module 14 zet je werkwijze ernaast. Alleen jij ziet het. Uren zijn schattingen tot je ze meet.'),
    h('div', { class: 'card top' }, h('h3', null, 'Mijn workflow vandaag — mijn laatste pursuit, per stage'), hoursEditor(u, async (patch) => { await saveUser(patch); })),
    h('div', { class: 'card top', style: { marginTop: '20px' } }, h('h3', null, 'First use — één play, één echte gelegenheid, review na 30 dagen'), h('p', { class: 'muted small' }, 'Eén play is genoeg: één Workflow Skill, binnen zeven dagen op echt werk. Bewijs van gebruik is nog geen business-uitkomst: schrijf op wat je zag en houd schattingen als schattingen.'),
      h('div', { class: 'stack' }, items.map(([k, label]) => { const ta = h('textarea', { rows: 2, oninput: (e) => { fu[k] = e.target.value; saveFu(); } }); ta.value = fu[k] || ''; autoGrow(ta); return h('div', null, h('label', { class: 'f' }, label), ta); }))));
}

// ------------------------------------------------------------------------------------------------
function highlight(orig, settings) {
  let t = orig;
  for (const pt of practicePatches(settings)) t = t.split(pt.find).join('\u0001' + pt.replace + '\u0002');
  return esc(t).replace(/\u0001/g, '<mark style="background:#fff0b3">').replace(/\u0002/g, '</mark>');
}

export async function viewLibrary(sel) {
  const ids = Array.from({ length: 15 }, (_, i) => 'M' + i);
  let cur = ids.includes(sel) ? sel : 'M3';
  let mode = 'app';
  const box = h('div');
  const settings = { mode: 'practice', banner: DEFAULT_BANNER };
  function render() {
    clear(box);
    const mod = FW.modules[cur];
    const list = h('div', { class: 'card', style: { padding: '8px' } }, ids.map((id) => h('a', { class: 'nl', href: '#', style: { display: 'flex', gap: '8px', padding: '8px 10px', borderRadius: '4px', textDecoration: 'none', color: id === cur ? 'var(--purple)' : 'var(--ink-2)', background: id === cur ? 'var(--tint)' : '', fontWeight: id === cur ? 700 : 500, fontSize: '.92rem' }, onclick: (e) => { e.preventDefault(); cur = id; render(); } }, id, h('span', { style: { flex: 1 } }, FW.modules[id].title), !moduleAvailable(id) ? h('span', { class: 'chip amber', style: { fontSize: '.65rem' } }, 'ontbreekt') : null)));
    const prompts = [...mod.prompts, ...(cur === 'M0' ? [{ ...getPrompt('M0', 'GATE'), id: 'GATE', title: 'The gate — closes every module (identiek in alle modules)' }] : [])];
    const main = h('div', { class: 'stack' },
      h('div', null, h('div', { class: 'eyebrow' }, `Stage ${cur === 'M0' ? '0' : STAGES.find((s) => s.modules.includes(cur))?.n}`), h('h2', { style: { margin: 0 } }, `${cur} · ${mod.title}`)),
      mod.pending && !moduleAvailable(cur) ? h('div', { class: 'callout amber' }, h('b', null, 'Nog toe te voegen'), 'De deelnemersgids van deze module zat niet in het aangeleverde materiaal, dus de app heeft hier bewust geen prompts. Klik per prompt op "Plak de officiële prompt" en plak de volledige tekst van de box uit Appendix A. Het blok "Workshop output discipline" mag erin blijven: de app zet het automatisch achter de aan/uit-schakelaar. Zodra P1 erin staat, is de module actief voor het hele team.') : mod.pending ? h('div', { class: 'callout green' }, h('b', null, 'Toegevoegd door jullie team'), 'Deze prompts zijn door jullie ingevoerd (gedeeld op deze server).') : h('div', { class: 'callout' }, h('b', null, 'Letterlijk uit de deelnemersgids'), 'De prompts hieronder zijn woordelijk overgenomen. In Praktijk-modus gelden alleen de gemarkeerde aanpassingen.'),
      h('div', { class: 'row' }, h('div', { class: 'seg' }, [['app', 'Zoals de app het verstuurt'], ['orig', 'Origineel (workshop)']].map(([k, l]) => h('button', { class: mode === k ? 'on' : '', onclick: () => { mode = k; render(); } }, l))), h('span', { class: 'small muted' }, `${practicePatches(settings).length} mogelijke praktijk-aanpassingen: ${[...new Set(practicePatches(settings).map((x) => x.why))].slice(0, 3).join(' · ')} …`)),
      ...prompts.map((pr) => promptCard(pr)));
    box.append(h('div', { class: 'eyebrow red' }, 'Bibliotheek'), h('h1', { style: { marginBottom: '.2em' } }, 'Workflow Skills — de volledige prompt-bibliotheek'), h('p', { class: 'muted', style: { maxWidth: '72ch' } }, 'Alles wat de app naar het model stuurt, in te zien en te kopiëren — bijvoorbeeld voor gebruik in je eigen enterprise AI-tool.'),
      h('div', { class: 'ws' }, h('aside', { class: 'side' }, list), main));
  }
  function promptCard(pr) {
    const ov = FW.overrides[pr.id === 'GATE' ? 'GATE' : cur + ':' + pr.id];
    const src = getPrompt(cur, pr.id) || pr;
    const text = mode === 'orig' ? (FW.modules[cur].prompts.find((x) => x.id === pr.id) || FW.gate).text : src.text;
    const shown = mode === 'orig' ? text : patchText(text, settings);
    if (src.missing) return h('div', { class: 'card top' }, h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, `${pr.id} · ${pr.title}`), h('span', { class: 'chip amber' }, 'ontbreekt')),
      pr.how?.length ? h('p', { class: 'small muted' }, pr.how.join(' ')) : null,
      h('div', { class: 'empty-slot' }, h('p', { style: { margin: '0 0 10px' } }, 'De officiële tekst van deze prompt is nog niet toegevoegd.'), h('button', { class: 'btn primary', onclick: () => editPrompt(pr) }, icon('edit', 16), 'Plak de officiële prompt')));
    const body = h('pre', { class: 'code small', style: { maxHeight: '340px', borderRadius: '6px', whiteSpace: 'pre-wrap' } });
    body.innerHTML = (mode === 'app' ? highlight(text, settings) : esc(text)).replace(/\{\{DISCIPLINE\}\}/g, '<span style="color:#ffb3c0">⟦ Workshop output discipline — standaard uit ⟧</span>');
    return h('div', { class: 'card top' }, h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, `${pr.id === 'GATE' ? 'GATE' : pr.id} · ${pr.title}`), h('div', { class: 'row' }, ov ? h('span', { class: 'chip amber' }, 'aangepast door team') : null, h('button', { class: 'btn ghost sm', onclick: () => copyText(shown.replace(/\{\{DISCIPLINE\}\}/g, '')) }, icon('copy', 14), 'Kopieer'), h('button', { class: 'btn outline sm', onclick: () => editPrompt(pr) }, icon('edit', 14), 'Bewerk'))),
      pr.how?.length ? h('p', { class: 'small muted' }, pr.how.join(' ')) : null, body,
      pr.discipline ? h('details', { class: 'small' }, h('summary', { style: { cursor: 'pointer', color: 'var(--purple)' } }, 'Workshop output discipline (woordlimieten — standaard uit)'), h('div', { class: 'muted' }, pr.discipline)) : null);
  }
  function editPrompt(pr) {
    const key = pr.id === 'GATE' ? 'GATE' : cur + ':' + pr.id;
    const base = pr.id === 'GATE' ? FW.gate : FW.modules[cur].prompts.find((x) => x.id === pr.id);
    const ta = h('textarea', { rows: 22, class: 'mono' }); ta.value = (FW.overrides[key]?.text) ?? base.text; autoGrow(ta);
    const pending = !!FW.modules[cur].pending;
    modal({ title: pending ? `Plak de officiële prompt — ${key}` : `Bewerk ${key}`, wide: true, body: h('div', { class: 'stack' }, h('div', { class: 'callout amber' }, h('b', null, 'Gedeeld met je team'), pending ? 'Plak de volledige tekst van de box uit de deelnemersgids (Appendix A), woordelijk. Placeholders zoals [CONFIRMED] of [FIGURES] laat je staan: de app vult ze met jouw invoer. Het blok "Workshop output discipline" mag erin blijven.' : 'Een aangepaste prompt geldt voor iedereen op deze server. Houd de placeholders (zoals [NOTES — or "none"]) en het token {{DISCIPLINE}} intact. Terugzetten kan altijd.'), ta),
      actions: [{ label: 'Annuleren', kind: 'ghost' }, FW.overrides[key] ? { label: 'Terug naar origineel', kind: 'danger', onClick: async () => { const o = { ...FW.overrides }; delete o[key]; await saveOverrides(o); toast('Teruggezet', 'ok'); render(); } } : null, { label: 'Opslaan', kind: 'primary', onClick: async () => { const o = { ...FW.overrides, [key]: { text: ta.value, at: new Date().toISOString(), by: userName() } }; await saveOverrides(o); toast('Opgeslagen voor het team', 'ok'); render(); } }].filter(Boolean) });
  }
  render();
  return box;
}

// ------------------------------------------------------------------------------------------------
export async function viewSettings() {
  const c = S.config;
  const f = { maxOutputTokens: String(c.maxOut || ''), provider: c.provider === 'manual' ? 'manual' : c.provider, anthropicKey: '', anthropicModel: c.anthropic.model, anthropicBaseUrl: c.anthropic.baseUrl, openaiKey: '', openaiModel: c.openai.model, openaiBaseUrl: c.openai.baseUrl, openaiAuthHeader: c.openai.authHeader, openaiApiVersion: c.openai.apiVersion, openaiTokenParam: c.openai.tokenParam };
  const box = h('div', { style: { maxWidth: '980px' } });
  const inp = (k, label, props = {}) => h('div', { class: 'field' }, h('label', { class: 'f' }, label), h('input', { type: props.password ? 'password' : 'text', value: f[k] || '', placeholder: props.ph || '', disabled: c.locked, autocomplete: 'off', oninput: (e) => { f[k] = e.target.value; } }), props.help ? h('div', { class: 'help' }, props.help) : null);
  function render() {
    clear(box);
    const provs = [['anthropic', 'Anthropic (Claude)', 'Directe koppeling met de Claude API.'], ['openai', 'OpenAI-compatibel', 'OpenAI, Azure OpenAI of een interne gateway (chat/completions).'], ['manual', 'Kopieer-modus', 'Geen koppeling: de app stelt de prompt samen, je plakt hem in je goedgekeurde AI-tool en plakt het antwoord terug.'], ['mock', 'Demo-modus', 'Voorbeeldantwoorden om de app te leren kennen. Geen echte AI.']];
    box.append(h('div', { class: 'eyebrow red' }, 'Instellingen'), h('h1', null, 'AI-koppeling & gegevens'),
      c.locked ? h('div', { class: 'callout' }, h('b', null, 'Vastgezet door de beheerder'), 'De AI-koppeling is via omgevingsvariabelen op de server ingesteld en kan hier niet worden gewijzigd.') : null,
      h('div', { class: 'callout red', style: { margin: '14px 0' } }, h('b', null, 'Alleen een goedgekeurde AI-omgeving'), 'Echte klantgegevens zijn toegestaan in deze tool, maar uitsluitend via een door CGI goedgekeurde zakelijke AI-omgeving (geen persoonlijke accounts). In twijfel over een document of koppeling? Vraag eerst je account lead.'),
      h('div', { class: 'card top' }, h('h3', null, 'Provider'),
        h('div', { class: 'grid g2' }, provs.map(([k, t, d]) => h('label', { class: 'card', style: { cursor: c.locked ? 'default' : 'pointer', borderColor: f.provider === k ? 'var(--purple)' : '', background: f.provider === k ? 'var(--tint-2)' : '' } }, h('div', { class: 'check' }, h('input', { type: 'radio', name: 'prov', checked: f.provider === k, disabled: c.locked, onchange: () => { f.provider = k; render(); } }), h('span', null, h('b', null, t), h('div', { class: 'small muted' }, d)))))),
        f.provider === 'anthropic' ? h('div', { style: { marginTop: '14px' } }, h('div', { class: 'grid g2' }, inp('anthropicKey', 'API-sleutel', { password: true, ph: c.anthropic.hasKey ? '•••••••• (ingesteld — leeg laten om te behouden)' : 'sk-ant-…', help: 'Wordt alleen op de server bewaard (data/config.json, alleen leesbaar voor de serveraccount) en nooit naar de browser gestuurd.' }), inp('anthropicModel', 'Model', { ph: 'claude-sonnet-5-5', help: 'bijv. claude-sonnet-5-5 (snel/goed), claude-opus-5-5 (zwaarste redeneer-modules)' })), inp('anthropicBaseUrl', 'Base URL (optioneel, voor een gateway)')) : null,
        f.provider === 'openai' ? h('div', { style: { marginTop: '14px' } }, h('div', { class: 'grid g2' }, inp('openaiKey', 'API-sleutel', { password: true, ph: c.openai.hasKey ? '•••••••• (ingesteld)' : '' }), inp('openaiModel', 'Model / deployment')), inp('openaiBaseUrl', 'Base URL', { help: 'OpenAI: https://api.openai.com/v1 · Azure: https://<resource>.openai.azure.com/openai/deployments/<deployment>' }), h('div', { class: 'grid g3' }, inp('openaiAuthHeader', 'Auth-header', { help: 'Authorization (Bearer) of api-key (Azure)' }), inp('openaiApiVersion', 'api-version (Azure)'), inp('openaiTokenParam', 'Token-parameter', { help: 'max_completion_tokens of max_tokens' }))) : null,
        f.provider === 'anthropic' || f.provider === 'openai' ? h('div', { style: { maxWidth: '320px', marginTop: '6px' } }, inp('maxOutputTokens', 'Maximum aantal output-tokens', { help: 'Bovengrens per antwoord. Pas aan als je model minder toestaat (bijv. 16000 voor GPT-4o).' })) : null,
        h('div', { class: 'row', style: { marginTop: '14px' } }, c.locked ? null : h('button', { class: 'btn primary', onclick: async () => { try { await api('/config', { method: 'PUT', body: f }); const { loadConfig } = await import('./state.js'); await loadConfig(); toast('Instellingen opgeslagen', 'ok'); render(); } catch (e) { toast(e.message, 'error'); } } }, 'Opslaan'),
          h('button', { class: 'btn ghost', onclick: async (e) => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Testen…'; try { const r = await api('/config/test', { method: 'POST', body: {} }); toast(r.ok ? `Verbinding werkt (${r.ms} ms): "${r.reply}"` : 'Mislukt: ' + r.error, r.ok ? 'ok' : 'error', 7000); } catch (err) { toast(err.message, 'error'); } b.disabled = false; b.textContent = 'Test verbinding'; } }, 'Test verbinding'))),
      h('div', { class: 'card top', style: { marginTop: '20px' } }, h('h3', null, 'Gegevens'), h('p', { class: 'muted' }, 'Pursuits staan als JSON-bestanden in de data-map van de server. Maak regelmatig een back-up (ook bij het wisselen van server).'),
        h('div', { class: 'row' }, h('a', { class: 'btn ghost', href: '/api/backup', download: 'pursuit-navigator-backup.json' }, icon('download', 16), 'Back-up downloaden'),
          h('label', { class: 'btn ghost', style: { cursor: 'pointer' } }, icon('upload', 16), 'Back-up terugzetten', h('input', { type: 'file', accept: '.json', class: 'hidden', onchange: async (e) => { const file = e.target.files[0]; if (!file) return; if (!(await confirmBox('Back-up terugzetten?', 'Pursuits met hetzelfde id worden overschreven.', 'Terugzetten', 'primary'))) return; try { const j = JSON.parse(await file.text()); const r = await api('/backup', { method: 'POST', body: j }); toast(`${r.imported} pursuits teruggezet`, 'ok'); } catch (err) { toast(err.message, 'error'); } } })))),
      h('div', { class: 'card', style: { marginTop: '20px' } }, h('h3', null, 'Over'), h('dl', { class: 'kv' }, h('dt', null, 'Versie'), h('dd', null, c.version), h('dt', null, 'Gebruiker'), h('dd', null, `${S.me?.name} (${S.me?.source === 'sso' ? 'via SSO' : 'lokaal ingesteld'})`), h('dt', null, 'Framework'), h('dd', null, FW.source || '—'), h('dt', null, 'Nog toe te voegen'), h('dd', null, ['M10', 'M11', 'M12', 'M13', 'M14'].filter((m) => !moduleAvailable(m)).join(', ') || 'niets — alle modules hebben prompts'))));
  }
  render();
  return box;
}
