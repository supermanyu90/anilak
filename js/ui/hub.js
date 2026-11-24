/** At-a-glance tiles, 24-h forecast chart and the Learn & act hub tabs. */
import { Air } from '../air.js';
import { hasAskedYet, paintCards } from '../assistant.js';
import { CPCB, GRAP, MYTHS, ORGANS, TIPS, US_INFO } from '../data/content.js';
import { $, store, tween } from '../dom.js';
import { ICON } from '../icons.js';
import { BANDS, bandIndex, cleanestWindow, cpcbCat, indianAQI } from '../lib/aqi.js';
import { localEngine } from '../lib/intent.js';
import { clamp, fmtHour, fmtHourShort } from '../lib/util.js';

const bandLabel = (aqi) => US_INFO[bandIndex(aqi)].name;

function renderForecast() {
  const box = $('fcChart');
  const hours = Air.hourly;
  if (!hours || !hours.length) {
    box.innerHTML = '<div class="grid h-full place-items-center rounded-xl border border-dashed border-ink/10 text-center text-xs text-ink2">The forecast needs live data.<br/>Pick a city or use your location.</div>';
    $('fcWindow').textContent = ''; $('gBest').textContent = '—'; $('gBestSub').textContent = 'needs live data';
    return;
  }
  const win = cleanestWindow(hours);
  const top = Math.max(200, Math.ceil(Math.max(...hours.map((h) => h.aqi)) / 50) * 50 + 25);
  const lines = [50, 100, 150, 200, 300].filter((v) => v < top);
  let html = '<div class="absolute inset-0 bottom-5 left-7">';
  lines.forEach((v) => { html += `<div class="absolute left-0 right-0 border-t border-ink/[.06]" style="bottom:${(v / top) * 100}%"><span class="absolute -left-7 -transtone-y-1/2 text-[10px] text-ink2 tabular-nums">${v}</span></div>`; });
  html += '<div class="absolute inset-0 flex items-end gap-[2px]">';
  hours.forEach((h, i) => {
    const hr = +h.t.slice(11, 13);
    const inWin = win && (i === win.i || i === win.i + 1);
    html += `<button class="fc-bar group relative flex h-full flex-1 items-end focus:outline-none" data-i="${i}" aria-label="${fmtHour(hr)}, AQI ${Math.round(h.aqi)}">
      <span class="block w-full rounded-t-[4px] transition-all duration-500 group-hover:brightness-125 ${inWin ? 'ring-2 ring-ink ring-offset-1 ring-offset-white' : ''}" style="height:${Math.max(2, (h.aqi / top) * 100)}%;background:${BANDS[bandIndex(h.aqi)].color};opacity:${i === 0 ? 1 : 0.8}"></span>
      <span class="absolute -bottom-5 left-1/2 -transtone-x-1/2 text-[10px] ${i === 0 ? 'font-bold text-ink' : 'text-ink2'}">${i === 0 ? 'Now' : hr % 3 === 0 ? fmtHourShort(hr) : ''}</span>
    </button>`;
  });
  html += '</div></div><div id="fcTip" class="pointer-events-none absolute z-10 hidden rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs shadow-lift"></div>';
  box.innerHTML = html;
  const tip = $('fcTip');
  box.querySelectorAll('.fc-bar').forEach((b) => {
    const show = () => {
      const h = hours[+b.dataset.i], hr = +h.t.slice(11, 13);
      tip.innerHTML = `<p class="text-ink2">${b.dataset.i === '0' ? 'Now' : fmtHour(hr)}</p><p class="font-semibold text-ink">AQI ${Math.round(h.aqi)} · ${bandLabel(h.aqi)}</p>${h.pm != null ? `<p class="text-ink2">PM2.5 ${Math.round(h.pm)} µg/m³</p>` : ''}`;
      tip.classList.remove('hidden');
      const br = b.getBoundingClientRect(), cr = box.getBoundingClientRect();
      const x = clamp(br.left - cr.left + br.width / 2 - tip.offsetWidth / 2, 0, cr.width - tip.offsetWidth);
      tip.style.left = x + 'px'; tip.style.top = '-8px';
    };
    b.addEventListener('mouseenter', show); b.addEventListener('focus', show); b.addEventListener('click', show);
    b.addEventListener('mouseleave', () => tip.classList.add('hidden')); b.addEventListener('blur', () => tip.classList.add('hidden'));
  });
  if (win) {
    const day = hours[win.i].t.slice(0, 10) !== hours[0].t.slice(0, 10) ? 'tomorrow' : 'today';
    $('fcWindow').innerHTML = `Cleanest daytime window: <b class="text-ink">${day} ${fmtHour(win.h)}–${fmtHour((win.h + 2) % 24)}</b> · avg AQI ${Math.round(win.avg)}`;
    $('gBest').textContent = `${fmtHourShort(win.h)}–${fmtHourShort((win.h + 2) % 24)}`;
    $('gBestSub').textContent = `${day} · avg AQI ${Math.round(win.avg)} · ${bandLabel(win.avg)}`;
  }
}

