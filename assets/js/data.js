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

  /*
   * Fictional people. f = father/husband.
   * nid: FICTIONAL 10-digit numbers starting with 000 (no real smart NID
   * looks like this). mobile: 010… (not an operator prefix). email: example.com
   * (a domain reserved for examples). Nothing here belongs to a real person.
   * consent: how this owner approves a sale — 'sms', 'email', 'app'
   * (authenticator, for owners living abroad). lock: transfers blocked
   * until the owner unlocks. nominee: trusted person who can also approve.
   */
  persons: {
    P01: { bn: 'আব্দুল করিম', en: 'Abdul Karim', f: { bn: 'মোসলেম উদ্দিন', en: 'Moslem Uddin' }, nid: '0001000001', dob: '1951-03-12', mobile: '01000000001', consent: 'sms' },
    P02: { bn: 'রহিমা বেগম', en: 'Rahima Begum', f: { bn: 'আব্দুল করিম', en: 'Abdul Karim' }, rel: 'husband', nid: '0001000002', dob: '1958-07-01', mobile: '01000000002', consent: 'sms' },
    P03: { bn: 'জামাল হোসেন', en: 'Jamal Hossain', f: { bn: 'ইসমাইল হোসেন', en: 'Ismail Hossain' }, nid: '0001000003', dob: '1969-11-20', mobile: '01000000003', consent: 'sms' },
    P04: { bn: 'সেলিনা আক্তার', en: 'Selina Akter', f: { bn: 'আব্দুল হামিদ', en: 'Abdul Hamid' }, nid: '0001000004', dob: '1985-02-14', mobile: '01000000004', email: 'selina@example.com', abroad: { bn: 'ইতালি', en: 'Italy' }, consent: 'app', totp: 'JBSWY3DPEHPK3PXPJBSWY3DP', nominee: 'P02' },
    P05: { bn: 'মনির উদ্দিন', en: 'Monir Uddin', f: { bn: 'কাশেম উদ্দিন', en: 'Kashem Uddin' }, nid: '0001000005', dob: '1979-09-09', mobile: '01000000005', email: 'monir@example.com', abroad: { bn: 'সৌদি আরব', en: 'Saudi Arabia' }, consent: 'email', lock: true },
    P06: { bn: 'ফারহানা ইসলাম', en: 'Farhana Islam', f: { bn: 'নুরুল ইসলাম', en: 'Nurul Islam' }, nid: '0001000006', dob: '1990-05-23', mobile: '01000000006', email: 'farhana@example.com', consent: 'sms' },
    P07: { bn: 'রফিক মিয়া', en: 'Rafiq Mia', f: { bn: 'আলতাফ মিয়া', en: 'Altaf Mia' }, nid: '0001000007', dob: '1948-01-05', died: '2024-02-10' },
    P08: { bn: 'নাসিমা খাতুন', en: 'Nasima Khatun', f: { bn: 'নাসিরউদ্দিন', en: 'Nasiruddin' }, nid: '0001000008', dob: '1972-12-30', mobile: '01000000008', consent: 'sms' },
    P09: { bn: 'হাবিবুর রহমান', en: 'Habibur Rahman', f: { bn: 'আজিজুর রহমান', en: 'Azizur Rahman' }, nid: '0001000009', dob: '1966-04-18', mobile: '01000000009', consent: 'sms' },
    P10: { bn: 'সুলতানা পারভীন', en: 'Sultana Parvin', f: { bn: 'সুলতান আহমেদ', en: 'Sultan Ahmed' }, nid: '0001000010', dob: '1981-08-08', mobile: '01000000010', consent: 'sms' },
    P11: { bn: 'কামাল সরকার', en: 'Kamal Sarkar', f: { bn: 'জালাল সরকার', en: 'Jalal Sarkar' }, nid: '0001000011', dob: '1975-06-15', mobile: '01000000011', consent: 'sms' },
    P12: { bn: 'আমেনা বেগম', en: 'Amena Begum', f: { bn: 'রফিক মিয়া', en: 'Rafiq Mia' }, rel: 'husband', nid: '0001000012', dob: '1955-10-10', mobile: '01000000012', consent: 'sms' },
    P13: { bn: 'রাসেল মিয়া', en: 'Rasel Mia', f: { bn: 'রফিক মিয়া', en: 'Rafiq Mia' }, nid: '0001000013', dob: '1980-03-03', mobile: '01000000013', consent: 'sms' },
    P14: { bn: 'সোহেল মিয়া', en: 'Sohel Mia', f: { bn: 'রফিক মিয়া', en: 'Rafiq Mia' }, nid: '0001000014', dob: '1983-07-21', mobile: '01000000014', email: 'sohel@example.com', abroad: { bn: 'মালয়েশিয়া', en: 'Malaysia' }, consent: 'app', totp: 'KRSXG5DSNFXGOIDCMFXGOYLMMFSGK3TB' },
    P15: { bn: 'রুমানা আক্তার', en: 'Rumana Akter', f: { bn: 'রফিক মিয়া', en: 'Rafiq Mia' }, nid: '0001000015', dob: '1987-12-12', mobile: '01000000015', consent: 'sms' },
    GOV: { bn: 'বাংলাদেশ সরকার (খাস)', en: 'Government of Bangladesh (khas)' }
  },

  // Administrative units. Shaplapur has full records; Kashful starts empty
  // and fills up when old papers are digitized (see Digitize screen).
  mouzas: [
    { id: 'shaplapur', name: { bn: 'শাপলাপুর', en: 'Shaplapur' }, jl: '117', full: true },
    { id: 'kashful', name: { bn: 'কাশফুল', en: 'Kashful' }, jl: '118', full: false }
  ],

  /*
   * Land Development Tax (ভূমি উন্নয়ন কর) holdings. Fiscal year runs July–June.
   * Agricultural land up to 25 bigha per family is exempt, so those holdings
   * show "exempt". paidTo = last fiscal year paid (start year), annual = BDT.
   */
  holdings: [
    { no: '1001', owner: 'P04', dags: ['101'], exempt: true },
    { no: '1007', owner: 'P05', dags: ['101'], exempt: true },
    { no: '1002', owner: 'P06', dags: ['205'], annual: 480, paidTo: 2025 },
    { no: '1003', owner: 'P07', dags: ['317'], exempt: true },
    { no: '1008', owner: 'P13', dags: ['317'], exempt: true },
    { no: '1004', owner: 'P08', dags: ['422'], annual: 960, paidTo: 2026 },
    { no: '1005', owner: 'P09', dags: ['618'], exempt: true },
    { no: '1006', owner: 'P10', dags: ['709'], annual: 600, paidTo: 2023 }
  ],

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
    { type: 'DEED_REGISTERED', timestamp: '2023-08-21T05:15:00.000Z',
      payload: { deedNo: 'D-2023-0088', dag: '101', seller: 'P04', buyer: 'P05', area: 5, price: 300000, date: '2023-08-21', office: 'subreg', kind: 'sale' } },
    { type: 'MUTATION_APPROVED', timestamp: '2023-10-09T06:30:00.000Z',
      payload: { caseNo: 'M-2023-0151', deedNo: 'D-2023-0088', dag: '101', from: 'P04', to: 'P05', area: 5, date: '2023-10-09', office: 'acland' } },
    { type: 'DEED_REGISTERED', timestamp: '2024-03-05T04:45:00.000Z',
      payload: { deedNo: 'D-2024-0137', dag: '205', seller: 'P03', buyer: 'P06', area: 20, price: 2400000, date: '2024-03-05', office: 'subreg', kind: 'sale' } },
    { type: 'MUTATION_APPROVED', timestamp: '2024-04-18T07:15:00.000Z',
      payload: { caseNo: 'M-2024-0098', deedNo: 'D-2024-0137', dag: '205', from: 'P03', to: 'P06', area: 20, date: '2024-04-18', office: 'acland' } },
    { type: 'SUCCESSION_RECORDED', timestamp: '2024-06-05T05:00:00.000Z',
      payload: { ref: 'WS-2024-0042', dag: '317', deceased: 'P07', died: '2024-02-10', heirs: { P12: 6.25, P13: 17.5, P14: 17.5, P15: 8.75 }, basis: 'faraiz', date: '2024-06-05', office: 'acland' } },
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
