/** Where the Sarvam key comes from: settings, a local .env (localhost only), or the /api/sarvam proxy. */
import { store } from './dom.js';

// Sarvam key: settings value first, else SARVAM_API_KEY from the git-ignored .env (only read on localhost).
const sarvamListeners = [];
export const onSarvamChange = (f) => sarvamListeners.push(f);
let envSarvamKey = '';
export const getSarvamKey = () => store.get('hb_sarvam_key', '') || envSarvamKey;
if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  fetch('.env', { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).then((t) => {
    const m = t.match(/^\s*SARVAM_API_KEY\s*=\s*["']?([^"'\s#]+)/m);
    if (m) { envSarvamKey = m[1]; sarvamListeners.forEach((f) => f()); }
  }).catch(() => {});
}
// On the deployed site, /api/sarvam holds the key server-side.
let proxySarvam = false;
export const sarvamAvailable = () => !!getSarvamKey() || proxySarvam;
fetch('/api/sarvam?op=status', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {})).then((j) => {
  if (j.enabled) { proxySarvam = true; sarvamListeners.forEach((f) => f()); }
}).catch(() => {});
