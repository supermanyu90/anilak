import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aqiToPm25, pm25ToAqi, bandIndex, indianAQI, cpcbCat, cleanestWindow, activeGrapStage } from '../js/lib/aqi.js';

test('US AQI <-> PM2.5 matches EPA breakpoints', () => {
  assert.equal(aqiToPm25(50), 9);
  assert.equal(aqiToPm25(100), 35.4);
  assert.equal(aqiToPm25(150), 55.4);
  assert.equal(pm25ToAqi(9), 50);
  assert.equal(pm25ToAqi(35.4), 100);
  assert.equal(pm25ToAqi(0), 0);
  assert.equal(pm25ToAqi(1000), 500, 'clamped at 500');
});

test('AQI -> PM2.5 -> AQI round-trips within 1 point', () => {
  for (let aqi = 0; aqi <= 500; aqi += 7) {
    assert.ok(Math.abs(pm25ToAqi(aqiToPm25(aqi)) - aqi) <= 1, `aqi ${aqi}`);
  }
});

test('bandIndex uses inclusive upper bounds', () => {
  assert.equal(bandIndex(0), 0);
  assert.equal(bandIndex(50), 0);
  assert.equal(bandIndex(51), 1);
  assert.equal(bandIndex(150), 2);
  assert.equal(bandIndex(151), 3);
  assert.equal(bandIndex(301), 5);
});

test('India CPCB AQI takes the worse of PM2.5 and PM10 sub-indices', () => {
  assert.equal(indianAQI(30, null), 50);
  assert.equal(indianAQI(60, 0), 100);
  assert.equal(indianAQI(90, 0), 200);
  assert.equal(indianAQI(10, 350), 300, 'PM10 dominates');
  assert.equal(indianAQI(1000, 1000), 500, 'capped');
  assert.equal(cpcbCat(151).name, 'Moderate');
  assert.equal(cpcbCat(450).name, 'Severe');
});

test('cleanestWindow picks the lowest 2-hour daytime pair and ignores night hours', () => {
  const day = (h, aqi) => ({ t: `2026-11-24T${String(h).padStart(2, '0')}:00`, aqi });
  const hours = [day(2, 10), day(3, 10), day(9, 150), day(10, 140), day(14, 90), day(15, 100), day(16, 160)];
  const w = cleanestWindow(hours);
  assert.equal(w.h, 14);
  assert.equal(w.avg, 95);
  assert.equal(cleanestWindow([day(1, 5), day(2, 5)]), null, 'no daytime window');
});

test('activeGrapStage picks the highest stage reached, or -1', () => {
  assert.equal(activeGrapStage(150), -1);
  assert.equal(activeGrapStage(201), 0);
  assert.equal(activeGrapStage(399), 1);
  assert.equal(activeGrapStage(420), 2);
  assert.equal(activeGrapStage(500), 3);
});
