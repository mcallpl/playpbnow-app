import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
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

SplashScreen.preventAutoHideAsync();

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
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="live-match" />
          </Stack>
          <PaywallModal />
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
