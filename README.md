# BhumiSutra (ভূমিসূত্র)

**Stop land fraud and double-selling before money changes hands, and turn old land papers into trusted digital records.**

BhumiSutra is a working prototype for Bangladesh's land offices and citizens. It:

1. **Checks the registers of every office together** before a sale, mutation or mortgage, and blocks double-selling.
2. **Verifies the seller's NID** and asks for **the real owner's consent**, including owners who live abroad.
3. Puts every pending sale on a **72-hour public notice**, and holds the money in **escrow** until mutation.
4. Protects **heirs' shares** and lets owners **lock** their land.
5. Records every deed, mutation, mortgage and tax payment on a **SHA-256 hash-chained ledger**, with **digitally signed QR codes** any phone can check.
6. **Digitizes old khatians and deeds** with Bangla OCR into the official format.

The existing government systems keep running. BhumiSutra sits beside them as a verification layer.

| | |
|---|---|
| **Hackathon** | LandTech Innovation Hackathon 2026, Daffodil International University |
| **Track** | Digital Land Records, Verification & Digitization |
| **Core problem** | **P3: Catch Fraud & Double-Selling** |
| **Linked problems** | P1 (digitize old records with Bangla OCR), P2 (verify deeds by signed QR), P4 (registration files e-Mutation automatically), P5 (check before you buy) |
| **Our innovation (P6)** | **ভূমিসূত্র সুরক্ষা (BhumiSutra Shield):** owner consent, 72-hour public notice, escrow, land lock, heir protection, plot QR signboard |
| **Team** | TerraCoder (LA-146) |
| **Live demo** | _add the Vercel link here_ |
| **Demo video** | _add the video link here_ |

> ⚠️ **All data is fictional.** Every person, NID, phone number, plot, deed, khatian, court case and bank is made up. Demo NIDs are 10 digits starting with `000`, mobiles start with `010`, emails end in `@example.com`. Sample "scans" are drawn by a script (`tools/make_sample_scans.py`). No real names, NID numbers or land records are used, and no government website was scraped or contacted. The NID card design is not copied.

---

## 🔑 Demo logins (for judges)

Every login form has a **demo table with a "Fill in" button**, so nothing needs typing.

**Officers:** password for every account is **`demo1234`**.

| Role | Username | What to try |
|---|---|---|
| Sub-Registrar | `subreg` | **Safe registration**: try the 7 ready cases (valid sale, double sale, fake NID, heir selling the whole plot, locked land, khas land, mortgaged land) |
| AC Land | `acland` | Approve e-Mutation (this releases the escrow); land development tax desk |
| Survey & Records Officer | `survey` | **Digitize**: pick a sample scan → Read the text → fix flagged fields → save to ledger |
| Bank officer | `bank` | "Same land, second bank" is blocked |
| Admin | `admin` | Dashboard with fraud watchlist, audit log, Tamper Lab |

**Citizens:** NID + date of birth, then a 6-digit one-time code. In the demo, the code appears on a simulated phone or authenticator on screen.

| Person (fictional) | NID | Date of birth | Shows |
|---|---|---|---|
| Kulsum Begum | `0001000006` | `1990-05-23` | Land tax due → pay → signed QR receipt |
| Selina Akter (lives in Italy) | `0001000004` | `1985-02-14` | Consent by **authenticator app** (no Bangladeshi SIM needed); land lock; nominee |
| Rasel Hossain (heir) | `0001000013` | `1980-03-03` | Inherited share of plot 317 and the faraiz breakdown |
| Monir Hossain (lives in Saudi Arabia) | `0001000005` | `1979-09-09` | Land is **locked**: any sale in his name is blocked; consent by email |

You don't need to log in to search land, verify a deed or QR, read the notice board, use the heir calculator, read the access policy or view the ledger.

---

## The problem

Land disputes in Bangladesh usually start with:

