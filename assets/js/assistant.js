/*
 * assistant.js — "ভূমিসূত্র সহায়ক", an in-app help chat on every page.
 *
 * Like a bank's customer-service chat: a floating button opens a panel that
 * greets the visitor, lets them pick Bangla or English, offers quick-option
 * buttons, and answers typed questions. Answers come with buttons that take
 * the visitor straight to the right screen.
 *
 * How it understands questions: a knowledge base of topics, each with
 * Bangla and English keywords. A question is normalised (lower case, Bangla
 * digits to Latin, punctuation removed) and scored against every topic;
 * the best match answers. Two kinds of question are answered from live
 * data instead: a plot number ("দাগ ৪২২ নিরাপদ?") gets that plot's current
 * safety score and warnings, and a deed number ("D-2019-0451") is checked
 * against the ledger.
 *
 * Voice: a mic button lets people ask out loud, in Bangla or English, using
 * the browser's speech recognition (Chrome sends audio to its speech
 * service, so this one feature needs internet; the button hides itself
 * offline). Spoken Bangla numbers such as "চারশো বাইশ" become 422.
 *
 * Honest scope: this is keyword matching over a written knowledge base, not
 * a large language model. It never makes things up, runs fully offline and
 * cannot fail on stage. A production version could add an LLM behind a
 * server endpoint, with this knowledge base as its grounding.
 */
window.BS = window.BS || {};