/* ---------- Health tab ---------- */
let pickedBand = null;
function renderScale() {
  const cur = bandIndex(Air.aqi);
  $('scale').innerHTML = US_INFO.map((b, i) => `<button data-b="${i}" class="relative h-12 px-1 text-[10px] font-semibold leading-tight transition hover:brightness-105 ${(pickedBand ?? cur) === i ? 'outline outline-2 -outline-offset-2 outline-ink' : 'opacity-70'}" style="background:${BANDS[i].color};color:${BANDS[i].on}">${b.name}<br/><span class="font-normal">${b.range}</span></button>`).join('');
  // marker: 6 equal segments, piecewise linear inside each band
  const lo = [0, 51, 101, 151, 201, 301][cur], hi = [50, 100, 150, 200, 300, 500][cur];
  const pos = ((cur + clamp((Air.aqi - lo) / (hi - lo), 0, 1)) / 6) * 100;
  $('scaleMarker').style.left = clamp(pos, 3, 97) + '%';
  $('scaleNow').textContent = Math.round(Air.aqi);
  const b = US_INFO[pickedBand ?? cur];
  $('scaleDetail').innerHTML = `
    <div><p class="text-[11px] uppercase tracking-wider text-ink2">Who's at risk</p><p class="mt-1 text-sm text-ink">${b.who}</p></div>
    <div><p class="text-[11px] uppercase tracking-wider text-ink2">What happens</p><p class="mt-1 text-sm text-ink">${b.eff}</p></div>
    <div><p class="text-[11px] uppercase tracking-wider text-ink2">What to do</p><ul class="mt-1 space-y-1 text-sm text-ink">${b.act.map((a) => `<li class="flex items-start gap-1.5"><span class="mt-0.5 text-sage-ink">${ICON.check}</span>${a}</li>`).join('')}</ul></div>`;
  $('scale').querySelectorAll('button').forEach((el) => el.addEventListener('click', () => { pickedBand = +el.dataset.b === cur ? null : +el.dataset.b; renderScale(); }));
}
let organ = 0;
function renderOrgans() {
  $('organs').innerHTML = ORGANS.map((o, i) => `<button data-o="${i}" class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${i === organ ? 'border-sage bg-sage-50 text-ink font-semibold' : 'border-ink/10 text-ink hover:bg-blush-50'}">${ICON[o.i]}${o.k}</button>`).join('');
  const o = ORGANS[organ];
  $('organDetail').innerHTML = `<p class="flex items-center gap-2 font-display text-2xl font-semibold text-ink"><span class="grid h-9 w-9 place-items-center rounded-full bg-sage-50 text-sage-ink">${ICON[o.i].replace('h-4 w-4', 'h-5 w-5')}</span>${o.k}</p><p class="mt-2">${o.t}</p>`;
  $('organDetail').classList.remove('card-in'); void $('organDetail').offsetWidth; $('organDetail').classList.add('card-in');
  $('organs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { organ = +b.dataset.o; renderOrgans(); }));
}

/* ---------- Home tab ---------- */
let done = new Set();
try { done = new Set(JSON.parse(store.get('hb_tips', '[]'))); } catch {}
function renderTips() {
  const cats = [...new Set(TIPS.map((t) => t.c))];
  $('tips').innerHTML = cats.map((c) => `<div><p class="mb-2 text-[11px] uppercase tracking-wider text-ink2">${c}</p><div class="space-y-2">${TIPS.filter((t) => t.c === c).map((t) => `
    <div class="tip rounded-xl border ${done.has(t.id) ? 'border-sage bg-sage-50' : 'border-ink/[.06] bg-mist'} transition">
      <div class="flex items-center gap-3 p-3">
        <input type="checkbox" data-id="${t.id}" ${done.has(t.id) ? 'checked' : ''} class="h-4 w-4 shrink-0 accent-[#2F6B4A]" aria-label="${t.t}" />
        <button class="flex flex-1 items-center justify-between gap-2 text-left text-sm ${done.has(t.id) ? 'text-ink2 line-through decoration-sage-ink/60' : 'text-ink'}" data-x="${t.id}" aria-expanded="false">${t.t}<span class="shrink-0 rounded-md bg-mist px-1.5 py-0.5 text-[10px] text-ink2 no-underline">${t.cost}</span></button>
      </div>
      <p class="hidden px-10 pb-3 text-xs leading-relaxed text-ink2" id="how-${t.id}">${t.h}</p>
    </div>`).join('')}</div></div>`).join('');
  $('tips').querySelectorAll('input').forEach((i) => i.addEventListener('change', () => {
    i.checked ? done.add(i.dataset.id) : done.delete(i.dataset.id);
    store.set('hb_tips', JSON.stringify([...done])); renderTips(); renderScore();
  }));
  $('tips').querySelectorAll('[data-x]').forEach((b) => b.addEventListener('click', () => {
    const p = $('how-' + b.dataset.x); const open = p.classList.toggle('hidden') === false; b.setAttribute('aria-expanded', open);
  }));
}
function renderScore() {
  const s = Math.round((done.size / TIPS.length) * 100);
  tween($('scoreNum'), s);
  const ring = $('ring'); ring.style.strokeDashoffset = 326.7 * (1 - s / 100);
  ring.style.stroke = s >= 75 ? '#2F6B4A' : s >= 40 ? '#A8D5BA' : '#E8B4B8';
  $('scoreMsg').textContent = s === 100 ? 'Excellent. Your home is a clean-air refuge.' : s >= 75 ? 'Great habits. A couple more to go.' : s >= 40 ? 'Good start. Filtration gives the biggest jump.' : 'Tick what you already do, then add one tip a week.';
}
function renderCadr() {
  const a = +$('roomArea').value, h = +$('roomH').value;
  const cadr = Math.round(a * h * 5);
  $('areaVal').textContent = a; $('areaFt').textContent = Math.round(a * 10.764); $('hVal').textContent = h.toFixed(1);
  $('cadr').textContent = cadr; $('cfm').textContent = Math.round(cadr / 1.699);
  $('cadrTip').textContent = Air.aqi > 200
    ? `At AQI ${Math.round(Air.aqi)}, size up: aim for about ${Math.round(cadr * 1.4)} m³/h, or run two units in this room.`
    : 'Check CADR on the box rather than the "room size" claim, which often assumes far fewer air changes.';
}

/* ---------- Rules tab ---------- */
let pickedStage = null;
function renderRules() {
  const pm25 = Air.pm2_5, pm10 = Air.pm10 ?? Math.round(pm25 * 1.7);
  const row = (label, v, who, naaqs) => {
    const max = Math.max(v, naaqs) * 1.15;
    const pct = (x) => clamp((x / max) * 100, 0, 100);
    return `<div>
      <div class="flex items-baseline justify-between text-xs"><span class="font-semibold text-ink">${label}</span><span class="text-ink2"><b class="text-ink tabular-nums">${Math.round(v)}</b> µg/m³ · <b class="text-ink">${(v / who).toFixed(1)}×</b> WHO · <b class="text-ink">${(v / naaqs).toFixed(1)}×</b> India</span></div>
      <div class="relative mt-5 h-3 rounded-full bg-mist">
        <div class="h-full rounded-full transition-all duration-700" style="width:${pct(v)}%;background:${v > naaqs ? '#E39A96' : v > who ? '#EBD58A' : '#A8D5BA'}"></div>
        <div class="absolute -top-4 bottom-0 border-l border-dashed border-sage-ink" style="left:${pct(who)}%"><span class="absolute -top-0.5 left-1 whitespace-nowrap text-[10px] text-sage-ink">WHO ${who}</span></div>
        <div class="absolute -top-4 bottom-0 border-l border-dashed border-gold-ink" style="left:${pct(naaqs)}%"><span class="absolute -top-0.5 left-1 whitespace-nowrap text-[10px] text-gold-ink">India ${naaqs}</span></div>
      </div></div>`;
  };
  $('limits').innerHTML = row('PM2.5', pm25, 15, 60) + row('PM10', pm10, 45, 100);

  const ind = indianAQI(pm25, pm10), cat = cpcbCat(ind);
  $('cpcb').innerHTML = CPCB.map((c, i) => {
    const lo = i ? CPCB[i - 1].max + 1 : 0, on = c === cat;
    return `<div class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition ${on ? 'bg-mist ring-1 ring-ink/15' : ''}">
      <span class="h-3 w-3 shrink-0 rounded-full" style="background:${c.color}"></span>
      <span class="w-24 shrink-0 text-xs font-semibold ${on ? 'text-ink' : 'text-ink'}">${c.name}</span>
      <span class="w-14 shrink-0 text-[11px] tabular-nums text-ink2">${lo}–${c.max}</span>
      <span class="text-[11px] ${on ? 'text-ink' : 'text-ink2'}">${c.t}</span>
      ${on ? `<span class="ml-auto shrink-0 rounded bg-ink px-1.5 text-[10px] font-bold text-cream">${ind}</span>` : ''}
    </div>`;
  }).join('');

  const active = [...GRAP].reverse().find((g) => ind >= g.min);
  const ai = active ? GRAP.indexOf(active) : -1;
  $('grapNow').innerHTML = active ? `At India AQI <b class="text-ink">${ind}</b>, Delhi-NCR would be at <b class="text-ink">${active.stage}</b>` : `At India AQI <b class="text-ink">${ind}</b>, no GRAP stage applies`;
  const sel = pickedStage ?? Math.max(ai, 0);
  $('grapSteps').innerHTML = GRAP.map((g, i) => `<button data-g="${i}" class="rounded-xl border p-3 text-left transition ${i === sel ? 'border-ink/30 bg-mist' : 'border-ink/10 hover:bg-blush-50'}">
      <p class="flex items-center justify-between text-xs font-semibold text-ink">${g.stage}${i <= ai ? '<span class="h-2 w-2 rounded-full bg-rose-ink"></span>' : ''}</p>
      <p class="text-[11px] text-ink2">${g.label} · ${g.range}</p></button>`).join('');
  const g = GRAP[sel];
  $('grapDetail').innerHTML = `<p class="text-xs font-semibold text-ink">${g.stage} measures ${stageStatus(sel, ai)}</p><ul class="mt-2 grid gap-1.5 text-xs text-ink sm:grid-cols-2">${g.m.map((x) => `<li>• ${x}</li>`).join('')}</ul>`;
  $('grapSteps').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { pickedStage = +b.dataset.g; renderRules(); }));

  $('gInd').textContent = ind; $('gIndDot').style.background = cat.color; $('gIndCat').textContent = cat.name + ' · CPCB scale (est.)';
}
const stageStatus = (sel, ai) => (sel <= ai ? '<span class="ml-1 rounded bg-blush-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-ink">in force at this AQI</span>' : '<span class="ml-1 text-[10px] font-normal text-ink2">(not triggered at this AQI)</span>');