1. **Fake sellers.** Someone sells land that isn't theirs, using a fake NID or impersonating an owner who lives abroad.
2. **The same land sold twice**, or mortgaged to two banks.
3. **Heirs cut out.** One heir sells the whole inherited plot.
4. **Paper deeds and receipts that can be forged.** A single changed number on paper is hard to catch.
5. **Old paper records.** CS, SA, RS and BS khatians sit on paper, often handwritten, and disagree with each other.
6. **Separate offices.** The Sub-Registry, AC Land, survey office, courts, DC office and banks keep separate records that do not talk to each other.
7. **Owners find out too late.** They usually learn about a fraudulent sale only after the deed is registered.

## What BhumiSutra does

### P3 (core): catch fraud and double-selling before money changes hands

The Sub-Registrar's **Safe registration** screen runs four steps:

| Step | What happens |
|---|---|
| **1. NID check** | Seller and buyer NIDs are checked against the identity register. An NID that does not exist, or that belongs to a deceased person, is stopped. |
| **2. Register check** | Every office's register is checked together: ownership by deeds, **double sale**, khas land, acquisition, court case, mortgage, khatian mismatch, unpaid **land development tax**, **heir shares** and **land lock**. Any failure blocks the sale and names the reason (for example, the earlier deed number). |
| **3. Owner consent** | The registered owner must approve through their chosen channel: SMS, email, an **authenticator app (TOTP, RFC 6238)** that works abroad without a Bangladeshi SIM or internet, or a **nominee** in Bangladesh. |
| **4. 72-hour public notice** | The pending sale appears on the public **notice board**. Heirs, neighbours or co-owners can file an objection. An officer reviews objections before the deed can be finalized. |

After registration:

- the deed goes on the ledger;
- the price is held in **escrow**;
- e-Mutation is filed automatically (P4).

When AC Land approves the mutation, the escrow is released to the seller. Every blocked attempt goes on the admin **fraud watchlist** and the owner's **My land** alerts.

### P6 (our innovation): ভূমিসূত্র সুরক্ষা (BhumiSutra Shield)

| Feature | What it does |
|---|---|
| **Land lock** | An owner can lock their land from **My land**. A locked plot cannot be sold or mortgaged until they unlock it with a code. The change is recorded as a `LAND_LOCK` ledger block. |
| **Multi-channel consent** | Each owner chooses SMS, email, authenticator app or nominee. Owners abroad scan an `otpauth://` QR with Google or Microsoft Authenticator. |
| **Heir protection (faraiz)** | Deaths and succession are recorded on the ledger. An heir can sell only up to their own share. The **heir calculator** follows Islamic inheritance rules: fixed shares, residue 2:1, awl, radd. |
| **72-hour notice + objections** | No silent sales. Anyone can see pending sales and object. |
| **Escrow** | The buyer's money waits until mutation is approved, so a fraudulent sale can be stopped before the seller is paid. |
| **Plot QR signboard** | A printable signboard for the land itself. Anyone standing on the plot scans it with a phone to see the owner, khatian and safety score, with any case, mortgage or khas status shown as a red warning. |

### P1, P2, P4, P5 (linked)

| User | Screen | What it does |
|---|---|---|
| Survey & Records officer | **Digitize old papers (P1)** | Bangla + English OCR runs **in the browser and offline**, with automatic image clean-up for faint or low-resolution scans. It fills the official khatian/deed fields with **per-field confidence**. It checks that shares add to 1.000 and that area totals match. It also **cross-checks a deed against the digitized khatian**. The record and the scan fingerprint go on the ledger. |
| Anyone | **Verify a deed (P2)** | Verify by deed number, **QR code** or digital deed file. Every deed and tax receipt QR carries an **ECDSA P-256 office signature**, so any phone can check it with no app and no copy of the database. A changed QR shows "fake". |
| Sub-Registrar / AC Land | **e-Mutation (P4)** | Registration files mutation automatically. Each application is linked to its deed and checked against the ledger before approval. |
| Anyone | **Land records and check (P5)** | Search district → upazila → mouza → dag or khatian. Shows the official khatian layout (CS / SA / RS / BS tabs), the **ownership flow**, a 0–100 safety score, the timeline, succession and linked registers. |
| AC Land | **Land development tax** | Holdings are exempt, paid or due. Unpaid tax blocks registration. The receipt has a signed QR. |
| Bank | **Mortgage check** | **Blocks double mortgages.** |
| DLRS | **Khatian matching** | Flags owner or area changes between surveys that have no recorded reason. |
| Admin | **Dashboard, watchlist, audit log, Tamper Lab** | Shows blocked fraud by type. In Tamper Lab, edit a stored block and watch the chain break. |

