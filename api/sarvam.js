/**
 * Vercel serverless proxy for Sarvam AI, so the API key stays on the server.
 * Env: SARVAM_API_KEY (required), SARVAM_TIMEOUT_MS (optional, default 20 s)
 *   GET  /api/sarvam?op=status  -> { enabled }
 *   POST /api/sarvam?op=stt     raw audio body (Content-Type audio/*) -> { transcript, language_code }
 *   POST /api/sarvam?op=tts     JSON { text, language_code, pace }   -> { audios: [base64 wav] }
 * Errors: { error: { message } } with an HTTP status.
 */
import { LANGUAGES, SARVAM, TIMEOUT_MS, audioFileName } from '../js/config.js';
import { fetchWithTimeout } from '../js/lib/http.js';

const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_CALLS_PER_IP = 30; // ~15 questions (one STT + one TTS each) per window
const MAX_TRACKED_IPS = 5000;
const MAX_TTS_JSON_BYTES = 16 * 1024;
const SUPPORTED_LANGS = new Set(LANGUAGES);

/** Raised for request problems that should be reported to the caller with a specific status. */
class HttpProblem extends Error {
  /** @param {number} status @param {string} message */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Best-effort limiter: per warm function instance, resets on cold start. Not a global cap. */
const callsByIp = new Map();
/** @param {string} ip @param {number} [now] @returns {boolean} true when this call exceeds the limit */
export function rateLimited(ip, now = Date.now()) {
  const recent = (callsByIp.get(ip) || []).filter((/** @type {number} */ t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  callsByIp.set(ip, recent);
  if (callsByIp.size > MAX_TRACKED_IPS) callsByIp.clear();
  return recent.length > MAX_CALLS_PER_IP;
}

/** Only accept calls from pages on this site (or local development). @param {any} req */
function allowedOrigin(req) {
  try {
    const origin = new URL(req.headers.origin);
    return origin.host === req.headers.host || origin.hostname === 'localhost' || origin.hostname === '127.0.0.1';
  } catch {
    return false; // missing or malformed Origin header
  }
}

/** @param {any} req @param {number} maxBytes @returns {Promise<Buffer>} */
function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    let size = 0;
    req.on('data', (/** @type {Buffer} */ chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new HttpProblem(413, 'Request too large'));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** @param {any} res @param {number} status @param {unknown} body */
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
/** @param {any} res @param {number} status @param {string} message */
const fail = (res, status, message) => send(res, status, { error: { message } });

/** One JSON line per failure, so Vercel logs are searchable. Never logs request content or keys. */
function logFailure(/** @type {Record<string, unknown>} */ fields) {
  console.error(JSON.stringify({ level: 'error', scope: 'api/sarvam', ...fields }));
}

const timeoutMs = () => Number(process.env.SARVAM_TIMEOUT_MS) || TIMEOUT_MS.SARVAM;

/** @param {any} req @param {string} key */
async function speechToText(req, key) {
  const audio = await readBody(req, SARVAM.MAX_AUDIO_BYTES);
  if (audio.length < SARVAM.MIN_PROXY_AUDIO_BYTES) throw new HttpProblem(400, 'No audio');
  const type = String(req.headers['content-type'] || 'audio/webm').split(';')[0];
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)], { type }), audioFileName(type));
  form.append('model', SARVAM.STT_MODEL);
  form.append('language_code', SARVAM.AUTO_DETECT);
  return fetchWithTimeout(`${SARVAM.BASE_URL}/speech-to-text`, {
    method: 'POST',
    headers: { 'api-subscription-key': key },
    body: form,
    timeoutMs: timeoutMs(),
  });
}

/** @param {any} req @param {string} key */
async function textToSpeech(req, key) {
  const raw = await readBody(req, MAX_TTS_JSON_BYTES);
  let body;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    throw new HttpProblem(400, 'Invalid JSON');
  }
  const text = String(body.text || '').slice(0, SARVAM.MAX_PROXY_TTS_CHARS);
  if (!text.trim() || !SUPPORTED_LANGS.has(body.language_code)) throw new HttpProblem(400, 'Bad request');
  const pace = Math.min(SARVAM.PACE_MAX, Math.max(SARVAM.PACE_MIN, Number(body.pace) || 1));
  return fetchWithTimeout(`${SARVAM.BASE_URL}/text-to-speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': key },
    body: JSON.stringify({ text, language_code: body.language_code, model: SARVAM.TTS_MODEL, pace }),
    timeoutMs: timeoutMs(),
  });
}

const OPS = { stt: speechToText, tts: textToSpeech };

/** @param {any} req @param {any} res */
export default async function handler(req, res) {
  const key = process.env.SARVAM_API_KEY;
  const op = new URL(req.url, 'http://local').searchParams.get('op');

  if (req.method === 'GET' && op === 'status') return send(res, 200, { enabled: Boolean(key) });
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
  if (!key) return fail(res, 503, 'Sarvam is not configured');
  if (!allowedOrigin(req)) return fail(res, 403, 'Forbidden');
  const ip =
    String(req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim() || 'unknown';
  if (rateLimited(ip)) return fail(res, 429, 'Too many requests, try again in a few minutes');
  const run = OPS[/** @type {keyof typeof OPS} */ (op)];
  if (!run) return fail(res, 404, 'Unknown op');

  try {
    const upstream = await run(req, key);
    /** @type {any} */
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      logFailure({ op, upstreamStatus: upstream.status, message: data.error?.message });
      return fail(res, upstream.status, data.error?.message || 'Sarvam error');
    }
    return send(
      res,
      200,
      op === 'stt'
        ? { transcript: data.transcript || '', language_code: data.language_code || null }
        : { audios: data.audios || [] },
    );
  } catch (e) {
    const err = /** @type {any} */ (e);
    if (err instanceof HttpProblem) return fail(res, err.status, err.message);
    if (err.status === 504) {
      logFailure({ op, message: 'timeout', timeoutMs: timeoutMs() });
      return fail(res, 504, 'Sarvam timed out');
    }
    logFailure({ op, message: err.message || 'upstream request failed' });
    return fail(res, 502, 'Upstream request failed');
  }
}
