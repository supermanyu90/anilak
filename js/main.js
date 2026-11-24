/** Entry point: wires modules together and loads the first air reading. */
import { loadCity, onAirChange, renderAir, useMyLocation } from './air.js';
import { CITIES } from './data/cities.js';
import { $, note } from './dom.js';
import { sarvamAvailable } from './sarvam.js';
import { Speech } from './speech.js';
import { updateInsights } from './ui/hub.js';
import './ui/controls.js';
import './ui/settings.js';

if (!Speech.supported && !sarvamAvailable()) note('Voice input needs Chrome or Edge. You can still type questions.');
if (!window.speechSynthesis && !sarvamAvailable()) $('autoSpeak').disabled = true;

onAirChange(updateInsights);

// Initial data: try the user's location silently if already permitted, else Delhi.
renderAir();
(async () => {
  try {
    const p = await navigator.permissions?.query({ name: 'geolocation' });
    if (p && p.state === 'granted') { useMyLocation(); return; }
  } catch {}
  $('city').value = '0'; loadCity(CITIES[0]);
})();
