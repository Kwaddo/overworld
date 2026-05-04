import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

const SETUP_KEY = 'setup_complete';

// Module-level so all hook instances share the same resolved state.
let resolved: boolean | null = null;
const listeners = new Set<(v: boolean) => void>();

const broadcast = (v: boolean) => {
  resolved = v;
  for (const l of listeners) l(v);
};

export const useFirstLaunch = () => {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(resolved);

  useEffect(() => {
    const listener = (v: boolean) => setIsFirstLaunch(v);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (resolved !== null) return;
    SecureStore.getItemAsync(SETUP_KEY).then((value) => {
      broadcast(value === null);
    });
  }, []);

  const markComplete = useCallback(async () => {
    await SecureStore.setItemAsync(SETUP_KEY, '1');
    broadcast(false);
  }, []);

  return { isFirstLaunch, markComplete };
};
