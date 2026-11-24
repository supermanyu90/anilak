import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGeminiPrompt, geminiEngine, parseGeminiResponse } from '../js/lib/gemini.js';
import { computeImpact, localEngine } from '../js/lib/intent.js';

const AIR = { aqi: 153, pm2_5: 75, pm10: null, source: 'live', place: 'Delhi' };
const local = () => localEngine('Can I go for a run?', 'en-IN', AIR);
/** Wrap model text the way generateContent returns it. */
const reply = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });

const GOOD = {
  intent_category: 'COMMUTE_TRAVEL',
  vulnerable_group_involved: true,
  urgency_level: 'high',
  detected_language: 'hi-IN',
  extracted_parameters: { aqi_severity: 999, primary_risk: 'Traffic smoke', recommended_action: 'Take the metro' },
  low_emission_routine: 'Take the metro.',
  indoor_air_hack: 'Run a filter.',
  direct_impact: 'About 60 µg less.',
  spoken_response: 'Air is unhealthy. Take the metro.',
};

test('parses a valid answer, keeping our own AQI', () => {
  const r = parseGeminiResponse(reply(JSON.stringify(GOOD)), local(), 'en-IN', 153);
  assert.equal(r.intent.intent_category, 'COMMUTE_TRAVEL');
  assert.equal(r.intent.vulnerable_group_involved, true);
  assert.equal(r.intent.extracted_parameters.aqi_severity, 153, 'model cannot override the measured AQI');
  assert.equal(r.cards.routine, 'Take the metro.');
  assert.equal(r.spoken, 'Air is unhealthy. Take the metro.');
});

test('accepts JSON wrapped in a ```json fence', () => {
  const r = parseGeminiResponse(reply('```json\n' + JSON.stringify(GOOD) + '\n```'), local(), 'en-IN', 153);
  assert.equal(r.intent.urgency_level, 'high');
});

test('invalid or missing fields fall back to the offline answer', () => {
  const l = local();
  const r = parseGeminiResponse(
    reply(
      JSON.stringify({
        intent_category: 'PARTY',
        urgency_level: 'extreme',
        vulnerable_group_involved: 'yes',
        spoken_response: '  ',
      }),
    ),
    l,
    'mr-IN',
    153,
  );
  assert.equal(r.intent.intent_category, l.intent.intent_category);
  assert.equal(r.intent.urgency_level, l.intent.urgency_level);
  assert.equal(r.intent.vulnerable_group_involved, l.intent.vulnerable_group_involved);
  assert.equal(r.intent.detected_language, 'mr-IN');
  assert.deepEqual(r.cards, l.cards);
  assert.equal(r.spoken, l.spoken);
});

test('non-JSON text throws, so the caller can fall back', () => {
  assert.throws(() => parseGeminiResponse(reply('Sorry, I cannot help.'), local(), 'en-IN', 153), SyntaxError);
  assert.throws(() => parseGeminiResponse({}, local(), 'en-IN', 153), SyntaxError);
});

test('prompt carries the air, language and pre-computed exposure numbers', () => {
  const imp = computeImpact('OUTDOOR_ACTIVITY', 'a 30 min run', 75);
  const prompt = buildGeminiPrompt('a 30 min run', 'ta-IN', AIR, imp);
  assert.match(prompt, /US AQI 153, PM2\.5 75 µg\/m³\./);
  assert.ok(!prompt.includes('PM10'), 'PM10 omitted when unknown');
  assert.match(prompt, /Response language: ta-IN/);
  assert.ok(prompt.includes(`≈ ${imp.base} µg baseline`));
});

test('geminiEngine sends the key in a header and reports HTTP failures', async () => {
  let seen;
  const ok = async (url, init) => {
    seen = { url, init };
    return new Response(JSON.stringify(reply(JSON.stringify(GOOD))), { status: 200 });
  };
  const r = await geminiEngine('run?', 'en-IN', AIR, local(), 'secret', 'gemini-x/y', ok);
  assert.equal(r.cards.indoor, 'Run a filter.');
  assert.match(seen.url, /models\/gemini-x%2Fy:generateContent$/, 'model name is URL-encoded');
  assert.equal(seen.init.headers['x-goog-api-key'], 'secret');
  assert.ok(!seen.url.includes('secret'), 'key never in the URL');

  const denied = async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 });
  await assert.rejects(geminiEngine('run?', 'en-IN', AIR, local(), 'bad', 'm', denied), /API key not valid/);
});
