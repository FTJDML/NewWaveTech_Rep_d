// Markdown → .docx (Word) without libraries: WordprocessingML written by hand, zipped with the stored-zip writer.
import { zipStore } from './zip.js';

const PURPLE = '5236AB', RED = 'E31937', INK = '1F1D2B';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// control characters are not allowed in XML 1.0
const clean = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '');

function run(text, o = {}) {
  const pr = [];
  if (o.font) pr.push(`<w:rFonts w:ascii="${o.font}" w:hAnsi="${o.font}" w:cs="${o.font}"/>`);
  if (o.b) pr.push('<w:b/>');
  if (o.i) pr.push('<w:i/>');
  if (o.color) pr.push(`<w:color w:val="${o.color}"/>`);
  if (o.size) pr.push(`<w:sz w:val="${o.size}"/><w:szCs w:val="${o.size}"/>`);
  const parts = clean(text).split('\n');
  return parts.map((t, i) => `<w:r>${pr.length ? `<w:rPr>${pr.join('')}</w:rPr>` : ''}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`).join('');
}
function inline(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|(?:^|[^*\w])\*[^*\n]+\*(?![*\w]))/g;
  let last = 0, m;
  const t = clean(text);
  while ((m = re.exec(t))) {
    let tok = m[0], pre = '';
    if (!tok.startsWith('**') && !tok.startsWith('`') && !tok.startsWith('*')) { pre = tok[0]; tok = tok.slice(1); }
    if (m.index + (pre ? 0 : 0) > last) out.push(run(t.slice(last, m.index), base));
    if (pre) out.push(run(pre, base));
    if (tok.startsWith('**')) out.push(run(tok.slice(2, -2), { ...base, b: true }));
    else if (tok.startsWith('`')) out.push(run(tok.slice(1, -1), { ...base, font: 'Consolas', size: 18 }));
    else out.push(run(tok.slice(1, -1), { ...base, i: true }));
    last = m.index + m[0].length;
  }
  if (last < t.length) out.push(run(t.slice(last), base));
  return out.join('') || run('', base);
}
function para(inner, o = {}) {
  const pr = [];
  if (o.style) pr.push(`<w:pStyle w:val="${o.style}"/>`);
  if (o.pageBreak) pr.push('<w:pageBreakBefore/>');
  if (o.num) pr.push(`<w:numPr><w:ilvl w:val="${o.num.lvl || 0}"/><w:numId w:val="${o.num.id}"/></w:numPr>`);
  if (o.shade) pr.push(`<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>`);
  if (o.borderLeft) pr.push(`<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="${PURPLE}"/></w:pBdr>`);
  if (o.borderBottom) pr.push(`<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D9D9E3"/></w:pBdr>`);
  if (o.indent) pr.push(`<w:ind w:left="${o.indent}"/>`);
  if (o.after !== undefined) pr.push(`<w:spacing w:after="${o.after}"/>`);
  return `<w:p>${pr.length ? `<w:pPr>${pr.join('')}</w:pPr>` : ''}${inner}</w:p>`;
}
const CONTENT_W = 9638;
function table(rows) {
  const cols = Math.max(...rows.map((r) => r.length)), w = Math.floor(CONTENT_W / cols);
  const b = (n) => `<w:${n} w:val="single" w:sz="4" w:space="0" w:color="D9D9E3"/>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${CONTENT_W}" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${Array(cols).fill(`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>` +
    rows.map((r, ri) => `<w:tr>${ri === 0 ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${Array.from({ length: cols }, (_, ci) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${ri === 0 ? `<w:shd w:val="clear" w:color="auto" w:fill="${PURPLE}"/>` : ri % 2 === 0 ? '<w:shd w:val="clear" w:color="auto" w:fill="F4F3FB"/>' : ''}</w:tcPr>${para(inline(String(r[ci] || '').replace(/<br\s*\/?>/gi, '\n'), ri === 0 ? { b: true, color: 'FFFFFF', size: 18 } : { size: 18 }), { after: 0 })}</w:tc>`).join('')}</w:tr>`).join('') + '</w:tbl>';
}
function splitRow(l) {
  const s = l.trim().replace(/^\|/, '').replace(/\|$/, '');
  const out = []; let cur = '';
  for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch === '\\' && s[i + 1] === '|') { cur += '|'; i++; } else if (ch === '|') { out.push(cur.trim()); cur = ''; } else cur += ch; }
  out.push(cur.trim());
  return out;
}

