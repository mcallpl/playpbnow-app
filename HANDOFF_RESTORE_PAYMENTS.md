# HANDOFF: Restore Payment/Subscription System

## Why It Was Removed
Apple will reject apps that reference payments, subscriptions, trials, or "upgrade to Pro" without a working In-App Purchase (IAP) integration. All subscription UI was stripped for the initial free App Store launch. **This must be restored once IAP is implemented.**

## What Was Removed

### 3 Files Deleted (restore from git history)
These files were NOT deleted from the repo — they were stripped of their usage. The files themselves still exist in git history before this commit. To restore, `git checkout <commit-before-strip> -- <filepath>`.

1. **`context/SubscriptionContext.tsx`** — Core subscription state management
   - Provides `useSubscription()` hook to the entire app
   - Fetches subscription data from `check_subscription.php` backend endpoint
   - Caches subscription state in AsyncStorage (key: `subscription_data`)
   - Refreshes when app comes to foreground (AppState listener)
   - Manages paywall modal visibility
   - Defines feature gates:
     - `canGenerateCleanReports`: free=false, pro=true (watermark removal)
     - `canEditMatches`: free=false, pro=true
     - `canDeleteMatches`: free=false, pro=true
     - `maxGroups`: free=2, pro=unlimited
     - `maxCollabSessions`: free=1, pro=unlimited
     - `maxPlayersPerGroup`: free/pro=100
   - Tiers: `'free' | 'pro' | 'trial'`
   - Key exports: `useSubscription`, `SubscriptionProvider`, `SubscriptionFeatures`, `SubscriptionData`

2. **`components/TrialBanner.tsx`** — Trial period awareness banner
   - Shows on Groups screen above the group list
   - Green banner during active trial: "Pro Trial — X days remaining"
   - Orange banner when urgent (<=3 days): "Trial ending in X days!"
   - Red banner after expiry: "Your trial has ended"
   - Dismissible (X button), "Learn More" opens paywall
   - Uses `useSubscription()` for `isTrial`, `trialDaysRemaining`, `showPaywall`

3. **`components/PaywallModal.tsx`** — Pro benefits showcase modal
   - Full-screen modal with PlayPBNow logo + "PRO" badge
   - Lists 5 benefits with green checkmarks:
     - Clean HD Match Reports (no watermark)
     - Unlimited Collab Sessions
     - Unlimited Groups
     - Match History & Stats
     - Priority Support
   - During trial: "You're enjoying a free N-day Pro trial!"
   - When free/expired: "Pro subscriptions coming soon!"
   - "Got It" dismiss button
   - Uses `useSubscription()` for `paywallVisible`, `hidePaywall`, `isTrial`, `trialDaysRemaining`

### Changes Made to Existing Files

#### `app/_layout.tsx`
**Removed:**
- `import { SubscriptionProvider } from '../context/SubscriptionContext';`
- `import { PaywallModal } from '../components/PaywallModal';`
- `<SubscriptionProvider>` wrapper around `<Stack>`
- `<PaywallModal />` component after `</Stack>`

**To restore:** Wrap the `<Stack>` navigation inside `<SubscriptionProvider>` and add `<PaywallModal />` after `</Stack>` but inside the provider.

#### `app/(tabs)/game.tsx`
**Removed:**
- `import { useSubscription } from '../../context/SubscriptionContext';` (line 26)
- `const { isPro, isFree, showPaywall, features } = useSubscription();` (line 79)
- Lines 297-309: Post-share watermark nudge alert for free users
  ```
  if (isFree) {
      setTimeout(() => {
          Alert.alert('Upgrade to Pro', '...', [
              { text: 'Maybe Later' },
              { text: 'Learn More', onPress: () => showPaywall(...) }
          ]);
      }, 500);
  }
  ```
- Lines 319-323: Collab session limit comment/check for free users
  ```
  if (isFree && !sessionId) {
      // Future: check active session count from server
  }
  ```
- Lines 568-573: Watermark badge in report modal
  ```
  {isFree && (
      <TouchableOpacity onPress={() => showPaywall(...)} style={styles.watermarkBadge}>
          <Ionicons name="lock-closed" size={12} color="#ff6b35" />
          <Text style={styles.watermarkBadgeText}>FREE — Reports include watermark</Text>
      </TouchableOpacity>
  )}
  ```
- Styles: `watermarkBadge`, `watermarkBadgeText`

#### `app/(tabs)/groups.tsx`
**Removed:**
- `import { TrialBanner } from '../../components/TrialBanner';` (line 22)
- `import { useSubscription } from '../../context/SubscriptionContext';` (line 23)
- `const { isPro, isFree, isTrial, trialDaysRemaining, showPaywall, features, subscription, refreshSubscription } = useSubscription();` (line 48)
- Lines 126-130: Max groups gate in `openCreateModal()`
  ```
  if (isFree && groups.length >= features.maxGroups) {
      showPaywall(`You've reached the free limit of ${features.maxGroups} groups...`);
      return;
  }
  ```
- Lines 428-434: `handleManageSubscription()` function (links to App Store/Play Store)
- Lines 436-437: `tierLabel` and `tierColor` computed values
- Line 455: `<TrialBanner />`
- Lines 478-480: Group count label `"{count}/{maxGroups} Groups"` for free users
- Lines 508-550: Entire SUBSCRIPTION section in Settings modal:
  - Current Plan tier badge (FREE/TRIAL/PRO)
  - Trial countdown ("Trial Ends In X days")
  - Subscription expiry date
  - "Upgrade to Pro" button
  - "Manage Subscription" button
  - "Restore Purchases" section
- Styles: `groupCountLabel`, `tierBadge`, `tierBadgeText`, `upgradeBtn`, `upgradeBtnText`, `manageBtn`, `manageBtnText`

## Backend Endpoint (Still Exists, Just Unused)
- **`check_subscription.php`** — Returns subscription tier, features, trial info
  - This endpoint still exists on the server, it's just not being called
  - When restoring, the frontend will call it again via SubscriptionContext

## Restoration Steps

1. **Implement Apple IAP** using `react-native-iap` or `expo-in-app-purchases`
2. **Restore the 3 deleted component/context files** from git history
3. **Re-wrap _layout.tsx** with `<SubscriptionProvider>` and `<PaywallModal />`
4. **Re-add subscription imports and hooks** to game.tsx and groups.tsx
5. **Re-add feature gates**: max groups limit, watermark badge, collab limit
6. **Re-add UI elements**: TrialBanner, subscription settings section, group count label
7. **Update PaywallModal** to include actual purchase buttons (replace "coming soon" text)
8. **Connect IAP receipts** to `check_subscription.php` backend for verification
9. **Test the full flow**: free -> purchase -> pro features unlocked -> manage/cancel

## Git Reference
The commit that stripped payments is titled "Strip all payment/subscription UI for free App Store launch". Check the commit just before it for the full working subscription code.

## Feature Gate Logic Reference
```typescript
// In SubscriptionContext.tsx DEFAULT_FEATURES:
const DEFAULT_FEATURES = {
    canGenerateCleanReports: false,  // Pro: true
    canEditMatches: false,           // Pro: true
    canDeleteMatches: false,         // Pro: true
    maxGroups: 2,                    // Pro: unlimited (999)
    maxCollabSessions: 1,            // Pro: unlimited (999)
    maxPlayersPerGroup: 100,         // Same for all tiers
};
```
