import { h, icon, toast, modal, confirmBox, fmtDate, relTime, daysUntil, uid, autoGrow, clear } from './ui.js';
import { S, api, createPursuit, loadList, patch } from './state.js';
import { STAGES, todayIso, estimateTokens, fmtTokens } from './engine.js';
import { ROUTES } from './flows.js';
import { FW } from './framework.js';
import { nextModule, progress, stageState, allConditions, dueState, modTitle } from './helpers.js';
import { sourceAdder, SOURCE_TYPES } from './views-sources.js';

const stagebar = (p) => h('div', { class: 'stagebar', title: 'Voortgang over de 7 stages' }, STAGES.map((s) => h('i', { class: stageState(p, s.n) })));

// ------------------------------------------------------------------------------------------------
export async function viewDashboard() {
  const list = S.list;
  const late = [];
  for (const s of list) for (const c of s.conditions || []) { const d = daysUntil(c.due, s.meta?.caseDate); if (d !== null && d <= 7) late.push({ s, c, d }); }
  late.sort((a, b) => a.d - b.d);

  const hero = h('section', { class: 'hero' },
    h('div', null,
      h('div', { class: 'eyebrow red' }, 'CGI · AI-Native DCS'),
      h('h1', null, 'Win de opportunity — ', h('em', null, 'niet alleen de RFP.')),
      h('p', { class: 'lead' }, 'Eén werkruimte voor je hele pursuit: lever de RFP en je klantgesprekken aan, doorloop de zeven stages en laat AI kritisch meekijken. Eén Ledger, één waarheid — geen Excel- en Word-bestanden meer.'),
      h('div', { class: 'row', style: { marginTop: '18px' } },
        h('a', { class: 'btn primary lg', href: '#/new' }, icon('plus', 20), 'Nieuwe pursuit'),
        h('button', { class: 'btn outline lg', onclick: loadDemo }, icon('book', 20), 'Probeer de voorbeeldcase'))),
    h('div', { class: 'hero-art' }, h('h4', null, 'Zeven stages, één pursuit'),
      h('div', { class: 'hero-stages' }, STAGES.map((s) => h('div', null, h('b', null, s.n), h('span', null, `${s.name} `, h('small', { style: { opacity: .75 } }, '· ' + s.modules.join(' · '))))))));

  const cards = list.length
    ? h('div', { class: 'grid g3' }, list.map(pursuitCard))
    : h('div', { class: 'empty' }, h('h3', null, 'Nog geen pursuits'), h('p', null, 'Start met een RFP of opportunity-omschrijving — of kijk eerst rond in de voorbeeldcase.'));

  const how = h('div', { class: 'grid g3', style: { marginTop: '10px' } },
    [['1', 'Lever aan', 'Upload de RFP, plak je gespreksnotities en samenvattingen. De app bouwt er het Case Pack uit (01–06) met F/A/H-labels en markeert wat er ontbreekt.'],
      ['2', 'Doorloop de stages', 'Per module draait de officiële Workflow Skill automatisch: simulaties, blinde evaluatoren in aparte chats, de gate die je Ledger bijwerkt.'],
      ['3', 'Beslis zelf', 'Het model adviseert, jij beslist. Voorwaarden krijgen een eigenaar en een datum; de cockpit bewaakt ze en toont wat nog gevalideerd moet worden.']]
      .map(([n, t, d]) => h('div', { class: 'card top' }, h('div', { class: 'eyebrow' }, 'Stap ' + n), h('h3', null, t), h('p', { class: 'muted' }, d))));

  const c = S.config;
  const noAi = c && c.provider !== 'mock' && (c.provider === 'manual' || !c.hasKey);
  return h('div', null, hero,
    noAi ? h('div', { class: 'callout amber', style: { marginBottom: '22px' } }, h('b', null, 'Nog geen AI-koppeling'), 'De app werkt nu in kopieer-modus: je plakt prompts zelf in je AI-tool. Stel een koppeling in via ', h('a', { href: '#/settings' }, 'Instellingen'), ' (Claude, Azure OpenAI of een interne gateway) voor de volledig geautomatiseerde flow.') : null,
    late.length ? h('div', { class: 'callout red', style: { marginBottom: '22px' } }, h('b', null, 'Aandacht nodig'), late.slice(0, 5).map((x) => h('div', null, h('a', { href: '#/p/' + x.s.id }, x.s.meta.client || x.s.meta.title), ' — ', x.c.text, ' ', h('span', { class: 'chip ' + (x.d < 0 ? 'red' : 'amber') }, x.d < 0 ? `${-x.d} d te laat` : x.d === 0 ? 'vandaag' : `over ${x.d} d`), x.c.owner ? h('span', { class: 'muted' }, ' · ' + x.c.owner) : null))) : null,
    h('div', { class: 'row between', style: { marginBottom: '12px' } }, h('h2', { style: { margin: 0 } }, 'Mijn pursuits'), list.length ? h('a', { class: 'btn ghost sm', href: '#/new' }, icon('plus', 15), 'Nieuw') : null),
    cards,
    h('h2', { style: { margin: '36px 0 12px' } }, 'Hoe het werkt'), how);
}

