import { loadFileConfig, saveFileConfig } from './store.js';
import { mockStream } from './mock.js';

const env = process.env;

/** Effective configuration: environment variables win over the file written by the settings page. */
export function resolveConfig() {
  const f = loadFileConfig();
  const provider =
    env.AI_PROVIDER || f.provider ||
    (env.ANTHROPIC_API_KEY || f.anthropicKey ? 'anthropic' : env.OPENAI_API_KEY || f.openaiKey ? 'openai' : 'manual');
  return {
    provider,
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY || f.anthropicKey || '',
      model: env.ANTHROPIC_MODEL || f.anthropicModel || 'claude-sonnet-5-5',
      baseUrl: (env.ANTHROPIC_BASE_URL || f.anthropicBaseUrl || 'https://api.anthropic.com').replace(/\/$/, ''),
    },
    openai: {
      apiKey: env.OPENAI_API_KEY || f.openaiKey || '',
      model: env.OPENAI_MODEL || f.openaiModel || 'gpt-4.1',
      baseUrl: (env.OPENAI_BASE_URL || f.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, ''),
      authHeader: env.OPENAI_AUTH_HEADER || f.openaiAuthHeader || 'Authorization', // Azure: "api-key"
      apiVersion: env.OPENAI_API_VERSION || f.openaiApiVersion || '',
      tokenParam: env.OPENAI_TOKEN_PARAM || f.openaiTokenParam || 'max_completion_tokens',
    },
    maxOut: Number(env.MAX_OUTPUT_TOKENS || f.maxOutputTokens || 0) || (provider === 'openai' ? 16000 : 32000),
    locked: !!(env.AI_PROVIDER || env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY),
  };
}

/** What the browser may see (never the keys). */
export function publicConfig() {
  const c = resolveConfig();
  const model = c.provider === 'anthropic' ? c.anthropic.model : c.provider === 'openai' ? c.openai.model : c.provider === 'mock' ? 'demo' : '';
  return {
    provider: c.provider, model, locked: c.locked, maxOut: c.maxOut,
    hasKey: c.provider === 'anthropic' ? !!c.anthropic.apiKey : c.provider === 'openai' ? !!c.openai.apiKey : c.provider === 'mock',
    anthropic: { model: c.anthropic.model, baseUrl: c.anthropic.baseUrl, hasKey: !!c.anthropic.apiKey },
    openai: { model: c.openai.model, baseUrl: c.openai.baseUrl, hasKey: !!c.openai.apiKey, authHeader: c.openai.authHeader, apiVersion: c.openai.apiVersion, tokenParam: c.openai.tokenParam },
  };
}

export function updateConfig(patch) {
  const f = loadFileConfig();
  const allowed = ['maxOutputTokens', 'provider', 'anthropicKey', 'anthropicModel', 'anthropicBaseUrl', 'openaiKey', 'openaiModel', 'openaiBaseUrl', 'openaiAuthHeader', 'openaiApiVersion', 'openaiTokenParam'];
  for (const k of allowed) {
    if (patch[k] === undefined) continue;
    if ((k === 'anthropicKey' || k === 'openaiKey') && patch[k] === '') continue; // empty = keep existing key
    f[k] = String(patch[k]);
  }
  if (patch.clearAnthropicKey) delete f.anthropicKey;
  if (patch.clearOpenaiKey) delete f.openaiKey;
  saveFileConfig(f);
}

// ---- SSE parsing helper ----
async function* sseEvents(body) {
  const dec = new TextDecoder();
  let buf = '';
  for await (const chunk of body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.search(/\r?\n\r?\n/)) >= 0) {
      const raw = buf.slice(0, i);
      buf = buf.slice(i).replace(/^\r?\n\r?\n/, '');
      let ev = 'message'; const data = [];
      for (const line of raw.split(/\r?\n/)) {
        if (line.startsWith('event:')) ev = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      if (data.length) yield { event: ev, data: data.join('\n') };
    }
  }
}

