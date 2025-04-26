import { useContext } from 'react';
import Store from '../../Interfaces/Store';

// Finds the provider name based on the input and the private mode setting.
export function usePrivateProvName(input: string | number): string {
  const store = useContext(Store);
  if (!store.configStore.privateMode) {
    const name = store.providerMappping[Number(input)] as string;
    return name ? `${name.slice(0, 1)}${name.slice(1).toLowerCase()}` : String(input);
  }
  return String(input);
}