function pursuitCard(s) {
  const p = { modules: Object.fromEntries([...(s.done || []).map((m) => [m, { status: 'done' }]), ...(s.doing || []).map((m) => [m, { status: 'doing' }])]) };
  const nx = nextModule(p);
  const sub = daysUntil(s.meta?.submissionDate);
  return h('a', { class: 'card top pcard', href: '#/p/' + s.id },
    h('div', { class: 'row between nowrap' }, h('span', { class: 'client' }, s.meta?.client || 'Nieuwe klant'), h('span', { class: 'chip purple' }, ROUTES[s.meta?.route] || 'Tender / RFP')),
    h('h3', null, s.meta?.title || '(zonder titel)'),
    stagebar(p),
    h('div', { class: 'row' }, h('span', { class: 'stat' }, icon('check', 15), h('b', null, `${(s.done || []).length}`), ' modules klaar'), h('span', { class: 'stat' }, icon('file', 15), h('b', null, s.sources), ' bronnen'), s.openConditions ? h('span', { class: 'stat' }, icon('flag', 15), h('b', null, s.openConditions), ' open voorwaarden') : null),
    h('div', { class: 'row between', style: { marginTop: 'auto' } },
      h('span', { class: 'small muted' }, nx ? 'Volgende: ' + nx + ' · ' + modTitle(nx) : 'Alle modules afgerond'),
      sub !== null ? h('span', { class: 'chip ' + (sub < 0 ? 'red' : sub <= 14 ? 'amber' : '') }, sub < 0 ? 'inschrijving voorbij' : `inschrijving over ${sub} d`) : null),
    h('div', { class: 'xs muted' }, (s.owner ? s.owner + ' · ' : '') + 'bijgewerkt ' + relTime(s.updatedAt)));
}

async function loadDemo() {
  try {
    const demo = await (await fetch('/data/demo-velmora.json')).json();
    const exists = S.list.find((x) => x.meta?.demo);
    if (exists) { location.hash = '#/p/' + exists.id; return; }
    const d = await createPursuit({ meta: { ...demo.meta, mode: 'practice', discipline: false }, casepack: demo.casepack });
    toast('Voorbeeldcase geladen (fictieve gegevens)', 'ok');
    location.hash = '#/p/' + d.id;
  } catch (e) { toast('Laden mislukt: ' + e.message, 'error'); }
}

