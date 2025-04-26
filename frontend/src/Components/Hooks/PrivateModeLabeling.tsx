import { useContext, useCallback } from 'react';
import Store from '../../Interfaces/Store';

export function usePrivateProvName(): (input: string | number) => string {
  const store = useContext(Store);
  return useCallback((input: string | number): string => {
    if (!store.configStore.privateMode) {
      const name = store.providerMappping[Number(input)] as string;
      return name ? `${name.charAt(0)}${name.slice(1).toLowerCase()}` : String(input);
    }
    return String(input);
  }, [store.configStore.privateMode, store.providerMappping]);
}
