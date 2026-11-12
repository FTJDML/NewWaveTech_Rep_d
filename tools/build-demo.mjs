// Builds public/data/demo-velmora.json (fictional example case) from Case_Pack_Velmora_Retail.docx
// Usage: node tools/build-demo.mjs "<path to Case_Pack_Velmora_Retail.docx>"
import fs from 'node:fs';
import { extractText } from '../server/extract.js';

const buf = fs.readFileSync(process.argv[2]);
const { text } = await extractText(buf, 'case.docx');
const docs = {};
const parts = text.split(/^# (?=\d\d |Case canvas)/m).slice(1);
const titles = { '01': 'Client brief', '02': 'Opportunity or RFP summary', '03': 'Current state and risks', '04': 'Stakeholder notes', '05': 'User reality', '06': 'Evidence themes' };
for (const part of parts) {
  const head = part.split('\n', 1)[0].trim();
  let body = part.slice(head.length).trim();
  const num = /^(\d\d) /.exec(head)?.[1];
  if (num) {
    body = body.replace(/^# \d\d .*continued\s*$/gm, '').trim();
    docs[num] = { text: ((docs[num]?.text || '') + '\n\n' + body).trim(), title: titles[num] };
  } else if (/^Case canvas/.test(head)) {
    const [canvas, header] = body.split(/^## Case header\s*$/m);
    docs.canvas = { text: canvas.trim() };
    docs.header = { text: (header || '').trim() };
  }
}
for (const k of Object.keys(docs)) docs[k].source = 'demo';
const out = {
  meta: { client: 'Velmora Retail', title: 'Re-tender: SIAM & product-data pilot (voorbeeldcase, fictief)', route: 'tender', sector: 'Retail (non-food discounter, NL)', role: 'DCS on the bid', submissionDate: '2026-12-22', decisionDate: '2027-02-22', demo: true },
  casepack: { docs, builtAt: new Date().toISOString() },
};
fs.writeFileSync('public/data/demo-velmora.json', JSON.stringify(out, null, 1));
console.log(Object.keys(docs).map((k) => k + ':' + docs[k].text.length).join(' '));
