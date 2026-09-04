import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';

// RevenueCat API keys — replace with your actual keys from RevenueCat dashboard
const REVENUECAT_IOS_KEY = 'appl_gmrZHsjrYBjpKrbulbIRAjWVnMp';
const REVENUECAT_ANDROID_KEY = 'goog_SCuqRSOfQRaKUQGEkqLyBOOGSkB';

// Entitlement ID configured in RevenueCat dashboard
export const PRO_ENTITLEMENT_ID = 'pro';

let isInitialized = false;

// RevenueCat does not work in Expo Go — skip all SDK calls
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Initialize RevenueCat SDK. Call once on app startup after user ID is available.
 * Skipped automatically in Expo Go where native billing is unavailable.
 */
export async function initializePurchases(appUserId?: string): Promise<void> {
  if (isInitialized || isExpoGo) return;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey, appUserID: appUserId || undefined });
  isInitialized = true;
}

/**
 * Identify/login a user with RevenueCat so purchases are tied to your app user ID.
 */
export async function identifyUser(appUserId: string): Promise<CustomerInfo> {
  if (isExpoGo) return {} as CustomerInfo;
  // logIn() before configure() throws inside the native SDK. The provider
  // configures on mount, but the login screen can race it — configure here
  // with the real id so the purchase is never attributed to $RCAnonymousID
  // (UAT 2026-09-04, Audit A C2).
  if (!isInitialized) {
    await initializePurchases(appUserId);
  }
  const { customerInfo } = await Purchases.logIn(appUserId);
  return customerInfo;
}

/**
 * Detach the RevenueCat identity on sign-out so the next account on this
 * device does not inherit the previous user's entitlements. Never throws —
 * logout must not be blocked by a billing SDK hiccup.
 */
export async function logOutPurchasesUser(): Promise<void> {
  if (isExpoGo || !isInitialized || Platform.OS === 'web') return;
  try {
    const anonymous = await Purchases.isAnonymous();
    if (!anonymous) {
      await Purchases.logOut();
    }
  } catch (e) {
    console.error('RevenueCat logOut error (ignored):', e);
  }
}

/**
 * Fetch available subscription offerings (packages with pricing).
 */
export async function getOfferings(): Promise<PurchasesOfferings> {
  if (isExpoGo) return { all: {}, current: null } as unknown as PurchasesOfferings;
  return Purchases.getOfferings();
}

/**
 * Purchase a specific package (monthly or annual).
 * Returns customer info on success, null if user cancelled.
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  if (isExpoGo) return null;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (e: any) {
    if (e.userCancelled) {
      return null;
    }
    throw e;
  }
}

/**
 * Restore previous purchases (e.g., after reinstall or new device).
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  if (isExpoGo) return {} as CustomerInfo;
  return Purchases.restorePurchases();
}

/**
 * Get current customer info to check entitlements.
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  if (isExpoGo) return {} as CustomerInfo;
  return Purchases.getCustomerInfo();
}

/**
 * Check if the user currently has the "pro" entitlement active.
 */
export function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements?.active?.[PRO_ENTITLEMENT_ID] !== undefined;
}
