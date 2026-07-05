# CLAUDE CODE PROMPT — PlayPBNow iOS: Feature Parity, StoreKit Payments & App Store Approval

Copy everything below this line into Claude Code:

---

## ROLE

You are the lead engineering team of a top-tier IT consulting firm engaged by Chipleball to take the PlayPBNow iOS app (React Native, PHP backend) from its current state to a flawless, App Store–approved release. This app has been rejected by Apple five times. Your engagement has one success metric: **approval on the next submission.** Work methodically, verify everything, and never assume — audit.

## CONTEXT

- **Web app** = source of truth. The PlayPBNow web app is finished and approved by the client. The iOS app must replicate every feature of the web app with full functional parity.
- **Stack:** React Native (iOS), PHP backend, MySQL, GitHub, GoDaddy hosting.
- **Login:** phone number + SMS verification code (no username/password).
- **Rejection history:** Apple rejected under Guideline 2.1 — reviewers believed the app had a subscription/free trial and demanded to see the post-trial purchase flow and an expired-trial demo account. Previous submissions attempted to present the app as fully free while payment infrastructure (subscription tables, feature_access logic, payment code) existed in the codebase. That approach failed repeatedly. **This submission will be fully transparent: a real, working subscription implemented correctly through Apple's system.**
- **CRITICAL PAYMENT RULE:** All digital purchases on iOS MUST use Apple's In-App Purchase via **StoreKit 2**. Do NOT use Stripe, Apple Pay, PayPal, web checkout links, or any external payment mechanism for digital features — any of these is an automatic rejection under Guideline 3.1.1. Stripe may remain in the web app only; it must not be reachable, linked, or referenced anywhere in the iOS binary or UI.

## PHASE 1 — FULL AUDIT (do this before writing any code)

1. Inventory every feature, screen, and workflow in the web app codebase. Produce a **Feature Parity Matrix**: web feature → iOS status (present / partial / missing / broken).
2. Search the entire iOS codebase and bundle for every occurrence of: `stripe`, `paypal`, `checkout`, `payment`, `subscription`, `trial`, `premium`, `upgrade`, `pro`, `feature_access`, `StoreKit`, `purchase`. Document each hit and classify it: keep (StoreKit-related), rewrite, or remove.
3. Audit the backend endpoints the iOS app calls. Flag any endpoint that references Stripe or external payment flows when called from iOS.
4. Audit Xcode project settings: entitlements, capabilities, Info.plist, provisioning profile. Confirm In-App Purchase capability is enabled and nothing unexpected (e.g., Apple Pay entitlement) is present.
5. Report findings to me before proceeding to Phase 2. Do not skip this report.

## PHASE 2 — FEATURE PARITY

Bring the iOS app to 100% parity with the web app:

- Collaborative real-time match scoring (this is the core value — it must be pixel-solid and functionally identical to web, including session management and multi-player sync).
- Player management, groups, and invitations.
- Match statistics, leaderboards, badges, and rankings. **Verify leaderboard math against the backend directly** — this codebase previously had a PHP reference bug (missing `unset()` after `foreach` by-reference loops) that corrupted stats. Confirm no equivalent data-accuracy bugs exist in the iOS data layer, and validate JOIN-driven queries return no duplicates.
- The modern glass-card UI with Dark and Steel themes, Outfit/DM Sans typography — match the web app's current design language.
- Authentication flow with robust re-check logic. Explicitly test for and eliminate navigation loops after login/logout/session expiry.
- Offline/poor-connection handling: the app must fail gracefully, never crash or hang on lost connectivity (reviewers test this).

Preserve all existing working functionality. Never delete or regress a working feature while implementing parity.

## PHASE 3 — PAYMENTS DONE RIGHT (StoreKit 2)

1. Implement subscriptions using **StoreKit 2** (via a maintained React Native library such as `react-native-iap`, or a native module if needed).
2. Products must map to the subscription tiers I will configure in App Store Connect (ask me for the exact product IDs, pricing, and trial terms before hardcoding anything).
3. Required elements — Apple checks all of these:
   - Purchase flow that works end-to-end in the sandbox environment.
   - A **"Restore Purchases"** button (mandatory).
   - Clearly displayed price, billing period, and trial terms **before** purchase.
   - Links to Privacy Policy and Terms of Use (EULA) on the subscription screen AND in the App Store metadata (Guideline 3.1.2 requirement).
   - Server-side receipt/transaction validation against the PHP backend so `feature_access` is driven by verified Apple transactions, not client-side flags.
   - Correct handling of: expired subscription, cancelled subscription, billing retry, and re-subscribe. The "what happens when the trial expires" flow must be obvious and demonstrable — this is exactly what Apple asked about in the last rejection.
4. Free tier must remain genuinely usable so the app has value without paying (Apple dislikes empty shells behind paywalls).

## PHASE 4 — APP REVIEW READINESS

1. **Reviewer demo account:** implement a designated test phone number with a hardcoded verification bypass code (e.g., 999999) that works ONLY for that number, so Apple reviewers can always log in without SMS. Additionally create a sandbox account in an expired-trial state so reviewers can see the post-trial purchase flow — this was explicitly requested by Apple.
2. **Account deletion:** Apple Guideline 5.1.1(v) requires that any app supporting account creation must offer in-app account deletion. Verify this exists in the iOS app; if not, build it.
3. **Privacy:** confirm the app's data collection matches the App Privacy "nutrition label" declarations; flag any mismatch for me to fix in App Store Connect.
4. **Metadata hygiene:** scan app screens for any text/links directing users to the website for payment or signup ("purchase on our website," etc.) — remove all of it.
5. Produce three deliverables for me:
   - **Submission Checklist** — every App Store Connect step in order (IAP product setup, App Review Information fields, demo credentials, review notes).
   - **App Review Notes draft** — the exact text to paste for the reviewer, explaining the login flow, the demo bypass code, the subscription model, and where to find the purchase flow.
   - **Rejection Risk Report** — every guideline we previously tripped (2.1, 3.1.1, 3.1.2) plus common ones (4.0 design, 5.1.1 privacy/account deletion, 2.3 accurate metadata), with a pass/fail verdict and evidence for each.

## PHASE 5 — QA GATE

Before declaring done:
- Full regression pass on collaborative scoring with two simultaneous sessions.
- StoreKit sandbox test: purchase, restore, cancel, expire, re-subscribe.
- Login/logout/session-expiry cycle x5 with no navigation loops.
- Airplane-mode test on every major screen — no crashes, clear error states.
- Fresh install test on a clean simulator + physical device profile.
- Zero console errors, zero unhandled promise rejections in critical paths.

## WORKING RULES

- Work phase by phase. Stop and report at the end of each phase; wait for my go-ahead before the next.
- If you find something ambiguous (product IDs, pricing, tier features), ASK — do not invent.
- Never remove working functionality without telling me first.
- Commit in small, described increments to GitHub.

Begin with Phase 1. Report the Feature Parity Matrix and the payment-reference audit before touching anything else.
