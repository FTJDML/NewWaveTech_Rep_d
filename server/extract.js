import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const decodeEntities = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));

/** Small HTML → markdown-ish text converter (keeps tables as pipe tables, headings, lists). */
export function htmlToText(html) {
  let s = html.replace(/\r/g, '');
  s = s.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<table[\s\S]*?<\/table>/gi, (tbl) => {
    const rows = [...tbl.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((r) =>
      [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
        decodeEntities(c[1].replace(/<br\s*\/?>/gi, ' / ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().replace(/\|/g, '/')));
    if (!rows.length) return '';
    const w = Math.max(...rows.map((r) => r.length));
    const line = (r) => '| ' + Array.from({ length: w }, (_, i) => r[i] || '').join(' | ') + ' |';
    return '\n\n' + [line(rows[0]), '|' + ' --- |'.repeat(w), ...rows.slice(1).map(line)].join('\n') + '\n\n';
  });
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, t) => '\n\n' + '#'.repeat(+n) + ' ' + t.replace(/<[^>]+>/g, '').trim() + '\n\n');
  s = s.replace(/<li[^>]*>/gi, '\n- ').replace(/<\/(p|div|ul|ol|tr)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = decodeEntities(s);
  return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function pdfText(buf) {
  const render = (pageData) => pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false }).then((tc) => {
    let lastY, text = '';
    for (const item of tc.items) {
      if (lastY === item.transform[5] || lastY === undefined) text += item.str; else text += '\n' + item.str;
      lastY = item.transform[5];
    }
    return `\n\n[page ${pageData.pageNumber ?? pageData.pageIndex + 1}]\n` + text;
  });
  const r = await pdfParse(buf, { pagerender: render });
  return { text: (r.text || '').replace(/\n{3,}/g, '\n\n').trim(), pages: r.numpages };
}

export async function extractText(buf, filename = '') {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const warnings = [];
  let text = '', pages;
  if (ext === 'pdf') {
    ({ text, pages } = await pdfText(buf));
    if (text.replace(/\[page \d+\]/g, '').trim().length < 40) warnings.push('Geen tekst gevonden in deze PDF (gescand?). OCR is niet beschikbaar: plak de tekst handmatig.');
  } else if (ext === 'docx' || ext === 'docm' || ext === 'dotx') {
    const r = await mammoth.convertToHtml({ buffer: buf });
    text = htmlToText(r.value);
    if (r.messages?.length) warnings.push(...r.messages.slice(0, 3).map((m) => m.message));
  } else if (ext === 'doc' || ext === 'xls' || ext === 'ppt' || ext === 'xlsx' || ext === 'pptx') {
    throw new Error(`.${ext} wordt niet rechtstreeks gelezen. Sla het bestand op als PDF of .docx (of kopieer de tekst), en probeer opnieuw.`);
  } else if (ext === 'html' || ext === 'htm') {
    text = htmlToText(buf.toString('utf8'));
  } else if (ext === 'rtf') {
    text = buf.toString('utf8').replace(/\\par[d]?/g, '\n').replace(/\{\\\*[^}]*\}/g, '').replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
  } else {
    text = buf.toString('utf8').replace(/^\uFEFF/, '');
    if (ext === 'vtt' || ext === 'srt') text = text.replace(/^\d+\s*$/gm, '').replace(/^\d\d:\d\d.*-->.*$/gm, '').replace(/^WEBVTT.*$/m, '').replace(/\n{3,}/g, '\n\n');
  }
  text = text.replace(/\u0000/g, '').trim();
  return { text, pages, chars: text.length, warnings };
}
