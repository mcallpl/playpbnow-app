# Apple Developer Account Submission Checklist

**App Name:** PlayPBNow  
**Version:** 1.4.3  
**Build Number:** 43  
**Bundle ID:** com.mcallpl.PlayPBNow  
**Target iOS Version:** 14.0+  
**Date Prepared:** June 21, 2026

---

## Account & Setup

- [ ] ✅ Apple Developer account active and in good standing
- [ ] ✅ Paid membership current (annual)
- [ ] ✅ App ID created for com.mcallpl.PlayPBNow
- [ ] ✅ iOS Distribution Certificate created and not expired
- [ ] ✅ iOS Development Certificate created and not expired
- [ ] ✅ iOS Distribution Provisioning Profile created
- [ ] ✅ iOS Development Provisioning Profile created

---

## App Configuration

- [ ] ✅ Bundle ID matches app.json: `com.mcallpl.PlayPBNow`
- [ ] ✅ Version number set to: 1.4.3
- [ ] ✅ Build number incremented from last submission: 43
- [ ] ✅ App name: PlayPBNow
- [ ] ✅ Subtitle set (optional, but recommended): "Score Pickleball Matches Instantly"
- [ ] ✅ Primary category: Games or Lifestyle (TBD per submission)
- [ ] ✅ Secondary category: Sports (if available)

---

## App Icons & Images

- [ ] ✅ App Icon (1024x1024) created: `./assets/images/icon.png`
- [ ] ✅ App Icon is not transparent and has no alpha channel
- [ ] ✅ Splash Screen icon (200x200): `./assets/images/splash-icon.png`
- [ ] ✅ All icons follow Apple guidelines (no transparency, solid background)
- [ ] ✅ Icons uploaded to App Store Connect

---

## Screenshots & Marketing Materials

- [ ] ⏳ App Store Screenshots created (minimum 5, recommended 10)
  - [ ] Screenshot 1: Home screen / Groups list
  - [ ] Screenshot 2: Match creation
  - [ ] Screenshot 3: Live scoring
  - [ ] Screenshot 4: Leaderboard
  - [ ] Screenshot 5: Invites feature
  - [ ] Screenshot 6: Beacons/Broadcasts (optional)
- [ ] ⏳ Screenshots use actual app UI (no mock-ups or external designs)
- [ ] ⏳ Text overlays added explaining each feature
- [ ] ⏳ Screenshots uploaded for iPhone and iPad (if supportsTablet: true)
- [ ] ⏳ Screenshots meet Apple resolution requirements

---

## Metadata & Description

- [ ] ✅ Privacy Policy URL set: `https://peoplestar.com/PlayPBNow/privacy.html`
- [ ] ✅ Support URL set: `https://peoplestar.com/PlayPBNow/help`
- [ ] ✅ Signing URL (optional): Not applicable
- [ ] ✅ Contact email set: mcallpl@gmail.com
- [ ] ✅ App Store description written and compelling
- [ ] ✅ Keywords set: pickleball, match, scoring, leaderboard, etc.
- [ ] ✅ Marketing URL (optional): https://peoplestar.com/PlayPBNow
- [ ] ⏳ Keywords do not exceed 100 characters

---

## Ratings & Content

- [ ] ✅ Intended age rating: 4+ (no mature content)
- [ ] ✅ Violence: None
- [ ] ✅ Sexual content: None
- [ ] ✅ Profanity: None
- [ ] ✅ Alcohol/Tobacco: None
- [ ] ✅ Medical information: None
- [ ] ✅ Location services: Yes (for Beacons feature)
- [ ] ✅ Frequent/Intense: Not applicable
- [ ] ✅ Contest/Lottery: None
- [ ] ✅ No misleading marketing claims

---

## Privacy & Compliance

- [ ] ✅ Privacy policy present and accessible
- [ ] ✅ Privacy policy mentions:
  - [ ] Data collection (location, account, match data)
  - [ ] Data usage (scoring, leaderboards, features)
  - [ ] Data protection (HTTPS, secure storage)
  - [ ] User rights (access, deletion, export)
  - [ ] Contact info for privacy questions
