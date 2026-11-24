/**
 * Sarvam speech-to-text and text-to-speech requests (no DOM).
 * With a personal key the browser calls Sarvam directly; without one it uses this site's
 * /api/sarvam proxy, which adds the key on the server.
 */
import { SARVAM, TIMEOUT_MS, audioFileName } from '../config.js';
import { fetchJson } from './http.js';

/** @typedef {import('../types.js').Transcript} Transcript */

const PROXY = '/api/sarvam';

/**
 * @param {Blob} audio recorded clip
 * @param {string} [key] personal Sarvam key; omit to use the proxy
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<Transcript>}
 */
export async function transcribe(audio, key, fetchImpl) {
  let url = `${PROXY}?op=stt`;
  /** @type {RequestInit} */
  let init = { method: 'POST', headers: { 'Content-Type': audio.type }, body: audio };
  if (key) {
    const form = new FormData();
    form.append('file', audio, audioFileName(audio.type));
    form.append('model', SARVAM.STT_MODEL);
    form.append('language_code', SARVAM.AUTO_DETECT);
    url = `${SARVAM.BASE_URL}/speech-to-text`;
    init = { method: 'POST', headers: { 'api-subscription-key': key }, body: form };
  }
  const data = await fetchJson(url, { ...init, timeoutMs: TIMEOUT_MS.SARVAM, fetchImpl });
  return { text: String(data.transcript || '').trim(), language: data.language_code || null };
}

/**
 * @param {string} text
 * @param {string} lang BCP-47
 * @param {number} pace speaking rate (0.5–2)
 * @param {string} [key] personal Sarvam key; omit to use the proxy
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<string[]>} base64 WAV clips, in order
 * @throws {Error} when Sarvam returns no audio
 */
export async function synthesize(text, lang, pace, key, fetchImpl) {
  const direct = Boolean(key);
  const data = await fetchJson(direct ? `${SARVAM.BASE_URL}/text-to-speech` : `${PROXY}?op=tts`, {
    method: 'POST',
    timeoutMs: TIMEOUT_MS.SARVAM,
    fetchImpl,
    headers: direct
      ? { 'Content-Type': 'application/json', 'api-subscription-key': /** @type {string} */ (key) }
      : { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      direct
        ? { text: text.slice(0, SARVAM.MAX_TTS_CHARS), language_code: lang, model: SARVAM.TTS_MODEL, pace }
        : { text, language_code: lang, pace },
    ),
  });
  const clips = Array.isArray(data.audios) ? data.audios : [];
  if (!clips.length) throw new Error('no audio returned');
  return clips;
}
