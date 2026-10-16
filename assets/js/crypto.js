/*
 * crypto.js — fingerprints for land records.
 *
 * Every record (deed, mutation, mortgage, khatian) is turned into a
 * "canonical" string first, so the same data always gives the same text
 * (object keys are sorted). Then we take its SHA-256 hash with the
 * browser's built-in Web Crypto API. Changing even one character of the
 * record gives a completely different hash.
 */
window.BS = window.BS || {};

BS.crypto = (function () {
  // Stable JSON: keys sorted at every level, no extra spaces.
  function canonical(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    return '{' + Object.keys(value).sort()
      .filter(function (k) { return value[k] !== undefined; })
      .map(function (k) { return JSON.stringify(k) + ':' + canonical(value[k]); })
      .join(',') + '}';
  }

  async function sha256(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map(function (b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  }

  function hashObject(obj) {
    return sha256(canonical(obj));
  }

  return { canonical: canonical, sha256: sha256, hashObject: hashObject };
})();
