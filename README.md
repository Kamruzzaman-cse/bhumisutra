# BhumiSutra (ভূমিসূত্র)

**Turn old land papers into trusted digital records, and stop land fraud before money changes hands.**

BhumiSutra is a working prototype for Bangladesh's land offices and citizens. It does four things:

1. It reads scanned khatians and deeds with **Bangla OCR**.
2. It stores them in the **official khatian format**.
3. It locks every record, deed, mutation, mortgage and tax payment into a **SHA-256 hash-chained ledger**.
4. It **checks the registers of every office together** before a sale, mutation or mortgage.

The existing government systems keep running. BhumiSutra sits beside them as a verification layer.

| | |
|---|---|
| **Hackathon** | LandTech Innovation Hackathon 2026, Daffodil International University |
| **Track** | Digital Land Records, Verification & Digitization |
| **Core problems** | **P1: Digitize Old Records** and **P3: Catch Fraud & Double-Selling** |
| **Also linked** | P2 (verify deeds by QR and hash), P4 (registration files e-Mutation automatically), P5 (check before you buy) |
| **Team** | TerraCoder (LA-146) |
| **Live demo** | _add the Vercel link here_ |
| **Demo video** | _add the video link here_ |

> ⚠️ **All data is fictional.** Every person, plot, deed, khatian, court case and bank is made up. Sample "scans" are drawn by a script (`tools/make_sample_scans.py`). No real names, NID numbers, phone numbers or land records are used. No government website was scraped or contacted.

---

## 🔑 Demo logins (for judges)

The login page has **one-click cards** for every role, so no typing is needed. The password for every account is **`demo1234`**.

| Role | Username | What to try |
|---|---|---|
| Citizen (land owner) | `citizen` | My land: an alert that someone tried to sell her plot, land tax due → pay → receipt with QR |
| Sub-Registrar | `subreg` | Register a deed: "Same land sold twice" is blocked; "Valid sale" registers and files e-Mutation |
| AC Land | `acland` | Approve e-Mutation with automatic checks; land development tax desk |
| Survey & Records Officer | `survey` | **Digitize**: pick a sample scan → Read the text → fix flagged fields → save to ledger |
| Bank officer | `bank` | "Same land, second bank" is blocked |
| Admin | `admin` | Dashboard, audit log, Tamper Lab |

You don't need to log in to search land, verify a deed, read the access policy or view the ledger.

---

## The problem

Land disputes in Bangladesh usually start with:

1. **Old paper records.** CS, SA, RS and BS khatians and old deeds sit on paper, often handwritten. They are hard to search and easy to alter.
2. **Fake or altered deeds.** A single changed number on a paper deed is hard to catch.
3. **The same land sold twice**, or mortgaged to two banks.
4. **Records that disagree.** Survey records conflict with each other, and registration does not match mutation.
5. **Separate offices.** The Sub-Registry, AC Land, survey office, courts, DC office and banks keep separate records that do not talk to each other.

## What BhumiSutra does

| User | Screen | What it does |
|---|---|---|
| Survey & Records officer | **Digitize old papers (P1)** | Bangla + English OCR runs **in the browser and offline**. It detects whether the paper is a khatian or a deed, then fills the official fields: district, upazila, mouza, JL no., khatian no., survey, year, owners with father/husband, address and share, and dag rows with class, total area, share and area. Each field shows its **OCR confidence**. Automatic checks catch shares that don't add to 1.000 and area totals that don't match. A deed is **cross-checked against the digitized khatian**: is the seller an owner, is the dag in that khatian, does the area fit the seller's share? The officer corrects and saves. The record fingerprint and **original scan fingerprint** go on the ledger. |
| Anyone | **Land records and check (P5)** | District → upazila → mouza, then search by **dag or khatian number**. It shows the khatian in the official layout (CS / SA / RS / BS tabs), a **"where it came from, where it went" ownership flow**, a 0–100 safety score, the full timeline, and linked registers (court case, khas, acquisition, mortgage, tax). Digitized mouzas become searchable right after digitization. |
| Anyone | **Verify a deed (P2)** | Verify by deed number, **QR code** or the digital deed file. A changed file is caught, and the screen shows exactly which field changed. |
| Sub-Registrar | **Register a deed (P3, P4)** | Automatic checks before registration: ownership, **double sale**, khas, acquisition, court case, mortgage, khatian mismatches and **land development tax**. Registration adds a ledger block and **files e-Mutation automatically**. |
| AC Land | **e-Mutation (P4)** | Each application is linked to its deed and checked against the ledger before approval. |
| AC Land | **Land development tax** | Holdings with exempt, up-to-date or due status. Unpaid tax blocks registration. |
| Bank | **Mortgage check** | **Blocks double mortgages**. Mortgages and releases go on the ledger. |
| Citizen | **My land and tax** | Own plots, deeds and alerts. Pay tax (demo) and get a **receipt with a QR code**. |
| DLRS | **Khatian matching** | Flags owner-name or area changes between surveys that have no recorded reason. Also shows registration vs mutation mismatches. |
| Admin | **Dashboard, audit log, Tamper Lab** | System totals, blocked fraud by type, and every official action. Edit a stored record directly and watch the chain break at that block. |

