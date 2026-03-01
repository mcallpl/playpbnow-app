import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';

// ============================================================
// BYPASS SMS AUTH FOR APPLE REVIEW
// Set to false to re-enable normal SMS login flow
const BYPASS_AUTH_FOR_REVIEW = true;
const REVIEW_PHONE = '+19497359415';
const API_URL = 'https://peoplestar.com/Chipleball/api';
// ============================================================

export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();
    const segments = useSegments();

    const checkAuth = async () => {
        // --- BYPASS: Skip SMS auth for Apple review ---
        // Logs in as a real user account so all API calls work
        if (BYPASS_AUTH_FOR_REVIEW) {
            try {
                const resp = await fetch(`${API_URL}/review_login.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: REVIEW_PHONE }),
                });
                const data = await resp.json();
                if (data.status === 'success') {
                    await AsyncStorage.setItem('session_token', data.session_token);
                    await AsyncStorage.setItem('user_id', data.user.id.toString());
                    await AsyncStorage.setItem('user_phone', data.user.phone);
                    if (data.user.first_name) await AsyncStorage.setItem('user_first_name', data.user.first_name);
                    if (data.user.last_name) await AsyncStorage.setItem('user_last_name', data.user.last_name);
                    setIsAuthenticated(true);
                    setUserId(data.user.id.toString());
                    return;
                }
            } catch (e) {
                console.error('Review bypass login failed:', e);
            }
            // Fallback: if review_login fails, continue to normal auth check
        }
        // --- END BYPASS ---

        try {
            const token = await AsyncStorage.getItem('session_token');
            const uid = await AsyncStorage.getItem('user_id');

            console.log('🔐 Auth check - token:', !!token, 'uid:', uid);

            if (token && uid) {
                setIsAuthenticated(true);
                setUserId(uid);
            } else {
                setIsAuthenticated(false);
                setUserId(null);
            }
        } catch (error) {
            console.error('❌ Auth check error:', error);
            setIsAuthenticated(false);
            setUserId(null);
        }
    };

    // Re-check auth on mount AND whenever navigation segments change
    // This catches the case where login sets AsyncStorage then navigates
    useEffect(() => {
        checkAuth();
    }, [segments[0]]);

    useEffect(() => {
        if (isAuthenticated === null) return;

        const inAuthGroup = segments[0] === 'login';

        console.log('🔍 Auth state:', isAuthenticated, 'In login?', inAuthGroup, 'Segments:', segments);

        if (!isAuthenticated && !inAuthGroup) {
            console.log('➡️ Redirecting to login');
            router.replace('/login');
        } else if (isAuthenticated && inAuthGroup) {
            console.log('➡️ Redirecting to home');
            router.replace('/(tabs)/groups');
        }
    }, [isAuthenticated, segments]);

    const logout = async () => {
        try {
            console.log('🚪 Logging out...');
            await AsyncStorage.multiRemove([
                'session_token',
                'user_id',
                'user_phone',
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
            console.log('✅ Logged out successfully');
        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    };

    return {
        isAuthenticated,
        userId,
        logout,
        checkAuth
    };
}
