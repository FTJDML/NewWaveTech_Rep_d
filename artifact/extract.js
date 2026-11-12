// Reading uploaded files in the browser: .docx (own zip reader), .pdf (pdf.js loaded on demand from cdnjs), html, text.
import { unzip } from './zip.js';
import { htmlToText } from '../public/js/htmltext.js';

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const decodeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');

/** WordprocessingML → markdown-ish text: headings, bullets, pipe tables. */
export function docxXmlToText(xml) {
  const bodyStart = xml.indexOf('<w:body'), bodyEnd = xml.lastIndexOf('</w:body>');
  const body = xml.slice(bodyStart < 0 ? 0 : bodyStart, bodyEnd < 0 ? xml.length : bodyEnd);
  const paraText = (p) => {
    let out = '';
    const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>|<w:cr\s*\/>/g;
    let m;
    while ((m = re.exec(p))) out += m[1] !== undefined ? decodeXml(m[1]) : m[0].startsWith('<w:tab') ? '\t' : '\n';
    return out;
  };
  const paraFmt = (p) => {
    const t = paraText(p).replace(/\s+$/g, '');
    if (!t.trim()) return '';
    const st = /<w:pStyle\s+w:val="([^"]+)"/.exec(p)?.[1] || '';
    const hm = /^(?:heading|kop|titel|title)\s*([1-6])?$/i.exec(st.replace(/([a-z])(\d)/i, '$1 $2').replace(/\s+/g, ' '));
    if (hm) return '#'.repeat(Math.min(6, +(hm[1] || 1))) + ' ' + t.replace(/\n/g, ' ');
    if (/<w:numPr>/.test(p) || /^(list|opsomming)/i.test(st)) return '- ' + t.replace(/\n/g, ' ');
    return t;
  };
  const blocks = [];
  const re = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g;
  let m;
  while ((m = re.exec(body))) {
    const b = m[0];
    if (b.startsWith('<w:tbl>')) {
      const rows = [...b.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map((r) => [...r[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((c) => [...c[0].matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((p) => paraText(p[0]).trim()).filter(Boolean).join(' / ').replace(/\|/g, '/')));
      if (rows.length) {
        const w = Math.max(...rows.map((r) => r.length));
        const line = (r) => '| ' + Array.from({ length: w }, (_, i) => r[i] || '').join(' | ') + ' |';
        blocks.push([line(rows[0]), '|' + ' --- |'.repeat(w), ...rows.slice(1).map(line)].join('\n'));
      }
    } else { const t = paraFmt(b); if (t) blocks.push(t); }
  }
  // consecutive list items stay together, everything else is separated by a blank line
  let out = '';
  blocks.forEach((b, i) => { out += (i && !(b.startsWith('- ') && blocks[i - 1].startsWith('- ')) ? '\n\n' : i ? '\n' : '') + b; });
  return out.trim();
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = resolve; s.onerror = () => reject(new Error('Kon ' + src.split('/').pop() + ' niet laden'));
    document.head.append(s);
  });
}
let pdfReady;
async function pdfLib() {
  if (!pdfReady) pdfReady = (async () => {
    await loadScript(PDFJS_WORKER); // defines window.pdfjsWorker so pdf.js can run without a separate Worker
    await loadScript(PDFJS);
    const lib = window.pdfjsLib;
    if (!lib) throw new Error('pdf.js is niet beschikbaar');
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return lib;
  })();
  return pdfReady;
}
async function pdfToText(buf) {
  const lib = await pdfLib();
  const task = lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, useSystemFonts: false });
  const pdf = await Promise.race([task.promise, new Promise((_, rej) => setTimeout(() => rej(new Error('Time-out bij het lezen van de PDF')), 60000))]);
  let out = '';
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const tc = await page.getTextContent();
    let lastY, line = '';
    for (const it of tc.items) {
      const y = it.transform ? it.transform[5] : 0;
      if (lastY !== undefined && Math.abs(y - lastY) > 2) line += '\n';
      line += it.str; lastY = y;
    }
    out += `\n\n[page ${n}]\n` + line;
  }
  return { text: out.replace(/\n{3,}/g, '\n\n').trim(), pages: pdf.numPages };
}

export async function extractFile(file) {
  if (file.size > 40 * 1024 * 1024) throw new Error(`${file.name} is groter dan 40 MB`);
  const name = file.name, ext = (name.split('.').pop() || '').toLowerCase();
  const warnings = [];
  let text = '', pages;
  if (ext === 'pdf') {
    try { ({ text, pages } = await pdfToText(await file.arrayBuffer())); }
    catch (e) { throw new Error(`De PDF kon in deze omgeving niet worden gelezen (${e.message}). Plak de tekst via "Tekst plakken" of lever een Word-versie aan.`); }
    if (text.replace(/\[page \d+\]/g, '').trim().length < 40) warnings.push('Geen tekst gevonden in deze PDF (gescand?). OCR is niet beschikbaar: plak de tekst handmatig.');
  } else if (ext === 'docx' || ext === 'docm' || ext === 'dotx') {
    const z = unzip(await file.arrayBuffer());
    const data = await z.read('word/document.xml');
    if (!data) throw new Error(`${name} is geen geldig Word-bestand.`);
    text = docxXmlToText(new TextDecoder().decode(data));
  } else if (['doc', 'xls', 'ppt', 'xlsx', 'pptx'].includes(ext)) {
    throw new Error(`.${ext} wordt niet rechtstreeks gelezen. Sla het bestand op als PDF of .docx (of kopieer de tekst), en probeer opnieuw.`);
  } else if (ext === 'html' || ext === 'htm') text = htmlToText(await file.text());
  else if (ext === 'rtf') text = (await file.text()).replace(/\\par[d]?/g, '\n').replace(/\{\\\*[^}]*\}/g, '').replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
  else {
    text = (await file.text()).replace(/^\uFEFF/, '');
    if (ext === 'vtt' || ext === 'srt') text = text.replace(/^\d+\s*$/gm, '').replace(/^\d\d:\d\d.*-->.*$/gm, '').replace(/^WEBVTT.*$/m, '').replace(/\n{3,}/g, '\n\n');
  }
  text = text.replace(/\u0000/g, '').trim();
  return { name, text, pages, chars: text.length, warnings };
}
