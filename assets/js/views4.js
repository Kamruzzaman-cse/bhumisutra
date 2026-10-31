/*
 * views4.js — USSD service (*123#) for people without a smartphone.
 *
 * A simulated feature phone on screen. Dial *123# and use number menus,
 * the way bKash works on any basic phone:
 *   1. Land info by plot (dag) number: owners, safety score, warnings
 *   2. Verify a deed by its number
 *   3. My land (by the caller's registered mobile number)
 *   4. Sale notices about my land, and file an objection
 *   5. Lock / unlock my land with a PIN
 *
 * Everything reads and writes the same ledger and state as the web app, so
 * an objection filed from the "phone" appears on the Sub-Registry notice
 * board (and syncs to other open tabs, see sync.js).
 *
 * In production this runs as a USSD gateway at the mobile operators (the
 * same channel bKash and Nagad use). The caller is identified by the SIM's
 * number, which in Bangladesh is already registered against the owner's NID
 * (biometric SIM registration). Replies stay under ~160 characters a screen.
 */
(function () {
  const U = BS.ui, E = BS.engine, D = BS.DATA, A = BS.auth, S = BS.sec;
  const t = U.t, esc = U.esc;
  const V = BS.views;
  function ctx() { return BS.app.ctx; }
  const DEMO_PIN = '1234';

  // Callers: fictional people with a mobile number who are alive.
  function callers() {
    return Object.keys(D.persons).filter(function (id) { return D.persons[id].mobile && !D.persons[id].died; });
  }

  let caller = 'P08';
  let buffer = '';          // digits typed on the idle screen or as a menu answer
  let session = null;       // { text, ask: fn(input) | null, end: bool }

  /* ---------- menu screens ---------- */

  function screen(text, ask) { return { text: text, ask: ask || null, end: !ask }; }

  function mainMenu() {
    return screen(t('ussd.menu'), function (x) {
      if (x === '1') return askDag();
      if (x === '2') return askDeed();
      if (x === '3') return myLand();
      if (x === '4') return notices();
      if (x === '5') return lockMenu();
      if (x === '0') return screen(t('ussd.bye'));
      return screen(t('ussd.invalid'));
    });
  }

  function owned(id) {
    const out = [];
    Object.keys(ctx().derived).forEach(function (dag) {
      const a = ctx().derived[dag].deedOwners[id] || 0;
      if (a > 0.0001) out.push({ dag: dag, area: a });
    });
    return out;
  }

  function askDag() {
    return screen(t('ussd.askDag'), function (x) {
      const dag = x.trim();
      const d = ctx().derived[dag], a = ctx().assessments[dag];
      if (!d || !a) return screen(t('ussd.noDag', { dag: U.num(dag) }));
      const owners = Object.keys(d.deedOwners).map(function (id) { return U.person(id) + ' ' + U.area(d.deedOwners[id]); }).join(', ');
      const top = a.factors.filter(function (f) { return f.key !== 'attempts'; })[0];
      return screen(t('ussd.dagInfo', {
        dag: U.num(dag), mouza: U.L(D.location.mouza), owners: owners,
        score: U.num(a.score), level: t('ussd.level.' + a.level),
        warn: top ? t('ussd.f.' + top.key) : t('ussd.f.none')
      }));
    });
  }

  function askDeed() {
    return screen(t('ussd.askDeed'), function (x) {
      const digits = U.toLatin(x).replace(/\D/g, '');
      if (digits.length < 5) return screen(t('ussd.invalid'));
      const no = 'D-' + digits.slice(0, 4) + '-' + digits.slice(4).padStart(4, '0');
      const b = ctx().state.chain.filter(function (x) { return x.type === 'DEED_REGISTERED' && x.payload.deedNo === no; }).pop();
      if (!b) return screen(t('ussd.deedNotFound', { no: no }));
      if (!ctx().integrity.ok) return screen(t('ussd.deedChainBroken', { no: no }));
      const p = b.payload;
      return screen(t('ussd.deedOk', { no: no, dag: U.num(p.dag), from: U.person(p.seller), to: U.person(p.buyer), area: U.area(p.area), date: U.date(p.date) }));
    });
  }

  function myLand() {
    const list = owned(caller);
    if (!list.length) return screen(t('ussd.noLand', { name: U.person(caller) }));
    const locked = E.prefs(caller, ctx().state).lock;
    return screen(t('ussd.myLand', { name: U.person(caller) }) + '\n' +
      list.map(function (o) {
        const a = ctx().assessments[o.dag];
        return t('ussd.landLine', { dag: U.num(o.dag), area: U.area(o.area), level: a ? t('ussd.level.' + a.level) : '' });
      }).join('\n') + '\n' + t(locked ? 'ussd.isLocked' : 'ussd.isOpen'));
  }

  function liveNotices() {
    return (ctx().state.pendingSales || []).filter(function (n) {
      if (n.status !== 'notice') return false;
      const role = n.notified && n.notified.people && n.notified.people[caller];
      return !!role;
    });
  }

  function notices() {
    const list = liveNotices().slice(0, 3);
    if (!list.length) return screen(t('ussd.noNotices'));
    return screen(t('ussd.noticeList') + '\n' + list.map(function (n, i) {
      return (i + 1) + '. ' + t('ussd.noticeLine', { dag: U.num(n.input.dag), from: U.person(n.input.seller), to: U.person(n.input.buyer) });
    }).join('\n') + '\n0. ' + t('ussd.back'), function (x) {
      if (x === '0') return mainMenu();
      const n = list[Number(x) - 1];
      if (!n) return screen(t('ussd.invalid'));
      return noticeDetail(n);
    });
  }

  function noticeDetail(n) {
    const role = n.notified.people[caller];
    const ends = U.dateTime(n.ends);
    if (role === 'seller') {
      return screen(t('ussd.noticeMine', { id: n.id, dag: U.num(n.input.dag), to: U.person(n.input.buyer), area: U.area(n.input.area), ends: ends }));
    }
    return screen(t('ussd.noticeDetail', { id: n.id, dag: U.num(n.input.dag), from: U.person(n.input.seller), to: U.person(n.input.buyer), area: U.area(n.input.area), ends: ends }), function (x) {
      if (x === '2') return screen(t('ussd.noObjection'));
      if (x !== '1') return screen(t('ussd.invalid'));
      return screen(t('ussd.reasons'), function (r) {
        const reason = { 1: 'notAgreed', 2: 'heirNotAsked', 3: 'dispute', 4: 'fraud' }[r];
        if (!reason) return screen(t('ussd.invalid'));
        n.objections.push({ by: caller, reason: reason, time: new Date().toISOString(), via: 'ussd' });
        BS.store.saveQueue();
        A.audit('objection.file', n.id + ' · USSD');
        afterChange();
        return screen(t('ussd.objected', { id: n.id }));
      });
    });
  }

  function lockMenu() {
    if (!owned(caller).length) return screen(t('ussd.noLand', { name: U.person(caller) }));
    const locked = E.prefs(caller, ctx().state).lock;
    return screen(t(locked ? 'ussd.isLocked' : 'ussd.isOpen') + '\n1. ' + t(locked ? 'ussd.unlock' : 'ussd.lock') + '\n0. ' + t('ussd.back'), function (x) {
      if (x === '0') return mainMenu();
      if (x !== '1') return screen(t('ussd.invalid'));
      return screen(t('ussd.askPin'), function (pin) {
        if (U.toLatin(pin) !== DEMO_PIN) return screen(t('ussd.badPin'));
        const st = ctx().state;
        st.prefs = st.prefs || {};
        st.prefs[caller] = Object.assign({}, st.prefs[caller] || {}, { lock: !locked });
        S.nidHash(D.persons[caller].nid).then(function (h) {
          return BS.store.append('LAND_LOCK', { owner: h, lock: !locked, date: new Date().toISOString().slice(0, 10), via: 'ussd' });
        }).then(function () {
          A.audit(!locked ? 'lock.on' : 'lock.off', U.person(caller) + ' · USSD');
          afterChange();
        });
        return screen(t(!locked ? 'ussd.lockedNow' : 'ussd.unlockedNow'));
      });
    });
  }

  function afterChange() {
    BS.app.refresh().then(function () { BS.app.refreshHeader(); paint(); });
  }

  /* ---------- phone ---------- */

  const KEYS = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']];

  function screenHtml() {
    if (!session) {
      return '<div class="ussd-idle"><p class="ussd-op">' + esc(t('ussd.operator')) + '</p>' +
        '<p class="ussd-dial">' + esc(buffer || ' ') + '</p>' +
        '<p class="ussd-hint">' + esc(t('ussd.idleHint')) + '</p></div>';
    }
    return '<div class="ussd-msg"><p class="ussd-text">' + esc(session.text) + '</p>' +
      (session.ask ? '<p class="ussd-input"><span>' + esc(buffer) + '</span><span class="ussd-caret">▌</span></p>' : '') +
      '<p class="ussd-soft"><span>' + esc(session.ask ? t('ussd.softCancel') : '') + '</span><span>' + esc(session.ask ? t('ussd.softSend') : t('ussd.softOk')) + '</span></p></div>';
  }

  function paint() {
    const el = document.getElementById('ussd-screen');
    if (el) el.innerHTML = screenHtml();
  }

  function press(k) {
    if (k === 'send') {
      if (!session) {
        if (U.toLatin(buffer).replace(/\s/g, '') === '*123#') { buffer = ''; session = mainMenu(); A.audit('ussd.dial', U.person(caller)); }
        else if (buffer) { buffer = ''; session = screen(t('ussd.unknownCode')); }
      } else if (session.ask) {
        const answer = buffer; buffer = '';
        session = session.ask(answer);
      } else { session = null; buffer = ''; }
    } else if (k === 'end') {
      session = null; buffer = '';
    } else if (k === 'clear') {
      buffer = buffer.slice(0, -1);
    } else if (session && !session.ask) {
      session = null; buffer = '';
    } else if (buffer.length < 24) {
      buffer += k;
    }
    paint();
  }

  let keyHandler = null;

  V.ussd = {
    render: function () {
      return '<header class="page-head"><p class="kicker">' + esc(t('ussd.kicker')) + '</p><h1>' + esc(t('ussd.title')) + '</h1><p>' + esc(t('ussd.lede')) + '</p></header>' +
        '<div class="ussd-layout">' +
          '<div class="phone" role="application" aria-label="' + esc(t('ussd.phoneLabel')) + '">' +
            '<div class="phone-top"><span class="phone-speaker"></span></div>' +
            '<div class="phone-screen" id="ussd-screen" aria-live="polite">' + screenHtml() + '</div>' +
            '<div class="phone-nav">' +
              '<button type="button" class="pk call" data-k="send" aria-label="' + esc(t('ussd.send')) + '">✆</button>' +
              '<button type="button" class="pk clr" data-k="clear" aria-label="' + esc(t('ussd.clear')) + '">⌫</button>' +
              '<button type="button" class="pk end" data-k="end" aria-label="' + esc(t('ussd.end')) + '"><span class="pk-ico">✆</span></button>' +
            '</div>' +
            '<div class="phone-keys">' + KEYS.map(function (k) {
              return '<button type="button" class="pk" data-k="' + k[0] + '"><b>' + k[0] + '</b><small>' + k[1] + '</small></button>';
            }).join('') + '</div>' +
          '</div>' +
          '<div class="ussd-side">' +
            '<section class="panel"><h2>' + esc(t('ussd.callerTitle')) + '</h2>' +
              '<label class="field"><span>' + esc(t('ussd.caller')) + '</span><select id="ussd-caller">' + callers().map(function (id) {
                return '<option value="' + id + '"' + (id === caller ? ' selected' : '') + '>' + esc(U.person(id)) + ' · ' + esc(D.persons[id].mobile) + '</option>';
              }).join('') + '</select></label>' +
              '<p class="hint">' + esc(t('ussd.callerHint')) + '</p>' +
              '<div class="actions"><button type="button" class="btn primary" id="ussd-quick">' + esc(t('ussd.quick')) + '</button></div>' +
            '</section>' +
            '<section class="panel"><h2>' + esc(t('ussd.tryTitle')) + '</h2><ol class="ussd-try">' +
              ['try1', 'try2', 'try3', 'try4'].map(function (k) { return '<li>' + esc(t('ussd.' + k)) + '</li>'; }).join('') +
            '</ol></section>' +
            '<section class="panel"><h2>' + esc(t('ussd.whyTitle')) + '</h2><p>' + esc(t('ussd.why')) + '</p><p class="hint">' + esc(t('ussd.prod')) + '</p></section>' +
          '</div>' +
        '</div>';
    },
    mount: function () {
      document.querySelectorAll('.phone [data-k]').forEach(function (b) {
        b.addEventListener('click', function () { press(b.dataset.k); });
      });
      document.getElementById('ussd-caller').addEventListener('change', function () {
        caller = this.value; session = null; buffer = ''; paint();
      });
      document.getElementById('ussd-quick').addEventListener('click', function () {
        session = null; buffer = '*123#'; press('send');
      });
      if (keyHandler) document.removeEventListener('keydown', keyHandler);
      keyHandler = function (e) {
        if (!document.getElementById('ussd-screen')) { document.removeEventListener('keydown', keyHandler); keyHandler = null; return; }
        if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
        if (/^[0-9*#]$/.test(e.key)) { press(e.key); e.preventDefault(); }
        else if (e.key === 'Enter') { press('send'); e.preventDefault(); }
        else if (e.key === 'Backspace') { press('clear'); e.preventDefault(); }
        else if (e.key === 'Escape') { press('end'); }
      };
      document.addEventListener('keydown', keyHandler);
    }
  };
})();
