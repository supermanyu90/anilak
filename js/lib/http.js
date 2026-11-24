/** fetch with a timeout, optional retries for transient failures, and readable errors. Works in browsers and Node. */

export class HttpError extends Error {
  /** @param {string} message @param {number} status 0 = network error, 504 = timed out */
  constructor(message, status) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @typedef {RequestInit & {
 *   timeoutMs: number,
 *   retries?: number,
 *   retryDelayMs?: number,
 *   fetchImpl?: typeof fetch,
 * }} FetchOptions
 * `retries` re-sends on network errors, timeouts and 5xx responses, so only use it for idempotent requests.
 */

/**
 * @param {string} url
 * @param {FetchOptions} options
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, { timeoutMs, retries = 0, retryDelayMs = 400, fetchImpl, ...init }) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await doFetch(url, { ...init, signal: ctrl.signal });
      if (res.status >= 500 && attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      return res;
    } catch (e) {
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      const err = /** @type {Error} */ (e);
      throw err.name === 'AbortError'
        ? new HttpError(`timed out after ${Math.round(timeoutMs / 1000)}s`, 504)
        : new HttpError(err.message || 'network error', 0);
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Fetch and parse a JSON body. Non-2xx responses throw an HttpError carrying the
 * provider's `error.message` when present (Sarvam, Gemini and our proxy all use that shape).
 * @param {string} url
 * @param {FetchOptions} options
 * @returns {Promise<any>}
 */
export async function fetchJson(url, options) {
  const res = await fetchWithTimeout(url, options);
  /** @type {any} */
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null; // empty or non-JSON body; the status code below still tells us what happened
  }
  if (!res.ok) throw new HttpError(body?.error?.message || `HTTP ${res.status}`, res.status);
  return body ?? {};
}
