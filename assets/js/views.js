/*
 * views.js — every screen of the app.
 * Each view has render(params) -> HTML string, and optional mount(params)
 * to attach click/submit handlers after the HTML is on the page.
 */
window.BS = window.BS || {};

BS.views = (function () {
  const U = BS.ui, E = BS.engine, D = BS.DATA;
  const t = U.t, esc = U.esc;
  function ctx() { return BS.app.ctx; }

  /* ---------- shared pieces ---------- */

  function levelOf(dag) { return ctx().assessments[dag].level; }

  function mouzaMap(selected) {
    const plots = D.plots.map(function (p) {
      const pts = p.shape.split(' ').map(function (s) { return s.split(',').map(Number); });
      const cx = pts.reduce(function (a, q) { return a + q[0]; }, 0) / pts.length;
      const cy = pts.reduce(function (a, q) { return a + q[1]; }, 0) / pts.length;
      const lvl = levelOf(p.dag);
      return '<a href="#/check?dag=' + p.dag + '" class="plot-link" aria-label="' + esc(t('map.plotAria', { dag: U.num(p.dag), level: t('level.' + lvl) })) + '">' +
        '<polygon points="' + p.shape + '" class="plot lvl-' + lvl + (selected === p.dag ? ' selected' : '') + '"/>' +
        '<text x="' + cx + '" y="' + (cy - 4) + '" class="plot-no">' + U.num(p.dag) + '</text>' +
        '<text x="' + cx + '" y="' + (cy + 14) + '" class="plot-area">' + U.area(p.area) + '</text></a>';
    }).join('');
    const others = D.otherShapes.map(function (s) { return '<polygon points="' + s + '" class="plot other"/>'; }).join('');
    return '<svg class="mouza-map" viewBox="0 0 640 420" role="img" aria-label="' + esc(t('map.aria')) + '">' +
      '<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" class="hatch-line"/></pattern></defs>' +
      '<path d="M20,16 L620,20 L626,404 L18,410 Z" class="mouza-edge"/>' +
      '<path d="M30,152 L612,148 L612,178 L30,184 Z" class="road"/>' +
      '<text x="560" y="168" class="road-label">' + esc(t('map.road')) + '</text>' +
      others + plots +
      '<path d="M18,400 C150,392 260,412 380,398 S560,392 626,398" class="canal"/>' +
      '<text x="28" y="34" class="map-north">' + esc(t('map.north')) + ' ↑</text>' +
      '</svg>';
  }

  function legend() {
    return '<ul class="legend">' + ['safe', 'caution', 'danger'].map(function (l) {
      return '<li><span class="swatch lvl-' + l + '"></span>' + esc(t('level.' + l)) + '</li>';
    }).join('') + '<li><span class="swatch other"></span>' + esc(t('map.notInDemo')) + '</li></ul>';
  }

  function plotOptions(selected) {
    return D.plots.map(function (p) {
      return '<option value="' + p.dag + '"' + (p.dag === selected ? ' selected' : '') + '>' +
        esc(t('common.dag')) + ' ' + U.num(p.dag) + ' — ' + esc(U.L(p.landClass)) + '</option>';
    }).join('');
  }

  function personOptions(selected, dag, mapKey) {
    const owners = dag ? ctx().derived[dag][mapKey || 'deedOwners'] : {};
    return Object.keys(D.persons).filter(function (id) { return id !== 'GOV'; }).map(function (id) {
      const mark = owners[id] ? ' — ' + t('common.currentOwner') : '';
      return '<option value="' + id + '"' + (id === selected ? ' selected' : '') + '>' + esc(U.person(id) + mark) + '</option>';
    }).join('');
  }

  const ICON = {
    pass: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7"/></svg>',
    warn: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5v6M10 14.5v.5"/></svg>',
    fail: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8"/></svg>'
  };

  // Human text for one automatic check.
  function checkText(c) {
    const d = c.data || {};
    const vars = {
      held: U.area(d.held || 0),
      ref: d.ref ? U.L(d.ref) : (d.no ? U.L(d.no) : (d.ref === undefined && d.deedNo ? d.deedNo : '')),
      project: d.project ? U.L(d.project) : '',
      count: U.num(d.count || 0)
    };
    if (c.key === 'doubleSale' && d.prior) {
      vars.deed = d.prior.deedNo; vars.date = U.date(d.prior.date); vars.buyer = U.person(d.prior.buyer);
    }
    if ((c.key === 'mortgage' || c.key === 'doubleMortgage') && d.bank) {
      vars.bank = U.bank(d.bank); vars.ref = d.ref; vars.amount = U.money(d.amount);
    }
    if (c.key === 'case' && d.no) vars.ref = U.L(d.no);
    return t('chk.' + c.key + '.' + c.status, vars);
  }

  function checkList(checks) {
    return '<ol class="checks">' + checks.map(function (c, i) {
      return '<li class="chk ' + c.status + '" style="--i:' + i + '"><span class="chk-icon">' + ICON[c.status] + '</span>' +
        '<span>' + esc(checkText(c)) + '</span></li>';
    }).join('') + '</ol>';
  }

  function blockSummary(b) {
    const p = b.payload || {};
    switch (b.type) {
      case 'GENESIS': return t('blk.genesis');
      case 'KHATIAN_BATCH_ANCHORED': return t('blk.anchor', { n: U.num(Object.keys(p.records || {}).length) });
      case 'DEED_REGISTERED': return t('blk.deed', { no: p.deedNo, dag: U.num(p.dag), from: U.person(p.seller), to: U.person(p.buyer), area: U.area(p.area) });
      case 'MUTATION_APPROVED': return t('blk.mutation', { no: p.caseNo, dag: U.num(p.dag), to: U.person(p.to), area: U.area(p.area) });
      case 'MORTGAGE_CREATED': return t('blk.mortgage', { ref: p.ref, dag: U.num(p.dag), bank: U.bank(p.bank), amount: U.money(p.amount) });
      case 'MORTGAGE_RELEASED': return t('blk.release', { ref: p.ref, dag: U.num(p.dag) });
      default: return b.type;
    }
  }

  function alertText(a) {
    const d = a.detail || {};
    return t('alert.' + a.type, {
      dag: U.num(a.dag), seller: U.person(d.seller), buyer: U.person(d.buyer), owner: U.person(d.owner),
      area: U.area(d.area || 0), deed: d.priorDeed || '', bank: d.bank ? U.bank(d.bank) : '', ref: d.ref || ''
    });
  }

  function emptyNote(text) { return '<p class="empty">' + esc(text) + '</p>'; }

  /* ---------- Overview ---------- */

  const home = {
    render: function () {
      const c = ctx();
      const deeds = c.state.chain.filter(function (b) { return b.type === 'DEED_REGISTERED'; }).length;
      const pending = c.state.mutationQueue.filter(function (q) { return q.status === 'pending'; }).length;
      const alerts = c.state.alerts.slice(0, 5);
      return '' +
        '<section class="hero">' +
          '<div class="hero-text">' +
            '<p class="kicker">' + esc(t('home.kicker')) + '</p>' +
            '<h1>' + esc(t('home.title')) + '</h1>' +
            '<p class="lede">' + esc(t('home.lede')) + '</p>' +
            '<div class="actions">' +
              '<a class="btn primary" href="#/check">' + esc(t('home.ctaCheck')) + '</a>' +
              '<a class="btn" href="#/verify">' + esc(t('home.ctaVerify')) + '</a>' +
            '</div>' +
          '</div>' +
          '<figure class="map-card">' + mouzaMap() +
            '<figcaption>' + esc(t('map.caption', { mouza: U.L(D.location.mouza), jl: U.num(D.location.jl) })) + '</figcaption>' + legend() +
          '</figure>' +
        '</section>' +
        '<section class="register-strip" aria-label="' + esc(t('home.statsAria')) + '">' +
          stat(c.integrity.ok ? t('home.statIntact') : t('home.statBroken'), U.num(c.state.chain.length) + ' ' + t('home.blocks'), c.integrity.ok ? 'ok' : 'bad') +
          stat(t('home.statDeeds'), U.num(deeds)) +
          stat(t('home.statBlocked'), U.num(c.state.alerts.length), c.state.alerts.length ? 'bad' : '') +
          stat(t('home.statPending'), U.num(pending)) +
        '</section>' +
        '<section class="two-col">' +
          '<div class="panel">' +
            '<h2>' + esc(t('home.alertsTitle')) + '</h2>' +
            (alerts.length ? '<ul class="alerts">' + alerts.map(function (a) {
              return '<li><a href="#/check?dag=' + a.dag + '"><span class="alert-type">' + esc(t('alertType.' + a.type)) + '</span>' +
                '<span>' + esc(alertText(a)) + '</span><time>' + U.dateTime(a.time) + '</time></a></li>';
            }).join('') + '</ul>' : emptyNote(t('home.noAlerts'))) +
          '</div>' +
          '<div class="panel">' +
            '<h2>' + esc(t('home.howTitle')) + '</h2>' +
            '<ol class="how">' +
              '<li><strong>' + esc(t('home.how1t')) + '</strong><span>' + esc(t('home.how1')) + '</span></li>' +
              '<li><strong>' + esc(t('home.how2t')) + '</strong><span>' + esc(t('home.how2')) + '</span></li>' +
              '<li><strong>' + esc(t('home.how3t')) + '</strong><span>' + esc(t('home.how3')) + '</span></li>' +
            '</ol>' +
            '<h3>' + esc(t('home.whoTitle')) + '</h3>' +
            '<ul class="who">' +
              '<li><a href="#/register">' + esc(t('nav.register')) + '</a><span>' + esc(t('home.whoSub')) + '</span></li>' +
              '<li><a href="#/mutation">' + esc(t('nav.mutation')) + '</a><span>' + esc(t('home.whoAc')) + '</span></li>' +
              '<li><a href="#/bank">' + esc(t('nav.bank')) + '</a><span>' + esc(t('home.whoBank')) + '</span></li>' +
              '<li><a href="#/check">' + esc(t('nav.check')) + '</a><span>' + esc(t('home.whoCitizen')) + '</span></li>' +
            '</ul>' +
          '</div>' +
        '</section>';
    }
  };
  function stat(label, value, tone) {
    return '<div class="stat ' + (tone || '') + '"><span class="stat-value">' + esc(value) + '</span><span class="stat-label">' + esc(label) + '</span></div>';
  }

  /* ---------- Check before you buy ---------- */

  const check = {
    render: function (q) {
      const dag = q.dag;
      const head = '<header class="page-head"><h1>' + esc(t('check.title')) + '</h1><p>' + esc(t('check.lede')) + '</p></header>';
      const picker = '<form class="picker" id="check-form"><label for="dag-select">' + esc(t('check.pick')) + '</label>' +
        '<select id="dag-select" name="dag"><option value="">' + esc(t('check.choose')) + '</option>' + plotOptions(dag) + '</select>' +
        '<button class="btn primary" type="submit">' + esc(t('check.go')) + '</button></form>';
      if (!dag || !E.plot(dag)) {
        return head + picker + '<figure class="map-card wide">' + mouzaMap() + '<figcaption>' + esc(t('check.tapPlot')) + '</figcaption>' + legend() + '</figure>';
      }
      return head + picker + plotReport(dag);
    },
    mount: function () {
      const f = document.getElementById('check-form');
      f.addEventListener('submit', function (e) { e.preventDefault(); const v = f.dag.value; if (v) location.hash = '#/check?dag=' + v; });
      f.dag.addEventListener('change', function () { if (f.dag.value) location.hash = '#/check?dag=' + f.dag.value; });
    }
  };

  function scoreSeal(a) {
    const r = 54, c = 2 * Math.PI * r, off = c * (1 - a.score / 100);
    return '<div class="seal lvl-' + a.level + '"><svg viewBox="0 0 140 140" aria-hidden="true">' +
      '<circle cx="70" cy="70" r="' + r + '" class="seal-track"/>' +
      '<circle cx="70" cy="70" r="' + r + '" class="seal-ring" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg><div class="seal-text"><span class="seal-score">' + U.num(a.score) + '</span><span class="seal-of">/' + U.num(100) + '</span></div></div>';
  }

  function factorText(f) {
    const x = f.extra || {};
    const vars = { ref: f.ref ? U.L(f.ref) || f.ref : '', count: U.num(Array.isArray(x) ? x.length : x) };
    if (f.key === 'acquisition') { vars.project = U.L(x.project); vars.stage = U.L(x.stage); }
    if (f.key === 'case') { vars.court = U.L(x.court); }
    if (f.key === 'mortgage') { vars.bank = U.bank(x.bank); vars.amount = U.money(x.amount); vars.ref = x.ref; }
    return { title: t('risk.' + f.key), detail: t('risk.' + f.key + '.d', vars) };
  }

  function plotReport(dag) {
    const c = ctx(), p = E.plot(dag), s = c.derived[dag], a = c.assessments[dag];
    const ownersMatch = E.sameOwners(s.deedOwners, s.recordOwners);

    const factors = a.factors.length ? '<ul class="factors">' + a.factors.map(function (f) {
      const tx = factorText(f);
      return '<li class="factor ' + f.sev + '"><span class="chk-icon">' + ICON[f.sev === 'danger' ? 'fail' : 'warn'] + '</span><div><strong>' + esc(tx.title) +
        '</strong><span>' + esc(tx.detail) + '</span></div><span class="pts">−' + U.num(f.points) + '</span></li>';
    }).join('') + '</ul>' : '<ul class="factors"><li class="factor pass"><span class="chk-icon">' + ICON.pass + '</span><div><strong>' + esc(t('risk.none')) + '</strong><span>' + esc(t('risk.none.d')) + '</span></div></li></ul>';

    // Timeline: survey records, deeds, mutations, mortgages, court case, acquisition, blocked attempts.
    const ev = [];
    p.khatians.forEach(function (k) {
      ev.push({ d: k.year + '-01-01', year: true, kind: 'khatian', text: t('tl.khatian', { survey: t('survey.' + k.survey), no: U.num(k.no), owner: U.L(k.owner), area: U.area(k.area) }) });
    });
    s.deeds.forEach(function (b) {
      ev.push({ d: b.payload.date, kind: 'deed', text: t('tl.deed', { no: b.payload.deedNo, from: U.person(b.payload.seller), to: U.person(b.payload.buyer), area: U.area(b.payload.area) }), link: '#/deed?no=' + encodeURIComponent(b.payload.deedNo) });
    });
    s.mutations.forEach(function (b) {
      ev.push({ d: b.payload.date, kind: 'mutation', text: t('tl.mutation', { no: b.payload.caseNo, to: U.person(b.payload.to) }) });
    });
    s.mortgages.forEach(function (m) {
      ev.push({ d: m.block.payload.date, kind: 'mortgage', text: t('tl.mortgage', { bank: U.bank(m.block.payload.bank), amount: U.money(m.block.payload.amount) }) });
      if (m.released) ev.push({ d: m.released.payload.date, kind: 'mutation', text: t('tl.release', { ref: m.released.payload.ref }) });
    });
    const cc = E.caseFor(dag); if (cc) ev.push({ d: cc.filed, kind: 'danger', text: t('tl.case', { no: U.L(cc.no), court: U.L(cc.court) }) });
    const acq = E.acqFor(dag); if (acq) ev.push({ d: acq.date, kind: 'danger', text: t('tl.acq', { ref: U.L(acq.ref), project: U.L(acq.project) }) });
    c.state.alerts.filter(function (x) { return x.dag === dag; }).forEach(function (x) {
      ev.push({ d: x.time.slice(0, 10), kind: 'danger', text: t('tl.blocked') + ': ' + alertText(x) });
    });
    ev.sort(function (x, y) { return x.d < y.d ? -1 : x.d > y.d ? 1 : 0; });

    const timeline = '<ol class="timeline">' + ev.map(function (e) {
      const when = e.year ? U.num(e.d.slice(0, 4)) : U.date(e.d);
      const body = e.link ? '<a href="' + e.link + '">' + esc(e.text) + '</a>' : esc(e.text);
      return '<li class="tl ' + e.kind + '"><time>' + when + '</time><p>' + body + '</p></li>';
    }).join('') + '</ol>';

    const mortActive = s.mortgages.filter(function (m) { return m.active; });
    const regs = [
      [t('reg.case'), cc ? U.L(cc.no) + ', ' + U.L(cc.court) : t('reg.none'), !!cc],
      [t('reg.khas'), E.khasFor(dag) ? U.L(E.khasFor(dag).ref) : t('reg.none'), !!E.khasFor(dag)],
      [t('reg.acq'), acq ? U.L(acq.ref) + ', ' + U.L(acq.stage) : t('reg.none'), !!acq],
      [t('reg.mortgage'), mortActive.length ? U.bank(mortActive[0].block.payload.bank) + ', ' + U.money(mortActive[0].block.payload.amount) : t('reg.none'), mortActive.length > 0]
    ];

    return '' +
      '<section class="report">' +
        '<div class="report-top lvl-' + a.level + '">' +
          scoreSeal(a) +
          '<div class="verdict">' +
            '<p class="plot-id">' + esc(t('common.dag')) + ' ' + U.num(dag) + ', ' + esc(t('common.mouza')) + ' ' + esc(U.L(D.location.mouza)) + ' · ' + esc(U.L(p.landClass)) + ' · ' + U.area(p.area) + '</p>' +
            '<h2>' + esc(t('level.' + a.level)) + '</h2>' +
            '<p>' + esc(t('verdict.' + a.level)) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="report-grid">' +
          '<div class="panel"><h3>' + esc(t('check.why')) + '</h3>' + factors + '</div>' +
          '<div class="panel"><h3>' + esc(t('check.owner')) + '</h3>' +
            '<dl class="facts">' +
              '<dt>' + esc(t('check.byDeed')) + '</dt><dd>' + esc(U.owners(s.deedOwners)) + '</dd>' +
              '<dt>' + esc(t('check.byRecord')) + '</dt><dd>' + esc(U.owners(s.recordOwners)) + '</dd>' +
            '</dl>' +
            '<p class="match ' + (ownersMatch ? 'ok' : 'bad') + '">' + esc(ownersMatch ? t('check.ownersMatch') : t('check.ownersDiffer')) + '</p>' +
            '<h3>' + esc(t('check.registers')) + '</h3>' +
            '<dl class="facts regs">' + regs.map(function (r) {
              return '<dt>' + esc(r[0]) + '</dt><dd class="' + (r[2] ? 'bad' : 'ok') + '">' + esc(r[1]) + '</dd>';
            }).join('') + '</dl>' +
          '</div>' +
        '</div>' +
        '<div class="panel"><h3>' + esc(t('check.history')) + '</h3>' + timeline + '</div>' +
        '<p class="note">' + esc(t('check.note')) + '</p>' +
      '</section>';
  }

  /* ---------- Verify a deed ---------- */

  const verify = {
    render: function (q) {
      return '<header class="page-head"><h1>' + esc(t('verify.title')) + '</h1><p>' + esc(t('verify.lede')) + '</p></header>' +
        '<div class="verify-ways">' +
          '<form class="panel" id="verify-no"><h2>' + esc(t('verify.byNo')) + '</h2>' +
            '<label for="deed-no">' + esc(t('verify.noLabel')) + '</label>' +
            '<div class="inline"><input id="deed-no" name="no" autocomplete="off" placeholder="D-2019-0451" value="' + esc(q.deed || '') + '">' +
            '<button class="btn primary" type="submit">' + esc(t('verify.check')) + '</button></div>' +
            '<p class="hint">' + esc(t('verify.tryNos')) + ' <button type="button" class="linkish" data-fill="D-2019-0451">D-2019-0451</button> <button type="button" class="linkish" data-fill="D-2024-0137">D-2024-0137</button> <button type="button" class="linkish" data-fill="D-2023-9999">D-2023-9999</button></p>' +
          '</form>' +
          '<form class="panel" id="verify-file"><h2>' + esc(t('verify.byFile')) + '</h2>' +
            '<label for="deed-file" class="drop"><span>' + esc(t('verify.fileLabel')) + '</span><input type="file" id="deed-file" accept=".json,application/json"></label>' +
            '<p class="hint">' + esc(t('verify.fileHint')) + '</p>' +
          '</form>' +
        '</div>' +
        '<div id="verify-result" aria-live="polite"></div>';
    },
    mount: function (q) {
      const fNo = document.getElementById('verify-no');
      fNo.addEventListener('submit', function (e) { e.preventDefault(); verifyByNo(fNo.no.value.trim(), null, false); });
      document.querySelectorAll('[data-fill]').forEach(function (b) {
        b.addEventListener('click', function () { fNo.no.value = b.dataset.fill; verifyByNo(b.dataset.fill, null, false); });
      });
      document.getElementById('deed-file').addEventListener('change', function (e) {
        const file = e.target.files[0]; if (!file) return;
        const r = new FileReader();
        r.onload = function () { verifyFile(r.result); };
        r.readAsText(file);
      });
      if (q.deed) verifyByNo(q.deed, q.h || null, true);
    }
  };

  function findDeed(no) {
    return ctx().state.chain.find(function (b) { return b.type === 'DEED_REGISTERED' && b.payload.deedNo.toUpperCase() === String(no).toUpperCase(); });
  }

  function blockTrusted(index) {
    const v = ctx().integrity;
    const r = v.results[index];
    return r && r.hashOk && r.linkOk && !r.afterBreak && (v.brokenAt === -1 || v.brokenAt > index);
  }

  function deedFacts(p) {
    return '<dl class="facts deed-facts">' +
      '<dt>' + esc(t('deed.no')) + '</dt><dd>' + esc(p.deedNo) + '</dd>' +
      '<dt>' + esc(t('common.dag')) + '</dt><dd>' + U.num(esc(p.dag)) + ', ' + esc(U.L(D.location.mouza)) + '</dd>' +
      '<dt>' + esc(t('deed.seller')) + '</dt><dd>' + esc(U.person(p.seller)) + '</dd>' +
      '<dt>' + esc(t('deed.buyer')) + '</dt><dd>' + esc(U.person(p.buyer)) + '</dd>' +
      '<dt>' + esc(t('deed.area')) + '</dt><dd>' + esc(U.area(p.area)) + '</dd>' +
      '<dt>' + esc(t('deed.price')) + '</dt><dd>' + esc(U.money(p.price)) + '</dd>' +
      '<dt>' + esc(t('deed.date')) + '</dt><dd>' + U.date(p.date) + '</dd>' +
      '<dt>' + esc(t('deed.office')) + '</dt><dd>' + esc(U.L(D.offices[p.office]) || p.office) + '</dd>' +
      '</dl>';
  }

  // What happened to this land after the deed? (Was it sold again, mutated?)
  function afterDeed(p) {
    const c = ctx(), s = c.derived[p.dag];
    const later = s.deeds.filter(function (b) { return b.payload.seller === p.buyer && b.payload.date >= p.date && b.payload.deedNo !== p.deedNo; });
    const mut = s.mutations.find(function (b) { return b.payload.deedNo === p.deedNo; });
    const pend = c.state.mutationQueue.find(function (x) { return x.deedNo === p.deedNo && x.status === 'pending'; });
    const items = [];
    items.push(mut ? t('after.mutated', { no: mut.payload.caseNo, date: U.date(mut.payload.date) }) : pend ? t('after.pending', { no: pend.caseNo }) : t('after.noMutation'));
    later.forEach(function (b) { items.push(t('after.resold', { no: b.payload.deedNo, to: U.person(b.payload.buyer), date: U.date(b.payload.date) })); });
    const holds = s.deedOwners[p.buyer] || 0;
    items.push(holds ? t('after.holds', { who: U.person(p.buyer), area: U.area(holds) }) : t('after.holdsNone', { who: U.person(p.buyer) }));
    return '<ul class="after">' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
  }

  function verifyByNo(no, claimedHash, fromQr) {
    const out = document.getElementById('verify-result');
    if (!no) { out.innerHTML = ''; return; }
    const b = findDeed(no);
    if (!b) {
      out.innerHTML = resultCard('bad', t('verify.notFound'), t('verify.notFoundD', { no: no }), '');
      return;
    }
    const trusted = blockTrusted(b.index);
    const qrMismatch = claimedHash && b.hash.indexOf(claimedHash) !== 0;
    let tone = 'ok', title = t('verify.authentic'), text = t('verify.authenticD', { index: U.num(b.index) });
    if (!trusted) { tone = 'bad'; title = t('verify.chainBroken'); text = t('verify.chainBrokenD'); }
    else if (qrMismatch) { tone = 'bad'; title = t('verify.qrMismatch'); text = t('verify.qrMismatchD'); }
    out.innerHTML = (fromQr ? '<p class="qr-banner">' + esc(t('verify.fromQr')) + '</p>' : '') +
      resultCard(tone, title, text,
        '<div class="result-grid"><div><h3>' + esc(t('verify.ledgerCopy')) + '</h3>' + deedFacts(b.payload) +
        '<p class="hint">' + esc(t('verify.comparePaper')) + '</p></div>' +
        '<div><h3>' + esc(t('verify.after')) + '</h3>' + afterDeed(b.payload) +
        '<h3>' + esc(t('verify.fingerprint')) + '</h3><p class="hash" title="' + b.hash + '">' + b.hash + '</p>' +
        '<a class="btn" href="#/deed?no=' + encodeURIComponent(b.payload.deedNo) + '">' + esc(t('verify.openCert')) + '</a></div></div>');
  }

  async function verifyFile(text) {
    const out = document.getElementById('verify-result');
    let doc;
    try { doc = JSON.parse(text); } catch (e) { doc = null; }
    if (!doc || doc.format !== 'bhumisutra-deed/1' || !doc.deed || !doc.deed.deedNo) {
      out.innerHTML = resultCard('bad', t('verify.badFile'), t('verify.badFileD'), '');
      return;
    }
    const b = findDeed(doc.deed.deedNo);
    if (!b) { out.innerHTML = resultCard('bad', t('verify.notFound'), t('verify.notFoundD', { no: doc.deed.deedNo }), ''); return; }
    const fileHash = await BS.crypto.hashObject(doc.deed);
    const ledgerHash = await BS.crypto.hashObject(b.payload);
    const diff = E.diffDeed(doc.deed, b.payload);
    const trusted = blockTrusted(b.index);
    const prints = '<div class="prints"><div><span>' + esc(t('verify.fileFp')) + '</span><p class="hash ' + (fileHash === ledgerHash ? 'ok' : 'bad') + '">' + fileHash + '</p></div>' +
      '<div><span>' + esc(t('verify.ledgerFp')) + '</span><p class="hash ok">' + ledgerHash + '</p></div></div>';
    if (!diff.length && trusted) {
      out.innerHTML = resultCard('ok', t('verify.fileOk'), t('verify.fileOkD', { no: doc.deed.deedNo }), prints + deedFacts(b.payload));
      return;
    }
    if (!trusted) { out.innerHTML = resultCard('bad', t('verify.chainBroken'), t('verify.chainBrokenD'), prints); return; }
    const rows = diff.map(function (d) {
      return '<tr><th>' + esc(t('field.' + d.field)) + '</th><td class="bad">' + esc(fmtField(d.field, d.file)) + '</td><td class="ok">' + esc(fmtField(d.field, d.ledger)) + '</td></tr>';
    }).join('');
    out.innerHTML = resultCard('bad', t('verify.tampered'), t('verify.tamperedD', { n: U.num(diff.length) }),
      prints + '<table class="diff"><thead><tr><th>' + esc(t('verify.field')) + '</th><th>' + esc(t('verify.inFile')) + '</th><th>' + esc(t('verify.onLedger')) + '</th></tr></thead><tbody>' + rows + '</tbody></table>');
  }

  function fmtField(field, v) {
    if (v === undefined) return '—';
    if (field === 'seller' || field === 'buyer') return D.persons[v] ? U.person(v) : String(v);
    if (field === 'area') return U.area(v);
    if (field === 'price') return U.money(v);
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }

  function resultCard(tone, title, text, body) {
    return '<section class="result ' + tone + '"><div class="result-head"><span class="chk-icon">' + ICON[tone === 'ok' ? 'pass' : tone === 'warn' ? 'warn' : 'fail'] + '</span>' +
      '<div><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p></div></div>' + body + '</section>';
  }

  /* ---------- Deed certificate (printable, with QR) ---------- */

  const deed = {
    render: function (q) {
      const b = findDeed(q.no || '');
      if (!b) return '<header class="page-head"><h1>' + esc(t('verify.notFound')) + '</h1></header>' + emptyNote(t('verify.notFoundD', { no: q.no || '' }));
      const url = U.baseUrl() + '#/verify?deed=' + encodeURIComponent(b.payload.deedNo) + '&h=' + b.hash.slice(0, 12);
      return '<div class="cert-actions no-print"><a class="btn" href="#/check?dag=' + b.payload.dag + '">' + esc(t('cert.back')) + '</a>' +
        '<button class="btn" id="print-btn" type="button">' + esc(t('cert.print')) + '</button>' +
        '<button class="btn primary" id="dl-btn" type="button">' + esc(t('cert.download')) + '</button></div>' +
        '<article class="certificate">' +
          '<header><div class="cert-mark">' + BS.app.logo() + '</div><div><p>' + esc(t('cert.issuer')) + '</p><h1>' + esc(t('cert.title')) + '</h1></div></header>' +
          '<div class="cert-body">' + deedFacts(b.payload) +
            '<figure class="cert-qr">' + U.qr(url, 4) + '<figcaption>' + esc(t('cert.scan')) + '</figcaption></figure>' +
          '</div>' +
          '<footer><dl class="facts">' +
            '<dt>' + esc(t('cert.block')) + '</dt><dd>#' + U.num(b.index) + ', ' + U.dateTime(b.timestamp) + '</dd>' +
            '<dt>' + esc(t('cert.hash')) + '</dt><dd class="hash">' + b.hash + '</dd>' +
            '<dt>' + esc(t('cert.prev')) + '</dt><dd class="hash">' + b.prevHash + '</dd>' +
          '</dl><p class="demo-note">' + esc(t('cert.demo')) + '</p></footer>' +
        '</article>' +
        '<aside class="panel try no-print"><h2>' + esc(t('cert.tryTitle')) + '</h2><ol class="how">' +
          '<li><span>' + esc(t('cert.try1')) + '</span></li><li><span>' + esc(t('cert.try2')) + '</span></li><li><span>' + esc(t('cert.try3')) + '</span></li></ol>' +
          '<a class="btn" href="#/verify">' + esc(t('home.ctaVerify')) + '</a></aside>';
    },
    mount: function (q) {
      const b = findDeed(q.no || ''); if (!b) return;
      document.getElementById('print-btn').addEventListener('click', function () { window.print(); });
      document.getElementById('dl-btn').addEventListener('click', async function () {
        const doc = {
          format: 'bhumisutra-deed/1', deed: b.payload,
          payloadFingerprint: await BS.crypto.hashObject(b.payload),
          block: b.index, blockHash: b.hash,
          note: 'Fictional demo deed (LandTech 2026). Edit any value and upload it on the Verify page to see tamper detection.'
        };
        const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'deed-' + b.payload.deedNo + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        U.toast(t('cert.downloaded'), 'ok');
      });
    }
  };

  /* ---------- Sub-Registry: register a sale ---------- */

  let regDraft = null;
  const register = {
    render: function () {
      const dag = (regDraft && regDraft.dag) || '101';
      const owners = ctx().derived[dag].deedOwners;
      const seller = (regDraft && regDraft.seller) || Object.keys(owners)[0];
      return '<header class="page-head"><p class="kicker">' + esc(t('role.subreg')) + '</p><h1>' + esc(t('reg.title')) + '</h1><p>' + esc(t('reg.lede')) + '</p></header>' +
        '<div class="presets"><span>' + esc(t('common.demoCases')) + '</span>' +
          '<button class="chip" data-preset="clean" type="button">' + esc(t('reg.presetClean')) + '</button>' +
          '<button class="chip danger" data-preset="double" type="button">' + esc(t('reg.presetDouble')) + '</button>' +
          '<button class="chip danger" data-preset="khas" type="button">' + esc(t('reg.presetKhas')) + '</button>' +
          '<button class="chip warn" data-preset="mortgaged" type="button">' + esc(t('reg.presetMortgaged')) + '</button></div>' +
        '<div class="form-layout"><form class="panel form" id="reg-form">' +
          field(t('common.dag'), '<select name="dag">' + plotOptions(dag) + '</select>') +
          field(t('deed.seller'), '<select name="seller">' + personOptions(seller, dag) + '</select>') +
          field(t('deed.buyer'), '<select name="buyer">' + personOptions((regDraft && regDraft.buyer) || 'P02') + '</select>') +
          '<div class="row2">' +
            field(t('deed.area') + ' (' + t('unit.decimal') + ')', '<input name="area" type="number" min="0.01" step="0.01" required value="' + esc((regDraft && regDraft.area) || owners[seller] || '') + '">') +
            field(t('deed.price') + ' (৳)', '<input name="price" type="number" min="0" step="1000" required value="' + esc((regDraft && regDraft.price) || 1500000) + '">') +
          '</div>' +
          '<button class="btn primary" type="submit">' + esc(t('reg.run')) + '</button>' +
        '</form><div id="reg-result" class="result-slot" aria-live="polite">' + emptyNote(t('reg.empty')) + '</div></div>';
    },
    mount: function () {
      const f = document.getElementById('reg-form');
      f.dag.addEventListener('change', function () {
        regDraft = readForm(f); regDraft.seller = Object.keys(ctx().derived[f.dag.value].deedOwners)[0]; regDraft.area = '';
        BS.app.render();
      });
      document.querySelectorAll('[data-preset]').forEach(function (b) {
        b.addEventListener('click', function () {
          const P = {
            clean: { dag: '101', seller: 'P04', buyer: 'P02', area: 10, price: 900000 },
            double: { dag: '205', seller: 'P03', buyer: 'P05', area: 20, price: 2600000 },
            khas: { dag: '530', seller: 'P11', buyer: 'P05', area: 15, price: 1200000 },
            mortgaged: { dag: '422', seller: 'P08', buyer: 'P02', area: 40, price: 3200000 }
          }[b.dataset.preset];
          regDraft = Object.assign({}, P);
          BS.app.render();
          setTimeout(function () { document.getElementById('reg-form').requestSubmit(); }, 50);
        });
      });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        const input = readForm(f);
        regDraft = input;
        const res = E.checkSale(input, ctx().derived, ctx().state, ctx().integrity.ok);
        const out = document.getElementById('reg-result');
        if (res.blocked) {
          const ds = res.checks.find(function (c) { return c.key === 'doubleSale' && c.status === 'fail'; });
          const kh = res.checks.find(function (c) { return c.key === 'khas' && c.status === 'fail'; });
          const type = ds ? 'DOUBLE_SALE' : kh ? 'KHAS_SALE' : 'BLOCKED_SALE';
          BS.store.addAlert({ time: new Date().toISOString(), type: type, dag: input.dag,
            detail: { seller: input.seller, buyer: input.buyer, area: Number(input.area), priorDeed: ds && ds.data.prior ? ds.data.prior.deedNo : '' } });
          BS.app.refreshHeader();
          out.innerHTML = resultCard('bad', t('reg.blocked'), t('reg.blockedD'), checkList(res.checks));
          return;
        }
        const warn = res.checks.some(function (c) { return c.status === 'warn'; });
        out.innerHTML = resultCard(warn ? 'warn' : 'ok', warn ? t('reg.passWarn') : t('reg.pass'), t('reg.passD'), checkList(res.checks) +
          '<button class="btn primary" id="do-register" type="button">' + esc(t('reg.confirm')) + '</button>');
        document.getElementById('do-register').addEventListener('click', async function () {
          this.disabled = true;
          const no = BS.store.nextNo('deed', 'D');
          const today = new Date().toISOString().slice(0, 10);
          const payload = { deedNo: no, dag: input.dag, seller: input.seller, buyer: input.buyer, area: Number(input.area), price: Number(input.price), date: today, office: 'subreg', kind: 'sale' };
          const b = await BS.store.append('DEED_REGISTERED', payload);
          // Automatic e-Mutation filing: registration and mutation stay linked.
          const caseNo = BS.store.nextNo('mutation', 'M');
          BS.store.state.mutationQueue.unshift({ caseNo: caseNo, deedNo: no, dag: input.dag, from: input.seller, to: input.buyer, area: Number(input.area), filed: today, status: 'pending' });
          BS.store.saveQueue();
          regDraft = null;
          await BS.app.refresh();
          BS.app.refreshHeader();
          out.innerHTML = resultCard('ok', t('reg.done', { no: no }), t('reg.doneD', { index: U.num(b.index), mut: caseNo }),
            '<p class="hash">' + b.hash + '</p><div class="actions"><a class="btn primary" href="#/deed?no=' + no + '">' + esc(t('verify.openCert')) + '</a>' +
            '<a class="btn" href="#/mutation">' + esc(t('reg.toMutation')) + '</a></div>');
          U.toast(t('reg.done', { no: no }), 'ok');
        });
      });
    }
  };

  function field(label, control) { return '<label class="field"><span>' + esc(label) + '</span>' + control + '</label>'; }
  function readForm(f) {
    const o = {}; Array.from(f.elements).forEach(function (el) { if (el.name) o[el.name] = el.value; }); return o;
  }

  /* ---------- AC Land: e-Mutation ---------- */

  const mutation = {
    render: function () {
      const c = ctx();
      const q = c.state.mutationQueue;
      const pending = q.filter(function (x) { return x.status === 'pending'; });
      const done = c.state.chain.filter(function (b) { return b.type === 'MUTATION_APPROVED'; }).slice().reverse();
      return '<header class="page-head"><p class="kicker">' + esc(t('role.acland')) + '</p><h1>' + esc(t('mut.title')) + '</h1><p>' + esc(t('mut.lede')) + '</p></header>' +
        '<h2 class="section-title">' + esc(t('mut.queue')) + ' (' + U.num(pending.length) + ')</h2>' +
        (pending.length ? pending.map(function (app) {
          const r = E.checkMutation(app, c.state.chain, c.derived);
          const days = Math.max(0, Math.floor((Date.now() - new Date(app.filed + 'T00:00:00Z')) / 864e5));
          return '<article class="panel mut-card">' +
            '<header><div><h3>' + esc(app.caseNo) + '</h3><p>' + esc(t('mut.summary', { dag: U.num(app.dag), from: U.person(app.from), to: U.person(app.to), area: U.area(app.area) })) + '</p></div>' +
            '<span class="age ' + (days > 45 ? 'bad' : '') + '">' + esc(t('mut.age', { d: U.num(days) })) + '</span></header>' +
            '<ol class="stepper"><li class="done">' + esc(t('mut.s1')) + '</li><li class="done">' + esc(t('mut.s2')) + '</li><li class="' + (r.blocked ? 'bad' : 'done') + '">' + esc(t('mut.s3')) + '</li><li>' + esc(t('mut.s4')) + '</li></ol>' +
            checkList(r.checks) +
            '<div class="actions"><button class="btn primary" data-approve="' + esc(app.caseNo) + '"' + (r.blocked ? ' disabled' : '') + ' type="button">' + esc(t('mut.approve')) + '</button>' +
            '<button class="btn" data-reject="' + esc(app.caseNo) + '" type="button">' + esc(t('mut.reject')) + '</button>' +
            '<a class="btn ghost" href="#/deed?no=' + encodeURIComponent(app.deedNo) + '">' + esc(t('mut.viewDeed')) + '</a></div>' +
          '</article>';
        }).join('') : emptyNote(t('mut.none'))) +
        '<h2 class="section-title">' + esc(t('mut.history')) + '</h2>' +
        '<table class="table"><thead><tr><th>' + esc(t('mut.case')) + '</th><th>' + esc(t('common.dag')) + '</th><th>' + esc(t('mut.newHolder')) + '</th><th>' + esc(t('deed.date')) + '</th><th>' + esc(t('mut.block')) + '</th></tr></thead><tbody>' +
        done.map(function (b) {
          return '<tr><td>' + esc(b.payload.caseNo) + '</td><td>' + U.num(b.payload.dag) + '</td><td>' + esc(U.person(b.payload.to)) + '</td><td>' + U.date(b.payload.date) + '</td><td>#' + U.num(b.index) + '</td></tr>';
        }).join('') + '</tbody></table>';
    },
    mount: function () {
      document.querySelectorAll('[data-approve]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          btn.disabled = true;
          const app = ctx().state.mutationQueue.find(function (x) { return x.caseNo === btn.dataset.approve; });
          await BS.store.append('MUTATION_APPROVED', { caseNo: app.caseNo, deedNo: app.deedNo, dag: app.dag, from: app.from, to: app.to, area: app.area, date: new Date().toISOString().slice(0, 10), office: 'acland' });
          app.status = 'approved'; BS.store.saveQueue();
          U.toast(t('mut.approved', { no: app.caseNo }), 'ok');
          await BS.app.refresh(); BS.app.render(); BS.app.refreshHeader();
        });
      });
      document.querySelectorAll('[data-reject]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          const app = ctx().state.mutationQueue.find(function (x) { return x.caseNo === btn.dataset.reject; });
          app.status = 'rejected'; BS.store.saveQueue();
          U.toast(t('mut.rejected', { no: app.caseNo }), 'warn');
          await BS.app.refresh(); BS.app.render(); BS.app.refreshHeader();
        });
      });
    }
  };

  /* ---------- Bank: mortgage check ---------- */

  let bankDraft = null;
  const bank = {
    render: function () {
      const c = ctx();
      const dag = (bankDraft && bankDraft.dag) || '101';
      const owner = (bankDraft && bankDraft.owner) || Object.keys(c.derived[dag].deedOwners)[0];
      const active = [];
      Object.keys(c.derived).forEach(function (d) { c.derived[d].mortgages.forEach(function (m) { if (m.active) active.push(m.block); }); });
      return '<header class="page-head"><p class="kicker">' + esc(t('role.bank')) + '</p><h1>' + esc(t('bank.title')) + '</h1><p>' + esc(t('bank.lede')) + '</p></header>' +
        '<div class="presets"><span>' + esc(t('common.demoCases')) + '</span>' +
          '<button class="chip" data-bpreset="clean" type="button">' + esc(t('bank.presetClean')) + '</button>' +
          '<button class="chip danger" data-bpreset="double" type="button">' + esc(t('bank.presetDouble')) + '</button></div>' +
        '<div class="form-layout"><form class="panel form" id="bank-form">' +
          field(t('common.dag'), '<select name="dag">' + plotOptions(dag) + '</select>') +
          field(t('bank.borrower'), '<select name="owner">' + personOptions(owner, dag) + '</select>') +
          field(t('bank.bank'), '<select name="bank">' + Object.keys(D.banks).map(function (id) { return '<option value="' + id + '"' + ((bankDraft && bankDraft.bank) === id ? ' selected' : '') + '>' + esc(U.bank(id)) + '</option>'; }).join('') + '</select>') +
          field(t('bank.amount') + ' (৳)', '<input name="amount" type="number" min="1000" step="1000" required value="' + esc((bankDraft && bankDraft.amount) || 1000000) + '">') +
          '<button class="btn primary" type="submit">' + esc(t('bank.run')) + '</button>' +
        '</form><div id="bank-result" class="result-slot" aria-live="polite">' + emptyNote(t('bank.empty')) + '</div></div>' +
        '<h2 class="section-title">' + esc(t('bank.active')) + '</h2>' +
        (active.length ? '<table class="table"><thead><tr><th>' + esc(t('bank.ref')) + '</th><th>' + esc(t('common.dag')) + '</th><th>' + esc(t('bank.borrower')) + '</th><th>' + esc(t('bank.bank')) + '</th><th>' + esc(t('bank.amount')) + '</th><th></th></tr></thead><tbody>' +
          active.map(function (b) {
            const p = b.payload;
            return '<tr><td>' + esc(p.ref) + '</td><td>' + U.num(p.dag) + '</td><td>' + esc(U.person(p.owner)) + '</td><td>' + esc(U.bank(p.bank)) + '</td><td>' + U.money(p.amount) + '</td>' +
              '<td><button class="btn small" data-release="' + esc(p.ref) + '" data-dag="' + p.dag + '" type="button">' + esc(t('bank.release')) + '</button></td></tr>';
          }).join('') + '</tbody></table>' : emptyNote(t('bank.noneActive')));
    },
    mount: function () {
      const f = document.getElementById('bank-form');
      f.dag.addEventListener('change', function () {
        bankDraft = readForm(f); bankDraft.owner = Object.keys(ctx().derived[f.dag.value].deedOwners)[0]; BS.app.render();
      });
      document.querySelectorAll('[data-bpreset]').forEach(function (b) {
        b.addEventListener('click', function () {
          bankDraft = b.dataset.bpreset === 'double'
            ? { dag: '422', owner: 'P08', bank: 'B2', amount: 1200000 }
            : { dag: '101', owner: 'P04', bank: 'B2', amount: 800000 };
          BS.app.render();
          setTimeout(function () { document.getElementById('bank-form').requestSubmit(); }, 50);
        });
      });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        const input = readForm(f); bankDraft = input;
        const res = E.checkMortgage(input, ctx().derived, ctx().integrity.ok);
        const out = document.getElementById('bank-result');
        if (res.blocked) {
          const dm = res.checks.find(function (c) { return c.key === 'doubleMortgage'; });
          if (dm) {
            BS.store.addAlert({ time: new Date().toISOString(), type: 'DOUBLE_MORTGAGE', dag: input.dag, detail: { owner: input.owner, bank: input.bank, ref: dm.data.ref } });
            BS.app.refreshHeader();
          }
          out.innerHTML = resultCard('bad', t('bank.blocked'), t('bank.blockedD'), checkList(res.checks));
          return;
        }
        out.innerHTML = resultCard('ok', t('bank.pass'), t('bank.passD'), checkList(res.checks) +
          '<button class="btn primary" id="do-mortgage" type="button">' + esc(t('bank.confirm')) + '</button>');
        document.getElementById('do-mortgage').addEventListener('click', async function () {
          this.disabled = true;
          const ref = BS.store.nextNo('mortgage', 'MTG');
          await BS.store.append('MORTGAGE_CREATED', { ref: ref, dag: input.dag, owner: input.owner, bank: input.bank, amount: Number(input.amount), area: res.held, date: new Date().toISOString().slice(0, 10) });
          bankDraft = null;
          U.toast(t('bank.done', { ref: ref }), 'ok');
          await BS.app.refresh(); BS.app.render(); BS.app.refreshHeader();
        });
      });
      document.querySelectorAll('[data-release]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          btn.disabled = true;
          await BS.store.append('MORTGAGE_RELEASED', { ref: btn.dataset.release, dag: btn.dataset.dag, date: new Date().toISOString().slice(0, 10) });
          U.toast(t('bank.released', { ref: btn.dataset.release }), 'ok');
          await BS.app.refresh(); BS.app.render(); BS.app.refreshHeader();
        });
      });
    }
  };

  /* ---------- Khatian reconciliation ---------- */

  const khatian = {
    render: function () {
      const c = ctx();
      const anchored = (c.state.chain[1] && c.state.chain[1].payload.records) || {};
      const fp = c.khatianPrints || {};
      const total = Object.keys(fp).length;
      const matching = Object.keys(fp).filter(function (k) { return anchored[k] === fp[k]; }).length;
      const unmut = D.plots.filter(function (p) { return !E.sameOwners(c.derived[p.dag].deedOwners, c.derived[p.dag].recordOwners); });
      return '<header class="page-head"><p class="kicker">' + esc(t('role.dlrs')) + '</p><h1>' + esc(t('kh.title')) + '</h1><p>' + esc(t('kh.lede')) + '</p></header>' +
        '<p class="match ' + (matching === total ? 'ok' : 'bad') + '">' + esc(t('kh.fingerprints', { m: U.num(matching), n: U.num(total) })) + '</p>' +
        D.plots.map(function (p) {
          const issues = E.khatianIssues(p);
          const badCell = function (k, kind) { return issues.some(function (i) { return i.survey === k.survey && i.kind === kind; }); };
          return '<section class="panel kh-plot"><header><h2>' + esc(t('common.dag')) + ' ' + U.num(p.dag) + '</h2>' +
            '<span class="badge ' + (issues.length ? 'warn' : 'ok') + '">' + esc(issues.length ? t('kh.issues', { n: U.num(issues.length) }) : t('kh.clean')) + '</span>' +
            '<a href="#/check?dag=' + p.dag + '">' + esc(t('kh.fullReport')) + '</a></header>' +
            '<div class="table-wrap"><table class="table kh"><thead><tr><th>' + esc(t('kh.survey')) + '</th><th>' + esc(t('kh.no')) + '</th><th>' + esc(t('kh.owner')) + '</th><th>' + esc(t('deed.area')) + '</th><th>' + esc(t('kh.basis')) + '</th></tr></thead><tbody>' +
            p.khatians.map(function (k) {
              return '<tr><th scope="row">' + esc(t('survey.' + k.survey)) + ' <small>' + U.num(k.year) + '</small></th><td>' + U.num(k.no) + '</td>' +
                '<td class="' + (badCell(k, 'name') ? 'bad' : '') + '">' + esc(U.L(k.owner)) + '</td>' +
                '<td class="' + (badCell(k, 'area') ? 'bad' : '') + '">' + esc(U.area(k.area)) + '</td>' +
                '<td>' + esc(k.basis ? t('basis.' + k.basis) : badCell(k, 'name') ? t('basis.missing') : '—') + '</td></tr>';
            }).join('') + '</tbody></table></div>' +
            (issues.length ? '<ul class="kh-issues">' + issues.map(function (i) {
              return '<li>' + esc(i.kind === 'name'
                ? t('kh.nameIssue', { a: i.prevSurvey, b: i.survey, from: U.L(i.from), to: U.L(i.to) })
                : t('kh.areaIssue', { a: i.prevSurvey, b: i.survey, from: U.area(i.from), to: U.area(i.to) })) + '</li>';
            }).join('') + '</ul>' : '') +
          '</section>';
        }).join('') +
        '<section class="panel"><h2>' + esc(t('kh.regVsMut')) + '</h2>' +
          (unmut.length ? '<ul class="kh-issues">' + unmut.map(function (p) {
            const s = c.derived[p.dag];
            return '<li>' + esc(t('kh.regVsMutItem', { dag: U.num(p.dag), deed: U.owners(s.deedOwners), rec: U.owners(s.recordOwners) })) + ' <a href="#/mutation">' + esc(t('nav.mutation')) + '</a></li>';
          }).join('') + '</ul>' : emptyNote(t('kh.allMutated'))) +
        '</section>';
    }
  };

  /* ---------- Ledger explorer + Tamper Lab ---------- */

  const ledger = {
    render: function () {
      const c = ctx(), v = c.integrity;
      const editable = c.state.chain.filter(function (b) { return b.type === 'DEED_REGISTERED' || b.type === 'MORTGAGE_CREATED' || b.type === 'MUTATION_APPROVED'; });
      const banner = v.ok
        ? resultCard('ok', t('led.ok'), t('led.okD', { n: U.num(c.state.chain.length) }), '')
        : resultCard('bad', t('led.broken'), t('led.brokenD', { i: U.num(v.brokenAt) }), '');
      return '<header class="page-head"><h1>' + esc(t('led.title')) + '</h1><p>' + esc(t('led.lede')) + '</p></header>' + banner +
        '<div class="ledger-layout"><ol class="chain">' + c.state.chain.map(function (b, i) {
          const r = v.results[i];
          const st = !r.hashOk ? 'bad' : !r.linkOk ? 'bad' : r.afterBreak ? 'after' : 'ok';
          const why = !r.hashOk ? t('led.hashBad') : !r.linkOk ? t('led.linkBad') : r.afterBreak ? t('led.after') : t('led.blockOk');
          return '<li class="block ' + st + '">' +
            '<div class="block-head"><span class="block-no">#' + U.num(b.index) + '</span><span class="block-type">' + esc(t('type.' + b.type)) + '</span><time>' + U.dateTime(b.timestamp) + '</time></div>' +
            '<p class="block-sum">' + esc(blockSummary(b)) + '</p>' +
            '<dl class="hashes"><dt>' + esc(t('led.prev')) + '</dt><dd class="hash">' + b.prevHash + '</dd><dt>' + esc(t('led.hash')) + '</dt><dd class="hash">' + b.hash + '</dd>' +
            (!r.hashOk ? '<dt>' + esc(t('led.recomputed')) + '</dt><dd class="hash bad">' + r.recomputed + '</dd>' : '') + '</dl>' +
            '<p class="block-status">' + esc(why) + '</p></li>';
        }).join('') + '</ol>' +
        '<aside class="panel lab"><h2>' + esc(t('lab.title')) + '</h2><p>' + esc(t('lab.lede')) + '</p>' +
          '<form id="lab-form" class="form">' +
            field(t('lab.block'), '<select name="index">' + editable.map(function (b) { return '<option value="' + b.index + '">#' + U.num(b.index) + ' ' + esc(t('type.' + b.type)) + '</option>'; }).join('') + '</select>') +
            field(t('lab.field'), '<select name="field"></select>') +
            '<label class="field"><span>' + esc(t('lab.value')) + '</span><span id="lab-value"></span></label>' +
            '<fieldset class="radio"><legend>' + esc(t('lab.mode')) + '</legend>' +
              '<label><input type="radio" name="mode" value="naive" checked> ' + esc(t('lab.naive')) + '</label>' +
              '<label><input type="radio" name="mode" value="smart"> ' + esc(t('lab.smart')) + '</label></fieldset>' +
            '<button class="btn danger" type="submit">' + esc(t('lab.apply')) + '</button>' +
          '</form>' +
          '<p class="hint">' + esc(t('lab.why')) + '</p>' +
          '<button class="btn" id="reset-btn" type="button">' + esc(t('lab.reset')) + '</button>' +
        '</aside></div>';
    },
    mount: function () {
      const f = document.getElementById('lab-form');
      if (!f) return;
      const PERSON = ['buyer', 'seller', 'to', 'owner'];
      const fill = function () {
        const b = ctx().state.chain[Number(f.index.value)];
        const keys = ['area', 'buyer', 'price', 'amount', 'seller', 'to', 'owner', 'date'].filter(function (k) { return k in b.payload; });
        f.field.innerHTML = keys.map(function (k) { return '<option value="' + k + '">' + esc(t('field.' + k)) + '</option>'; }).join('');
        setVal();
      };
      const setVal = function () {
        const b = ctx().state.chain[Number(f.index.value)];
        const cur = b.payload[f.field.value];
        const slot = document.getElementById('lab-value');
        if (PERSON.indexOf(f.field.value) !== -1) {
          slot.innerHTML = '<select name="value">' + personOptions(cur === 'P05' ? 'P02' : 'P05') + '</select>';
        } else {
          slot.innerHTML = '<input name="value" required value="' + esc(typeof cur === 'number' ? cur * 10 : cur) + '">';
        }
      };
      f.index.addEventListener('change', fill);
      f.field.addEventListener('change', setVal);
      fill();
      f.addEventListener('submit', async function (e) {
        e.preventDefault();
        const b = ctx().state.chain[Number(f.index.value)];
        let val = f.value.value.trim();
        if (typeof b.payload[f.field.value] === 'number') val = Number(val);
        await BS.store.tamper(Number(f.index.value), f.field.value, val, f.mode.value);
        await BS.app.refresh(); BS.app.render(); BS.app.refreshHeader();
        U.toast(t('lab.done'), 'bad');
        const first = document.querySelector('.block.bad');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      document.getElementById('reset-btn').addEventListener('click', async function () {
        // Two-step confirm inside the page (no browser dialog).
        if (!this.dataset.armed) {
          this.dataset.armed = '1';
          this.classList.add('danger');
          this.textContent = t('lab.confirmReset');
          return;
        }
        await BS.store.reset();
        await BS.app.refresh(); BS.app.render(); BS.app.refreshHeader();
        U.toast(t('lab.resetDone'), 'ok');
      });
    }
  };

  /* ---------- About ---------- */

  const about = {
    render: function () {
      return '<header class="page-head"><h1>' + esc(t('about.title')) + '</h1><p>' + esc(t('about.lede')) + '</p></header>' +
        '<section class="panel prose">' +
          '<h2>' + esc(t('about.problemT')) + '</h2><p>' + esc(t('about.problem')) + '</p>' +
          '<h2>' + esc(t('about.howT')) + '</h2><p>' + esc(t('about.how')) + '</p>' +
          '<h2>' + esc(t('about.scaleT')) + '</h2><p>' + esc(t('about.scale')) + '</p>' +
          '<h2>' + esc(t('about.dataT')) + '</h2><p>' + esc(t('about.data')) + '</p>' +
          '<h2>' + esc(t('about.teamT')) + '</h2><p>' + esc(t('about.team')) + '</p>' +
        '</section>';
    }
  };

  return { home: home, check: check, verify: verify, deed: deed, register: register, mutation: mutation, bank: bank, khatian: khatian, ledger: ledger, about: about };
})();
