// Pure helpers (no DOM): prompt patching/composition, output parsing, hours maths. Used by the UI and the tests.

export const STAGES = [
  { n: 1, name: 'Understand', nl: 'Begrijpen', modules: ['M1', 'M2'] },
  { n: 2, name: 'Assess', nl: 'Beoordelen', modules: ['M3'] },
  { n: 3, name: 'Propose', nl: 'Voorstellen', modules: ['M4', 'M5'] },
  { n: 4, name: 'Define', nl: 'Definiëren', modules: ['M6'] },
  { n: 5, name: 'Build', nl: 'Bouwen', modules: ['M7', 'M8', 'M9', 'M10'] },
  { n: 6, name: 'Test', nl: 'Testen', modules: ['M11'] },
  { n: 7, name: 'Show', nl: 'Tonen', modules: ['M12', 'M13', 'M14'] },
];
export const stageOf = (modId) => (modId === 'M0' ? 0 : STAGES.find((s) => s.modules.includes(modId))?.n ?? 0);

export const LEDGER_FIELDS = [
  { n: 1, name: 'Case', re: 'Case' },
  { n: 2, name: 'Cast', re: 'Cast' },
  { n: 3, name: 'One truth', re: 'One\\s+truth' },
  { n: 4, name: 'Stage reached', re: 'Stage\\s+reached' },
  { n: 5, name: 'Decisions I took', re: 'Decisions(?:\\s+I\\s+took)?' },
  { n: 6, name: 'Artefacts', re: 'Artefacts?|Artifacts?' },
  { n: 7, name: 'Open — to validate', re: 'Open(?:\\s*[—–-]+\\s*to\\s+validate)?' },
  { n: 8, name: 'Next stage needs', re: 'Next\\s+stage\\s+needs' },
];

export const estimateTokens = (s) => Math.ceil((s || '').length / 3.6);
export const todayIso = () => new Date().toISOString().slice(0, 10);

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function dateEn(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return `${+m[3]} ${MONTHS_EN[+m[2] - 1]} ${m[1]}`;
}

// ---------------------------------------------------------------------------------------------
// Practice mode: the only deviations from the workshop text. Each patch is shown in the Prompt Library.
// ---------------------------------------------------------------------------------------------
export const DEFAULT_BANNER = 'Demonstrator — synthetic data — not production';

export function practicePatches(settings = {}) {
  const banner = settings.banner || DEFAULT_BANNER;
  return [
    { id: 'rules-data', why: 'Workshop-anonimisering verwijderd: echte klantgegevens zijn toegestaan (alleen via de door CGI goedgekeurde AI-omgeving).',
      find: 'Anonymised or synthetic material only; if you see a real name or personal data, say so once and continue without it.',
      replace: 'Real client material is permitted in this workspace (approved enterprise AI tool only). Use personal data only where the pursuit needs it — business roles and work contact details; if you see special-category personal data (health, etc.), say so once and continue without it.' },
    { id: 'client-alias', why: 'Klantnaam in plaats van alias.', find: 'client alias', replace: 'client name' },
    { id: 'm2-cast', why: 'Cast met functie én naam waar de bronnen die geven (geen alias-verplichting).', find: 'The cast, by role alias only — never a name, even where the sources give one:', replace: 'The cast, by role — add the person\'s name in brackets where the sources give one:' },
    { id: 'm2-cast-label', why: 'Idem.', find: 'the role alias itself takes no label', replace: 'the role (and name) itself takes no label' },
    { id: 'm2-persona', why: 'Idem.', find: 'titled by role alias, a hypothesis', replace: 'titled by role, a hypothesis' },
    { id: 'm2-noname', why: 'Idem.', find: 'no name anywhere', replace: 'no name the sources do not give' },
    { id: 'm2-ledger', why: 'Idem.', find: 'six cast lines (alias — wants — will test us on', replace: 'six cast lines (role (name) — wants — will test us on' },
    { id: 'm2-output', why: 'Idem.', find: '(role alias · wants here · will test us on)', replace: '(role · wants here · will test us on)' },
    { id: 'gate-cast', why: 'Idem (Ledger-veld 2).', find: 'one line per role — alias · what they want', replace: 'one line per role — role (name) · what they want' },
    { id: 'm0-check', why: 'Menselijke check aangepast: geen persoonsgegevens buiten zakelijke rollen en contactgegevens.', find: 'No real client name or personal data appears.', replace: 'No personal data appears beyond business roles and work contact details.' },
    { id: 'm2-check', why: 'Idem.', find: 'The cast names roles, not people, and', replace: 'The cast is by role (names only where the sources give them), and' },
    { id: 'm5-cfo', why: 'Geen "no real name"-eis.', find: 'by role, no real name.', replace: 'by role.' },
    { id: 'banner', why: 'Workshop-benaming uit de prototype-banner.', find: 'Workshop demonstrator — synthetic data — not production', replace: banner },
  ];
}

