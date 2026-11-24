/** 24-hour forecast chart and the "best time outside" tile. */
import { Air } from '../../air.js';
import { US_INFO } from '../../data/content.js';
import { $ } from '../../dom.js';
import { BANDS, bandIndex, cleanestWindow } from '../../lib/aqi.js';
import { clamp, fmtHour, fmtHourShort } from '../../lib/util.js';

/** @typedef {import('../../types.js').HourlyPoint} HourlyPoint */

const GRIDLINES = [50, 100, 150, 200, 300];
const MIN_SCALE_TOP = 200;
const WINDOW_HOURS = 2;

/** @param {number} aqi */
const bandLabel = (aqi) => US_INFO[bandIndex(aqi)].name;
/** @param {HourlyPoint} h */
const hourOf = (h) => +h.t.slice(11, 13);

function renderEmpty() {
  $('fcChart').innerHTML =
    '<div class="grid h-full place-items-center rounded-xl border border-dashed border-ink/10 text-center text-xs text-ink2">The forecast needs live data.<br/>Pick a city or use your location.</div>';
  $('fcWindow').textContent = '';
  $('gBest').textContent = '—';
  $('gBestSub').textContent = 'needs live data';
}

/** @param {HourlyPoint[]} hours @param {{ i: number } | null} win @param {number} top */
function chartHtml(hours, win, top) {
  const grid = GRIDLINES.filter((v) => v < top)
    .map(
      (v) =>
        `<div class="absolute left-0 right-0 border-t border-ink/[.06]" style="bottom:${(v / top) * 100}%"><span class="absolute -left-7 -translate-y-1/2 text-[10px] text-ink2 tabular-nums">${v}</span></div>`,
    )
    .join('');
  const bars = hours
    .map((h, i) => {
      const hr = hourOf(h);
      const inWindow = win && (i === win.i || i === win.i + 1);
      const label = i === 0 ? 'Now' : hr % 3 === 0 ? fmtHourShort(hr) : '';
      return `<button class="fc-bar group relative flex h-full flex-1 items-end focus:outline-none" data-i="${i}" aria-label="${fmtHour(hr)}, AQI ${Math.round(h.aqi)}">
      <span class="block w-full rounded-t-[4px] transition-all duration-500 group-hover:brightness-125 ${inWindow ? 'ring-2 ring-ink ring-offset-1 ring-offset-white' : ''}" style="height:${Math.max(2, (h.aqi / top) * 100)}%;background:${BANDS[bandIndex(h.aqi)].color};opacity:${i === 0 ? 1 : 0.8}"></span>
      <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] ${i === 0 ? 'font-bold text-ink' : 'text-ink2'}">${label}</span>
    </button>`;
    })
    .join('');
  return `<div class="absolute inset-0 bottom-5 left-7">${grid}<div class="absolute inset-0 flex items-end gap-[2px]">${bars}</div></div>
    <div id="fcTip" class="pointer-events-none absolute z-10 hidden rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs shadow-lift"></div>`;
}

/** Hover/focus tooltip for each bar. @param {any} box @param {HourlyPoint[]} hours */
function wireTooltips(box, hours) {
  const tip = $('fcTip');
  box.querySelectorAll('.fc-bar').forEach((/** @type {any} */ bar) => {
    const show = () => {
      const h = hours[+bar.dataset.i];
      tip.innerHTML = `<p class="text-ink2">${bar.dataset.i === '0' ? 'Now' : fmtHour(hourOf(h))}</p><p class="font-semibold text-ink">AQI ${Math.round(h.aqi)} · ${bandLabel(h.aqi)}</p>${h.pm != null ? `<p class="text-ink2">PM2.5 ${Math.round(h.pm)} µg/m³</p>` : ''}`;
      tip.classList.remove('hidden');
      const barBox = bar.getBoundingClientRect();
      const chartBox = box.getBoundingClientRect();
      const x = clamp(
        barBox.left - chartBox.left + barBox.width / 2 - tip.offsetWidth / 2,
        0,
        chartBox.width - tip.offsetWidth,
      );
      tip.style.left = x + 'px';
      tip.style.top = '-8px';
    };
    const hide = () => tip.classList.add('hidden');
    bar.addEventListener('mouseenter', show);
    bar.addEventListener('focus', show);
    bar.addEventListener('click', show);
    bar.addEventListener('mouseleave', hide);
    bar.addEventListener('blur', hide);
  });
}

export function renderForecast() {
  const hours = Air.hourly;
  if (!hours || !hours.length) {
    renderEmpty();
    return;
  }
  const win = cleanestWindow(hours);
  const top = Math.max(MIN_SCALE_TOP, Math.ceil(Math.max(...hours.map((h) => h.aqi)) / 50) * 50 + 25);
  const box = $('fcChart');
  box.innerHTML = chartHtml(hours, win, top);
  wireTooltips(box, hours);

  if (win) {
    const day = hours[win.i].t.slice(0, 10) !== hours[0].t.slice(0, 10) ? 'tomorrow' : 'today';
    const end = (win.h + WINDOW_HOURS) % 24;
    $('fcWindow').innerHTML =
      `Cleanest daytime window: <b class="text-ink">${day} ${fmtHour(win.h)}–${fmtHour(end)}</b> · avg AQI ${Math.round(win.avg)}`;
    $('gBest').textContent = `${fmtHourShort(win.h)}–${fmtHourShort(end)}`;
    $('gBestSub').textContent = `${day} · avg AQI ${Math.round(win.avg)} · ${bandLabel(win.avg)}`;
  }
}