The interface **opens in Bangla**, with English one click away. It has large task tiles on the home page and a text-size control, and works fully by keyboard and on phones, in light or dark mode.

## Who can see what (data access policy)

Searching is open, but private data is protected. The rules live in `assets/js/auth.js` (`POLICY`) and are shown in the app under **Who can see what**.

| Data | Public | Citizen | Sub-Reg | AC Land | Survey | Bank | Admin |
|---|---|---|---|---|---|---|---|
| Plot, khatian, owner name | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Encumbrance exists (mortgage, case, khas, acquisition) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Owner ID number | ✗ | own | ✓ | ✓ | ✗ | ✓ | masked |
| Deed price | ✗ | own | ✓ | ✓ | ✗ | ✓ | ✓ |
| Loan amount | ✗ | own | masked | masked | ✗ | ✓ | ✓ |
| Court case details | masked | own | ✓ | ✓ | masked | ✓ | ✓ |
| Original scanned paper | ✗ | own | ✓ | ✓ | ✓ | ✗ | ✓ |
| Audit log | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

Officers' actions are written to an **audit log**. Sessions end after **30 minutes** without activity.

## How it works

```
 scan ──► Tesseract OCR (ben+eng, in browser) ──► parser ──► official khatian/deed fields
                                                              │  officer checks & corrects
                                                              ▼
 record + SHA-256(scan) ──► canonical JSON ──► SHA-256 ──► ledger block
 deed / mutation / mortgage / tax ────────────────────────► ledger block

 block = { index, timestamp, type, payload, prevHash, hash }
 #0 ── #1 ── #2 ── …  each block stores the hash of the one before
```

- **Tamper evidence:** `verify()` recomputes every hash and every `prevHash` link. If an old record is edited, that block fails. If the attacker also rebuilds the hash, the next block's link fails.
- **Ownership by replay:** the ledger is replayed to work out who owns each plot by **deeds** and who owns it by **mutation record**. A mismatch means "registered but not mutated".
- **Double sale:** if a seller's remaining area is less than the area being sold and they sold this plot before, the sale is blocked and the earlier deed is named.
- **QR codes:** deed certificates and tax receipts carry a QR code. Scanning it opens the genuine ledger record. Seed data uses fixed timestamps, so every device builds identical hashes.
- **Data formats:** khatian records follow the official layout (areas in acres to 4 decimals, shares to 3 decimals). Deeds follow the sale-deed layout with a schedule (তফসিল). Real records can therefore be imported later without changing the data model.

### Files

```
index.html                    app shell
assets/css/fonts.css          local fonts (offline, OFL)
assets/css/style.css          design system: light/dark, responsive, print
assets/js/crypto.js           canonical JSON + SHA-256
assets/js/data.js             FICTIONAL data: plots, khatians, people, registers, tax holdings
assets/js/ledger.js           hash-chained ledger, verify(), Tamper Lab, saved state
assets/js/auth.js             demo accounts, roles, access policy, audit log, session timeout
assets/js/engine.js           rules: ownership replay, sale/mortgage/mutation checks, tax, safety score
assets/js/ocr.js              Tesseract wrapper + parser into official khatian/deed fields + validation
assets/js/i18n.js, i18n2.js   every word in Bangla and English
assets/js/ui.js               Bangla digits, ৳, dates, QR, toasts
assets/js/views.js            search, verify, certificate, registry, e-Mutation, bank, khatian matching, ledger
assets/js/views2.js           login, my land, tax, receipts, digitization, records, dashboard, audit, access policy
assets/js/app.js              start-up, role-aware menu, route guard, hash router
assets/vendor/                QR generator (MIT), Tesseract.js + core + ben/eng data (Apache-2.0)
samples/                      fictional sample scans for the OCR demo
tools/make_sample_scans.py    script that draws the sample scans
docs/                         Bangla code guide and demo video script
```