/* ---------- Myths tab ---------- */
const flipped = new Set();
function renderMyths() {
  $('myths').innerHTML = MYTHS.map((x, i) => `
    <button class="flip ${flipped.has(i) ? 'on' : ''} text-left" data-m="${i}" aria-pressed="${flipped.has(i)}">
      <div class="flip-inner">
        <div class="face glass flex flex-col justify-between rounded-3xl p-5">
          <span class="w-fit rounded-full bg-blush-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-ink">Myth</span>
          <p class="text-base font-semibold text-ink">“${x.m}”</p>
          <span class="text-[11px] text-ink2">Tap to reveal the fact</span>
        </div>
        <div class="face back flex flex-col justify-between rounded-3xl border border-sage bg-sage-50 p-5">
          <span class="w-fit rounded-full bg-sage/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sage-ink">Fact</span>
          <p class="text-sm leading-relaxed text-ink">${x.f}</p>
          <span class="text-[11px] text-sage-ink">Tap to flip back</span>
        </div>
      </div>
    </button>`).join('');
  $('mythCount').textContent = `${flipped.size} of ${MYTHS.length} busted.`;
  $('myths').querySelectorAll('.flip').forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.m; flipped.has(i) ? flipped.delete(i) : flipped.add(i);
    b.classList.toggle('on'); b.setAttribute('aria-pressed', flipped.has(i));
    $('mythCount').textContent = `${flipped.size} of ${MYTHS.length} busted.`;
  }));
}

