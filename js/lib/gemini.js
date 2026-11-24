/** Optional Gemini call that returns the same shape as the offline engine. */
import { GEMINI, TIMEOUT_MS } from '../config.js';
import { fetchJson } from './http.js';
import { computeImpact } from './intent.js';

/** @typedef {import('../types.js').AirReading} AirReading */
/** @typedef {import('../types.js').EngineResult} EngineResult */
/** @typedef {import('../types.js').ImpactEstimate} ImpactEstimate */

const CATEGORIES = ['OUTDOOR_ACTIVITY', 'HEALTH_SYMPTOM', 'COMMUTE_TRAVEL'];
const URGENCIES = ['low', 'medium', 'high'];

/**
 * @param {string} query
 * @param {string} langTag
 * @param {Pick<AirReading, 'aqi' | 'pm2_5' | 'pm10'>} air
 * @param {ImpactEstimate} imp pre-computed so the model quotes our numbers instead of inventing them
 * @returns {string}
 */
export function buildGeminiPrompt(query, langTag, air, imp) {
  return `You are Vayu, a multilingual urban air quality assistant for Indian cities.
Classify the user's query and give safety advice for the CURRENT air.

Current air: US AQI ${Math.round(air.aqi)}, PM2.5 ${Math.round(air.pm2_5)} µg/m³${air.pm10 != null ? `, PM10 ${Math.round(air.pm10)} µg/m³` : ''}.
Response language: ${langTag} (write every human-readable field in this language, native script).
User query: """${query}"""

Pre-computed exposure estimate for the likely activity (use these numbers in direct_impact, do not invent others):
duration ${imp.mins} min, inhaled PM2.5 ≈ ${imp.base} µg baseline vs ≈ ${imp.alt} µg with the mitigation (${imp.pct}% less).

Return ONLY JSON with exactly this shape:
{
  "intent_category": "OUTDOOR_ACTIVITY" | "HEALTH_SYMPTOM" | "COMMUTE_TRAVEL",
  "vulnerable_group_involved": boolean,
  "urgency_level": "low" | "medium" | "high",
  "detected_language": "<BCP-47 tag>",
  "extracted_parameters": { "aqi_severity": number, "primary_risk": "<English>", "recommended_action": "<English>" },
  "low_emission_routine": "<1-2 sentences: commute or exercise timing adjustment>",
  "indoor_air_hack": "<1-2 sentences: DIY filter, sealing drafts, avoiding indoor sources; be honest that houseplants barely remove PM2.5>",
  "direct_impact": "<1 sentence quantifying the exposure reduction using the numbers above>",
  "spoken_response": "<2-3 short sentences to be read aloud: the air status plus the single most important action>"
}
Vulnerable groups: children, older adults, pregnant people, people with asthma/COPD/heart disease. Do not diagnose.`;
}

/** @param {unknown} v @param {string} fallback */
const textOr = (v, fallback) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);

/**
 * Validate Gemini's JSON field by field. Any missing or invalid field falls back to the
 * offline engine's value, so a partial answer never breaks the UI.
 * @param {any} data raw generateContent response
 * @param {EngineResult} local offline answer for the same query
 * @param {string} langTag
 * @param {number} aqi
 * @returns {EngineResult}
 * @throws {SyntaxError} when the model's text is not JSON at all
 */
export function parseGeminiResponse(data, local, langTag, aqi) {
  const text = data?.candidates?.[0]?.content?.parts?.map((/** @type {any} */ p) => p.text || '').join('') || '';
  const j = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim());
  const li = local.intent;
  return {
    intent: {
      intent_category: CATEGORIES.includes(j.intent_category) ? j.intent_category : li.intent_category,
      vulnerable_group_involved:
        typeof j.vulnerable_group_involved === 'boolean' ? j.vulnerable_group_involved : li.vulnerable_group_involved,
      urgency_level: URGENCIES.includes(j.urgency_level) ? j.urgency_level : li.urgency_level,
      detected_language: textOr(j.detected_language, langTag),
      extracted_parameters: {
        aqi_severity: Math.round(aqi),
        primary_risk: textOr(j.extracted_parameters?.primary_risk, li.extracted_parameters.primary_risk),
        recommended_action: textOr(
          j.extracted_parameters?.recommended_action,
          li.extracted_parameters.recommended_action,
        ),
      },
    },
    cards: {
      routine: textOr(j.low_emission_routine, local.cards.routine),
      indoor: textOr(j.indoor_air_hack, local.cards.indoor),
      impact: textOr(j.direct_impact, local.cards.impact),
    },
    spoken: textOr(j.spoken_response, local.spoken),
  };
}

/**
 * @param {string} query
 * @param {string} langTag
 * @param {AirReading} air
 * @param {EngineResult} local
 * @param {string} key Gemini API key
 * @param {string} model
 * @param {typeof fetch} [fetchImpl] injectable for tests
 * @returns {Promise<EngineResult>}
 */
export async function geminiEngine(query, langTag, air, local, key, model, fetchImpl) {
  const imp = computeImpact(local.intent.intent_category, query.toLowerCase(), air.pm2_5);
  const data = await fetchJson(`${GEMINI.BASE_URL}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    timeoutMs: TIMEOUT_MS.GEMINI,
    fetchImpl,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildGeminiPrompt(query, langTag, air, imp) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: GEMINI.TEMPERATURE },
    }),
  });
  return parseGeminiResponse(data, local, langTag, air.aqi);
}
