import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answerQuery, pickReplyLanguage } from '../js/lib/pipeline.js';
import { L10N } from '../js/data/l10n.js';

const AIR = { aqi: 153, pm2_5: 75, pm10: null, source: 'live', place: 'Delhi' };
const failIfCalled = async () => assert.fail('Gemini must not be called');

test('acute symptoms take the emergency path without calling Gemini', async () => {
  const a = await answerQuery({
    query: 'I can’t breathe',
    langTag: 'hi-IN',
    air: AIR,
    geminiKey: 'k',
    gemini: failIfCalled,
  });
  assert.equal(a.emergency, true);
  assert.equal(a.result.intent.intent_category, 'HEALTH_SYMPTOM');
  assert.equal(a.result.intent.urgency_level, 'high');
  assert.equal(a.result.spoken, L10N.hi.emText, 'emergency text in the reply language');
});

test('no Gemini key: offline engine, no fallback note', async () => {
  const a = await answerQuery({ query: 'Can I go for a run?', langTag: 'en-IN', air: AIR, gemini: failIfCalled });
  assert.equal(a.emergency, false);
  assert.equal(a.fallbackReason, '');
  assert.equal(a.result.intent.intent_category, 'OUTDOOR_ACTIVITY');
});

test('Gemini answer is used when it succeeds', async () => {
  const fromGemini = { intent: {}, cards: { routine: 'g', indoor: 'g', impact: 'g' }, spoken: 'from gemini' };
  let args;
  const gemini = async (...a) => ((args = a), fromGemini);
  const a = await answerQuery({ query: 'run?', langTag: 'en-IN', air: AIR, geminiKey: 'k', geminiModel: 'm', gemini });
  assert.equal(a.result, fromGemini);
  assert.equal(args[4], 'k');
  assert.equal(args[5], 'm');
  assert.equal(args[3].intent.intent_category, 'OUTDOOR_ACTIVITY', 'offline answer passed in for field fallbacks');
});

test('Gemini failure falls back to the offline answer with a reason', async () => {
  const a = await answerQuery({
    query: 'Can I go for a run?',
    langTag: 'en-IN',
    air: AIR,
    geminiKey: 'k',
    gemini: async () => {
      throw new Error('timed out after 15s');
    },
  });
  assert.equal(a.fallbackReason, 'timed out after 15s');
  assert.equal(a.result.intent.intent_category, 'OUTDOOR_ACTIVITY');
});

test('reply language: supported speech language, then script, then the picker', () => {
  assert.equal(pickReplyLanguage('आज हवा कशी', 'mr-IN', 'en-IN'), 'mr-IN', 'Sarvam says Marathi');
  assert.equal(pickReplyLanguage('आज हवा कशी', null, 'en-IN'), 'hi-IN', 'Devanagari without a hint reads as Hindi');
  assert.equal(pickReplyLanguage('Can I run?', 'te-IN', 'en-IN'), 'en-IN', 'unsupported speech language is ignored');
  assert.equal(pickReplyLanguage('என் மகன்', null, 'en-IN'), 'ta-IN', 'script wins over the picker');
});