export function patchText(text, settings = {}) {
  if (!text) return '';
  if ((settings.mode || 'practice') !== 'practice') return text;
  let t = text;
  for (const p of practicePatches(settings)) t = t.split(p.find).join(p.replace);
  return t;
}

/** {{DISCIPLINE}} marks the "Workshop output discipline" paragraph; on = keep it, off = full output (as the guides prescribe after the workshop). */
export function applyDiscipline(text, discipline, on) {
  return (text || '').replace(/\{\{DISCIPLINE\}\}/g, on && discipline ? discipline : '').replace(/\n{3,}/g, '\n\n').trim();
}

const PLACEHOLDER = /\[(NOTES|BID EFFORT|MARGIN|CRITERION|MY DRAFT|MY FIGURES|CARD|BLIND SCORES|PASTE THE EVALUATOR PACK HERE|EVALUATOR PACK|PASTE v2 FROM YOUR M4 CHAT|QUESTION 1|CHANGE|PASTE THE DRAFT HERE|CONFIRMED|FIRST RELEASE|FIGURES|SIGN-OFF|COMMERCIAL FACTS|MEETING|OCCASION|REVIEWER|DATE|ROLE|CASE B|M11 LINES)(?: — [^\]]*)?\]/g;
export function fillPlaceholders(text, values = {}) {
  return text.replace(PLACEHOLDER, (all, key) => (values[key] !== undefined && values[key] !== '' ? String(values[key]) : all));
}
export const placeholdersIn = (text) => [...new Set([...(text || '').matchAll(PLACEHOLDER)].map((m) => m[1]))];

/** Final text of a prompt: patched (practice), discipline on/off, placeholders filled. */
export function resolvePrompt(p, settings, values) {
  let t = patchText(p.text, settings);
  t = applyDiscipline(t, patchText(p.discipline || '', settings), !!settings.discipline);
  return fillPlaceholders(t, values);
}

// ---------------------------------------------------------------------------------------------
// Workspace / system prompt
// ---------------------------------------------------------------------------------------------
export function standingInstructions(settings = {}) {
  const practice = (settings.mode || 'practice') === 'practice';
  const lang = settings.language === 'nl'
    ? 'Answer in Dutch, but keep every label (F, A, H, "Not provided — needs validation", "for DCS decision", "rehearsed — not validated", "Next stage needs — for Mx", table headings, field names of the Ledger and the Gate) in English exactly as written.'
    : 'Answer in English';
  return (practice
    ? `This workspace holds my case for the CGI AI-Native DCS pursuit framework. Use only the files in this workspace and what I paste into the chat — never my mail, chats, other files or the web. Label facts F [source], assumptions A and hypotheses H; where the sources are silent, write "Not provided — needs validation". Never decide bid / no-bid, price, margin, staffing or legal terms for me, and never assess a named person. If you see special-category personal data (health, etc.), tell me once and continue without it. If my Ledger's Case says "conditional scenario", start every answer, and any pack written for someone else, with that label. ${lang}${settings.discipline ? ', briefly, in tables where they help.' : ', in tables where they help.'}`
    : `This workspace holds my anonymised case for the AI-Native DCS Academy. Use only the files in this workspace and what I paste into the chat — never my mail, chats, other files or the web. Label facts F [source], assumptions A and hypotheses H; where the sources are silent, write "Not provided — needs validation". Never decide bid / no-bid, price, margin, staffing or legal terms for me, and never assess a named person. If you see a real client name or personal data, tell me once and continue without it. If my Ledger's Case says "conditional scenario", start every answer, and any pack written for someone else, with that label. ${lang}, briefly, in tables where they help.`);
}

