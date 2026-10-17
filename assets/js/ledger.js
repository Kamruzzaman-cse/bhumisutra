/*
 * ledger.js — the hash-chained ledger and saved app state.
 *
 * Each block stores: index, timestamp, type, payload, prevHash, hash.
 *   hash = SHA-256( canonical({ index, timestamp, type, payload, prevHash }) )
 * Because every block also stores the hash of the block before it, changing
 * any old record breaks the chain from that point on — and verify() finds it.
 *
 * State (ledger + e-Mutation queue + alerts) is saved in localStorage so the
 * demo survives a page reload. In production this would be a server-side,
 * multi-office ledger (see README).
 */
window.BS = window.BS || {};

BS.store = (function () {
  const KEY = 'bhumisutra.state.v3';
  const ZERO = '0'.repeat(64);
  let state = null;

  function read() {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked: keep in memory */ }
  }

  function blockBody(b) {
    return { index: b.index, timestamp: b.timestamp, type: b.type, payload: b.payload, prevHash: b.prevHash };
  }
  function computeHash(b) { return BS.crypto.hashObject(blockBody(b)); }

  async function makeBlock(chain, type, payload, timestamp) {
    const prev = chain[chain.length - 1];
    const b = { index: chain.length, timestamp: timestamp, type: type, payload: payload, prevHash: prev ? prev.hash : ZERO };
    b.hash = await computeHash(b);
    return b;
  }

  // Fingerprint of every digitized khatian, anchored in block #1.
  async function khatianFingerprints() {
    const out = {};
    for (const p of BS.DATA.plots) {
      for (const k of p.khatians) {
        out[khatianId(p.dag, k)] = await BS.crypto.hashObject(Object.assign({ dag: p.dag }, k));
      }
    }
    return out;
  }
  function khatianId(dag, k) { return dag + '/' + k.survey + '-' + k.no; }

  async function buildSeed() {
    const chain = [];
    const ev = BS.DATA.seedEvents;
    chain.push(await makeBlock(chain, ev[0].type, ev[0].payload, ev[0].timestamp));
    chain.push(await makeBlock(chain, 'KHATIAN_BATCH_ANCHORED',
      { survey: 'CS/SA/RS/BS', mouza: 'Shaplapur', records: await khatianFingerprints() },
      '2018-01-02T00:00:00.000Z'));
    for (let i = 1; i < ev.length; i++) {
      chain.push(await makeBlock(chain, ev[i].type, ev[i].payload, ev[i].timestamp));
    }
    return {
      version: 3,
      audit: [],
      digitized: [],
      pendingSales: [],
      prefs: {},
      chain: chain,
      mutationQueue: JSON.parse(JSON.stringify(BS.DATA.seedMutationQueue)),
      alerts: JSON.parse(JSON.stringify(BS.DATA.seedAlerts)),
      counters: { deed: 200, mutation: 100, mortgage: 40, receipt: 500, digit: 0, notice: 0, escrow: 0 }
    };
  }

  async function init() {
    state = read();
    if (!state || !Array.isArray(state.chain) || state.version !== 3) {
      state = await buildSeed();
      save();
    }
    return state;
  }

  async function reset() {
    state = await buildSeed();
    save();
  }

  async function append(type, payload) {
    const b = await makeBlock(state.chain, type, payload, new Date().toISOString());
    state.chain.push(b);
    save();
    return b;
  }

  /*
   * Walk the whole chain and re-check every block.
   * hashOk: stored hash equals a freshly computed hash (content not edited)
   * linkOk: prevHash equals the real hash of the previous block
   * Everything after the first broken block is marked "after break".
   */
  async function verify() {
    const chain = state.chain;
    const results = [];
    let brokenAt = -1;
    for (let i = 0; i < chain.length; i++) {
      const b = chain[i];
      const recomputed = await computeHash(b);
      const hashOk = recomputed === b.hash;
      const linkOk = i === 0 ? b.prevHash === ZERO : b.prevHash === chain[i - 1].hash;
      const ok = hashOk && linkOk;
      if (!ok && brokenAt === -1) brokenAt = i;
      results.push({ index: i, hashOk: hashOk, linkOk: linkOk, recomputed: recomputed, afterBreak: brokenAt !== -1 && i > brokenAt });
    }
    return { ok: brokenAt === -1, brokenAt: brokenAt, results: results };
  }

  /*
   * Tamper Lab: simulate an attacker who edits the saved database directly,
   * bypassing BhumiSutra. "naive" edits the record only. "smart" also
   * recomputes that block's hash to hide the edit — the NEXT block's link
   * still exposes it.
   */
  async function tamper(index, field, value, mode) {
    const b = state.chain[index];
    if (!b) return;
    b.payload = Object.assign({}, b.payload);
    b.payload[field] = value;
    if (mode === 'smart') b.hash = await computeHash(b);
    save();
  }

  function nextNo(kind, prefix) {
    state.counters[kind] = (state.counters[kind] || 0) + 1;
    save();
    const year = new Date().getFullYear();
    return prefix + '-' + year + '-' + String(state.counters[kind]).padStart(4, '0');
  }

  function addAlert(a) { state.alerts.unshift(a); save(); }
  function saveQueue() { save(); }

  return {
    init: init, reset: reset, append: append, verify: verify, tamper: tamper,
    nextNo: nextNo, addAlert: addAlert, saveQueue: saveQueue,
    khatianFingerprints: khatianFingerprints, khatianId: khatianId, computeHash: computeHash,
    get state() { return state; }
  };
})();
