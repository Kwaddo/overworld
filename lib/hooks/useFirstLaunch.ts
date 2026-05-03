import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

const SETUP_KEY = 'setup_complete';

export const useFirstLaunch = () => {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(SETUP_KEY).then((value) => {
      setIsFirstLaunch(value === null);
    });
  }, []);

  const markComplete = useCallback(async () => {
    await SecureStore.setItemAsync(SETUP_KEY, '1');
    setIsFirstLaunch(false);
  }, []);

  return { isFirstLaunch, markComplete };
};
