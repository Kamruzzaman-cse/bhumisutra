/*
 * ui.js — small helpers shared by every screen:
 * translation, Bangla digits, money/area/date formatting, QR codes,
 * toast messages and escaping user-supplied text.
 */
window.BS = window.BS || {};

BS.ui = (function () {
  const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
  const MONTHS = {
    bn: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  };

  let lang = 'bn';
  try { lang = localStorage.getItem('bhumisutra.lang') || 'bn'; } catch (e) { /* default */ }

  function setLang(l) {
    lang = l;
    try { localStorage.setItem('bhumisutra.lang', l); } catch (e) { /* ignore */ }
    document.documentElement.lang = l;
  }
  function getLang() { return lang; }

  // Translate a key. {name} placeholders are filled from vars.
  function t(key, vars) {
    const dict = BS.I18N[lang] || {};
    let s = dict[key];
    if (s === undefined) s = (BS.I18N.en || {})[key];
    if (s === undefined) s = key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }

  function L(obj) { return obj ? (obj[lang] || obj.en || '') : ''; }

  function digits(s) {
    s = String(s);
    return lang === 'bn' ? s.replace(/[0-9]/g, function (d) { return BN_DIGITS[d]; }) : s;
  }

  // 1500000 -> 15,00,000 (South Asian grouping)
  function group(n) {
    const neg = n < 0; n = Math.abs(Math.round(n));
    const s = String(n);
    if (s.length <= 3) return (neg ? '-' : '') + s;
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return (neg ? '-' : '') + rest + ',' + last3;
  }

  function num(n) { return digits(n); }
  function money(n) { return '৳ ' + digits(group(Number(n) || 0)); }
  function area(n) { return digits(Math.round(Number(n) * 100) / 100) + ' ' + t('unit.decimal'); }

  function date(iso) {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
    if (isNaN(d)) return esc(iso);
    return digits(d.getUTCDate()) + ' ' + MONTHS[lang][d.getUTCMonth()] + ' ' + digits(d.getUTCFullYear());
  }
  function dateTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return esc(iso);
    const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
    return digits(d.getDate()) + ' ' + MONTHS[lang][d.getMonth()] + ' ' + digits(d.getFullYear()) + ', ' + digits(hh + ':' + mm);
  }

  function person(id) { const p = BS.DATA.persons[id]; return p ? L(p) : esc(id); }
  function bank(id) { const b = BS.DATA.banks[id]; return b ? L(b) : esc(id); }
  function owners(map) {
    const ids = Object.keys(map);
    if (!ids.length) return '—';
    return ids.map(function (id) { return person(id) + ' (' + area(map[id]) + ')'; }).join(', ');
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function shortHash(h) { return h ? h.slice(0, 10) + '…' + h.slice(-6) : ''; }

  // QR code as inline SVG, made locally (assets/vendor/qrcode.js, MIT).
  function qr(text, cell) {
    if (typeof qrcode !== 'function') return '<p class="muted">' + esc(text) + '</p>';
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    return q.createSvgTag({ cellSize: cell || 4, margin: 2, scalable: true });
  }

  let toastTimer = null;
  function toast(msg, kind) {
    const el = document.getElementById('toast');
    el.className = 'toast show ' + (kind || '');
    el.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, 3600);
  }

  function baseUrl() { return location.href.split('#')[0]; }

  return {
    t: t, L: L, num: num, money: money, area: area, date: date, dateTime: dateTime,
    person: person, bank: bank, owners: owners, esc: esc, shortHash: shortHash, qr: qr,
    toast: toast, setLang: setLang, getLang: getLang, digits: digits, baseUrl: baseUrl
  };
})();
