import { test } from 'node:test';
import assert from 'node:assert/strict';
import { airQualityUrl, parseAirResponse } from '../js/lib/openmeteo.js';
import { pm25ToAqi } from '../js/lib/aqi.js';

test('builds the Open-Meteo URL with current + hourly fields', () => {
  const url = new URL(airQualityUrl(28.61394, 77.20902));
  assert.equal(url.origin + url.pathname, 'https://air-quality-api.open-meteo.com/v1/air-quality');
  assert.equal(url.searchParams.get('latitude'), '28.6139');
  assert.equal(url.searchParams.get('longitude'), '77.2090');
  assert.equal(url.searchParams.get('current'), 'us_aqi,pm2_5,pm10');
  assert.equal(url.searchParams.get('hourly'), 'us_aqi,pm2_5');
  assert.equal(url.searchParams.get('timezone'), 'auto');
});

/** 48 hourly points starting at midnight today. */
function sample({ nowHour = '2026-11-24T18:00', withPm = true } = {}) {
  const time = [];
  for (let d = 24; d <= 25; d++)
    for (let h = 0; h < 24; h++) time.push(`2026-11-${d}T${String(h).padStart(2, '0')}:00`);
  return {
    current: { time: nowHour, us_aqi: 154, pm2_5: 75.2, pm10: 120 },
    hourly: { time, us_aqi: time.map(() => 150), pm2_5: withPm ? time.map((_, i) => 20 + i) : time.map(() => null) },
  };
}

test('parses the current reading', () => {
  const r = parseAirResponse(sample());
  assert.equal(r.aqi, 154);
  assert.equal(r.pm2_5, 75.2);
  assert.equal(r.pm10, 120);
});

test('hourly series starts at the current hour and covers 24 hours', () => {
  const { hourly } = parseAirResponse(sample({ nowHour: '2026-11-24T18:00' }));
  assert.equal(hourly.length, 24);
  assert.equal(hourly[0].t, '2026-11-24T18:00');
  assert.equal(hourly[23].t, '2026-11-25T17:00');
});

test('hourly AQI comes from that hour’s PM2.5, not the 24-h rolling us_aqi', () => {
  const { hourly } = parseAirResponse(sample());
  assert.equal(hourly[0].pm, 20 + 18);
  assert.equal(hourly[0].aqi, pm25ToAqi(38));
  assert.notEqual(hourly[0].aqi, 150);
});

test('falls back to hourly us_aqi when PM2.5 is missing', () => {
  const { hourly } = parseAirResponse(sample({ withPm: false }));
  assert.equal(hourly[0].aqi, 150);
  assert.equal(hourly[0].pm, null);
});

test('missing pieces degrade safely', () => {
  assert.throws(() => parseAirResponse({ current: {} }), /No AQI/);
  assert.throws(() => parseAirResponse(null), /No AQI/);
  const r = parseAirResponse({ current: { us_aqi: 100 } });
  assert.equal(r.hourly, null);
  assert.equal(r.pm10, null);
  assert.equal(r.pm2_5, 35.4, 'PM2.5 derived from AQI when absent');
});
