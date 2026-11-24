/**
 * Where Sarvam access comes from, in priority order:
 * 1. a key saved in settings (this browser only),
 * 2. SARVAM_API_KEY in the git-ignored .env (read only on localhost),
 * 3. the deployed site's /api/sarvam proxy, which holds the key server-side.
 */
import { STORAGE_KEYS, TIMEOUT_MS } from './config.js';
import { store } from './dom.js';
import { fetchJson, fetchWithTimeout } from './lib/http.js';
import { logger } from './lib/log.js';

const log = logger('sarvam-access');
/** @type {Array<() => void>} */
const listeners = [];
/** @param {() => void} listener called when Sarvam becomes available after load */
export const onSarvamChange = (listener) => listeners.push(listener);
const notify = () => listeners.forEach((f) => f());

let envKey = '';
let proxyEnabled = false;
/** @returns {string} personal key ('' when using the proxy or none) */
export const getSarvamKey = () => store.get(STORAGE_KEYS.SARVAM_KEY, '') || envKey;
export const sarvamAvailable = () => Boolean(getSarvamKey()) || proxyEnabled;

const ENV_KEY_LINE = /^\s*SARVAM_API_KEY\s*=\s*["']?([^"'\s#]+)/m;

async function loadLocalEnvKey() {
  try {
    const res = await fetchWithTimeout('.env', { cache: 'no-store', timeoutMs: TIMEOUT_MS.STATUS });
    if (!res.ok) return; // no .env: expected when it hasn't been created
    const match = (await res.text()).match(ENV_KEY_LINE);
    if (match) {
      envKey = match[1];
      notify();
    }
  } catch (e) {
    log.debug('could not read .env', e);
  }
}

async function checkProxy() {
  try {
    const status = await fetchJson('/api/sarvam?op=status', { cache: 'no-store', timeoutMs: TIMEOUT_MS.STATUS });
    if (status.enabled) {
      proxyEnabled = true;
      notify();
    }
  } catch (e) {
    // 404 on a plain static server is expected; anything else on the deployed site is worth a warning.
    if (/** @type {any} */ (e).status === 404) log.debug('no /api/sarvam proxy here', e);
    else log.warn('Sarvam proxy status check failed', e);
  }
}

if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) loadLocalEnvKey();
checkProxy();
