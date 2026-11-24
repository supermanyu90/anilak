/** Optional Gemini call that returns the same shape as the offline engine. */
import { computeImpact } from './intent.js';

export async function geminiEngine(query, langTag, air, local, key, model) {
  const imp = computeImpact(local.intent.intent_category, query.toLowerCase(), air.pm2_5);
  const prompt = `You are Vayu, a multilingual urban air quality assistant for Indian cities.
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

  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.4 } }),
    });
    if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const j = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim());
    const CATS = ['OUTDOOR_ACTIVITY', 'HEALTH_SYMPTOM', 'COMMUTE_TRAVEL'];
    const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
    return {
      intent: {
        intent_category: CATS.includes(j.intent_category) ? j.intent_category : local.intent.intent_category,
        vulnerable_group_involved: typeof j.vulnerable_group_involved === 'boolean' ? j.vulnerable_group_involved : local.intent.vulnerable_group_involved,
        urgency_level: ['low', 'medium', 'high'].includes(j.urgency_level) ? j.urgency_level : local.intent.urgency_level,
        detected_language: str(j.detected_language, langTag),
        extracted_parameters: {
          aqi_severity: Math.round(air.aqi),
          primary_risk: str(j.extracted_parameters?.primary_risk, local.intent.extracted_parameters.primary_risk),
          recommended_action: str(j.extracted_parameters?.recommended_action, local.intent.extracted_parameters.recommended_action),
        },
      },
      cards: { routine: str(j.low_emission_routine, local.cards.routine), indoor: str(j.indoor_air_hack, local.cards.indoor), impact: str(j.direct_impact, local.cards.impact) },
      spoken: str(j.spoken_response, local.spoken),
    };
  } finally { clearTimeout(to); }
}
