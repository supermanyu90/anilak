import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAcute, detectLanguage, computeImpact, localEngine } from '../js/lib/intent.js';

const AIR = { aqi: 153, pm2_5: 75 };
const intent = (q, lang = 'en-IN') => localEngine(q, lang, AIR).intent;

test('safety guardrail catches acute symptoms, including curly apostrophes and Hindi', () => {
  for (const q of ["I can't breathe", 'I can’t breathe', 'having trouble breathing', 'there is tightness in my chest', 'chest pain since an hour', 'साँस नहीं आ रही', 'বুকে ব্যথা', 'நெஞ்சு வலி']) {
    assert.ok(isAcute(q), q);
  }
  assert.ok(!isAcute('I have a mild cough'));
});

test('English keywords match whole words only', () => {
  assert.equal(intent("What's the best season for a picnic?").vulnerable_group_involved, false);
  assert.equal(intent('The reason I ask: is it ok to go jogging?').vulnerable_group_involved, false);
  assert.equal(intent('Will an average person be fine outside?').vulnerable_group_involved, false);
  assert.equal(intent('Business lunch on a terrace, is it ok to sit outside?').intent_category, 'OUTDOOR_ACTIVITY');
});

test('vulnerable groups are detected', () => {
  assert.equal(intent('Is it safe for my son to play cricket outside?').vulnerable_group_involved, true);
  assert.equal(intent('Can the children play in the park?').vulnerable_group_involved, true);
});

test('intent categories across word forms', () => {
  assert.equal(intent('Can I take my daughter jogging?').intent_category, 'OUTDOOR_ACTIVITY');
  assert.equal(intent('Is cycling ok this morning?').intent_category, 'OUTDOOR_ACTIVITY');
  assert.equal(intent('I keep wheezing at night').intent_category, 'HEALTH_SYMPTOM');
  assert.equal(intent('Feeling some dizziness today').intent_category, 'HEALTH_SYMPTOM');
  assert.equal(intent('I am driving to Gurgaon at 9').intent_category, 'COMMUTE_TRAVEL');
  assert.equal(intent('Is my scooter commute safe today?').intent_category, 'COMMUTE_TRAVEL');
});

test('multilingual queries', () => {
  assert.equal(intent('मुझे बाइक से 40 मिनट ऑफिस जाना है', 'hi-IN').intent_category, 'COMMUTE_TRAVEL');
  const mr = intent('माझा मुलगा सकाळपासून खोकत आहे', 'mr-IN');
  assert.equal(mr.intent_category, 'HEALTH_SYMPTOM');
  assert.equal(mr.vulnerable_group_involved, true);
  assert.equal(intent('আমি কি সন্ধ্যায় পার্কে দৌড়াতে যেতে পারি?', 'bn-IN').intent_category, 'OUTDOOR_ACTIVITY');
  const ta = intent('என் மகன் காலையிலிருந்து இருமுகிறான்', 'ta-IN');
  assert.equal(ta.intent_category, 'HEALTH_SYMPTOM');
  assert.equal(ta.vulnerable_group_involved, true);
});

test('detectLanguage uses script, Marathi markers, then the selected language', () => {
  assert.equal(detectLanguage('என் மகன்', 'en-IN'), 'ta-IN');
  assert.equal(detectLanguage('আমার ছেলে', 'en-IN'), 'bn-IN');
  assert.equal(detectLanguage('मुझे ऑफिस जाना है', 'en-IN'), 'hi-IN');
  assert.equal(detectLanguage('मला बाहेर जायचे आहे', 'en-IN'), 'mr-IN');
  assert.equal(detectLanguage('आज हवा कशी', 'mr-IN'), 'mr-IN', 'selected Devanagari language wins');
  assert.equal(detectLanguage('Can I run?', 'hi-IN'), 'hi-IN', 'Latin text keeps the selection');
});

test('computeImpact uses breathing rates and the parsed duration', () => {
  const run = computeImpact('OUTDOOR_ACTIVITY', 'a 30 min run', 100);
  assert.deepEqual([run.mins, run.base, run.pct], [30, 150, 75]); // 100 µg/m³ × 3 m³/h × 0.5 h
  const commute = computeImpact('COMMUTE_TRAVEL', 'commute for 2 hours', 50);
  assert.equal(commute.mins, 120);
  assert.equal(commute.base, 120); // 50 × 1.2 × 2
  const sleep = computeImpact('HEALTH_SYMPTOM', 'coughing at night', 100);
  assert.equal(sleep.hours, 8);
});

test('localEngine returns the full response shape in the requested language', () => {
  const r = localEngine('Can I go for a run in the park this evening?', 'hi-IN', AIR);
  assert.equal(r.intent.detected_language, 'hi-IN');
  assert.equal(r.intent.extracted_parameters.aqi_severity, 153);
  assert.ok(r.spoken.includes('AQI 153'));
  for (const k of ['routine', 'indoor', 'impact']) assert.ok(r.cards[k].length > 20, k);
});
