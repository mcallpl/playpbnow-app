import { Stack } from 'expo-router';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { ActiveMatchProvider } from '../context/ActiveMatchContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { BeaconProvider } from '../context/BeaconContext';
import { PaywallModal } from '../components/PaywallModal';
import { useAuth } from '../hooks/useAuth';
import { useSoundPlayers } from '../utils/sounds';
import {
  FONT_DISPLAY_BOLD,
  FONT_BODY_REGULAR,
  FONT_BODY_MEDIUM,
  FONT_BODY_SEMIBOLD,
  FONT_DISPLAY_EXTRABOLD,
} from '../constants/theme';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';

SplashScreen.preventAutoHideAsync();

function PhoneGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userId } = useAuth();
  const { colors } = useTheme();
  const [needsPhone, setNeedsPhone] = useState<boolean | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const checkPhone = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setNeedsPhone(null);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/check_phone.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNeedsPhone(!data.has_phone);
      }
    } catch {
      // If check fails, don't block — let them through
      setNeedsPhone(false);
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    checkPhone();
  }, [checkPhone]);

  const handleSavePhone = async () => {
    setError('');
    if (!phoneInput.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/check_phone.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', user_id: userId, phone: phoneInput.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        await AsyncStorage.setItem('user_phone', phoneInput.trim());
        setNeedsPhone(false);
      } else {
        setError(data.message || 'Failed to save phone number.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (needsPhone) {
    return (
      <>
        {children}
        <Modal animationType="slide" transparent visible onRequestClose={() => {}}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            padding: 24,
          }}>
            <View style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 28,
            }}>
              <Text style={{
                fontSize: 22,
                fontFamily: FONT_DISPLAY_BOLD,
                color: colors.text,
                textAlign: 'center',
                marginBottom: 8,
              }}>Phone Number Required</Text>
              <Text style={{
                fontSize: 14,
                fontFamily: FONT_BODY_REGULAR,
                color: colors.textMuted,
                textAlign: 'center',
                marginBottom: 20,
                lineHeight: 20,
              }}>Your phone number is now used to sign in and recover your password. Please add it to continue.</Text>
              <TextInput
                style={{
                  backgroundColor: colors.bg,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  fontFamily: FONT_BODY_REGULAR,
                  color: colors.text,
                  marginBottom: 12,
                }}
                placeholder="(949) 735-9415"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phoneInput}
                onChangeText={setPhoneInput}
              />
              {error !== '' && (
                <Text style={{
                  color: '#dc2626',
                  fontSize: 13,
                  fontFamily: FONT_BODY_MEDIUM,
                  textAlign: 'center',
                  marginBottom: 12,
                }}>{error}</Text>
              )}
              <TouchableOpacity
                style={{
                  backgroundColor: colors.accent,
                  padding: 16,
                  borderRadius: 14,
                  alignItems: 'center',
                  opacity: saving ? 0.5 : 1,
                }}
                onPress={handleSavePhone}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{
                    color: '#fff',
                    fontSize: 16,
                    fontFamily: FONT_DISPLAY_EXTRABOLD,
                    letterSpacing: 1,
                  }}>CONTINUE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return <>{children}</>;
}

function RootLayoutInner() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  useSoundPlayers();

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <BeaconProvider>
      <ActiveMatchProvider>
        <SubscriptionProvider>
          <PhoneGate>
            <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
              <Stack.Screen name="login" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="live-match" />
            </Stack>
            <PaywallModal />
          </PhoneGate>
        </SubscriptionProvider>
      </ActiveMatchProvider>
    </BeaconProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
