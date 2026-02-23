import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasPrompted = useRef(false);
  const hasWarnedError = useRef(false);

  const getDeviceInstructions = useCallback((): string => {
    if (Platform.OS === 'ios') {
      const version = parseInt(Platform.Version as string, 10);
      if (version >= 16) {
        return (
          'To enable Location Services on your iPhone:\n\n' +
          '1. Open Settings\n' +
          '2. Tap Privacy & Security\n' +
          '3. Tap Location Services\n' +
          '4. Make sure Location Services is turned ON\n' +
          '5. Scroll down and find PlayPBNow\n' +
          '6. Tap it and select "While Using the App"'
        );
      }
      return (
        'To enable Location Services on your iPhone:\n\n' +
        '1. Open Settings\n' +
        '2. Tap Privacy\n' +
        '3. Tap Location Services\n' +
        '4. Make sure Location Services is turned ON\n' +
        '5. Scroll down and find PlayPBNow\n' +
        '6. Tap it and select "While Using the App"'
      );
    }

    if (Platform.OS === 'android') {
      const sdk = typeof Platform.Version === 'number' ? Platform.Version : 0;
      if (sdk >= 33) {
        // Android 13+
        return (
          'To enable Location on your Android device:\n\n' +
          '1. Open Settings\n' +
          '2. Tap Location\n' +
          '3. Make sure "Use location" is turned ON\n' +
          '4. Tap App location permissions\n' +
          '5. Find PlayPBNow\n' +
          '6. Select "Allow only while using the app"'
        );
      }
      if (sdk >= 29) {
        // Android 10-12
        return (
          'To enable Location on your Android device:\n\n' +
          '1. Open Settings\n' +
          '2. Tap Location\n' +
          '3. Make sure Location is turned ON\n' +
          '4. Tap App permissions (or App access to location)\n' +
          '5. Find PlayPBNow\n' +
          '6. Select "Allow only while using the app"'
        );
      }
      // Android 9 and below
      return (
        'To enable Location on your Android device:\n\n' +
        '1. Open Settings\n' +
        '2. Tap Security & Location (or Location)\n' +
        '3. Make sure Location is turned ON\n' +
        '4. Tap App-level permissions\n' +
        '5. Make sure PlayPBNow is enabled'
      );
    }

    return 'Please enable Location Services in your device settings for PlayPBNow.';
  }, []);

  const showLocationDeniedAlert = useCallback(() => {
    const instructions = getDeviceInstructions();

    Alert.alert(
      'Location Services Required',
      `PlayPBNow needs your location to show nearby beacons. Without it, you won't see beacons from courts in your area.\n\n${instructions}`,
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }, [getDeviceInstructions]);

  const requestLocation = useCallback(async (): Promise<UserLocation | null> => {
    try {
      setLoading(true);

      // Check if location services are enabled at the device level
      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        setPermissionDenied(true);
        if (!hasPrompted.current) {
          hasPrompted.current = true;
          const instructions = getDeviceInstructions();
          Alert.alert(
            'Location Services Disabled',
            `Your device's Location Services are turned off. PlayPBNow needs location access to show nearby beacons.\n\n${instructions}`,
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                },
              },
            ]
          );
        }
        return null;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setPermissionDenied(true);
        if (!hasPrompted.current) {
          hasPrompted.current = true;
          showLocationDeniedAlert();
        }
        return null;
      }

      setPermissionDenied(false);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: UserLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);
      return coords;
    } catch (e) {
      if (!hasWarnedError.current) {
        hasWarnedError.current = true;
        console.warn('Location error:', e);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [getDeviceInstructions, showLocationDeniedAlert]);

  // Request on mount
  useEffect(() => {
    requestLocation();
  }, []);

  return {
    location,
    permissionDenied,
    loading,
    requestLocation,
    showLocationDeniedAlert,
    getDeviceInstructions,
  };
}
