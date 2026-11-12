import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType,
  AlignmentType, ShadingType, BorderStyle, LevelFormat, Footer, PageNumber,
} from 'docx';

const PURPLE = '5236AB', RED = 'E31937', INK = '1F1F2E';
const CONTENT_W = 9638; // A4, 2 cm margins, DXA

function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|(?<![*\w])\*[^*\n]+\*(?!\w)|(?<![\w])_[^_\n]+_(?!\w))/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else if (t.startsWith('`')) out.push(new TextRun({ text: t.slice(1, -1), font: 'Consolas', size: 18, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out.length ? out : [new TextRun({ text: '', ...base })];
}

const thin = { style: BorderStyle.SINGLE, size: 4, color: 'D9D9E3' };
const borders = { top: thin, bottom: thin, left: thin, right: thin };

function tableFrom(rows) {
  const cols = Math.max(...rows.map((r) => r.length));
  const w = Math.floor(CONTENT_W / cols);
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: Array(cols).fill(w),
    rows: rows.map((r, ri) => new TableRow({
      tableHeader: ri === 0,
      children: Array.from({ length: cols }, (_, ci) => new TableCell({
        width: { size: w, type: WidthType.DXA }, borders,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        shading: ri === 0 ? { type: ShadingType.CLEAR, fill: PURPLE, color: 'auto' } : (ri % 2 === 0 ? { type: ShadingType.CLEAR, fill: 'F4F3FB', color: 'auto' } : undefined),
        children: [new Paragraph({ children: runs((r[ci] || '').replace(/<br\s*\/?>/gi, '\n'), ri === 0 ? { bold: true, color: 'FFFFFF', size: 18 } : { size: 18 }) })],
      })),
    })),
  });
}

const splitRow = (l) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

export function mdToBlocks(md) {
  const lines = String(md || '').replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0, listInst = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = /^```/.exec(l))) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      for (const b of buf.slice(0, 400)) out.push(new Paragraph({ spacing: { after: 0 }, shading: { type: ShadingType.CLEAR, fill: 'F4F4F7', color: 'auto' }, children: [new TextRun({ text: b || ' ', font: 'Consolas', size: 16 })] }));
      out.push(new Paragraph({ children: [] }));
      continue;
    }
    if ((m = /^(#{1,4})\s+(.*)$/.exec(l))) {
      const lvl = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][m[1].length - 1];
      out.push(new Paragraph({ heading: lvl, children: runs(m[2].replace(/\*\*/g, '')) }));
      i++; continue;
    }
    if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const rows = [splitRow(l)]; i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(splitRow(lines[i++]));
      out.push(tableFrom(rows)); out.push(new Paragraph({ children: [] }));
      continue;
    }
    if (/^\s*([-*•])\s+/.test(l)) {
      while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) {
        const mm = /^(\s*)[-*•]\s+(.*)$/.exec(lines[i]);
        out.push(new Paragraph({ numbering: { reference: 'bullets', level: Math.min(2, Math.floor(mm[1].length / 2)) }, children: runs(mm[2]) }));
        i++;
      }
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(l)) {
      listInst++;
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        out.push(new Paragraph({ numbering: { reference: 'numbers', level: 0, instance: listInst }, children: runs(lines[i].replace(/^\s*\d+[.)]\s+/, '')) }));
        i++;
      }
      continue;
    }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(new Paragraph({ indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: PURPLE, space: 8 } }, children: runs(buf.join(' '), { italics: true }) }));
      continue;
    }
    if (/^---+$/.test(l.trim())) { out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D9D9E3', space: 1 } }, children: [] })); i++; continue; }
    const buf = [l]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*\||\s*[-*•]\s|\s*\d+[.)]\s|>)/.test(lines[i])) buf.push(lines[i++]);
    out.push(new Paragraph({ spacing: { after: 120 }, children: runs(buf.join(' ')) }));
  }
  return out;
}

export async function buildDocx({ title, subtitle, sections }) {
  const children = [
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'CGI', bold: true, color: RED, size: 28 }), new TextRun({ text: '  ·  Pursuit Navigator', color: PURPLE, size: 22 })] }),
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: title || 'Pursuit dossier' })] }),
  ];
  if (subtitle) children.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: subtitle, color: '6B6B7B', size: 20 })] }));
  for (const s of sections || []) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: !!s.pageBreak, children: [new TextRun({ text: s.title })] }));
    children.push(...mdToBlocks(s.markdown));
  }
  const bullets = { reference: 'bullets', levels: [0, 1, 2].map((l) => ({ level: l, format: LevelFormat.BULLET, text: ['•', '–', '·'][l], alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540 + l * 360, hanging: 270 } } } })) };
  const numbers = { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] };
  const doc = new Document({
    creator: 'CGI Pursuit Navigator', title: title || 'Pursuit dossier',
    styles: {
      default: { document: { run: { font: 'Calibri', size: 21, color: INK } } },
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', quickFormat: true, run: { size: 44, bold: true, color: INK }, paragraph: { spacing: { after: 120 } } },
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: PURPLE }, paragraph: { spacing: { before: 360, after: 140 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: INK }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 23, bold: true, color: PURPLE }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
        { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 21, bold: true, color: INK }, paragraph: { spacing: { before: 120, after: 60 }, outlineLevel: 3 } },
      ],
    },
    numbering: { config: [bullets, numbers] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'CGI Pursuit Navigator · ', color: '8A8A99', size: 16 }), new TextRun({ children: [PageNumber.CURRENT], color: '8A8A99', size: 16 })] })] }) },
      children,
    }],
  });
  return Packer.toBuffer(doc);
}
