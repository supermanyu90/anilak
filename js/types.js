/**
 * Shared data shapes, as JSDoc typedefs checked by `npm run typecheck` (no runtime code).
 * Import a shape with a typedef import of './types.js' in the module that needs it.
 */

/**
 * One hour of forecast.
 * @typedef {object} HourlyPoint
 * @property {string} t local time "YYYY-MM-DDTHH:mm"
 * @property {number | null} pm PM2.5 in µg/m³
 * @property {number} aqi US AQI derived from that hour's PM2.5
 */

/**
 * The air the app is currently showing (mutated in place by js/air.js).
 * @typedef {object} AirReading
 * @property {number} aqi US AQI
 * @property {number} pm2_5 µg/m³
 * @property {number | null} pm10 µg/m³
 * @property {'live' | 'sample' | 'simulated'} source
 * @property {string} place city name or "lat, lon"
 * @property {HourlyPoint[] | null} [hourly] next 24 hours, live data only
 */

/** @typedef {'OUTDOOR_ACTIVITY' | 'HEALTH_SYMPTOM' | 'COMMUTE_TRAVEL'} IntentCategory */
/** @typedef {'low' | 'medium' | 'high'} Urgency */

/**
 * @typedef {object} Intent
 * @property {IntentCategory} intent_category
 * @property {boolean} vulnerable_group_involved
 * @property {Urgency} urgency_level
 * @property {string} detected_language BCP-47
 * @property {{ aqi_severity: number, primary_risk: string, recommended_action: string }} extracted_parameters
 */

/**
 * @typedef {object} Cards
 * @property {string} routine low-emission routine
 * @property {string} indoor indoor air hack
 * @property {string} impact quantified exposure statement
 */

/**
 * What every answer engine (offline rules or Gemini) returns.
 * @typedef {object} EngineResult
 * @property {Intent} intent
 * @property {Cards} cards
 * @property {string} spoken text to show and read aloud
 */

/**
 * Inhaled-dose estimate for an activity.
 * @typedef {object} ImpactEstimate
 * @property {number} mins duration
 * @property {number} hours duration, rounded
 * @property {number} base µg of PM2.5 inhaled without mitigation
 * @property {number} alt µg with the mitigation
 * @property {number} pct reduction, %
 */

/**
 * @typedef {object} Transcript
 * @property {string} text
 * @property {string | null} language BCP-47 code Sarvam detected, if any
 */

export {};
