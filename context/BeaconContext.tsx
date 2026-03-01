import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { useLocation, UserLocation } from '../hooks/useLocation';
import { playBeaconChime } from '../utils/sounds';

interface BeaconContextValue {
  hasActiveBeacons: boolean;
  activeBeaconCount: number;
  reportBeaconCount: (count: number) => void;
  location: UserLocation | null;
  locationPermissionDenied: boolean;
  requestLocation: () => Promise<UserLocation | null>;
  showLocationDeniedAlert: () => void;
}

const BeaconContext = createContext<BeaconContextValue>({
  hasActiveBeacons: false,
  activeBeaconCount: 0,
  reportBeaconCount: () => {},
  location: null,
  locationPermissionDenied: false,
  requestLocation: async () => null,
  showLocationDeniedAlert: () => {},
});

export function useBeaconStatus() {
  return useContext(BeaconContext);
}

export function BeaconProvider({ children }: { children: React.ReactNode }) {
  const [activeBeaconCount, setActiveBeaconCount] = useState(0);
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
  }, []);

  return (
    <BeaconContext.Provider value={{
      hasActiveBeacons: activeBeaconCount > 0,
      activeBeaconCount,
      reportBeaconCount,
      location,
      locationPermissionDenied,
      requestLocation,
      showLocationDeniedAlert,
    }}>
      {children}
    </BeaconContext.Provider>
  );
}
