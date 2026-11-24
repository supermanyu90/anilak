import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, fill, fmtHour, fmtHourShort, requiredCadr } from '../js/lib/util.js';

test('clamp', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(clamp(2, 0, 3), 2);
});

test('fill replaces known placeholders and blanks unknown ones', () => {
  assert.equal(fill('{a} and {b} {c}', { a: 1, b: 'two' }), '1 and two ');
});

test('hour labels', () => {
  assert.deepEqual([0, 9, 12, 15, 23].map(fmtHour), ['12 AM', '9 AM', '12 PM', '3 PM', '11 PM']);
  assert.deepEqual([0, 9, 12, 15].map(fmtHourShort), ['12a', '9a', '12p', '3p']);
});

test('requiredCadr targets five air changes per hour', () => {
  assert.equal(requiredCadr(14, 2.7), 189);
  assert.equal(requiredCadr(30, 2.7), 405);
});
