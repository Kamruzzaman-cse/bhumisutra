# BhumiSutra (ভূমিসূত্র)

**Every land deed gets a record no one can quietly change.**

BhumiSutra is a tamper-proof land record and fraud-detection system for Bangladesh. It keeps every deed, mutation and mortgage in a SHA-256 hash-chained ledger. It also checks the registers of separate offices together before any transaction, so fake deeds, double selling and record mismatches are caught before money changes hands.

- **Hackathon:** LandTech Innovation Hackathon 2026, Daffodil International University
- **Track:** Digital Land Records, Verification & Digitization
- **Chosen problem:** **P3: Catch Fraud & Double-Selling.** It covers fake documents, the same land sold to more than one buyer, and records that do not match between registration and mutation. P2-style hashing and QR verification is how it works.
- **Team:** TerraCoder
- **Live demo:** _add your Vercel / GitHub Pages link here_

> ⚠️ **All data is fictional.** Every person, plot, deed, khatian, court case and bank in this project is made up. No real names, NID numbers, phone numbers or real land records are used, and nothing was taken from any government website.

---

## The problem

Most land disputes in Bangladesh start in one of three ways:

1. **Fake or altered deeds.** A paper deed is hard to check. Changing one number in the area or one name is enough.
2. **The same land sold twice.** The Sub-Registry office has no instant view of an earlier sale, especially before mutation is done.
3. **Records that disagree.** CS, SA, RS and BS khatians show different names or areas. Registration and mutation records also drift apart.

The Sub-Registry office, AC Land office, courts, DC office and banks each keep their own records, and those records are not connected.

## What BhumiSutra does

| Who uses it | Screen | What it does |
|---|---|---|
| Citizens and buyers | **Check before you buy** | Gives a 0–100 safety score per plot. It reads deeds, mutation, khatians, court cases, khas, acquisition and mortgages together, and shows the full ownership history on a timeline. |
| Anyone holding a deed | **Verify a deed** | Checks a deed by number, by scanning its **QR code**, or by uploading the digital deed file. A changed file is caught, and the screen shows **exactly which field** was changed. |
| Sub-Registry office | **Register a deed** | Runs automatic checks before registration. It **blocks double sales**, khas land sales, land under acquisition, land in a court case and mortgaged land. A successful registration adds a block to the ledger and **files the e-Mutation application automatically**. |
| AC Land office | **e-Mutation** | Each application is linked to its registered deed. The deed, parties, area and seller's recorded ownership are checked against the ledger before approval, and status is tracked step by step. |
| Banks | **Mortgage check** | **Blocks the same land being mortgaged to two banks.** Mortgages and releases are recorded on the ledger. |
| DLRS / survey | **Khatian matching** | Shows the CS, SA, RS and BS records side by side and flags name or area changes that have no recorded basis. Every digitized khatian is fingerprinted and anchored on the ledger. It also lists registration vs mutation mismatches. |
| Judges / auditors | **Ledger and Tamper Lab** | Shows every block with its hash and previous hash. The Tamper Lab lets you play an attacker: edit an old record directly in storage and watch the chain break at that exact block. |

The whole app works in **Bangla and English** (one-click switch), on **mobile and desktop**, and in light and dark mode.

## How it works

```
 Deed / mutation / mortgage
            │
            ▼
 canonical JSON (keys sorted)  ──►  SHA-256  ──►  block.hash
            │                                         │
            ▼                                         ▼
 block = { index, timestamp, type, payload, prevHash, hash }
            │
            ▼
 #0 ── #1 ── #2 ── #3 ── …   each block stores the hash of the one before
```

- **Fingerprint:** `hash = SHA-256(canonical({index, timestamp, type, payload, prevHash}))`, computed with the browser's Web Crypto API.
- **Chain check:** `verify()` recomputes every hash and checks every `prevHash` link. If anyone edits an old record, its hash no longer matches. If an attacker also rebuilds that hash, the next block's link breaks.
- **Ownership by replay:** the engine replays the ledger to work out two things for each plot. One is who owns it according to **deeds**, and the other is who it is **recorded** to after approved mutations. A difference between them is a "registered but not mutated" risk.
- **Double sale:** if the seller's remaining area on deeds is less than the area being sold, and the seller sold this plot before, the sale is blocked and the earlier deed is named.
- **QR codes:** every certificate has a QR code. It holds the deed number and the first 12 characters of its block hash. Scanning it opens the Verify page, which shows the **genuine** details from the ledger for comparison with the paper.
- **Deterministic seed:** demo blocks use fixed timestamps, so every browser builds identical hashes. That is why a QR code printed on one computer verifies on any phone.

