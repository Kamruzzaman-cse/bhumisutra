/*
 * views2.js — screens added for the Final-round scope:
 * login, my land, land tax, document digitization (OCR), digitized records,
 * admin dashboard, audit log and the data-access policy.
 * Shared pieces (khatian document, ownership flow) live in BS.parts.
 */
window.BS = window.BS || {};

BS.parts = (function () {
  const U = BS.ui, D = BS.DATA, t = U.t, esc = U.esc;

  // 33 decimals -> "0.3300" acres (khatians are written in acres)
  function acres(dec) { return (Number(dec) / 100).toFixed(4); }

  function surveyName(code) { return t('survey.' + code) || code; }

  /*
   * A khatian drawn in the official layout: header, owners, land schedule.
   * k = { district, upazila, mouza, jl, survey, khatianNo, year, owners[], rows[], totalArea }
   */
  function khatianDoc(k, opts) {
    opts = opts || {};
    const owners = (k.owners || []).map(function (o, i) {
      const rel = o.rel === 'husband' ? t('kd.husband') : t('kd.father');
      return '<tr><td>' + U.num(i + 1) + '</td><td>' + esc(o.name) +
        (o.guardian ? ', ' + esc(rel) + ': ' + esc(o.guardian) : '') +
        (o.address ? ', ' + esc(t('kd.village')) + ': ' + esc(o.address) : '') +
        (o.id ? '<br><small class="muted">' + esc(o.id) + '</small>' : '') +
        '</td><td class="num">' + U.num(esc(o.share || '')) + '</td></tr>';
    }).join('');
    const rows = (k.rows || []).map(function (r) {
      return '<tr><td>' + U.num(esc(r.dag)) + '</td><td>' + esc(r.cls) + '</td><td class="num">' + U.num(esc(r.total)) +
        '</td><td class="num">' + U.num(esc(r.share)) + '</td><td class="num">' + U.num(esc(r.area)) + '</td></tr>';
    }).join('');
    return '<article class="khatian-doc' + (opts.compact ? ' compact' : '') + '">' +
      '<header><h3>' + esc(t('kd.title', { survey: surveyName(k.survey) })) + '</h3>' +
      (opts.badge ? '<span class="badge ' + opts.badge.tone + '">' + esc(opts.badge.text) + '</span>' : '') + '</header>' +
      '<dl class="kd-head">' +
        '<div><dt>' + esc(t('kd.district')) + '</dt><dd>' + esc(k.district || '—') + '</dd></div>' +
        '<div><dt>' + esc(t('kd.upazila')) + '</dt><dd>' + esc(k.upazila || '—') + '</dd></div>' +
        '<div><dt>' + esc(t('kd.mouza')) + '</dt><dd>' + esc(k.mouza || '—') + '</dd></div>' +
        '<div><dt>' + esc(t('kd.jl')) + '</dt><dd>' + U.num(esc(k.jl || '—')) + '</dd></div>' +
        '<div><dt>' + esc(t('kd.khatianNo')) + '</dt><dd><strong>' + U.num(esc(k.khatianNo || '—')) + '</strong></dd></div>' +
        '<div><dt>' + esc(t('kd.year')) + '</dt><dd>' + U.num(esc(k.year || '—')) + '</dd></div>' +
      '</dl>' +
      '<div class="table-wrap"><table class="table kd"><thead><tr><th>' + esc(t('kd.sl')) + '</th><th>' + esc(t('kd.ownerCol')) + '</th><th class="num">' + esc(t('kd.share')) + '</th></tr></thead><tbody>' + owners + '</tbody></table></div>' +
      '<div class="table-wrap"><table class="table kd"><thead><tr><th>' + esc(t('kd.dag')) + '</th><th>' + esc(t('kd.class')) + '</th><th class="num">' + esc(t('kd.total')) + '</th><th class="num">' + esc(t('kd.share')) + '</th><th class="num">' + esc(t('kd.area')) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (k.totalArea ? '<p class="kd-total">' + esc(t('kd.totalArea')) + ': ' + U.num(esc(k.totalArea)) + ' ' + esc(t('unit.acre')) + '</p>' : '') +
      '</article>';
  }

  // Khatian of a Shaplapur plot in the same layout.
  function plotKhatian(p, k) {
    const loc = D.location;
    const person = Object.keys(D.persons).map(function (id) { return D.persons[id]; })
      .find(function (x) { return x.en === k.owner.en; });
    return {
      district: U.L(loc.district), upazila: U.L(loc.upazila), mouza: U.L(loc.mouza), jl: loc.jl,
      survey: k.survey, khatianNo: k.no, year: k.year,
      owners: [{ name: U.L(k.owner), guardian: person && person.f ? U.L(person.f) : '', rel: person && person.rel, address: U.L(loc.mouza), share: '1.000' }],
      rows: [{ dag: p.dag, cls: U.L(p.landClass), total: acres(k.area), share: '1.000', area: acres(k.area) }],
      totalArea: acres(k.area)
    };
  }

  /*
   * "Where did this land come from, and where did it go?"
   * steps = [{ from, to, label, when, tone }]
   */
  function flow(steps, current) {
    return '<ol class="flow">' + steps.map(function (s) {
      return '<li class="flow-step ' + (s.tone || '') + '">' +
        '<span class="flow-when">' + esc(s.when) + '</span>' +
        '<div class="flow-row"><span class="flow-node">' + esc(s.from) + '</span>' +
        '<span class="flow-edge"><span>' + esc(s.label) + '</span></span>' +
        '<span class="flow-node to">' + esc(s.to) + '</span></div></li>';
    }).join('') + '</ol>' +
      (current ? '<p class="flow-now"><strong>' + esc(t('flow.now')) + ':</strong> ' + esc(current) + '</p>' : '');
  }

  function plotFlow(p, s) {
    const steps = [];
    for (let i = 1; i < p.khatians.length; i++) {
      const a = p.khatians[i - 1], b = p.khatians[i];
      const changed = a.owner.en !== b.owner.en;
      if (!changed && a.area === b.area) continue;
      steps.push({
        when: U.num(b.year), from: U.L(a.owner) + ' (' + surveyName(a.survey) + ')', to: U.L(b.owner) + ' (' + surveyName(b.survey) + ')',
        label: changed ? (b.basis ? t('basis.' + b.basis) : t('flow.noBasis')) : t('flow.areaChange'),
        tone: changed && !b.basis ? 'warn' : a.area !== b.area ? 'warn' : ''
      });
    }
    if (!steps.length) {
      const first = p.khatians[0], last = p.khatians[p.khatians.length - 1];
      steps.push({ when: U.num(first.year) + '–' + U.num(last.year), from: U.L(first.owner), to: U.L(last.owner), label: t('flow.sameRecord'), tone: '' });
    }
    s.deeds.forEach(function (b) {
      const d = b.payload;
      const mut = s.mutations.some(function (m) { return m.payload.deedNo === d.deedNo; });
      steps.push({ when: U.date(d.date), from: U.person(d.seller), to: U.person(d.buyer),
        label: t('flow.deed', { no: d.deedNo, area: U.area(d.area) }) + (mut ? '' : ' · ' + t('flow.notMutated')), tone: mut ? 'ok' : 'warn' });
    });
    return flow(steps, U.owners(s.deedOwners));
  }

  // Simple icons (stroke only) for big tiles.
  const ICONS = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
    scan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10"/></svg>',
    stamp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6v6l3 3v3H6v-3l3-3z"/><path d="M5 20h14"/></svg>',
    coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M9.5 9.5h5M9.5 12h5M12 9.5c2 0 2 5-1 5l3 2.5"/></svg>',
    bank: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-5 9 5M5 9v9M10 9v9M14 9v9M19 9v9M3 20h18"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
  };

  return { khatianDoc: khatianDoc, plotKhatian: plotKhatian, flow: flow, plotFlow: plotFlow, acres: acres, ICONS: ICONS, surveyName: surveyName };
})();

