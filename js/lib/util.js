/** Pure helpers shared by browser code and tests. */

/** @param {number} v @param {number} min @param {number} max @returns {number} */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Fill `{name}` placeholders in a template; unknown names become ''.
 * @param {string} template @param {Record<string, string | number>} vars @returns {string}
 */
export const fill = (template, vars) => template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

/** 0–23 -> "12 AM" … "11 PM". @param {number} h @returns {string} */
export const fmtHour = (h) => ((h + 11) % 12) + 1 + (h < 12 ? ' AM' : ' PM');

/** 0–23 -> compact axis label: "12a", "3p". @param {number} h @returns {string} */
export const fmtHourShort = (h) => (h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? h + 'a' : h - 12 + 'p');

/** Clean-air guidance: about 5 air changes per hour in the room you are protecting. */
const TARGET_AIR_CHANGES_PER_HOUR = 5;
/**
 * Clean air delivery rate (CADR) a purifier needs for a room.
 * @param {number} areaM2 @param {number} heightM
 * @returns {number} m³/h
 */
export const requiredCadr = (areaM2, heightM) => Math.round(areaM2 * heightM * TARGET_AIR_CHANGES_PER_HOUR);
