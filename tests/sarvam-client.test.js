import { test } from 'node:test';
import assert from 'node:assert/strict';
import { synthesize, transcribe } from '../js/lib/sarvam-client.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const capture = (body, status) => {
  const calls = [];
  const fetchImpl = async (url, init) => (calls.push({ url, init }), json(body, status));
  return { calls, fetchImpl };
};
const clip = new Blob([new Uint8Array(3000)], { type: 'audio/webm' });

test('transcribe with a personal key calls Sarvam directly with auto-detect', async () => {
  const { calls, fetchImpl } = capture({ transcript: '  hello  ', language_code: 'hi-IN' });
  const r = await transcribe(clip, 'my-key', fetchImpl);
  assert.deepEqual(r, { text: 'hello', language: 'hi-IN' });
  assert.equal(calls[0].url, 'https://api.sarvam.ai/speech-to-text');
  assert.equal(calls[0].init.headers['api-subscription-key'], 'my-key');
  const form = calls[0].init.body;
  assert.equal(form.get('model'), 'saaras:v4');
  assert.equal(form.get('language_code'), 'unknown');
  assert.equal(form.get('file').name, 'speech.webm');
});

test('transcribe without a key posts raw audio to the proxy', async () => {
  const { calls, fetchImpl } = capture({ transcript: 'hi', language_code: null });
  const r = await transcribe(clip, undefined, fetchImpl);
  assert.deepEqual(r, { text: 'hi', language: null });
  assert.equal(calls[0].url, '/api/sarvam?op=stt');
  assert.equal(calls[0].init.headers['Content-Type'], 'audio/webm');
  assert.ok(!('api-subscription-key' in calls[0].init.headers), 'no key leaves the browser');
});

test('transcribe surfaces provider errors', async () => {
  const { fetchImpl } = capture({ error: { message: 'Invalid API key' } }, 403);
  await assert.rejects(transcribe(clip, 'bad', fetchImpl), /Invalid API key/);
});

test('synthesize direct: model, pace and the 2,500-character limit', async () => {
  const { calls, fetchImpl } = capture({ audios: ['UklGRg==', 'UklGRh=='] });
  const clips = await synthesize('x'.repeat(3000), 'ta-IN', 1.15, 'my-key', fetchImpl);
  assert.deepEqual(clips, ['UklGRg==', 'UklGRh==']);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(calls[0].url, 'https://api.sarvam.ai/text-to-speech');
  assert.equal(body.model, 'bulbul:v3');
  assert.equal(body.pace, 1.15);
  assert.equal(body.text.length, 2500);
});

test('synthesize via proxy sends no key and lets the server cap the text', async () => {
  const { calls, fetchImpl } = capture({ audios: ['UklGRg=='] });
  await synthesize('Air is fine.', 'en-IN', 1, undefined, fetchImpl);
  assert.equal(calls[0].url, '/api/sarvam?op=tts');
  assert.deepEqual(JSON.parse(calls[0].init.body), { text: 'Air is fine.', language_code: 'en-IN', pace: 1 });
  assert.ok(!('api-subscription-key' in calls[0].init.headers));
});

test('synthesize rejects an empty audio list so the caller falls back to the browser voice', async () => {
  const { fetchImpl } = capture({ audios: [] });
  await assert.rejects(synthesize('hi', 'en-IN', 1, 'k', fetchImpl), /no audio/);
});
