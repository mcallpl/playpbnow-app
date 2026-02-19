import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { ActiveMatchProvider } from '../context/ActiveMatchContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { PaywallModal } from '../components/PaywallModal';
import { useAuth } from '../hooks/useAuth';

export default function RootLayout() {
  const { isAuthenticated } = useAuth();

  // Show loading while checking auth - but don't redirect yet
  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b3358' }}>
        <ActivityIndicator size="large" color="#87ca37" />
      </View>
    );
  }

  // Render both screens - let useAuth handle navigation
  return (
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
  );
}
