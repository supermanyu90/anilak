/** DOM and browser-storage helpers. */
import { ICON } from './icons.js';

export const $ = (id) => document.getElementById(id);
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

export function tween(el, to, dec = 0) {
  const from = parseFloat(el.dataset.v || '0') || 0; el.dataset.v = to;
  const t0 = performance.now();
  const step = (now) => { const p = Math.min(1, (now - t0) / 600), e = 1 - Math.pow(1 - p, 3);
    el.textContent = (from + (to - from) * e).toFixed(dec); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

let noteTimer;
export function note(msg) {
  const el = $('speechNote'); el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(noteTimer); noteTimer = setTimeout(() => el.classList.add('hidden'), 5000);
}
export function micUI(on) {
  const b = $('micBtn');
  b.classList.toggle('mic-live', on); b.classList.toggle('bg-gold', !on); b.classList.toggle('bg-blush', on);
  b.innerHTML = on ? ICON.stop : ICON.mic; b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Stop listening' : 'Start speaking');
}
