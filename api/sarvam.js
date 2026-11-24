// Vercel serverless proxy for Sarvam AI, so the API key stays on the server.
// Env: SARVAM_API_KEY
//   GET  /api/sarvam?op=status  -> { enabled }
//   POST /api/sarvam?op=stt     raw audio body (Content-Type audio/*) -> { transcript, language_code }
//   POST /api/sarvam?op=tts     JSON { text, language_code, pace }   -> { audios: [base64 wav] }
const SARVAM = 'https://api.sarvam.ai';
const WINDOW_MS = 10 * 60 * 1000;
const PER_IP = 30; // ~15 questions (one STT + one TTS each) per 10 minutes
const MAX_AUDIO_BYTES = 1.5 * 1024 * 1024;
const MAX_TEXT = 1000;
const LANGS = new Set(['en-IN', 'hi-IN', 'mr-IN', 'bn-IN', 'ta-IN']);
const AUDIO_EXT = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav' };

// Best-effort limiter: per warm function instance, resets on cold start.
const seen = new Map();
function rateLimited(ip, now = Date.now()) {
  const recent = (seen.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  seen.set(ip, recent);
  if (seen.size > 5000) seen.clear();
  return recent.length > PER_IP;
}

// Only accept calls from pages on this site (or local development).
function allowedOrigin(req) {
  try {
    const o = new URL(req.headers.origin);
    return o.host === req.headers.host || o.hostname === 'localhost' || o.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > max) { reject(Object.assign(new Error('Request too large'), { status: 413 })); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
const fail = (res, status, message) => send(res, status, { error: { message } });

async function handler(req, res) {
  const key = process.env.SARVAM_API_KEY;
  const op = new URL(req.url, 'http://local').searchParams.get('op');

  if (req.method === 'GET' && op === 'status') return send(res, 200, { enabled: !!key });
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
  if (!key) return fail(res, 503, 'Sarvam is not configured');
  if (!allowedOrigin(req)) return fail(res, 403, 'Forbidden');
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return fail(res, 429, 'Too many requests, try again in a few minutes');

  try {
    let upstream;
    if (op === 'stt') {
      const audio = await readBody(req, MAX_AUDIO_BYTES);
      if (audio.length < 1000) return fail(res, 400, 'No audio');
      const type = String(req.headers['content-type'] || 'audio/webm').split(';')[0];
      const fd = new FormData();
      fd.append('file', new Blob([audio], { type }), 'speech.' + (AUDIO_EXT[type] || 'webm'));
      fd.append('model', 'saaras:v4');
      fd.append('language_code', 'unknown');
      upstream = await fetch(SARVAM + '/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': key }, body: fd });
    } else if (op === 'tts') {
      let body;
      try { body = JSON.parse((await readBody(req, 16 * 1024)).toString('utf8')); } catch (e) { if (e.status) throw e; return fail(res, 400, 'Invalid JSON'); }
      const text = String(body.text || '').slice(0, MAX_TEXT);
      if (!text.trim() || !LANGS.has(body.language_code)) return fail(res, 400, 'Bad request');
      const pace = Math.min(2, Math.max(0.5, Number(body.pace) || 1));
      upstream = await fetch(SARVAM + '/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-subscription-key': key },
        body: JSON.stringify({ text, language_code: body.language_code, model: 'bulbul:v3', pace }),
      });
    } else {
      return fail(res, 404, 'Unknown op');
    }

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return fail(res, upstream.status, data.error?.message || 'Sarvam error');
    return send(res, 200, op === 'stt'
      ? { transcript: data.transcript || '', language_code: data.language_code || null }
      : { audios: data.audios || [] });
  } catch (e) {
    return fail(res, e.status || 502, e.status ? e.message : 'Upstream request failed');
  }
}

module.exports = handler;
module.exports.rateLimited = rateLimited; // exported for tests
