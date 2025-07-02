import { useContext, useCallback } from 'react';
import { parseFullName } from 'parse-full-name';
import Store from '../../Interfaces/Store';

/**
 * Transforms a label based on the given attribute and private mode settings.
 *
 * @param label - The label to be transformed (string or number).
 * @param attribute - The attribute associated with the label.
 * @param normalizeProvNames - If truthy, skip normalizing provider names.
 * @returns The transformed label.
 */
export function usePrivateProvLabel(): (label: string | number, attribute: string, normalizeProvNames?: boolean) => string {
  const store = useContext(Store);

  // Normalizes provider names by parsing full names and formatting them
  const normalizeProviderLabel = (label: string): string => {
    const name = parseFullName(label, undefined, true);
    let normalizedLabel = label;
    // If 'doctor', replace with 'Dr.'
    (['title', 'first', 'last'] as const).forEach((part) => {
      if (name[part] && name[part]!.toLowerCase() === 'doctor') {
        name[part] = 'Dr.';
      }
    });

    // If there's a title and last name, use "Title Last"
    if (name.last && name.title) {
      normalizedLabel = `${name.title} ${name.last}`;
    } else if (name.first && name.last) {
      // If there's a first and last name, use "Last, First"
      normalizedLabel = `${name.last}, ${name.first}`;
    } else if (name.last) {
      normalizedLabel = name.last;
    }
    return normalizedLabel;
  };

  // Main function to get the label based on private mode and attribute
  return useCallback((
    label: string | number,
    attribute: string,
    normalizeProvNames: boolean = true,
  ): string => {
    // Is this label is a provider
    const isProv = attribute.includes('PROV_ID');
    let outputLabel = String(label);

    // If the label is a provider
    if (isProv) {
      // If in private mode, map the name to a provider ID. If no ID found, return label as is.
      if (store.configStore.privateMode) {
        const found = Object.entries(store.providerMapping)
          .find(([, value]) => value === outputLabel);
        outputLabel = found?.[0] ?? outputLabel;
      } else {
        // If not private mode, map the provider ID to a name. If no name found, return label as is.
        outputLabel = store.providerMapping[outputLabel] ?? outputLabel;
        // Normalize provider names, if requested
        if (normalizeProvNames) {
          outputLabel = normalizeProviderLabel(outputLabel);
        }
      }
    }

    // Truncate the label if requested.
    return outputLabel;
  }, [store.configStore.privateMode, store.providerMapping]);
}
