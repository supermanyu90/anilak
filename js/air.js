/** Telemetry: geolocation, Open-Meteo current + hourly data, city presets, AQI simulator. */
import { AIR_RETRIES, PM10_PER_PM25, TIMEOUT_MS } from './config.js';
import { CITIES } from './data/cities.js';
import { L10N } from './data/l10n.js';
import { $ } from './dom.js';
import { BANDS, aqiToPm25, bandIndex } from './lib/aqi.js';
import { fetchJson } from './lib/http.js';
import { logger } from './lib/log.js';
import { airQualityUrl, parseAirResponse } from './lib/openmeteo.js';
import { Mascot } from './mascot.js';

/** @typedef {import('./types.js').AirReading} AirReading */

const log = logger('air');
/** @type {Array<() => void>} */
const airListeners = [];
/** @param {() => void} listener called after every change to Air */
export const onAirChange = (listener) => airListeners.push(listener);

/** @type {AirReading} */
export const Air = { aqi: 80, pm2_5: aqiToPm25(80), pm10: null, source: 'simulated', place: '' };

const SOURCE_LABEL = {
  live: () => `Live · ${Air.place} · Open-Meteo`,
  sample: () => `Sample data · ${Air.place} (live fetch failed)`,
  simulated: () => 'Simulated with the slider · PM2.5 derived from AQI',
};

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
  $('aqiSource').textContent = SOURCE_LABEL[Air.source]();
  Mascot.setAQI(Air.aqi);
  airListeners.forEach((f) => f());
}

/** @param {number} lat @param {number} lon */
async function fetchAir(lat, lon) {
  const data = await fetchJson(airQualityUrl(lat, lon), { timeoutMs: TIMEOUT_MS.AIR, retries: AIR_RETRIES });
  return parseAirResponse(data);
}

/** @param {(typeof CITIES)[number]} city */
export async function loadCity(city) {
  $('aqiSource').textContent = `Fetching ${city.name}…`;
  try {
    Object.assign(Air, await fetchAir(city.lat, city.lon), { source: 'live', place: city.name });
  } catch (e) {
    log.warn(`Open-Meteo failed for ${city.name}; showing sample data`, e);
    Object.assign(Air, city.sample, { source: 'sample', place: city.name, hourly: null });
  }
  renderAir();
}

export function useMyLocation() {
  if (!navigator.geolocation) {
    $('aqiSource').textContent = 'Geolocation is not available in this browser.';
    return;
  }
  $('aqiSource').textContent = 'Locating…';
  navigator.geolocation.getCurrentPosition(
    async (p) => {
      const { latitude: lat, longitude: lon } = p.coords;
      try {
        Object.assign(Air, await fetchAir(lat, lon), { source: 'live', place: `${lat.toFixed(2)}, ${lon.toFixed(2)}` });
        $('city').value = '';
        renderAir();
      } catch (e) {
        log.warn('Open-Meteo failed for current location', e);
        $('aqiSource').textContent = 'Could not reach Open-Meteo: ' + /** @type {Error} */ (e).message;
      }
    },
    (err) => {
      $('aqiSource').textContent = 'Location unavailable (' + err.message + '). Pick a city instead.';
    },
    { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
  );
}

/** Simulator: derive PM2.5 from the chosen AQI and estimate PM10 from it. */
function simulate(/** @type {number} */ aqi) {
  const pm25 = aqiToPm25(aqi);
  Object.assign(Air, {
    aqi,
    pm2_5: pm25,
    pm10: Math.round(pm25 * PM10_PER_PM25),
    source: 'simulated',
    place: '',
    hourly: null,
  });
  $('city').value = '';
  renderAir();
}

CITIES.forEach((c, i) => $('city').add(new Option(c.name, String(i))));
$('city').addEventListener('change', (/** @type {any} */ e) => {
  if (e.target.value !== '') loadCity(CITIES[+e.target.value]);
});
$('locBtn').addEventListener('click', useMyLocation);
$('sim').addEventListener('input', (/** @type {any} */ e) => simulate(+e.target.value));
