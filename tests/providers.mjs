// Protocol tests: the app server against fake Anthropic / OpenAI(-compatible) upstreams (SSE streaming, retry, errors).
//   node --test tests/providers.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
const sse = (res, events) => { res.writeHead(200, { 'content-type': 'text/event-stream' }); for (const [ev, data] of events) res.write((ev ? `event: ${ev}\n` : '') + `data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`); res.end(); };

async function startApp(env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pn-prov-'));
  const port = 3300 + Math.floor(Math.random() * 500);
  const child = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, PORT: String(port), DATA_DIR: dir, HOST: '127.0.0.1', ...env }, stdio: 'pipe' });
  await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('server start timeout')), 8000); child.stdout.on('data', (d) => { if (String(d).includes('http://localhost')) { clearTimeout(t); resolve(); } }); child.on('exit', (c) => reject(new Error('server exited ' + c))); });
  return { port, stop: () => child.kill() };
}
async function stream(port, body) {
  const res = await fetch(`http://127.0.0.1:${port}/api/ai/stream`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const text = await res.text();
  const out = { text: '', usage: null, error: null, done: false };
  for (const block of text.split('\n\n')) {
    const ev = /event: (\w+)/.exec(block)?.[1]; const data = /data: (.*)/.exec(block)?.[1]; if (!ev || !data) continue;
    const j = JSON.parse(data);
    if (ev === 'delta') out.text += j.t; else if (ev === 'usage') out.usage = j; else if (ev === 'error') out.error = j.message; else if (ev === 'done') out.done = true;
  }
  return out;
}

test('Anthropic: headers, body, streaming deltas, usage, truncation flag, retry on 429', async () => {
  let calls = 0, seen;
  const up = http.createServer((req, res) => {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      calls++; seen = { headers: req.headers, body: JSON.parse(b), url: req.url };
      if (calls === 1) { res.writeHead(429, { 'retry-after': '0', 'content-type': 'application/json' }); return res.end('{"error":{"message":"rate"}}'); }
      sse(res, [
        ['message_start', { type: 'message_start', message: { usage: { input_tokens: 25, output_tokens: 1 } } }],
        ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
        ['ping', { type: 'ping' }],
        ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hel' } }],
        ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'lo — wörld' } }],
        ['message_delta', { type: 'message_delta', delta: { stop_reason: 'max_tokens' }, usage: { output_tokens: 15 } }],
        ['message_stop', { type: 'message_stop' }],
      ]);
    });
  });
  const upPort = await listen(up);
  const app = await startApp({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-test', ANTHROPIC_BASE_URL: `http://127.0.0.1:${upPort}`, ANTHROPIC_MODEL: 'claude-test' });
  try {
    const r = await stream(app.port, { system: 'SYS', messages: [{ role: 'user', content: 'hi' }], maxTokens: 777 });
    assert.equal(r.error, null); assert.equal(r.text, 'Hello — wörld'); assert.ok(r.done);
    assert.deepEqual([r.usage.input, r.usage.output, r.usage.truncated, r.usage.model], [25, 15, true, 'claude-test']);
    assert.equal(calls, 2, 'one retry after 429');
    assert.equal(seen.url, '/v1/messages'); assert.equal(seen.headers['x-api-key'], 'sk-test'); assert.equal(seen.headers['anthropic-version'], '2023-06-01');
    assert.deepEqual([seen.body.model, seen.body.max_tokens, seen.body.stream, seen.body.system], ['claude-test', 777, true, 'SYS']);
    assert.deepEqual(seen.body.messages, [{ role: 'user', content: 'hi' }]);
    const cfg = await (await fetch(`http://127.0.0.1:${app.port}/api/config`)).json();
    assert.ok(cfg.hasKey && JSON.stringify(cfg).indexOf('sk-test') < 0, 'API key never leaves the server');
  } finally { app.stop(); up.close(); }
});

