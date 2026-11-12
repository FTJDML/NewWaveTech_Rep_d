import './env.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listPursuits, getPursuit, createPursuit, patchPursuit, deletePursuit, getUser, saveUser,
  exportAll, replaceAll, DATA_DIR, validId, getPromptOverrides, savePromptOverrides,
} from './store.js';
import { streamChat, publicConfig, updateConfig, testConnection } from './ai.js';
import { extractText } from './extract.js';
import { buildDocx } from './export.js';
import crypto from 'node:crypto';

// prototypes (AI-written HTML) are served from their own sandboxed, network-less document — never inline in the app
const previews = new Map();
function savePreview(html) {
  const now = Date.now();
  for (const [k, v] of previews) if (now - v.at > 2 * 3600 * 1000) previews.delete(k);
  while (previews.size >= 200) previews.delete(previews.keys().next().value);
  const token = crypto.randomBytes(16).toString('hex');
  previews.set(token, { html, at: now });
  return token;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '..', 'public');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const VERSION = '1.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  // prototypes are rendered in a sandboxed iframe (srcdoc) — they inherit nothing from the app origin
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-src 'self' blob: about:; child-src blob: about:; base-uri 'none'; form-action 'self'",
};

function send(res, status, body, headers = {}) {
  const isObj = body !== null && typeof body === 'object' && !Buffer.isBuffer(body);
  const data = isObj ? JSON.stringify(body) : body;
  res.writeHead(status, { ...SEC_HEADERS, ...(isObj ? { 'Content-Type': 'application/json; charset=utf-8' } : {}), 'Cache-Control': 'no-store', ...headers });
  res.end(data);
}

