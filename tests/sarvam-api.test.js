import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import handler, { rateLimited } from '../api/sarvam.js';

const realFetch = globalThis.fetch;
let upstreamCalls;

function call({ method = 'POST', op = 'tts', origin = 'https://anilak.vercel.app', body = '', type = 'application/json', ip }) {
  const req = Readable.from(body ? [Buffer.isBuffer(body) ? body : Buffer.from(body)] : []);
  Object.assign(req, {
    method,
    url: `/api/sarvam?op=${op}`,
    headers: {
      host: 'anilak.vercel.app',
      'content-type': type,
      'x-forwarded-for': ip ?? `10.0.0.${Math.floor(Math.random() * 250)}`,
      ...(origin ? { origin } : {}),
    },
  });
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      end(data) { resolve({ status: this.statusCode, body: JSON.parse(data) }); },
    };
    handler(req, res);
  });
}

beforeEach(() => {
  process.env.SARVAM_API_KEY = 'test-key';
  upstreamCalls = [];
  globalThis.fetch = async (url, init) => {
    upstreamCalls.push({ url, init });
    const payload = url.endsWith('/text-to-speech') ? { audios: ['UklGRg=='] } : { transcript: 'hello', language_code: 'en-IN' };
    return new Response(JSON.stringify(payload), { status: 200 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; delete process.env.SARVAM_API_KEY; });

test('status reports whether the key is configured', async () => {
  assert.deepEqual((await call({ method: 'GET', op: 'status' })).body, { enabled: true });
  delete process.env.SARVAM_API_KEY;
  assert.deepEqual((await call({ method: 'GET', op: 'status' })).body, { enabled: false });
});

test('rejects wrong method, missing key, foreign or missing origin', async () => {
  assert.equal((await call({ method: 'GET', op: 'tts' })).status, 405);
  assert.equal((await call({ origin: 'https://evil.example', body: '{}' })).status, 403);
  assert.equal((await call({ origin: null, body: '{}' })).status, 403);
  delete process.env.SARVAM_API_KEY;
  assert.equal((await call({ body: '{}' })).status, 503);
  assert.equal(upstreamCalls.length, 0, 'nothing reaches Sarvam');
});

test('tts validates input, clamps pace and forwards with the server key', async () => {
  assert.equal((await call({ body: '{"text":"hi","language_code":"xx-XX"}' })).status, 400);
  assert.equal((await call({ body: 'not json' })).status, 400);
  const ok = await call({ body: JSON.stringify({ text: 'Air is fine', language_code: 'hi-IN', pace: 9 }) });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body, { audios: ['UklGRg=='] });
  const sent = JSON.parse(upstreamCalls[0].init.body);
  assert.deepEqual(sent, { text: 'Air is fine', language_code: 'hi-IN', model: 'bulbul:v3', pace: 2 });
  assert.equal(upstreamCalls[0].init.headers['api-subscription-key'], 'test-key');
});

test('stt forwards audio with auto-detect and rejects empty or oversized uploads', async () => {
  assert.equal((await call({ op: 'stt', type: 'audio/webm', body: Buffer.alloc(10) })).status, 400);
  assert.equal((await call({ op: 'stt', type: 'audio/webm', body: Buffer.alloc(1.6 * 1024 * 1024) })).status, 413);
  const ok = await call({ op: 'stt', type: 'audio/webm', body: Buffer.alloc(5000) });
  assert.deepEqual(ok.body, { transcript: 'hello', language_code: 'en-IN' });
  const fd = upstreamCalls.at(-1).init.body;
  assert.equal(fd.get('model'), 'saaras:v4');
  assert.equal(fd.get('language_code'), 'unknown');
  assert.equal(fd.get('file').name, 'speech.webm');
});

test('upstream errors are passed through with their status', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), { status: 429 });
  const r = await call({ body: JSON.stringify({ text: 'hi', language_code: 'en-IN' }) });
  assert.equal(r.status, 429);
  assert.equal(r.body.error.message, 'Quota exceeded');
});

test('rate limiter allows 30 calls per IP per 10 minutes', () => {
  const now = 1_000_000;
  for (let i = 0; i < 30; i++) assert.equal(rateLimited('1.2.3.4', now), false);
  assert.equal(rateLimited('1.2.3.4', now), true, '31st call blocked');
  assert.equal(rateLimited('5.6.7.8', now), false, 'other IPs unaffected');
  assert.equal(rateLimited('1.2.3.4', now + 10 * 60 * 1000 + 1), false, 'window expires');
});
