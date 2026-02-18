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
