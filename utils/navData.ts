import AsyncStorage from '@react-native-async-storage/async-storage';

const NAV_DATA_KEY = 'nav_data';
const ACTIVE_MATCH_KEY = 'active_match_data';

/**
 * Store large navigation data in AsyncStorage instead of URL params.
 * Returns a unique key to retrieve it on the destination screen.
 */
export async function storeNavData(data: Record<string, any>): Promise<string> {
    const navId = `nav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(`${NAV_DATA_KEY}_${navId}`, JSON.stringify(data));
    return navId;
}

/**
 * Retrieve stored navigation data (keeps it for refresh survival).
 */
export async function getNavData(navId: string): Promise<Record<string, any> | null> {
    try {
        const raw = await AsyncStorage.getItem(`${NAV_DATA_KEY}_${navId}`);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to retrieve nav data:', e);
    }
    return null;
}

/**
 * Persist active match data so it survives hard refresh on web.
 */
export async function saveActiveMatchData(data: Record<string, any>): Promise<void> {
    await AsyncStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(data));
}

/**
 * Load persisted active match data (for refresh recovery).
 */
export async function loadActiveMatchData(): Promise<Record<string, any> | null> {
    try {
        const raw = await AsyncStorage.getItem(ACTIVE_MATCH_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

/**
 * Clear persisted active match data (when match ends).
 */
export async function clearActiveMatchData(): Promise<void> {
    await AsyncStorage.removeItem(ACTIVE_MATCH_KEY);
}
