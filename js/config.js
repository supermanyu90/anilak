/**
 * Shared constants for the browser app and the /api/sarvam function.
 * No DOM or Node APIs here, so both runtimes (and the tests) can import it.
 */

/** Languages Anilak answers in (BCP-47). Must match the keys of data/l10n.js. */
export const LANGUAGES = Object.freeze(['en-IN', 'hi-IN', 'mr-IN', 'bn-IN', 'ta-IN']);

export const SARVAM = Object.freeze({
  BASE_URL: 'https://api.sarvam.ai',
  STT_MODEL: 'saaras:v4',
  TTS_MODEL: 'bulbul:v3',
  /** language_code value that asks Sarvam to detect the spoken language. */
  AUTO_DETECT: 'unknown',
  /** Sarvam's own per-request text limit (used for direct calls with a personal key). */
  MAX_TTS_CHARS: 2500,
  /** Stricter cap on the public proxy, which spends the site owner's credit. */
  MAX_PROXY_TTS_CHARS: 1000,
  MAX_AUDIO_BYTES: 1.5 * 1024 * 1024,
  /** Clips smaller than this are treated as silence (client) or rejected (proxy). */
  MIN_CLIP_BYTES: 2000,
  MIN_PROXY_AUDIO_BYTES: 1000,
  /** The REST speech-to-text endpoint is meant for clips under 30 s. */
  MAX_RECORDING_MS: 25_000,
  PACE_MIN: 0.5,
  PACE_MAX: 2,
});

/** MediaRecorder formats to try, in order, and the file extension Sarvam expects for each. */
export const RECORDING_MIME_TYPES = Object.freeze(['audio/webm', 'audio/mp4', 'audio/ogg']);
export const AUDIO_EXT = Object.freeze({
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
});
/** @param {string} mime @returns {string} */
export const audioFileName = (mime) => 'speech.' + (AUDIO_EXT[/** @type {keyof typeof AUDIO_EXT} */ (mime)] || 'webm');

export const GEMINI = Object.freeze({
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  DEFAULT_MODEL: 'gemini-3-flash-preview',
  TEMPERATURE: 0.4,
});

export const OPEN_METEO_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/** Network timeouts (ms) and retries. */
export const TIMEOUT_MS = Object.freeze({ AIR: 9000, GEMINI: 15_000, SARVAM: 20_000, STATUS: 5000 });
export const AIR_RETRIES = 1;

/** localStorage keys. Values are part of saved user state, so never rename them. */
export const STORAGE_KEYS = Object.freeze({
  GEMINI_KEY: 'hb_key',
  GEMINI_MODEL: 'hb_model',
  SARVAM_KEY: 'hb_sarvam_key',
  LANG: 'hb_lang',
  RATE: 'hb_rate',
  TAB: 'hb_tab',
  TIPS: 'hb_tips',
});

/** 24-hour ambient limits in µg/m³: WHO 2021 guidelines and India NAAQS 2009. */
export const LIMITS = Object.freeze({
  PM25: { WHO: 15, INDIA: 60 },
  PM10: { WHO: 45, INDIA: 100 },
});

/** Berkeley Earth rule of thumb: 22 µg/m³ of PM2.5 over a day ≈ smoking one cigarette. */
export const PM25_PER_CIGARETTE = 22;
/** Rough PM10:PM2.5 ratio used only when PM10 is unavailable (simulator, missing data). */
export const PM10_PER_PM25 = 1.7;

/** How long status notes stay on screen, and how long the emergency alarm keeps Vayu red. */
export const NOTE_MS = 5000;
export const EMERGENCY_ALARM_MS = 12_000;