// ------------------------------------------------------------------------------------------------
export async function viewNew() {
  const v = { client: '', title: '', route: 'tender', sector: '', role: 'DCS', submissionDate: '', decisionDate: '', caseDate: '', mode: 'practice' };
  const sources = [];
  const inp = (key, label, props = {}) => h('div', { class: 'field' }, h('label', { class: 'f' }, label, props.required ? h('span', { class: 'req' }, ' *') : null), h('input', { type: props.type || 'text', value: v[key], placeholder: props.ph || '', oninput: (e) => { v[key] = e.target.value; } }), props.help ? h('div', { class: 'help' }, props.help) : null);
  const routeSel = h('select', { onchange: (e) => { v.route = e.target.value; } }, Object.entries(ROUTES).map(([k, l]) => h('option', { value: k, selected: k === v.route }, l)));
  const list = h('div', null);
  const refresh = () => {
    clear(list);
    if (!sources.length) list.append(h('div', { class: 'muted small' }, 'Nog geen bronnen toegevoegd. Je kunt dat ook later doen.'));
    sources.forEach((s, i) => list.append(h('div', { class: 'src-item' }, h('div', { class: 'ico' }, icon('file', 20)), h('div', { class: 'grow' }, h('b', null, s.name), h('div', { class: 'small muted' }, `${SOURCE_TYPES[s.type] || s.type} · ${fmtTokens(estimateTokens(s.text))} tokens`)), h('button', { class: 'icon-btn', onclick: () => { sources.splice(i, 1); refresh(); }, 'aria-label': 'Verwijder' }, icon('trash', 17)))));
  };
  refresh();
  const submit = async (e) => {
    e.preventDefault();
    if (!v.client.trim() && !v.title.trim()) { toast('Geef minimaal een klantnaam of titel op', 'error'); return; }
    const btn = e.submitter; if (btn) btn.disabled = true;
    try {
      const d = await createPursuit({ meta: { ...v, client: v.client.trim(), title: v.title.trim() || v.client.trim(), discipline: false, language: 'en', context: 'both' }, sources: sources.map((s) => ({ ...s, id: uid('s'), addedAt: new Date().toISOString(), include: true })) });
      location.hash = '#/p/' + d.id + (sources.length ? '/casepack?build=1' : '');
    } catch (err) { toast(err.message, 'error'); if (btn) btn.disabled = false; }
  };
  return h('div', { style: { maxWidth: '980px' } },
    h('a', { href: '#/', class: 'small' }, '← Alle pursuits'),
    h('h1', { style: { margin: '.3em 0' } }, 'Nieuwe pursuit'),
    h('p', { class: 'muted', style: { maxWidth: '62ch' } }, 'Begin met de basis en voeg de bronnen toe: de RFP of opportunity-omschrijving, klantgesprekken en samenvattingen. De app zet ze om in het Case Pack — de vaste vorm waarop alle modules draaien.'),
    h('form', { onsubmit: submit, class: 'stack' },
      h('div', { class: 'card top' }, h('div', { class: 'eyebrow' }, '1 · De pursuit'),
        h('div', { class: 'grid g2' }, inp('client', 'Klant', { required: true, ph: 'bijv. Gemeente Utrecht' }), inp('title', 'Opportunity', { ph: 'bijv. Moderniseren vergunningverlening' }),
          h('div', { class: 'field' }, h('label', { class: 'f' }, 'Route'), routeSel, h('div', { class: 'help' }, 'Bepaalt hoe de modules lezen (tender, renewal, change request …).')),
          inp('sector', 'Sector', { ph: 'bijv. Overheid, 1.500 medewerkers' }), inp('role', 'Mijn rol', { ph: 'DCS on the bid' }),
          inp('submissionDate', 'Inschrijfdatum / deadline', { type: 'date' }), inp('decisionDate', 'Verwachte gunning', { type: 'date' }),
          inp('caseDate', 'Casusdatum (alleen voor een afgesloten casus)', { type: 'date', help: 'Leeg laten bij een lopende pursuit. Bij een casus uit het verleden leest het framework data hiertegen.' }))),
      h('div', { class: 'card top' }, h('div', { class: 'eyebrow' }, '2 · Bronnen'), h('p', { class: 'muted' }, 'RFP, opportunity-omschrijving, klantgesprekken, samenvattingen, e-mails, Q&A. Echte klantgegevens zijn toegestaan — gebruik alleen de door CGI goedgekeurde AI-omgeving (zie Instellingen).'),
        sourceAdder((s) => { sources.push(s); refresh(); }), list),
      h('div', { class: 'row' }, h('button', { class: 'btn primary lg', type: 'submit' }, 'Pursuit aanmaken', icon('arrowRight', 18)), h('a', { class: 'btn ghost lg', href: '#/' }, 'Annuleren'))));
}

