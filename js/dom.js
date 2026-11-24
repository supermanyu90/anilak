/** DOM and browser-storage helpers. */
import { NOTE_MS } from './config.js';
import { ICON } from './icons.js';
import { logger } from './lib/log.js';

const log = logger('dom');

/**
 * Element by id. Typed `any` on purpose: callers know which element type each id is,
 * and the page's ids are fixed in index.html.
 * @param {string} id
 * @returns {any}
 */
export const $ = (id) => document.getElementById(id);

/** localStorage that never throws: storage can be blocked (private mode, disabled site data). */
export const store = {
  /** @param {string} key @param {string} fallback @returns {string} */
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) {
      log.debug(`storage read blocked for ${key}`, e);
      return fallback;
    }
  },
  /** @param {string} key @param {string} value */
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      log.debug(`storage write blocked for ${key}`, e);
    }
  },
  /** @param {string} key */
  del(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      log.debug(`storage delete blocked for ${key}`, e);
    }
  },
};

const TWEEN_MS = 600;
/** Animate a number in an element from its last value to `to`. @param {any} el @param {number} to @param {number} [decimals] */
export function tween(el, to, decimals = 0) {
  const from = parseFloat(el.dataset.v || '0') || 0;
  el.dataset.v = to;
  const t0 = performance.now();
  const step = (/** @type {number} */ now) => {
    const p = Math.min(1, (now - t0) / TWEEN_MS);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = (from + (to - from) * eased).toFixed(decimals);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** @type {ReturnType<typeof setTimeout> | undefined} */
let noteTimer;
/** Show a short status note on Vayu's panel. @param {string} message */
export function note(message) {
  const el = $('speechNote');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => el.classList.add('hidden'), NOTE_MS);
}

/** Toggle the mic button between idle and recording. @param {boolean} on */
export function micUI(on) {
  const b = $('micBtn');
  b.classList.toggle('mic-live', on);
  b.classList.toggle('bg-gold', !on);
  b.classList.toggle('bg-blush', on);
  b.innerHTML = on ? ICON.stop : ICON.mic;
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', on ? 'Stop listening' : 'Start speaking');
}
