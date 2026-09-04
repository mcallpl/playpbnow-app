import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';

export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();
    const segments = useSegments();

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('session_token');
            const uid = await AsyncStorage.getItem('user_id');

            if (token && uid) {
                setIsAuthenticated(true);
                setUserId(uid);
            } else {
                setIsAuthenticated(false);
                setUserId(null);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            setIsAuthenticated(false);
            setUserId(null);
        }
    };

    // Re-check auth on mount AND whenever navigation segments change
    useEffect(() => {
        checkAuth();
    }, [segments[0]]);

    useEffect(() => {
        if (isAuthenticated === null) return;

        const inAuthGroup = segments[0] === 'login';

        if (!isAuthenticated && !inAuthGroup) {
            router.replace('/login');
        } else if (isAuthenticated && inAuthGroup) {
            router.replace('/(tabs)/groups');
        }
    }, [isAuthenticated, segments]);

    const logout = async () => {
        try {
            // UAT 2026-09-04: route through the shared routine first so the
            // Bearer token, RevenueCat identity and server session are dealt
            // with; the explicit key list below is kept as belt-and-braces.
            await signOut({ navigate: false });
            await AsyncStorage.multiRemove([
                'session_token',
                'user_id',
                'user_phone',
                'user_email',
                'user_first_name',
                'user_last_name',
                'device_id',
                'active_group_name',
                'active_group_name_global',
                'group_id_map',
                'leaderboard_mode'
            ]);
            setIsAuthenticated(false);
            setUserId(null);
            router.replace('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return {
        isAuthenticated,
        userId,
        logout,
        checkAuth
    };
}

// ---------------------------------------------------------------------------
// Shared sign-out (UAT 2026-09-04).
// Every screen used to clear AsyncStorage on its own and none of them reset
// the in-memory Bearer token in utils/apiClient, so a stale token was still
// sent from the login screen and the previous user's cached groups/phone
// survived into the next account. This is now the ONE way to log out.
// - preserves the dark/light theme choice (it is a device preference)
// - preserves PhoneGate "skip for now" stamps (they are per user_id and
//   time-boxed, so the same person is not nagged again after a re-login)
// - revokes the server session (best effort, never blocks)
// - clears the cached Bearer token
// - logs RevenueCat out on native (best effort)
// - lands on /login unless the caller navigates itself (navigate: false)
// ---------------------------------------------------------------------------
const THEME_KEY = 'theme_preference';
export const PHONE_GATE_SKIP_PREFIX = 'phone_gate_skip_';

export async function signOut(options?: { skipServer?: boolean; navigate?: boolean }): Promise<void> {
    let theme: string | null = null;
    let token: string | null = null;
    let preserved: [string, string][] = [];
    try {
        theme = await AsyncStorage.getItem(THEME_KEY);
        token = await AsyncStorage.getItem('session_token');
        const keys = (await AsyncStorage.getAllKeys()) || [];
        const keep = keys.filter((k) => k.indexOf(PHONE_GATE_SKIP_PREFIX) === 0);
        if (keep.length) {
            const pairs = await AsyncStorage.multiGet(keep);
            preserved = pairs
                .filter((p): p is [string, string] => !!p && typeof p[1] === 'string')
                .map((p) => [p[0], p[1]]);
        }
    } catch {}

    if (token && !options?.skipServer) {
        try {
            await fetch('https://playpbnow.com/api/logout.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ session_token: token }),
            });
        } catch {}
    }

    try { await AsyncStorage.clear(); } catch {}
    if (theme) { try { await AsyncStorage.setItem(THEME_KEY, theme); } catch {} }
    if (preserved.length) { try { await AsyncStorage.multiSet(preserved); } catch {} }

    try {
        const { setAuthToken } = require('../utils/apiClient');
        setAuthToken(null);
    } catch {}

    try {
        const { Platform } = require('react-native');
        if (Platform.OS !== 'web') {
            // Prefer the guarded helper (respects Expo Go / not-yet-configured).
            const { logOutPurchasesUser } = require('../utils/purchases');
            if (typeof logOutPurchasesUser === 'function') {
                await logOutPurchasesUser();
            } else {
                const Purchases = require('react-native-purchases').default;
                if (Purchases && typeof Purchases.isAnonymous === 'function') {
                    const anon = await Purchases.isAnonymous().catch(() => true);
                    if (!anon) await Purchases.logOut();
                }
            }
        }
    } catch {}

    if (options?.navigate !== false) {
        try {
            const { router } = require('expo-router');
            if (router && typeof router.replace === 'function') router.replace('/login');
        } catch {}
    }
}
