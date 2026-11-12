// Small, safe markdown renderer (escape first, then format) with decorations for the framework's labels.
import { esc } from './ui.js';

function decorate(html) {
  return html
    .replace(/(^|[\s(·;>])F\s\[([^\]\n]{1,110})\]/g, (m, pre, src) => `${pre}<span class="tag tag-F" title="Fact — from a named source">F</span><span class="src">[${src}]</span>`)
    .replace(/(^|[·;>(]\s*|<strong>)(A|H)(?=\s*(?:—|–|:|\(|<\/strong>))/g, (m, pre, t) => `${pre}<span class="tag tag-${t}" title="${t === 'A' ? 'Assumption' : 'Hypothesis to validate'}">${t}</span>`)
    .replace(/^(A|H)(?=\s*(?:—|–|:|\())/, (m, t) => `<span class="tag tag-${t}" title="${t === 'A' ? 'Assumption' : 'Hypothesis to validate'}">${t}</span>`)
    .replace(/Not provided\s*[—–-]\s*needs validation/gi, '<span class="chip gap" title="Gat in de bronnen — valideren">Not provided — needs validation</span>')
    .replace(/rehearsed\s*[—–-]\s*not validated/gi, '<span class="chip rehearsed" title="Simulatie — pas waar na een echt gesprek">rehearsed — not validated</span>')
    .replace(/for DCS decision(?: with finance)?/gi, (m) => `<span class="chip decide" title="Besluit voor jou — het model beslist nooit">${m}</span>`)
    .replace(/\[simulated\]/g, '<span class="chip sim" title="Gesimuleerd antwoord">simulated</span>')
    .replace(/(Next stage needs\s*[—–-]\s*for M\d+(?:\s*(?:and|,|&amp;)\s*M\d+)*)/gi, '<span class="chip next">$1</span>')
    .replace(/\(practice card (\d)\)/gi, '<span class="chip practice">practice card $1</span>');
}

export function inline(raw) {
  let s = esc(raw);
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\n]+?)\*(?![*\w])/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^\w])_([^_\n]+?)_(?![\w])/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  return decorate(s);
}

const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const splitRow = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

export function renderMarkdown(md) {
  const lines = String(md ?? '').replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = /^```\s*([\w+-]*)\s*$/.exec(l))) {
      const buf = []; i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      const code = buf.join('\n');
      out.push(`<pre class="code" data-lang="${esc(m[1] || '')}"><code>${esc(code)}</code></pre>`);
      continue;
    }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { const n = Math.min(6, m[1].length + 1); out.push(`<h${n}>${inline(m[2].replace(/\s*#+\s*$/, ''))}</h${n}>`); i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = splitRow(l); i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(splitRow(lines[i++]));
      out.push('<div class="tbl-wrap"><table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + head.map((_, ci) => `<td>${inline(r[ci] || '')}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (/^\s*([-*•])\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l)) {
      const ordered = /^\s*\d+[.)]\s+/.test(l);
      const items = [];
      while (i < lines.length && (/^\s*([-*•])\s+/.test(lines[i]) || /^\s*\d+[.)]\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        const mm = /^(\s*)(?:[-*•]|\d+[.)])\s+(.*)$/.exec(lines[i]);
        if (mm) items.push({ indent: mm[1].length, text: mm[2] }); else items[items.length - 1].text += ' ' + lines[i].trim();
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      let html = '', depth = 0; const stack = [];
      for (const it of items) {
        const lvl = it.indent >= 2 ? 1 : 0;
        while (depth < lvl) { html += `<${tag}>`; depth++; stack.push(tag); }
        while (depth > lvl) { html += `</${stack.pop()}>`; depth--; }
        html += `<li>${inline(it.text)}</li>`;
      }
      while (depth > 0) { html += `</${stack.pop()}>`; depth--; }
      out.push(`<${tag}>${html}</${tag}>`);
      continue;
    }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${buf.map(inline).join('<br>')}</blockquote>`);
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    const buf = [l]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*\|.*\|\s*$|\s*([-*•])\s+|\s*\d+[.)]\s+|>\s?|\s*(-{3,}|\*{3,})\s*$)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${buf.map(inline).join('<br>')}</p>`);
  }
  return out.join('\n');
}

/** Render into an element, wiring copy buttons on code blocks; `onHtml(code)` lets the caller add a preview action. */
export function mountMarkdown(el, md, { onHtml } = {}) {
  el.innerHTML = renderMarkdown(md);
  el.querySelectorAll('pre.code').forEach((pre) => {
    const code = pre.textContent;
    const bar = document.createElement('div'); bar.className = 'code-bar';
    const lang = pre.dataset.lang || 'code';
    const label = document.createElement('span'); label.textContent = lang; bar.append(label);
    const cp = document.createElement('button'); cp.className = 'mini'; cp.textContent = 'Kopieer';
    cp.onclick = () => { navigator.clipboard?.writeText(code); cp.textContent = 'Gekopieerd'; setTimeout(() => (cp.textContent = 'Kopieer'), 1500); };
    bar.append(cp);
    if (onHtml && /<!doctype html|<html/i.test(code)) {
      const pv = document.createElement('button'); pv.className = 'mini primary'; pv.textContent = 'Open prototype'; pv.onclick = () => onHtml(code); bar.prepend(pv);
      pre.classList.add('collapsed');
      const tg = document.createElement('button'); tg.className = 'mini'; tg.textContent = 'Toon code'; tg.onclick = () => { pre.classList.toggle('collapsed'); tg.textContent = pre.classList.contains('collapsed') ? 'Toon code' : 'Verberg code'; };
      bar.append(tg);
    }
    pre.before(bar);
  });
  return el;
}
