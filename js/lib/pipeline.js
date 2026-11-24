/** How a question gets answered: safety guardrail, then Gemini (if configured), then offline rules. Pure, no DOM. */
import { L10N } from '../data/l10n.js';
import { geminiEngine } from './gemini.js';
import { detectLanguage, isAcute, localEngine } from './intent.js';

/** @typedef {import('../types.js').AirReading} AirReading */
/** @typedef {import('../types.js').EngineResult} EngineResult */
/** @typedef {keyof typeof L10N} Lang */

/** Localised templates for a BCP-47 tag, falling back to English. @param {string} tag */
const templatesFor = (tag) => L10N[/** @type {Lang} */ (tag.split('-')[0])] || L10N.en;

/**
 * Reply language: the language Sarvam detected from speech when we support it, otherwise
 * the script of the text, otherwise the language picker.
 * @param {string} query
 * @param {string | null | undefined} speechLang BCP-47 from speech-to-text
 * @param {string} selectedLang language picker value
 * @returns {string} BCP-47
 */
export function pickReplyLanguage(query, speechLang, selectedLang) {
  const supported = Boolean(speechLang && speechLang.split('-')[0] in L10N);
  return detectLanguage(query, supported ? /** @type {string} */ (speechLang) : selectedLang);
}

/**
 * @typedef {object} Answer
 * @property {EngineResult} result
 * @property {boolean} emergency acute symptoms detected; show the 112/108 alert
 * @property {string} fallbackReason why Gemini was skipped after being tried ('' if not tried or it worked)
 */

/**
 * @param {object} args
 * @param {string} args.query trimmed, non-empty
 * @param {string} args.langTag reply language
 * @param {AirReading} args.air
 * @param {string} [args.geminiKey]
 * @param {string} [args.geminiModel]
 * @param {typeof geminiEngine} [args.gemini] injectable for tests
 * @returns {Promise<Answer>}
 */
export async function answerQuery({ query, langTag, air, geminiKey, geminiModel, gemini = geminiEngine }) {
  const local = localEngine(query, langTag, air);

  // Safety first: acute symptoms never wait on a network call.
  if (isAcute(query)) {
    const T = templatesFor(langTag);
    local.intent.intent_category = 'HEALTH_SYMPTOM';
    local.intent.urgency_level = 'high';
    local.intent.extracted_parameters.primary_risk = 'Possible acute respiratory or cardiac event';
    local.intent.extracted_parameters.recommended_action = 'Emergency: seek immediate medical care (112 / 108)';
    return { result: { ...local, spoken: T.emText }, emergency: true, fallbackReason: '' };
  }

  if (!geminiKey) return { result: local, emergency: false, fallbackReason: '' };
  try {
    const result = await gemini(query, langTag, air, local, geminiKey, geminiModel || '');
    return { result, emergency: false, fallbackReason: '' };
  } catch (e) {
    return { result: local, emergency: false, fallbackReason: /** @type {Error} */ (e).message || 'unknown error' };
  }
}