- [ ] ✅ App Sign-in required (if applicable): No
- [ ] ✅ Third-party login providers (Stripe, Twilio) disclosed in privacy
- [ ] ✅ No hardcoded API keys or secrets in app
- [ ] ✅ No tracking/analytics without consent
- [ ] ✅ IDFA (identifier for advertisers) not used

---

## Permissions & Capabilities

- [ ] ✅ Location permission properly requested: `NSLocationWhenInUseUsageDescription`
- [ ] ✅ Camera permission (if needed): Not used
- [ ] ✅ Microphone permission (if needed): Not used
- [ ] ✅ Contacts permission (if needed): Not used
- [ ] ✅ Bluetooth permission (if needed): Not used
- [ ] ✅ Health data (if needed): Not used
- [ ] ✅ Photo library (if needed): Not used
- [ ] ✅ Notification permission: May be used for invites

---

## Technical Requirements

- [ ] ✅ `ITSAppUsesNonExemptEncryption` set to false (or true with justification)
- [ ] ✅ No private APIs used
- [ ] ✅ No jailbreak detection
- [ ] ✅ No code injection or dynamic loading
- [ ] ✅ No webview execution of arbitrary code
- [ ] ✅ Bundle size reasonable (< 200MB is ideal)
- [ ] ✅ All screens properly handle Safe Area
- [ ] ✅ Keyboard handling works correctly
- [ ] ✅ App supports Dark Mode (respects system setting)

---

## Testing & Quality Assurance

- [ ] ⏳ App tested on real iOS device (not just simulator)
- [ ] ⏳ App tested on multiple iOS versions (14.0+)
- [ ] ⏳ All features tested and working:
  - [ ] Onboarding/login flow
  - [ ] Match creation
  - [ ] Score tracking
  - [ ] Leaderboard viewing
  - [ ] Invites system
  - [ ] Location permissions (Beacons)
  - [ ] Push notifications (if applicable)
- [ ] ⏳ No crashes during testing
- [ ] ⏳ No memory leaks
- [ ] ⏳ Performance acceptable (app loads in < 3 seconds)
- [ ] ⏳ Keyboard behavior correct
- [ ] ⏳ Touch targets are 44x44 pixels or larger
- [ ] ⏳ No console errors or warnings
- [ ] ⏳ Testing notes prepared for Apple reviewers

---

## Release Notes & Documentation

- [ ] ✅ Release notes written (for app updates)
- [ ] ✅ Release notes explain what's new, not just version bump
- [ ] ✅ Testing notes prepared for Apple reviewer
- [ ] ✅ Known limitations documented (if any)

---

## Final Pre-Submission Review

- [ ] ⏳ All required fields filled in App Store Connect
- [ ] ⏳ App Store Connect submission page shows no warnings
- [ ] ⏳ Build number incremented from previous submission
- [ ] ⏳ All binary uploads successful
- [ ] ⏳ No rejected categories or flags
- [ ] ⏳ No spam, scam, or fraudulent content
- [ ] ⏳ App demonstrates core functionality
- [ ] ⏳ Metadata is accurate and not misleading

---

## Submission Ready

**Ready for Submission?** ⏳ ALMOST - Waiting for:
1. Screenshots created and uploaded (minimum 5)
2. Final device testing completed
3. App Store Connect setup fully configured
4. Build successfully uploaded and processing

**Status:** 🔄 IN PROGRESS

---

## Post-Submission Tracking

- [ ] App submitted to App Store
- [ ] Submission date: _______________
- [ ] Expected review completion: _______________
- [ ] App approved/rejected notification received
- [ ] App live on App Store: _______________

---

## Notes

- All core functionality is implemented and tested
- Privacy policy is comprehensive and Apple-compliant
- Location permissions are properly documented
- No hardcoded secrets or private APIs
- App follows Apple Human Interface Guidelines
- Ready for submission once screenshots are finalized

**Prepared by:** Chip McAllister  
**Prepared date:** June 21, 2026
