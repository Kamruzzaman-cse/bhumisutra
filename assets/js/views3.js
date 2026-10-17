/*
 * views3.js — protection features (problem P6, our own idea) and the
 * professional login:
 *   - Login: officer form + citizen NID / date of birth / one-time code
 *   - Safe sale: NID check → automatic checks → owner consent (SMS, email,
 *     authenticator app for owners abroad, or a nominee) → 72-hour public
 *     notice with objections → registration + escrow
 *   - Land lock, heir protection (faraiz), plot QR signboard, signed QR scan
 * Loaded after views.js / views2.js; screens defined here replace older ones.
 */
(function () {
  const U = BS.ui, E = BS.engine, D = BS.DATA, A = BS.auth, P = BS.parts, S = BS.sec;
  const t = U.t, esc = U.esc;
  const V = BS.views, H = V._h;
  function ctx() { return BS.app.ctx; }
  function head(kicker, title, lede) {
    return '<header class="page-head">' + (kicker ? '<p class="kicker">' + esc(kicker) + '</p>' : '') +
      '<h1>' + esc(title) + '</h1>' + (lede ? '<p>' + esc(lede) + '</p>' : '') + '</header>';
  }
  const HOURS72 = 72 * 3600 * 1000;
  function pName(id) { return U.person(id); }
  function nidOf(id) { return (D.persons[id] || {}).nid || ''; }

  /* =========================================================
   * LOGIN
   * ========================================================= */

  let loginTab = 'officer', citizenStep = null; // { person, code, channel }

  V.login = {
    render: function (q) {
      const u = A.user();
      if (u) {
        return head('', t('login.already', { name: U.L(u.name) }), t('login.alreadyD')) +
          '<div class="actions"><a class="btn primary" href="#/' + BS.homeFor(u.role) + '">' + esc(t('login.continue')) + '</a>' +
          '<button class="btn" type="button" data-logout>' + esc(t('login.logout')) + '</button></div>';
      }
      const officerForm = '<form id="officer-form" class="form" autocomplete="off" novalidate>' +
        '<label class="field"><span>' + esc(t('login.user')) + '</span><input id="login-user" name="user" required autocapitalize="off" spellcheck="false"></label>' +
        '<label class="field"><span>' + esc(t('login.pass')) + '</span><input id="login-pass" name="pass" type="password" required></label>' +
        '<p id="login-err" class="err" role="alert"></p>' +
        '<button class="btn primary big arrow" type="submit">' + esc(t('login.submit')) + ' <span aria-hidden="true">→</span></button>' +
        '<p class="hint">' + esc(t('login.ssoNote')) + '</p></form>';
      let citizenForm;
      if (!citizenStep) {
        citizenForm = '<form id="citizen-form" class="form" autocomplete="off" novalidate>' +
          '<label class="field"><span>' + esc(t('login.nid')) + '</span><input id="login-nid" name="nid" inputmode="numeric" required placeholder="000 100 0006"></label>' +
          '<label class="field"><span>' + esc(t('login.dob')) + '</span><input id="login-dob" name="dob" type="date" required></label>' +
          '<p id="login-err" class="err" role="alert"></p>' +
          '<button class="btn primary big arrow" type="submit">' + esc(t('login.sendCode')) + ' <span aria-hidden="true">→</span></button>' +
          '<p class="hint">' + esc(t('login.noNid')) + '</p></form>';
      } else {
        const p = D.persons[citizenStep.person];
        citizenForm = '<form id="otp-form" class="form" autocomplete="off" novalidate>' +
          '<p class="match ok">' + esc(t('login.codeSent', { name: U.L(p), via: t('ch.' + citizenStep.channel) })) + '</p>' +
          demoDevice(citizenStep, 'otp-code') +
          '<label class="field"><span>' + esc(t('login.code')) + '</span><input id="otp-code" name="code" inputmode="numeric" maxlength="6" required></label>' +
          '<p id="login-err" class="err" role="alert"></p>' +
          '<div class="actions"><button class="btn primary big arrow" type="submit">' + esc(t('login.submit')) + ' <span aria-hidden="true">→</span></button>' +
          '<button class="btn ghost" type="button" id="otp-back">' + esc(t('login.back')) + '</button></div></form>';
      }
      return '<section class="login-shell">' +
        '<aside class="login-brand"><div class="login-mark">' + BS.app.logo() + '</div><h1>' + esc(t('brand')) + '</h1><p>' + esc(t('login.brandLede')) + '</p>' +
          '<ul><li>' + esc(t('login.b1')) + '</li><li>' + esc(t('login.b2')) + '</li><li>' + esc(t('login.b3')) + '</li></ul></aside>' +
        '<div class="login-card"><h2>' + esc(t('login.title')) + '</h2>' +
          '<div class="tabs login-tabs" role="tablist"><button type="button" role="tab" data-ltab="officer" aria-selected="' + (loginTab === 'officer') + '">' + esc(t('login.officerTab')) + '</button>' +
          '<button type="button" role="tab" data-ltab="citizen" aria-selected="' + (loginTab === 'citizen') + '">' + esc(t('login.citizenTab')) + '</button></div>' +
          (loginTab === 'officer' ? officerForm : citizenForm) +
          '<p class="hint">' + esc(t('login.noNeed')) + ' <a href="#/check">' + esc(t('nav.check')) + '</a> · <a href="#/verify">' + esc(t('nav.verify')) + '</a></p>' +
        '</div></section>' +
        '<section class="panel demo-accounts" aria-labelledby="demo-h"><h2 id="demo-h">' + esc(t('login.demoTitle')) + '</h2><p class="hint">' + esc(t('login.demoLede')) + '</p>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>' + esc(t('login.role')) + '</th><th>' + esc(t('login.user')) + '</th><th>' + esc(t('login.pass')) + '</th><th></th></tr></thead><tbody>' +
          A.USERS.map(function (x) {
            return '<tr><td>' + esc(t('role.' + x.role)) + '<br><small class="muted">' + esc(t('roleCan.' + x.role)) + '</small></td><td><code>' + x.u + '</code></td><td><code>' + A.DEMO_PASSWORD + '</code></td>' +
              '<td><button class="btn small" type="button" data-fill-user="' + x.u + '">' + esc(t('login.fill')) + '</button></td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<h3>' + esc(t('login.demoCitizens')) + '</h3>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>' + esc(t('login.citizen')) + '</th><th>' + esc(t('login.nid')) + '</th><th>' + esc(t('login.dob')) + '</th><th></th></tr></thead><tbody>' +
          A.DEMO_CITIZENS.map(function (id) {
            const p = D.persons[id];
            return '<tr><td>' + esc(U.L(p)) + '<br><small class="muted">' + esc(t('login.cit.' + id)) + '</small></td><td><code>' + p.nid + '</code></td><td><code>' + p.dob + '</code></td>' +
              '<td><button class="btn small" type="button" data-fill-nid="' + id + '">' + esc(t('login.fill')) + '</button></td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<p class="hint">' + esc(t('login.demoNote')) + '</p></section>';
    },
    mount: function (q) {
      document.querySelectorAll('[data-logout]').forEach(function (b) { b.addEventListener('click', BS.app.logout); });
      const done = function () {
        const u = A.user(); citizenStep = null;
        BS.app.refreshHeader();
        location.hash = q.next ? '#/' + decodeURIComponent(q.next) : '#/' + BS.homeFor(u.role);
        U.toast(t('login.welcome', { name: U.L(u.name) }), 'ok');
      };
      document.querySelectorAll('[data-ltab]').forEach(function (b) {
        b.addEventListener('click', function () { loginTab = b.dataset.ltab; citizenStep = null; BS.app.render(); });
      });
      document.querySelectorAll('[data-fill-user]').forEach(function (b) {
        b.addEventListener('click', function () {
          loginTab = 'officer'; citizenStep = null; BS.app.render();
          document.getElementById('login-user').value = b.dataset.fillUser;
          document.getElementById('login-pass').value = A.DEMO_PASSWORD;
          const btn = document.querySelector('#officer-form button[type=submit]');
          btn.focus(); btn.classList.add('pulse');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
      document.querySelectorAll('[data-fill-nid]').forEach(function (b) {
        b.addEventListener('click', function () {
          loginTab = 'citizen'; citizenStep = null; BS.app.render();
          const p = D.persons[b.dataset.fillNid];
          document.getElementById('login-nid').value = p.nid;
          document.getElementById('login-dob').value = p.dob;
          const btn = document.querySelector('#citizen-form button[type=submit]');
          btn.focus(); btn.classList.add('pulse');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
      const of = document.getElementById('officer-form');
      if (of) of.addEventListener('submit', function (e) {
        e.preventDefault();
        if (A.login(of.user.value, of.pass.value)) done();
        else document.getElementById('login-err').textContent = t('login.wrong');
      });
      const cf = document.getElementById('citizen-form');
      if (cf) cf.addEventListener('submit', function (e) {
        e.preventDefault();
        const id = A.findCitizen(cf.nid.value, cf.dob.value);
        if (!id) { document.getElementById('login-err').textContent = t('login.nidWrong'); return; }
        citizenStep = startChallenge(id, false);
        BS.app.render();
      });
      const otpf = document.getElementById('otp-form');
      if (otpf) {
        mountDevice(citizenStep);
        document.getElementById('otp-back').addEventListener('click', function () { citizenStep = null; BS.app.render(); });
        otpf.addEventListener('submit', async function (e) {
          e.preventDefault();
          if (await checkChallenge(citizenStep, otpf.code.value.trim())) { A.loginPerson(citizenStep.person); done(); }
          else document.getElementById('login-err').textContent = t('login.codeWrong');
        });
      }
    }
  };

  /* ---------- one-time code challenge (SMS / email / authenticator) ---------- */

  // person = whose device receives the code; viaNominee = send to the nominee.
  function startChallenge(person, viaNominee) {
    const pr = E.prefs(person, ctx().state);
    const target = viaNominee && pr.nominee ? pr.nominee : person;
    const tp = E.prefs(target, ctx().state);
    const channel = viaNominee ? 'sms' : tp.consent;
    return { person: person, target: target, viaNominee: !!viaNominee, channel: channel, code: channel === 'app' && tp.totp ? null : S.otp(), secret: channel === 'app' ? tp.totp : '' };
  }
  async function checkChallenge(ch, code) {
    if (ch.channel === 'app' && ch.secret) return S.checkTotp(ch.secret, code);
    return code === ch.code;
  }

  // The "phone" that shows the code in the demo.
  function demoDevice(ch, inputId) {
    const p = D.persons[ch.target];
    const where = ch.channel === 'sms' ? t('dev.sms', { to: maskMobile(p.mobile) }) : ch.channel === 'email' ? t('dev.email', { to: p.email || '' }) : t('dev.app');
    return '<div class="device" data-device>' +
      '<p class="device-label">' + esc(t('dev.label', { name: U.L(p) })) + '</p>' +
      '<p class="device-where">' + esc(where) + '</p>' +
      '<p class="device-code"><span data-code>' + (ch.code || '······') + '</span>' + (ch.channel === 'app' ? ' <small data-secs></small>' : '') + '</p>' +
      '<button type="button" class="btn small" data-usecode="' + inputId + '">' + esc(t('dev.use')) + '</button></div>';
  }
  let deviceTimer = null;
  function mountDevice(ch) {
    clearInterval(deviceTimer);
    const box = document.querySelector('[data-device]');
    if (!box || !ch) return;
    const tick = async function () {
      if (!document.body.contains(box)) { clearInterval(deviceTimer); return; }
      if (ch.channel === 'app' && ch.secret) {
        box.querySelector('[data-code]').textContent = await S.totp(ch.secret);
        box.querySelector('[data-secs]').textContent = t('dev.secs', { n: U.num(S.secondsLeft()) });
      }
    };
    tick(); deviceTimer = setInterval(tick, 1000);
    const use = box.querySelector('[data-usecode]');
    use.addEventListener('click', function () {
      const input = document.getElementById(use.dataset.usecode);
      input.value = box.querySelector('[data-code]').textContent.trim();
      input.focus();
    });
  }
  function maskMobile(m) { return m ? m.slice(0, 3) + '•••••' + m.slice(-3) : ''; }

  // Locked screens: one click into a suitable demo account.
  V.locked = {
    render: function (q) {
      const roles = A.rolesFor(q.screen) || ['citizen'];
      const users = A.USERS.filter(function (x) { return roles.indexOf(x.role) !== -1; });
      const cits = roles.indexOf('citizen') !== -1 ? A.DEMO_CITIZENS.slice(0, 2) : [];
      return head('', t('locked.title'), t('locked.lede', { roles: roles.map(function (r) { return t('role.' + r); }).join(', ') })) +
        '<div class="table-wrap"><table class="table"><tbody>' +
        users.map(function (x) {
          return '<tr><td><strong>' + esc(t('role.' + x.role)) + '</strong><br><small class="muted">' + esc(t('roleCan.' + x.role)) + '</small></td><td><code>' + x.u + '</code> / <code>' + A.DEMO_PASSWORD + '</code></td>' +
            '<td><button type="button" class="btn primary small" data-quick="' + x.u + '">' + esc(t('login.enterAs')) + ' →</button></td></tr>';
        }).join('') +
        cits.map(function (id) {
          return '<tr><td><strong>' + esc(U.L(D.persons[id])) + '</strong><br><small class="muted">' + esc(t('role.citizen')) + '</small></td><td><code>' + D.persons[id].nid + '</code></td>' +
            '<td><button type="button" class="btn primary small" data-quickp="' + id + '">' + esc(t('login.enterAs')) + ' →</button></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="hint"><a href="#/login?next=' + encodeURIComponent(q.screen) + '">' + esc(t('locked.form')) + '</a></p>';
    },
    mount: function () {
      const after = function () { BS.app.refreshHeader(); BS.app.render(); U.toast(t('login.welcome', { name: U.L(A.user().name) }), 'ok'); };
      document.querySelectorAll('[data-quick]').forEach(function (b) {
        b.addEventListener('click', function () { A.logout(); if (A.login(b.dataset.quick, A.DEMO_PASSWORD)) after(); });
      });
      document.querySelectorAll('[data-quickp]').forEach(function (b) {
        b.addEventListener('click', function () { A.logout(); A.loginPerson(b.dataset.quickp); after(); });
      });
    }
  };

  /* =========================================================
   * SAFE SALE (Sub-Registry): NID → checks → consent → notice → deed
   * ========================================================= */

  let sale = null; // { input, step: 'checked'|'consent'|'consented', res, ch }
  const PRESETS = {
    clean: { dag: '101', sellerNid: '0001000004', buyerNid: '0001000002', area: 10, price: 900000 },
    double: { dag: '205', sellerNid: '0001000003', buyerNid: '0001000005', area: 20, price: 2600000 },
    fakeNid: { dag: '205', sellerNid: '0009999999', buyerNid: '0001000005', area: 20, price: 2600000 },
    heir: { dag: '317', sellerNid: '0001000013', buyerNid: '0001000005', area: 50, price: 4500000 },
    locked: { dag: '101', sellerNid: '0001000005', buyerNid: '0001000002', area: 5, price: 450000 },
    khas: { dag: '530', sellerNid: '0001000011', buyerNid: '0001000005', area: 15, price: 1200000 },
    mortgaged: { dag: '422', sellerNid: '0001000008', buyerNid: '0001000002', area: 40, price: 3200000 }
  };
  const PRESET_TONE = { clean: '', double: 'danger', fakeNid: 'danger', heir: 'danger', locked: 'danger', khas: 'danger', mortgaged: 'warn' };
  let draft = PRESETS.clean;

  function nidLine(nid) {
    if (!nid) return '';
    const id = E.personByNid(nid);
    if (!id) return '<span class="nid-line bad">' + esc(t('nid.notFound')) + '</span>';
    const p = D.persons[id];
    return '<span class="nid-line ok">' + esc(t('nid.found', { name: U.L(p), father: p.f ? U.L(p.f) : '—', dob: U.date(p.dob) })) + (p.died ? ' · ' + esc(t('nid.died', { date: U.date(p.died) })) : '') + '</span>';
  }

  V.register = {
    render: function () {
      return head(t('role.subreg'), t('reg.title'), t('reg2.lede')) +
        '<ol class="stepper wide">' + ['s1', 's2', 's3', 's4'].map(function (k, i) {
          const now = !sale ? 0 : sale.step === 'checked' ? 1 : sale.step === 'consented' ? 2 : 1;
          return '<li class="' + (i < now ? 'done' : i === now ? 'now' : '') + '">' + esc(t('reg2.' + k)) + '</li>';
        }).join('') + '</ol>' +
        '<div class="presets"><span>' + esc(t('common.demoCases')) + '</span>' + Object.keys(PRESETS).map(function (k) {
          return '<button class="chip ' + PRESET_TONE[k] + '" data-preset="' + k + '" type="button">' + esc(t('reg2.p.' + k)) + '</button>';
        }).join('') + '</div>' +
        '<div class="form-layout"><form class="panel form" id="reg-form" novalidate>' +
          H.field(t('common.dag'), '<select name="dag">' + H.plotOptions(draft.dag) + '</select>') +
          '<label class="field"><span>' + esc(t('reg2.sellerNid')) + '</span><input name="sellerNid" inputmode="numeric" value="' + esc(draft.sellerNid || '') + '" autocomplete="off"><span data-nidline="sellerNid">' + nidLine(draft.sellerNid) + '</span></label>' +
          '<label class="field"><span>' + esc(t('reg2.buyerNid')) + '</span><input name="buyerNid" inputmode="numeric" value="' + esc(draft.buyerNid || '') + '" autocomplete="off"><span data-nidline="buyerNid">' + nidLine(draft.buyerNid) + '</span></label>' +
          '<div class="row2">' +
            H.field(t('deed.area') + ' (' + t('unit.decimal') + ')', '<input name="area" type="number" min="0.01" step="0.01" value="' + esc(draft.area || '') + '">') +
            H.field(t('deed.price') + ' (৳)', '<input name="price" type="number" min="0" step="1000" value="' + esc(draft.price || '') + '">') +
          '</div>' +
          '<p class="hint">' + esc(t('reg2.nidHint')) + '</p>' +
          '<button class="btn primary" type="submit">' + esc(t('reg.run')) + '</button>' +
        '</form><div id="reg-result" class="result-slot" aria-live="polite">' + resultHtml() + '</div></div>' +
        '<h2 class="section-title">' + esc(t('notice.listTitle')) + '</h2>' + noticeList(true);
    },
    mount: function () {
      const f = document.getElementById('reg-form');
      ['sellerNid', 'buyerNid'].forEach(function (k) {
        f[k].addEventListener('input', function () { document.querySelector('[data-nidline="' + k + '"]').innerHTML = nidLine(f[k].value); });
      });
      document.querySelectorAll('[data-preset]').forEach(function (b) {
        b.addEventListener('click', function () {
          draft = Object.assign({}, PRESETS[b.dataset.preset]); sale = null;
          BS.app.render();
          setTimeout(function () { document.getElementById('reg-form').requestSubmit(); }, 30);
        });
      });
      f.addEventListener('submit', function (e) { e.preventDefault(); runChecks(H.readForm(f)); });
      mountResult();
      mountNoticeActions();
    }
  };

  async function runChecks(form) {
    draft = form;
    const seller = E.personByNid(form.sellerNid), buyer = E.personByNid(form.buyerNid);
    const input = { dag: form.dag, seller: seller, buyer: buyer, area: Number(form.area), price: Number(form.price) };
    const pre = [
      { key: 'nidSeller', status: seller ? 'pass' : 'fail', data: { nid: S.maskNid(form.sellerNid) } },
      { key: 'nidBuyer', status: buyer ? 'pass' : 'fail', data: { nid: S.maskNid(form.buyerNid) } }
    ];
    let res;
    if (!seller || !buyer) {
      res = { checks: pre, blocked: true };
      if (!seller) BS.store.addAlert({ time: new Date().toISOString(), type: 'FAKE_NID', dag: form.dag, detail: { nid: S.maskNid(form.sellerNid), buyer: buyer, area: input.area } });
    } else {
      res = E.checkSale(input, ctx().derived, ctx().state, ctx().integrity.ok);
      res.checks = pre.concat(res.checks);
      if (res.blocked) {
        const has = function (k) { return res.checks.some(function (c) { return c.key === k && c.status === 'fail'; }); };
        const type = has('locked') ? 'LOCKED_SALE' : has('heirShare') ? 'HEIR_OVERSALE' : has('doubleSale') ? 'DOUBLE_SALE' : has('khas') ? 'KHAS_SALE' : 'BLOCKED_SALE';
        const ds = res.checks.find(function (c) { return c.key === 'doubleSale'; });
        BS.store.addAlert({ time: new Date().toISOString(), type: type, dag: input.dag, detail: { seller: seller, buyer: buyer, area: input.area, priorDeed: ds && ds.data.prior ? ds.data.prior.deedNo : '' } });
      }
    }
    if (res.blocked) A.audit('sale.blocked', 'dag ' + form.dag);
    sale = { input: input, form: form, res: res, step: res.blocked ? 'blocked' : 'checked' };
    BS.app.refreshHeader();
    BS.app.render();
  }

  function resultHtml() {
    if (!sale) return '<p class="empty">' + esc(t('reg.empty')) + '</p>';
    const list = H.checkList(sale.res.checks);
    if (sale.step === 'blocked') return H.resultCard('bad', t('reg.blocked'), t('reg.blockedD'), list);
    const s = sale.input, pr = E.prefs(s.seller, ctx().state), sp = D.persons[s.seller];
    const warn = sale.res.checks.some(function (c) { return c.status === 'warn'; });
    let html = H.resultCard(warn ? 'warn' : 'ok', warn ? t('reg.passWarn') : t('reg.pass'), t('reg2.passD'), '<details class="raw"><summary>' + esc(t('reg2.showChecks', { n: U.num(sale.res.checks.length) })) + '</summary>' + list + '</details>');
    // Step 2: owner consent
    html += '<section class="panel consent"><h3>' + esc(t('consent.title')) + '</h3>' +
      '<p>' + esc(t('consent.lede', { name: U.L(sp) })) + (pr.abroad ? ' <span class="badge warn">' + esc(t('consent.abroad', { country: U.L(pr.abroad) })) + '</span>' : '') + '</p>' +
      '<p class="hint">' + esc(t('consent.channel', { ch: t('ch.' + pr.consent) })) + '</p>';
    if (sale.step === 'checked') {
      html += '<div class="actions"><button class="btn primary" type="button" data-consent="owner">' + esc(t('consent.ask')) + '</button>' +
        (pr.nominee ? '<button class="btn" type="button" data-consent="nominee">' + esc(t('consent.askNominee', { name: pName(pr.nominee) })) + '</button>' : '') + '</div>';
    } else if (sale.step === 'consent') {
      html += (sale.ch.viaNominee ? '<p class="match bad">' + esc(t('consent.nomineeNote', { owner: U.L(sp) })) + '</p>' : '') +
        demoDevice(sale.ch, 'consent-code') +
        '<form id="consent-form" class="inline"><input id="consent-code" inputmode="numeric" maxlength="6" placeholder="••••••" aria-label="' + esc(t('login.code')) + '"><button class="btn primary" type="submit">' + esc(t('consent.verify')) + '</button></form><p id="consent-err" class="err" role="alert"></p>';
    } else if (sale.step === 'consented') {
      html += '<p class="match ok">' + esc(t('consent.ok', { via: sale.ch.viaNominee ? t('consent.byNominee', { name: pName(sale.ch.target) }) : t('ch.' + sale.ch.channel) })) + '</p>' +
        '<p>' + esc(t('notice.explain')) + '</p>' +
        '<button class="btn primary" type="button" id="to-notice">' + esc(t('notice.publish')) + '</button>';
    }
    return html + '</section>';
  }

  function mountResult() {
    document.querySelectorAll('[data-consent]').forEach(function (b) {
      b.addEventListener('click', function () {
        sale.ch = startChallenge(sale.input.seller, b.dataset.consent === 'nominee');
        sale.step = 'consent';
        A.audit('consent.request', pName(sale.input.seller));
        BS.app.render();
      });
    });
    if (sale && sale.step === 'consent') mountDevice(sale.ch);
    const cf = document.getElementById('consent-form');
    if (cf) cf.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (await checkChallenge(sale.ch, document.getElementById('consent-code').value.trim())) {
        sale.step = 'consented'; A.audit('consent.given', pName(sale.input.seller)); BS.app.render();
      } else document.getElementById('consent-err').textContent = t('login.codeWrong');
    });
    const pub = document.getElementById('to-notice');
    if (pub) pub.addEventListener('click', async function () {
      pub.disabled = true;
      const s = sale.input, st = ctx().state;
      const id = BS.store.nextNo('notice', 'NT');
      const now = Date.now();
      const notified = whoToNotify(s);
      const n = { id: id, input: s, created: new Date(now).toISOString(), ends: new Date(now + HOURS72).toISOString(), status: 'notice', objections: [], consentVia: sale.ch.viaNominee ? 'nominee' : sale.ch.channel, notified: notified };
      st.pendingSales = st.pendingSales || [];
      st.pendingSales.unshift(n);
      await BS.store.append('NOTICE_PUBLISHED', { id: id, dag: s.dag, seller: s.seller, buyer: s.buyer, area: s.area, ends: n.ends, sellerNid: await S.nidHash(nidOf(s.seller)), consent: n.consentVia });
      A.audit('notice.publish', id);
      sale = null; draft = PRESETS.clean;
      await BS.app.refresh(); BS.app.refreshHeader(); BS.app.render();
      U.toast(t('notice.published', { id: id }), 'ok');
    });
  }

  // Who gets told about a sale: co-owners, heirs, banks holding a mortgage, the nominee.
  function whoToNotify(s) {
    const d = ctx().derived[s.dag];
    const people = {};
    Object.keys(d.deedOwners).forEach(function (id) { if (id !== s.seller) people[id] = 'coOwner'; });
    d.successions.forEach(function (b) { Object.keys(b.payload.heirs).forEach(function (id) { if (id !== s.seller) people[id] = 'heir'; }); });
    const pr = E.prefs(s.seller, ctx().state);
    if (pr.nominee) people[pr.nominee] = 'nominee';
    people[s.seller] = 'seller';
    const banks = d.mortgages.filter(function (m) { return m.active; }).map(function (m) { return m.block.payload.bank; });
    return { people: people, banks: banks };
  }

  function noticeStatus(n) {
    if (n.status !== 'notice') return n.status;
    return n.objections.some(function (o) { return !o.dismissed; }) ? 'objected' : Date.now() >= Date.parse(n.ends) ? 'ready' : 'running';
  }
  function remaining(n) {
    const ms = Math.max(0, Date.parse(n.ends) - Date.now());
    const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000);
    return t('notice.left', { h: U.num(h), m: U.num(m) });
  }

  function noticeList(asOfficer) {
    const list = (ctx().state.pendingSales || []);
    if (!list.length) return '<p class="empty">' + esc(t('notice.none')) + '</p>';
    const me = A.user();
    return list.map(function (n) {
      const s = n.input, st = noticeStatus(n);
      const mine = me && me.person && n.notified && n.notified.people[me.person] && n.notified.people[me.person] !== 'seller';
      const tone = st === 'objected' ? 'bad' : st === 'registered' ? 'ok' : st === 'blocked' || st === 'cancelled' ? 'bad' : 'warn';
      const people = Object.keys((n.notified || {}).people || {}).map(function (id) { return pName(id) + ' (' + t('notify.' + n.notified.people[id]) + ')'; });
      return '<article class="panel notice ' + tone + '">' +
        '<header><div><h3>' + esc(n.id) + ' · ' + esc(t('common.dag')) + ' ' + U.num(s.dag) + '</h3><p>' + esc(t('notice.summary', { from: pName(s.seller), to: pName(s.buyer), area: U.area(s.area) })) + '</p></div>' +
        '<span class="badge ' + (tone === 'ok' ? 'ok' : 'warn') + '">' + esc(t('notice.st.' + st)) + (st === 'running' ? ' · ' + esc(remaining(n)) : '') + '</span></header>' +
        (asOfficer || mine ? '<p class="hint">' + esc(t('notice.notified', { list: people.join(', ') + (n.notified.banks.length ? ', ' + n.notified.banks.map(U.bank).join(', ') : '') })) + '</p>' : '') +
        (n.objections.length ? '<ul class="objections">' + n.objections.map(function (o, i) {
          return '<li class="' + (o.dismissed ? 'muted' : '') + '"><strong>' + esc(pName(o.by)) + '</strong>: ' + esc(t('obj.r.' + o.reason)) + (o.dismissed ? ' · ' + esc(t('obj.dismissed')) : '') +
            (asOfficer && !o.dismissed && st !== 'registered' ? ' <button type="button" class="btn small" data-dismiss="' + n.id + '" data-i="' + i + '">' + esc(t('obj.dismiss')) + '</button>' : '') + '</li>';
        }).join('') + '</ul>' : '') +
        (n.deedNo ? '<p><a href="#/deed?no=' + encodeURIComponent(n.deedNo) + '">' + esc(t('notice.deedLink', { no: n.deedNo })) + '</a></p>' : '') +
        '<div class="actions">' +
          (asOfficer && (st === 'running' || st === 'ready') ? '<button type="button" class="btn primary" data-finalize="' + n.id + '">' + esc(st === 'ready' ? t('notice.finalize') : t('notice.skip')) + '</button>' : '') +
          (asOfficer && (st === 'running' || st === 'objected' || st === 'ready') ? '<button type="button" class="btn" data-cancel="' + n.id + '">' + esc(t('notice.cancel')) + '</button>' : '') +
          (mine && (st === 'running' || st === 'ready') ? objectForm(n) : '') +
        '</div></article>';
    }).join('');
  }

  function objectForm(n) {
    return '<form class="object-form" data-object="' + n.id + '"><select name="reason" aria-label="' + esc(t('obj.reason')) + '">' +
      ['notAgreed', 'heirNotAsked', 'dispute', 'fraud'].map(function (r) { return '<option value="' + r + '">' + esc(t('obj.r.' + r)) + '</option>'; }).join('') +
      '</select><button class="btn danger small" type="submit">' + esc(t('obj.submit')) + '</button></form>';
  }

  function mountNoticeActions() {
    const st = ctx().state;
    const find = function (id) { return st.pendingSales.find(function (n) { return n.id === id; }); };
    document.querySelectorAll('[data-finalize]').forEach(function (b) {
      b.addEventListener('click', async function () {
        b.disabled = true;
        const n = find(b.dataset.finalize);
        const res = E.checkSale(Object.assign({ noticeId: n.id }, n.input), ctx().derived, st, ctx().integrity.ok);
        if (res.blocked) { n.status = 'blocked'; BS.store.saveQueue(); U.toast(t('notice.blockedNow'), 'bad'); BS.app.render(); return; }
        const s = n.input;
        const no = BS.store.nextNo('deed', 'D');
        const today = new Date().toISOString().slice(0, 10);
        await BS.store.append('DEED_REGISTERED', { deedNo: no, dag: s.dag, seller: s.seller, buyer: s.buyer, area: Number(s.area), price: Number(s.price), date: today, office: 'subreg', kind: 'sale',
          sellerNid: await S.nidHash(nidOf(s.seller)), buyerNid: await S.nidHash(nidOf(s.buyer)), notice: n.id, consent: n.consentVia });
        await BS.store.append('ESCROW_HELD', { deedNo: no, dag: s.dag, amount: Number(s.price), bank: 'B1', buyer: s.buyer, seller: s.seller, date: today });
        const caseNo = BS.store.nextNo('mutation', 'M');
        st.mutationQueue.unshift({ caseNo: caseNo, deedNo: no, dag: s.dag, from: s.seller, to: s.buyer, area: Number(s.area), filed: today, status: 'pending' });
        n.status = 'registered'; n.deedNo = no;
        BS.store.saveQueue();
        A.audit('deed.register', no);
        await BS.app.refresh(); BS.app.refreshHeader(); BS.app.render();
        U.toast(t('reg.done', { no: no }), 'ok');
      });
    });
    document.querySelectorAll('[data-cancel]').forEach(function (b) {
      b.addEventListener('click', function () { const n = find(b.dataset.cancel); n.status = 'cancelled'; BS.store.saveQueue(); A.audit('notice.cancel', n.id); BS.app.render(); });
    });
    document.querySelectorAll('[data-dismiss]').forEach(function (b) {
      b.addEventListener('click', function () { const n = find(b.dataset.dismiss); n.objections[Number(b.dataset.i)].dismissed = true; BS.store.saveQueue(); A.audit('objection.dismiss', n.id); BS.app.render(); });
    });
    document.querySelectorAll('[data-object]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        const n = find(f.dataset.object);
        n.objections.push({ by: A.user().person, reason: f.reason.value, time: new Date().toISOString() });
        BS.store.saveQueue(); A.audit('objection.file', n.id);
        U.toast(t('obj.done'), 'ok'); BS.app.render();
      });
    });
  }

  // Public notice board.
  V.notices = {
    render: function () {
      const me = A.user();
      return head('', t('notice.boardTitle'), t('notice.boardLede')) +
        (!me ? '<p class="hint">' + esc(t('notice.loginToObject')) + ' <a href="#/login?next=notices">' + esc(t('nav.login')) + '</a></p>' : '') +
        noticeList(me && (me.role === 'subreg' || me.role === 'admin'));
    },
    mount: mountNoticeActions
  };

  /* =========================================================
   * CITIZEN: my land (+ protection settings, notices, escrow)
   * ========================================================= */

  const oldMyland = V.myland;
  let lockStep = null; // challenge while changing protection settings

  V.myland = {
    render: function () {
      const me = A.user().person, st = ctx().state;
      const pr = E.prefs(me, st), p = D.persons[me];
      const myNotices = (st.pendingSales || []).filter(function (n) { return n.notified && n.notified.people[me] && ['notice'].indexOf(n.status) !== -1; });
      const base = oldMyland.render();
      const heirOf = Object.keys(ctx().derived).filter(function (dag) { return ctx().derived[dag].successions.some(function (b) { return b.payload.heirs[me] !== undefined; }); });
      const protection = '<h2 class="section-title">' + esc(t('prot.title')) + '</h2>' +
        '<section class="panel protection">' +
          '<div class="prot-row"><div><strong>' + esc(t('prot.lock')) + '</strong><p class="hint">' + esc(t('prot.lockD')) + '</p></div>' +
            '<span class="badge ' + (pr.lock ? 'ok' : 'warn') + '">' + esc(pr.lock ? t('prot.on') : t('prot.off')) + '</span></div>' +
          '<div class="prot-row"><div><strong>' + esc(t('prot.channel')) + '</strong><p class="hint">' + esc(t('prot.channelD')) + '</p></div>' +
            '<select id="prot-channel" aria-label="' + esc(t('prot.channel')) + '">' + ['sms', 'email', 'app'].map(function (c) { return '<option value="' + c + '"' + (pr.consent === c ? ' selected' : '') + (c === 'app' && !p.totp ? ' disabled' : '') + '>' + esc(t('ch.' + c)) + '</option>'; }).join('') + '</select></div>' +
          '<div class="prot-row"><div><strong>' + esc(t('prot.nominee')) + '</strong><p class="hint">' + esc(t('prot.nomineeD')) + '</p></div>' +
            '<select id="prot-nominee" aria-label="' + esc(t('prot.nominee')) + '"><option value="">' + esc(t('prot.noNominee')) + '</option>' + Object.keys(D.persons).filter(function (id) { return id !== me && id !== 'GOV' && !D.persons[id].died; }).map(function (id) { return '<option value="' + id + '"' + (pr.nominee === id ? ' selected' : '') + '>' + esc(pName(id)) + '</option>'; }).join('') + '</select></div>' +
          (p.totp ? '<div class="prot-row"><div><strong>' + esc(t('prot.app')) + '</strong><p class="hint">' + esc(t('prot.appD')) + '</p></div>' +
            '<figure class="otp-qr">' + U.qr('otpauth://totp/BhumiSutra:' + p.nid + '?secret=' + p.totp + '&issuer=BhumiSutra', 3) + '</figure></div>' : '') +
          (lockStep ? '<div class="prot-verify"><p>' + esc(t('prot.verify')) + '</p>' + demoDevice(lockStep, 'prot-code') +
            '<form id="prot-form" class="inline"><input id="prot-code" inputmode="numeric" maxlength="6" aria-label="' + esc(t('login.code')) + '"><button class="btn primary" type="submit">' + esc(t('consent.verify')) + '</button></form><p id="prot-err" class="err" role="alert"></p></div>'
            : '<div class="actions"><button class="btn ' + (pr.lock ? '' : 'primary') + '" type="button" id="lock-btn">' + esc(pr.lock ? t('prot.unlock') : t('prot.doLock')) + '</button>' +
              '<button class="btn" type="button" id="save-prefs">' + esc(t('prot.save')) + '</button></div>') +
        '</section>';
      const notices = myNotices.length ? '<h2 class="section-title">' + esc(t('notice.mine')) + '</h2>' + myNotices.map(function (n) {
        return noticeListOne(n);
      }).join('') : '';
      const heirs = heirOf.length ? '<p class="match">' + esc(t('heir.youAre', { dags: heirOf.map(U.num).join(', ') })) + ' <a href="#/heirs?dag=' + heirOf[0] + '">' + esc(t('heir.see')) + '</a></p>' : '';
      // put notices + protection right after the page header
      const cut = base.indexOf('</header>') + 9;
      return base.slice(0, cut) + (pr.abroad ? '<p class="match">' + esc(t('prot.abroadNote', { country: U.L(pr.abroad) })) + '</p>' : '') + notices + heirs + base.slice(cut) + protection + escrowList(me);
    },
    mount: function () {
      oldMyland.mount();
      mountNoticeActions();
      const me = A.user().person, st = ctx().state;
      st.prefs = st.prefs || {};
      const sp = document.getElementById('save-prefs');
      const pending = { action: null };
      const begin = function (action) {
        pending.action = action; lockStep = startChallenge(me, false); lockStep.action = action; BS.app.render();
      };
      if (sp) sp.addEventListener('click', function () { begin({ consent: document.getElementById('prot-channel').value, nominee: document.getElementById('prot-nominee').value }); });
      const lb = document.getElementById('lock-btn');
      if (lb) lb.addEventListener('click', function () { begin({ lock: !E.prefs(me, st).lock }); });
      if (lockStep) {
        mountDevice(lockStep);
        document.getElementById('prot-form').addEventListener('submit', async function (e) {
          e.preventDefault();
          if (!(await checkChallenge(lockStep, document.getElementById('prot-code').value.trim()))) { document.getElementById('prot-err').textContent = t('login.codeWrong'); return; }
          st.prefs[me] = Object.assign({}, st.prefs[me] || {}, lockStep.action);
          if (lockStep.action.lock !== undefined) {
            await BS.store.append('LAND_LOCK', { owner: await S.nidHash(D.persons[me].nid), lock: lockStep.action.lock, date: new Date().toISOString().slice(0, 10) });
          }
          BS.store.saveQueue();
          A.audit(lockStep.action.lock === undefined ? 'prefs.save' : lockStep.action.lock ? 'lock.on' : 'lock.off', '');
          lockStep = null;
          await BS.app.refresh(); BS.app.refreshHeader(); BS.app.render();
          U.toast(t('prot.saved'), 'ok');
        });
      }
    }
  };
  function noticeListOne(n) {
    const keep = ctx().state.pendingSales;
    ctx().state.pendingSales = [n];
    const html = noticeList(false);
    ctx().state.pendingSales = keep;
    return html;
  }
  function escrowList(me) {
    const rows = [];
    Object.keys(ctx().derived).forEach(function (dag) {
      const es = ctx().derived[dag].escrows;
      Object.keys(es).forEach(function (no) { const e = es[no]; if (e.held.payload.buyer === me || e.held.payload.seller === me) rows.push(e); });
    });
    if (!rows.length) return '';
    return '<h2 class="section-title">' + esc(t('escrow.title')) + '</h2><div class="table-wrap"><table class="table"><thead><tr><th>' + esc(t('deed.no')) + '</th><th>' + esc(t('escrow.amount')) + '</th><th>' + esc(t('desk.status')) + '</th></tr></thead><tbody>' +
      rows.map(function (e) { return '<tr><td>' + esc(e.held.payload.deedNo) + '</td><td>' + U.money(e.held.payload.amount) + '</td><td>' + esc(t('escrow.' + e.status)) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }

  /* =========================================================
   * HEIR PROTECTION (faraiz)
   * ========================================================= */

  let heirForm = { deceased: 'male', wives: 1, husband: 0, sons: 2, daughters: 1, father: 0, mother: 0, area: 50 };

  function fraction(x) {
    for (let d = 1; d <= 400; d++) { const n = Math.round(x * d); if (Math.abs(n / d - x) < 1e-9) return U.num(n) + '/' + U.num(d); }
    return U.num((x * 100).toFixed(2)) + '%';
  }

  V.heirs = {
    render: function (q) {
      let recorded = '';
      if (q.dag && ctx().derived[q.dag] && ctx().derived[q.dag].successions.length) {
        const b = ctx().derived[q.dag].successions[0].payload;
        recorded = '<section class="panel"><h2>' + esc(t('heir.recorded', { dag: U.num(q.dag) })) + '</h2>' +
          '<p>' + esc(t('heir.recordedD', { name: pName(b.deceased), date: U.date(b.died), ref: b.ref })) + '</p>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>' + esc(t('heir.heir')) + '</th><th class="num">' + esc(t('heir.land')) + '</th><th>' + esc(t('heir.holds')) + '</th></tr></thead><tbody>' +
          Object.keys(b.heirs).map(function (id) { return '<tr><td>' + esc(pName(id)) + '</td><td class="num">' + U.area(b.heirs[id]) + '</td><td>' + esc(U.area(ctx().derived[q.dag].deedOwners[id] || 0)) + '</td></tr>'; }).join('') +
          '</tbody></table></div><p class="hint">' + esc(t('heir.rule')) + '</p></section>';
      }
      const f = heirForm;
      const r = E.faraiz(f);
      const num = function (name, label, max) { return '<label class="field"><span>' + esc(label) + '</span><input type="number" min="0" max="' + max + '" name="' + name + '" value="' + f[name] + '"></label>'; };
      return head(t('heir.kicker'), t('heir.title'), t('heir.lede')) + recorded +
        '<div class="form-layout"><form class="panel form" id="heir-form">' +
          '<fieldset class="seg"><legend>' + esc(t('heir.deceased')) + '</legend>' +
            '<label><input type="radio" name="deceased" value="male"' + (f.deceased === 'male' ? ' checked' : '') + '> ' + esc(t('heir.male')) + '</label>' +
            '<label><input type="radio" name="deceased" value="female"' + (f.deceased === 'female' ? ' checked' : '') + '> ' + esc(t('heir.female')) + '</label></fieldset>' +
          '<div class="row2">' + (f.deceased === 'male' ? num('wives', t('heir.wives'), 4) : '<label class="field"><span>' + esc(t('heir.husband')) + '</span><select name="husband"><option value="0">' + esc(t('heir.no')) + '</option><option value="1"' + (f.husband ? ' selected' : '') + '>' + esc(t('heir.yes')) + '</option></select></label>') +
            num('area', t('heir.area'), 100000) + '</div>' +
          '<div class="row2">' + num('sons', t('heir.sons'), 20) + num('daughters', t('heir.daughters'), 20) + '</div>' +
          '<div class="row2"><label class="field"><span>' + esc(t('heir.father')) + '</span><select name="father"><option value="0">' + esc(t('heir.no')) + '</option><option value="1"' + (f.father ? ' selected' : '') + '>' + esc(t('heir.yes')) + '</option></select></label>' +
            '<label class="field"><span>' + esc(t('heir.mother')) + '</span><select name="mother"><option value="0">' + esc(t('heir.no')) + '</option><option value="1"' + (f.mother ? ' selected' : '') + '>' + esc(t('heir.yes')) + '</option></select></label></div>' +
        '</form><section class="panel"><h2>' + esc(t('heir.result')) + '</h2>' +
          (r.empty ? '<p class="empty">' + esc(t('heir.none')) + '</p>' :
          '<div class="table-wrap"><table class="table"><thead><tr><th>' + esc(t('heir.heir')) + '</th><th class="num">' + esc(t('heir.each')) + '</th><th class="num">' + esc(t('heir.eachLand')) + '</th><th>' + esc(t('heir.basis')) + '</th></tr></thead><tbody>' +
          r.rows.map(function (x) {
            return '<tr><td>' + esc(t('heir.w.' + x.who)) + (x.count > 1 ? ' × ' + U.num(x.count) : '') + '</td><td class="num">' + fraction(x.each) + '</td><td class="num">' + U.area((f.area * x.each).toFixed(2)) + '</td><td>' + esc(t('heir.b.' + x.basis.split(' ')[0]) + (x.basis.indexOf('+') !== -1 ? ' + ' + t('heir.b.residue') : '')) + '</td></tr>';
          }).join('') + '</tbody></table></div>' + (r.note ? '<p class="hint">' + esc(t('heir.note.' + r.note)) + '</p>' : '')) +
          '<p class="hint">' + esc(t('heir.scope')) + '</p></section></div>';
    },
    mount: function () {
      const f = document.getElementById('heir-form');
      f.addEventListener('change', function () {
        const v = H.readForm(f);
        heirForm = { deceased: v.deceased || f.querySelector('input[name=deceased]:checked').value, wives: +v.wives || 0, husband: +v.husband || 0, sons: +v.sons || 0, daughters: +v.daughters || 0, father: +v.father || 0, mother: +v.mother || 0, area: +v.area || 0 };
        heirForm.deceased = f.querySelector('input[name=deceased]:checked').value;
        BS.app.render();
      });
    }
  };

  /* =========================================================
   * PLOT QR SIGNBOARD
   * ========================================================= */

  V.sign = {
    render: function (q) {
      const p = E.plot(q.dag);
      if (!p) return head('', t('sf.noDag', { no: q.dag || '' }), '');
      const url = U.baseUrl() + '#/check?mouza=shaplapur&dag=' + p.dag;
      return '<div class="cert-actions no-print"><a class="btn" href="#/check?dag=' + p.dag + '">' + esc(t('cert.back')) + '</a><button class="btn primary" type="button" onclick="window.print()">' + esc(t('cert.print')) + '</button></div>' +
        '<article class="signboard"><p class="sign-top">' + esc(t('sign.top')) + '</p>' +
        '<h1>' + esc(t('sign.title')) + '</h1>' +
        '<div class="sign-body"><figure>' + U.qr(url, 6) + '</figure><div>' +
          '<p class="sign-plot">' + esc(t('common.dag')) + ' ' + U.num(p.dag) + '</p>' +
          '<p>' + esc(t('kd.mouza')) + ' ' + esc(U.L(D.location.mouza)) + ', ' + esc(t('kd.jl')) + ' ' + U.num(D.location.jl) + '<br>' + esc(U.L(D.location.upazila)) + ', ' + esc(U.L(D.location.district)) + '</p>' +
          '<ol><li>' + esc(t('sign.s1')) + '</li><li>' + esc(t('sign.s2')) + '</li><li>' + esc(t('sign.s3')) + '</li></ol></div></div>' +
        '<footer><span class="cert-mark">' + BS.app.logo() + '</span><span>' + esc(t('sign.foot')) + '</span></footer></article>' +
        '<p class="hint no-print">' + esc(t('sign.why')) + '</p>';
    }
  };

  /* =========================================================
   * SIGNED QR: works on any phone, even without the ledger
   * ========================================================= */

  V.scan = {
    render: function () {
      return head('', t('scan.title'), t('scan.lede')) + '<div id="scan-result"><p class="match">' + esc(t('scan.checking')) + '</p></div>';
    },
    mount: async function (q) {
      const out = document.getElementById('scan-result');
      let obj = null;
      try { obj = JSON.parse(S.b64uToText(q.d || '')); } catch (e) { obj = null; }
      const ok = obj && q.s && await S.verify(obj, q.s);
      if (!ok) { out.innerHTML = H.resultCard('bad', t('scan.bad'), t('scan.badD'), ''); return; }
      const chain = ctx().state.chain;
      let onLedger = null, body = '';
      if (q.k === 'deed') {
        const b = chain.find(function (x) { return x.type === 'DEED_REGISTERED' && x.payload.deedNo === obj.deedNo; });
        onLedger = b ? BS.crypto.canonical(b.payload) === BS.crypto.canonical(obj) : null;
        body = H.deedFacts(obj) + (b ? '<h3>' + esc(t('verify.after')) + '</h3>' + H.afterDeed(obj) : '');
      } else if (q.k === 'receipt') {
        const b = chain.find(function (x) { return x.type === 'LD_TAX_PAID' && x.payload.receiptNo === obj.receiptNo; });
        onLedger = b ? BS.crypto.canonical(b.payload) === BS.crypto.canonical(obj) : null;
        body = '<dl class="facts"><dt>' + esc(t('rcpt.no')) + '</dt><dd>' + esc(obj.receiptNo) + '</dd><dt>' + esc(t('rcpt.holding')) + '</dt><dd>' + U.num(obj.holding) + '</dd><dt>' + esc(t('rcpt.owner')) + '</dt><dd>' + esc(pName(obj.owner)) + '</dd><dt>' + esc(t('rcpt.amount')) + '</dt><dd>' + U.money(obj.amount) + '</dd><dt>' + esc(t('deed.date')) + '</dt><dd>' + U.date(obj.date) + '</dd></dl>';
      }
      const ledgerLine = onLedger === null ? t('scan.noLedger') : onLedger ? t('scan.ledgerOk') : t('scan.ledgerDiff');
      out.innerHTML = H.resultCard(onLedger === false ? 'bad' : 'ok', onLedger === false ? t('scan.ledgerDiffT') : t('scan.ok'), t('scan.okD'),
        '<p class="match ' + (onLedger === false ? 'bad' : 'ok') + '">' + esc(ledgerLine) + '</p>' + body);
    }
  };

  // Signed QR codes on deed certificates and tax receipts (replaces the plain QR).
  async function fillSignedQr(kind, obj) {
    const slot = document.querySelector('.cert-qr');
    if (!slot) return;
    const url = await S.signedLink(kind, obj);
    slot.innerHTML = U.qr(url, 3) + '<figcaption>' + esc(t('scan.qrCaption')) + '</figcaption>';
  }
  const oldDeed = V.deed;
  V.deed = {
    render: function (q) {
      const html = oldDeed.render(q);
      const b = H.findDeed(q.no || '');
      if (!b) return html;
      const es = ctx().derived[b.payload.dag] && ctx().derived[b.payload.dag].escrows[b.payload.deedNo];
      const extra = es ? '<p class="match ' + (es.status === 'released' ? 'ok' : '') + '">' + esc(t('escrow.cert.' + es.status, { bank: U.bank(es.held.payload.bank) })) + '</p>' : '';
      return html.replace('</article>', extra + '</article>');
    },
    mount: function (q) { oldDeed.mount(q); const b = H.findDeed(q.no || ''); if (b) fillSignedQr('deed', b.payload); }
  };
  const oldReceipt = V.receipt;
  V.receipt = {
    render: oldReceipt.render,
    mount: function (q) {
      const b = ctx().state.chain.find(function (x) { return x.type === 'LD_TAX_PAID' && x.payload.receiptNo === q.no; });
      if (b) fillSignedQr('receipt', b.payload);
    }
  };

  BS.v3 = { startChallenge: startChallenge, checkChallenge: checkChallenge, demoDevice: demoDevice, mountDevice: mountDevice };
})();
