import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError, fetchJson, fetchWithTimeout } from '../js/lib/http.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
/** A fetch that never resolves until aborted, like a stalled server. */
const hanging = (_url, init) =>
  new Promise((_, reject) =>
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))),
  );

test('times out with a 504 HttpError', async () => {
  await assert.rejects(fetchWithTimeout('https://x.test', { timeoutMs: 20, fetchImpl: hanging }), (e) => {
    assert.ok(e instanceof HttpError);
    assert.equal(e.status, 504);
    assert.match(e.message, /timed out/);
    return true;
  });
});

test('retries network errors and 5xx, then succeeds', async () => {
  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls === 1) throw new TypeError('fetch failed');
    if (calls === 2) return json({}, 503);
    return json({ ok: true });
  };
  const res = await fetchWithTimeout('https://x.test', {
    timeoutMs: 1000,
    retries: 2,
    retryDelayMs: 1,
    fetchImpl: flaky,
  });
  assert.equal(res.status, 200);
  assert.equal(calls, 3);
});

test('does not retry 4xx responses', async () => {
  let calls = 0;
  const res = await fetchWithTimeout('https://x.test', {
    timeoutMs: 1000,
    retries: 3,
    retryDelayMs: 1,
    fetchImpl: async () => (calls++, json({}, 404)),
  });
  assert.equal(res.status, 404);
  assert.equal(calls, 1);
});

test('network errors surface as status 0 once retries are used up', async () => {
  await assert.rejects(
    fetchWithTimeout('https://x.test', {
      timeoutMs: 1000,
      retries: 1,
      retryDelayMs: 1,
      fetchImpl: async () => {
        throw new TypeError('fetch failed');
      },
    }),
    (e) => e instanceof HttpError && e.status === 0 && e.message === 'fetch failed',
  );
});

test("fetchJson returns the body, and throws the provider's error message on failure", async () => {
  assert.deepEqual(await fetchJson('https://x.test', { timeoutMs: 1000, fetchImpl: async () => json({ a: 1 }) }), {
    a: 1,
  });
  await assert.rejects(
    fetchJson('https://x.test', {
      timeoutMs: 1000,
      fetchImpl: async () => json({ error: { message: 'Quota exceeded' } }, 429),
    }),
    (e) => e.status === 429 && e.message === 'Quota exceeded',
  );
  await assert.rejects(
    fetchJson('https://x.test', {
      timeoutMs: 1000,
      fetchImpl: async () => new Response('<html>oops</html>', { status: 502 }),
    }),
    (e) => e.status === 502 && e.message === 'HTTP 502',
  );
});
