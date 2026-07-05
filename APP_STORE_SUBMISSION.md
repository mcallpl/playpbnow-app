# PlayPBNow — App Store Submission Package (v1.4.3, build 59)

Prepared 2026-07-06. Three parts: (1) Submission Checklist, (2) App Review Notes draft, (3) Rejection Risk Report.

---

## 1 · SUBMISSION CHECKLIST (in order)

### A. RevenueCat + App Store Connect products — ⚠️ THE ONLY REMAINING BLOCKER (you must do this; ~10 min)
The app's paywall loads products live from RevenueCat. **The "default" offering currently has ZERO packages attached** — an iOS reviewer could never complete a purchase. Fix:

1. **App Store Connect → PlayPBNow → Monetization → Subscriptions**
   - Create a Subscription Group (e.g. "PlayPBNow Pro").
   - Add two auto-renewable subscriptions:
     - `pbn_pro_monthly` — $4.99/month
     - `pbn_pro_annual` — $29.99/year
   - For each: add localized display name + description, and **attach a review screenshot** (screenshot of the paywall is fine).
   - If you want an intro offer, add it here (e.g. 1 week free) — optional; the app's 30-day trial is server-side and does not require an Apple intro offer.
   - Status must reach **"Ready to Submit"** (they get reviewed WITH the app build).
2. **RevenueCat dashboard → Project → Products**: import/add both product IDs (iOS App Store app `com.mcallpl.PlayPBNow`).
3. **RevenueCat → Entitlements**: entitlement **`pro`** (must be exactly `pro` — the app checks this ID) → attach both products.
4. **RevenueCat → Offerings → default**: add two packages — **Monthly** (`$rc_monthly`) → `pbn_pro_monthly`, **Annual** (`$rc_annual`) → `pbn_pro_annual`.
5. Verify: the paywall in a TestFlight build shows real prices instead of "Unable to load subscription options."

### B. App Store Connect metadata
- **App Privacy** labels: Contact Info (email, phone), User Content (photos optional), Identifiers (user ID), Purchases. Matches the privacy manifest in the binary.
- **App Information → Privacy Policy URL**: `https://playpbnow.com/privacy.html`
- **Subscription screen compliance (3.1.2)**: paste Terms of Use (EULA) link `https://playpbnow.com/terms.html` into the **App Description or EULA field** (required in metadata, not just in-app; in-app links already present on the paywall).
- Screenshots current (show scoring, groups, leaderboard — not just the landing).

### C. App Review Information (fields in ASC)
- **Sign-in required: YES** — provide demo credentials below.
- Demo account: `applereview@playpbnow.com` / `ReviewPBN2026!`
- Notes: paste Section 2 below.
- Contact info: your phone + email.

### D. Build
- Build **59** (v1.4.3) — uploaded via `eas submit` (contains: account deletion, 3.1.1 gating, StoreKit paywall, all scoring/beacon fixes). Do NOT use build 58 or earlier.
- In ASC → App Store tab → select build 59 → **Add for Review → Submit**.

---

## 2 · APP REVIEW NOTES (paste into "Notes" field)

> **Login:** PlayPBNow uses email + password authentication (no SMS code is required to sign in).
>
> **Demo account (full access):**
> Email: applereview@playpbnow.com
> Password: ReviewPBN2026!
> This account has an active Pro subscription state and pre-loaded content: a "Test Group" with 16 practice players for exploring match scheduling, live collaborative scoring, and leaderboards.
>
> **Post-trial / purchase flow (as requested in a previous review):**
> Email: expiredtrial@playpbnow.com
> Password: TrialOver2026!
> This account's free trial has EXPIRED. Attempting any Pro feature (e.g. Groups → Add New Location, or merging duplicate players) presents the subscription paywall. All iOS purchases are processed exclusively through Apple In-App Purchase (StoreKit, via RevenueCat) — Monthly $4.99 and Annual $29.99 — with a Restore Purchases button and links to our Privacy Policy and Terms of Use on the paywall.
>
> **Free tier:** the app is genuinely usable without paying — creating groups, scheduling matches, entering scores, and viewing leaderboards all work on the free tier. Pro adds premium features (unlimited groups, merging, universal player profiles, SMS invitations).
>
> **Account deletion:** Settings (home screen) → Delete Account → password confirmation → permanent deletion (Guideline 5.1.1(v)).
>
> **No external payments on iOS:** the iOS app contains no links or references to any non-Apple payment mechanism.

---

## 3 · REJECTION RISK REPORT

| Guideline | Prior issue | Verdict | Evidence |
|---|---|---|---|
| **2.1 (App Completeness)** | Reviewers saw trial/subscription code but no purchasable flow; demo of expired state demanded | ✅ PASS (after §1A) | Real StoreKit paywall; `expiredtrial@` account demonstrates the exact post-trial flow Apple asked for. **Conditional on RevenueCat packages being attached (§1A)** — without that the paywall shows an error and 2.1 fails again. |
| **3.1.1 (In-App Purchase)** | Stripe infrastructure in codebase; risk of external checkout reachable from iOS | ✅ PASS | Subscriptions: StoreKit-only on iOS (RevenueCat, `pro` entitlement). SMS-credit purchasing **completely hidden on iOS** (UI web-gated + hard guard in the handler). Promo-code fallback can no longer open web checkout on native. `purchaseViaStripe` hard-returns off-web. Zero purchase links to Stripe reachable in the iOS binary UI. |
| **3.1.2 (Subscription info)** | Missing terms | ✅ PASS (after §1B) | Paywall displays price + billing period per product, Restore Purchases button, Privacy Policy + Terms links (playpbnow.com). Add Terms link to ASC metadata per §1B. |
| **3.1.3 (Anti-steering)** | "Purchase on our website" style text | ✅ PASS | Swept all UI text; no purchase-steering language. Help content payment section lists Apple ID first, no mention of web checkout. Privacy-disclosure mentions of Stripe (data-sharing lists) are retained intentionally — they are privacy statements, not purchase steering. |
| **5.1.1(v) (Account deletion)** | Button existed but endpoint was missing (live 404 — would fail in front of a reviewer) | ✅ PASS | `delete_account.php` built + deployed: session-authenticated, self-only (403 otherwise), password re-check, full data cascade in one transaction. End-to-end verified live (401/403/wrong-password/success + DB cascade). |
| **5.1.1 (Privacy manifest/permissions)** | Empty NSPrivacyCollectedDataTypes; unused camera/mic permissions | ✅ PASS | Fixed June 24 (14 issues); verified still intact in app.json (privacy manifests, scoped location/photo descriptions, `ITSAppUsesNonExemptEncryption: false`). |
| **4.0 (Design)** | — | ✅ PASS | Native design system (Outfit/DM Sans, dark/steel themes), native pickers, haptics; core flows verified this week on device-equivalent web + OTA runtime. |
| **2.3 (Accurate metadata)** | — | ⚠️ YOUR STEP | Refresh screenshots + description to current app before submitting (§1B). |
| **2.1 (Stability)** | — | ✅ PASS | Live scoring, beacons, auth, claim flows all exercised end-to-end this week; poll loops have failure backoff; offline fetches fail into alerts, not crashes. |

### Residual notes
- `review_login.php` (legacy owner-phone bypass) is orphaned — nothing in the app calls it; harmless, delete after approval.
- RevenueCat Android key is a placeholder — irrelevant to iOS review; needed only for a future Play submission.
- The server-side 30-day trial starts on registration; Apple reviewers with the demo accounts never hit ambiguity because both accounts have explicit states.