// ------------------------------------------------------------------------------------------------
export async function viewHelp() {
  const sec = (t, ...c) => h('div', { class: 'card top', style: { marginBottom: '16px' } }, h('h3', null, t), ...c);
  return h('div', { style: { maxWidth: '980px' } },
    h('div', { class: 'eyebrow red' }, 'Help'), h('h1', null, 'Zo werkt de Pursuit Navigator'),
    h('p', { class: 'lead muted' }, 'De tool automatiseert het AI-Native DCS-framework: dezelfde modules, Workflow Skills, simulaties en gates — zonder kopiëren tussen Excel, Word en een AI-chat.'),
    sec('De drie dingen die nooit veranderen', h('div', { class: 'callout red' }, h('ul', { style: { margin: 0, paddingLeft: '1.1em' } },
      h('li', null, 'Het model rekent nooit een cijfer uit dat jij niet gaf, beslist nooit over een bid, prijs of juridische vraag, en beoordeelt nooit een persoon met naam.'),
      h('li', null, 'Elke simulatie is "rehearsed — not validated" tot een echt gesprek.'),
      h('li', null, 'Een besluit heeft per voorwaarde een eigenaar en een kalenderdatum.')))),
    sec('De route in vier stappen',
      h('ol', null, h('li', null, h('b', null, 'Bronnen & Case Pack'), ' — upload de RFP en gesprekken; de AI structureert ze in documenten 01–06 met §-nummering.'),
        h('li', null, h('b', null, 'M0'), ' — setup-check en Ledger v0 (of "Snelstart" op het overzicht).'),
        h('li', null, h('b', null, 'M2 → M13'), ' — per module draaien de skills en simulaties; je sluit af met het gate.'),
        h('li', null, h('b', null, 'Cockpit'), ' — Ledger, voorwaarden, open punten en de workflow-map zijn altijd actueel.'))),
    sec('Labels die je overal ziet', h('div', { class: 'stack tight' },
      h('div', null, h('span', { class: 'tag tag-F' }, 'F'), ' Feit, met een bron die je kunt openen. ', h('span', { class: 'tag tag-A' }, 'A'), ' Aanname. ', h('span', { class: 'tag tag-H' }, 'H'), ' Hypothese om te valideren. Zonder label is het onbewezen.'),
      h('div', null, h('span', { class: 'chip gap' }, 'Not provided — needs validation'), ' Een gat in je bronnen: dit is een vraag voor je volgende klantcontact, geen fout.'),
      h('div', null, h('span', { class: 'chip rehearsed' }, 'rehearsed — not validated'), ' Een simulatie. Waar na een echt gesprek, eerder niet.'),
      h('div', null, h('span', { class: 'chip decide' }, 'for DCS decision'), ' Een punt waar het model niet over beslist — dat ben jij.'))),
    sec('Pursuit Ledger & gate', h('p', null, 'De Ledger is het "estafettestokje" tussen modules: acht velden (Case · Cast · One truth · Stage reached · Decisions I took · Artefacts · Open — to validate · Next stage needs). Elke module sluit met het gate: dat toetst de menselijke checks, schrijft één workflow-rij voor je map en een nieuwe Ledger. De app toont het resultaat eerst ter controle; pas na jouw bevestiging wordt het de nieuwe waarheid.')),
    sec('Privé-chats en blinde evaluatoren', h('p', null, 'Waar de gids een "private chat" vraagt (evaluator, simulaties met alleen een pack), start de app automatisch een aparte aanroep die alleen krijgt wat de kaart zegt — zonder je Ledger, documenten of eerdere chats. Zo scoort de evaluator echt blind.')),
    sec('Werkwijze vs. workshop', h('p', null, 'In "Praktijk"-modus (standaard) zijn de prompts letterlijk de workshop-prompts, met alleen deze aanpassingen: geen anonimiseringsplicht (echte namen en cijfers mogen), en geen woordlimiet-blok "Workshop output discipline" (de gidsen schrijven zelf voor dat je dat na de workshop weglaat). Elke afwijking is zichtbaar en omkeerbaar in de Bibliotheek en per pursuit via Instellingen.')),
    sec('Privacy & AI-omgeving', h('p', null, 'Gebruik uitsluitend een door CGI goedgekeurde AI-omgeving (zakelijke tenant). De server bewaart je pursuits lokaal (map data/) en stuurt per aanroep alleen de relevante tekst naar de AI-provider. In twijfel over een document? Vraag eerst je account lead.')));
}
