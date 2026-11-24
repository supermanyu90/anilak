/** Entry point: wires modules together and loads the first air reading. */
import { loadCity, onAirChange, renderAir, useMyLocation } from './air.js';
import { CITIES } from './data/cities.js';
import { $, note } from './dom.js';
import { logger } from './lib/log.js';
import { sarvamAvailable } from './sarvam-access.js';
import { Speech } from './speech.js';
import { updateInsights } from './ui/hub/index.js';
import './ui/controls.js';
import './ui/settings.js';

const log = logger('main');

if (!Speech.supported && !sarvamAvailable()) note('Voice input needs Chrome or Edge. You can still type questions.');
if (!window.speechSynthesis && !sarvamAvailable()) $('autoSpeak').disabled = true;

onAirChange(updateInsights);

/** Use the visitor's location if they have already granted it; otherwise start with Delhi. */
async function loadInitialAir() {
  try {
    const permission = await navigator.permissions?.query({ name: 'geolocation' });
    if (permission?.state === 'granted') {
      useMyLocation();
      return;
    }
  } catch (e) {
    log.debug('geolocation permission query unsupported', e); // older Safari; fall through to Delhi
  }
  $('city').value = '0';
  loadCity(CITIES[0]);
}

renderAir();
loadInitialAir();