## How to run

There is no build step and no server code.

```bash
git clone https://github.com/Kamruzzaman-cse/bhumisutra.git
cd bhumisutra
python -m http.server 8000        # or: npx serve .
# open http://localhost:8000 in Chrome
```

OCR uses a Web Worker, which browsers don't allow from `file://`, so use a local server rather than double-clicking `index.html`.

- **Deploy:** import the repo in Vercel (framework preset "Other", no build command), or turn on GitHub Pages for the `main` branch root.
- **Reset demo data:** log in as `admin` → Ledger and Tamper Lab → "Restore demo data".
- **Works offline:** fonts, the QR library, the OCR engine and its language data are all inside the project.

## 3-minute demo path

1. **Home:** the page opens in Bangla. Show the risk-coloured mouza map and the large task tiles.
2. **Land records:** search Shaplapur, dag 101. Show the khatian tabs (CS → BS) and the ownership flow. Then show dag 422 (court case + mortgage, score 25) as a public visitor: private details are hidden.
3. **Login → Survey officer → Digitize:** use the "Printed BS khatian" sample → Read the text. The checks flag an area mismatch; fix row 1022 and save. Then do the "Typed deed" sample, where the cross-check passes. Search **Kashful, dag 1022** to see the new records and the ownership flow.
4. **Sub-Registrar:** "Same land sold twice" is blocked with the earlier deed named. "Valid sale" registers and files e-Mutation.
5. **Citizen:** see the alert that her land was targeted, pay the tax and get a QR receipt.
6. **Admin → Tamper Lab:** edit block #2 as a smart attacker. The chain breaks at the next block and the header turns red everywhere. Show the audit log.

## Data used

Only **made-up data**:

- **Shaplapur mouza (JL 117):** 7 plots, each showing a different case: clean with a partial sale, double-sale attempt, khatian mismatch, court case + mortgage, khas land, acquisition notice, and registered but not mutated. Each plot has CS (1915), SA (1962), RS (1978) and BS (1998) khatians.
- **Kashful mouza (JL 118):** starts empty and fills from the sample scans: BS khatian 312, SA khatian 89 and deed 377/2021.
- **Other data:** 11 fictional people with `DEMO-ID-xxxx` identifiers (not NID numbers), two fictional banks, a court case, a khas entry, an acquisition notice and land tax holdings.

## AI tools used

- **Claude (Anthropic)**, used through the Claude app, helped design the architecture, write the code, Bangla/English text, sample-scan generator and documentation.
- Every AI-assisted commit says so in its message. The team reviewed and tested the code and can explain all of it (see `docs/CODE_GUIDE_BN.md`).

## Open-source credits

- [Tesseract.js](https://github.com/naptha/tesseract.js) and tesseract.js-core, Apache-2.0, with Tesseract `ben` and `eng` LSTM language data (Apache-2.0).
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase, MIT.
- Fonts under the SIL Open Font License: Hind Siliguri, Tiro Bangla, JetBrains Mono, and Noto Serif Bengali and Galada (used only for the sample scans).
- The browser's Web Crypto API for SHA-256.

## From prototype to nationwide system

| Prototype | Production plan |
|---|---|
| Ledger in one browser | Permissioned ledger with copies at Sub-Registry, AC Land, DLRS and DC offices; latest hash published daily |
| Fictional registers | Authorised APIs to existing e-Mutation, e-Porcha, land development tax, court and bank systems; nothing is replaced |
| Tesseract OCR | Same pipeline, plus a Bangla handwriting model trained on officer-corrected records; batch scanning at upazila record rooms |
| Demo logins | Government SSO for officers; NID + OTP for citizens; role-based access as in `POLICY` |
| Hash + QR | Officer digital signatures (PKI) added to every block |
| One upazila | Pilot in one upazila, then expand upazila by upazila |

## Team TerraCoder (LA-146)

- **Md. Kamruzzaman Amit**, Team Leader, Department of CSE, Daffodil International University
- **Md. Musfiqur Rahman Tomal**, Department of Real Estate, Daffodil International University
- **Faculty mentor:** Umme Ayman, Lecturer (Senior Scale), CSE
- **Industry support mentor:** MD Shanto Ali, CSE-TECH

## Changes after Round 1

_Changes made for the Final Round will be listed here (rulebook Section 9)._

## License

[MIT](LICENSE)