**Designed for everyone:**

- Opens in **Bangla**; English is one click away.
- Large task tiles and plain words for readers with little schooling.
- Text-size control (অ−/অ+).
- Works by keyboard, on phones, and in light or dark mode.

## NID and privacy

- Screens show only the last 4 digits of an NID (`•••••• 1234`). Officers who are allowed to see the full number click "Show", and that view is written to the audit log.
- The ledger never stores an NID. It stores a **salted SHA-256 hash**, so the chain can prove "same person" without exposing the number.
- In production, NID checks would use the Election Commission's NID verification service through an authorised partner API. A birth registration number could serve as an alternative for people without an NID.
- **Demo-only disclosure:** the office signing key is in `assets/js/security.js` so the prototype can sign QR codes in the browser. In production, the private key stays in a hardware security module (HSM) at the office and never reaches a browser. Only the public key ships to phones.

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
- **Ledger block types:** GENESIS, KHATIAN_BATCH_ANCHORED, DIGITIZED_RECORD, DEED_REGISTERED, MUTATION_APPROVED, MORTGAGE_CREATED/RELEASED, LD_TAX_PAID, SUCCESSION_RECORDED, NOTICE_PUBLISHED, ESCROW_HELD/RELEASED, LAND_LOCK.
- **Ownership by replay:** the ledger is replayed to work out who owns each plot by **deeds** and who owns it by **mutation record**. A mismatch means "registered but not mutated".
- **Double sale:** if a seller's remaining area is less than the area being sold and they sold this plot before, the sale is blocked and the earlier deed is named.
- **Signed QR codes:** deed certificates, tax receipts and plot signboards carry a QR with the record data plus an **ECDSA P-256 signature** by the office. The `#/scan` screen checks the signature with the office public key, so it works on any phone, even one that has never opened the app. Seed data uses fixed timestamps, so every device builds identical hashes.
- **One-time codes:** citizen login and owner consent use 6-digit codes. Authenticator codes follow RFC 6238 (HMAC-SHA1, 30 seconds) and are tested against the RFC's official test vectors.
- **Inheritance:** a `SUCCESSION_RECORDED` block moves a deceased owner's land to the heirs in their faraiz shares. Sales by an heir are capped at their share.
- **Data formats:** khatian records follow the official layout (areas in acres to 4 decimals, shares to 3 decimals). Deeds follow the sale-deed layout with a schedule (তফসিল). Real records can therefore be imported later without changing the data model.

### Files