export const CASEPACK_KEYS = ['01', '02', '03', '04', '05', '06', 'canvas', 'header'];
export const CASEPACK_TITLES = {
  '01': 'Client brief', '02': 'Opportunity or RFP summary', '03': 'Current state and risks', '04': 'Stakeholder notes',
  '05': 'User reality', '06': 'Evidence themes', canvas: 'Case canvas', header: 'Case header',
};

export function workspaceFiles(p, { scope } = {}) {
  const sc = scope || p.meta?.context || 'both';
  const parts = [];
  const docs = p.casepack?.docs || {};
  if (sc !== 'sources') {
    for (const k of CASEPACK_KEYS) {
      const d = docs[k];
      if (d && d.text && d.include !== false) parts.push(`<file name="Case Pack — ${/^\d/.test(k) ? k + ' ' : ''}${CASEPACK_TITLES[k]}">\n${d.text.trim()}\n</file>`);
    }
  }
  if (sc !== 'casepack') {
    for (const s of p.sources || []) {
      if (s.include === false || !s.text) continue;
      parts.push(`<file name="Source — ${s.name}" type="${s.type || 'document'}"${s.date ? ` date="${s.date}"` : ''}>\n${s.text.trim()}\n</file>`);
    }
  }
  return parts;
}

export function buildSystem(p, settings, scope) {
  const files = workspaceFiles(p, { scope });
  let s = standingInstructions(settings);
  s += '\n\n# WORKSPACE FILES\nThese files are "my case documents in this workspace". Cite them in F tags by number and section (e.g. F [02 §3]) or by file name and page (e.g. F [Tender.pdf p.4]).\n\n';
  s += files.length ? files.join('\n\n') : '(No files in this workspace yet.)';
  return s;
}

/** Merge consecutive same-role messages, drop UI-only ones and empty ones, make sure the first is a user turn. */
export function normalizeMessages(msgs) {
  const out = [];
  for (const m of msgs) {
    if (!m || m.local || m.hidden || !String(m.content || '').trim()) continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += '\n\n' + m.content;
    else out.push({ role, content: String(m.content) });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

// ---------------------------------------------------------------------------------------------
// Markdown helpers for parsing model output
// ---------------------------------------------------------------------------------------------
const splitRow = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim());

export function findTables(md) {
  const lines = String(md || '').split('\n');
  const tables = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\s*\|.*\|\s*$/.test(lines[i]) && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      const header = splitRow(lines[i]);
      const rows = [];
      let j = i + 2;
      while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) rows.push(splitRow(lines[j++]));
      tables.push({ header, rows, start: i, end: j });
      i = j - 1;
    }
  }
  return tables;
}

