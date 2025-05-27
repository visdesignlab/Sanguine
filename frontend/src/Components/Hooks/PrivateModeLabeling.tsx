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
    // If the attribute is not a provider, return the label as is.
    if (!attribute.includes('PROV_ID')) {
      return String(label);
    }

    // If private mode is enabled, return the provider id.
    if (store.configStore.privateMode) {
      const labelStr = String(label);

      // If the label is an id, find the corresponding provider name.
      const id = Object.entries(store.providerMapping)
        .find(([_, value]) => value === labelStr);

      // if we found one, return it, otherwise return the label itself
      return id?.[0] ?? labelStr;
    }

    // If private mode is disabled, return the provider name.
    const name = store.providerMapping[label];
    return name ?? String(label);
  }, [store.configStore.privateMode, store.providerMapping]);
}
