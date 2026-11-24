/** Mascot state chip, sample-question chips, language picker, mic/ask/stop/replay, voice speed. */
import { hasAskedYet, lastSpoken, processQuery } from '../assistant.js';
import { L10N } from '../data/l10n.js';
import { $, store } from '../dom.js';
import { Mascot } from '../mascot.js';
import { Speech } from '../speech.js';
import { updateInsights } from './hub.js';

const STATE_STYLE = { IDLE: 'bg-mist text-ink2', LISTENING: 'bg-sage-50 text-sage-ink', THINKING: 'bg-gold-50 text-gold-ink', SPEAKING: 'bg-blush-50 text-rose-ink', SEVERE: 'bg-rose-ink text-white' };
Mascot.onState((s) => { const el = $('stateLabel'); el.textContent = s === 'SEVERE' ? 'SEVERE ALERT' : s; el.className = 'rounded-full px-2 py-0.5 ' + STATE_STYLE[s]; });

function renderChips() {
  const lang = $('lang').value.split('-')[0];
  const T = L10N[lang];
  $('chips').innerHTML = '';
  T.chips.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rounded-full border border-ink/10 bg-mist px-3 py-1 text-xs text-ink hover:bg-blush-50';
    b.textContent = c; b.addEventListener('click', () => { $('query').value = c; processQuery(c); });
    $('chips').append(b);
  });
  $('query').placeholder = T.chips[0];
}

$('lang').value = store.get('hb_lang', 'en-IN');
$('lang').addEventListener('change', () => { store.set('hb_lang', $('lang').value); renderChips(); if (!hasAskedYet()) updateInsights(); });
renderChips();

$('micBtn').addEventListener('click', () => {
  if (Speech.listening) { Speech.stopListening(); return; }
  $('query').value = '';
  Speech.start($('lang').value, (t) => { $('query').value = t; }, processQuery);
});
$('askForm').addEventListener('submit', (e) => { e.preventDefault(); Speech.stopSpeaking(); processQuery($('query').value); });
$('stopBtn').addEventListener('click', () => Speech.stopSpeaking());
$('replayBtn').addEventListener('click', () => lastSpoken && Speech.speakText(lastSpoken.text, lastSpoken.lang));

function renderRates() {
  document.querySelectorAll('#rates button').forEach((b) => {
    const on = +b.dataset.rate === Speech.rate;
    b.classList.toggle('bg-blush/50', on); b.classList.toggle('text-ink', on);
  });
}
document.querySelectorAll('#rates button').forEach((b) => b.addEventListener('click', () => { Speech.setRate(+b.dataset.rate); renderRates(); }));
renderRates();
