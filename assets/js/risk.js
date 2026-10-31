/*
 * risk.js — AI-assisted fraud risk score for a sale (explainable).
 *
 * The rule checks in engine.js answer yes/no questions ("is this a double
 * sale?"). Real fraud often passes every rule: the papers are in order, but
 * the pattern is wrong. This module looks for those patterns.
 *
 * Model: a logistic score over behavioural signals, each with a weight.
 *   z     = BIAS + Σ (weight_i × strength_i)       strength_i ∈ [0, 1]
 *   risk  = 100 × sigmoid(z)
 * Every signal that fires is returned with its contribution, so an officer
 * sees WHY a sale is risky, not just a number (explainable AI).
 *
 * Honest scope: the weights below are set by hand from known Bangladeshi
 * land-fraud patterns (see README). In production, the same features would
 * be fed to a model trained on the ledger's history of blocked and
 * objected-to sales, and the weights learned from that data.
 *
 * Signals:
 *   underpriced   price per decimal far below this mouza's median
 *   overpriced    price far above it (possible money laundering)
 *   quickFlip     seller acquired this plot only recently
 *   afterDeath    plot inherited recently (heir fraud window)
 *   sellerBurst   seller has several sales in the last 30 days
 *   buyerBurst    buyer is buying many plots quickly (land grabbing)
 *   buyerNetwork  buyer appears in earlier blocked fraud attempts
 *   sellerFlagged seller appears in earlier blocked fraud attempts
 *   abroad        seller lives abroad (common impersonation target)
 *   wholePlot     seller is selling everything they hold on this plot
 */
window.BS = window.BS || {};

BS.risk = (function () {
  const D = BS.DATA;
  const DAY = 86400000;
  const BIAS = -3.2;
  const WEIGHTS = {
    underpriced: 2.6, overpriced: 1.2, quickFlip: 1.8, afterDeath: 1.4,
    sellerBurst: 1.6, buyerBurst: 1.4, buyerNetwork: 2.2, sellerFlagged: 2.0,
    abroad: 0.6, wholePlot: 0.4
  };

  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function daysSince(dateStr, now) { return (now - new Date(dateStr).getTime()) / DAY; }

  function deedsInChain(chain) {
    return chain.filter(function (b) { return b.type === 'DEED_REGISTERED' && b.payload; });
  }

  // Median price per decimal from every registered sale in the ledger.
  function marketRate(chain) {
    const rates = deedsInChain(chain)
      .filter(function (b) { return Number(b.payload.price) > 0 && Number(b.payload.area) > 0; })
      .map(function (b) { return Number(b.payload.price) / Number(b.payload.area); })
      .sort(function (a, b) { return a - b; });
    if (!rates.length) return 0;
    const m = Math.floor(rates.length / 2);
    return rates.length % 2 ? rates[m] : (rates[m - 1] + rates[m]) / 2;
  }

  /*
   * input: { dag, seller, buyer, area, price }
   * returns { score 0–100, level 'low'|'medium'|'high', signals: [{ key, contribution, data }] }
   */
  function score(input, derived, state, nowMs) {
    const now = nowMs || Date.now();
    const chain = state.chain;
    const s = derived[input.dag];
    const signals = [];
    const add = function (key, strength, data) {
      strength = clamp01(strength);
      if (strength <= 0) return;
      signals.push({ key: key, strength: strength, contribution: WEIGHTS[key] * strength, data: data || {} });
    };

    // 1. Price compared with the local market.
    const median = marketRate(chain);
    const area = Number(input.area), price = Number(input.price);
    if (median > 0 && area > 0 && price > 0) {
      const ratio = (price / area) / median;
      if (ratio < 0.7) add('underpriced', (0.7 - ratio) / 0.45, { pct: Math.round((1 - ratio) * 100), rate: Math.round(price / area), median: Math.round(median) });
      if (ratio > 2.5) add('overpriced', (ratio - 2.5) / 2, { times: Math.round(ratio * 10) / 10, rate: Math.round(price / area), median: Math.round(median) });
    }

    // 2. How and when the seller got this plot.
    if (s) {
      const bought = s.deeds.filter(function (b) { return b.payload.buyer === input.seller; }).pop();
      if (bought) {
        const d = daysSince(bought.payload.date, now);
        if (d < 180) add('quickFlip', (180 - d) / 150, { days: Math.max(0, Math.round(d)), deedNo: bought.payload.deedNo });
      }
      const inherited = s.successions.filter(function (b) { return b.payload.heirs[input.seller] !== undefined; }).pop();
      if (inherited) {
        const d = daysSince(inherited.payload.died || inherited.payload.date, now);
        if (d < 1095) add('afterDeath', (1095 - d) / 900, { days: Math.max(0, Math.round(d)) });
      }
      const held = s.deedOwners[input.seller] || 0;
      if (held > 0 && area >= held - 0.0001) add('wholePlot', 1, { held: held });
    }

    // 3. Velocity: many deals in a short time.
    const deeds = deedsInChain(chain);
    const pending = (state.pendingSales || []).filter(function (n) { return n.status === 'notice'; });
    const sellerRecent = deeds.filter(function (b) { return b.payload.seller === input.seller && daysSince(b.payload.date, now) <= 30; }).length +
      pending.filter(function (n) { return n.input.seller === input.seller; }).length;
    if (sellerRecent >= 1) add('sellerBurst', sellerRecent / 2, { n: sellerRecent });
    const buyerRecent = deeds.filter(function (b) { return b.payload.buyer === input.buyer && daysSince(b.payload.date, now) <= 90; }).length +
      pending.filter(function (n) { return n.input.buyer === input.buyer; }).length;
    if (buyerRecent >= 2) add('buyerBurst', (buyerRecent - 1) / 2, { n: buyerRecent });

    // 4. Links to earlier blocked fraud attempts (a simple fraud network).
    const alerts = state.alerts || [];
    const buyerHits = alerts.filter(function (a) { return a.detail && a.detail.buyer === input.buyer; }).length;
    if (buyerHits) add('buyerNetwork', buyerHits / 2, { n: buyerHits });
    const sellerHits = alerts.filter(function (a) { return a.detail && a.detail.seller === input.seller; }).length;
    if (sellerHits) add('sellerFlagged', sellerHits / 2, { n: sellerHits });

    // 5. Seller profile.
    const p = D.persons[input.seller] || {};
    if (p.abroad) add('abroad', 1, { country: p.abroad });

    const z = BIAS + signals.reduce(function (n, x) { return n + x.contribution; }, 0);
    const value = Math.round(100 * sigmoid(z));
    signals.sort(function (a, b) { return b.contribution - a.contribution; });
    return { score: value, level: value >= 60 ? 'high' : value >= 30 ? 'medium' : 'low', signals: signals, median: Math.round(median) };
  }

  return { score: score, marketRate: marketRate, WEIGHTS: WEIGHTS };
})();
