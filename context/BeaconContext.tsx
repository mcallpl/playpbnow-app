import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, UserLocation } from '../hooks/useLocation';
import { playBeaconChime } from '../utils/sounds';

// Absolute URL required — see hooks/useBeacon.ts (relative URLs break native fetch
// and resolve to the wrong host on web).
const SHARED_BEACON_URL = 'https://playpbnow.com/shared/beacon/api';

interface BeaconContextValue {
  hasActiveBeacons: boolean;
  hasOtherBeacons: boolean;
  hasOwnBeacon: boolean;
  activeBeaconCount: number;
  otherBeaconCount: number;
  reportBeaconCounts: (total: number, others: number, own: boolean) => void;
  location: UserLocation | null;
  locationPermissionDenied: boolean;
  requestLocation: () => Promise<UserLocation | null>;
  showLocationDeniedAlert: () => void;
  /** True once the background check has completed at least once */
  initialCheckDone: boolean;
}

export const BeaconContext = createContext<BeaconContextValue>({
  hasActiveBeacons: false,
  hasOtherBeacons: false,
  hasOwnBeacon: false,
  activeBeaconCount: 0,
  otherBeaconCount: 0,
  reportBeaconCounts: () => {},
  location: null,
  locationPermissionDenied: false,
  requestLocation: async () => null,
  showLocationDeniedAlert: () => {},
  initialCheckDone: false,
});

export function useBeaconStatus() {
  return useContext(BeaconContext);
}

function BeaconProviderComponent({ children }: { children: React.ReactNode }) {
  const [activeBeaconCount, setActiveBeaconCount] = useState(0);
  const [otherBeaconCount, setOtherBeaconCount] = useState(0);
  const [hasOwnBeacon, setHasOwnBeacon] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const prevOtherCountRef = useRef<number>(0);

  const {
    location,
    permissionDenied: locationPermissionDenied,
    requestLocation,
    showLocationDeniedAlert,
  } = useLocation();

  // Called by the feed whenever it fetches beacons — single source of truth
  const reportBeaconCounts = useCallback((total: number, others: number, own: boolean) => {
    // Play chime only when OTHER players' beacons increase
    if (others > prevOtherCountRef.current && prevOtherCountRef.current >= 0) {
      playBeaconChime();
    }
    prevOtherCountRef.current = others;
    setActiveBeaconCount(total);
    setOtherBeaconCount(others);
    setHasOwnBeacon(own);
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
          const beacons = Array.isArray(data.beacons) ? data.beacons : [];
          const uid = parseInt(userId);
          const others = beacons.filter((b: any) => !b.is_mine && b.user_id !== uid).length;
          const own = beacons.some((b: any) => b.is_mine || b.user_id === uid);
          // Only update if Play Now tab hasn't already reported (avoid overwriting)
          if (prevOtherCountRef.current === 0 && others > 0) {
            prevOtherCountRef.current = others;
            playBeaconChime();
          }
          setActiveBeaconCount(beacons.length);
          setOtherBeaconCount(others);
          setHasOwnBeacon(own);
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

  // Memoize computed values to prevent unnecessary re-renders
  const hasActiveBeacons = useMemo(() => activeBeaconCount > 0, [activeBeaconCount]);
  const hasOtherBeacons = useMemo(() => otherBeaconCount > 0, [otherBeaconCount]);

  // Memoize context value so reference only changes when values actually change
  const value = useMemo(() => ({
    hasActiveBeacons,
    hasOtherBeacons,
    hasOwnBeacon,
    activeBeaconCount,
    otherBeaconCount,
    reportBeaconCounts,
    location,
    locationPermissionDenied,
    requestLocation,
    showLocationDeniedAlert,
    initialCheckDone,
  }), [
    hasActiveBeacons,
    hasOtherBeacons,
    hasOwnBeacon,
    activeBeaconCount,
    otherBeaconCount,
    reportBeaconCounts,
    location,
    locationPermissionDenied,
    requestLocation,
    showLocationDeniedAlert,
    initialCheckDone,
  ]);

  return (
    <BeaconContext.Provider value={value}>
      {children}
    </BeaconContext.Provider>
  );
}

export const BeaconProvider = React.memo(BeaconProviderComponent);