(function () {
  const U = BS.ui, E = BS.engine, D = BS.DATA, A = BS.auth, P = BS.parts;
  const t = U.t, esc = U.esc;
  function ctx() { return BS.app.ctx; }
  const V = BS.views;

  function head(kicker, title, lede) {
    return '<header class="page-head">' + (kicker ? '<p class="kicker">' + esc(kicker) + '</p>' : '') +
      '<h1>' + esc(title) + '</h1>' + (lede ? '<p>' + esc(lede) + '</p>' : '') + '</header>';
  }
  function fy(y) { return U.num(y) + '–' + U.num(String(y + 1).slice(2)); }

  /* ---------- Login ---------- */

  const ROLE_ICON = { citizen: 'user', subreg: 'stamp', acland: 'doc', survey: 'scan', bank: 'bank', admin: 'chart' };

  V.login = {
    render: function (q) {
      const u = A.user();
      if (u) {
        return head('', t('login.already', { name: U.L(u.name) }), t('login.alreadyD')) +
          '<div class="actions"><a class="btn primary" href="#/' + homeFor(u.role) + '">' + esc(t('login.continue')) + '</a>' +
          '<button class="btn" type="button" data-logout>' + esc(t('login.logout')) + '</button></div>';
      }
      return head('', t('login.title'), t('login.lede')) +
        (q.next ? '<p class="match bad">' + esc(t('login.needed')) + '</p>' : '') +
        '<section aria-labelledby="quick-h"><h2 id="quick-h" class="section-title">' + esc(t('login.quick')) + '</h2>' +
        '<ul class="role-grid">' + A.USERS.map(function (x) {
          return '<li><button type="button" class="role-card" data-quick="' + x.u + '">' +
            '<span class="role-icon">' + P.ICONS[ROLE_ICON[x.role]] + '</span>' +
            '<span class="role-name">' + esc(t('role.' + x.role)) + '</span>' +
            '<span class="role-can">' + esc(t('roleCan.' + x.role)) + '</span>' +
            '<span class="cred"><code>' + x.u + '</code> / <code>' + A.DEMO_PASSWORD + '</code></span>' +
            '<span class="role-go">' + esc(t('login.enterAs')) + '</span></button></li>';
        }).join('') + '</ul></section>' +
        '<section class="panel login-form-wrap"><h2>' + esc(t('login.manual')) + '</h2>' +
          '<form id="login-form" class="form" autocomplete="off">' +
            '<label class="field"><span>' + esc(t('login.user')) + '</span><input id="login-user" name="user" required autocapitalize="off"></label>' +
            '<label class="field"><span>' + esc(t('login.pass')) + '</span><input id="login-pass" name="pass" type="password" required></label>' +
            '<p id="login-err" class="err" role="alert"></p>' +
            '<button class="btn primary" type="submit">' + esc(t('login.submit')) + '</button>' +
          '</form>' +
          '<p class="hint">' + esc(t('login.prod')) + '</p>' +
        '</section>' +
        '<p class="hint">' + esc(t('login.noNeed')) + ' <a href="#/check">' + esc(t('nav.check')) + '</a> · <a href="#/verify">' + esc(t('nav.verify')) + '</a></p>';
    },
    mount: function (q) {
      const go = function () {
        const u = A.user();
        BS.app.refreshHeader();
        location.hash = q.next ? '#/' + decodeURIComponent(q.next) : '#/' + homeFor(u.role);
        U.toast(t('login.welcome', { name: U.L(u.name) }), 'ok');
      };
      document.querySelectorAll('[data-quick]').forEach(function (b) {
        b.addEventListener('click', function () { if (A.login(b.dataset.quick, A.DEMO_PASSWORD)) go(); });
      });
      const f = document.getElementById('login-form');
      if (f) f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (A.login(f.user.value, f.pass.value)) go();
        else document.getElementById('login-err').textContent = t('login.wrong');
      });
      document.querySelectorAll('[data-logout]').forEach(function (b) { b.addEventListener('click', BS.app.logout); });
    }
  };

  function homeFor(role) {
    return { citizen: 'myland', subreg: 'register', acland: 'mutation', survey: 'digitize', bank: 'bank', admin: 'dashboard' }[role] || 'home';
  }
  BS.homeFor = homeFor;

  // Shown when a screen needs a role the visitor does not have.
  V.locked = {
    render: function (q) {
      const roles = A.rolesFor(q.screen) || [];
      const users = A.USERS.filter(function (x) { return roles.indexOf(x.role) !== -1; });
      return head('', t('locked.title'), t('locked.lede', { roles: roles.map(function (r) { return t('role.' + r); }).join(', ') })) +
        '<ul class="role-grid small">' + users.map(function (x) {
          return '<li><button type="button" class="role-card" data-quick="' + x.u + '"><span class="role-icon">' + P.ICONS[ROLE_ICON[x.role]] + '</span>' +
            '<span class="role-name">' + esc(t('role.' + x.role)) + '</span><span class="cred"><code>' + x.u + '</code> / <code>' + A.DEMO_PASSWORD + '</code></span>' +
            '<span class="role-go">' + esc(t('login.enterAs')) + '</span></button></li>';
        }).join('') + '</ul>';
    },
    mount: function (q) {
      document.querySelectorAll('[data-quick]').forEach(function (b) {
        b.addEventListener('click', function () {
          A.logout();
          if (A.login(b.dataset.quick, A.DEMO_PASSWORD)) { BS.app.refreshHeader(); BS.app.render(); U.toast(t('login.welcome', { name: U.L(A.user().name) }), 'ok'); }
        });
      });
    }
  };

  /* ---------- Citizen: my land ---------- */

  V.myland = {
    render: function () {
      const u = A.user(), c = ctx(), me = u.person;
      const mine = D.plots.filter(function (p) { return c.derived[p.dag].deedOwners[me] || c.derived[p.dag].recordOwners[me]; });
      const myAlerts = c.state.alerts.filter(function (a) { return mine.some(function (p) { return p.dag === a.dag; }); });
      const myDeeds = c.state.chain.filter(function (b) { return b.type === 'DEED_REGISTERED' && (b.payload.buyer === me || b.payload.seller === me); });
      const holdings = D.holdings.filter(function (h) { return h.owner === me; });
      return head(t('role.citizen'), t('my.title', { name: U.L(u.name) }), t('my.lede')) +
        (myAlerts.length ? '<section class="result bad" role="alert"><div class="result-head"><span class="chk-icon">' + BS.views._icon('fail') + '</span><div><h2>' +
          esc(t('my.alertTitle')) + '</h2><p>' + esc(t('my.alertD')) + '</p></div></div><ul class="alerts">' + myAlerts.map(function (a) {
            return '<li><span class="alert-type">' + esc(t('alertType.' + a.type)) + '</span><span>' + esc(BS.views._alertText(a)) + '</span><time>' + U.dateTime(a.time) + '</time></li>';
          }).join('') + '</ul></section>' : '') +
        '<h2 class="section-title">' + esc(t('my.plots')) + '</h2>' +
        '<div class="my-plots">' + mine.map(function (p) {
          const a = c.assessments[p.dag], s = c.derived[p.dag];
          return '<a class="panel my-plot lvl-' + a.level + '" href="#/check?dag=' + p.dag + '"><span class="my-plot-score">' + U.num(a.score) + '</span>' +
            '<span><strong>' + esc(t('common.dag')) + ' ' + U.num(p.dag) + ', ' + esc(U.L(D.location.mouza)) + '</strong><br>' +
            esc(t('my.youOwn', { area: U.area(s.deedOwners[me] || 0) })) + ' · ' + esc(t('level.' + a.level)) + '</span></a>';
        }).join('') + '</div>' +
        '<h2 class="section-title">' + esc(t('my.tax')) + '</h2>' +
        holdings.map(function (h) { return taxCard(h, true); }).join('') +
        '<h2 class="section-title">' + esc(t('my.deeds')) + '</h2>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>' + esc(t('deed.no')) + '</th><th>' + esc(t('common.dag')) + '</th><th>' + esc(t('my.role')) + '</th><th>' + esc(t('deed.area')) + '</th><th>' + esc(t('deed.price')) + '</th><th></th></tr></thead><tbody>' +
        myDeeds.map(function (b) {
          const d = b.payload;
          return '<tr><td>' + esc(d.deedNo) + '</td><td>' + U.num(d.dag) + '</td><td>' + esc(d.buyer === me ? t('my.bought') : t('my.sold')) + '</td><td>' + U.area(d.area) + '</td><td>' + U.money(d.price) + '</td>' +
            '<td><a href="#/deed?no=' + encodeURIComponent(d.deedNo) + '">' + esc(t('verify.openCert')) + '</a></td></tr>';
        }).join('') + '</tbody></table></div>';
    },
    mount: function () { mountPay(); }
  };

  function taxCard(h, canPay) {
    const st = E.holdingStatus(h, ctx().state.chain);
    const cur = E.currentFY();
    let body;
    if (st.exempt) body = '<p class="match ok">' + esc(t('tax.exempt')) + '</p>';
    else if (st.due > 0) body = '<p class="match bad">' + esc(st.dueYears === 1 ? t('tax.due1', { amount: U.money(st.due), fy: fy(cur) }) : t('tax.due', { years: U.num(st.dueYears), amount: U.money(st.due), from: fy(st.paidTo + 1), to: fy(cur) })) + '</p>' +
      (canPay ? '<div class="pay" data-holding="' + h.no + '"><fieldset class="radio"><legend>' + esc(t('tax.method')) + '</legend>' +
        ['bkash', 'nagad', 'card'].map(function (m, i) { return '<label><input type="radio" name="pm-' + h.no + '" value="' + m + '"' + (i ? '' : ' checked') + '> ' + esc(t('tax.m.' + m)) + '</label>'; }).join('') +
        '</fieldset><button class="btn primary" type="button" data-pay="' + h.no + '">' + esc(t('tax.pay', { amount: U.money(st.due) })) + '</button><p class="hint">' + esc(t('tax.demoPay')) + '</p></div>' : '');
    else body = '<p class="match ok">' + esc(t('tax.paid', { fy: fy(st.paidTo) })) + '</p>';
    const receipts = ctx().state.chain.filter(function (b) { return b.type === 'LD_TAX_PAID' && b.payload.holding === h.no; });
    return '<article class="panel tax-card"><header><h3>' + esc(t('tax.holding', { no: U.num(h.no) })) + '</h3><span class="muted">' +
      esc(t('common.dag')) + ' ' + h.dags.map(U.num).join(', ') + ' · ' + esc(U.person(h.owner)) + '</span></header>' + body +
      (receipts.length ? '<p>' + receipts.map(function (b) { return '<a href="#/receipt?no=' + b.payload.receiptNo + '">' + esc(t('tax.receipt', { no: b.payload.receiptNo })) + '</a>'; }).join(' · ') + '</p>' : '') +
      '</article>';
  }

  function mountPay() {
    document.querySelectorAll('[data-pay]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        btn.disabled = true;
        const h = D.holdings.find(function (x) { return x.no === btn.dataset.pay; });
        const st = E.holdingStatus(h, ctx().state.chain);
        const method = (document.querySelector('input[name="pm-' + h.no + '"]:checked') || {}).value || 'bkash';
        const no = BS.store.nextNo('receipt', 'LDT');
        await BS.store.append('LD_TAX_PAID', { receiptNo: no, holding: h.no, owner: h.owner, dags: h.dags, years: st.dueYears, fromFY: st.paidTo + 1, paidTo: E.currentFY(), amount: st.due, method: method, date: new Date().toISOString().slice(0, 10) });
        A.audit('tax.pay', no);
        await BS.app.refresh(); BS.app.refreshHeader();
        location.hash = '#/receipt?no=' + no;
        U.toast(t('tax.paidToast', { no: no }), 'ok');
      });
    });
  }

  /* ---------- LD tax receipt (দাখিলা) ---------- */

  V.receipt = {
    render: function (q) {
      const b = ctx().state.chain.find(function (x) { return x.type === 'LD_TAX_PAID' && x.payload.receiptNo === q.no; });
      if (!b) return head('', t('rcpt.notFound'), t('rcpt.notFoundD', { no: q.no || '' }));
      const p = b.payload;
      const url = U.baseUrl() + '#/receipt?no=' + encodeURIComponent(p.receiptNo);
      return '<article class="certificate receipt"><header><div class="cert-mark">' + BS.app.logo() + '</div><div><p>' + esc(t('rcpt.issuer')) + '</p><h1>' + esc(t('rcpt.title')) + '</h1></div></header>' +
        '<div class="cert-body"><dl class="facts">' +
          '<dt>' + esc(t('rcpt.no')) + '</dt><dd>' + esc(p.receiptNo) + '</dd>' +
          '<dt>' + esc(t('rcpt.holding')) + '</dt><dd>' + U.num(p.holding) + '</dd>' +
          '<dt>' + esc(t('rcpt.owner')) + '</dt><dd>' + esc(U.person(p.owner)) + '</dd>' +
          '<dt>' + esc(t('common.dag')) + '</dt><dd>' + p.dags.map(U.num).join(', ') + ', ' + esc(U.L(D.location.mouza)) + '</dd>' +
          '<dt>' + esc(t('rcpt.period')) + '</dt><dd>' + fy(p.fromFY) + ' — ' + fy(p.paidTo) + '</dd>' +
          '<dt>' + esc(t('rcpt.amount')) + '</dt><dd><strong>' + U.money(p.amount) + '</strong></dd>' +
          '<dt>' + esc(t('rcpt.method')) + '</dt><dd>' + esc(t('tax.m.' + p.method)) + '</dd>' +
          '<dt>' + esc(t('deed.date')) + '</dt><dd>' + U.date(p.date) + '</dd>' +
        '</dl><figure class="cert-qr">' + U.qr(url, 4) + '<figcaption>' + esc(t('cert.scan')) + '</figcaption></figure></div>' +
        '<footer><dl class="facts"><dt>' + esc(t('cert.block')) + '</dt><dd>#' + U.num(b.index) + '</dd><dt>' + esc(t('cert.hash')) + '</dt><dd class="hash">' + b.hash + '</dd></dl>' +
        '<p class="demo-note">' + esc(t('rcpt.demo')) + '</p></footer></article>' +
        (A.role() === 'citizen' ? '<a class="btn" href="#/myland">' + esc(t('rcpt.back')) + '</a>' : '');
    }
  };

  /* ---------- AC Land: tax desk ---------- */

  V.taxdesk = {
    render: function () {
      const chain = ctx().state.chain;
      const paid = chain.filter(function (b) { return b.type === 'LD_TAX_PAID'; });
      const collected = paid.reduce(function (n, b) { return n + b.payload.amount; }, 0);
      const dueTotal = D.holdings.reduce(function (n, h) { return n + E.holdingStatus(h, chain).due; }, 0);
      return head(t('role.acland'), t('desk.title'), t('desk.lede', { fy: fy(E.currentFY()) })) +
        '<section class="register-strip three">' +
          stat(t('desk.holdings'), U.num(D.holdings.length)) + stat(t('desk.collected'), U.money(collected), 'ok') + stat(t('desk.outstanding'), U.money(dueTotal), dueTotal ? 'bad' : '') +
        '</section>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>' + esc(t('rcpt.holding')) + '</th><th>' + esc(t('rcpt.owner')) + '</th><th>' + esc(t('common.dag')) + '</th><th>' + esc(t('desk.status')) + '</th><th class="num">' + esc(t('desk.due')) + '</th></tr></thead><tbody>' +
        D.holdings.map(function (h) {
          const st = E.holdingStatus(h, chain);
          const status = st.exempt ? t('desk.exempt') : st.due ? t('desk.dueYears', { n: U.num(st.dueYears) }) : t('desk.upToDate');
          return '<tr><td>' + U.num(h.no) + '</td><td>' + esc(U.person(h.owner)) + '</td><td>' + h.dags.map(U.num).join(', ') + '</td><td class="' + (st.due ? 'bad' : '') + '">' + esc(status) + '</td><td class="num">' + (st.due ? U.money(st.due) : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="note">' + esc(t('desk.note')) + '</p>';
    }
  };
  function stat(label, value, tone) {
    return '<div class="stat ' + (tone || '') + '"><span class="stat-value">' + esc(value) + '</span><span class="stat-label">' + esc(label) + '</span></div>';
  }

  /* ---------- Digitization (OCR) ---------- */

  let dg = null; // working state of the current document
  const SAMPLES = [
    { file: 'samples/khatian-kashful-bs-312-printed.png', key: 'printed' },
    { file: 'samples/deed-kashful-377-2021-typed.png', key: 'deed' },
    { file: 'samples/khatian-kashful-sa-89-handwritten.png', key: 'hand' }
  ];

  V.digitize = {
    render: function () {
      const st = ctx().state;
      const step = !dg ? 1 : dg.parsed ? 3 : dg.busy ? 2 : 1;
      return head(t('role.survey'), t('dg.title'), t('dg.lede')) +
        '<ol class="stepper wide">' + [1, 2, 3, 4].map(function (i) {
          return '<li class="' + (i < step ? 'done' : i === step ? 'now' : '') + '">' + esc(t('dg.s' + i)) + '</li>';
        }).join('') + '</ol>' +
        '<section class="panel"><h2>' + esc(t('dg.upload')) + '</h2>' +
          '<div class="dg-upload"><label class="drop" for="dg-file"><span>' + esc(t('dg.choose')) + '</span><input type="file" id="dg-file" accept="image/*"></label>' +
          '<div><p class="hint">' + esc(t('dg.samples')) + '</p><div class="presets">' + SAMPLES.map(function (s) {
            return '<button type="button" class="chip" data-sample="' + s.file + '">' + esc(t('dg.sample.' + s.key)) + '</button>';
          }).join('') + '</div><p class="hint">' + esc(t('dg.privacy')) + '</p></div></div>' +
          '<div id="dg-work">' + workArea() + '</div>' +
        '</section>' +
        '<h2 class="section-title">' + esc(t('dg.saved')) + ' (' + U.num((st.digitized || []).length) + ')</h2>' + savedList();
    },
    mount: mountDigitize
  };

  function savedList() {
    const list = ctx().state.digitized || [];
    if (!list.length) return '<p class="empty">' + esc(t('dg.noneSaved')) + '</p>';
    return '<div class="table-wrap"><table class="table"><thead><tr><th>' + esc(t('dg.id')) + '</th><th>' + esc(t('dg.kind')) + '</th><th>' + esc(t('kd.mouza')) + '</th><th>' + esc(t('dg.ref')) + '</th><th>' + esc(t('dg.by')) + '</th><th>' + esc(t('mut.block')) + '</th></tr></thead><tbody>' +
      list.map(function (r) {
        return '<tr><td><a href="#/record?id=' + r.id + '">' + esc(r.id) + '</a></td><td>' + esc(t('dg.kind.' + r.kind)) + '</td><td>' + esc(r.mouza) + '</td><td>' +
          esc(r.kind === 'deed' ? r.deedNo : P.surveyName(r.survey) + ' ' + U.num(r.khatianNo)) + '</td><td>' + esc(r.verifiedBy) + '</td><td>#' + U.num(r.block) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function confChip(c, guessed) {
    if (c === undefined) return '<span class="conf none">' + esc(t('dg.notFound')) + '</span>';
    const tone = guessed ? 'low' : c >= 85 ? 'high' : c >= 70 ? 'mid' : 'low';
    return '<span class="conf ' + tone + '">' + esc(guessed ? t('dg.guessed') : t('dg.conf', { n: U.num(c) })) + '</span>';
  }

  function workArea() {
    if (!dg) return '';
    let html = '<div class="dg-grid"><figure class="dg-scan"><img src="' + dg.src + '" alt="' + esc(t('dg.scanAlt')) + '"><figcaption>' + esc(dg.name) + '</figcaption></figure><div class="dg-side">';
    if (!dg.parsed) {
      html += dg.busy
        ? '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(dg.progress * 100) + '"><span style="width:' + Math.round(dg.progress * 100) + '%"></span></div><p class="hint">' + esc(dg.status || t('dg.loading')) + '</p>'
        : (dg.error ? '<p class="match bad">' + esc(dg.error) + '</p>' : '') + '<button class="btn primary big" type="button" id="dg-run">' + esc(t('dg.run')) + '</button><p class="hint">' + esc(t('dg.runHint')) + '</p>';
      return html + '</div></div>';
    }
    return html + reviewForm() + '</div></div>';
  }

  function fieldInput(key, label, value, conf, guessed) {
    return '<label class="field dg-field"><span>' + esc(label) + ' ' + confChip(conf, guessed) + '</span><input data-f="' + key + '" value="' + esc(value || '') + '"></label>';
  }

  function reviewForm() {
    const p = dg.parsed, r = dg.rec;
    const c = function (k) { return p[k] ? p[k].conf : undefined; };
    let h = '<p class="match ' + (dg.ocrConf >= 80 ? 'ok' : 'bad') + '">' + esc(t('dg.read', { n: U.num(dg.ocrConf), kind: t('dg.kind.' + r.kind) })) + '</p>' +
      '<form id="dg-form" class="form">' +
      '<div class="row3">' + fieldInput('district', t('kd.district'), r.district, c('district')) + fieldInput('upazila', t('kd.upazila'), r.upazila, c('upazila')) + fieldInput('mouza', t('kd.mouza'), r.mouza, c('mouza')) + '</div>' +
      '<div class="row3">' + fieldInput('jl', t('kd.jl'), r.jl, c('jl')) + fieldInput('survey', t('dg.survey'), r.survey, c('survey'), p.survey && p.survey.guessed) + fieldInput('khatianNo', t('kd.khatianNo'), r.khatianNo, c('khatianNo')) + '</div>';
    if (r.kind === 'khatian') {
      h += '<div class="row3">' + fieldInput('year', t('kd.year'), r.year, c('year')) + fieldInput('totalArea', t('kd.totalArea') + ' (' + t('unit.acre') + ')', r.totalArea, c('totalArea')) + '</div>' +
        '<h3>' + esc(t('kd.ownerCol')) + '</h3><div class="table-wrap"><table class="table edit"><thead><tr><th>' + esc(t('dg.name')) + '</th><th>' + esc(t('dg.guardian')) + '</th><th>' + esc(t('kd.village')) + '</th><th>' + esc(t('kd.share')) + '</th><th></th></tr></thead><tbody>' +
        r.owners.map(function (o, i) {
          const conf = p.owners[i] ? p.owners[i].conf : undefined;
          return '<tr><td><input data-o="' + i + '.name" value="' + esc(o.name) + '" aria-label="' + esc(t('dg.name')) + '"></td><td><input data-o="' + i + '.guardian" value="' + esc(o.guardian) + '" aria-label="' + esc(t('dg.guardian')) + '"></td>' +
            '<td><input data-o="' + i + '.address" value="' + esc(o.address) + '" aria-label="' + esc(t('kd.village')) + '"></td><td><input data-o="' + i + '.share" value="' + esc(o.share) + '" class="short" aria-label="' + esc(t('kd.share')) + '"></td><td>' + confChip(conf) + '</td></tr>';
        }).join('') + '</tbody></table></div><button type="button" class="btn small" data-add="owner">' + esc(t('dg.addOwner')) + '</button>' +
        '<h3>' + esc(t('dg.landRows')) + '</h3><div class="table-wrap"><table class="table edit"><thead><tr><th>' + esc(t('kd.dag')) + '</th><th>' + esc(t('kd.class')) + '</th><th>' + esc(t('kd.total')) + '</th><th>' + esc(t('kd.share')) + '</th><th>' + esc(t('kd.area')) + '</th><th></th></tr></thead><tbody>' +
        r.rows.map(function (x, i) {
          const conf = p.rows[i] ? p.rows[i].conf : undefined;
          return '<tr>' + ['dag', 'cls', 'total', 'share', 'area'].map(function (k) {
            return '<td><input data-r="' + i + '.' + k + '" value="' + esc(x[k]) + '" class="short" aria-label="' + esc(t(k === 'dag' ? 'kd.dag' : k === 'cls' ? 'kd.class' : k === 'total' ? 'kd.total' : k === 'share' ? 'kd.share' : 'kd.area')) + '"></td>';
          }).join('') + '<td>' + confChip(conf) + '</td></tr>';
        }).join('') + '</tbody></table></div><button type="button" class="btn small" data-add="row">' + esc(t('dg.addRow')) + '</button>';
    } else {
      h += '<div class="row3">' + fieldInput('deedNo', t('deed.no'), r.deedNo, c('deedNo')) + fieldInput('date', t('deed.date'), r.date, c('date')) + fieldInput('office', t('deed.office'), r.office, c('office')) + '</div>' +
        '<div class="row2">' + fieldInput('giver.name', t('deed.seller'), r.giver.name, p.giver && p.giver.conf) + fieldInput('giver.guardian', t('dg.guardian'), r.giver.guardian, p.giver && p.giver.conf) + '</div>' +
        '<div class="row2">' + fieldInput('taker.name', t('deed.buyer'), r.taker.name, p.taker && p.taker.conf) + fieldInput('taker.guardian', t('dg.guardian'), r.taker.guardian, p.taker && p.taker.conf) + '</div>' +
        '<div class="row3">' + fieldInput('dag', t('kd.dag'), r.dag, c('dag')) + fieldInput('area', t('deed.area') + ' (' + t('unit.acre') + ')', r.area, c('area')) + fieldInput('price', t('deed.price') + ' (৳)', r.price, c('price')) + '</div>';
    }
    h += '<div id="dg-checks" aria-live="polite">' + checksHtml() + '</div>' +
      '<details class="raw"><summary>' + esc(t('dg.raw')) + '</summary><pre>' + esc(dg.text) + '</pre></details>' +
      '<div class="actions"><button class="btn primary" type="submit">' + esc(t('dg.save')) + '</button><button class="btn" type="button" id="dg-reset">' + esc(t('dg.discard')) + '</button></div>' +
      '<p class="hint">' + esc(t('dg.saveHint')) + '</p></form>';
    return h;
  }

  // Number checks + cross-checks against records already digitized.
  function checksHtml() {
    const r = dg.rec;
    const issues = BS.ocr.validate(r).map(function (i) { return { status: 'warn', text: t('val.' + i.key, Object.assign({}, i.vars, i.vars && i.vars.field ? { field: t('val.f.' + i.vars.field) } : {})) }; });
    const cross = [];
    if (r.kind === 'deed' && r.khatianNo) {
      const k = (ctx().state.digitized || []).find(function (x) { return x.kind === 'khatian' && x.khatianNo === r.khatianNo && x.mouza === r.mouza; });
      if (!k) cross.push({ status: 'warn', text: t('xc.noKhatian', { no: r.khatianNo }) });
      else {
        const row = k.rows.find(function (x) { return x.dag === r.dag; });
        const owner = k.owners.find(function (o) { return o.name === r.giver.name; });
        cross.push({ status: row ? 'pass' : 'fail', text: row ? t('xc.dagOk', { dag: r.dag, no: k.khatianNo }) : t('xc.dagBad', { dag: r.dag, no: k.khatianNo }) });
        cross.push({ status: owner ? 'pass' : 'fail', text: owner ? t('xc.ownerOk', { name: r.giver.name }) : t('xc.ownerBad', { name: r.giver.name }) });
        if (row && owner) {
          const max = (parseFloat(row.total) || 0) * (parseFloat(owner.share) || 0);
          const ok = parseFloat(r.area) <= max + 0.0001;
          cross.push({ status: ok ? 'pass' : 'fail', text: ok ? t('xc.areaOk', { max: max.toFixed(4) }) : t('xc.areaBad', { area: r.area, max: max.toFixed(4) }) });
        }
      }
    }
    const all = issues.concat(cross);
    if (!all.length) return '<p class="match ok">' + esc(t('val.allGood')) + '</p>';
    return '<h3>' + esc(t('val.title')) + '</h3><ol class="checks">' + all.map(function (c, i) {
      return '<li class="chk ' + c.status + '" style="--i:' + i + '"><span class="chk-icon">' + BS.views._icon(c.status) + '</span><span>' + esc(c.text) + '</span></li>';
    }).join('') + '</ol>';
  }

  function fromParsed(p) {
    const v = function (k) { return p[k] ? p[k].value : ''; };
    const rec = { kind: v('kind') || 'khatian', district: v('district'), upazila: v('upazila'), mouza: v('mouza'), jl: v('jl'), survey: v('survey'), khatianNo: v('khatianNo') };
    if (rec.kind === 'khatian') {
      rec.year = v('year'); rec.totalArea = v('totalArea');
      rec.owners = (p.owners || []).map(function (o) { return Object.assign({}, o.value); });
      rec.rows = (p.rows || []).map(function (x) { return Object.assign({}, x.value); });
      if (!rec.owners.length) rec.owners.push({ name: '', guardian: '', rel: 'father', address: '', share: '' });
      if (!rec.rows.length) rec.rows.push({ dag: '', cls: '', total: '', share: '', area: '' });
    } else {
      rec.deedNo = v('deedNo'); rec.date = v('date'); rec.office = v('office'); rec.price = v('price'); rec.dag = v('dag'); rec.area = v('area');
      rec.giver = p.giver ? Object.assign({}, p.giver.value) : { name: '', guardian: '' };
      rec.taker = p.taker ? Object.assign({}, p.taker.value) : { name: '', guardian: '' };
    }
    return rec;
  }

  async function loadImage(src, name, blob) {
    const bytes = blob ? await blob.arrayBuffer() : await (await fetch(src)).arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    dg = { src: src, name: name, scanHash: Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''), progress: 0 };
    BS.app.render();
  }

  function mountDigitize() {
    const file = document.getElementById('dg-file');
    file.addEventListener('change', function () {
      const f = file.files[0]; if (!f) return;
      loadImage(URL.createObjectURL(f), f.name, f);
    });
    document.querySelectorAll('[data-sample]').forEach(function (b) {
      b.addEventListener('click', function () { loadImage(b.dataset.sample, b.dataset.sample.split('/').pop()); });
    });
    const run = document.getElementById('dg-run');
    if (run) run.addEventListener('click', async function () {
      dg.busy = true; dg.error = ''; BS.app.render();
      try {
        const res = await BS.ocr.recognize(dg.src, function (m) {
          const key = 'dg.ocr.' + (m.status || '').replace(/[^a-z]/g, ''); const tr = t(key); dg.status = tr === key ? m.status : tr;
          if (typeof m.progress === 'number') dg.progress = m.status === 'recognizing text' ? 0.3 + m.progress * 0.7 : m.progress * 0.3;
          const bar = document.querySelector('.progress span'); if (bar) bar.style.width = Math.round(dg.progress * 100) + '%';
          const hint = document.querySelector('.dg-side .hint'); if (hint) hint.textContent = dg.status;
        });
        dg.text = res.text; dg.ocrConf = res.confidence;
        dg.parsed = BS.ocr.parse(res);
        dg.rec = fromParsed(dg.parsed);
        dg.busy = false;
        A.audit('digitize.ocr', dg.name);
      } catch (e) {
        dg.busy = false; dg.error = t('dg.fail');
      }
      BS.app.render();
    });
    const form = document.getElementById('dg-form');
    if (!form) return;
    const setPath = function (obj, path, val) {
      const parts = path.split('.'); let o = obj;
      for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
      o[parts[parts.length - 1]] = val;
    };
    form.addEventListener('input', function (e) {
      const el = e.target;
      if (el.dataset.f) setPath(dg.rec, el.dataset.f, el.value.trim());
      if (el.dataset.o) setPath(dg.rec.owners, el.dataset.o, el.value.trim());
      if (el.dataset.r) setPath(dg.rec.rows, el.dataset.r, el.value.trim());
      document.getElementById('dg-checks').innerHTML = checksHtml();
    });
    form.querySelectorAll('[data-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.add === 'owner') dg.rec.owners.push({ name: '', guardian: '', rel: 'father', address: '', share: '' });
        else dg.rec.rows.push({ dag: '', cls: '', total: '', share: '', area: '' });
        BS.app.render();
      });
    });
    document.getElementById('dg-reset').addEventListener('click', function () { dg = null; BS.app.render(); });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const r = dg.rec;
      const missing = BS.ocr.validate(r).filter(function (i) { return i.key === 'missing'; });
      if (missing.length) { U.toast(t('dg.fillMissing'), 'bad'); return; }
      const st = ctx().state;
      st.digitized = st.digitized || [];
      const id = 'DG-' + String((st.counters.digit = (st.counters.digit || 0) + 1)).padStart(4, '0');
      const mz = D.mouzas.find(function (m) { return m.name.bn === r.mouza || m.name.en.toLowerCase() === String(r.mouza).toLowerCase(); });
      const record = Object.assign({ id: id, mouzaId: mz ? mz.id : 'other' }, JSON.parse(JSON.stringify(r)));
      record.source = { file: dg.name, scanHash: dg.scanHash, ocrConfidence: dg.ocrConf };
      record.verifiedBy = A.user().u; record.verifiedAt = new Date().toISOString();
      const recordHash = await BS.crypto.hashObject(record);
      const b = await BS.store.append('DIGITIZED_RECORD', { id: id, kind: r.kind, mouza: r.mouza, ref: r.kind === 'deed' ? r.deedNo : r.survey + '-' + r.khatianNo, recordHash: recordHash, scanHash: dg.scanHash, by: A.user().u });
      record.block = b.index;
      record.thumb = await thumbnail(dg.src);
      st.digitized.unshift(record);
      BS.store.saveQueue();
      A.audit('digitize.save', id);
      dg = null;
      await BS.app.refresh(); BS.app.refreshHeader();
      location.hash = '#/record?id=' + id;
      U.toast(t('dg.saved.toast', { id: id, index: U.num(b.index) }), 'ok');
    });
  }

  // Small JPEG copy of the scan for the record page (keeps storage small).
  function thumbnail(src) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.onload = function () {
        const w = Math.min(900, img.naturalWidth), h = Math.round(img.naturalHeight * w / img.naturalWidth);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        try { resolve(c.toDataURL('image/jpeg', 0.72)); } catch (e) { resolve(''); }
      };
      img.onerror = function () { resolve(''); };
      img.src = src;
    });
  }

  /* ---------- A digitized record ---------- */

  V.record = {
    render: function (q) {
      const r = (ctx().state.digitized || []).find(function (x) { return x.id === q.id; });
      if (!r) return head('', t('rec.notFound'), '');
      const b = ctx().state.chain[r.block];
      const showScan = A.see('scannedOriginal');
      let doc;
      if (r.kind === 'khatian') doc = P.khatianDoc(r, { badge: { tone: 'ok', text: t('rec.digitized') } });
      else doc = deedDoc(r);
      return head(t('rec.kicker'), t('rec.title', { id: r.id }), t('rec.lede', { by: r.verifiedBy, when: U.dateTime(r.verifiedAt) })) +
        '<div id="rec-integrity" aria-live="polite"><p class="match">' + esc(t('rec.checking')) + '</p></div>' +
        '<div class="rec-grid">' + doc +
        (showScan && r.thumb ? '<figure class="dg-scan"><img src="' + r.thumb + '" alt="' + esc(t('dg.scanAlt')) + '"><figcaption>' + esc(t('rec.original', { file: r.source.file })) + '</figcaption></figure>'
          : '<p class="empty">' + esc(t('rec.scanHidden')) + '</p>') + '</div>' +
        '<section class="panel"><h2>' + esc(t('rec.proof')) + '</h2><dl class="facts">' +
          '<dt>' + esc(t('cert.block')) + '</dt><dd>#' + U.num(r.block) + (b ? ', ' + U.dateTime(b.timestamp) : '') + '</dd>' +
          '<dt>' + esc(t('rec.recordHash')) + '</dt><dd class="hash">' + esc(b ? b.payload.recordHash : '') + '</dd>' +
          '<dt>' + esc(t('rec.scanHash')) + '</dt><dd class="hash">' + esc(r.source.scanHash) + '</dd>' +
          '<dt>' + esc(t('rec.ocr')) + '</dt><dd>' + U.num(r.source.ocrConfidence) + '%</dd>' +
        '</dl><p class="hint">' + esc(t('rec.why')) + '</p></section>' +
        '<div class="actions"><a class="btn" href="#/check?mouza=' + r.mouzaId + '&' + (r.kind === 'deed' ? 'dagq=' + r.dag : 'kh=' + r.khatianNo) + '">' + esc(t('rec.search')) + '</a>' +
        (A.canOpen('digitize') ? '<a class="btn primary" href="#/digitize">' + esc(t('rec.next')) + '</a>' : '') + '</div>';
    },
    mount: async function (q) {
      const r = (ctx().state.digitized || []).find(function (x) { return x.id === q.id; });
      if (!r) return;
      const b = ctx().state.chain[r.block];
      const copy = Object.assign({}, r); delete copy.block; delete copy.thumb;
      const h = await BS.crypto.hashObject(copy);
      const ok = b && b.payload.recordHash === h && ctx().integrity.ok;
      const el = document.getElementById('rec-integrity');
      if (el) el.innerHTML = '<p class="match ' + (ok ? 'ok' : 'bad') + '">' + esc(ok ? t('rec.intact') : t('rec.changed')) + '</p>';
    }
  };

  function deedDoc(r) {
    return '<article class="khatian-doc"><header><h3>' + esc(t('rec.deedTitle')) + '</h3><span class="badge ok">' + esc(t('rec.digitized')) + '</span></header>' +
      '<dl class="facts">' +
        '<dt>' + esc(t('deed.no')) + '</dt><dd>' + U.num(esc(r.deedNo)) + '</dd>' +
        '<dt>' + esc(t('deed.date')) + '</dt><dd>' + U.num(esc(r.date)) + '</dd>' +
        '<dt>' + esc(t('deed.office')) + '</dt><dd>' + esc(r.office) + '</dd>' +
        '<dt>' + esc(t('deed.seller')) + '</dt><dd>' + esc(r.giver.name) + (r.giver.guardian ? ', ' + esc(t('kd.father')) + ': ' + esc(r.giver.guardian) : '') + '</dd>' +
        '<dt>' + esc(t('deed.buyer')) + '</dt><dd>' + esc(r.taker.name) + (r.taker.guardian ? ', ' + esc(t('kd.father')) + ': ' + esc(r.taker.guardian) : '') + '</dd>' +
        '<dt>' + esc(t('deed.price')) + '</dt><dd>' + (A.see('dealPrice') ? '৳ ' + U.num(esc(r.price)) : '<span class="locked">' + esc(t('mask.hidden')) + '</span>') + '</dd>' +
        '<dt>' + esc(t('rec.schedule')) + '</dt><dd>' + esc(t('kd.mouza')) + ' ' + esc(r.mouza) + ', ' + esc(t('kd.jl')) + ' ' + U.num(esc(r.jl)) + ', ' + esc(t('kd.khatianNo')) + ' ' + U.num(esc(r.khatianNo)) + ', ' + esc(t('kd.dag')) + ' ' + U.num(esc(r.dag)) + ', ' + U.num(esc(r.area)) + ' ' + esc(t('unit.acre')) + '</dd>' +
      '</dl></article>';
  }
  BS.parts.deedDoc = deedDoc;

  /* ---------- Admin dashboard ---------- */

  V.dashboard = {
    render: function () {
      const c = ctx(), st = c.state;
      const count = function (type) { return st.chain.filter(function (b) { return b.type === type; }).length; };
      const pending = st.mutationQueue.filter(function (q) { return q.status === 'pending'; }).length;
      const collected = st.chain.filter(function (b) { return b.type === 'LD_TAX_PAID'; }).reduce(function (n, b) { return n + b.payload.amount; }, 0);
      const byType = {};
      st.alerts.forEach(function (a) { byType[a.type] = (byType[a.type] || 0) + 1; });
      const maxT = Math.max(1, Math.max.apply(null, Object.values(byType).concat([1])));
      return head(t('role.admin'), t('dash.title'), t('dash.lede')) +
        '<section class="register-strip">' +
          stat(c.integrity.ok ? t('home.statIntact') : t('home.statBroken'), U.num(st.chain.length) + ' ' + t('home.blocks'), c.integrity.ok ? 'ok' : 'bad') +
          stat(t('home.statDeeds'), U.num(count('DEED_REGISTERED'))) +
          stat(t('dash.digitized'), U.num((st.digitized || []).length)) +
          stat(t('home.statBlocked'), U.num(st.alerts.length), st.alerts.length ? 'bad' : '') +
        '</section>' +
        '<section class="register-strip">' +
          stat(t('home.statPending'), U.num(pending)) +
          stat(t('dash.mutations'), U.num(count('MUTATION_APPROVED'))) +
          stat(t('dash.mortgages'), U.num(count('MORTGAGE_CREATED') - count('MORTGAGE_RELEASED'))) +
          stat(t('desk.collected'), U.money(collected), 'ok') +
        '</section>' +
        '<div class="two-col"><section class="panel"><h2>' + esc(t('dash.fraudByType')) + '</h2>' +
          (Object.keys(byType).length ? '<ul class="bars">' + Object.keys(byType).map(function (k) {
            return '<li><span class="bar-label">' + esc(t('alertType.' + k)) + '</span><span class="bar"><span style="width:' + Math.round(byType[k] / maxT * 100) + '%"></span></span><span class="bar-n">' + U.num(byType[k]) + '</span></li>';
          }).join('') + '</ul>' : '<p class="empty">' + esc(t('home.noAlerts')) + '</p>') +
        '</section><section class="panel"><h2>' + esc(t('dash.recentAudit')) + '</h2>' + auditTable((st.audit || []).slice(0, 8)) +
          '<a href="#/audit">' + esc(t('dash.allAudit')) + '</a></section></div>' +
        '<section class="panel"><h2>' + esc(t('dash.links')) + '</h2><div class="tiles">' +
          [['register', 'stamp'], ['mutation', 'doc'], ['taxdesk', 'coin'], ['bank', 'bank'], ['digitize', 'scan'], ['khatian', 'doc'], ['ledger', 'shield'], ['access', 'user']].map(function (x) {
            return '<a class="tile" href="#/' + x[0] + '"><span class="tile-icon">' + P.ICONS[x[1]] + '</span><span>' + esc(t('nav.' + x[0])) + '</span></a>';
          }).join('') + '</div></section>';
    }
  };

  function auditTable(rows) {
    if (!rows.length) return '<p class="empty">' + esc(t('audit.none')) + '</p>';
    return '<div class="table-wrap"><table class="table"><thead><tr><th>' + esc(t('audit.time')) + '</th><th>' + esc(t('audit.user')) + '</th><th>' + esc(t('audit.action')) + '</th><th>' + esc(t('audit.target')) + '</th></tr></thead><tbody>' +
      rows.map(function (a) {
        return '<tr><td>' + U.dateTime(a.time) + '</td><td>' + esc(a.user) + ' <small class="muted">(' + esc(t('role.' + a.role)) + ')</small></td><td>' + esc(t('act.' + a.action)) + '</td><td>' + esc(a.target) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  V.audit = {
    render: function () {
      return head(t('role.admin'), t('audit.title'), t('audit.lede')) + auditTable(ctx().state.audit || []);
    }
  };

  /* ---------- Access policy (public, for transparency) ---------- */

  V.access = {
    render: function () {
      const items = Object.keys(A.POLICY);
      const mark = { full: ['ok', t('pol.full')], own: ['mid', t('pol.own')], masked: ['mid', t('pol.masked')], none: ['no', t('pol.none')] };
      return head('', t('pol.title'), t('pol.lede')) +
        '<div class="table-wrap"><table class="table policy"><thead><tr><th>' + esc(t('pol.item')) + '</th>' + A.ROLES.map(function (r) { return '<th>' + esc(t('role.' + r)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        items.map(function (it) {
          return '<tr><th scope="row">' + esc(t('pol.i.' + it)) + '<small>' + esc(t('pol.w.' + it)) + '</small></th>' + A.ROLES.map(function (r) {
            const v = A.POLICY[it][r]; return '<td><span class="pol ' + mark[v][0] + '">' + esc(mark[v][1]) + '</span></td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' +
        '<section class="panel prose"><h2>' + esc(t('pol.principles')) + '</h2><ul>' +
          [1, 2, 3, 4, 5].map(function (i) { return '<li>' + esc(t('pol.p' + i)) + '</li>'; }).join('') + '</ul></section>';
    }
  };
})();
