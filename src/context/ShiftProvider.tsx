import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchLocations } from '@/lib/api';
import type { Location } from '@/types/db';

const STORAGE_KEY = 'vbh.shift.location';

interface ShiftContextValue {
  locations: Location[];
  /** De locatie waar deze vrijwilliger vandaag staat. */
  location: Location | null;
  setLocation: (id: string) => void;
  ready: boolean;
}

const ShiftContext = createContext<ShiftContextValue | null>(null);

/**
 * Een vrijwilliger draait niet altijd op dezelfde plek. De gekozen locatie
 * blijft bewaard, zodat de app na een herstart meteen het juiste dorpshuis
 * toont in plaats van opnieuw te vragen.
 */
export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [list, stored] = await Promise.all([
        fetchLocations(),
        AsyncStorage.getItem(STORAGE_KEY).catch(() => null),
      ]);
      if (cancelled) return;
      setLocations(list);
      setLocationId(stored ?? list[0]?.id ?? null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocation = useCallback((id: string) => {
    setLocationId(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => undefined);
  }, []);

  const value = useMemo<ShiftContextValue>(
    () => ({
      locations,
      location: locations.find((item) => item.id === locationId) ?? null,
      setLocation,
      ready,
    }),
    [locations, locationId, setLocation, ready],
  );

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift(): ShiftContextValue {
  const context = useContext(ShiftContext);
  if (!context) throw new Error('useShift moet binnen ShiftProvider gebruikt worden');
  return context;
}
