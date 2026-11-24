/** Question pipeline: guardrail -> Gemini or offline engine -> cards + spoken reply. */
import { Air } from './air.js';
import { L10N } from './data/l10n.js';
import { $, note, store } from './dom.js';
import { ICON } from './icons.js';
import { geminiEngine } from './lib/gemini.js';
import { detectLanguage, isAcute, localEngine } from './lib/intent.js';
import { Mascot } from './mascot.js';
import { Speech } from './speech.js';

let hasAsked = false;
export const hasAskedYet = () => hasAsked;

// langHint: language detected from speech (Sarvam); used when it is one we answer in.
export async function processQuery(query, langHint) {
  query = query.trim();
  if (!query) return;
  const langTag = detectLanguage(query, L10N[(langHint || '').split('-')[0]] ? langHint : $('lang').value);
  const lang = langTag.split('-')[0];
  const T = L10N[lang] || L10N.en;
  hasAsked = true;
  $('youSaid').textContent = '“' + query + '”';
  $('emergency').classList.add('hidden');

  // Safety guardrail: acute symptoms bypass everything, no network round-trip.
  if (isAcute(query)) {
    const local = localEngine(query, langTag, Air);
    local.intent.intent_category = 'HEALTH_SYMPTOM';
    local.intent.urgency_level = 'high';
    local.intent.extracted_parameters.primary_risk = 'Possible acute respiratory or cardiac event';
    local.intent.extracted_parameters.recommended_action = 'Emergency: seek immediate medical care (112 / 108)';
    const em = $('emergency');
    em.innerHTML = '';
    const h = document.createElement('p'); h.className = 'flex items-center gap-2 font-display text-2xl font-bold text-rose-ink'; h.innerHTML = ICON.alert; h.append(T.emTitle);
    const p = document.createElement('p'); p.className = 'mt-2 text-sm leading-relaxed text-ink'; p.textContent = T.emText;
    const a = document.createElement('a'); a.href = 'tel:112'; a.className = 'mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-ink px-4 py-2 text-sm font-semibold text-white hover:brightness-110'; a.innerHTML = ICON.phone; a.append('Call 112');
    const a2 = document.createElement('a'); a2.href = 'tel:108'; a2.className = 'ml-2 mt-3 inline-flex items-center rounded-xl border border-rose-ink px-4 py-2 text-sm font-semibold text-rose-ink hover:bg-white'; a2.textContent = 'Ambulance 108';
    em.append(h, p, a, a2); em.classList.remove('hidden');
    Mascot.alarm(12000);
    render({ ...local, spoken: T.emText }, langTag, true);
    return;
  }

  Mascot.setMascotState('THINKING');
  const local = localEngine(query, langTag, Air);
  const key = store.get('hb_key', ''), model = store.get('hb_model', 'gemini-3-flash-preview');
  let result = local, fallbackReason = '';
  if (key) {
    try { result = await geminiEngine(query, langTag, Air, local, key, model); }
    catch (e) { fallbackReason = e.name === 'AbortError' ? 'Gemini timed out' : e.message; }
  }
  render(result, langTag, false, fallbackReason);
}

export let lastSpoken = null;
function render(res, langTag, emergency, fallbackReason = '') {
  $('reply').textContent = res.spoken;
  paintCards(res.cards, emergency);
  if (fallbackReason) note('Gemini unavailable (' + fallbackReason + '), answered offline.');

  lastSpoken = { text: res.spoken, lang: langTag };
  $('replayBtn').disabled = false;
  if ($('autoSpeak').checked) Speech.speakText(res.spoken, langTag);
  else Mascot.setMascotState('IDLE');
}

export function paintCards(c, emergency) {
  const cards = [
    ['Low-Emission Routine', 'route', c.routine, 'bg-sage-50 text-sage-ink'],
    ['Indoor Air Hack', 'home', c.indoor, 'bg-blush-50 text-rose-ink'],
    ['Direct Impact', 'down', c.impact, 'bg-gold-50 text-gold-ink'],
  ];
  const wrap = $('cards'); wrap.innerHTML = '';
  cards.forEach(([title, icon, body, tone], i) => {
    const d = document.createElement('article');
    d.className = 'glass card-in rounded-3xl p-4' + (emergency ? ' opacity-50' : '');
    d.style.animationDelay = i * 80 + 'ms';
    const h = document.createElement('h3'); h.className = 'flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink2';
    h.innerHTML = `<span class="grid h-7 w-7 place-items-center rounded-full ${tone}">${ICON[icon]}</span>`; h.append(title);
    const p = document.createElement('p'); p.className = 'mt-3 text-sm leading-relaxed text-ink'; p.textContent = body;
    d.append(h, p); wrap.append(d);
  });
}
