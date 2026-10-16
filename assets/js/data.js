/*
 * data.js — FICTIONAL demo data only.
 *
 * Every name, plot, deed, khatian, case and bank below is made up for the
 * LandTech 2026 hackathon. No real person, NID number, phone number or
 * real land record is used (rulebook Section 10).
 *
 * Text that the user sees is stored in both languages: { bn: '…', en: '…' }.
 * Areas are in decimals (শতাংশ). Money is in BDT.
 */
window.BS = window.BS || {};

BS.DATA = {
  location: {
    mouza: { bn: 'শাপলাপুর', en: 'Shaplapur' },
    jl: '117',
    upazila: { bn: 'ডেমো উপজেলা', en: 'Demo Upazila' },
    district: { bn: 'ডেমো জেলা', en: 'Demo District' }
  },

  // Fictional people. "DEMO-" IDs are not NID numbers.
  persons: {
    P01: { bn: 'আব্দুল করিম', en: 'Abdul Karim', id: 'DEMO-ID-0001' },
    P02: { bn: 'রহিমা বেগম', en: 'Rahima Begum', id: 'DEMO-ID-0002' },
    P03: { bn: 'জামাল হোসেন', en: 'Jamal Hossain', id: 'DEMO-ID-0003' },
    P04: { bn: 'সেলিনা আক্তার', en: 'Selina Akter', id: 'DEMO-ID-0004' },
    P05: { bn: 'মনির উদ্দিন', en: 'Monir Uddin', id: 'DEMO-ID-0005' },
    P06: { bn: 'ফারহানা ইসলাম', en: 'Farhana Islam', id: 'DEMO-ID-0006' },
    P07: { bn: 'রফিক মিয়া', en: 'Rafiq Mia', id: 'DEMO-ID-0007' },
    P08: { bn: 'নাসিমা খাতুন', en: 'Nasima Khatun', id: 'DEMO-ID-0008' },
    P09: { bn: 'হাবিবুর রহমান', en: 'Habibur Rahman', id: 'DEMO-ID-0009' },
    P10: { bn: 'সুলতানা পারভীন', en: 'Sultana Parvin', id: 'DEMO-ID-0010' },
    P11: { bn: 'কামাল সরকার', en: 'Kamal Sarkar', id: 'DEMO-ID-0011' },
    GOV: { bn: 'বাংলাদেশ সরকার (খাস)', en: 'Government of Bangladesh (khas)', id: 'GOV-KHAS' }
  },

  banks: {
    B1: { bn: 'ডেমো কমার্শিয়াল ব্যাংক', en: 'Demo Commercial Bank' },
    B2: { bn: 'নমুনা কৃষি ব্যাংক', en: 'Sample Agri Bank' }
  },

  offices: {
    subreg: { bn: 'ডেমো সাব-রেজিস্ট্রি অফিস', en: 'Demo Sub-Registry Office' },
    acland: { bn: 'সহকারী কমিশনার (ভূমি) অফিস, ডেমো উপজেলা', en: 'AC Land Office, Demo Upazila' }
  },

  /*
   * Plots (দাগ). bsOwners = owners as written in the latest BS khatian.
   * khatians = the four survey records of the same plot (CS → SA → RS → BS).
   * "basis" explains why an owner name changed between surveys. A change
   * with no basis, or an area change, is a mismatch the system flags.
   * shape = polygon points on the mouza map (SVG, 640×420).
   */
  plots: [
    {
      dag: '101', area: 33,
      landClass: { bn: 'নাল (কৃষি)', en: 'Agricultural' },
      bsOwners: { P01: 33 },
      shape: '40,40 200,28 214,146 52,150',
      khatians: [
        { survey: 'CS', no: '45', year: 1915, owner: { bn: 'মোসলেম উদ্দিন', en: 'Moslem Uddin' }, area: 33 },
        { survey: 'SA', no: '78', year: 1962, owner: { bn: 'আব্দুল করিম', en: 'Abdul Karim' }, area: 33, basis: 'inheritance' },
        { survey: 'RS', no: '112', year: 1978, owner: { bn: 'আব্দুল করিম', en: 'Abdul Karim' }, area: 33 },
        { survey: 'BS', no: '230', year: 1998, owner: { bn: 'আব্দুল করিম', en: 'Abdul Karim' }, area: 33 }
      ]
    },
    {
      dag: '205', area: 20,
      landClass: { bn: 'ভিটা (বসতবাড়ি)', en: 'Homestead' },
      bsOwners: { P03: 20 },
      shape: '200,28 330,24 338,140 214,146',
      khatians: [
        { survey: 'CS', no: '51', year: 1915, owner: { bn: 'ইসমাইল হোসেন', en: 'Ismail Hossain' }, area: 20 },
        { survey: 'SA', no: '83', year: 1962, owner: { bn: 'জামাল হোসেন', en: 'Jamal Hossain' }, area: 20, basis: 'inheritance' },
        { survey: 'RS', no: '119', year: 1978, owner: { bn: 'জামাল হোসেন', en: 'Jamal Hossain' }, area: 20 },
        { survey: 'BS', no: '241', year: 1998, owner: { bn: 'জামাল হোসেন', en: 'Jamal Hossain' }, area: 20 }
      ]
    },
    {
      dag: '317', area: 50,
      landClass: { bn: 'নাল (কৃষি)', en: 'Agricultural' },
      bsOwners: { P07: 50 },
      shape: '330,24 470,34 462,142 338,140',
      khatians: [
        { survey: 'CS', no: '9', year: 1915, owner: { bn: 'আলতাফ মিয়া', en: 'Altaf Mia' }, area: 50 },
        { survey: 'SA', no: '31', year: 1962, owner: { bn: 'রফিক মিয়া', en: 'Rafiq Mia' }, area: 50, basis: 'inheritance' },
        { survey: 'RS', no: '66', year: 1978, owner: { bn: 'রফিকুল ইসলাম', en: 'Rafiqul Islam' }, area: 45 },
        { survey: 'BS', no: '140', year: 1998, owner: { bn: 'রফিক মিয়া', en: 'Rafiq Mia' }, area: 50 }
      ]
    },
    {
      dag: '422', area: 40,
      landClass: { bn: 'ভিটা (বসতবাড়ি)', en: 'Homestead' },
      bsOwners: { P08: 40 },
      shape: '52,188 190,184 200,300 60,306',
      khatians: [
        { survey: 'CS', no: '60', year: 1915, owner: { bn: 'নাসিরউদ্দিন', en: 'Nasiruddin' }, area: 40 },
        { survey: 'SA', no: '92', year: 1962, owner: { bn: 'নাসিরউদ্দিন', en: 'Nasiruddin' }, area: 40 },
        { survey: 'RS', no: '131', year: 1978, owner: { bn: 'নাসিমা খাতুন', en: 'Nasima Khatun' }, area: 40, basis: 'inheritance' },
        { survey: 'BS', no: '256', year: 1998, owner: { bn: 'নাসিমা খাতুন', en: 'Nasima Khatun' }, area: 40 }
      ]
    },
    {
      dag: '530', area: 15,
      landClass: { bn: 'খাস (সরকারি)', en: 'Khas (government)' },
      bsOwners: { GOV: 15 },
      shape: '190,184 320,180 330,250 200,262',
      khatians: [
        { survey: 'CS', no: '1', year: 1915, owner: { bn: 'সরকার (খাস)', en: 'Government (khas)' }, area: 15 },
        { survey: 'SA', no: '1', year: 1962, owner: { bn: 'সরকার (খাস)', en: 'Government (khas)' }, area: 15 },
        { survey: 'RS', no: '1', year: 1978, owner: { bn: 'সরকার (খাস)', en: 'Government (khas)' }, area: 15 },
        { survey: 'BS', no: '1', year: 1998, owner: { bn: 'সরকার (খাস)', en: 'Government (khas)' }, area: 15 }
      ]
    },
    {
      dag: '618', area: 60,
      landClass: { bn: 'নাল (কৃষি)', en: 'Agricultural' },
      bsOwners: { P09: 60 },
      shape: '320,180 470,186 476,306 336,300 330,250',
      khatians: [
        { survey: 'CS', no: '72', year: 1915, owner: { bn: 'আজিজুর রহমান', en: 'Azizur Rahman' }, area: 60 },
        { survey: 'SA', no: '101', year: 1962, owner: { bn: 'হাবিবুর রহমান', en: 'Habibur Rahman' }, area: 60, basis: 'inheritance' },
        { survey: 'RS', no: '150', year: 1978, owner: { bn: 'হাবিবুর রহমান', en: 'Habibur Rahman' }, area: 60 },
        { survey: 'BS', no: '274', year: 1998, owner: { bn: 'হাবিবুর রহমান', en: 'Habibur Rahman' }, area: 60 }
      ]
    },
    {
      dag: '709', area: 25,
      landClass: { bn: 'ভিটা (বসতবাড়ি)', en: 'Homestead' },
      bsOwners: { P10: 25 },
      shape: '470,186 596,192 590,310 476,306',
      khatians: [
        { survey: 'CS', no: '88', year: 1915, owner: { bn: 'সুলতান আহমেদ', en: 'Sultan Ahmed' }, area: 25 },
        { survey: 'SA', no: '120', year: 1962, owner: { bn: 'সুলতান আহমেদ', en: 'Sultan Ahmed' }, area: 25 },
        { survey: 'RS', no: '166', year: 1978, owner: { bn: 'সুলতানা পারভীন', en: 'Sultana Parvin' }, area: 25, basis: 'inheritance' },
        { survey: 'BS', no: '290', year: 1998, owner: { bn: 'সুলতানা পারভীন', en: 'Sultana Parvin' }, area: 25 }
      ]
    }
  ],

  // Plots on the map that are not in this demo database (drawn in grey).
  otherShapes: [
    '470,34 600,48 594,146 462,142',
    '200,262 330,250 336,300 200,300',
    '60,306 200,300 208,392 66,396',
    '200,300 336,300 340,390 208,392',
    '336,300 476,306 480,388 340,390',
    '476,306 590,310 584,384 480,388'
  ],

  // Registers kept by OTHER offices. In real life these live in separate
  // offices that do not talk to each other — BhumiSutra links them.
  courtCases: [
    {
      dag: '422', no: { bn: 'দেওয়ানি মামলা ১১২/২০২৫ (ডেমো)', en: 'Civil Suit 112/2025 (demo)' },
      court: { bn: 'ডেমো যুগ্ম জেলা জজ আদালত-১', en: 'Demo Joint District Judge Court-1' },
      kind: { bn: 'বণ্টন মামলা', en: 'Partition suit' },
      filed: '2025-05-18', status: 'pending'
    }
  ],
  khasRegister: [
    { dag: '530', ref: { bn: 'খাস খতিয়ান ১ (ডেমো)', en: 'Khas khatian 1 (demo)' } }
  ],
  acquisitions: [
    {
      dag: '618', ref: { bn: 'এলএ কেস ০৪/২০২৫ (ডেমো)', en: 'LA Case 04/2025 (demo)' },
      project: { bn: 'ডেমো সংযোগ সড়ক প্রকল্প', en: 'Demo link road project' },
      office: { bn: 'জেলা প্রশাসকের কার্যালয়, ডেমো জেলা', en: 'DC Office, Demo District' },
      stage: { bn: 'প্রাথমিক নোটিশ জারি হয়েছে', en: 'Preliminary notice issued' },
      date: '2025-07-01'
    }
  ],

  /*
   * Seed ledger events. Timestamps are fixed so every browser builds the
   * exact same chain with the exact same hashes — that is why a QR code
   * printed from one computer can be verified on any phone.
   */
  seedEvents: [
    { type: 'GENESIS', timestamp: '2018-01-01T00:00:00.000Z',
      payload: { network: 'BhumiSutra demo ledger', mouza: 'Shaplapur', jl: '117' } },
    // index 1: KHATIAN_BATCH_ANCHORED is generated in ledger.js from the khatians above
    { type: 'DEED_REGISTERED', timestamp: '2019-03-14T05:30:00.000Z',
      payload: { deedNo: 'D-2019-0451', dag: '101', seller: 'P01', buyer: 'P04', area: 33, price: 1650000, date: '2019-03-14', office: 'subreg', kind: 'sale' } },
    { type: 'MUTATION_APPROVED', timestamp: '2019-05-02T06:00:00.000Z',
      payload: { caseNo: 'M-2019-0212', deedNo: 'D-2019-0451', dag: '101', from: 'P01', to: 'P04', area: 33, date: '2019-05-02', office: 'acland' } },
    { type: 'DEED_REGISTERED', timestamp: '2024-03-05T04:45:00.000Z',
      payload: { deedNo: 'D-2024-0137', dag: '205', seller: 'P03', buyer: 'P06', area: 20, price: 2400000, date: '2024-03-05', office: 'subreg', kind: 'sale' } },
    { type: 'MUTATION_APPROVED', timestamp: '2024-04-18T07:15:00.000Z',
      payload: { caseNo: 'M-2024-0098', deedNo: 'D-2024-0137', dag: '205', from: 'P03', to: 'P06', area: 20, date: '2024-04-18', office: 'acland' } },
    { type: 'DEED_REGISTERED', timestamp: '2025-01-12T05:00:00.000Z',
      payload: { deedNo: 'D-2025-0019', dag: '709', seller: 'P10', buyer: 'P11', area: 25, price: 1875000, date: '2025-01-12', office: 'subreg', kind: 'sale' } },
    { type: 'MORTGAGE_CREATED', timestamp: '2025-02-10T08:20:00.000Z',
      payload: { ref: 'MTG-2025-0031', dag: '422', owner: 'P08', bank: 'B1', amount: 1500000, area: 40, date: '2025-02-10' } }
  ],

  // e-Mutation applications waiting at the AC Land office.
  seedMutationQueue: [
    { caseNo: 'M-2025-0014', deedNo: 'D-2025-0019', dag: '709', from: 'P10', to: 'P11', area: 25, filed: '2025-01-20', status: 'pending' }
  ],

  // Attempts the system already blocked (shown on the overview).
  seedAlerts: [
    { time: '2025-06-22T05:10:00.000Z', type: 'DOUBLE_SALE', dag: '205',
      detail: { seller: 'P03', buyer: 'P05', area: 20, priorDeed: 'D-2024-0137' } },
    { time: '2025-08-03T09:40:00.000Z', type: 'KHAS_SALE', dag: '530',
      detail: { seller: 'P11', buyer: 'P05', area: 15 } }
  ]
};