/** Markdown → { xml, orderedLists } (body XML of word/document.xml). */
export function mdToXml(md, state = { ordered: 0 }) {
  const lines = String(md || '').replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if (/^```/.test(l)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      for (const b of buf.slice(0, 500)) out.push(para(run(b || ' ', { font: 'Consolas', size: 16 }), { shade: 'F4F4F7', after: 0 }));
      out.push(para('', { after: 120 }));
      continue;
    }
    if ((m = /^(#{1,4})\s+(.*)$/.exec(l))) { out.push(para(inline(m[2].replace(/\*\*/g, '')), { style: 'Heading' + m[1].length })); i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const rows = [splitRow(l)]; i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(splitRow(lines[i++]));
      out.push(table(rows), para('', { after: 120 }));
      continue;
    }
    if (/^\s*([-*•])\s+/.test(l)) {
      while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) { const mm = /^(\s*)[-*•]\s+(.*)$/.exec(lines[i]); out.push(para(inline(mm[2]), { num: { id: 1, lvl: Math.min(2, Math.floor(mm[1].length / 2)) }, after: 40 })); i++; }
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(l)) {
      const id = 10 + state.ordered++;
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { out.push(para(inline(lines[i].replace(/^\s*\d+[.)]\s+/, '')), { num: { id }, after: 40 })); i++; }
      continue;
    }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(para(inline(buf.join(' '), { i: true }), { borderLeft: true, indent: 360 }));
      continue;
    }
    if (/^---+$/.test(l.trim())) { out.push(para('', { borderBottom: true })); i++; continue; }
    const buf = [l]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*\||\s*[-*•]\s|\s*\d+[.)]\s|>)/.test(lines[i])) buf.push(lines[i++]);
    out.push(para(inline(buf.join(' ')), { after: 120 }));
  }
  return out.join('');
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="${INK}"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
${[['Title', 44, INK, 0, 120], ['Heading1', 32, PURPLE, 0, 140], ['Heading2', 26, INK, 1, 100], ['Heading3', 23, PURPLE, 2, 80], ['Heading4', 21, INK, 3, 60]].map(([id, sz, col, lvl, after]) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${id === 'Title' ? 'Title' : 'heading ' + id.slice(-1)}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${id === 'Title' ? 0 : 280 - lvl * 40}" w:after="${after}"/>${id === 'Title' ? '' : `<w:outlineLvl w:val="${lvl}"/>`}</w:pPr><w:rPr><w:b/><w:color w:val="${col}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:style>`).join('')}
</w:styles>`;

function numbering(orderedCount) {
  const lvls = (fmt, txt) => [0, 1, 2].map((l) => `<w:lvl w:ilvl="${l}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${fmt === 'bullet' ? ['•', '–', '·'][l] : '%' + (l + 1) + '.'}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${540 + l * 360}" w:hanging="270"/></w:pPr></w:lvl>`).join('');
  let x = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${lvls('bullet')}</w:abstractNum><w:abstractNum w:abstractNumId="2"><w:multiLevelType w:val="hybridMultilevel"/>${lvls('decimal')}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>`;
  for (let k = 0; k < orderedCount; k++) x += `<w:num w:numId="${10 + k}"><w:abstractNumId w:val="2"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`;
  return x + '</w:numbering>';
}

/** { title, subtitle, sections:[{title, markdown, pageBreak}] } → Blob (.docx) */
export function buildDocxBlob({ title, subtitle, sections, brand }) {
  const state = { ordered: 0 };
  let body = para((brand ? run(brand, { b: true, color: RED, size: 28 }) + run('  ·  ', { color: PURPLE, size: 22 }) : '') + run('Pursuit Navigator', { color: PURPLE, size: 22 }), { after: 60 }) + para(inline(title || 'Pursuit dossier'), { style: 'Title' });
  if (subtitle) body += para(run(subtitle, { color: '6B6B7B', size: 20 }), { after: 240 });
  for (const s of sections || []) body += para(inline(s.title), { style: 'Heading1', pageBreak: !!s.pageBreak }) + mdToXml(s.markdown, state);
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const enc = new TextEncoder();
  const files = [
    { name: '[Content_Types].xml', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>') },
    { name: '_rels/.rels', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>') },
    { name: 'word/_rels/document.xml.rels', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>') },
    { name: 'word/document.xml', data: enc.encode(doc) },
    { name: 'word/styles.xml', data: enc.encode(STYLES) },
    { name: 'word/numbering.xml', data: enc.encode(numbering(state.ordered)) },
  ];
  return new Blob([zipStore(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