test('Anthropic: a large workspace prompt is sent with cache_control, usage counts cached tokens', async () => {
  let seen;
  const up = http.createServer((req, res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { seen = JSON.parse(b); sse(res, [['message_start', { type: 'message_start', message: { usage: { input_tokens: 10, cache_read_input_tokens: 5000, cache_creation_input_tokens: 20 } } }], ['content_block_delta', { type: 'content_block_delta', delta: { type: 'text_delta', text: 'x' } }], ['message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 1 } }]]); }); });
  const upPort = await listen(up);
  const app = await startApp({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k', ANTHROPIC_BASE_URL: `http://127.0.0.1:${upPort}` });
  try {
    const r = await stream(app.port, { system: 'W'.repeat(5000), messages: [{ role: 'user', content: 'q' }] });
    assert.equal(r.usage.input, 5030);
    assert.deepEqual(seen.system, [{ type: 'text', text: 'W'.repeat(5000), cache_control: { type: 'ephemeral' } }]);
  } finally { app.stop(); up.close(); }
});

test('Anthropic: upstream 400 becomes a readable error event', async () => {
  const up = http.createServer((req, res) => { req.resume(); req.on('end', () => { res.writeHead(400, { 'content-type': 'application/json' }); res.end('{"type":"error","error":{"type":"invalid_request_error","message":"prompt is too long"}}'); }); });
  const upPort = await listen(up);
  const app = await startApp({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k', ANTHROPIC_BASE_URL: `http://127.0.0.1:${upPort}` });
  try { const r = await stream(app.port, { messages: [{ role: 'user', content: 'x' }] }); assert.match(r.error, /prompt is too long/); assert.ok(!r.done); }
  finally { app.stop(); up.close(); }
});

test('OpenAI-compatible: Bearer auth, max_completion_tokens, usage chunk, [DONE]', async () => {
  let seen;
  const up = http.createServer((req, res) => {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      seen = { headers: req.headers, body: JSON.parse(b), url: req.url };
      sse(res, [[null, { choices: [{ delta: { role: 'assistant', content: '' } }] }], [null, { choices: [{ delta: { content: 'Ho' } }] }], [null, { choices: [{ delta: { content: 'la' }, finish_reason: 'length' }] }], [null, { choices: [], usage: { prompt_tokens: 11, completion_tokens: 3 } }], [null, '[DONE]']]);
    });
  });
  const upPort = await listen(up);
  const app = await startApp({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'oa-test', OPENAI_BASE_URL: `http://127.0.0.1:${upPort}/v1`, OPENAI_MODEL: 'gpt-test' });
  try {
    const r = await stream(app.port, { system: 'S', messages: [{ role: 'user', content: 'q' }], maxTokens: 500 });
    assert.equal(r.text, 'Hola'); assert.deepEqual([r.usage.input, r.usage.output, r.usage.truncated], [11, 3, true]);
    assert.equal(seen.url, '/v1/chat/completions'); assert.equal(seen.headers.authorization, 'Bearer oa-test');
    assert.deepEqual(seen.body.messages, [{ role: 'system', content: 'S' }, { role: 'user', content: 'q' }]);
    assert.equal(seen.body.max_completion_tokens, 500); assert.equal(seen.body.stream, true);
  } finally { app.stop(); up.close(); }
});

test('Azure style: api-key header, api-version query, max_tokens parameter', async () => {
  let seen;
  const up = http.createServer((req, res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { seen = { headers: req.headers, url: req.url, body: JSON.parse(b) }; sse(res, [[null, { choices: [{ delta: { content: 'ok' } }] }], [null, '[DONE]']]); }); });
  const upPort = await listen(up);
  const app = await startApp({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'az-key', OPENAI_BASE_URL: `http://127.0.0.1:${upPort}/openai/deployments/dep1`, OPENAI_AUTH_HEADER: 'api-key', OPENAI_API_VERSION: '2024-10-21', OPENAI_TOKEN_PARAM: 'max_tokens' });
  try {
    const r = await stream(app.port, { messages: [{ role: 'user', content: 'q' }], maxTokens: 50 });
    assert.equal(r.text, 'ok');
    assert.equal(seen.headers['api-key'], 'az-key'); assert.ok(!seen.headers.authorization);
    assert.equal(seen.url, '/openai/deployments/dep1/chat/completions?api-version=2024-10-21'); assert.equal(seen.body.max_tokens, 50);
  } finally { app.stop(); up.close(); }
});

test('server: settings can be saved when not locked, test-connection reports errors, preview is sandboxed', async () => {
  const app = await startApp({ AI_PROVIDER: '', ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '' });
  try {
    const base = `http://127.0.0.1:${app.port}`;
    let cfg = await (await fetch(base + '/api/config')).json();
    assert.equal(cfg.provider, 'manual');
    await fetch(base + '/api/config', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider: 'anthropic', anthropicKey: 'sk-x', anthropicModel: 'm1' }) });
    cfg = await (await fetch(base + '/api/config')).json();
    assert.deepEqual([cfg.provider, cfg.hasKey, cfg.model], ['anthropic', true, 'm1']);
    const t = await (await fetch(base + '/api/config/test', { method: 'POST' })).json();
    assert.equal(t.ok, false);
    const pv = await (await fetch(base + '/api/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ html: '<script>1</script>' }) })).json();
    const doc = await fetch(base + pv.url);
    assert.match(doc.headers.get('content-security-policy'), /^sandbox allow-scripts; default-src 'none'/);
    assert.equal(await doc.text(), '<script>1</script>');
    assert.equal((await fetch(base + '/preview/' + 'a'.repeat(32))).status, 404);
    assert.equal((await fetch(base + '/..%2f..%2fetc%2fpasswd')).status, 403); // never a file outside public/
    const r = await fetch(base + '/%2e%2e/%2e%2e/etc/passwd'); assert.ok(!(await r.text()).includes('root:'));
  } finally { app.stop(); }
});
