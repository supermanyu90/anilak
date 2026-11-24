/** Pure helpers shared by browser code and tests. */

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
export const fmtHour = (h) => { const hh = ((h + 11) % 12) + 1; return hh + (h < 12 ? ' AM' : ' PM'); };
export const fmtHourShort = (h) => (h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? h + 'a' : (h - 12) + 'p');