export const cleanInline = (s) => String(s || '').replace(/\*\*|__|`/g, '').replace(/<br\s*\/?>/gi, ' ').trim();

export function extractStarQuestions(md) {
  const out = [];
  for (const t of findTables(md)) {
    for (const r of t.rows) {
      const joined = r.join(' ');
      if (joined.includes('★')) {
        // the question is the longest cell that is not just a number/star
        const cells = r.map(cleanInline).filter((c) => c && !/^[\d.★\s]+$/.test(c));
        const q = cells.sort((a, b) => b.length - a.length)[0];
        if (q) out.push(q.replace(/★/g, '').replace(/^\s*[\d.)]+\s*/, '').trim());
      }
    }
  }
  return out;
}

/** Text from the heading-like line that contains `re` (e.g. FOR THE EVALUATOR) to the end, minus trailing boilerplate.
 *  The last short matching line wins, so a mention in running prose earlier in the answer is not mistaken for the block. */
export function extractBlock(md, re) {
  const text = String(md || '');
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const g = new RegExp(re.source, flags);
  let best = -1, any = -1, m;
  while ((m = g.exec(text))) {
    const ls = text.lastIndexOf('\n', m.index) + 1;
    let le = text.indexOf('\n', m.index); if (le < 0) le = text.length;
    any = ls;
    if (le - ls <= 90) best = ls;
  }
  const start = best >= 0 ? best : any;
  if (start < 0) return '';
  return text.slice(start).replace(/\n*Further detail available on request\.?\s*$/i, '').trim();
}

export function extractCodeBlocks(md) {
  const out = [];
  const re = /```([a-zA-Z0-9]*)\n([\s\S]*?)(?:```|$)/g;
  let m;
  while ((m = re.exec(md || ''))) out.push({ lang: (m[1] || '').toLowerCase(), code: m[2].replace(/\n$/, ''), closed: m[0].endsWith('```') });
  return out;
}
export function extractHtml(md) {
  const blocks = extractCodeBlocks(md).filter((b) => /<!doctype html|<html/i.test(b.code));
  if (blocks.length) { const b = blocks[blocks.length - 1]; return { html: b.code, complete: /<\/html>\s*$/i.test(b.code.trim()) }; }
  const m = /<!DOCTYPE html[\s\S]*$/i.exec(md || '');
  if (m) return { html: m[0].trim(), complete: /<\/html>\s*$/i.test(m[0].trim()) };
  return null;
}

export function nextStageNeeds(text) {
  const out = [];
  for (const m of String(text || '').matchAll(/Next stage needs\s*[—–-]\s*for\s+(M\d+(?:\s*(?:and|,|&)\s*M\d+)*)\s*:?\s*([^\n]*)/gi)) {
    out.push({ for: m[1].replace(/\s+/g, ' '), text: m[2].trim() });
  }
  return out;
}

/** Everything that says "Not provided — needs validation", with its surrounding line. */
export function findGaps(text, limit = 60) {
  const out = [];
  for (const line of String(text || '').split('\n')) {
    if (/Not provided\s*[—–-]\s*needs validation/i.test(line)) out.push(cleanInline(line).slice(0, 220));
    if (out.length >= limit) break;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Gate parsing: (1) human checks · (2) workflow row · (3) Pursuit Ledger
// ---------------------------------------------------------------------------------------------
const fieldRe = (f) => new RegExp(`(?:^|\\n)[ \\t>]*(?:[-*]\\s+)?(?:#{1,6}\\s*)?(?:\\*\\*|__)?\\s*${f.n}\\s*[.:)·\\-]?\\s*(?:\\*\\*|__)?\\s*(?:${f.re})(?![A-Za-z])`, 'i');

export function parseLedger(text) {
  const raw = String(text || '').replace(/```[a-z]*\n?/g, '').replace(/\r/g, '');
  const pos = [];
  let from = 0;
  for (const f of LEDGER_FIELDS) {
    const m = fieldRe(f).exec(raw.slice(from));
    if (!m) { pos.push(null); continue; }
    const start = from + m.index + (raw[from + m.index] === '\n' ? 1 : 0);
    pos.push({ f, start, end: from + m.index + m[0].length });
    from = from + m.index + m[0].length;
  }
  const found = pos.filter(Boolean);
  if (found.length < 5) return null;
  const fields = {};
  found.forEach((p, i) => {
    const next = found[i + 1];
    let body = raw.slice(p.end, next ? next.start : raw.length);
    body = body.replace(/^\s*(?:\*\*|__)?\s*[:：\-—–]?\s*/, '').replace(/^\s*\*\*\s*/, '').trim();
    fields[p.f.n] = body.replace(/\n*Further detail available on request\.?\s*$/i, '').trim();
  });
  const first = found[0].start;
  const ledgerText = raw.slice(first).replace(/\n*Further detail available on request\.?\s*$/i, '').trim();
  return { text: ledgerText, fields, complete: found.length === 8 };
}

export function parseGate(raw) {
  const text = String(raw || '').replace(/\r/g, '').replace(/^> \*\*DEMO-OUTPUT\*\*[^\n]*\n\n?/, '');
  const ledger = parseLedger(text);
  let ledgerStart = ledger ? text.indexOf(ledger.text.slice(0, 40)) : -1;
  if (ledger && ledgerStart < 0) ledgerStart = text.length;
  const tables = findTables(text);
  const wf = tables.find((t) => t.header.some((h) => /trigger/i.test(h)) && t.header.some((h) => /output/i.test(h)));
  let row = null;
  if (wf && wf.rows[0]) {
    const keys = ['stage', 'module', 'trigger', 'input', 'skill', 'humanCheck', 'output'];
    row = {};
    keys.forEach((k, i) => { row[k] = cleanInline(wf.rows[0][i] || ''); });
  }
  const lines = text.split('\n');
  const checksEnd = wf ? wf.start : (ledgerStart >= 0 ? text.slice(0, ledgerStart).split('\n').length : lines.length);
  const checks = lines.slice(0, checksEnd)
    .map((l) => l.trim())
    .filter((l) => l && !/^#{1,6}\s*\(?\d\)?/.test(l) && !/^\(?\d\)?\s*(the )?human checks?/i.test(l) && !/^\*\*\(?\d\)?/.test(l))
    .map((l) => l.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, ''))
    .filter((l) => l.length > 3);
  return { checks, row, ledger, ok: { checks: checks.length > 0, row: !!row, ledger: !!ledger && ledger.complete } };
}

/** Lines of "Open — to validate" as { what, with, by } where the model used "what · with whom · by when". */
export function parseOpenItems(fieldText) {
  const items = [];
  for (let line of String(fieldText || '').split('\n')) {
    line = line.replace(/^[\s>*•-]+/, '').replace(/^\d+[.)]\s*/, '').trim();
    if (!line || line === '—') continue;
    let parts = line.split(/\s+[·|]\s+/);
    if (parts.length < 3) parts = line.split(/\s+[—–]\s+/);
    items.push({ text: cleanInline(line), what: cleanInline(parts[0] || line), who: cleanInline(parts[1] || '').replace(/^with\s+/i, ''), when: cleanInline(parts.slice(2).join(' — ') || '').replace(/^by\s+/i, '') });
  }
  return items;
}

// ---------------------------------------------------------------------------------------------
// Decisions, hours
// ---------------------------------------------------------------------------------------------
export function decisionLine(dec) {
  if (!dec || !String(dec.text || '').trim()) return '';
  const conds = (dec.conditions || []).filter((c) => String(c.text || '').trim());
  let s = `Decision: ${dec.text.trim()}`;
  if (conds.length) s += ', with these conditions — ' + conds.map((c) => `${c.text.trim()} — owner ${c.owner || '[role]'} — by ${dateEn(c.due) || '[date]'}`).join('; ') + '.';
  else if (!/[.!?]$/.test(s)) s += '.';
  if (dec.flip && String(dec.flip.text || '').trim()) s += `\nFlip fact to watch: ${dec.flip.text.trim()} — owner ${dec.flip.owner || '[role]'} — by ${dateEn(dec.flip.due) || '[date]'}.`;
  return s;
}

/** Same reading as the Excel template: a number first ("12", "12h", "35–40" → low end); words are not counted. */
export function parseHours(s) {
  if (s === null || s === undefined) return null;
  if (typeof s === 'number') return s;
  const first = String(s).trim().split(/\s+/)[0].toLowerCase().replace(/[h~≈]/g, '').replace(',', '.');
  if (!first) return null;
  const low = first.split(/[–-]/)[0];
  const n = parseFloat(low);
  return Number.isFinite(n) && /^\d/.test(low) ? n : null;
}
export function hoursSummary(hours = {}) {
  let sum = 0, counted = 0;
  const per = [];
  for (let i = 1; i <= 7; i++) { const v = parseHours(hours['s' + i]); per.push(v); if (v !== null) { sum += v; counted++; } }
  return { per, sum, counted };
}

export function ledgerBlock(p) {
  const cur = p.ledger?.current;
  if (!cur || !cur.text) return '';
  let t = cur.text;
  const met = (p.evidence || []).filter((e) => e.text && !e.applied);
  if (met.length) t += '\n\n' + met.map((e) => e.text).join('\n');
  return t;
}

export function fmtTokens(n) { return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n); }
