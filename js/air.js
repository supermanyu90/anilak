/** Telemetry: geolocation, Open-Meteo current + hourly data, city presets, AQI simulator. */
import { CITIES } from './data/cities.js';
import { L10N } from './data/l10n.js';
import { $ } from './dom.js';
import { BANDS, aqiToPm25, bandIndex, pm25ToAqi } from './lib/aqi.js';
import { Mascot } from './mascot.js';

const airListeners = [];
export const onAirChange = (f) => airListeners.push(f);

export const Air = { aqi: 80, pm2_5: aqiToPm25(80), pm10: null, source: 'simulated', place: '' };

export function renderAir() {
  const b = bandIndex(Air.aqi);
  document.documentElement.style.setProperty('--band', BANDS[b].color);
  document.documentElement.style.setProperty('--band-ink', BANDS[b].ink);
  $('aqiNum').textContent = Math.round(Air.aqi);
  $('aqiBand').textContent = L10N.en.bands[b];
  $('pm25').textContent = Air.pm2_5 != null ? Math.round(Air.pm2_5) : '—';
  $('pm10').textContent = Air.pm10 != null ? Math.round(Air.pm10) : '—';
  $('sim').value = Math.round(Air.aqi);
  $('simVal').textContent = Math.round(Air.aqi);
  $('aqiSource').textContent = {
    live: `Live · ${Air.place} · Open-Meteo`,
    sample: `Sample data · ${Air.place} (live fetch failed)`,
    simulated: 'Simulated with the slider · PM2.5 derived from AQI',
  }[Air.source];
  Mascot.setAQI(Air.aqi);
  airListeners.forEach((f) => f());
}

async function fetchAir(lat, lon) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=us_aqi,pm2_5,pm10&hourly=us_aqi,pm2_5&forecast_days=2&timezone=auto`;
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(), c = d.current || {};
    if (typeof c.us_aqi !== 'number') throw new Error('No AQI in response');
    let hourly = null;
    if (d.hourly?.time) {
      const nowH = (c.time || '').slice(0, 13);
      let s = d.hourly.time.findIndex((t) => t.slice(0, 13) >= nowH); if (s < 0) s = 0;
      hourly = d.hourly.time.slice(s, s + 24).map((t, i) => { const pm = d.hourly.pm2_5?.[s + i]; return { t, pm, aqi: typeof pm === 'number' ? pm25ToAqi(pm) : d.hourly.us_aqi[s + i] }; }).filter((x) => typeof x.aqi === 'number');
    }
    return { aqi: c.us_aqi, pm2_5: c.pm2_5 ?? aqiToPm25(c.us_aqi), pm10: c.pm10 ?? null, hourly };
  } finally { clearTimeout(to); }
}

export async function loadCity(city) {
  $('aqiSource').textContent = `Fetching ${city.name}…`;
  try { Object.assign(Air, await fetchAir(city.lat, city.lon), { source: 'live', place: city.name }); }
  catch { Object.assign(Air, city.sample, { source: 'sample', place: city.name, hourly: null }); }
  renderAir();
}

export function useMyLocation() {
  if (!navigator.geolocation) { $('aqiSource').textContent = 'Geolocation is not available in this browser.'; return; }
  $('aqiSource').textContent = 'Locating…';
  navigator.geolocation.getCurrentPosition(async (p) => {
    const { latitude: lat, longitude: lon } = p.coords;
    try { Object.assign(Air, await fetchAir(lat, lon), { source: 'live', place: `${lat.toFixed(2)}, ${lon.toFixed(2)}` }); $('city').value = ''; renderAir(); }
    catch (e) { $('aqiSource').textContent = 'Could not reach Open-Meteo: ' + e.message; }
  }, (err) => { $('aqiSource').textContent = 'Location unavailable (' + err.message + '). Pick a city instead.'; },
  { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
}

CITIES.forEach((c, i) => $('city').add(new Option(c.name, i)));
$('city').addEventListener('change', (e) => { if (e.target.value !== '') loadCity(CITIES[+e.target.value]); });
$('locBtn').addEventListener('click', useMyLocation);
$('sim').addEventListener('input', (e) => {
  const v = +e.target.value;
  Object.assign(Air, { aqi: v, pm2_5: aqiToPm25(v), pm10: Math.round(aqiToPm25(v) * 1.7), source: 'simulated', place: '', hourly: null });
  $('city').value = '';
  renderAir();
});