/* ---------- Tabs & glance tiles ---------- */
function showTab(name, scroll) {
  document.querySelectorAll('.hub-tab').forEach((b) => { const on = b.dataset.tab === name; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
  document.querySelectorAll('.hub-panel').forEach((p) => { const on = p.id === 'tab-' + name; p.classList.toggle('hidden', !on); if (on) { p.classList.remove('card-in'); void p.offsetWidth; p.classList.add('card-in'); } });
  store.set('hb_tab', name);
  if (scroll) $('hub').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.querySelectorAll('.hub-tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => {
  const g = b.dataset.goto;
  if (g === 'forecast') $('forecast').scrollIntoView({ behavior: 'smooth', block: 'center' });
  else showTab(g, true);
}));

export function updateInsights() {
  tween($('gCig'), Air.pm2_5 / 22, 1);
  tween($('gWho'), Air.pm2_5 / 15, 1);
  renderForecast(); renderScale(); renderRules(); renderCadr();
  if (!hasAskedYet()) paintCards(localEngine('', $('lang').value, Air).cards, false);
}

$('roomArea').addEventListener('input', renderCadr);
$('roomH').addEventListener('input', renderCadr);
$('resetTips').addEventListener('click', () => { done.clear(); store.set('hb_tips', '[]'); renderTips(); renderScore(); });
renderOrgans(); renderTips(); renderScore(); renderMyths();
showTab(store.get('hb_tab', 'health'));
