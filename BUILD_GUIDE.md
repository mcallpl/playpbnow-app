# PlayPBNow iOS Build Guide

## Quick Start: Build & Submit to TestFlight

### Prerequisites
- ✅ Xcode installed (for iOS development)
- ✅ EAS CLI installed (`npm install -g eas-cli`)
- ✅ Apple Developer Account with team membership
- ✅ App Store Connect access

### Step 1: Authenticate with EAS

```bash
npx eas login
# Enter Apple ID: mcallpl@mac.com
# Enter password: (use app-specific password or normal password)
```

**Verify authentication:**
```bash
npx eas whoami
# Should output: mcallpl
```

---

## Step 2: Build for TestFlight

### Option A: Automatic Build & Submit (Recommended)
```bash
cd /Users/chipmcallister/Projects/PlayPBNow
npx eas build --platform ios --profile production --auto-submit
```

This command will:
1. Create iOS build (10-15 minutes)
2. Automatically submit to App Store Connect
3. Add to TestFlight internal testing group
4. Show build URL in console

**Expected output:**
```
✓ Resolved "production" environment
✓ Using remote iOS credentials (Expo server)
✓ Build created successfully
✓ Build ID: 12345abcde
✓ Submitted to App Store Connect
✓ TestFlight URL: https://testflight.apple.com/...
```

### Option B: Build Only (Manual TestFlight Upload)
```bash
cd /Users/chipmcallister/Projects/PlayPBNow
npx eas build --platform ios --profile production --wait
```

Then manually upload in App Store Connect:
1. Go to https://appstoreconnect.apple.com/
2. Select PlayPBNow app (ID: 6758897943)
3. Go to TestFlight section
4. Upload the build
5. Add build to test group

---

## Step 3: Verify Build in App Store Connect

1. **Visit App Store Connect:**
   - https://appstoreconnect.apple.com/apps/6758897943/testflight/ios

2. **Check Build Status:**
   - New build should appear within 5-30 minutes
   - Status will show: "Processing" → "Ready to Test"

3. **Create Internal Test Group:**
   - If not already created, add internal test group
   - Add Apple IDs to test (e.g., mcallpl@gmail.com)
   - Mark build as "Ready for Testing"

4. **Add to Existing Group:**
   ```
   Select build → Add to test group → Internal Testing
   ```

---

## Step 4: Install on iOS Simulator

### Using Xcode (Easiest)
```bash
cd /Users/chipmcallister/Projects/PlayPBNow
npx expo run:ios
# This starts Xcode and builds to simulator
```

### Using EAS Build for Simulator
```bash
npx eas build --platform ios --profile preview --wait
# Download the build file and open in Xcode
```

---

## Step 5: Install on Physical Device via TestFlight

1. **On iOS Device:**
   - Open TestFlight app (or App Store app)
   - Tap "Apps" tab
   - Look for "PlayPBNow"
   - Tap "Install" button

2. **Wait for Installation:**
   - Status: "Installing..." (2-5 minutes)
   - Status: "Installed" when complete

3. **Launch App:**
   - Tap "Open" button in TestFlight
   - Login with test credentials

---

## Build Configuration Reference

### Current Configuration (eas.json)
```json
{
  "build": {
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "mcallpl@mac.com",
        "ascAppId": "6758897943",
        "appleTeamId": "WSR4HM3CH7"
      }
    }
  }
}
```

### Build Profiles Available
- **production** - Full release build with auto-submit to TestFlight
- **preview** - Preview build for simulator testing (internal distribution)
- **development** - Development build with Expo Go support

---

## Troubleshooting

### Issue: "Input is required, but stdin is not readable"
**Cause:** Running in non-interactive environment  
**Solution:** 
```bash
# Either run locally with interactive terminal
# Or use environment variable for headless build
EXPO_APPLE_ID=mcallpl@mac.com EXPO_APPLE_PASSWORD=<app-password> npx eas build --platform ios --profile production
```

### Issue: "No Apple account credentials found"
**Solution:**
```bash
npx eas credentials:configure-build --platform ios
# Follow prompts to re-authenticate
```

### Issue: "Build failed - certificate expired"
**Solution:**
```bash
npx eas credentials:configure-build --platform ios --clear
# Reconfigure credentials
npx eas build --platform ios --profile production
```

### Issue: "App Store Connect credentials invalid"
**Solution:**
1. Go to App Store Connect
2. Generate new app-specific password
3. Update credentials:
```bash
npx eas credentials --platform ios
# Select configure existing app
# Update Apple ID credentials
```

