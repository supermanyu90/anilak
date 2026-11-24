/** Question UI: runs the answer pipeline and renders the reply, the emergency alert and the three cards. */
import { Air } from './air.js';
import { EMERGENCY_ALARM_MS, GEMINI, STORAGE_KEYS } from './config.js';
import { L10N } from './data/l10n.js';
import { $, note, store } from './dom.js';
import { ICON } from './icons.js';
import { logger } from './lib/log.js';
import { answerQuery, pickReplyLanguage } from './lib/pipeline.js';
import { Mascot } from './mascot.js';
import { Speech } from './speech.js';

/** @typedef {import('./types.js').Cards} Cards */
/** @typedef {import('./types.js').EngineResult} EngineResult */

const log = logger('assistant');

let hasAsked = false;
/** True once the user has asked something (until then the cards show general advice). */
export const hasAskedYet = () => hasAsked;

/** @type {{ text: string, lang: string } | null} */
export let lastSpoken = null;

/**
 * @param {string} rawQuery
 * @param {string | null} [speechLang] language Sarvam detected, if the question was spoken
 */
export async function processQuery(rawQuery, speechLang) {
  const query = rawQuery.trim();
  if (!query) return;
  const langTag = pickReplyLanguage(query, speechLang, $('lang').value);
  hasAsked = true;
  $('youSaid').textContent = '“' + query + '”';
  $('emergency').classList.add('hidden');
  Mascot.setMascotState('THINKING');

  const { result, emergency, fallbackReason } = await answerQuery({
    query,
    langTag,
    air: Air,
    geminiKey: store.get(STORAGE_KEYS.GEMINI_KEY, ''),
    geminiModel: store.get(STORAGE_KEYS.GEMINI_MODEL, GEMINI.DEFAULT_MODEL),
  });

  if (emergency) {
    showEmergency(L10N[langTag.split('-')[0]] || L10N.en);
    Mascot.alarm(EMERGENCY_ALARM_MS);
  }
  if (fallbackReason) {
    log.warn('Gemini failed; answered with the offline engine', fallbackReason);
    note('Gemini unavailable (' + fallbackReason + '), answered offline.');
  }
  render(result, langTag, emergency);
}

/** @param {{ emTitle: string, emText: string }} T localised emergency copy */
function showEmergency(T) {
  const box = $('emergency');
  const title = document.createElement('p');
  title.className = 'flex items-center gap-2 font-display text-2xl font-bold text-rose-ink';
  title.innerHTML = ICON.alert;
  title.append(T.emTitle);
  const text = document.createElement('p');
  text.className = 'mt-2 text-sm leading-relaxed text-ink';
  text.textContent = T.emText;
  const call112 = document.createElement('a');
  call112.href = 'tel:112';
  call112.className =
    'mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-ink px-4 py-2 text-sm font-semibold text-white hover:brightness-110';
  call112.innerHTML = ICON.phone;
  call112.append('Call 112');
  const call108 = document.createElement('a');
  call108.href = 'tel:108';
  call108.className =
    'ml-2 mt-3 inline-flex items-center rounded-xl border border-rose-ink px-4 py-2 text-sm font-semibold text-rose-ink hover:bg-white';
  call108.textContent = 'Ambulance 108';
  box.replaceChildren(title, text, call112, call108);
  box.classList.remove('hidden');
}

/** @param {EngineResult} res @param {string} langTag @param {boolean} emergency */
function render(res, langTag, emergency) {
  $('reply').textContent = res.spoken;
  paintCards(res.cards, emergency);
  lastSpoken = { text: res.spoken, lang: langTag };
  $('replayBtn').disabled = false;
  if ($('autoSpeak').checked) Speech.speakText(res.spoken, langTag);
  else Mascot.setMascotState('IDLE');
}

const CARD_STYLES = [
  { key: 'routine', title: 'Low-Emission Routine', icon: 'route', tone: 'bg-sage-50 text-sage-ink' },
  { key: 'indoor', title: 'Indoor Air Hack', icon: 'home', tone: 'bg-blush-50 text-rose-ink' },
  { key: 'impact', title: 'Direct Impact', icon: 'down', tone: 'bg-gold-50 text-gold-ink' },
];

/** @param {Cards} cards @param {boolean} dimmed true while the emergency alert is showing */
export function paintCards(cards, dimmed) {
  const wrap = $('cards');
  wrap.replaceChildren(
    ...CARD_STYLES.map(({ key, title, icon, tone }, i) => {
      const card = document.createElement('article');
      card.className = 'glass card-in rounded-3xl p-4' + (dimmed ? ' opacity-50' : '');
      card.style.animationDelay = i * 80 + 'ms';
      const h = document.createElement('h3');
      h.className = 'flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink2';
      h.innerHTML = `<span class="grid h-7 w-7 place-items-center rounded-full ${tone}">${ICON[icon]}</span>`;
      h.append(title);
      const p = document.createElement('p');
      p.className = 'mt-3 text-sm leading-relaxed text-ink';
      p.textContent = cards[/** @type {keyof Cards} */ (key)];
      card.append(h, p);
      return card;
    }),
  );
}
