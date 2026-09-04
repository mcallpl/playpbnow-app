import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, UserLocation } from '../hooks/useLocation';
import { fetchBeaconFeeds } from '../hooks/useBeacon';
import { playBeaconChime } from '../utils/sounds';

// Absolute URL required — see hooks/useBeacon.ts (relative URLs break native fetch
// and resolve to the wrong host on web). Kept for reference: the background
// check now goes through fetchBeaconFeeds(), which uses this same host.
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
  // H6: once the Play Now tab has reported the MERGED (casual + structured)
  // feed, the background check below — which only ever sees the casual shared
  // feed and applies no expiry filter — must not overwrite it. Structured
  // beacons would otherwise be erased from the tab badge every 30 seconds.
  const tabHasReportedRef = useRef(false);

  const {
    location,
    permissionDenied: locationPermissionDenied,
    requestLocation,
    showLocationDeniedAlert,
  } = useLocation({ requestOnMount: false }); // M10: Play Now asks on first focus

  // Called by the feed whenever it fetches beacons — single source of truth
  const reportBeaconCounts = useCallback((total: number, others: number, own: boolean) => {
    tabHasReportedRef.current = true;
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

        // H6: the SAME merged fetch the Play Now tab uses (shared casual feed +
        // PlayPBNow structured feed, expired rows filtered out), so the badge
        // and the feed can never disagree. The old casual-only POST counted
        // expired beacons and never saw a structured one.
        const merged = await fetchBeaconFeeds({
          userId,
          lat: location?.latitude,
          lng: location?.longitude,
          includeHistory: false,
        });

        if (!cancelled && merged.ok) {
          // H6: never clobber a live report from the Play Now tab.
          if (tabHasReportedRef.current) {
            setInitialCheckDone(true);
            return;
          }
          const beacons = merged.beacons;
          const others = beacons.filter((b) => !b.is_mine && String(b.user_id) !== String(userId)).length;
          const own = beacons.some((b) => b.is_mine || String(b.user_id) === String(userId));
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
