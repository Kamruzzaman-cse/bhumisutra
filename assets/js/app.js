/*
 * app.js — starts the app, keeps the shared context fresh and routes
 * between screens using the URL hash (#/check?dag=101 and so on), which
 * works on GitHub Pages and Vercel without any server.
 * The menu changes with the signed-in role; locked screens offer a
 * one-click demo login for the right role.
 */
window.BS = window.BS || {};

BS.app = (function () {
  const U = BS.ui, A = BS.auth;
  const ctx = { state: null, derived: null, integrity: null, assessments: {}, khatianPrints: {} };

  // [route, label key]; screens a role cannot open are hidden from its menu.
  const NAV = [
    { group: 'nav.gCitizen', items: [['home', 'nav.home'], ['check', 'nav.check'], ['verify', 'nav.verify'], ['notices', 'nav.notices'], ['heirs', 'nav.heirs'], ['myland', 'nav.myland']] },
    { group: 'nav.gOffices', items: [['register', 'nav.register'], ['mutation', 'nav.mutation'], ['taxdesk', 'nav.taxdesk'], ['bank', 'nav.bank'], ['digitize', 'nav.digitize'], ['khatian', 'nav.khatian']] },
    { group: 'nav.gSystem', items: [['dashboard', 'nav.dashboard'], ['ledger', 'nav.ledger'], ['audit', 'nav.audit'], ['access', 'nav.access'], ['about', 'nav.about']] }
  ];

  async function refresh() {
    ctx.state = BS.store.state;
    ctx.integrity = await BS.store.verify();
    ctx.derived = BS.engine.derive(ctx.state.chain);
    ctx.assessments = {};
    BS.DATA.plots.forEach(function (p) {
      ctx.assessments[p.dag] = BS.engine.assess(p.dag, ctx.derived, ctx.state, ctx.integrity.ok);
    });
    ctx.khatianPrints = await BS.store.khatianFingerprints();
  }

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const parts = h.split('?');
    const route = parts[0] || 'home';
    const params = {};
    if (parts[1]) new URLSearchParams(parts[1]).forEach(function (v, k) { params[k] = v; });
    return { route: route, params: params };
  }

  function logo() {
    return '<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" class="logo-ring"/>' +
      '<path d="M11 13 L27 10 L30 26 L14 29 Z" class="logo-plot"/><path d="M11 13 L30 26 M27 10 L14 29" class="logo-line"/></svg>';
  }

  function renderNav(route) {
    const nav = document.getElementById('nav');
    const r = A.role();
    nav.innerHTML = NAV.map(function (g) {
      const items = g.items.filter(function (it) {
        if (it[0] === 'myland') return r === 'citizen';
        return A.canOpen(it[0]);
      });
      if (!items.length) return '';
      return '<div class="nav-group"><p>' + U.esc(U.t(g.group)) + '</p><ul>' + items.map(function (it) {
        const active = it[0] === route || (route === 'deed' && it[0] === 'verify') || (route === 'scan' && it[0] === 'verify') || (route === 'sign' && it[0] === 'check') || (route === 'record' && it[0] === 'digitize') || (route === 'receipt' && it[0] === 'myland');
        return '<li><a href="#/' + it[0] + '"' + (active ? ' aria-current="page"' : '') + '>' + U.esc(U.t(it[1])) + '</a></li>';
      }).join('') + '</ul></div>';
    }).join('') +
      (r === 'public' ? '<a class="btn primary nav-login" href="#/login">' + U.esc(U.t('nav.login')) + '</a>' : '') +
      '<p class="nav-foot">' + U.esc(U.t('nav.foot')) + '</p>';
  }

  function refreshHeader() {
    const v = ctx.integrity;
    const pill = document.getElementById('integrity');
    pill.className = 'integrity ' + (v.ok ? 'ok' : 'bad');
    pill.innerHTML = '<span class="dot"></span><span class="pill-text">' + U.esc(v.ok ? U.t('hdr.intact', { n: U.num(ctx.state.chain.length) }) : U.t('hdr.broken', { i: U.num(v.brokenAt) })) + '</span>';
    document.getElementById('lang-btn').textContent = U.getLang() === 'bn' ? 'English' : 'বাংলা';
    document.getElementById('lang-btn').setAttribute('lang', U.getLang() === 'bn' ? 'en' : 'bn');
    document.getElementById('brand-name').textContent = U.t('brand');
    document.getElementById('brand-tag').textContent = U.t('brand.tag');
    document.getElementById('demo-strip').textContent = U.t('demo.strip');
    const u = A.user();
    const who = document.getElementById('who');
    who.innerHTML = u
      ? '<span class="who-chip" title="' + U.esc(U.L(u.name)) + '"><span class="who-role">' + U.esc(U.t('role.' + u.role)) + '</span><code>' + u.u + '</code></span>' +
        '<button type="button" class="btn small" id="logout-btn">' + U.esc(U.t('login.logout')) + '</button>'
      : '<a class="btn small primary" href="#/login">' + U.esc(U.t('nav.login')) + '</a>';
    const lb = document.getElementById('logout-btn');
    if (lb) lb.addEventListener('click', logout);
    document.getElementById('size-down').textContent = U.getLang() === 'bn' ? 'অ−' : 'A−';
    document.getElementById('size-up').textContent = U.getLang() === 'bn' ? 'অ+' : 'A+';
    document.getElementById('size-down').setAttribute('aria-label', U.t('a11y.smaller'));
    document.getElementById('size-up').setAttribute('aria-label', U.t('a11y.bigger'));
    document.title = U.t('brand') + ' — ' + U.t('brand.tag');
  }

  function logout() {
    A.logout();
    refreshHeader();
    location.hash = '#/home';
    render();
    U.toast(U.t('login.loggedOut'), 'ok');
  }

  function render() {
    const r = parseHash();
    if (A.touch() === 'expired') { refreshHeader(); U.toast(U.t('login.expired'), 'bad'); }
    let route = r.route, params = r.params;
    if (!BS.views[route]) route = 'home';
    if (!A.canOpen(route) || (route === 'myland' && A.role() !== 'citizen')) {
      params = { screen: route === 'myland' ? 'myland' : route };
      route = 'locked';
    }
    const view = BS.views[route];
    const main = document.getElementById('view');
    main.innerHTML = view.render(params);
    if (view.mount) view.mount(params);
    renderNav(r.route);
    document.body.classList.remove('nav-open');
    document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
  }

  // Text size: 100% → 112% → 125% (helps older and low-vision users).
  const SIZES = [100, 112, 125];
  function applySize(i) {
    i = Math.max(0, Math.min(SIZES.length - 1, i));
    document.documentElement.style.fontSize = SIZES[i] + '%';
    try { localStorage.setItem('bhumisutra.size', String(i)); } catch (e) { /* ignore */ }
    return i;
  }

  async function start() {
    U.setLang(U.getLang());
    document.getElementById('brand-mark').innerHTML = logo();
    let size = 0;
    try { size = Number(localStorage.getItem('bhumisutra.size') || 0); } catch (e) { size = 0; }
    size = applySize(size);
    if (!window.crypto || !crypto.subtle) {
      document.getElementById('view').innerHTML = '<p class="empty">' + U.esc(U.t('err.crypto')) + '</p>';
      return;
    }
    await BS.store.init();
    await refresh();
    refreshHeader();
    render();
    window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); document.getElementById('view').focus({ preventScroll: true }); });
    document.getElementById('lang-btn').addEventListener('click', function () {
      U.setLang(U.getLang() === 'bn' ? 'en' : 'bn');
      refreshHeader(); render();
    });
    document.getElementById('size-down').addEventListener('click', function () { size = applySize(size - 1); });
    document.getElementById('size-up').addEventListener('click', function () { size = applySize(size + 1); });
    document.getElementById('menu-btn').addEventListener('click', function () {
      const open = document.body.classList.toggle('nav-open');
      this.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
        document.body.classList.remove('nav-open');
        document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
      }
    });
  }

  return { ctx: ctx, start: start, refresh: refresh, render: render, refreshHeader: refreshHeader, logo: logo, logout: logout };
})();

document.addEventListener('DOMContentLoaded', function () { BS.app.start(); });
