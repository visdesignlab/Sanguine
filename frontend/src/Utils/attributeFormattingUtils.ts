import {
  BLOOD_COMPONENTS,
  OUTCOMES,
  PROPHYL_MEDS,
  GUIDELINE_ADHERENT,
  LAB_RESULTS,
  COSTS,
  TIME_AGGREGATION_OPTIONS,
} from '../Types/application';

// Helper to get readable names
export const getReadableName = (key: string): string => {
  // Handle date fields specifically
  if (key === 'dateFrom') return 'Date From';
  if (key === 'dateTo') return 'Date To';

  // Check Time Aggregations
  const timeAgg = TIME_AGGREGATION_OPTIONS[key as keyof typeof TIME_AGGREGATION_OPTIONS];
  if (timeAgg) return timeAgg.label;

  // Search in all attributes that have a 'value' and 'label.base' or 'label'
  const attributes = [
    BLOOD_COMPONENTS,
    OUTCOMES,
    PROPHYL_MEDS,
    Object.values(GUIDELINE_ADHERENT),
    LAB_RESULTS,
    Object.values(COSTS),
  ];

  interface AttributeItem {
    value: string;
    label: string | { base: string };
  }

  let result: string | undefined;
  attributes.forEach((attribute) => {
    const found = (attribute as unknown as AttributeItem[]).find((c) => c.value === key);
    if (found && !result) {
      // @ts-expect-error - label might be string or object
      result = found.label.base || found.label;
    }
  });

  // Fallback to formatting the key
  return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

// Helper to format values
export const formatValue = (
  value:
    | string
    | number
    | boolean
    | Date
    | (number | string)[]
    | null
    | undefined,
): string => {
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === 'number') {
      return `${value[0]} - ${value[1]}`;
    }
    return value.join(', ');
  }
  if (value === null || value === undefined) {
    return 'None';
  }
  return String(value);
};
