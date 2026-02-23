import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { playBeaconChime } from '../utils/sounds';
import { useLocation, UserLocation } from '../hooks/useLocation';

const API_URL = 'https://peoplestar.com/Chipleball/api';
const POLL_INTERVAL = 30000; // 30 seconds

interface BeaconContextValue {
  hasActiveBeacons: boolean;
  activeBeaconCount: number;
  location: UserLocation | null;
  locationPermissionDenied: boolean;
  requestLocation: () => Promise<UserLocation | null>;
  showLocationDeniedAlert: () => void;
}

const BeaconContext = createContext<BeaconContextValue>({
  hasActiveBeacons: false,
  activeBeaconCount: 0,
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const prevCountRef = useRef<number>(0);

  const {
    location,
    permissionDenied: locationPermissionDenied,
    requestLocation,
    showLocationDeniedAlert,
  } = useLocation();

  // Keep a ref so the polling callback always has the latest location
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const fetchCount = useCallback(async () => {
    try {
      let url = `${API_URL}/beacon_count.php`;
      const loc = locationRef.current;
      if (loc) {
        url += `?lat=${loc.latitude}&lng=${loc.longitude}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') {
        const newCount = data.count;
        // Play chime when a new beacon goes live (count increases from 0, or new beacon appears)
        if (newCount > prevCountRef.current && prevCountRef.current >= 0) {
          playBeaconChime();
        }
        prevCountRef.current = newCount;
        setActiveBeaconCount(newCount);
      }
    } catch {
      // Silently fail — don't disrupt the app for a badge count
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    fetchCount();
    pollingRef.current = setInterval(fetchCount, POLL_INTERVAL);
  }, [fetchCount]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    startPolling();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // Refresh location when app comes back to foreground
        requestLocation();
        startPolling();
      } else if (nextState.match(/inactive|background/)) {
        stopPolling();
      }
      appStateRef.current = nextState;
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [startPolling, stopPolling]);

  return (
    <BeaconContext.Provider value={{
      hasActiveBeacons: activeBeaconCount > 0,
      activeBeaconCount,
      location,
      locationPermissionDenied,
      requestLocation,
      showLocationDeniedAlert,
    }}>
      {children}
    </BeaconContext.Provider>
  );
}