---

## Build Status & Monitoring

### Check Build Status
```bash
npx eas build:list --platform ios --limit 5
# Shows recent builds with status
```

### View Build Logs
```bash
# If build is still in progress
npx eas build:view <BUILD_ID>

# Get log URL
npx eas build:view <BUILD_ID> --json
```

### Monitor EAS Dashboard
- https://expo.dev/accounts/mcallpl/projects/PlayPBNow/builds

---

## Post-Build Testing Checklist

### Immediate After Build
- [ ] Build appears in EAS dashboard
- [ ] Build status: "FINISHED"
- [ ] Build ID recorded for reference
- [ ] Download URL available (if needed)

### After TestFlight Upload
- [ ] Build appears in App Store Connect
- [ ] Status changes to "Ready to Test"
- [ ] Internal test group shows build
- [ ] Test users received invitation (if first time)

### After Installing on Device
- [ ] App icon appears on home screen
- [ ] App launches without crashing
- [ ] Can login with test account
- [ ] Can create and score a match
- [ ] Can view leaderboard
- [ ] Can create and send invite SMS

---

## Build Versioning

### How It Works
- **Version (app.json):** `1.4.3` - Human-readable version
- **Build Number (auto-incremented):** `53 → 54 → 55...`
- **Each build must have unique build number**

### Update Version for Release
```bash
# Edit app.json
# Change "version": "1.4.3" to "1.4.4"

# Then build
npx eas build --platform ios --profile production --auto-submit
```

---

## Build Time Expectations

| Stage | Time |
|-------|------|
| Authentication & Setup | 1 minute |
| Build Machine Allocation | 2-3 minutes |
| Build Compilation | 5-10 minutes |
| Build Upload | 2-3 minutes |
| **Total Build Time** | **10-15 minutes** |
| App Store Processing | 5-30 minutes |
| **Total to Ready** | **15-45 minutes** |

---

## Environment Variables (If Needed)

Set for headless/CI builds:
```bash
export EXPO_APPLE_ID=mcallpl@mac.com
export EXPO_APPLE_PASSWORD=<app-specific-password>
export EAS_BUILD_PROFILE=production
export EAS_AUTO_SUBMIT=true
```

Then run:
```bash
npx eas build --platform ios
```

---

## Useful Commands Reference

```bash
# Show available profiles
npx eas build:configure

# List all builds
npx eas build:list --platform ios

# Show specific build
npx eas build:view <BUILD_ID>

# Check current credentials
npx eas credentials --platform ios

# Reconfigure credentials
npx eas credentials:configure-build --platform ios

# Delete stored credentials
npx eas credentials --platform ios --clear

# Test build locally (simulator)
npx expo run:ios

# Generate native project (if needed)
npx expo prebuild --clean

# Check for issues
npx eas doctor
```

---

## Security Notes

### App-Specific Password
- Do NOT commit real passwords
- Use app-specific password (not iCloud password)
- Generate at https://appleid.apple.com/account/manage
- Store in environment variables or secure vault

### Team ID & Credentials
- Team ID: `WSR4HM3CH7` (stored in eas.json)
- Apple ID: `mcallpl@mac.com` (stored in eas.json)
- Credentials stored securely by EAS on first login

---

## Final Submission Steps

After successful TestFlight testing:

1. **Update Version (if needed):**
   - Edit `app.json` version field
   - Increment build number or let EAS auto-increment

2. **Create Release Build:**
   ```bash
   npx eas build --platform ios --profile production --auto-submit
   ```

3. **Complete App Store Submission:**
   - Go to App Store Connect
   - Select build from TestFlight
   - Move to "Ready for Submission"
   - Add release notes
   - Submit for review

4. **Monitor Review Status:**
   - Check App Store Connect daily
   - Status: "In Review" (1-3 days)
   - Status: "Ready for Sale" when approved

---

## Related Documentation

- **iOS Test Report:** `/iOS_TEST_REPORT.md`
- **Submission Checklist:** `/SUBMISSION_CHECKLIST.md`
- **EAS Documentation:** https://docs.expo.dev/eas/
- **App Store Connect:** https://appstoreconnect.apple.com/

---

**Build Guide Created:** 2026-06-21  
**Status:** Ready for production build  
**Next Step:** Run `npx eas build --platform ios --profile production --auto-submit`

