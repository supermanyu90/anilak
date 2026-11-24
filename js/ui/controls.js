/** Mascot state chip, sample-question chips, language picker, mic/ask/stop/replay, voice speed. */
import { hasAskedYet, lastSpoken, processQuery } from '../assistant.js';
import { STORAGE_KEYS } from '../config.js';
import { L10N } from '../data/l10n.js';
import { $, store } from '../dom.js';
import { Mascot } from '../mascot.js';
import { Speech } from '../speech.js';
import { updateInsights } from './hub/index.js';

const STATE_STYLE = {
  IDLE: 'bg-mist text-ink2',
  LISTENING: 'bg-sage-50 text-sage-ink',
  THINKING: 'bg-gold-50 text-gold-ink',
  SPEAKING: 'bg-blush-50 text-rose-ink',
  SEVERE: 'bg-rose-ink text-white',
};
Mascot.onState((/** @type {keyof typeof STATE_STYLE} */ state) => {
  const chip = $('stateLabel');
  chip.textContent = state === 'SEVERE' ? 'SEVERE ALERT' : state;
  chip.className = 'rounded-full px-2 py-0.5 ' + STATE_STYLE[state];
});

/** Sample questions in the selected language. */
function renderChips() {
  const T = L10N[$('lang').value.split('-')[0]];
  $('chips').replaceChildren(
    ...T.chips.map((/** @type {string} */ question) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'rounded-full border border-ink/10 bg-mist px-3 py-1 text-xs text-ink hover:bg-blush-50';
      chip.textContent = question;
      chip.addEventListener('click', () => {
        $('query').value = question;
        processQuery(question);
      });
      return chip;
    }),
  );
  $('query').placeholder = T.chips[0];
}

$('lang').value = store.get(STORAGE_KEYS.LANG, 'en-IN');
$('lang').addEventListener('change', () => {
  store.set(STORAGE_KEYS.LANG, $('lang').value);
  renderChips();
  if (!hasAskedYet()) updateInsights(); // refresh the general-advice cards in the new language
});
renderChips();

$('micBtn').addEventListener('click', () => {
  if (Speech.listening) {
    Speech.stopListening();
    return;
  }
  $('query').value = '';
  Speech.start($('lang').value, (text) => ($('query').value = text), processQuery);
});
$('askForm').addEventListener('submit', (/** @type {Event} */ e) => {
  e.preventDefault();
  Speech.stopSpeaking();
  processQuery($('query').value);
});
$('stopBtn').addEventListener('click', () => Speech.stopSpeaking());
$('replayBtn').addEventListener('click', () => {
  if (lastSpoken) Speech.speakText(lastSpoken.text, lastSpoken.lang);
});

function renderRates() {
  document.querySelectorAll('#rates button').forEach((/** @type {any} */ b) => {
    const on = +b.dataset.rate === Speech.rate;
    b.classList.toggle('bg-blush/50', on);
    b.classList.toggle('text-ink', on);
  });
}
document.querySelectorAll('#rates button').forEach((/** @type {any} */ b) =>
  b.addEventListener('click', () => {
    Speech.setRate(+b.dataset.rate);
    renderRates();
  }),
);
renderRates();
