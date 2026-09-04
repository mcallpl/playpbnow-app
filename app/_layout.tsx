import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Alert } from '@/utils/crossAlert';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
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
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth, signOut, PHONE_GATE_SKIP_PREFIX } from '../hooks/useAuth';
import { useSoundPlayers } from '../utils/sounds';
import { installAuthInterceptor, setOnUnauthorized } from '@/utils/apiClient';

// Install the API auth-token interceptor as early as possible, before any
// screen/hook issues a fetch, so every API call carries the session token.
installAuthInterceptor();
import {
  FONT_DISPLAY_BOLD,
  FONT_BODY_REGULAR,
  FONT_BODY_MEDIUM,
  FONT_BODY_SEMIBOLD,
  FONT_DISPLAY_EXTRABOLD,
} from '../constants/theme';

const API_URL = 'https://playpbnow.com/api';

// PhoneGate "Skip for now" is remembered per user_id for this long, then the
// prompt comes back once (Audit A H4). The stamp survives sign-out on purpose
// (see signOut in hooks/useAuth) so the same person is not nagged on re-login.
const PHONE_GATE_SKIP_MS = 7 * 24 * 60 * 60 * 1000;

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
    // Honour a recent "Skip for now" before asking the server at all.
    try {
      const stamp = await AsyncStorage.getItem(PHONE_GATE_SKIP_PREFIX + userId);
      if (stamp && Date.now() - Number(stamp) < PHONE_GATE_SKIP_MS) {
        setNeedsPhone(false);
        return;
      }
    } catch {
      // storage unavailable — fall through to the normal check
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
        setError(data.message || "We couldn't save that number. Please check it and try again.");
      }
    } catch {
      setError("We couldn't reach PlayPBNow. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  // "Skip for now": dismiss and remember it for this user for 7 days. The
  // gate used to be unclosable (onRequestClose was a no-op), which trapped
  // anyone whose number already belonged to another account.
  const handleSkip = async () => {
    try {
      if (userId) await AsyncStorage.setItem(PHONE_GATE_SKIP_PREFIX + userId, String(Date.now()));
    } catch {}
    setNeedsPhone(false);
  };

  // "Use a different account": the only way out when the number belongs to
  // another account. Shared sign-out clears everything and lands on /login.
  const handleSwitchAccount = async () => {
    setNeedsPhone(false);
    await signOut();
  };

  if (needsPhone) {
    return (
      <>
        {children}
        <Modal animationType="slide" transparent visible onRequestClose={handleSkip}>
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
              }}>Add Your Phone Number</Text>
              <Text style={{
                fontSize: 14,
                fontFamily: FONT_BODY_REGULAR,
                color: colors.textMuted,
                textAlign: 'center',
                marginBottom: 20,
                lineHeight: 20,
              }}>Add a phone number so you can recover your password by text if you ever forget it. It's optional — you can add it later in Settings.</Text>
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
                placeholder="(555) 555-1234"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                value={phoneInput}
                onChangeText={setPhoneInput}
                onSubmitEditing={handleSavePhone}
                returnKeyType="done"
              />
              {error !== '' && (
                <Text style={{
                  color: colors.danger,
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
                  <ActivityIndicator color={colors.accentText} size="small" />
                ) : (
                  <Text style={{
                    color: colors.accentText,
                    fontSize: 16,
                    fontFamily: FONT_DISPLAY_EXTRABOLD,
                    letterSpacing: 1,
                  }}>SAVE NUMBER</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSkip}
                disabled={saving}
                style={{ alignItems: 'center', paddingVertical: 14, minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{
                  color: colors.text,
                  fontSize: 14,
                  fontFamily: FONT_BODY_SEMIBOLD,
                }}>Skip for now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSwitchAccount}
                disabled={saving}
                style={{ alignItems: 'center', paddingVertical: 8, minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{
                  color: colors.textMuted,
                  fontSize: 13,
                  fontFamily: FONT_BODY_MEDIUM,
                  textDecorationLine: 'underline',
                }}>Use a different account</Text>
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
  const { isAuthenticated, checkAuth } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  useSoundPlayers();

  // When the API rejects our session (401), the interceptor clears the dead
  // token and calls this: re-check auth (now false) and land on /login —
  // instead of stranding the user on "Invalid or expired session" errors.
  useEffect(() => {
    setOnUnauthorized(() => {
      checkAuth();
      router.replace('/login');
    });
    return () => setOnUnauthorized(null);
  }, []);

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

  // On web, fonts load via CSS @font-face but useFonts may not resolve.
  // Use a timeout fallback so the app doesn't stay blank forever.
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => setFontTimeout(true), 2000);
      // Prevent horizontal overflow on mobile web browsers
      const style = document.createElement('style');
      style.textContent = 'html,body,#root{max-width:100vw;overflow-x:hidden}';
      document.head.appendChild(style);
      return () => { clearTimeout(timer); document.head.removeChild(style); };
    }
  }, []);

  const ready = fontsLoaded || fontTimeout;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <ErrorBoundary
      // Surface every caught render crash in the device/browser console (and
      // therefore in the Expo/EAS logs). A crash reporter can hook here later.
      onError={(error, info) => {
        console.error('[PlayPBNow] Uncaught render error:', error?.message || error, info?.componentStack || '');
      }}
    >
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
