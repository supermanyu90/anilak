/** Offline intent engine: keyword classifier, safety guardrail, language detection, exposure maths. */
import { L10N } from '../data/l10n.js';
import { bandIndex } from './aqi.js';
import { fill } from './util.js';

const KW = {
  ACUTE: ['chest tight', 'tightness in my chest', 'chest feels tight', 'trouble breathing', 'difficulty breathing', 'struggling to breathe', 'chest pain', 'tight chest', "can't breathe", 'cant breathe', 'cannot breathe', 'unable to breathe', 'severe wheez', 'gasping', 'blue lips', 'fainted', 'fainting',
          'सीने में दर्द', 'सीने में जकड़न', 'छाती में दर्द', 'साँस नहीं', 'सांस नहीं', 'दम घुट',
          'छातीत दुख', 'छातीत जखड', 'श्वास घेता येत नाही', 'श्वास घेता येत नाहीये',
          'বুকে ব্যথা', 'বুকে চাপ', 'শ্বাস নিতে পারছি না', 'দম বন্ধ',
          'நெஞ்சு வலி', 'நெஞ்சு இறுக்க', 'மூச்சு விட முடிய', 'மூச்சுத் திணறல்',
          'seene mein dard', 'saans nahi'],
  HEALTH_SYMPTOM: ['cough', 'breath', 'wheez', 'asthma', 'chest', 'headache', 'eyes', 'throat', 'dizz', 'dizziness', 'sneez', 'allerg', 'inhaler', 'sick', 'nose',
          'खांसी', 'खाँसी', 'साँस', 'सांस', 'दमा', 'सीने', 'सिरदर्द', 'आँख', 'आंख', 'गला', 'गले', 'चक्कर', 'बीमार', 'khansi', 'saans',
          'खोक', 'श्वास', 'छाती', 'डोके', 'डोळे', 'घसा',
          'কাশ', 'শ্বাস', 'হাঁপানি', 'বুক', 'মাথাব্যথা', 'চোখ', 'গলা',
          'இரும', 'மூச்சு', 'ஆஸ்துமா', 'நெஞ்சு', 'தலைவலி', 'கண்', 'தொண்டை'],
  COMMUTE_TRAVEL: ['commut', 'office', 'travel', 'driv', 'bik', 'scooter', 'metro', 'bus', 'auto', 'train', 'traffic', 'work', 'school run', 'cab',
          'ऑफिस', 'दफ्तर', 'यात्रा', 'गाड़ी', 'बाइक', 'बस', 'मेट्रो', 'ट्रेन', 'काम पर',
          'प्रवास', 'बाईक', 'कामाला', 'ऑफिसला',
          'অফিস', 'যাতায়াত', 'বাইক', 'বাস', 'মেট্রো', 'ট্রেন', 'গাড়ি',
          'அலுவலக', 'பயண', 'பைக்', 'பேருந்து', 'மெட்ரோ', 'ரயில்'],
  OUTDOOR_ACTIVITY: ['run', 'jog', 'walk', 'play', 'park', 'exercis', 'workout', 'cycl', 'cricket', 'football', 'outside', 'outdoor', 'gym', 'yoga', 'picnic',
          'दौड़', 'टहल', 'खेल', 'पार्क', 'बाहर', 'व्यायाम', 'सैर', 'योग',
          'धाव', 'फिरायला', 'बाहेर', 'बाग', 'खेळ',
          'দৌড়', 'হাঁট', 'খেল', 'পার্ক', 'বাইরে', 'ব্যায়াম',
          'ஓட', 'நட', 'விளையாட', 'பூங்கா', 'வெளியே', 'உடற்பயிற்சி'],
  VULNERABLE: ['child', 'children', 'kid', 'baby', 'son', 'daughter', 'toddler', 'elderly', 'grandma', 'grandpa', 'grandmother', 'grandfather', 'old parents', 'pregnant', 'asthmatic',
          'बच्च', 'बेटा', 'बेटी', 'दादी', 'दादा', 'नानी', 'नाना', 'गर्भवती', 'बुज़ुर्ग', 'बुजुर्ग',
          'मुलगा', 'मुलगी', 'आजी', 'आजोबा', 'मूल', 'वृद्ध',
          'বাচ্চা', 'শিশু', 'ছেলে', 'মেয়ে', 'দাদু', 'ঠাকুমা', 'দিদিমা', 'গর্ভবতী', 'বয়স্ক',
          'குழந்தை', 'மகன்', 'மகள்', 'பாட்டி', 'தாத்தா', 'கர்ப்பிணி', 'முதியவர்'],
};
// Latin keywords match whole words plus common endings, so "son" no longer fires on "season" or "bus" on "business".
// Indic keywords stay substring matches because those words inflect heavily.
const SUFFIX = '(?:s|es|e|d|ed|ing|ning|ging|er|ers|y|ies|ic|ness|less)?';
const kwRe = new Map();
function hasKw(text, w) {
  if (!/^[ -~]+$/.test(w)) return text.includes(w); // non-ASCII (Indic) keyword
  if (!kwRe.has(w)) kwRe.set(w, new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + SUFFIX + '\\b'));
  return kwRe.get(w).test(text);
}
const hits = (text, list) => list.reduce((n, w) => n + (hasKw(text, w) ? 1 : 0), 0);
// Safety guardrail: plain substring match on purpose (a false alarm is cheaper than a miss); straighten curly apostrophes.
export const isAcute = (text) => { const q = text.toLowerCase().replace(/[’‘´`]/g, "'"); return KW.ACUTE.some((w) => q.includes(w)); };

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

// Inhaled-dose estimates. Breathing: ~3 m³/h vigorous exercise, ~1.2 m³/h commuting, ~0.4 m³/h sleep.
export function computeImpact(intent, query, pm) {
  const m = query.match(/(\d+)\s*(min|minute|mins|मिनट|मिनिट|মিনিট|நிமிட)/i);
  const h = query.match(/(\d+)\s*(h|hr|hrs|hour|hours|घंट|तास|ঘণ্টা|மணி)/i);
  let mins = m ? +m[1] : h ? +h[1] * 60 : null;
  let base, alt, pct;
  if (intent === 'OUTDOOR_ACTIVITY') { mins = mins || 45; base = pm * 3.0 * (mins / 60); pct = 75; }   // indoors, windows shut + DIY filter ≈ 25% of outdoor
  else if (intent === 'COMMUTE_TRAVEL') { mins = mins || 40; base = pm * 1.2 * (mins / 60); pct = 70; } // real-world N95 fit ≈ 70% reduction
  else { mins = mins || 480; base = pm * 0.6 * 0.4 * (mins / 60); pct = 55; }                          // indoor/outdoor 0.6; HEPA in closed room ≈ 55%
  alt = base * (1 - pct / 100);
  const r = (v) => (v >= 100 ? Math.round(v / 10) * 10 : Math.round(v));
  return { mins, hours: Math.round(mins / 60), base: r(base), alt: r(alt), pct };
}

export function localEngine(query, langTag, air) {
  const q = query.toLowerCase();
  const lang = langTag.split('-')[0];
  const T = L10N[lang] || L10N.en;
  const scores = ['HEALTH_SYMPTOM', 'COMMUTE_TRAVEL', 'OUTDOOR_ACTIVITY'].map((c) => [c, hits(q, KW[c]) * (c === 'HEALTH_SYMPTOM' ? 1.5 : 1)]);
  scores.sort((a, b) => b[1] - a[1]);
  const intent = scores[0][1] > 0 ? scores[0][0] : 'OUTDOOR_ACTIVITY';
  const vulnerable = hits(q, KW.VULNERABLE) > 0 || /asthma|दमा|हाँपानी|হাঁপানি|ஆஸ்துமா/.test(q);
  const aqi = Math.round(air.aqi), pm = Math.round(air.pm2_5);
  const bad = aqi > 100 || (vulnerable && aqi > 50);
  const urgency = aqi > 200 || (intent === 'HEALTH_SYMPTOM' && aqi > 150) ? 'high' : (aqi > 100 || vulnerable || intent === 'HEALTH_SYMPTOM') ? 'medium' : 'low';
  const imp = computeImpact(intent, q, air.pm2_5);
  const band = T.bands[bandIndex(aqi)];

  const RISK = { OUTDOOR_ACTIVITY: 'Elevated PM2.5 intake from heavy breathing during exertion outdoors',
                 COMMUTE_TRAVEL: 'Traffic-corridor exposure to PM2.5 and exhaust during transit',
                 HEALTH_SYMPTOM: 'Airway irritation and symptom aggravation from fine particulates' };
  const ACTION = { OUTDOOR_ACTIVITY: bad ? 'Move exercise indoors or shift to the cleaner mid-afternoon window' : 'Proceed outdoors, prefer parks and off-peak hours',
                   COMMUTE_TRAVEL: bad ? 'Use enclosed transport and a well-fitted N95' : 'Commute normally, prefer low-traffic routes',
                   HEALTH_SYMPTOM: bad ? 'Stay indoors with filtered air; consult a doctor if symptoms persist' : 'Rest and monitor; consult a doctor if symptoms persist' };

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
