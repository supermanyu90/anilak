/** Learn & act hub: tab switching, glance tiles, and refreshing every AQI-dependent view. */
import { Air } from '../../air.js';
import { hasAskedYet, paintCards } from '../../assistant.js';
import { LIMITS, PM25_PER_CIGARETTE, STORAGE_KEYS } from '../../config.js';
import { $, store, tween } from '../../dom.js';
import { localEngine } from '../../lib/intent.js';
import { renderForecast } from './forecast.js';
import { renderOrgans, renderScale } from './health.js';
import { initHome, renderCadr } from './home.js';
import { renderMyths } from './myths.js';
import { renderRules } from './rules.js';

/** @param {string} name tab id: health | home | rules | myths @param {boolean} [scroll] */
export function showTab(name, scroll) {
  document.querySelectorAll('.hub-tab').forEach((/** @type {any} */ b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  document.querySelectorAll('.hub-panel').forEach((panel) => {
    const on = panel.id === 'tab-' + name;
    panel.classList.toggle('hidden', !on);
    if (on) {
      // Restart the fade-in animation.
      panel.classList.remove('card-in');
      void (/** @type {HTMLElement} */ (panel).offsetWidth);
      panel.classList.add('card-in');
    }
  });
  store.set(STORAGE_KEYS.TAB, name);
  if (scroll) $('hub').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Re-render everything that depends on the current air reading. Called after every change to Air. */
export function updateInsights() {
  tween($('gCig'), Air.pm2_5 / PM25_PER_CIGARETTE, 1);
  tween($('gWho'), Air.pm2_5 / LIMITS.PM25.WHO, 1);
  renderForecast();
  renderScale();
  renderRules();
  renderCadr();
  // Until the user asks something, the cards show general advice for the current air.
  if (!hasAskedYet()) paintCards(localEngine('', $('lang').value, Air).cards, false);
}

document
  .querySelectorAll('.hub-tab')
  .forEach((/** @type {any} */ b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
document.querySelectorAll('[data-goto]').forEach((/** @type {any} */ b) =>
  b.addEventListener('click', () => {
    const target = b.dataset.goto;
    if (target === 'forecast') $('forecast').scrollIntoView({ behavior: 'smooth', block: 'center' });
    else showTab(target, true);
  }),
);

renderOrgans();
initHome();
renderMyths();
showTab(store.get(STORAGE_KEYS.TAB, 'health'));
