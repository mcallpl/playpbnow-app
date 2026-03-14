import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { useLocation, UserLocation } from '../hooks/useLocation';
import { playBeaconChime } from '../utils/sounds';

const SHARED_BEACON_URL = 'https://peoplestar.com/shared/beacon/api';

interface BeaconContextValue {
  hasActiveBeacons: boolean;
  activeBeaconCount: number;
  reportBeaconCount: (count: number) => void;
  location: UserLocation | null;
  locationPermissionDenied: boolean;
  requestLocation: () => Promise<UserLocation | null>;
  showLocationDeniedAlert: () => void;
  /** True once the background check has completed at least once */
  initialCheckDone: boolean;
}

const BeaconContext = createContext<BeaconContextValue>({
  hasActiveBeacons: false,
  activeBeaconCount: 0,
  reportBeaconCount: () => {},
  location: null,
  locationPermissionDenied: false,
  requestLocation: async () => null,
  showLocationDeniedAlert: () => {},
  initialCheckDone: false,
});

export function useBeaconStatus() {
  return useContext(BeaconContext);
}

export function BeaconProvider({ children }: { children: React.ReactNode }) {
  const [activeBeaconCount, setActiveBeaconCount] = useState(0);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const prevCountRef = useRef<number>(0);

  const {
    location,
    permissionDenied: locationPermissionDenied,
    requestLocation,
    showLocationDeniedAlert,
  } = useLocation();

  // Called by the feed whenever it fetches beacons — single source of truth
  const reportBeaconCount = useCallback((count: number) => {
    // Play chime when a new beacon appears
    if (count > prevCountRef.current && prevCountRef.current >= 0) {
      playBeaconChime();
    }
    prevCountRef.current = count;
    setActiveBeaconCount(count);
    if (!initialCheckDone) setInitialCheckDone(true);
  }, [initialCheckDone]);

  // Background beacon check — runs immediately on app load so we know
  // about active beacons before the user navigates to Play Now
  useEffect(() => {
    let cancelled = false;

    const checkBeacons = async () => {
      try {
        const userId = await AsyncStorage.getItem('user_id');
        if (!userId) return;

        const body: Record<string, any> = { user_id: parseInt(userId) || 0 };
        if (location?.latitude && location?.longitude) {
          body.lat = location.latitude;
          body.lng = location.longitude;
        }

        const res = await fetch(`${SHARED_BEACON_URL}/feed.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (!cancelled && data.status === 'success') {
          const count = Array.isArray(data.beacons) ? data.beacons.length : 0;
          // Only update if Play Now tab hasn't already reported (avoid overwriting)
          if (prevCountRef.current === 0 && count > 0) {
            prevCountRef.current = count;
            setActiveBeaconCount(count);
            playBeaconChime();
          }
          setInitialCheckDone(true);
        }
      } catch {
        // Silently fail — Play Now tab will pick up beacons when opened
        setInitialCheckDone(true);
      }
    };

    checkBeacons();

    // Re-check every 30s in background
    const interval = setInterval(checkBeacons, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location?.latitude, location?.longitude]);

  return (
    <BeaconContext.Provider value={{
      hasActiveBeacons: activeBeaconCount > 0,
      activeBeaconCount,
      reportBeaconCount,
      location,
      locationPermissionDenied,
      requestLocation,
      showLocationDeniedAlert,
      initialCheckDone,
    }}>
      {children}
    </BeaconContext.Provider>
  );
}
