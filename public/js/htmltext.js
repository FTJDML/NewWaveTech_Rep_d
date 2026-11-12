// HTML → markdown-ish text (tables stay pipe tables). Shared by the server and the artifact build.
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

