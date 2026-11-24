/** AQI maths: US EPA bands and breakpoints, India CPCB sub-indices, forecast windows. */
import { CPCB } from '../data/content.js';
import { clamp } from './util.js';

export const BANDS = [
  { max: 50,  color: '#A8D5BA', ink: '#2F6B4A', on: '#2D3436' },
  { max: 100, color: '#EBD58A', ink: '#7A5F0E', on: '#2D3436' },
  { max: 150, color: '#EDB98A', ink: '#8F4E1A', on: '#2D3436' },
  { max: 200, color: '#E39A96', ink: '#A0444B', on: '#2D3436' },
  { max: 300, color: '#B9A0C6', ink: '#6E4A7E', on: '#2D3436' },
  { max: 999, color: '#8E5160', ink: '#7E3F4C', on: '#FFFFFF' },
];
export const bandIndex = (aqi) => BANDS.findIndex((b) => aqi <= b.max);

// US EPA PM2.5 breakpoints (2024 revision): [Clo, Chi, Ilo, Ihi]
const PM_BP = [[0, 9, 0, 50], [9.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 125.4, 151, 200], [125.5, 225.4, 201, 300], [225.5, 325.4, 301, 500]];
export function aqiToPm25(aqi) {
  const bp = PM_BP.find((b) => aqi <= b[3]) || PM_BP[PM_BP.length - 1];
  const [cl, ch, il, ih] = bp;
  return +(cl + ((aqi - il) * (ch - cl)) / (ih - il)).toFixed(1);
}

export function pm25ToAqi(c) {
  const bp = PM_BP.find((b) => c <= b[1]) || PM_BP[PM_BP.length - 1];
  const [cl, ch, il, ih] = bp;
  return Math.round(clamp(il + ((Math.max(c, cl) - cl) * (ih - il)) / (ch - cl), 0, 500));
}

export function indianAQI(pm25, pm10) {
  const sub = (c, bps) => {
    for (const [cl, ch, il, ih] of bps) if (c <= ch) return il + ((c - cl) * (ih - il)) / (ch - cl);
    return 500;
  };
  const a = sub(pm25, [[0, 30, 0, 50], [30, 60, 50, 100], [60, 90, 100, 200], [90, 120, 200, 300], [120, 250, 300, 400], [250, 380, 400, 500]]);
  const b = pm10 == null ? 0 : sub(pm10, [[0, 50, 0, 50], [50, 100, 50, 100], [100, 250, 100, 200], [250, 350, 200, 300], [350, 430, 300, 400], [430, 600, 400, 500]]);
  return Math.round(clamp(Math.max(a, b), 0, 500));
}
export const cpcbCat = (v) => CPCB.find((c) => v <= c.max) || CPCB[CPCB.length - 1];

export function cleanestWindow(hours) {
  let best = null;
  for (let i = 0; i < hours.length - 1; i++) {
    const h = +hours[i].t.slice(11, 13);
    if (h < 6 || h > 20) continue;
    const avg = (hours[i].aqi + hours[i + 1].aqi) / 2;
    if (!best || avg < best.avg) best = { i, h, avg };
  }
  return best;
}