function readBody(req, limit = 40 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { reject(Object.assign(new Error('Bestand of verzoek te groot'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const readJson = async (req, limit) => { const b = await readBody(req, limit); if (!b.length) return {}; try { return JSON.parse(b.toString('utf8')); } catch { throw Object.assign(new Error('Ongeldige JSON'), { status: 400 }); } };

// ---------- identity (SSO headers win; otherwise the name typed in the browser; Basic user name as fallback) ----------
function identity(req) {
  const h = req.headers;
  const sso = h['x-ms-client-principal-name'] || h['x-auth-request-email'] || h['x-forwarded-email'] || h['x-forwarded-user'];
  if (sso) return { name: String(sso), source: 'sso' };
  const typed = h['x-user-name'];
  if (typed) { try { return { name: decodeURIComponent(String(typed)).slice(0, 80), source: 'browser' }; } catch { /* ignore */ } }
  return { name: 'Gebruiker', source: 'default' };
}

function authorized(req) {
  if (!APP_PASSWORD) return true;
  const a = req.headers.authorization || '';
  if (!a.startsWith('Basic ')) return false;
  const [, pass] = Buffer.from(a.slice(6), 'base64').toString().split(/:(.*)/s);
  return pass === APP_PASSWORD;
}

async function api(req, res, url) {
  const m = req.method;
  const p = url.pathname;
  const me = identity(req);
  let g;

  if (p === '/api/health') return send(res, 200, { ok: true, version: VERSION });
  if (p === '/api/config' && m === 'GET') return send(res, 200, { ...publicConfig(), version: VERSION, me, dataDir: process.env.SHOW_DATA_DIR ? DATA_DIR : undefined });
  if (p === '/api/config' && m === 'PUT') {
    if (publicConfig().locked) return send(res, 403, { error: 'De AI-koppeling is vastgezet via omgevingsvariabelen op de server.' });
    updateConfig(await readJson(req, 1e6)); return send(res, 200, publicConfig());
  }
  if (p === '/api/config/test' && m === 'POST') {
    try { return send(res, 200, await testConnection()); } catch (e) { return send(res, 200, { ok: false, error: String(e.message || e) }); }
  }

  // ---- AI streaming proxy (Server-Sent Events) ----
  if (p === '/api/ai/stream' && m === 'POST') {
    const body = await readJson(req, 16 * 1024 * 1024);
    if (!Array.isArray(body.messages) || !body.messages.length) return send(res, 400, { error: 'messages ontbreekt' });
    res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    const ac = new AbortController();
    res.on('close', () => ac.abort());
    const ev = (name, data) => { if (!res.writableEnded) res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`); };
    const ping = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n'); }, 15000);
    try {
      await streamChat({
        system: typeof body.system === 'string' ? body.system : '',
        messages: body.messages.map((x) => ({ role: x.role === 'assistant' ? 'assistant' : 'user', content: String(x.content ?? '') })),
        maxTokens: Math.min(Number(body.maxTokens) || 16000, 64000),
        model: typeof body.model === 'string' && body.model ? body.model : undefined,
      }, { delta: (t) => ev('delta', { t }), usage: (u) => ev('usage', u) }, ac.signal);
      ev('done', {});
    } catch (e) {
      if (!ac.signal.aborted) ev('error', { message: String(e.message || e) });
    } finally { clearInterval(ping); if (!res.writableEnded) res.end(); }
    return;
  }

  if (p === '/api/preview' && m === 'POST') {
    const b = await readJson(req, 12 * 1024 * 1024);
    if (typeof b.html !== 'string' || !b.html.trim()) return send(res, 400, { error: 'html ontbreekt' });
    return send(res, 200, { url: '/preview/' + savePreview(b.html) });
  }

  // ---- documents ----
  if (p === '/api/extract' && m === 'POST') {
    const name = decodeURIComponent(req.headers['x-filename'] || 'bestand');
    const buf = await readBody(req, 40 * 1024 * 1024);
    try { return send(res, 200, { name, ...(await extractText(buf, name)) }); }
    catch (e) { return send(res, 422, { error: String(e.message || e) }); }
  }
  if (p === '/api/export/docx' && m === 'POST') {
    const b = await readJson(req, 30 * 1024 * 1024);
    const buf = await buildDocx(b);
    const fname = (String(b.filename || 'dossier').replace(/[^\w.-]+/g, '_') || 'dossier') + '.docx';
    return send(res, 200, buf, { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${fname}"` });
  }

  // ---- pursuits ----
  if (p === '/api/pursuits' && m === 'GET') return send(res, 200, listPursuits());
  if (p === '/api/pursuits' && m === 'POST') {
    const b = await readJson(req, 30 * 1024 * 1024);
    return send(res, 201, createPursuit(b, me.name));
  }
  if ((g = /^\/api\/pursuits\/([^/]+)\/rev$/.exec(p)) && m === 'GET') {
    const d = validId(g[1]) ? getPursuit(g[1]) : null;
    return d ? send(res, 200, { rev: d.rev, updatedAt: d.updatedAt }) : send(res, 404, { error: 'niet gevonden' });
  }
  if ((g = /^\/api\/pursuits\/([^/]+)$/.exec(p))) {
    const id = g[1];
    if (!validId(id)) return send(res, 404, { error: 'niet gevonden' });
    if (m === 'GET') { const d = getPursuit(id); return d ? send(res, 200, d) : send(res, 404, { error: 'niet gevonden' }); }
    if (m === 'PATCH') {
      const b = await readJson(req, 30 * 1024 * 1024);
      if (!Array.isArray(b.ops)) return send(res, 400, { error: 'ops ontbreekt' });
      const r = patchPursuit(id, b.ops, b.baseRev);
      if (r.error === 'not_found') return send(res, 404, { error: 'niet gevonden' });
      if (r.error) return send(res, 400, { error: r.message || r.error });
      return send(res, 200, r);
    }
    if (m === 'DELETE') return deletePursuit(id) ? send(res, 200, { ok: true }) : send(res, 404, { error: 'niet gevonden' });
  }

  // ---- personal workflow (hours, first use) ----
  if (p === '/api/me/workflow' && m === 'GET') return send(res, 200, getUser(me.name));
  if (p === '/api/me/workflow' && m === 'PUT') return send(res, 200, saveUser(me.name, await readJson(req, 2e6)));

  // ---- shared prompt overrides (Prompt Library) ----
  if (p === '/api/prompts' && m === 'GET') return send(res, 200, getPromptOverrides());
  if (p === '/api/prompts' && m === 'PUT') { savePromptOverrides(await readJson(req, 8e6)); return send(res, 200, getPromptOverrides()); }

  // ---- backup ----
  if (p === '/api/backup' && m === 'GET') return send(res, 200, { version: VERSION, exportedAt: new Date().toISOString(), pursuits: exportAll() }, { 'Content-Disposition': 'attachment; filename="pursuit-navigator-backup.json"' });
  if (p === '/api/backup' && m === 'POST') {
    const b = await readJson(req, 200 * 1024 * 1024);
    return send(res, 200, { imported: replaceAll(b.pursuits || []) });
  }
  return send(res, 404, { error: 'onbekend eindpunt' });
}

function servePreview(req, res, url) {
  const t = /^\/preview\/([a-f0-9]{32})$/.exec(url.pathname);
  const e = t && previews.get(t[1]);
  if (!e) return send(res, 404, 'Voorbeeld verlopen — open het prototype opnieuw.');
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'SAMEORIGIN',
    // opaque origin, no network, no navigation, no popups: the prototype can only draw and click
    'Content-Security-Policy': "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; base-uri 'none'; form-action 'none'",
  });
  res.end(e.html);
}

function serveStatic(req, res, url) {
  if (url.pathname.startsWith('/preview/')) return servePreview(req, res, url);
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(PUBLIC, '.' + rel);
  if (!file.startsWith(PUBLIC + path.sep) && file !== PUBLIC) return send(res, 403, 'Forbidden');
  let target = file;
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) target = path.join(PUBLIC, 'index.html'); // SPA fallback
  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-store' : 'no-cache' });
  fs.createReadStream(target).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    if (!authorized(req)) return send(res, 401, 'Authenticatie vereist', { 'WWW-Authenticate': 'Basic realm="CGI Pursuit Navigator"' });
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return serveStatic(req, res, url);
  } catch (e) {
    if (!res.headersSent) send(res, e.status || 500, { error: String(e.message || e) });
    else res.end();
    if (!e.status) console.error('[error]', e);
  }
});
server.requestTimeout = 0; // long streams
server.listen(PORT, HOST, () => {
  const c = publicConfig();
  console.log(`CGI Pursuit Navigator ${VERSION} — http://localhost:${PORT}`);
  console.log(`AI-koppeling: ${c.provider}${c.model ? ' (' + c.model + ')' : ''}${c.hasKey ? '' : ' — geen sleutel; kopieer-modus actief'}`);
  console.log(`Data: ${DATA_DIR}`);
});
