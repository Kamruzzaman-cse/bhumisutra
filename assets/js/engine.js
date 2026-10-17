/*
 * engine.js — the rules.
 *
 * derive(): replays the ledger to find, for every plot,
 *   - deedOwners:   who owns it according to registered deeds
 *   - recordOwners: who it is recorded to after approved e-Mutation
 *   - active mortgages, deeds, mutations
 * checkSale() / checkMortgage(): the automatic checks a Sub-Registry office
 *   or a bank runs before accepting a transaction.
 * assess(): the "Check before you buy" safety score for a citizen.
 * khatianIssues(): finds mismatches between CS, SA, RS and BS records.
 */
window.BS = window.BS || {};

BS.engine = (function () {
  const D = BS.DATA;
  const EPS = 0.0001;

  function plot(dag) { return D.plots.find(function (p) { return p.dag === dag; }); }

  function transfer(map, from, to, area) {
    map[from] = (map[from] || 0) - area;
    if (map[from] <= EPS) delete map[from];
    map[to] = (map[to] || 0) + area;
  }

  function derive(chain) {
    const plots = {};
    D.plots.forEach(function (p) {
      plots[p.dag] = {
        deedOwners: Object.assign({}, p.bsOwners),
        recordOwners: Object.assign({}, p.bsOwners),
        deeds: [], mutations: [], mortgages: []
      };
    });
    chain.forEach(function (b) {
      const s = b.payload && plots[b.payload.dag];
      if (!s) return;
      if (b.type === 'DEED_REGISTERED') {
        transfer(s.deedOwners, b.payload.seller, b.payload.buyer, Number(b.payload.area));
        s.deeds.push(b);
      } else if (b.type === 'MUTATION_APPROVED') {
        transfer(s.recordOwners, b.payload.from, b.payload.to, Number(b.payload.area));
        s.mutations.push(b);
      } else if (b.type === 'MORTGAGE_CREATED') {
        s.mortgages.push({ block: b, active: true });
      } else if (b.type === 'MORTGAGE_RELEASED') {
        s.mortgages.forEach(function (m) { if (m.block.payload.ref === b.payload.ref) { m.active = false; m.released = b; } });
      }
    });
    return plots;
  }

  function sameOwners(a, b) {
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    if (ka.join() !== kb.join()) return false;
    return ka.every(function (k) { return Math.abs(a[k] - b[k]) < EPS; });
  }

  function caseFor(dag) { return D.courtCases.find(function (c) { return c.dag === dag && c.status === 'pending'; }); }
  function khasFor(dag) { return D.khasRegister.find(function (k) { return k.dag === dag; }); }
  function acqFor(dag) { return D.acquisitions.find(function (a) { return a.dag === dag; }); }

  // Mismatches between consecutive survey records of one plot.
  function khatianIssues(p) {
    const issues = [];
    for (let i = 1; i < p.khatians.length; i++) {
      const prev = p.khatians[i - 1], cur = p.khatians[i];
      if (cur.owner.en !== prev.owner.en && !cur.basis) {
        issues.push({ kind: 'name', survey: cur.survey, prevSurvey: prev.survey, from: prev.owner, to: cur.owner });
      }
      if (Math.abs(cur.area - prev.area) > EPS) {
        issues.push({ kind: 'area', survey: cur.survey, prevSurvey: prev.survey, from: prev.area, to: cur.area });
      }
    }
    return issues;
  }

  // Registration vs mutation mismatch: deeds say one thing, records another.
  function pendingMutation(dag, queue) {
    return queue.filter(function (q) { return q.dag === dag && q.status === 'pending'; });
  }

  /* ---------- Land Development Tax ---------- */

  // Fiscal year starts 1 July. Returns the start year, e.g. 2026 for 2026-27.
  function currentFY(now) {
    const d = now || new Date();
    return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  }
  function holdingStatus(h, chain) {
    let paidTo = h.paidTo || 0;
    chain.forEach(function (b) {
      if (b.type === 'LD_TAX_PAID' && b.payload.holding === h.no) paidTo = Math.max(paidTo, Number(b.payload.paidTo));
    });
    if (h.exempt) return { exempt: true, dueYears: 0, due: 0, paidTo: paidTo };
    const dueYears = Math.max(0, currentFY() - paidTo);
    return { exempt: false, dueYears: dueYears, due: dueYears * h.annual, paidTo: paidTo };
  }
  function holdingFor(dag, person) {
    return D.holdings.find(function (h) { return h.owner === person && h.dags.indexOf(dag) !== -1; });
  }
  function holdingsForDag(dag) {
    return D.holdings.filter(function (h) { return h.dags.indexOf(dag) !== -1; });
  }

  /*
   * Citizen safety score. Starts at 100; each risk takes points away.
   * 80+ = safe to proceed, 50–79 = check carefully, below 50 = do not buy.
   */
  function assess(dag, derived, state, integrityOk) {
    const s = derived[dag];
    const p = plot(dag);
    const f = [];
    if (!integrityOk) f.push({ key: 'integrity', points: 100, sev: 'danger' });
    const khas = khasFor(dag);
    if (khas) f.push({ key: 'khas', points: 100, sev: 'danger', ref: khas.ref });
    const acq = acqFor(dag);
    if (acq) f.push({ key: 'acquisition', points: 60, sev: 'danger', ref: acq.ref, extra: acq });
    const cc = caseFor(dag);
    if (cc) f.push({ key: 'case', points: 45, sev: 'danger', ref: cc.no, extra: cc });
    const mort = s.mortgages.filter(function (m) { return m.active; });
    if (mort.length) f.push({ key: 'mortgage', points: 30, sev: 'warn', extra: mort[0].block.payload });
    if (!sameOwners(s.deedOwners, s.recordOwners)) f.push({ key: 'notMutated', points: 25, sev: 'warn' });
    const ki = khatianIssues(p);
    if (ki.length) f.push({ key: 'khatian', points: Math.min(25, ki.length * 10), sev: 'warn', extra: ki });
    const taxDue = holdingsForDag(dag).map(function (h) { return holdingStatus(h, state.chain); }).filter(function (x) { return x.due > 0; });
    if (taxDue.length) f.push({ key: 'taxDue', points: 5, sev: 'warn', extra: taxDue[0] });
    const attempts = state.alerts.filter(function (a) { return a.dag === dag; });
    if (attempts.length) f.push({ key: 'attempts', points: 10, sev: 'warn', extra: attempts.length });
    const lost = f.reduce(function (n, x) { return n + x.points; }, 0);
    const score = Math.max(0, 100 - lost);
    const level = score >= 80 ? 'safe' : score >= 50 ? 'caution' : 'danger';
    return { score: score, level: level, factors: f };
  }

  /*
   * Checks before a sale deed is registered.
   * status: 'pass' | 'warn' | 'fail'. Any 'fail' blocks the registration.
   */
  function checkSale(input, derived, state, integrityOk) {
    const s = derived[input.dag];
    const area = Number(input.area);
    const checks = [];
    const add = function (key, status, data) { checks.push({ key: key, status: status, data: data || {} }); };

    add('integrity', integrityOk ? 'pass' : 'fail');
    add('distinctParties', input.seller && input.buyer && input.seller !== input.buyer ? 'pass' : 'fail');
    add('validArea', area > 0 ? 'pass' : 'fail');

    const held = s.deedOwners[input.seller] || 0;
    if (held + EPS >= area) {
      add('ownership', 'pass', { held: held });
    } else {
      // Did the seller own it before and already sell it? That is a double sale.
      const prior = s.deeds.filter(function (d) { return d.payload.seller === input.seller; }).pop();
      add(prior ? 'doubleSale' : 'ownership', 'fail', { held: held, prior: prior && prior.payload });
    }

    const recHeld = s.recordOwners[input.seller] || 0;
    add('mutationRecord', recHeld + EPS >= area ? 'pass' : 'warn', { held: recHeld });

    const khas = khasFor(input.dag);
    add('khas', khas ? 'fail' : 'pass', khas);
    const acq = acqFor(input.dag);
    add('acquisition', acq ? 'fail' : 'pass', acq);
    const cc = caseFor(input.dag);
    add('case', cc ? 'fail' : 'pass', cc);
    const mort = s.mortgages.filter(function (m) { return m.active && m.block.payload.owner === input.seller; });
    add('mortgage', mort.length ? 'fail' : 'pass', mort[0] && mort[0].block.payload);
    const ki = khatianIssues(plot(input.dag));
    add('khatian', ki.length ? 'warn' : 'pass', { count: ki.length });

    const h = holdingFor(input.dag, input.seller);
    if (!h) add('noHolding', 'warn');
    else {
      const ts = holdingStatus(h, state.chain);
      if (ts.exempt) add('taxExempt', 'pass', { holding: h.no });
      else if (ts.due > 0) add('taxDue', 'fail', { holding: h.no, amount: ts.due, years: ts.dueYears });
      else add('taxPaid', 'pass', { holding: h.no });
    }

    const blocked = checks.some(function (c) { return c.status === 'fail'; });
    return { checks: checks, blocked: blocked };
  }

  function checkMortgage(input, derived, integrityOk) {
    const s = derived[input.dag];
    const checks = [];
    const add = function (key, status, data) { checks.push({ key: key, status: status, data: data || {} }); };
    add('integrity', integrityOk ? 'pass' : 'fail');
    const held = s.deedOwners[input.owner] || 0;
    add('borrowerOwns', held > EPS ? 'pass' : 'fail', { held: held });
    const recHeld = s.recordOwners[input.owner] || 0;
    add('borrowerRecord', recHeld > EPS ? 'pass' : 'warn', { held: recHeld });
    const active = s.mortgages.filter(function (m) { return m.active; });
    add(active.length ? 'doubleMortgage' : 'mortgage', active.length ? 'fail' : 'pass', active[0] && active[0].block.payload);
    const khas = khasFor(input.dag);
    add('khas', khas ? 'fail' : 'pass', khas);
    const acq = acqFor(input.dag);
    add('acquisition', acq ? 'fail' : 'pass', acq);
    const cc = caseFor(input.dag);
    add('case', cc ? 'fail' : 'pass', cc);
    return { checks: checks, blocked: checks.some(function (c) { return c.status === 'fail'; }), held: held };
  }

  // Checks the AC Land office sees for an e-Mutation application.
  function checkMutation(app, chain, derived) {
    const deedBlock = chain.find(function (b) { return b.type === 'DEED_REGISTERED' && b.payload.deedNo === app.deedNo; });
    const checks = [];
    checks.push({ key: 'deedOnLedger', status: deedBlock ? 'pass' : 'fail' });
    if (deedBlock) {
      const p = deedBlock.payload;
      checks.push({ key: 'partiesMatch', status: p.seller === app.from && p.buyer === app.to ? 'pass' : 'fail' });
      checks.push({ key: 'areaMatch', status: Math.abs(Number(p.area) - Number(app.area)) < EPS ? 'pass' : 'fail' });
      const recHeld = derived[app.dag].recordOwners[app.from] || 0;
      checks.push({ key: 'sellerRecorded', status: recHeld + EPS >= Number(app.area) ? 'pass' : 'fail', data: { held: recHeld } });
    }
    return { checks: checks, blocked: checks.some(function (c) { return c.status === 'fail'; }), deedBlock: deedBlock };
  }

  // Compare an uploaded deed against the ledger, field by field.
  function diffDeed(fileDeed, ledgerDeed) {
    const keys = Array.from(new Set(Object.keys(fileDeed).concat(Object.keys(ledgerDeed))));
    return keys.filter(function (k) { return BS.crypto.canonical(fileDeed[k]) !== BS.crypto.canonical(ledgerDeed[k]); })
      .map(function (k) { return { field: k, file: fileDeed[k], ledger: ledgerDeed[k] }; });
  }

  return {
    plot: plot, derive: derive, assess: assess, checkSale: checkSale, checkMortgage: checkMortgage,
    checkMutation: checkMutation, khatianIssues: khatianIssues, pendingMutation: pendingMutation,
    sameOwners: sameOwners, currentFY: currentFY, holdingStatus: holdingStatus, holdingFor: holdingFor, holdingsForDag: holdingsForDag, caseFor: caseFor, khasFor: khasFor, acqFor: acqFor, diffDeed: diffDeed
  };
})();
