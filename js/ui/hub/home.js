/** Healthy-home tab: checklist with a saved score, and the purifier (CADR) size calculator. */
import { Air } from '../../air.js';
import { STORAGE_KEYS } from '../../config.js';
import { TIPS } from '../../data/content.js';
import { $, store, tween } from '../../dom.js';
import { logger } from '../../lib/log.js';
import { requiredCadr } from '../../lib/util.js';

const log = logger('hub/home');

/** Score ring: circumference of the r=52 circle in index.html. */
const RING_CIRCUMFERENCE = 2 * Math.PI * 52;
/** Above this AQI, recommend a bigger unit (×1.4) or two. */
const SIZE_UP_AQI = 200;
const SIZE_UP_FACTOR = 1.4;
const SQFT_PER_M2 = 10.764;
const M3H_PER_CFM = 1.699;

/** @returns {Set<string>} tip ids the user has ticked */
function loadDone() {
  try {
    const saved = JSON.parse(store.get(STORAGE_KEYS.TIPS, '[]'));
    return new Set(Array.isArray(saved) ? saved : []);
  } catch (e) {
    log.warn('saved checklist was unreadable; starting fresh', e);
    store.set(STORAGE_KEYS.TIPS, '[]');
    return new Set();
  }
}
const done = loadDone();
const saveDone = () => store.set(STORAGE_KEYS.TIPS, JSON.stringify([...done]));

export function renderTips() {
  const categories = [...new Set(TIPS.map((t) => t.c))];
  $('tips').innerHTML = categories
    .map(
      (c) =>
        `<div><p class="mb-2 text-[11px] uppercase tracking-wider text-ink2">${c}</p><div class="space-y-2">${TIPS.filter(
          (t) => t.c === c,
        )
          .map(
            (t) => `
    <div class="tip rounded-xl border ${done.has(t.id) ? 'border-sage bg-sage-50' : 'border-ink/[.06] bg-mist'} transition">
      <div class="flex items-center gap-3 p-3">
        <input type="checkbox" data-id="${t.id}" ${done.has(t.id) ? 'checked' : ''} class="h-4 w-4 shrink-0 accent-[#2F6B4A]" aria-label="${t.t}" />
        <button class="flex flex-1 items-center justify-between gap-2 text-left text-sm ${done.has(t.id) ? 'text-ink2 line-through decoration-sage-ink/60' : 'text-ink'}" data-x="${t.id}" aria-expanded="false">${t.t}<span class="shrink-0 rounded-md bg-mist px-1.5 py-0.5 text-[10px] text-ink2 no-underline">${t.cost}</span></button>
      </div>
      <p class="hidden px-10 pb-3 text-xs leading-relaxed text-ink2" id="how-${t.id}">${t.h}</p>
    </div>`,
          )
          .join('')}</div></div>`,
    )
    .join('');
  $('tips')
    .querySelectorAll('input')
    .forEach((/** @type {any} */ box) =>
      box.addEventListener('change', () => {
        if (box.checked) done.add(box.dataset.id);
        else done.delete(box.dataset.id);
        saveDone();
        renderTips();
        renderScore();
      }),
    );
  $('tips')
    .querySelectorAll('[data-x]')
    .forEach((/** @type {any} */ b) =>
      b.addEventListener('click', () => {
        const expanded = !$('how-' + b.dataset.x).classList.toggle('hidden');
        b.setAttribute('aria-expanded', String(expanded));
      }),
    );
}

/** @param {number} score 0–100 */
const scoreMessage = (score) =>
  score === 100
    ? 'Excellent. Your home is a clean-air refuge.'
    : score >= 75
      ? 'Great habits. A couple more to go.'
      : score >= 40
        ? 'Good start. Filtration gives the biggest jump.'
        : 'Tick what you already do, then add one tip a week.';

export function renderScore() {
  const score = Math.round((done.size / TIPS.length) * 100);
  tween($('scoreNum'), score);
  const ring = $('ring');
  ring.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - score / 100);
  ring.style.stroke = score >= 75 ? '#2F6B4A' : score >= 40 ? '#A8D5BA' : '#E8B4B8';
  $('scoreMsg').textContent = scoreMessage(score);
}

export function renderCadr() {
  const area = +$('roomArea').value;
  const height = +$('roomH').value;
  const cadr = requiredCadr(area, height);
  $('areaVal').textContent = area;
  $('areaFt').textContent = Math.round(area * SQFT_PER_M2);
  $('hVal').textContent = height.toFixed(1);
  $('cadr').textContent = cadr;
  $('cfm').textContent = Math.round(cadr / M3H_PER_CFM);
  $('cadrTip').textContent =
    Air.aqi > SIZE_UP_AQI
      ? `At AQI ${Math.round(Air.aqi)}, size up: aim for about ${Math.round(cadr * SIZE_UP_FACTOR)} m³/h, or run two units in this room.`
      : 'Check CADR on the box rather than the "room size" claim, which often assumes far fewer air changes.';
}

export function initHome() {
  $('roomArea').addEventListener('input', renderCadr);
  $('roomH').addEventListener('input', renderCadr);
  $('resetTips').addEventListener('click', () => {
    done.clear();
    saveDone();
    renderTips();
    renderScore();
  });
  renderTips();
  renderScore();
}
