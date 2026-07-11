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
