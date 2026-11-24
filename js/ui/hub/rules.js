/** Rules & standards tab: your air vs WHO/India limits, the CPCB scale, GRAP stages; plus the India AQI tile. */
import { Air } from '../../air.js';
import { LIMITS, PM10_PER_PM25 } from '../../config.js';
import { CPCB, GRAP } from '../../data/content.js';
import { $ } from '../../dom.js';
import { activeGrapStage, cpcbCat, indianAQI } from '../../lib/aqi.js';
import { clamp } from '../../lib/util.js';

/** Bar scale headroom above the larger of the reading and the India limit. */
const BAR_HEADROOM = 1.15;
const BAR_COLOR = { over: '#E39A96', aboveWho: '#EBD58A', ok: '#A8D5BA' };

/** @type {number | null} stage the user tapped; null follows the live AQI */
let pickedStage = null;

/** One reading against its WHO and India 24-hour limits. @param {string} label @param {number} value @param {{ WHO: number, INDIA: number }} limit */
function limitRow(label, value, limit) {
  const max = Math.max(value, limit.INDIA) * BAR_HEADROOM;
  const pct = (/** @type {number} */ x) => clamp((x / max) * 100, 0, 100);
  const color = value > limit.INDIA ? BAR_COLOR.over : value > limit.WHO ? BAR_COLOR.aboveWho : BAR_COLOR.ok;
  return `<div>
      <div class="flex items-baseline justify-between text-xs"><span class="font-semibold text-ink">${label}</span><span class="text-ink2"><b class="text-ink tabular-nums">${Math.round(value)}</b> µg/m³ · <b class="text-ink">${(value / limit.WHO).toFixed(1)}×</b> WHO · <b class="text-ink">${(value / limit.INDIA).toFixed(1)}×</b> India</span></div>
      <div class="relative mt-5 h-3 rounded-full bg-mist">
        <div class="h-full rounded-full transition-all duration-700" style="width:${pct(value)}%;background:${color}"></div>
        <div class="absolute -top-4 bottom-0 border-l border-dashed border-sage-ink" style="left:${pct(limit.WHO)}%"><span class="absolute -top-0.5 left-1 whitespace-nowrap text-[10px] text-sage-ink">WHO ${limit.WHO}</span></div>
        <div class="absolute -top-4 bottom-0 border-l border-dashed border-gold-ink" style="left:${pct(limit.INDIA)}%"><span class="absolute -top-0.5 left-1 whitespace-nowrap text-[10px] text-gold-ink">India ${limit.INDIA}</span></div>
      </div></div>`;
}

/** @param {number} indAqi @param {(typeof CPCB)[number]} current */
function cpcbHtml(indAqi, current) {
  return CPCB.map((c, i) => {
    const lo = i ? CPCB[i - 1].max + 1 : 0;
    const on = c === current;
    return `<div class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition ${on ? 'bg-mist ring-1 ring-ink/15' : ''}">
      <span class="h-3 w-3 shrink-0 rounded-full" style="background:${c.color}"></span>
      <span class="w-24 shrink-0 text-xs font-semibold text-ink">${c.name}</span>
      <span class="w-14 shrink-0 text-[11px] tabular-nums text-ink2">${lo}–${c.max}</span>
      <span class="text-[11px] ${on ? 'text-ink' : 'text-ink2'}">${c.t}</span>
      ${on ? `<span class="ml-auto shrink-0 rounded bg-ink px-1.5 text-[10px] font-bold text-cream">${indAqi}</span>` : ''}
    </div>`;
  }).join('');
}

/** @param {number} selected @param {number} active index of the stage in force, -1 for none */
const stageStatus = (selected, active) =>
  selected <= active
    ? '<span class="ml-1 rounded bg-blush-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-ink">in force at this AQI</span>'
    : '<span class="ml-1 text-[10px] font-normal text-ink2">(not triggered at this AQI)</span>';

/** @param {number} indAqi */
function renderGrap(indAqi) {
  const active = activeGrapStage(indAqi);
  $('grapNow').innerHTML =
    active >= 0
      ? `At India AQI <b class="text-ink">${indAqi}</b>, Delhi-NCR would be at <b class="text-ink">${GRAP[active].stage}</b>`
      : `At India AQI <b class="text-ink">${indAqi}</b>, no GRAP stage applies`;
  const selected = pickedStage ?? Math.max(active, 0);
  $('grapSteps').innerHTML = GRAP.map(
    (
      g,
      i,
    ) => `<button data-g="${i}" class="rounded-xl border p-3 text-left transition ${i === selected ? 'border-ink/30 bg-mist' : 'border-ink/10 hover:bg-blush-50'}">
      <p class="flex items-center justify-between text-xs font-semibold text-ink">${g.stage}${i <= active ? '<span class="h-2 w-2 rounded-full bg-rose-ink"></span>' : ''}</p>
      <p class="text-[11px] text-ink2">${g.label} · ${g.range}</p></button>`,
  ).join('');
  const g = GRAP[selected];
  $('grapDetail').innerHTML =
    `<p class="text-xs font-semibold text-ink">${g.stage} measures ${stageStatus(selected, active)}</p><ul class="mt-2 grid gap-1.5 text-xs text-ink sm:grid-cols-2">${g.m.map((x) => `<li>• ${x}</li>`).join('')}</ul>`;
  $('grapSteps')
    .querySelectorAll('button')
    .forEach((/** @type {any} */ b) =>
      b.addEventListener('click', () => {
        pickedStage = +b.dataset.g;
        renderGrap(indAqi);
      }),
    );
}

export function renderRules() {
  const pm25 = Air.pm2_5;
  const pm10 = Air.pm10 ?? Math.round(pm25 * PM10_PER_PM25);
  $('limits').innerHTML = limitRow('PM2.5', pm25, LIMITS.PM25) + limitRow('PM10', pm10, LIMITS.PM10);

  const indAqi = indianAQI(pm25, pm10);
  const category = cpcbCat(indAqi);
  $('cpcb').innerHTML = cpcbHtml(indAqi, category);
  renderGrap(indAqi);

  $('gInd').textContent = indAqi;
  $('gIndDot').style.background = category.color;
  $('gIndCat').textContent = category.name + ' · CPCB scale (est.)';
}
