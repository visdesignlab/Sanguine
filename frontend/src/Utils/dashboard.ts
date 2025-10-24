import {
  dashboardYAxisVars, BLOOD_COMPONENT_OPTIONS, OUTCOME_OPTIONS, COST_OPTIONS, OVERALL_BLOOD_PRODUCT_COST, GUIDELINE_ADHERENT_OPTIONS, OVERALL_GUIDELINE_ADHERENT, PROPHYL_MED_OPTIONS,
  AGGREGATION_OPTIONS,
  dashboardYAxisOptions,
  providerXAxisVars,
  providerXAxisOptions,
} from '../Types/application';

/**
 * Format stat values appropriately based on the variable type
 * @param variable - The dashboard variable being formatted
 * @param value - The numeric value to format
 * @param aggregation - The aggregation type ('sum' or 'avg')
 * @param fullUnits - Whether to include units in the formatted string (default: true)
 * @returns A formatted string for display
 */
export function formatValueForDisplay(
  variable: typeof dashboardYAxisVars[number] | typeof providerXAxisVars[number],
  value: number,
  aggregation: keyof typeof AGGREGATION_OPTIONS,
  fullUnits?: boolean,
): string {
  // Show units by default unless specified otherwise
  const showFullUnits = fullUnits !== undefined ? fullUnits : true;

  // All options (both dashboard and provider)
  const allOptions = [...dashboardYAxisOptions, ...providerXAxisOptions];

  // Y-Axis variable object
  const variableType = allOptions.find((opt) => opt.value === variable);
  if (!variableType) {
    console.warn(`Invalid variable: ${variable} is not present in dashboardYAxisOptions`);
    return value.toString();
  }

  // Units for display
  const unit = variableType?.units?.[aggregation] ?? '';

  // Return early if single provider count
  if (value === 1 && unit === 'Providers') {
    return '1 Provider';
  }

  // Decimal count
  const { decimals: yAxisDecimals } = variableType;
  const decimalCount = typeof yAxisDecimals === 'number'
    ? yAxisDecimals
    : (yAxisDecimals && yAxisDecimals[aggregation]) ?? 0;

  // Format with thousands separator for large numbers
  const formatWithCommas = (num: number, decimals: number) => num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // Format millions as "X.XXXM" (no space before M)
  const formatMillions = (num: number, decimals: number) => {
    const millions = num / 1_000_000;
    return `${millions.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}M`;
  };

  let displayValue: string;
  const isPercent = unit.startsWith('%');
  const isDollar = unit.startsWith('$');
  const rawValue = isPercent ? value * 100 : value;

  // First, check for millions
  if (Math.abs(rawValue) >= 1_000_000) {
    displayValue = formatMillions(rawValue, 2);
  } else if (Number.isInteger(rawValue)) {
    displayValue = formatWithCommas(rawValue, 0);
  } else {
    displayValue = formatWithCommas(rawValue, decimalCount);
  }

  // Compose final string
  if (isDollar) {
    return `${unit}${displayValue}`;
  }
  if (isPercent) {
    return showFullUnits ? `${displayValue}${unit}` : `${displayValue}%`;
  }
  return showFullUnits ? `${displayValue} ${unit}`.trim() : displayValue;
}

/**
 * Determines if a percentage change is "good" based on the metric type
 * @param metricVar - The dashboard variable being measured
 * @param diffPercent - The percentage change (positive or negative)
 * @returns true if the change is considered good, false if bad
 */
export function isMetricChangeGood(metricVar: typeof dashboardYAxisVars[number], diffPercent: number): boolean {
  // Blood components, outcomes, and cost - lower is better (negative change is good)
  const isBloodComponent = BLOOD_COMPONENT_OPTIONS.some((opt) => opt.value === metricVar);
  const isOutcome = OUTCOME_OPTIONS.some((opt) => opt.value === metricVar);
  const isCost = [...COST_OPTIONS, OVERALL_BLOOD_PRODUCT_COST].some((opt) => opt.value === metricVar);

  // Guideline adherence and prophylactic medications - higher is better (positive change is good)
  const isAdherence = GUIDELINE_ADHERENT_OPTIONS.some((opt) => opt.value === metricVar);
  const isOverallAdherence = metricVar === OVERALL_GUIDELINE_ADHERENT.value;
  const isProphylMed = PROPHYL_MED_OPTIONS.some((opt) => opt.value === metricVar);

  if (isBloodComponent || isOutcome || isCost) {
  // For blood components and outcomes and costs, negative change is good
    return diffPercent < 0;
  }

  if (isAdherence || isOverallAdherence || isProphylMed) {
  // For adherence (including overall) and prophylactic medications, positive change is good
    return diffPercent > 0;
  }

  // Default fallback - log warning for unclassified metrics
  console.warn(`Unclassified metric: ${metricVar}`);
  return diffPercent >= 0;
}
