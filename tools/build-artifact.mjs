// Builds dist/artifact.html: the whole app as ONE publishable artifact page (title + style + markup + script, no <html> wrapper),
// and dist/artifact-test.html: the same page with a fake claude.ai runtime in front (for tests).
//   node tools/build-artifact.mjs
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

const aliasState = {
  name: 'artifact-state',
  setup(b) {
    b.onResolve({ filter: /(^|\/)state\.js$/ }, (args) => (args.resolveDir.endsWith(path.join('public', 'js')) ? { path: path.join(root, 'artifact', 'state.js') } : undefined));
  },
};
const bundle = async (entry) => (await esbuild.build({ entryPoints: [entry], bundle: true, minify: true, format: 'iife', target: ['es2020'], write: false, plugins: [aliasState], legalComments: 'none', logLevel: 'error' })).outputFiles[0].text;
const safeScript = (js) => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// ---- CSS: theme tokens (light + dark), literal colours → tokens, artifact additions ----
let css = fs.readFileSync(path.join(root, 'public/css/app.css'), 'utf8');
css = css.replace(/:root\{[\s\S]*?\}\n/, '');
const R = (re, to) => { css = css.replace(re, to); };
R(/background:\s*#fff\b/g, 'background:var(--surface)');
R(/background:#eef0f4/g, 'background:var(--soft-2)'); R(/color:#566/g, 'color:var(--muted)');
R(/#c9dcf4/g, 'var(--blue-line)'); R(/color:#8a5a00/g, 'color:var(--amber-ink)'); R(/#d9a400/g, 'var(--amber-line)');
R(/#d9d1f6/g, 'var(--purple-line)'); R(/#f6c6cf/g, 'var(--red-line)'); R(/#bfe3cf/g, 'var(--green-line)'); R(/#f1dd9a/g, 'var(--amber-line)');
R(/#e1dcf6/g, 'var(--purple-line)'); R(/#c9c0ee/g, 'var(--purple-line)'); R(/#e5c76b/g, 'var(--amber-line)'); R(/#cfc7ee/g, 'var(--purple-line)'); R(/#b5a6e6/gi, 'var(--purple-soft)');
R(/background:#1F1D2B/gi, 'background:var(--code-bg)');
R(/(?<![-\w])color:var\(--purple(?:-700)?\)/g, 'color:var(--purple-ink)');
R(/(?<![-\w])color:var\(--red(?:-700)?\)/g, 'color:var(--red-ink)');
R(/\.toast\{display:flex;gap:10px;align-items:center;background:var\(--ink\)/, '.toast{display:flex;gap:10px;align-items:center;background:var(--toast)');
R(/::selection\{background:var\(--purple-line\)\}/, '::selection{background:var(--sel)}');
const LIGHT = `--red:#E31937; --red-700:#C1102B; --red-ink:#C1102B; --red-tint:#FDECEF; --red-line:#F6C6CF;
  --purple:#5236AB; --purple-700:#3F2A8A; --purple-900:#2A1A63; --purple-ink:#5236AB; --purple-line:#D9D1F6; --purple-soft:#B5A6E6; --tint:#F1EFFB; --tint-2:#F7F6FD;
  --ink:#1F1D2B; --ink-2:#3A384A; --muted:#6B6A7C; --line:#E3E1EE; --line-2:#EFEEF6; --bg:#FFFFFF; --surface:#FFFFFF; --soft:#F6F5FA; --soft-2:#EEF0F4;
  --amber:#FFF4D6; --amber-ink:#7A5600; --amber-line:#F1DD9A; --green:#E6F5EC; --green-ink:#17623C; --green-line:#BFE3CF; --blue:#E8F0FB; --blue-ink:#1D4E89; --blue-line:#C9DCF4;
  --code-bg:#1F1D2B; --toast:#1F1D2B; --sel:#D9D1F6; --shadow:0 1px 2px rgba(31,29,43,.06),0 6px 20px rgba(31,29,43,.06);`;
const DARK = `--red:#E31937; --red-700:#C1102B; --red-ink:#FF8196; --red-tint:#3A1B26; --red-line:#6B2A3A;
  --purple:#6B52C9; --purple-700:#4A33A0; --purple-900:#2A1A63; --purple-ink:#B7A9F5; --purple-line:#473E86; --purple-soft:#5B4A9E; --tint:#27234A; --tint-2:#211F3A;
  --ink:#ECEBF6; --ink-2:#CFCDE0; --muted:#A09EB5; --line:#34324A; --line-2:#2A2940; --bg:#13121B; --surface:#1B1A26; --soft:#232232; --soft-2:#2B2A3B;
  --amber:#3B3216; --amber-ink:#F0D27A; --amber-line:#6E5B1E; --green:#16301F; --green-ink:#7ED3A0; --green-line:#285C3A; --blue:#172B45; --blue-ink:#8DB8EE; --blue-line:#2B4A70;
  --code-bg:#0D0C13; --toast:#3A3752; --sel:#4B3F8A; --shadow:0 1px 2px rgba(0,0,0,.4),0 6px 20px rgba(0,0,0,.35); color-scheme:dark;`;
const COMMON = `--radius:6px; --font:"Source Sans 3","Source Sans Pro","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif; --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;`;
const tokens = `/* Pursuit Navigator — workspace for pursuits: white canvas, red + purple accents, purple-topped cards (works as a tool, not a landing page) */
:root{ ${COMMON}
  ${LIGHT} }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ ${DARK} } }
:root[data-theme="dark"]{ ${DARK} }
`;
css = tokens + css + '\n' + fs.readFileSync(path.join(root, 'artifact/artifact.css'), 'utf8');

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;900&display=swap">';
const head = `<title>Pursuit Navigator</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${FONTS}\n<style>\n${css}\n</style>\n`;

const js = safeScript(await bundle(path.join(root, 'artifact/main.js')));
const page = `${head}<div id="app"></div>\n<script>${js}</script>\n`;
fs.writeFileSync(path.join(dist, 'artifact.html'), page);

const harness = safeScript(await bundle(path.join(root, 'tests/harness/claude-runtime.js')));
fs.writeFileSync(path.join(dist, 'artifact-test.html'), `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><script>${harness}</script>\n${page}</body></html>`);

const kb = (f) => (fs.statSync(path.join(dist, f)).size / 1024).toFixed(0) + ' KB';
console.log('dist/artifact.html', kb('artifact.html'), '· dist/artifact-test.html', kb('artifact-test.html'));
