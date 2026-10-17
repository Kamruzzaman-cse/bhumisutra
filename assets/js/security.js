/*
 * security.js — digital signatures, one-time codes and NID privacy.
 *
 * 1. Office signature (ECDSA P-256): every deed and tax receipt QR carries
 *    the record plus a signature by the issuing office. Any phone can check
 *    the signature with the office PUBLIC key, even with no copy of the
 *    ledger, so a forged or edited QR fails.
 *    DEMO ONLY: the private key is in this file so the prototype can sign.
 *    In production it stays inside a hardware security module at the
 *    Sub-Registry / AC Land office and never reaches a browser.
 * 2. TOTP (RFC 6238): the 6-digit code an authenticator app shows every
 *    30 seconds. Works abroad with no Bangladeshi SIM and no internet.
 * 3. NID privacy: screens show only the last 4 digits; the ledger stores a
 *    salted SHA-256 of the NID, never the number itself.
 */
window.BS = window.BS || {};

BS.sec = (function () {
  const OFFICE_KEY = {
    pub: { kty: 'EC', crv: 'P-256', x: '4cu7Z3HgkSKOctNeRU--fHbiVuZtcWjfeypLuap9OLY', y: 'TBMglGCc2bLnVb9HD1fvZ4DgKFdWCY6mfmjve8Fq1DQ' },
    prv: { kty: 'EC', crv: 'P-256', x: '4cu7Z3HgkSKOctNeRU--fHbiVuZtcWjfeypLuap9OLY', y: 'TBMglGCc2bLnVb9HD1fvZ4DgKFdWCY6mfmjve8Fq1DQ', d: 'p-oWlaPSDsU9fhe7aAZA5E5cXIKYG3MOk2UdQ9EkHeQ' }
  };
  const NID_SALT = 'bhumisutra-demo-salt';
  const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
  const SIG = { name: 'ECDSA', hash: 'SHA-256' };

  /* ---------- base64url ---------- */
  function b64u(bytes) {
    let s = '';
    new Uint8Array(bytes).forEach(function (b) { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(str) {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    return Uint8Array.from(s, function (c) { return c.charCodeAt(0); });
  }
  function textToB64u(text) { return b64u(new TextEncoder().encode(text)); }
  function b64uToText(s) { return new TextDecoder().decode(unb64u(s)); }

  /* ---------- office signature ---------- */
  let keys = null;
  async function getKeys() {
    if (!keys) {
      keys = {
        prv: await crypto.subtle.importKey('jwk', Object.assign({ ext: true, key_ops: ['sign'] }, OFFICE_KEY.prv), ALG, false, ['sign']),
        pub: await crypto.subtle.importKey('jwk', Object.assign({ ext: true, key_ops: ['verify'] }, OFFICE_KEY.pub), ALG, false, ['verify'])
      };
    }
    return keys;
  }
  async function sign(obj) {
    const k = await getKeys();
    const sig = await crypto.subtle.sign(SIG, k.prv, new TextEncoder().encode(BS.crypto.canonical(obj)));
    return b64u(sig);
  }
  async function verify(obj, sigB64u) {
    try {
      const k = await getKeys();
      return await crypto.subtle.verify(SIG, k.pub, unb64u(sigB64u), new TextEncoder().encode(BS.crypto.canonical(obj)));
    } catch (e) { return false; }
  }

  // A QR link that carries the record and its signature: works on any phone.
  async function signedLink(kind, obj) {
    const sig = await sign(obj);
    return BS.ui.baseUrl() + '#/scan?k=' + kind + '&d=' + textToB64u(JSON.stringify(obj)) + '&s=' + sig;
  }

  /* ---------- TOTP (RFC 6238, HMAC-SHA1, 30 s, 6 digits) ---------- */
  function base32ToBytes(b32) {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    b32.replace(/=+$/, '').toUpperCase().split('').forEach(function (c) { bits += A.indexOf(c).toString(2).padStart(5, '0'); });
    const out = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
    return new Uint8Array(out);
  }
  async function totp(secretB32, when) {
    const counter = Math.floor((when || Date.now()) / 30000);
    const msg = new Uint8Array(8);
    let c = counter;
    for (let i = 7; i >= 0; i--) { msg[i] = c & 0xff; c = Math.floor(c / 256); }
    const key = await crypto.subtle.importKey('raw', base32ToBytes(secretB32), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
    const o = h[h.length - 1] & 0x0f;
    const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
    return String(bin % 1000000).padStart(6, '0');
  }
  // Accept the current code or the one just before (clock drift).
  async function checkTotp(secretB32, code) {
    const now = Date.now();
    return code === await totp(secretB32, now) || code === await totp(secretB32, now - 30000);
  }
  function secondsLeft() { return 30 - Math.floor(Date.now() / 1000) % 30; }

  /* ---------- one-time codes for SMS / email / WhatsApp (demo) ---------- */
  function otp() {
    const a = new Uint32Array(1); crypto.getRandomValues(a);
    return String(a[0] % 1000000).padStart(6, '0');
  }

  /* ---------- NID privacy ---------- */
  function maskNid(nid) { return nid ? '•••••• ' + String(nid).slice(-4) : ''; }
  function nidHash(nid) { return BS.crypto.sha256(NID_SALT + ':' + String(nid).replace(/\s/g, '')); }

  return { sign: sign, verify: verify, signedLink: signedLink, textToB64u: textToB64u, b64uToText: b64uToText,
    totp: totp, checkTotp: checkTotp, secondsLeft: secondsLeft, otp: otp, maskNid: maskNid, nidHash: nidHash };
})();