BS.assistant = (function () {
  const U = BS.ui, D = BS.DATA;
  const SEEN_KEY = 'bhumisutra.assistant.seen.v1';

  function lang() { return U.getLang(); }
  function tr(o) { return o[lang()] || o.en; }
  function ctx() { return BS.app.ctx; }

  /* ---------- knowledge base ---------- */

  // go: [route, {bn, en} label]
  function go(route, bn, en) { return { route: route, label: { bn: bn, en: en } }; }

  const KB = [
    { id: 'about',
      k: ['ভূমিসূত্র কী', 'ভূমিসূত্র কি', 'এটা কী', 'এটা কি', 'কী করে', 'কি করে', 'কাজ কী', 'সম্পর্কে', 'what is', 'about', 'what does', 'bhumisutra'],
      a: { bn: 'ভূমিসূত্র জমির প্রতিটি দলিল, নামজারি আর বন্ধককে একটি হ্যাশ-চেইন লেজারে যুক্ত করে। এতে জাল দলিল, একই জমি দুইবার বিক্রি আর মালিকের অজান্তে বিক্রি টাকা হাতবদলের আগেই ধরা পড়ে।\n\nআপনি কী করতে চান?',
           en: 'BhumiSutra links every deed, mutation and mortgage into a hash-chained ledger, so fake deeds, double sales and sales without the owner\'s knowledge are caught before any money changes hands.\n\nWhat would you like to do?' },
      menu: true },

    { id: 'check',
      k: ['কেনার আগে', 'কিনব', 'কিনতে চাই', 'জমি কিনব', 'নিরাপদ', 'জমি যাচাই', 'জমির তথ্য', 'ঝুঁকি', 'স্কোর', 'দাগ', 'খতিয়ান নম্বর', 'buy', 'buying', 'before i buy', 'safe', 'check land', 'land info', 'plot', 'dag'],
      a: { bn: 'জমি কেনার আগে "জমির তথ্য ও যাচাই" পাতায় দাগ বা খতিয়ান নম্বর দিন। দেখাবে:\n• বর্তমান মালিক আর কার কতটুকু\n• মামলা, বন্ধক, খাস জমি, বকেয়া খাজনা\n• পুরোনো সব খতিয়ানের সাথে মিল আছে কিনা\n• ০-১০০ নিরাপত্তা স্কোর\n\nচাইলে এখানেই দাগ নম্বর লিখুন, যেমন "দাগ ৪২২"।',
           en: 'Before buying, enter the plot (dag) or khatian number on "Land info & check". You will see:\n• current owners and their shares\n• court cases, mortgages, khas land, unpaid tax\n• whether all old khatians agree\n• a 0–100 safety score\n\nOr type a plot number right here, e.g. "plot 422".' },
      go: [go('check', 'জমি যাচাই করুন', 'Check a plot')] },

    { id: 'verify',
      k: ['দলিল আসল', 'আসল কিনা', 'জাল দলিল', 'দলিল যাচাই', 'কিউআর', 'qr', 'নকল', 'verify', 'fake deed', 'genuine', 'real deed', 'deed check', 'deed', 'real', 'fake', 'দলিল'],
      a: { bn: 'দলিল আসল কিনা দেখতে "দলিল যাচাই" পাতায় দলিল নম্বর দিন বা দলিলের QR কোড স্ক্যান করুন। প্রতিটি দলিলে অফিসের ডিজিটাল স্বাক্ষর থাকে, তাই কেউ একটা অক্ষর বদলালেও ধরা পড়ে।\n\nএখানেই দলিল নম্বর লিখে দেখতে পারেন, যেমন "D-2019-0451"।',
           en: 'To check a deed, enter its number on "Verify a deed" or scan its QR code. Every deed carries the office\'s digital signature, so changing even one letter is caught.\n\nYou can also type a deed number here, e.g. "D-2019-0451".' },
      go: [go('verify', 'দলিল যাচাই করুন', 'Verify a deed')] },

    { id: 'fraud',
      k: ['দুইবার বিক্রি', 'দুবার বিক্রি', 'দ্বৈত', 'জালিয়াতি', 'প্রতারণা', 'ঠকা', 'ঠকবো', 'double sale', 'sold twice', 'fraud', 'scam', 'cheat'],
      a: { bn: 'প্রতিটি বিক্রি ধাপে ধাপে যাচাই হয়:\n১. বিক্রেতা ও ক্রেতার NID যাচাই\n২. সব অফিসের রেকর্ড চেক: আগে বিক্রি হয়েছে কিনা, মামলা, বন্ধক, খাস জমি\n৩. আসল মালিকের মোবাইলে সম্মতি কোড\n৪. ৭২ ঘণ্টার পাবলিক নোটিশ, যেকোনো ওয়ারিশ আপত্তি দিতে পারেন\n৫. নামজারি না হওয়া পর্যন্ত টাকা এসক্রোতে আটকে থাকে\n\nআর AI ঝুঁকি স্কোর এমন সন্দেহজনক বিক্রিও ধরে, যেটা কাগজে-কলমে সব ঠিক দেখায়।',
           en: 'Every sale is checked step by step:\n1. Seller and buyer NID check\n2. Every office\'s records: earlier sale, court case, mortgage, khas land\n3. A consent code to the real owner\'s phone\n4. A 72-hour public notice where any heir can object\n5. The money waits in escrow until mutation\n\nAnd the AI risk score catches suspicious sales whose papers look fine.' },
      go: [go('register', 'নিরাপদ রেজিস্ট্রি দেখুন', 'See safe registration'), go('notices', 'নোটিশ বোর্ড', 'Notice board')] },

    { id: 'notice',
      k: ['নোটিশ', 'আপত্তি', '৭২ ঘণ্টা', '72', 'notice', 'object', 'objection'],
      a: { bn: 'দলিলের আগে প্রতিটি বিক্রির নোটিশ ৭২ ঘণ্টা "রেজিস্ট্রির নোটিশ বোর্ড"-এ থাকে, আর সহ-মালিক ও ওয়ারিশদের SMS যায়। এই সময়ে কেউ আপত্তি দিলে কর্মকর্তা না দেখা পর্যন্ত দলিল হয় না। স্মার্টফোন না থাকলে *১২৩# ডায়াল করেও আপত্তি দেওয়া যায়।',
           en: 'Before any deed, the sale notice stays on the "Registry notice board" for 72 hours and co-owners and heirs get an SMS. If anyone objects, no deed is made until an officer reviews it. Without a smartphone you can object by dialling *123#.' },
      go: [go('notices', 'নোটিশ বোর্ড দেখুন', 'Open notice board'), go('ussd', 'বাটন ফোনে আপত্তি', 'Object by basic phone')] },

    { id: 'lock',
      k: ['লক কর', 'জমি লক', 'লক করা', 'সুরক্ষা', 'সুরক্ষিত', 'আমার জমি', 'নিজের জমি', 'protect', 'lock', 'my land', 'secure my'],
      a: { bn: '"আমার জমি" পাতায় NID আর মোবাইল OTP দিয়ে ঢুকে নিজের জমি লক করতে পারেন। লক থাকলে কেউ, এমনকি জাল কাগজ নিয়েও, আপনার জমি বিক্রি বা বন্ধক দিতে পারবে না। জমিতে লাগানোর জন্য QR সাইনবোর্ডও প্রিন্ট করতে পারবেন।\n\nবাটন ফোন থেকে *১২৩# ডায়াল করে ৫ চাপলেও লক করা যায়।',
           en: 'On "My land", sign in with your NID and a mobile OTP and lock your land. While locked, nobody, even with forged papers, can sell or mortgage it. You can also print a QR signboard for the land.\n\nOn a basic phone, dial *123# and press 5 to lock.' },
      go: [go('myland', 'আমার জমি', 'My land')] },

    { id: 'heirs',
      k: ['ওয়ারিশ', 'উত্তরাধিকার', 'ফারায়েজ', 'মারা গেছেন', 'মৃত্যু', 'বাবা মারা', 'ভাগ', 'অংশ', 'heir', 'inherit', 'inheritance', 'faraiz', 'died', 'share'],
      a: { bn: '"উত্তরাধিকার হিসাব" পাতায় মৃত ব্যক্তির জমি ফারায়েজ অনুযায়ী কার কত অংশ তা হিসাব হয়। এই অংশ লেজারে লেখা থাকে, তাই কোনো ওয়ারিশ নিজের অংশের বেশি বিক্রি করতে গেলে সাথে সাথে আটকে যায়।',
           en: '"Heir calculator" works out each heir\'s share of a deceased owner\'s land under Faraiz. Shares are written to the ledger, so an heir trying to sell more than their own share is stopped at once.' },
      go: [go('heirs', 'উত্তরাধিকার হিসাব', 'Heir calculator')] },

    { id: 'ussd',
      k: ['বাটন ফোন', 'স্মার্টফোন নেই', 'ইন্টারনেট নেই', 'সাধারণ ফোন', 'ussd', '*123#', '123', 'feature phone', 'no smartphone', 'basic phone'],
      a: { bn: 'স্মার্টফোন ছাড়াই যেকোনো সাধারণ ফোন থেকে *১২৩# ডায়াল করুন, বিকাশের মতো নম্বর চেপে চেপে:\n১. জমির তথ্য\n২. দলিল যাচাই\n৩. আমার জমি\n৪. নোটিশ ও আপত্তি\n৫. জমি লক/আনলক',
           en: 'From any basic phone, no smartphone needed, dial *123# and press numbers, just like bKash:\n1. Land info\n2. Verify deed\n3. My land\n4. Notices & objections\n5. Lock/unlock land' },
      go: [go('ussd', 'বাটন ফোন চালিয়ে দেখুন', 'Try the phone')] },

    { id: 'mutation',
      k: ['নামজারি', 'খারিজ', 'জমা খারিজ', 'মিউটেশন', 'mutation', 'namjari'],
      a: { bn: 'দলিল রেজিস্ট্রি হলেই নামজারি (ই-মিউটেশন) আবেদন নিজে থেকে এসি ল্যান্ড অফিসে চলে যায়, আলাদা করে দৌড়াতে হয় না। অনুমোদন হলে খতিয়ানে নতুন মালিকের নাম ওঠে আর এসক্রোর টাকা বিক্রেতা পান।',
           en: 'As soon as a deed is registered, the mutation (e-Mutation) application goes to the AC Land office by itself. Once approved, the khatian shows the new owner and the escrowed money is released to the seller.' },
      go: [go('mutation', 'ই-নামজারি', 'e-Mutation')] },

    { id: 'tax',
      k: ['খাজনা', 'ভূমি কর', 'উন্নয়ন কর', 'কর বকেয়া', 'land tax', 'tax', 'khajna'],
      a: { bn: 'ভূমি উন্নয়ন কর (খাজনা) বকেয়া থাকলে বিক্রির সময় সেটা ধরা পড়ে, আগে পরিশোধ করতে হয়। কর আদায়ের ডেস্কে হোল্ডিং অনুযায়ী বকেয়া দেখা আর আদায় করা যায়।',
           en: 'Unpaid land development tax (khajna) is caught at the time of sale and must be paid first. The tax desk shows and collects dues by holding.' },
      go: [go('taxdesk', 'কর ডেস্ক', 'Tax desk')] },

    { id: 'bank',
      k: ['বন্ধক', 'লোন', 'ঋণ', 'ব্যাংক', 'mortgage', 'loan', 'bank'],
      a: { bn: 'ব্যাংক জমি বন্ধক নেওয়ার আগে "ব্যাংক" পাতায় দাগ দিয়ে দেখে নেয় জমিটা আগে থেকেই বন্ধক আছে কিনা, মামলা আছে কিনা। একই জমি দুই ব্যাংকে বন্ধক দেওয়া যায় না।',
           en: 'Before taking land as collateral, a bank checks the plot on the "Bank" page for an existing mortgage or court case. The same land cannot be mortgaged to two banks.' },
      go: [go('bank', 'ব্যাংক যাচাই', 'Bank check')] },

    { id: 'digitize',
      k: ['পুরোনো', 'পুরনো', 'স্ক্যান', 'ডিজিটাল', 'ocr', 'হাতে লেখা', 'ডিজিটাইজ', 'scan', 'old record', 'digitize', 'digitise'],
      a: { bn: 'পুরোনো হাতে লেখা খতিয়ান বা দলিলের ছবি দিলে বাংলা OCR লেখা পড়ে সরকারি ফরম্যাটে বসিয়ে দেয়। কর্মকর্তা মিলিয়ে দেখে সংরক্ষণ করেন। পুরোটা ব্রাউজারেই চলে, ছবি কোথাও আপলোড হয় না।',
           en: 'Upload a photo of an old handwritten khatian or deed and Bangla OCR reads it into the official format for an officer to check and save. It all runs in the browser; the image is never uploaded.' },
      go: [go('digitize', 'ডিজিটাইজেশন', 'Digitization')] },

    { id: 'khatian',
      k: ['সিএস', 'এসএ', 'আরএস', 'বিএস', 'খতিয়ান মিল', 'খতিয়ানে অমিল', 'cs', 'sa', 'rs', 'bs', 'khatian'],
      a: { bn: 'একই জমির সিএস, এসএ, আরএস আর বিএস খতিয়ান পাশাপাশি মিলিয়ে দেখায়, মালিক বা পরিমাণে কোথাও অমিল থাকলে লাল দাগ দেয়। অমিল থাকা জমি কেনার আগে সাবধান।',
           en: 'Shows the CS, SA, RS and BS khatians of the same land side by side and marks any mismatch in owner or area. Be careful buying land where they disagree.' },
      go: [go('khatian', 'খতিয়ান মিলানো', 'Compare khatians')] },

    { id: 'ledger',
      k: ['লেজার', 'হ্যাশ', 'ব্লকচেইন', 'ব্লক চেইন', 'কারচুপি', 'কেউ বদলাতে', 'ledger', 'hash', 'blockchain', 'tamper'],
      a: { bn: 'প্রতিটি রেকর্ড আগের রেকর্ডের SHA-256 হ্যাশের সাথে যুক্ত। কেউ গোপনে একটা পুরোনো রেকর্ড বদলালেই চেইন ভেঙে যায় আর উপরের "লেজার অক্ষত" পিল লাল হয়ে যায়। "টেম্পার ল্যাব"-এ নিজে চেষ্টা করে দেখুন।',
           en: 'Every record is chained to the SHA-256 hash of the one before. Change any old record in secret and the chain breaks: the "Ledger intact" pill at the top turns red. Try it in the Tamper Lab.' },
      go: [go('ledger', 'লেজার ও টেম্পার ল্যাব', 'Ledger & Tamper Lab')] },

    { id: 'ai',
      k: ['এআই', 'ai', 'সন্দেহজনক', 'ঝুঁকি স্কোর', 'risk score', 'suspicious', 'artificial'],
      a: { bn: 'AI ঝুঁকি স্কোর এমন বিক্রি ধরে যেখানে সব কাগজ ঠিক, কিন্তু ধরনটা সন্দেহজনক। যেমন দাম বাজারদরের চেয়ে অনেক কম, বিক্রেতা মাত্র কিছুদিন আগে কিনেছেন, বা ক্রেতা আগের জালিয়াতির চেষ্টার সাথে যুক্ত। প্রতিটি স্কোরের সাথে কারণও দেখায়।',
           en: 'The AI risk score catches sales where the papers are fine but the pattern is suspicious: a price far below market, a seller who bought only recently, or a buyer linked to earlier fraud attempts. Every score comes with its reasons.' },
      go: [go('register', 'সাব-রেজিস্ট্রারের পাতা', 'Sub-Registrar page')] },

    { id: 'abroad',
      k: ['প্রবাসী', 'বিদেশে', 'বিদেশ', 'সম্মতি', 'abroad', 'expat', 'consent', 'overseas'],
      a: { bn: 'মালিক বিদেশে থাকলেও তাঁর নিবন্ধিত ইমেইল বা মোবাইলে সম্মতি কোড যায়। তিনি নিজে কোড না দিলে বিক্রি হয় না, তাই তাঁর অনুপস্থিতিতে কেউ জাল আমমোক্তারনামা দিয়ে জমি বেচতে পারে না।',
           en: 'Even when the owner lives abroad, a consent code goes to their registered email or phone. Without their code there is no sale, so nobody can sell their land behind their back with a forged power of attorney.' } },

    { id: 'escrow',
      k: ['এসক্রো', 'টাকা আটকে', 'টাকা কোথায়', 'escrow', 'payment', 'money'],
      a: { bn: 'ক্রেতার টাকা সরাসরি বিক্রেতার হাতে যায় না, ব্যাংকের এসক্রোতে জমা থাকে। নামজারি অনুমোদন হলে তবেই বিক্রেতা টাকা পান। জালিয়াতি ধরা পড়লে টাকা ক্রেতার কাছে ফেরত যায়।',
           en: 'The buyer\'s money does not go straight to the seller; it waits in bank escrow. The seller is paid only once the mutation is approved. If fraud is found, the money goes back to the buyer.' } },

    { id: 'privacy',
      k: ['গোপনীয়তা', 'কে দেখতে', 'কে কী দেখতে', 'আমার তথ্য', 'nid নিরাপদ', 'privacy', 'who can see', 'my data'],
      a: { bn: 'সবাই সব দেখতে পারে না। সাধারণ মানুষ জমির মালিক আর মামলা-বন্ধক আছে কিনা দেখেন, কিন্তু NID, দাম বা ঋণের অঙ্ক না। NID কোথাও খোলা অবস্থায় রাখা হয় না, শুধু হ্যাশ রাখা হয়। কে কী দেখল, অডিট লগে লেখা থাকে।',
           en: 'Not everyone sees everything. The public sees the owner and whether there is a case or mortgage, but not NIDs, prices or loan amounts. NIDs are never stored in the clear, only hashed. Every access is written to the audit log.' },
      go: [go('access', 'কে কী দেখতে পারে', 'Who can see what')] },

    { id: 'login',
      k: ['ডেমো লগইন', 'লগইন', 'লগ ইন', 'পাসওয়ার্ড', 'অ্যাকাউন্ট', 'ডেমো অ্যাকাউন্ট', 'login', 'log in', 'password', 'account', 'sign in'],
      a: { bn: 'ডেমো লগইন (সবার পাসওয়ার্ড demo1234):\n• subreg: সাব-রেজিস্ট্রার\n• acland: এসি ল্যান্ড\n• survey: জরিপ কর্মকর্তা\n• bank: ব্যাংক\n• admin: অ্যাডমিন\n\nনাগরিক হিসেবে NID আর মোবাইল OTP দিয়ে ঢোকা যায়।',
           en: 'Demo logins (password demo1234 for all):\n• subreg: Sub-Registrar\n• acland: AC Land\n• survey: Survey officer\n• bank: Bank\n• admin: Admin\n\nCitizens sign in with NID and a mobile OTP.' },
      go: [go('login', 'লগইন পাতা', 'Login page')] },

    { id: 'offline',
      k: ['অফলাইন', 'নেট ছাড়া', 'ইন্টারনেট ছাড়া', 'ইনস্টল', 'অ্যাপ', 'সিঙ্ক', 'offline', 'install', 'app', 'sync', 'no internet'],
      a: { bn: 'ভূমিসূত্র অ্যাপের মতো ইনস্টল করা যায় (ব্রাউজারের ঠিকানার পাশের ইনস্টল আইকন)। একবার খোলার পর ইন্টারনেট ছাড়াও চলে। আর দুটো ট্যাবে দুই অফিস খুললে এক অফিসের কাজ অন্য অফিসে সাথে সাথে দেখা যায়।',
           en: 'BhumiSutra installs like an app (the install icon next to the browser address bar) and works without internet after the first visit. Open two offices in two tabs and work done in one appears in the other at once.' } },

    { id: 'tour',
      k: ['ডেমো', 'কীভাবে দেখব', 'কিভাবে দেখব', 'কোথা থেকে শুরু', 'শুরু করব', 'গাইড', 'tour', 'demo', 'where to start', 'guide', 'how to use', 'কিভাবে ব্যবহার', 'কীভাবে ব্যবহার'],
      a: { bn: '৩ মিনিটের ডেমো:\n১. ম্যাপে দাগ ৪২২ চাপুন: মামলা আর বন্ধক, স্কোর লাল\n২. দলিল যাচাই: D-2019-0451 আসল দেখাবে\n৩. subreg লগইন করে নিরাপদ রেজিস্ট্রিতে "দুইবার বিক্রি" চেষ্টা করুন: আটকে যাবে\n৪. "কাগজ ঠিক, কিন্তু সন্দেহজনক" চাপুন: AI ঝুঁকি ৭৫\n৫. বাটন ফোনে *১২৩# ডায়াল করুন\n৬. admin লগইন করে টেম্পার ল্যাবে লেজার ভাঙুন',
           en: 'A 3-minute demo:\n1. Tap plot 422 on the map: court case and mortgage, score red\n2. Verify deed D-2019-0451: genuine\n3. Log in as subreg, try "Double sale" in Safe registration: blocked\n4. Press "Papers OK, but suspicious": AI risk 75\n5. Dial *123# on the basic phone\n6. Log in as admin and break the ledger in the Tamper Lab' },
      go: [go('check?dag=422', 'দাগ ৪২২ দেখুন', 'Open plot 422'), go('login', 'লগইন', 'Login')] },

    { id: 'human',
      k: ['মানুষ', 'অফিসার', 'কথা বলতে', 'যোগাযোগ', 'হেল্পলাইন', 'ফোন নম্বর', 'human', 'agent', 'contact', 'helpline', 'call'],
      a: { bn: 'এটা একটা ডেমো, তাই এখানে কোনো মানুষ কর্মী নেই। বাস্তব ভূমি সেবার জন্য সরকারি ভূমি সেবা কল সেন্টার ১৬১২২-এ ফোন করতে পারেন। ভূমিসূত্র চালু হলে এই চ্যাট থেকেই অফিসে টিকিট খোলা যাবে।',
           en: 'This is a demo, so there is no human agent here. For real land services you can call the government land service call centre at 16122. Once BhumiSutra is live, this chat will open a ticket with the office.' } },

    { id: 'thanks',
      k: ['ধন্যবাদ', 'থ্যাংকস', 'থ্যাঙ্কস', 'ঠিক আছে', 'আচ্ছা', 'thanks', 'thank you', 'ok', 'okay', 'bye', 'বিদায়'],
      a: { bn: 'আপনাকেও ধন্যবাদ! আর কিছু জানার থাকলে জিজ্ঞেস করুন।', en: 'You\'re welcome! Ask me anything else.' } },

    { id: 'hello',
      k: ['হাই', 'হ্যালো', 'হেলো', 'আসসালামু', 'সালাম', 'নমস্কার', 'hi', 'hello', 'hey', 'salam'],
      a: { bn: 'হ্যালো! আমি ভূমিসূত্র সহায়ক। কীভাবে সাহায্য করতে পারি?', en: 'Hello! I\'m the BhumiSutra assistant. How can I help?' },
      menu: true }
  ];

  const MENU = [
    { q: { bn: 'জমি কেনার আগে যাচাই', en: 'Check land before buying' }, id: 'check' },
    { q: { bn: 'দলিল আসল কিনা', en: 'Is this deed genuine?' }, id: 'verify' },
    { q: { bn: 'জালিয়াতি কীভাবে আটকায়', en: 'How fraud is stopped' }, id: 'fraud' },
    { q: { bn: 'আমার জমি লক করা', en: 'Lock my land' }, id: 'lock' },
    { q: { bn: 'উত্তরাধিকার হিসাব', en: 'Heir shares' }, id: 'heirs' },
    { q: { bn: 'বাটন ফোনে সেবা', en: 'Basic-phone service' }, id: 'ussd' },
    { q: { bn: 'ডেমো কীভাবে দেখব', en: 'How to try the demo' }, id: 'tour' },
    { q: { bn: 'ডেমো লগইন', en: 'Demo logins' }, id: 'login' }
  ];

  /* ---------- understanding ---------- */

  // Bangla number words 1–99, as speech recognition writes them out.
  const BN_NUM = ('এক দুই তিন চার পাঁচ ছয় সাত আট নয় দশ এগারো বারো তেরো চৌদ্দ পনেরো ষোলো সতেরো আঠারো উনিশ বিশ ' +
    'একুশ বাইশ তেইশ চব্বিশ পঁচিশ ছাব্বিশ সাতাশ আটাশ উনত্রিশ ত্রিশ একত্রিশ বত্রিশ তেত্রিশ চৌত্রিশ পঁয়ত্রিশ ছত্রিশ সাঁইত্রিশ আটত্রিশ উনচল্লিশ চল্লিশ ' +
    'একচল্লিশ বিয়াল্লিশ তেতাল্লিশ চুয়াল্লিশ পঁয়তাল্লিশ ছেচল্লিশ সাতচল্লিশ আটচল্লিশ উনপঞ্চাশ পঞ্চাশ একান্ন বাহান্ন তিপ্পান্ন চুয়ান্ন পঞ্চান্ন ছাপ্পান্ন সাতান্ন আটান্ন উনষাট ষাট ' +
    'একষট্টি বাষট্টি তেষট্টি চৌষট্টি পঁয়ষট্টি ছেষট্টি সাতষট্টি আটষট্টি উনসত্তর সত্তর একাত্তর বাহাত্তর তিয়াত্তর চুয়াত্তর পঁচাত্তর ছিয়াত্তর সাতাত্তর আটাত্তর উনআশি আশি ' +
    'একাশি বিরাশি তিরাশি চুরাশি পঁচাশি ছিয়াশি সাতাশি অষ্টআশি উননব্বই নব্বই একানব্বই বিরানব্বই তিরানব্বই চুরানব্বই পঁচানব্বই ছিয়ানব্বই সাতানব্বই আটানব্বই নিরানব্বই')
    .split(' ').reduce(function (m, w, i) { m[w.normalize('NFC')] = i + 1; return m; }, {});
  const BN_UNIT_ALT = { 'দু': 2, 'ছ': 6, 'ছয়': 6, 'ষোল': 16, 'এগার': 11, 'বার': 12, 'তের': 13, 'পনের': 15, 'সতের': 17, 'আঠার': 18 };
  function bnWord(w) {
    w = w.normalize('NFC').replace(/ঊ/g, 'উ');
    return BN_NUM[w] || BN_UNIT_ALT[w] || 0;
  }
  // "চারশো বাইশ" → 422, "দাগ বাইশ" → দাগ 22. Words on their own are only
  // turned into digits after দাগ / নম্বর / plot, so "এক" in a sentence stays.
  function spokenNumbers(text) {
    const toks = String(text).normalize('NFC').split(/\s+/);
    const out = [];
    for (let i = 0; i < toks.length; i++) {
      const tok = toks[i].replace(/[।?!,.]/g, '');
      const hm = tok.match(/^(.+?)(শো|শ|শত)$/);
      let hundreds = hm ? bnWord(hm[1]) : 0;
      if (hundreds > 9) hundreds = 0;
      if (!hundreds && bnWord(tok) > 0 && bnWord(tok) < 10 && /^(শো|শ|শত)$/.test(toks[i + 1] || '')) { hundreds = bnWord(tok); i++; }
      if (hundreds) {
        const next = bnWord((toks[i + 1] || '').replace(/[।?!,.]/g, ''));
        if (next) { out.push(String(hundreds * 100 + next)); i++; } else out.push(String(hundreds * 100));
        continue;
      }
      const prev = (out[out.length - 1] || '').toLowerCase();
      if (bnWord(tok) && /^(দাগ|নম্বর|নং|plot|dag)$/.test(prev)) { out.push(String(bnWord(tok))); continue; }
      out.push(toks[i]);
    }
    return out.join(' ');
  }

  function norm(s) {
    return ' ' + U.toLatin(String(s).normalize('NFC')).toLowerCase()
      .replace(/[।?!,.;:"'()\[\]{}…‘’“”]/g, ' ')
      .replace(/\s+/g, ' ').trim() + ' ';
  }

  function isAsciiWord(k) { return /^[a-z0-9*# ]+$/.test(k); }

  // Score every topic: longer, more specific keywords count more. Short
  // English keywords must match as whole words ("ok" must not match "book").
  function bestTopic(text) {
    const q = norm(text);
    let best = null, bestScore = 0;
    KB.forEach(function (item) {
      let score = 0;
      item.k.forEach(function (kw) {
        const k = norm(kw).trim();
        if (!k) return;
        const hit = isAsciiWord(k) ? q.indexOf(' ' + k + ' ') !== -1 || (k.length > 4 && q.indexOf(k) !== -1) : q.indexOf(k) !== -1;
        if (hit) score += 1 + Math.min(k.length, 14) / 7;
      });
      if (score > bestScore) { best = item; bestScore = score; }
    });
    return best;
  }

  // "দাগ ৪২২", "plot 101", or just "422" when it is a plot in this demo.
  function findDag(text) {
    const q = U.toLatin(text);
    const dags = D.plots.map(function (p) { return p.dag; });
    const nums = q.match(/\d{2,5}/g) || [];
    for (let i = 0; i < nums.length; i++) if (dags.indexOf(nums[i]) !== -1) return { dag: nums[i], known: true };
    const m = q.match(/(?:দাগ|plot|dag)\s*(?:নং|নম্বর|no\.?|number)?\s*(\d{1,5})/i);
    if (m) return { dag: m[1], known: false };
    return null;
  }

  function findDeed(text) {
    const m = U.toLatin(text).toUpperCase().match(/D\s*-?\s*(\d{4})\s*-?\s*(\d{3,4})/);
    return m ? 'D-' + m[1] + '-' + m[2].padStart(4, '0') : null;
  }

  function plotAnswer(found) {
    if (!found.known) {
      return { text: tr({ bn: 'দাগ ' + U.num(found.dag) + ' এই ডেমোতে নেই। ডেমোতে আছে: ', en: 'Plot ' + found.dag + ' is not in this demo. The demo has plots: ' }) +
        D.plots.map(function (p) { return U.num(p.dag); }).join(', '), go: [go('check', 'জমি যাচাই', 'Check a plot')] };
    }
    const dag = found.dag, a = ctx().assessments[dag], d = ctx().derived[dag];
    const owners = Object.keys(d.deedOwners).filter(function (id) { return d.deedOwners[id] > 0.0001; })
      .map(function (id) { return U.person(id) + ' (' + U.area(d.deedOwners[id]) + ')'; }).join(', ');
    const warns = a.factors.filter(function (f) { return f.key !== 'attempts'; }).slice(0, 3)
      .map(function (f) { return U.t('ussd.f.' + f.key).replace(/^!\s*/, '• '); });
    const verdict = { safe: { bn: 'কেনার আগে স্বাভাবিক কাগজপত্র মিলিয়ে নিলেই চলে।', en: 'Usual paperwork checks are enough before buying.' },
      caution: { bn: 'কেনার আগে নিচের বিষয়গুলো ভালো করে মিলিয়ে নিন।', en: 'Check the points below carefully before buying.' },
      danger: { bn: 'এই অবস্থায় জমিটা কিনবেন না।', en: 'Do not buy this land in its current state.' } }[a.level];
    return {
      text: tr({ bn: 'দাগ ' + U.num(dag) + ', ' + U.L(D.location.mouza), en: 'Plot ' + dag + ', ' + U.L(D.location.mouza) }) + '\n' +
        tr({ bn: 'নিরাপত্তা স্কোর: ', en: 'Safety score: ' }) + U.num(a.score) + '/' + U.num(100) + ' (' + U.t('level.' + a.level) + ')\n' +
        tr({ bn: 'মালিক: ', en: 'Owners: ' }) + (owners || '—') + '\n' +
        (warns.length ? warns.join('\n') + '\n' : '') + tr(verdict),
      tone: a.level,
      go: [go('check?dag=' + dag, 'পুরো রিপোর্ট দেখুন', 'See full report')]
    };
  }

  function deedAnswer(no) {
    const b = ctx().state.chain.filter(function (x) { return x.type === 'DEED_REGISTERED' && x.payload.deedNo === no; }).pop();
    if (!b) {
      return { tone: 'danger', text: tr({ bn: no + ' নম্বরে লেজারে কোনো দলিল নেই। এই দলিল জাল হতে পারে, এর ভিত্তিতে টাকা দেবেন না।',
        en: 'There is no deed ' + no + ' on the ledger. It may be fake: do not pay on the strength of it.' }), go: [go('verify', 'দলিল যাচাই', 'Verify a deed')] };
    }
    const p = b.payload;
    if (!ctx().integrity.ok) {
      return { tone: 'danger', text: tr({ bn: no + ' লেজারে আছে, কিন্তু লেজারে কারচুপি ধরা পড়েছে। রেজিস্ট্রি অফিসে যোগাযোগ করুন।',
        en: no + ' is on the ledger, but the ledger shows tampering. Contact the registry office.' }) };
    }
    return {
      tone: 'safe',
      text: tr({ bn: '✓ আসল দলিল ', en: '✓ Genuine deed ' }) + no + '\n' +
        tr({ bn: 'দাগ ', en: 'Plot ' }) + U.num(p.dag) + ', ' + U.area(p.area) + '\n' +
        U.person(p.seller) + ' → ' + U.person(p.buyer) + '\n' +
        tr({ bn: 'তারিখ: ', en: 'Date: ' }) + U.date(p.date),
      go: [go('verify?deed=' + encodeURIComponent(no), 'পুরো যাচাই দেখুন', 'See full verification')]
    };
  }

  function answer(text) {
    text = spokenNumbers(text);
    const deed = findDeed(text);
    if (deed) return deedAnswer(deed);
    const topic = bestTopic(text);
    const dag = findDag(text);
    // A plot number wins unless the question is clearly about something else.
    if (dag && (!topic || ['check', 'about', 'hello', 'thanks'].indexOf(topic.id) !== -1 || dag.known)) return plotAnswer(dag);
    if (topic) return topicAnswer(topic);
    return {
      text: tr({ bn: 'দুঃখিত, প্রশ্নটা বুঝতে পারিনি। নিচের কোনো একটা বেছে নিন, অথবা অন্যভাবে লিখুন। যেমন: "দাগ ৪২২ নিরাপদ?", "নামজারি কীভাবে হয়?"',
        en: 'Sorry, I didn\'t get that. Pick one below or try different words, e.g. "Is plot 422 safe?", "How does mutation work?"' }),
      menu: true
    };
  }

  function topicAnswer(topic) { return { text: tr(topic.a), go: topic.go, menu: topic.menu }; }

  /* ---------- UI ---------- */

  let root, log, input, opened = false, started = false;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function scrollDown() { log.scrollTop = log.scrollHeight; }

  function addMsg(who, text, tone) {
    const m = el('div', 'as-msg ' + who + (tone ? ' tone-' + tone : ''));
    m.appendChild(el('p', '', text));
    log.appendChild(m);
    scrollDown();
    return m;
  }

  function addTime() {
    const d = new Date();
    log.appendChild(el('p', 'as-time', U.num(String(d.getHours()).padStart(2, '0')) + ':' + U.num(String(d.getMinutes()).padStart(2, '0'))));
  }

  function addChips(items) {
    const wrap = el('div', 'as-chips');
    items.forEach(function (it) {
      const b = el('button', 'as-chip', it.label);
      b.type = 'button';
      b.addEventListener('click', function () { it.run(); });
      wrap.appendChild(b);
    });
    log.appendChild(wrap);
    scrollDown();
  }

  function menuChips() {
    addChips(MENU.map(function (m) {
      return { label: tr(m.q), run: function () { ask(tr(m.q), m.id); } };
    }));
  }

  function goChips(list) {
    if (!list || !list.length) return;
    addChips(list.map(function (g) {
      return { label: '→ ' + tr(g.label), run: function () {
        location.hash = '#/' + g.route;
        if (window.matchMedia('(max-width: 760px)').matches) toggle(false);
      } };
    }));
  }

  function reply(r) {
    const typing = addMsg('bot typing', '…');
    setTimeout(function () {
      typing.remove();
      addMsg('bot', r.text, r.tone);
      goChips(r.go);
      if (r.menu) menuChips();
      addTime();
    }, 380);
  }

  function ask(text, topicId) {
    addMsg('me', text);
    if (topicId) {
      const topic = KB.filter(function (k) { return k.id === topicId; })[0];
      reply(topicAnswer(topic));
    } else {
      reply(answer(text));
    }
  }

  function greeting() {
    const h = new Date().getHours();
    const g = h < 5 ? { bn: 'শুভ রাত্রি!', en: 'Good evening!' }
      : h < 12 ? { bn: 'শুভ সকাল!', en: 'Good morning!' }
      : h < 15 ? { bn: 'শুভ দুপুর!', en: 'Good afternoon!' }
      : h < 18 ? { bn: 'শুভ বিকেল!', en: 'Good afternoon!' }
      : { bn: 'শুভ সন্ধ্যা!', en: 'Good evening!' };
    return tr(g);
  }

  function start() {
    started = true;
    addMsg('bot', greeting());
    addMsg('bot', tr({ bn: 'ভূমিসূত্র সহায়কে স্বাগতম। জমি কেনা, দলিল যাচাই বা এই সাইট ব্যবহার নিয়ে যেকোনো প্রশ্ন করুন।', en: 'Welcome to the BhumiSutra assistant. Ask anything about buying land, checking a deed or using this site.' }));
    addTime();
    addMsg('bot', 'Please select your preferred language\nঅনুগ্রহ করে আপনার পছন্দের ভাষা নির্বাচন করুন');
    addChips([
      { label: 'বাংলা', run: function () { setLanguage('bn'); } },
      { label: 'English', run: function () { setLanguage('en'); } }
    ]);
  }

  function setLanguage(l) {
    if (U.getLang() !== l) {
      U.setLang(l);
      BS.app.refreshHeader();
      BS.app.render();
    }
    relabel();
    addMsg('me', l === 'bn' ? 'বাংলা' : 'English');
    reply({ text: tr({ bn: 'ঠিক আছে, বাংলায় কথা বলছি। কী জানতে চান?', en: 'Great, let\'s continue in English. What would you like to know?' }), menu: true });
  }

  function toggle(open) {
    opened = open === undefined ? !opened : open;
    root.classList.toggle('open', opened);
    root.querySelector('.as-launch').setAttribute('aria-expanded', String(opened));
    hideTeaser();
    if (!opened && listening && rec) rec.abort();
    if (opened) {
      if (!started) start();
      setTimeout(function () { input.focus(); }, 50);
    }
  }

  function hideTeaser() {
    const t = root.querySelector('.as-teaser');
    if (t) t.remove();
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* storage blocked: fine */ }
  }

  function relabel() {
    if (!root) return;
    root.querySelector('.as-title').textContent = tr({ bn: 'ভূমিসূত্র সহায়ক', en: 'BhumiSutra assistant' });
    root.querySelector('.as-sub').textContent = tr({ bn: 'সাধারণত সাথে সাথে উত্তর দেয়', en: 'Usually replies instantly' });
    root.querySelector('.as-launch').setAttribute('aria-label', tr({ bn: 'সহায়ক খুলুন', en: 'Open assistant' }));
    root.querySelector('.as-close').setAttribute('aria-label', tr({ bn: 'বন্ধ করুন', en: 'Close' }));
    input.placeholder = listening ? tr({ bn: 'শুনছি… বলুন', en: 'Listening… speak now' }) : tr({ bn: 'প্রশ্ন লিখে Enter চাপুন', en: 'Type your question and press Enter' });
    root.querySelector('.as-send').setAttribute('aria-label', tr({ bn: 'পাঠান', en: 'Send' }));
    const mic = root.querySelector('.as-mic');
    mic.setAttribute('aria-label', listening ? tr({ bn: 'শোনা থামান', en: 'Stop listening' }) : tr({ bn: 'মুখে বলে প্রশ্ন করুন', en: 'Ask by voice' }));
    mic.title = mic.getAttribute('aria-label');
    root.querySelector('.as-note').textContent = tr({ bn: 'নিয়ম-ভিত্তিক সহায়ক · অফলাইনেও চলে · ডেমো তথ্য', en: 'Rule-based assistant · works offline · demo data' });
    const teaser = root.querySelector('.as-teaser-text');
    if (teaser) teaser.textContent = tr({ bn: 'সাহায্য লাগবে? আমাকে জিজ্ঞেস করুন।', en: 'Need help? Ask me.' });
  }

  const ICON_CHAT = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="currentColor"/><circle cx="8.5" cy="9.5" r="1.2" fill="var(--green)"/><circle cx="12" cy="9.5" r="1.2" fill="var(--green)"/><circle cx="15.5" cy="9.5" r="1.2" fill="var(--green)"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  const ICON_MIC = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  const ICON_SEND = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5z" fill="currentColor"/></svg>';

  /* ---------- voice ---------- */

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false;

  function showMic() {
    const mic = root.querySelector('.as-mic');
    mic.hidden = !Recognition || !navigator.onLine;
    if (mic.hidden && listening && rec) rec.abort();
  }

  function setListening(on) {
    listening = on;
    root.classList.toggle('listening', on);
    root.querySelector('.as-mic').setAttribute('aria-pressed', String(on));
    relabel();
  }

  function voiceError(code) {
    const msg = code === 'not-allowed' || code === 'service-not-allowed'
      ? { bn: 'মাইক্রোফোনের অনুমতি পাওয়া যায়নি। ব্রাউজারের ঠিকানার পাশের আইকনে মাইক্রোফোন "Allow" করুন।', en: 'Microphone permission was not given. Allow the microphone from the icon next to the address bar.' }
      : code === 'network'
      ? { bn: 'ভয়েসের জন্য ইন্টারনেট লাগে। লিখে প্রশ্ন করুন।', en: 'Voice needs internet. Please type your question.' }
      : code === 'no-speech'
      ? { bn: 'কিছু শুনতে পাইনি। মাইক চেপে আবার বলুন।', en: 'I didn\'t hear anything. Tap the mic and try again.' }
      : null;
    if (msg) reply({ text: tr(msg) });
  }

  function toggleVoice() {
    if (!Recognition) return;
    if (listening && rec) { rec.stop(); return; }
    rec = new Recognition();
    rec.lang = lang() === 'bn' ? 'bn-BD' : 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onresult = function (e) {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      input.value = (finalText + interim).trim();
    };
    rec.onerror = function (e) { voiceError(e.error); };
    rec.onend = function () {
      setListening(false);
      const v = (finalText || input.value).trim();
      input.value = '';
      if (v) ask(v);
    };
    try { rec.start(); setListening(true); } catch (e) { setListening(false); }
  }

  function init() {
    root = el('div', 'assistant no-print');
    root.innerHTML =
      '<section class="as-panel" id="as-panel" role="dialog" aria-modal="false" aria-labelledby="as-title">' +
        '<header class="as-head"><span class="as-avatar" aria-hidden="true">ভূ</span>' +
          '<div><h2 class="as-title" id="as-title"></h2><p class="as-sub"></p></div>' +
          '<button type="button" class="as-close">' + ICON_X + '</button></header>' +
        '<div class="as-log" aria-live="polite"></div>' +
        '<form class="as-form"><input class="as-input" type="text" autocomplete="off" maxlength="200">' +
          '<button type="button" class="as-mic" hidden>' + ICON_MIC + '</button>' +
          '<button type="submit" class="as-send">' + ICON_SEND + '</button></form>' +
        '<p class="as-note"></p>' +
      '</section>' +
      '<button type="button" class="as-launch" aria-expanded="false" aria-controls="as-panel">' + ICON_CHAT + ICON_X + '</button>';
    document.body.appendChild(root);
    log = root.querySelector('.as-log');
    input = root.querySelector('.as-input');

    let seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { /* ignore */ }
    if (!seen) {
      const teaser = el('button', 'as-teaser');
      teaser.type = 'button';
      teaser.innerHTML = '<span class="as-teaser-text"></span>';
      teaser.addEventListener('click', function () { toggle(true); });
      root.appendChild(teaser);
      setTimeout(function () { teaser.classList.add('show'); }, 1500);
    }

    relabel();
    showMic();
    window.addEventListener('online', showMic);
    window.addEventListener('offline', showMic);
    root.querySelector('.as-mic').addEventListener('click', toggleVoice);
    root.querySelector('.as-launch').addEventListener('click', function () { toggle(); });
    root.querySelector('.as-close').addEventListener('click', function () { toggle(false); root.querySelector('.as-launch').focus(); });
    root.querySelector('.as-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      input.value = '';
      ask(v);
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && opened) { toggle(false); root.querySelector('.as-launch').focus(); }
    });
  }

  return { init: init, relabel: relabel, open: function () { toggle(true); }, answer: answer, spokenNumbers: spokenNumbers };
})();
