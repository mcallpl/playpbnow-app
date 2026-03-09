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
