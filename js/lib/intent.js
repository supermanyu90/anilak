/** Offline intent engine: keyword classifier, safety guardrail, language detection, exposure maths. */
import { L10N } from '../data/l10n.js';
import { bandIndex } from './aqi.js';
import { fill } from './util.js';

/** @typedef {import('../types.js').AirReading} AirReading */
/** @typedef {import('../types.js').EngineResult} EngineResult */
/** @typedef {import('../types.js').ImpactEstimate} ImpactEstimate */
/** @typedef {import('../types.js').IntentCategory} IntentCategory */
/** @typedef {import('../types.js').Urgency} Urgency */

const KW = {
  ACUTE: [
    'chest tight',
    'tightness in my chest',
    'chest feels tight',
    'trouble breathing',
    'difficulty breathing',
    'struggling to breathe',
    'chest pain',
    'tight chest',
    "can't breathe",
    'cant breathe',
    'cannot breathe',
    'unable to breathe',
    'severe wheez',
    'gasping',
    'blue lips',
    'fainted',
    'fainting',
    'सीने में दर्द',
    'सीने में जकड़न',
    'छाती में दर्द',
    'साँस नहीं',
    'सांस नहीं',
    'दम घुट',
    'छातीत दुख',
    'छातीत जखड',
    'श्वास घेता येत नाही',
    'श्वास घेता येत नाहीये',
    'বুকে ব্যথা',
    'বুকে চাপ',
    'শ্বাস নিতে পারছি না',
    'দম বন্ধ',
    'நெஞ்சு வலி',
    'நெஞ்சு இறுக்க',
    'மூச்சு விட முடிய',
    'மூச்சுத் திணறல்',
    'seene mein dard',
    'saans nahi',
  ],
  HEALTH_SYMPTOM: [
    'cough',
    'breath',
    'wheez',
    'asthma',
    'chest',
    'headache',
    'eyes',
    'throat',
    'dizz',
    'dizziness',
    'sneez',
    'allerg',
    'inhaler',
    'sick',
    'nose',
    'खांसी',
    'खाँसी',
    'साँस',
    'सांस',
    'दमा',
    'सीने',
    'सिरदर्द',
    'आँख',
    'आंख',
    'गला',
    'गले',
    'चक्कर',
    'बीमार',
    'khansi',
    'saans',
    'खोक',
    'श्वास',
    'छाती',
    'डोके',
    'डोळे',
    'घसा',
    'কাশ',
    'শ্বাস',
    'হাঁপানি',
    'বুক',
    'মাথাব্যথা',
    'চোখ',
    'গলা',
    'இரும',
    'மூச்சு',
    'ஆஸ்துமா',
    'நெஞ்சு',
    'தலைவலி',
    'கண்',
    'தொண்டை',
  ],
  COMMUTE_TRAVEL: [
    'commut',
    'office',
    'travel',
    'driv',
    'bik',
    'scooter',
    'metro',
    'bus',
    'auto',
    'train',
    'traffic',
    'work',
    'school run',
    'cab',
    'ऑफिस',
    'दफ्तर',
    'यात्रा',
    'गाड़ी',
    'बाइक',
    'बस',
    'मेट्रो',
    'ट्रेन',
    'काम पर',
    'प्रवास',
    'बाईक',
    'कामाला',
    'ऑफिसला',
    'অফিস',
    'যাতায়াত',
    'বাইক',
    'বাস',
    'মেট্রো',
    'ট্রেন',
    'গাড়ি',
    'அலுவலக',
    'பயண',
    'பைக்',
    'பேருந்து',
    'மெட்ரோ',
    'ரயில்',
  ],
  OUTDOOR_ACTIVITY: [
    'run',
    'jog',
    'walk',
    'play',
    'park',
    'exercis',
    'workout',
    'cycl',
    'cricket',
    'football',
    'outside',
    'outdoor',
    'gym',
    'yoga',
    'picnic',
    'दौड़',
    'टहल',
    'खेल',
    'पार्क',
    'बाहर',
    'व्यायाम',
    'सैर',
    'योग',
    'धाव',
    'फिरायला',
    'बाहेर',
    'बाग',
    'खेळ',
    'দৌড়',
    'হাঁট',
    'খেল',
    'পার্ক',
    'বাইরে',
    'ব্যায়াম',
    'ஓட',
    'நட',
    'விளையாட',
    'பூங்கா',
    'வெளியே',
    'உடற்பயிற்சி',
  ],
  VULNERABLE: [
    'child',
    'children',
    'kid',
    'baby',
    'son',
    'daughter',
    'toddler',
    'elderly',
    'grandma',
    'grandpa',
    'grandmother',
    'grandfather',
    'old parents',
    'pregnant',
    'asthmatic',
    'बच्च',
    'बेटा',
    'बेटी',
    'दादी',
    'दादा',
    'नानी',
    'नाना',
    'गर्भवती',
    'बुज़ुर्ग',
    'बुजुर्ग',
    'मुलगा',
    'मुलगी',
    'आजी',
    'आजोबा',
    'मूल',
    'वृद्ध',
    'বাচ্চা',
    'শিশু',
    'ছেলে',
    'মেয়ে',
    'দাদু',
    'ঠাকুমা',
    'দিদিমা',
    'গর্ভবতী',
    'বয়স্ক',
    'குழந்தை',
    'மகன்',
    'மகள்',
    'பாட்டி',
    'தாத்தா',
    'கர்ப்பிணி',
    'முதியவர்',
  ],
};
// Latin keywords match whole words plus common endings, so "son" no longer fires on "season" or "bus" on "business".
// Indic keywords stay substring matches because those words inflect heavily.
const SUFFIX = '(?:s|es|e|d|ed|ing|ning|ging|er|ers|y|ies|ic|ness|less)?';
/** @type {Map<string, RegExp>} */
const kwRe = new Map();
/** @param {string} text lower-cased query @param {string} w keyword */
function hasKw(text, w) {
  if (!/^[ -~]+$/.test(w)) return text.includes(w); // non-ASCII (Indic) keyword
  if (!kwRe.has(w)) kwRe.set(w, new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + SUFFIX + '\\b'));
  return /** @type {RegExp} */ (kwRe.get(w)).test(text);
}
/** @param {string} text @param {string[]} list @returns {number} how many keywords match */
const hits = (text, list) => list.reduce((n, w) => n + (hasKw(text, w) ? 1 : 0), 0);
// Safety guardrail: plain substring match on purpose (a false alarm is cheaper than a miss); straighten curly apostrophes.
/** @param {string} text @returns {boolean} */
export const isAcute = (text) => {
  const q = text.toLowerCase().replace(/[’‘´`]/g, "'");
  return KW.ACUTE.some((w) => q.includes(w));
};

/**
 * Reply language from the script of the text; Latin script keeps the selected language.
 * @param {string} text @param {string} selected BCP-47 @returns {string} BCP-47
 */
export function detectLanguage(text, selected) {
  const sel = selected.split('-')[0];
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN';
  if (/[\u0900-\u097F]/.test(text)) {
    if (sel === 'mr' || sel === 'hi') return selected;
    return /(आहे|मला|माझ|जाऊ|जायचे|धावायला|खोकत|बाहेर|करू का)/.test(text) ? 'mr-IN' : 'hi-IN';
  }
  return selected; // Latin script: trust the selector (handles romanised Hindi too)
}

/**
 * Inputs behind the "Direct Impact" card: inhaled PM2.5 = concentration × exposure ratio × breathing rate × time.
 * - Outdoor activity: vigorous breathing ~3 m³/h; moving indoors with windows shut + a DIY filter ≈ 75% less.
 * - Commute: ~1.2 m³/h; a well-fitted N95 in real-world use ≈ 70% less.
 * - Health symptom: a night's sleep at ~0.4 m³/h, indoor air ≈ 0.6 × outdoor; HEPA in a closed room ≈ 55% less.
 * @type {Record<IntentCategory, { defaultMins: number, m3PerHour: number, exposureRatio: number, reductionPct: number }>}
 */
const EXPOSURE = {
  OUTDOOR_ACTIVITY: { defaultMins: 45, m3PerHour: 3.0, exposureRatio: 1, reductionPct: 75 },
  COMMUTE_TRAVEL: { defaultMins: 40, m3PerHour: 1.2, exposureRatio: 1, reductionPct: 70 },
  HEALTH_SYMPTOM: { defaultMins: 480, m3PerHour: 0.4, exposureRatio: 0.6, reductionPct: 55 },
};

/** Round to a readable figure: tens above 100 µg, units below. @param {number} v */
const readable = (v) => (v >= 100 ? Math.round(v / 10) * 10 : Math.round(v));

/**
 * @param {IntentCategory} intent
 * @param {string} query lower-cased; a duration like "40 min" or "2 hours" (in any supported language) overrides the default
 * @param {number} pm PM2.5 µg/m³
 * @returns {ImpactEstimate}
 */
export function computeImpact(intent, query, pm) {
  const m = query.match(/(\d+)\s*(min|minute|mins|मिनट|मिनिट|মিনিট|நிமிட)/i);
  const h = query.match(/(\d+)\s*(h|hr|hrs|hour|hours|घंट|तास|ঘণ্টা|மணி)/i);
  const e = EXPOSURE[intent] ?? EXPOSURE.HEALTH_SYMPTOM;
  const mins = (m ? +m[1] : h ? +h[1] * 60 : 0) || e.defaultMins;
  const base = pm * e.exposureRatio * e.m3PerHour * (mins / 60);
  const alt = base * (1 - e.reductionPct / 100);
  return { mins, hours: Math.round(mins / 60), base: readable(base), alt: readable(alt), pct: e.reductionPct };
}

/** Symptoms outrank activities when a question mentions both ("I cough when I run"). */
const SYMPTOM_WEIGHT = 1.5;
/** @type {IntentCategory[]} order also breaks ties */
const CATEGORIES = ['HEALTH_SYMPTOM', 'COMMUTE_TRAVEL', 'OUTDOOR_ACTIVITY'];

/** @param {string} q lower-cased query @returns {IntentCategory} */
function classify(q) {
  let best = /** @type {IntentCategory} */ ('OUTDOOR_ACTIVITY');
  let bestScore = 0;
  for (const c of CATEGORIES) {
    const score = hits(q, KW[c]) * (c === 'HEALTH_SYMPTOM' ? SYMPTOM_WEIGHT : 1);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Offline answer engine: classify, score urgency, and fill the localised templates.
 * @param {string} query
 * @param {string} langTag BCP-47 reply language
 * @param {Pick<AirReading, 'aqi' | 'pm2_5'>} air
 * @returns {EngineResult}
 */
export function localEngine(query, langTag, air) {
  const q = query.toLowerCase();
  const T = L10N[/** @type {keyof typeof L10N} */ (langTag.split('-')[0])] || L10N.en;
  const intent = classify(q);
  const vulnerable = hits(q, KW.VULNERABLE) > 0 || /asthma|दमा|हाँपानी|হাঁপানি|ஆஸ்துமா/.test(q);
  const aqi = Math.round(air.aqi),
    pm = Math.round(air.pm2_5);
  const bad = aqi > 100 || (vulnerable && aqi > 50);
  /** @type {Urgency} */
  const urgency =
    aqi > 200 || (intent === 'HEALTH_SYMPTOM' && aqi > 150)
      ? 'high'
      : aqi > 100 || vulnerable || intent === 'HEALTH_SYMPTOM'
        ? 'medium'
        : 'low';
  const imp = computeImpact(intent, q, air.pm2_5);
  const band = T.bands[bandIndex(aqi)];

  const RISK = {
    OUTDOOR_ACTIVITY: 'Elevated PM2.5 intake from heavy breathing during exertion outdoors',
    COMMUTE_TRAVEL: 'Traffic-corridor exposure to PM2.5 and exhaust during transit',
    HEALTH_SYMPTOM: 'Airway irritation and symptom aggravation from fine particulates',
  };
  const ACTION = {
    OUTDOOR_ACTIVITY: bad
      ? 'Move exercise indoors or shift to the cleaner mid-afternoon window'
      : 'Proceed outdoors, prefer parks and off-peak hours',
    COMMUTE_TRAVEL: bad
      ? 'Use enclosed transport and a well-fitted N95'
      : 'Commute normally, prefer low-traffic routes',
    HEALTH_SYMPTOM: bad
      ? 'Stay indoors with filtered air; consult a doctor if symptoms persist'
      : 'Rest and monitor; consult a doctor if symptoms persist',
  };

  const routine = T.routine[intent][bad ? 1 : 0] + (vulnerable ? ' ' + T.vulnerable : '');
  const impactText = fill(T.impact[intent], { ...imp, base: imp.base.toLocaleString(), alt: imp.alt.toLocaleString() });
  return {
    intent: {
      intent_category: intent,
      vulnerable_group_involved: vulnerable,
      urgency_level: urgency,
      detected_language: langTag,
      extracted_parameters: { aqi_severity: aqi, primary_risk: RISK[intent], recommended_action: ACTION[intent] },
    },
    cards: { routine, indoor: T.indoor[intent], impact: impactText },
    spoken: fill(T.summary, { band, aqi, pm }) + ' ' + routine,
  };
}