const RETRY = new Set([408, 409, 429, 500, 502, 503, 504, 529]);
async function fetchWithRetry(url, init, signal) {
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (signal?.aborted) throw new Error('aborted');
    try {
      const res = await fetch(url, { ...init, signal });
      if (res.ok) return res;
      const text = await res.text().catch(() => '');
      if (RETRY.has(res.status) && attempt < 3) {
        const ra = Number(res.headers.get('retry-after'));
        await new Promise((r) => setTimeout(r, (ra > 0 ? ra * 1000 : 1500 * 2 ** attempt)));
        lastErr = new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
        continue;
      }
      throw new Error(`HTTP ${res.status}: ${friendly(text)}`);
    } catch (e) {
      if (e.name === 'AbortError' || signal?.aborted) throw e;
      lastErr = e;
      if (attempt >= 3 || String(e.message).startsWith('HTTP')) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastErr;
}
function friendly(text) {
  try { const j = JSON.parse(text); return j.error?.message || j.message || text.slice(0, 400); } catch { return text.slice(0, 400); }
}

async function streamAnthropic(cfg, req, cb, signal) {
  const a = cfg.anthropic;
  if (!a.apiKey) throw new Error('Geen Anthropic API-sleutel ingesteld (Instellingen → AI-koppeling).');
  const body = {
    model: req.model || a.model,
    max_tokens: req.maxTokens || 16000,
    stream: true,
    messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (req.system) body.system = req.system;
  const res = await fetchWithRetry(a.baseUrl + '/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': a.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  }, signal);
  let inTok = 0, outTok = 0, stop = '';
  for await (const ev of sseEvents(res.body)) {
    let j; try { j = JSON.parse(ev.data); } catch { continue; }
    if (ev.event === 'message_start') inTok = j.message?.usage?.input_tokens || 0;
    else if (ev.event === 'content_block_delta' && j.delta?.type === 'text_delta') cb.delta(j.delta.text);
    else if (ev.event === 'message_delta') { outTok = j.usage?.output_tokens ?? outTok; stop = j.delta?.stop_reason || stop; }
    else if (ev.event === 'error') throw new Error(j.error?.message || 'stream error');
  }
  cb.usage({ input: inTok, output: outTok, model: body.model, truncated: stop === 'max_tokens' });
}

async function streamOpenAI(cfg, req, cb, signal) {
  const o = cfg.openai;
  if (!o.apiKey) throw new Error('Geen API-sleutel ingesteld voor de OpenAI-compatibele koppeling (Instellingen → AI-koppeling).');
  const msgs = [];
  if (req.system) msgs.push({ role: 'system', content: req.system });
  for (const m of req.messages) msgs.push({ role: m.role, content: m.content });
  const body = { model: req.model || o.model, messages: msgs, stream: true, stream_options: { include_usage: true } };
  body[o.tokenParam] = req.maxTokens || 16000;
  let url = o.baseUrl + '/chat/completions';
  if (o.apiVersion) url += (url.includes('?') ? '&' : '?') + 'api-version=' + encodeURIComponent(o.apiVersion);
  const headers = { 'content-type': 'application/json' };
  headers[o.authHeader] = o.authHeader.toLowerCase() === 'authorization' ? 'Bearer ' + o.apiKey : o.apiKey;
  const res = await fetchWithRetry(url, { method: 'POST', headers, body: JSON.stringify(body) }, signal);
  let usage = null, finish = '';
  for await (const ev of sseEvents(res.body)) {
    if (ev.data.trim() === '[DONE]') break;
    let j; try { j = JSON.parse(ev.data); } catch { continue; }
    const ch = j.choices && j.choices[0];
    if (ch?.delta?.content) cb.delta(ch.delta.content);
    if (ch?.finish_reason) finish = ch.finish_reason;
    if (j.usage) usage = j.usage;
    if (j.error) throw new Error(j.error.message || 'stream error');
  }
  cb.usage({ input: usage?.prompt_tokens || 0, output: usage?.completion_tokens || 0, model: body.model, truncated: finish === 'length' });
}

/** Stream a chat completion through the configured provider. */
export async function streamChat(req, cb, signal) {
  const cfg = resolveConfig();
  req = { ...req, maxTokens: Math.min(req.maxTokens || 16000, cfg.maxOut) };
  if (cfg.provider === 'mock') return mockStream(req, cb, signal);
  if (cfg.provider === 'anthropic') return streamAnthropic(cfg, req, cb, signal);
  if (cfg.provider === 'openai') return streamOpenAI(cfg, req, cb, signal);
  throw new Error('Geen AI-koppeling actief. Kies in Instellingen een provider, of gebruik de kopieer-modus.');
}

/** One-off call for the settings "test connection" button. */
export async function testConnection() {
  let text = '';
  const t0 = Date.now();
  await streamChat({ system: '', messages: [{ role: 'user', content: 'Reply with the single word: OK' }], maxTokens: 20 }, {
    delta: (t) => { text += t; }, usage: () => {},
  });
  return { ok: true, reply: text.trim().slice(0, 40), ms: Date.now() - t0 };
}
