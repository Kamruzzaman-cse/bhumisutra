/*
 * sync.js — live sync across browser tabs on the same origin, simulating
 * several land offices sharing one ledger the moment something changes.
 *
 * Production plan (see README): a permissioned ledger with copies at the
 * Sub-Registry, AC Land, DLRS and DC offices, each publishing its latest
 * hash. This demonstrates that idea safely for a live demo — no backend,
 * no account, no internet dependency, so it can never fail on stage wifi.
 * Open the app in two tabs (e.g. log in as Sub-Registrar in one, AC Land
 * in the other): register a sale in one tab and watch the other tab pick
 * up the new ledger block on its own, with a toast naming which office it
 * came from.
 *
 * Mechanism: BroadcastChannel, a same-origin, cross-tab message bus built
 * into the browser. Every call to BS.store's save() posts a tiny "the
 * ledger changed" ping; every other open tab hears it, reloads its copy
 * of the state from localStorage (which all tabs already share), and
 * re-renders. A lightweight heartbeat also keeps a "N office tabs
 * connected" count in the header, so the live-sync claim is visibly true,
 * not just asserted.
 */
window.BS = window.BS || {};

BS.sync = (function () {
  const CHANNEL = 'bhumisutra-sync-v1';
  const HEARTBEAT_MS = 4000;
  // Chrome throttles timers in a tab hidden for 5+ minutes to about once a
  // minute, so a background "office" tab may heartbeat only every ~60 s.
  // Tabs that close normally say 'bye' and are removed at once.
  const STALE_MS = 75000;
  const supported = typeof BroadcastChannel !== 'undefined';
  const tabId = Math.random().toString(36).slice(2, 9);
  const peers = {}; // tabId -> { office, seen }
  let channel = null;
  let office = '';
  let lastChainLen = 0;
  let onChangeCb = null;
  let onPeersCb = null;
  let heartbeatTimer = null;

  const OFFICE_LABEL = {
    subreg: 'সাব-রেজিস্ট্রি', acland: 'এসি ল্যান্ড', survey: 'সার্ভে অফিস',
    bank: 'ব্যাংক', admin: 'অ্যাডমিন', citizen: 'নাগরিক', public: 'এই ব্রাউজার'
  };
  function labelFor(role) { return OFFICE_LABEL[role] || OFFICE_LABEL.public; }

  function post(msg) {
    if (!channel) return;
    try { channel.postMessage(Object.assign({ tabId: tabId, office: office, t: Date.now() }, msg)); }
    catch (e) { /* channel closed or unavailable: ignore */ }
  }

  function prunePeers() {
    const now = Date.now();
    Object.keys(peers).forEach(function (id) {
      if (now - peers[id].seen > STALE_MS) delete peers[id];
    });
  }
  function peerCount() { prunePeers(); return Object.keys(peers).length; }

  // Called after every BS.store save. Any saved change is worth syncing:
  // a new block, a dismissed objection, a land lock, a fraud alert.
  function broadcastChange(chainLen) {
    lastChainLen = chainLen;
    post({ kind: 'change' });
  }

  // Re-broadcasts this tab's office label only when it actually changed,
  // so this can be called from refreshHeader() on every render without
  // flooding the channel.
  function setOffice(role) {
    const label = labelFor(role);
    if (label === office) return;
    office = label;
    post({ kind: 'hello' });
  }

  function init(chainLen) {
    lastChainLen = chainLen || 0;
    office = OFFICE_LABEL.public;
    if (!supported) return;
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = function (ev) {
      const m = ev.data;
      if (!m || m.tabId === tabId) return;
      if (m.kind === 'bye') { delete peers[m.tabId]; if (onPeersCb) onPeersCb(); return; }
      const isNew = !peers[m.tabId];
      peers[m.tabId] = { office: m.office, seen: Date.now() };
      if (isNew && onPeersCb) onPeersCb();
      if (m.kind === 'hello') post({ kind: 'heartbeat' }); // introduce ourselves back
      if (m.kind === 'change' && onChangeCb) onChangeCb(m.office);
    };
    post({ kind: 'hello' });
    heartbeatTimer = setInterval(function () { post({ kind: 'heartbeat' }); }, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) post({ kind: 'heartbeat' });
    });
    window.addEventListener('pagehide', function () { post({ kind: 'bye' }); });
  }

  return {
    supported: supported,
    init: init,
    setOffice: setOffice,
    broadcastChange: broadcastChange,
    peerCount: peerCount,
    onChange: function (cb) { onChangeCb = cb; },
    onPeers: function (cb) { onPeersCb = cb; }
  };
})();