```
index.html                    app shell
assets/css/fonts.css          local fonts (offline, OFL)
assets/css/style.css          design system: light/dark, responsive, print
assets/js/crypto.js           canonical JSON + SHA-256
assets/js/security.js         ECDSA office signatures, signed QR links, TOTP codes, NID masking and hashing
assets/js/data.js             FICTIONAL data: plots, khatians, people (fake NIDs), registers, tax holdings, succession
assets/js/ledger.js           hash-chained ledger, verify(), Tamper Lab, saved state
assets/js/auth.js             demo accounts, roles, access policy, audit log, session timeout
assets/js/engine.js           rules: ownership replay, sale/mortgage/mutation checks, heirs, lock, tax, faraiz, safety score
assets/js/ocr.js              Tesseract wrapper + parser into official khatian/deed fields + validation
assets/js/i18n*.js            every word in Bangla and English (i18n3 = login, consent, notice, escrow, heirs)
assets/js/ui.js               Bangla digits, ৳, dates, QR, toasts
assets/js/views.js            search, verify, certificate, registry, e-Mutation, bank, khatian matching, ledger
assets/js/views2.js           tax, receipts, digitization, records, dashboard + watchlist, audit, access policy
assets/js/views3.js           login (officer + citizen NID/OTP), safe registration, notice board, my land protection, heir calculator, signboard, QR scan
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

1. **Home:** the page opens in Bangla with large task tiles and a risk-coloured mouza map.
2. **Log in as Sub-Registrar → Safe registration.** Pick **"Fake NID"** (stopped at step 1), then **"Same land sold twice"** (blocked, with the earlier deed named), then **"Heir selling the whole plot"** and **"Locked land"**.
3. **Valid sale, start to finish:**
   1. Pick **"Valid sale (seller abroad)"**. The seller is Selina, who lives in Italy.
   2. She approves with the **authenticator code** shown on her simulated phone.
   3. The sale goes onto the **72-hour notice board**.
   4. File an objection, then dismiss it as the officer.
   5. Click **"Demo: skip the 72 hours and register"**. The deed is registered, the price is held in **escrow**, and mutation is filed.
4. **Verify on another phone:** open the deed and scan its QR with a real phone. It shows **"Genuine: the office signature is valid"**. Change one character in the link and it shows "fake".
5. **AC Land:** approve the mutation. The escrow is released.
6. **Citizen Selina:** check My land → protection settings → **lock** the land. Then check the plot signboard and the heir calculator (dag 317).
7. **Survey officer → Digitize:** run OCR on a sample khatian. The checks flag an area mismatch.
8. **Admin → Tamper Lab:** edit an old block. The chain breaks and the header turns red. Show the watchlist and audit log.

## Data used

Only **made-up data**:

- **Shaplapur mouza (JL 117):** 7 plots, each showing a different case: clean with a partial sale, double-sale attempt, khatian mismatch, court case + mortgage, khas land, acquisition notice, and registered but not mutated. Each plot has CS (1915), SA (1962), RS (1978) and BS (1998) khatians.
- **Kashful mouza (JL 118):** starts empty and fills from the sample scans: BS khatian 312, SA khatian 89 and deed 377/2021.
- **Other data:** 15 fictional people with made-up NIDs (`000…`), dates of birth, `010…` mobiles and `@example.com` emails. Some live abroad; one has died and has four heirs. Also two fictional banks, a court case, a khas entry, an acquisition notice and land tax holdings.

## AI tools used

- **Claude (Anthropic)**, used through the Claude app, helped design the architecture, write the code, Bangla/English text, sample-scan generator and documentation.
- Every AI-assisted commit says so in its message. The team reviewed and tested the code and can explain all of it (see `docs/CODE_GUIDE_BN.md`).

## Open-source credits

- [Tesseract.js](https://github.com/naptha/tesseract.js) and tesseract.js-core, Apache-2.0, with Tesseract `ben` and `eng` LSTM language data (Apache-2.0).
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase, MIT.
- Fonts under the SIL Open Font License: Hind Siliguri, Tiro Bangla, JetBrains Mono, and Noto Serif Bengali and Galada (used only for the sample scans).
- The browser's Web Crypto API for SHA-256, ECDSA P-256 and HMAC-SHA1 (TOTP).

## From prototype to nationwide system

| Prototype | Production plan |
|---|---|
| Ledger in one browser | Permissioned ledger with copies at Sub-Registry, AC Land, DLRS and DC offices; latest hash published daily |
| Fictional registers | Authorised APIs to existing e-Mutation, e-Porcha, land development tax, court and bank systems; nothing is replaced |
| Tesseract OCR | Same pipeline, plus a Bangla handwriting model trained on officer-corrected records; batch scanning at upazila record rooms |
| Demo logins and NID list | Government SSO for officers; EC NID verification API + OTP for citizens; role-based access as in `POLICY` |
| Demo signing key in browser | Office keys in an HSM under the national PKI (CCA); officer signatures on every block |
| Simulated SMS / email / escrow | Real SMS gateway and email; escrow through a scheduled bank or Bangladesh Bank channel |
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
