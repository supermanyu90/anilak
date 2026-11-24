/** Developer settings modal (Gemini + Sarvam keys) and the engine badge in the header. */
import { GEMINI, STORAGE_KEYS } from '../config.js';
import { $, store } from '../dom.js';
import { onSarvamChange, sarvamAvailable } from '../sarvam-access.js';

const modal = $('settings');

function updateEngineBadge() {
  const engine = store.get(STORAGE_KEYS.GEMINI_KEY, '')
    ? 'Gemini · ' + store.get(STORAGE_KEYS.GEMINI_MODEL, GEMINI.DEFAULT_MODEL)
    : 'Offline rules engine';
  $('engineBadge').textContent = engine + (sarvamAvailable() ? ' · Sarvam voice' : '');
}

/** Save a trimmed value, or remove the key when the field is empty. */
function saveOrClear(/** @type {string} */ key, /** @type {string} */ value) {
  if (value) store.set(key, value);
  else store.del(key);
}

function openModal() {
  $('apiKey').value = store.get(STORAGE_KEYS.GEMINI_KEY, '');
  $('model').value = store.get(STORAGE_KEYS.GEMINI_MODEL, GEMINI.DEFAULT_MODEL);
  $('sarvamKey').value = store.get(STORAGE_KEYS.SARVAM_KEY, '');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  $('apiKey').focus();
}

function closeModal() {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  $('openSettings').focus();
}

$('openSettings').addEventListener('click', openModal);
$('closeSettings').addEventListener('click', closeModal);
$('saveSettings').addEventListener('click', () => {
  saveOrClear(STORAGE_KEYS.GEMINI_KEY, $('apiKey').value.trim());
  store.set(STORAGE_KEYS.GEMINI_MODEL, $('model').value.trim() || GEMINI.DEFAULT_MODEL);
  saveOrClear(STORAGE_KEYS.SARVAM_KEY, $('sarvamKey').value.trim());
  updateEngineBadge();
  closeModal();
});
$('clearKey').addEventListener('click', () => {
  $('apiKey').value = '';
  $('sarvamKey').value = '';
  store.del(STORAGE_KEYS.GEMINI_KEY);
  store.del(STORAGE_KEYS.SARVAM_KEY);
  updateEngineBadge();
});
modal.addEventListener('click', (/** @type {MouseEvent} */ e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
});

updateEngineBadge();
onSarvamChange(() => {
  $('autoSpeak').disabled = false;
  updateEngineBadge();
});
