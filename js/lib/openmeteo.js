/** Open-Meteo Air Quality API: request URL and response parsing (pure, no DOM). */
import { OPEN_METEO_URL } from '../config.js';
import { aqiToPm25, pm25ToAqi } from './aqi.js';

/** @typedef {import('../types.js').AirReading} AirReading */
/** @typedef {import('../types.js').HourlyPoint} HourlyPoint */

const FORECAST_HOURS = 24;

/** @param {number} lat @param {number} lon @returns {string} */
export function airQualityUrl(lat, lon) {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: 'us_aqi,pm2_5,pm10',
    hourly: 'us_aqi,pm2_5',
    forecast_days: '2',
    timezone: 'auto',
  });
  return `${OPEN_METEO_URL}?${q}`;
}

/**
 * Turn an Open-Meteo response into the app's reading.
 * The hourly series starts at the current hour and covers the next 24 hours. Each hour's AQI
 * is derived from that hour's PM2.5, because Open-Meteo's hourly `us_aqi` is a 24-hour rolling
 * average and barely moves hour to hour.
 * @param {any} data parsed JSON from Open-Meteo
 * @returns {Pick<AirReading, 'aqi' | 'pm2_5' | 'pm10' | 'hourly'>}
 * @throws {Error} when the response has no current AQI
 */
export function parseAirResponse(data) {
  const current = data?.current ?? {};
  if (typeof current.us_aqi !== 'number') throw new Error('No AQI in response');

  /** @type {HourlyPoint[] | null} */
  let hourly = null;
  const times = data.hourly?.time;
  if (Array.isArray(times)) {
    const nowHour = String(current.time ?? '').slice(0, 13); // "YYYY-MM-DDTHH"
    const first = Math.max(
      0,
      times.findIndex((t) => String(t).slice(0, 13) >= nowHour),
    );
    hourly = times
      .slice(first, first + FORECAST_HOURS)
      .map((t, i) => {
        const pm = data.hourly.pm2_5?.[first + i];
        const aqi = typeof pm === 'number' ? pm25ToAqi(pm) : data.hourly.us_aqi?.[first + i];
        return { t: String(t), pm: typeof pm === 'number' ? pm : null, aqi };
      })
      .filter((h) => typeof h.aqi === 'number');
  }

  return {
    aqi: current.us_aqi,
    pm2_5: typeof current.pm2_5 === 'number' ? current.pm2_5 : aqiToPm25(current.us_aqi),
    pm10: typeof current.pm10 === 'number' ? current.pm10 : null,
    hourly,
  };
}