### Files

```
index.html               app shell
assets/css/style.css     design system (light + dark, responsive, print)
assets/js/crypto.js      canonical JSON + SHA-256
assets/js/data.js        FICTIONAL demo data (plots, khatians, people, registers)
assets/js/ledger.js      hash-chained ledger, verify(), Tamper Lab, saved state
assets/js/engine.js      rules: ownership replay, sale/mortgage/mutation checks, safety score
assets/js/i18n.js        every on-screen word in Bangla and English
assets/js/ui.js          formatting (Bangla digits, ৳, dates), QR, toasts
assets/js/views.js       all screens
assets/js/app.js         start-up and hash router
assets/vendor/qrcode.js  QR code generator (MIT, see credits)
docs/                    code guide (Bangla) and demo video script
```

## How to run

There is no build step and no server code.

**Option 1: open the live link** (recommended).

**Option 2: run locally.**

```bash
git clone https://github.com/Kamruzzaman-cse/bhumisutra.git
cd bhumisutra
python -m http.server 8000      # or: npx serve .
# open http://localhost:8000 in Chrome
```

Double-clicking `index.html` also works in Chrome. A local server is closer to the real deployment.

**Deploy:** push to GitHub and import the repo in Vercel (framework preset "Other", no build command), or turn on GitHub Pages for the `main` branch root.

**Reset demo data:** Ledger and Tamper Lab → "Restore demo data". Data is saved in the browser's localStorage.

## 3-minute demo path

1. **Overview:** the mouza map is coloured by risk, and the stats show attempts already blocked.
2. **Check before you buy → plot 422:** score 25, with a pending court case and a bank mortgage. Then plot 709: score 75, registered but not mutated.
3. **Register a deed → "Same land sold twice":** blocked. The screen names the earlier deed D-2024-0137, its date and its buyer.
4. **Register a deed → "Valid sale" → Register:** a new block is added and the e-Mutation application is filed automatically.
5. **Certificate → Download deed file:** change the area in Notepad, then upload it on **Verify a deed**. It shows "Fake deed" and the exact changed field.
6. **Bank → "Same land, second bank":** the double mortgage is blocked.
7. **Ledger → Tamper Lab:** edit block #2 as a "smart" attacker. The chain breaks at block #3, and the header turns red everywhere.

## Data used

Only **made-up demo data**, written by the team in `assets/js/data.js`:

- 1 fictional mouza ("Shaplapur", JL 117, Demo Upazila), with 7 plots that each show a different case: clean, double-sale attempt, khatian mismatch, court case + mortgage, khas land, acquisition, and not mutated.
- 11 fictional people with `DEMO-ID-xxxx` identifiers (not NID numbers).
- Fictional deeds, khatians (CS 1915, SA 1962, RS 1978, BS 1998), a court case, a khas register entry, an acquisition notice and two fictional banks.

No real people, NID numbers, phone numbers or real land records were used. No government website was scraped or contacted, and no live system was tested.

## AI tools used

- **Claude (Anthropic)**, through the Claude app, was used as a coding assistant. It helped design the architecture and write the code, the Bangla/English text and this README.
- Every commit that used AI says so in its message. The team reviewed, tested and can explain all of the code (see `docs/CODE_GUIDE_BN.md`).

## Open-source credits

- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase, MIT License, bundled in `assets/vendor/qrcode.js`.
- Fonts from Google Fonts, all under the SIL Open Font License: **Hind Siliguri**, **Tiro Bangla** and **JetBrains Mono**.
- Web Crypto API (built into the browser) for SHA-256.

## From prototype to nationwide system

| Prototype | Production plan |
|---|---|
| Ledger in one browser (localStorage) | A permissioned ledger with copies (nodes) at the Sub-Registry, AC Land, DLRS and DC offices, so no single office can rewrite history |
| Fictional registers | Authorised API links to e-Mutation, court case, khas and acquisition registers and bank systems, under government agreements |
| Demo IDs | Identity checks through official NID verification services, with consent |
| Hash + QR | Officer digital signatures (PKI under Bangladesh's Controller of Certifying Authorities) added to every block |
| One mouza | Pilot in one upazila, then expand upazila by upazila |

## Team TerraCoder

- **Kamruzzaman Amit**, Team Leader, Department of CSE, Daffodil International University
- **Md. Musfiqur Rahman Tomal**, Department of Real Estate, Daffodil International University
- **Faculty mentor:** Umme Ayman, Lecturer (Senior Scale), CSE
- **Industry mentor:** _to be added_

## Changes after Round 1

_Changes made for the Final Round will be listed here (rulebook Section 9)._

## License

[MIT](LICENSE)
