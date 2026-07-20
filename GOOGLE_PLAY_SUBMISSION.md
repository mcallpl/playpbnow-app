# PlayPBNow — Google Play Submission Playbook

_Written 2026-07-10, right after Apple App Store approval (v1.4.3). Android build made via EAS
(`eas build -p android --profile production`), signed with the EAS-managed upload key,
enrolled in Play App Signing automatically on first upload._

---

## Phase 0 — What is already done
- ✅ Production **.aab** built in EAS cloud (versionName 1.4.3, versionCode auto-managed by EAS)
- ✅ Android upload keystore generated & stored by EAS (never lose-able locally)
- ✅ Package name: `com.mcallpl.playpbnow`
- ✅ Target SDK 36 (exceeds Play's API-35 requirement)
- ✅ Privacy policy live: `https://playpbnow.com/privacy.html` · Terms: `https://playpbnow.com/terms.html`
- ✅ Permissions declared: fine + coarse location only
- ⚠️ RevenueCat **Android** key is a placeholder — subscriptions are disabled-but-graceful on
  Android until Phase 4 (paywall shows its error/retry state; app does NOT crash)

## Phase 1 — Create the app in Play Console (~10 min)
1. Go to **play.google.com/console** → **Create app**
2. App name: **PlayPBNow** · Default language: English (US)
3. App or game: **App** · Free or paid: **Free** (it has in-app subscriptions; "Free" is correct)
4. Accept the declarations → **Create app**

## Phase 2 — "Set up your app" checklist (Dashboard) (~45 min)
Play Console shows a task list. Answers for PlayPBNow:

| Task | Answer |
|---|---|
| Privacy policy | `https://playpbnow.com/privacy.html` |
| App access | "All functionality is available without special access" is **wrong** — login exists. Choose **All or some functionality is restricted** → add reviewer credentials (same test account given to Apple; see memory/app-store notes) |
| Ads | **No**, app contains no ads |
| Content rating | Fill IARC questionnaire → social/communication features YES (chat), location sharing YES (beacons), no violence/gambling → typically lands **Everyone / Teen** |
| Target audience | **18 and over** (simplest; avoids child-safety obligations). Do NOT tick under-13. |
| News app | No |
| COVID-19 tracing | No |
| Data safety | See table below — must match the iOS privacy answers |
| Government app | No |
| Financial features | **None of the above** (subscriptions via Play Billing don't count; Stripe SMS-credit purchases are web-only, outside the app) |
| Health apps | No |

### Data safety form (mirror of iOS disclosures)
Collected, not shared, encrypted in transit, deletable on request:
- **Location** → Approximate + Precise — app functionality (beacons/nearby courts)
- **Personal info** → Name, Email, Phone number — account management
- **Photos** → only if user shares match photos — app functionality
- **App activity / IDs** → User IDs — account management, RevenueCat subscription linkage

## Phase 3 — Store listing (~30 min)
- **Short description** (≤80 chars): e.g. `Pickleball beacons, live scoring, and match invites — play more pickleball.`
- **Full description** (≤4000 chars): reuse the App Store description
- **App icon**: 512×512 PNG (export from `assets/images/`)
- **Feature graphic**: **1024×500** — Play-specific, REQUIRED, does not exist yet → create one
- **Phone screenshots**: min 2, max 8. ⚠️ iPhone 6.7″ screenshots (1290×2796) exceed Play's 2:1
  aspect limit — retake on an Android emulator/device (e.g. Pixel: 1080×2400 works) or resize.

## Phase 4 — In-app subscriptions (Play Billing + RevenueCat) (~1 hr, AFTER first AAB upload)
Google will not let you create subscription products until an AAB with the BILLING permission
has been uploaded (the react-native-purchases library adds the permission automatically).
1. Upload the AAB to **Internal testing** first (Phase 5) — this unlocks **Monetize → Subscriptions**
2. Create subscriptions matching the iOS products (same entitlement design):
   - monthly Pro, annual Pro — same prices as iOS
3. In **RevenueCat dashboard**: add an **Android (Play Store) app** to the PlayPBNow project →
   copy the `goog_…` public key
4. Paste it into `utils/purchases.ts` → `REVENUECAT_ANDROID_KEY`
5. In Play Console → **Setup → API access**: create/link a Google Cloud **service account**,
   grant it "View financial data" + "Manage orders and subscriptions" → download JSON →
   upload to RevenueCat (Play credentials) — RevenueCat needs ~36 hrs to validate at worst
6. Map the Play products to the RevenueCat **`pro` entitlement** + offerings (monthly/annual)
7. **Rebuild** (`eas build -p android --profile production`) and upload the new AAB

## Phase 5 — Testing tracks & release
1. **Internal testing** (up to 100 testers, instant): Release → Internal testing → Create release →
   upload the `.aab` → add your email + Kim/CJ as testers → roll out. Install via opt-in link.
2. ⚠️ **If the Play account is a PERSONAL account created after Nov 13 2023**: Google requires
   **12 testers opted-in for 14 consecutive days of closed testing** before you may apply for
   production access. Organization accounts are exempt. Check: Play Console → account type.
3. **Production**: Release → Production → Create release → same AAB → roll out (staged 20% → 100%
   is prudent). First review typically takes **1–7 days**.

## Phase 6 — Post-approval
- Update the settings page version if app.json version changes (standing rule)
- Add the Play Store badge/link to `landing.html` alongside the App Store one
- For future releases: `eas build -p android --profile production` then
  `eas submit -p android` (needs `google-play-service-account.json` from Phase 4.5 —
  the same service account works; put the JSON at repo root, path already wired in `eas.json`)

## Quick reference
- Build logs/artifacts: https://expo.dev/accounts/mcallpl/projects/PlayPBNow/builds
- Download latest AAB: `npx eas-cli build:list -p android --limit 1` → artifact URL
- Play Console: https://play.google.com/console
- RevenueCat: https://app.revenuecat.com

---

## DATA SAFETY — exact answer key (2026-07-10)
_The form got into a confused "no data collection" state during unsupervised entry and was NOT saved wrong.
Complete it with these verified answers (mirror the iOS privacy labels; "Shared"=transfer to a third
party — sharing content with other **app users** is NOT "shared" in Google's sense, so all No)._

**Step 2 — Data collection & security**
- Collect/share required user data types? → **Yes**
- Account creation methods → **Username and password**
- Delete account URL → **https://playpbnow.com/delete-account.html** (LIVE, created this session)
- Provide account deletion? → **Yes**
- Delete some data w/o deleting account (optional) → **No**
- Independent security review badge → **No**

**Step 3 — Data types** (each: Collected=Yes, Shared=No, Processed ephemerally=No):
| Data type | Collected | Purpose | Required? |
|---|---|---|---|
| Location → Approximate location | Yes | App functionality | Optional (beacons) |
| Location → Precise location | Yes | App functionality | Optional (beacons) |
| Personal info → Name | Yes | App functionality, Account management | Required |
| Personal info → Email address | Yes | Account management | Required |
| Personal info → Phone number | Yes | Account management | Optional |
| Photos and videos → Photos | Yes | App functionality | Optional (match photos) |
| Device or other IDs → User IDs | Yes | App functionality, Account management | Required |

**Step 4 — Data usage & handling**
- Is all user data encrypted in transit? → **Yes** (HTTPS everywhere)
- Do you provide a way for users to request data deletion? → **Yes** (account deletion URL above)

**Step 5 — Preview** should then show the 7 rows above (NOT "No data collection declared"), then Save.

## QUICK DECLARATIONS still to do (single answer each)
- Government apps → **No** · Financial features → **None of the above** · Health → **No**
- App category → **Sports** · Contact email PSInfo@PeopleStar.com · website playpbnow.com

## STORE-LISTING ASSETS (this session)
- Feature graphic 1024×500 → `store-assets/feature-graphic-1024x500.png` (READY to upload)
- App icon 512×512 → `store-assets/app-icon-512.png`
- Copy (short + full description, category, tags) → `store-assets/store-listing-copy.md`
- Screenshots → STILL NEEDED from Chip (Android sizes; iPhone shots too tall for Play's 2:1)

---

# ⛔ REJECTION #1 — 2026-07-16 (and the fix, 2026-07-20)

The 2026-07-12 production submission was **REJECTED on Jul 16**. Discovered Jul 20 — the Console
notification sat unread for 4 days. **Google does not reliably email these; check Publishing overview.**

## What Google said
> **Play Console Requirements: Violation of Play Console Requirements**
> We could not review your app because of the following issue/s with the log-in credentials you provided:
> **Login credentials are incorrect.**

**Google never reviewed the app.** They could not get past the login screen. There was NO content, policy,
data-safety, billing, or store-listing objection.

## Root cause
The **Sign in details** declaration (App content → Sign in details, formerly "App access") held the bare
string **`mcallpl`** as the identifier — not an email, not a phone.

Confirmed three ways:
1. The Console field literally contained `mcallpl` (7/100 chars).
2. Google's evidence screenshot shows `mcallpl` typed into the app's "EMAIL OR PHONE" field, with the red
   error *"The email/phone or password you entered is incorrect. Please try again."*
3. `api/email_login.php` resolves the user via `WHERE email = ?` then `WHERE phone = ?` — **exact match
   only**. A bare username matches no row and can never authenticate.

The instructions field even said "email or phone both work" — but the value supplied was neither.
A Jul 10 data-entry slip, not an app defect.

## The fix (Jul 20)
| Field | Was | Now |
|---|---|---|
| Name | Admin Account | Reviewer Account |
| Identifier | `mcallpl` ❌ | `applereview@playpbnow.com` ✅ |
| Password | `Amazing123#` | `ReviewPBN2026!` |
| Instructions | "email or phone both work" | explicit: type the COMPLETE email including the domain |

## Reviewer-account rule (IMPORTANT)
A reviewer account must be **non-admin AND on an active premium subscription.**

`applereview@playpbnow.com` (users.id 69) — non-admin, `subscription_status=active`, `tier=premium`
through 2027-07-05, already passed Apple review, credential verified live against
`https://playpbnow.com/api/email_login.php`. Documented in `APP_STORE_SUBMISSION.md:44`.

Rejected as candidates:
- `mcallpl@gmail.com` (id 5) — `is_admin=1`, exposes the ADMIN tab to Google; also expired/free.
- `psinfo@peoplestar.com` (id 20, "App Review") — non-admin but **expired/free**, so every Pro-gated
  feature stays locked → invites a *second* rejection for "cannot access all functionality".

## Notes
- **No rebuild was needed.** All 11 changes stayed staged through the rejection — Production release
  5 (1.4.3) full rollout, 177 countries, store listing, content rating, data safety. No new AAB, no EAS build.
- **Do NOT appeal.** The issue page states that if you've corrected the credentials you don't need to contact
  policy support. An appeal carries a 5-8 day wait and only adds delay. There is no way to expedite a Play
  review — fix-and-resubmit is the fast path.
- The instructions textarea has a **500-character limit** (a 731-char draft turned red and blocked Save).
- **Verify the field's character counter before clicking Add/Save/Submit.** During this fix the password
  appeared unchanged (11/100 = the old `Amazing123#`; the new one is 14/100) because it had been typed into
  a different browser window. Submitting unverified costs a full review cycle.

## Status
**Resubmitted 2026-07-20** — "11 changes sent for review"; Publishing overview shows **Changes in review**.
Managed publishing is OFF, so it auto-goes-live on approval. Expect 1-7 days.
