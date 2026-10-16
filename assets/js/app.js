/*
 * app.js — starts the app, keeps the shared context fresh and routes
 * between screens using the URL hash (#/check?dag=101 and so on), which
 * works on GitHub Pages and Vercel without any server.
 */
window.BS = window.BS || {};

BS.app = (function () {
  const U = BS.ui;
  const ctx = { state: null, derived: null, integrity: null, assessments: {}, khatianPrints: {} };

  const NAV = [
    { group: 'nav.gCitizen', items: [['home', 'nav.home'], ['check', 'nav.check'], ['verify', 'nav.verify']] },
    { group: 'nav.gOffices', items: [['register', 'nav.register'], ['mutation', 'nav.mutation'], ['bank', 'nav.bank']] },
    { group: 'nav.gRecords', items: [['khatian', 'nav.khatian'], ['ledger', 'nav.ledger'], ['about', 'nav.about']] }
  ];

  // Recompute everything from the ledger. Cheap for a demo-sized chain.
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
    // A plot boundary inside a seal: the brand mark.
    return '<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" class="logo-ring"/>' +
      '<path d="M11 13 L27 10 L30 26 L14 29 Z" class="logo-plot"/><path d="M11 13 L30 26 M27 10 L14 29" class="logo-line"/></svg>';
  }

  function renderNav(route) {
    const nav = document.getElementById('nav');
    nav.innerHTML = NAV.map(function (g) {
      return '<div class="nav-group"><p>' + U.esc(U.t(g.group)) + '</p><ul>' + g.items.map(function (it) {
        const active = it[0] === route || (route === 'deed' && it[0] === 'verify');
        return '<li><a href="#/' + it[0] + '"' + (active ? ' aria-current="page"' : '') + '>' + U.esc(U.t(it[1])) + '</a></li>';
      }).join('') + '</ul></div>';
    }).join('') +
      '<p class="nav-foot">' + U.esc(U.t('nav.foot')) + '</p>';
  }

  function refreshHeader() {
    const v = ctx.integrity;
    const pill = document.getElementById('integrity');
    pill.className = 'integrity ' + (v.ok ? 'ok' : 'bad');
    pill.innerHTML = '<span class="dot"></span>' + U.esc(v.ok ? U.t('hdr.intact', { n: U.num(ctx.state.chain.length) }) : U.t('hdr.broken', { i: U.num(v.brokenAt) }));
    document.getElementById('lang-btn').textContent = U.getLang() === 'bn' ? 'English' : 'বাংলা';
    document.getElementById('brand-name').textContent = U.t('brand');
    document.getElementById('brand-tag').textContent = U.t('brand.tag');
    document.getElementById('demo-strip').textContent = U.t('demo.strip');
    document.title = U.t('brand') + ' — ' + U.t('brand.tag');
  }

  function render() {
    const r = parseHash();
    const view = BS.views[r.route] || BS.views.home;
    const main = document.getElementById('view');
    main.innerHTML = view.render(r.params);
    if (view.mount) view.mount(r.params);
    renderNav(r.route);
    document.body.classList.remove('nav-open');
  }

  async function start() {
    U.setLang(U.getLang());
    document.getElementById('brand-mark').innerHTML = logo();
    if (!window.crypto || !crypto.subtle) {
      document.getElementById('view').innerHTML = '<p class="empty">' + U.esc(U.t('err.crypto')) + '</p>';
      return;
    }
    await BS.store.init();
    await refresh();
    refreshHeader();
    render();
    window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
    document.getElementById('lang-btn').addEventListener('click', function () {
      U.setLang(U.getLang() === 'bn' ? 'en' : 'bn');
      refreshHeader(); render();
    });
    document.getElementById('menu-btn').addEventListener('click', function () {
      const open = document.body.classList.toggle('nav-open');
      this.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  return { ctx: ctx, start: start, refresh: refresh, render: render, refreshHeader: refreshHeader, logo: logo };
})();

document.addEventListener('DOMContentLoaded', function () { BS.app.start(); });
