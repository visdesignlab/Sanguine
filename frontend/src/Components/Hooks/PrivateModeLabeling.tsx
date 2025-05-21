import { useContext, useCallback } from 'react';
import Store from '../../Interfaces/Store';

/**
 * Transforms a label based on the given attribute and private mode settings.
 *
 * @param label - The label to be transformed (string or number).
 * @param attribute - The attribute associated with the label.
 * @returns The transformed label. If private mode is enabled, provider names are not revealed.
 */
export function usePrivateProvLabel(): (label: string | number, attribute: string) => string {
  const store = useContext(Store);

  // Convert the label to a provider name or id depending on private mode setting.
  return useCallback((label: string | number, attribute: string): string => {
    // If getting provider label, get the provider name if private mode is disabled.
    if (!store.configStore.privateMode && attribute.includes('PROV_ID')) {
      const name = store.providerMapping[label] as string;
      return name ? `${name.charAt(0)}${name.slice(1).toLowerCase()}` : String(label);
    }
    return String(label);
  }, [store.configStore.privateMode, store.providerMapping]);
}
