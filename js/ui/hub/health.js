/** Health tab: interactive AQI band scale and the organ explorer. */
import { Air } from '../../air.js';
import { ORGANS, US_INFO } from '../../data/content.js';
import { $ } from '../../dom.js';
import { ICON } from '../../icons.js';
import { BANDS, bandIndex } from '../../lib/aqi.js';
import { clamp } from '../../lib/util.js';

/** Lower and upper US AQI bound of each band, for positioning the "NOW" marker. */
const BAND_BOUNDS = [
  [0, 50],
  [51, 100],
  [101, 150],
  [151, 200],
  [201, 300],
  [301, 500],
];

/** @type {number | null} band the user tapped; null follows the live AQI */
let pickedBand = null;
let organIndex = 0;

export function renderScale() {
  const current = bandIndex(Air.aqi);
  const shown = pickedBand ?? current;
  $('scale').innerHTML = US_INFO.map(
    (b, i) =>
      `<button data-b="${i}" class="relative h-12 px-1 text-[10px] font-semibold leading-tight transition hover:brightness-105 ${shown === i ? 'outline outline-2 -outline-offset-2 outline-ink' : 'opacity-70'}" style="background:${BANDS[i].color};color:${BANDS[i].on}">${b.name}<br/><span class="font-normal">${b.range}</span></button>`,
  ).join('');

  // The scale has six equal segments; place the marker proportionally inside the current band.
  const [lo, hi] = BAND_BOUNDS[current];
  const pos = ((current + clamp((Air.aqi - lo) / (hi - lo), 0, 1)) / BAND_BOUNDS.length) * 100;
  $('scaleMarker').style.left = clamp(pos, 3, 97) + '%';
  $('scaleNow').textContent = Math.round(Air.aqi);

  const b = US_INFO[shown];
  $('scaleDetail').innerHTML = `
    <div><p class="text-[11px] uppercase tracking-wider text-ink2">Who's at risk</p><p class="mt-1 text-sm text-ink">${b.who}</p></div>
    <div><p class="text-[11px] uppercase tracking-wider text-ink2">What happens</p><p class="mt-1 text-sm text-ink">${b.eff}</p></div>
    <div><p class="text-[11px] uppercase tracking-wider text-ink2">What to do</p><ul class="mt-1 space-y-1 text-sm text-ink">${b.act.map((a) => `<li class="flex items-start gap-1.5"><span class="mt-0.5 text-sage-ink">${ICON.check}</span>${a}</li>`).join('')}</ul></div>`;

  $('scale')
    .querySelectorAll('button')
    .forEach((/** @type {any} */ el) =>
      el.addEventListener('click', () => {
        const i = +el.dataset.b;
        pickedBand = i === current ? null : i;
        renderScale();
      }),
    );
}

export function renderOrgans() {
  $('organs').innerHTML = ORGANS.map(
    (o, i) =>
      `<button data-o="${i}" class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${i === organIndex ? 'border-sage bg-sage-50 text-ink font-semibold' : 'border-ink/10 text-ink hover:bg-blush-50'}">${ICON[o.i]}${o.k}</button>`,
  ).join('');
  const o = ORGANS[organIndex];
  const detail = $('organDetail');
  detail.innerHTML = `<p class="flex items-center gap-2 font-display text-2xl font-semibold text-ink"><span class="grid h-9 w-9 place-items-center rounded-full bg-sage-50 text-sage-ink">${ICON[o.i].replace('h-4 w-4', 'h-5 w-5')}</span>${o.k}</p><p class="mt-2">${o.t}</p>`;
  // Restart the fade-in animation.
  detail.classList.remove('card-in');
  void detail.offsetWidth;
  detail.classList.add('card-in');
  $('organs')
    .querySelectorAll('button')
    .forEach((/** @type {any} */ b) =>
      b.addEventListener('click', () => {
        organIndex = +b.dataset.o;
        renderOrgans();
      }),
    );
}
