/**
 * Tiny structured logger. Every line is prefixed with the app and the module ("scope") so
 * failures are searchable in the browser console and in Vercel function logs.
 * - warn: something failed and the app fell back (always logged).
 * - debug: expected, harmless failures (storage blocked, optional feature missing);
 *   logged only when globalThis.ANILAK_DEBUG is true or, in the browser, on localhost.
 */

const debugEnabled = () =>
  globalThis.ANILAK_DEBUG === true ||
  (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname));

/** @param {unknown} err */
const detail = (err) => (err instanceof Error ? err.message : err === undefined ? '' : String(err));

/** @param {string} scope */
export function logger(scope) {
  const tag = `[anilak:${scope}]`;
  return {
    /** @param {string} message @param {unknown} [err] */
    warn: (message, err) => console.warn(tag, message, detail(err)),
    /** @param {string} message @param {unknown} [err] */
    debug: (message, err) => {
      if (debugEnabled()) console.debug(tag, message, detail(err));
    },
  };
}
