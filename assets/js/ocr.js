/*
 * ocr.js — read old land papers (scans or photos) and pull out the fields.
 *
 * 1. Tesseract.js (open-source OCR, Apache-2.0) runs fully inside the
 *    browser with Bangla + English language data stored in this project,
 *    so it works offline and the scan never leaves the computer.
 * 2. parse() turns the raw text into the same fields as the official
 *    khatian / deed format (mouza, JL no, khatian no, owners, dag rows …).
 * 3. Every field gets a confidence from the OCR line it came from, so the
 *    officer knows exactly what to double-check before saving.
 */
window.BS = window.BS || {};

BS.ocr = (function () {
  let workerPromise = null;

  function base() { return new URL('assets/vendor/tesseract/', location.href).href; }

  function getWorker(onProgress) {
    if (!workerPromise) {
      workerPromise = Tesseract.createWorker(['ben', 'eng'], 1, {
        workerPath: base() + 'worker.min.js',
        corePath: base() + 'core',
        langPath: base() + 'lang',
        gzip: true,
        logger: function (m) { if (onProgress) onProgress(m); }
      }).then(async function (w) {
        // PSM 4 = a single column of text of variable sizes: best for tables.
        await w.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' });
        return w;
      });
      workerPromise.catch(function () { workerPromise = null; });
    }
    return workerPromise;
  }

  /*
   * Clean the picture before reading: greyscale, stretch the contrast
   * (2nd to 98th percentile) and enlarge small photos to ~1400 px wide.
   * Helps phone photos taken in poor light; clean scans are left as they are.
   */
  function preprocess(src) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.onload = function () {
        // Only enlarge small images; big clean scans read best as they are.
        const scale = img.naturalWidth < 1000 ? Math.min(2.5, 1400 / img.naturalWidth) : 1;
        const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, 0, 0, w, h);
        const data = g.getImageData(0, 0, w, h), px = data.data;
        const hist = new Uint32Array(256);
        for (let i = 0; i < px.length; i += 4) {
          const y = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
          px[i] = y; hist[y]++;
        }
        const total = w * h; let acc = 0, lo = 0, hi = 255;
        for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.02) { lo = v; break; } }
        acc = 0;
        for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= total * 0.02) { hi = v; break; } }
        // Already high contrast and not enlarged: leave the scan untouched.
        let dark = 0, a = 0;
        for (let v = 0; v < 256; v++) { a += hist[v]; if (a >= total * 0.005) { dark = v; break; } }
        if (scale === 1 && dark < 90 && hi > 200) { resolve(src); return; }
        const span = Math.max(1, hi - lo);
        for (let i = 0; i < px.length; i += 4) {
          const y = Math.max(0, Math.min(255, Math.round((px[i] - lo) * 255 / span)));
          px[i] = px[i + 1] = px[i + 2] = y;
        }
        g.putImageData(data, 0, 0);
        resolve(c);
      };
      img.onerror = function () { resolve(src); };
      img.src = src;
    });
  }

  async function recognize(image, onProgress) {
    const w = await getWorker(onProgress);
    const input = typeof image === 'string' ? await preprocess(image) : image;
    const res = await w.recognize(input, {}, { text: true, blocks: true });
    let raw = res.data.lines || [];
    if (!raw.length && res.data.blocks) {
      res.data.blocks.forEach(function (b) {
        (b.paragraphs || []).forEach(function (p) { (p.lines || []).forEach(function (l) { raw.push(l); }); });
      });
    }
    let lines = raw.map(function (l) { return { text: l.text.trim(), conf: Math.round(l.confidence) }; })
      .filter(function (l) { return l.text; });
    if (!lines.length) {
      lines = res.data.text.split('\n').map(function (t) { return { text: t.trim(), conf: Math.round(res.data.confidence) }; })
        .filter(function (l) { return l.text; });
    }
    return { text: res.data.text, confidence: Math.round(res.data.confidence), lines: lines };
  }

  /* ---------- parsing ---------- */

  const BN = '০১২৩৪৫৬৭৮৯';
  function toLatinDigits(s) { return String(s).replace(/[০-৯]/g, function (d) { return BN.indexOf(d); }); }
  const SEP = '\\s*[:;ঃ]\\s*';
  const CLASSES = ['নাল', 'ভিটা', 'বাড়ি', 'ডাঙ্গা', 'পুকুর', 'বাগান', 'চালা', 'বাইদ', 'দোকান', 'খাস', 'রাস্তা', 'বিল'];

  // Find the first match across lines; remember that line's confidence.
  function find(lines, re, group) {
    for (const l of lines) {
      const m = l.norm.match(re);
      if (m) return { value: m[group || 1].trim(), conf: l.conf };
    }
    return null;
  }

  function surveyFrom(text, year) {
    const t = text.replace(/\s/g, '');
    if (/বি\.?এস|B\.?S/.test(t)) return { value: 'BS', conf: 90 };
    if (/আর\.?এস|R\.?S/.test(t)) return { value: 'RS', conf: 90 };
    if (/এস\.?এ|S\.?A/.test(t)) return { value: 'SA', conf: 90 };
    if (/সি\.?এস|C\.?S/.test(t)) return { value: 'CS', conf: 90 };
    // Not readable: infer from the survey year (a guess, marked low confidence).
    const y = Number(year);
    if (!y) return null;
    const v = y < 1945 ? 'CS' : y <= 1965 ? 'SA' : y <= 1990 ? 'RS' : 'BS';
    return { value: v, conf: 40, guessed: true };
  }

  function personFrom(raw) {
    // "আনোয়ার হোসেন, পিতা: জয়নাল আবেদীন, সাং: কাশফুল  0.500"
    let s = raw.replace(/^[\s>|\d.)]+/, '').replace(/^(মালিক|দাতা|গ্রহীতা)\s*[:;ঃ]\s*/, '');
    const rel = /স্বামী/.test(s) ? 'husband' : 'father';
    const name = (s.split(/[,،]/)[0] || '').trim();
    const g = s.match(/(?:পিতা|স্বামী)\s*[:;ঃ]?\s*([^,،]+)/);
    const a = s.match(/সাং\s*[:;ঃ]?\s*([^\s,،]+)/);
    const share = s.match(/(\d\.\d{3})\s*$/) || s.match(/অংশ\s*[:;ঃ]\s*(\d\.\d{3})/);
    return { name: name, guardian: g ? g[1].trim() : '', rel: rel, address: a ? a[1].trim() : '', share: share ? share[1] : '' };
  }

  function parse(ocr) {
    const lines = ocr.lines.map(function (l) { return { text: l.text, norm: toLatinDigits(l.text.normalize('NFC')), conf: l.conf }; });
    const all = lines.map(function (l) { return l.norm; }).join('\n');
    const isDeed = /দলিল/.test(all) && /(দাতা|গ্রহীতা)/.test(all);
    const f = {};
    const put = function (k, r) { if (r) f[k] = r; };

    put('district', find(lines, new RegExp('(?<!উপ)জেলা' + SEP + '([^\\s.,।|]+)')));
    put('upazila', find(lines, new RegExp('(?:উপজেলা|থানা)' + SEP + '([^\\s.,।|]+)')));
    put('mouza', find(lines, new RegExp('মৌজা' + SEP + '([^\\s.,।|]+)')));
    put('jl', find(lines, /জে\.?\s*এল\.?\s*নং\s*[:;ঃ]?\s*(\d+)/));
    put('khatianNo', find(lines, /খতিয়ান\s*নং\s*[:;ঃ]?\s*(\d+)/));
    put('year', find(lines, new RegExp('সন' + SEP + '(\\d{4})')));
    const titleLine = lines.find(function (l) { return /খতিয়ান|জরিপ/.test(l.norm); });
    put('survey', surveyFrom(titleLine ? titleLine.norm : all, f.year && f.year.value));

    if (isDeed) {
      f.kind = { value: 'deed', conf: 95 };
      put('deedNo', find(lines, /দলিল\s*নং\s*[:;ঃ]\s*([0-9A-Za-z/-]+)/));
      put('date', find(lines, /তারিখ\s*[:;ঃ]\s*([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{4})/));
      put('office', find(lines, /সাব-?রেজিস্ট্রি\s*অফিস\s*[:;ঃ]\s*([^\n|]+)/));
      const giver = lines.find(function (l) { return /^\W*দাতা\s*[:;ঃ]/.test(l.norm); });
      const taker = lines.find(function (l) { return /^\W*গ্রহীতা\s*[:;ঃ]/.test(l.norm); });
      if (giver) f.giver = { value: personFrom(giver.norm), conf: giver.conf };
      if (taker) f.taker = { value: personFrom(taker.norm), conf: taker.conf };
      put('price', find(lines, /মূল্য\s*[:;ঃ]\s*([0-9,]+)/));
      put('dag', find(lines, /দাগ\s*\S{0,2}\s*নং\s*[:;ঃ]?\s*(\d{2,6})/));
      put('area', find(lines, /জমির\s*পরিমাণ\s*[:;ঃ]\s*([0-9.]+)/));
    } else {
      f.kind = { value: 'khatian', conf: 95 };
      // Owners: lines that name a father or husband.
      f.owners = lines.filter(function (l) { return /(পিতা|স্বামী)/.test(l.norm) && !/মালিকের নাম/.test(l.norm); })
        .map(function (l) { return { value: personFrom(l.norm), conf: l.conf }; });
      // Land rows: "1021  নাল  0.4200  1.000  0.4200" or "দাগ নং 1021 নাল 0.4200 একর"
      const classRe = CLASSES.join('|');
      const rowRe = new RegExp('(?:দাগ[^\\d\\s]*\\s*)?(\\d{2,6})\\s*\\|?\\s*(' + classRe + ')\\s*\\|?\\s*([0-9]*\\.[0-9]+)(?:\\s*\\|?\\s*([0-9]*\\.[0-9]+))?(?:\\s*\\|?\\s*([0-9]*\\.[0-9]+))?');
      f.rows = [];
      lines.forEach(function (l) {
        const m = l.norm.match(rowRe);
        if (m) f.rows.push({ value: { dag: m[1], cls: m[2], total: m[3], share: m[4] || '1.000', area: m[5] || m[3] }, conf: l.conf });
      });
      put('totalArea', find(lines, /মোট\s*জমি\s*[:;ঃ]\s*([0-9.]+)/));
    }
    return f;
  }

  // Checks that need no OCR: do the numbers add up?
  function validate(rec) {
    const issues = [];
    if (rec.kind === 'khatian') {
      const shares = (rec.owners || []).reduce(function (n, o) { return n + (parseFloat(o.share) || 0); }, 0);
      if (rec.owners && rec.owners.length && Math.abs(shares - 1) > 0.001) issues.push({ key: 'shareSum', vars: { sum: shares.toFixed(3) } });
      const sum = (rec.rows || []).reduce(function (n, r) { return n + (parseFloat(r.area) || 0); }, 0);
      if (rec.totalArea && Math.abs(sum - parseFloat(rec.totalArea)) > 0.0001) issues.push({ key: 'areaSum', vars: { sum: sum.toFixed(4), total: rec.totalArea } });
      (rec.rows || []).forEach(function (r) {
        const expect = (parseFloat(r.total) || 0) * (parseFloat(r.share) || 0);
        if (r.total && r.share && r.area && Math.abs(expect - parseFloat(r.area)) > 0.0001) issues.push({ key: 'rowMath', vars: { dag: r.dag } });
      });
      if (!rec.mouza) issues.push({ key: 'missing', vars: { field: 'mouza' } });
      if (!rec.khatianNo) issues.push({ key: 'missing', vars: { field: 'khatianNo' } });
    } else {
      ['deedNo', 'date', 'dag', 'area'].forEach(function (k) { if (!rec[k]) issues.push({ key: 'missing', vars: { field: k } }); });
    }
    return issues;
  }

  return { recognize: recognize, parse: parse, validate: validate, toLatinDigits: toLatinDigits, CLASSES: CLASSES };
})();
