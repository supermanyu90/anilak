/** Developer settings modal (Gemini + Sarvam keys) and the engine badge. */
import { $, store } from '../dom.js';
import { onSarvamChange, sarvamAvailable } from '../sarvam.js';

// Settings modal
function updateEngineBadge() {
  const on = !!store.get('hb_key', '');
  $('engineBadge').textContent = (on ? 'Gemini · ' + store.get('hb_model', 'gemini-3-flash-preview') : 'Offline rules engine') + (sarvamAvailable() ? ' · Sarvam voice' : '');
}
const modal = $('settings');
const openModal = () => { $('apiKey').value = store.get('hb_key', ''); $('model').value = store.get('hb_model', 'gemini-3-flash-preview'); $('sarvamKey').value = store.get('hb_sarvam_key', ''); modal.classList.remove('hidden'); modal.classList.add('flex'); $('apiKey').focus(); };
const closeModal = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); $('openSettings').focus(); };
$('openSettings').addEventListener('click', openModal);
$('closeSettings').addEventListener('click', closeModal);
$('saveSettings').addEventListener('click', () => {
  const k = $('apiKey').value.trim(), m = $('model').value.trim() || 'gemini-3-flash-preview';
  k ? store.set('hb_key', k) : store.del('hb_key'); store.set('hb_model', m);
  const s = $('sarvamKey').value.trim(); s ? store.set('hb_sarvam_key', s) : store.del('hb_sarvam_key');
  updateEngineBadge(); closeModal();
});
$('clearKey').addEventListener('click', () => { $('apiKey').value = ''; $('sarvamKey').value = ''; store.del('hb_key'); store.del('hb_sarvam_key'); updateEngineBadge(); });
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(); });
updateEngineBadge();
onSarvamChange(() => { $('autoSpeak').disabled = false; updateEngineBadge(); });
