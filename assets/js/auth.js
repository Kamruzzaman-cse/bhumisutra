/*
 * auth.js — who is using the system, and what they may see or do.
 *
 * Login is needed only where a person must be identified (an office action,
 * or a citizen looking at their own land). Searching land and verifying a
 * deed stay open to everyone, with private details hidden.
 *
 * DEMO ONLY: demo accounts and passwords are shown on the login page so
 * judges can try every role. In production, sign-in would be server-side
 * (government SSO for officers, NID + OTP for citizens) and passwords would
 * never live in the browser.
 */
window.BS = window.BS || {};

BS.auth = (function () {
  const KEY = 'bhumisutra.session.v1';
  const IDLE_MS = 30 * 60 * 1000; // sign out after 30 minutes without activity

  // Demo accounts. password for all: demo1234
  const USERS = [
    { u: 'subreg', role: 'subreg', name: { bn: 'সাব-রেজিস্ট্রার (ডেমো)', en: 'Sub-Registrar (demo)' } },
    { u: 'acland', role: 'acland', name: { bn: 'সহকারী কমিশনার ভূমি (ডেমো)', en: 'AC Land (demo)' } },
    { u: 'survey', role: 'survey', name: { bn: 'জরিপ ও রেকর্ড কর্মকর্তা (ডেমো)', en: 'Survey & Records Officer (demo)' } },
    { u: 'bank', role: 'bank', bank: 'B2', name: { bn: 'ব্যাংক কর্মকর্তা (ডেমো)', en: 'Bank Officer (demo)' } },
    { u: 'admin', role: 'admin', name: { bn: 'সিস্টেম অ্যাডমিন (ডেমো)', en: 'System Admin (demo)' } }
  ];
  const DEMO_PASSWORD = 'demo1234';

  /*
   * Access policy: data item × role.
   * full = sees everything · own = only for their own land · masked = sees
   * that it exists, not the detail · none = cannot see.
   */
  const ROLES = ['public', 'citizen', 'subreg', 'acland', 'survey', 'bank', 'admin'];
  const POLICY = {
    plotRecord:    { public: 'full', citizen: 'full', subreg: 'full', acland: 'full', survey: 'full', bank: 'full', admin: 'full' },
    ownerName:     { public: 'full', citizen: 'full', subreg: 'full', acland: 'full', survey: 'full', bank: 'full', admin: 'full' },
    ownerId:       { public: 'none', citizen: 'own', subreg: 'full', acland: 'full', survey: 'none', bank: 'full', admin: 'masked' },
    dealPrice:     { public: 'none', citizen: 'own', subreg: 'full', acland: 'full', survey: 'none', bank: 'full', admin: 'full' },
    encumbrance:   { public: 'full', citizen: 'full', subreg: 'full', acland: 'full', survey: 'full', bank: 'full', admin: 'full' },
    loanAmount:    { public: 'none', citizen: 'own', subreg: 'masked', acland: 'masked', survey: 'none', bank: 'full', admin: 'full' },
    caseDetail:    { public: 'masked', citizen: 'own', subreg: 'full', acland: 'full', survey: 'masked', bank: 'full', admin: 'full' },
    taxStatus:     { public: 'masked', citizen: 'own', subreg: 'full', acland: 'full', survey: 'none', bank: 'full', admin: 'full' },
    scannedOriginal: { public: 'none', citizen: 'own', subreg: 'full', acland: 'full', survey: 'full', bank: 'none', admin: 'full' },
    ledgerHashes:  { public: 'full', citizen: 'full', subreg: 'full', acland: 'full', survey: 'full', bank: 'full', admin: 'full' },
    auditLog:      { public: 'none', citizen: 'none', subreg: 'none', acland: 'none', survey: 'none', bank: 'none', admin: 'full' }
  };

  // Which screens each role can open. Screens not listed here are open to all.
  const SCREENS = {
    myland: ['citizen'],
    register: ['subreg', 'admin'],
    mutation: ['acland', 'admin'],
    taxdesk: ['acland', 'admin'],
    bank: ['bank', 'admin'],
    digitize: ['survey', 'acland', 'admin'],
    khatian: ['survey', 'acland', 'admin'],
    dashboard: ['admin'],
    audit: ['admin'],
    lab: ['admin']
  };

  let session = null;
  try { session = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { session = null; }
  if (session && Date.now() - session.last > IDLE_MS) session = null;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(session)); } catch (e) { /* ignore */ } }

  // Citizens to try on the login page (fictional NIDs).
  const DEMO_CITIZENS = ['P06', 'P04', 'P13', 'P05'];

  function user() {
    if (!session) return null;
    if (session.person) {
      const p = BS.DATA.persons[session.person];
      return p ? { u: BS.sec.maskNid(p.nid), role: 'citizen', person: session.person, name: { bn: p.bn, en: p.en } } : null;
    }
    return USERS.find(function (x) { return x.u === session.u; }) || null;
  }
  function role() { const u = user(); return u ? u.role : 'public'; }

  function login(username, password) {
    const u = USERS.find(function (x) { return x.u === String(username).trim().toLowerCase(); });
    if (!u || password !== DEMO_PASSWORD) return false;
    session = { u: u.u, since: Date.now(), last: Date.now() };
    save();
    audit('login', '');
    return true;
  }
  // Citizen sign-in: NID + date of birth, then a one-time code (see views2).
  function findCitizen(nid, dob) {
    const id = BS.engine.personByNid(nid);
    const p = id && BS.DATA.persons[id];
    if (!p || p.died || id === 'GOV') return null;
    return p.dob === String(dob).trim() ? id : null;
  }
  function loginPerson(id) {
    session = { person: id, since: Date.now(), last: Date.now() };
    save();
    audit('login', BS.sec.maskNid(BS.DATA.persons[id].nid));
  }

  function logout() {
    if (session) audit('logout', '');
    session = null;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }
  function touch() {
    if (!session) return;
    if (Date.now() - session.last > IDLE_MS) { logout(); return 'expired'; }
    session.last = Date.now(); save();
  }

  function canOpen(screen) {
    const allowed = SCREENS[screen];
    return !allowed || allowed.indexOf(role()) !== -1;
  }
  function rolesFor(screen) { return SCREENS[screen] || null; }

  // May the current user see this data item? ownerIds = people who own the record.
  function see(item, ownerIds) {
    const r = role();
    const rule = (POLICY[item] || {})[r] || 'none';
    if (rule === 'full') return true;
    if (rule === 'own') {
      const u = user();
      return !!(u && u.person && ownerIds && ownerIds.indexOf(u.person) !== -1);
    }
    return false;
  }

  // Append-only audit trail of official actions.
  function audit(action, target) {
    const st = BS.store && BS.store.state;
    if (!st) return;
    st.audit = st.audit || [];
    const u = user();
    st.audit.unshift({ time: new Date().toISOString(), user: u ? u.u : 'public', role: u ? u.role : 'public', action: action, target: target || '' });
    if (st.audit.length > 300) st.audit.length = 300;
    BS.store.saveQueue();
  }

  return {
    USERS: USERS, DEMO_PASSWORD: DEMO_PASSWORD, DEMO_CITIZENS: DEMO_CITIZENS, findCitizen: findCitizen, loginPerson: loginPerson, ROLES: ROLES, POLICY: POLICY, SCREENS: SCREENS,
    user: user, role: role, login: login, logout: logout, touch: touch,
    canOpen: canOpen, rolesFor: rolesFor, see: see, audit: audit
  };
})();
