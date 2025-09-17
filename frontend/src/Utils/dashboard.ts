import {
  IconDropletHalf2Filled, IconTestPipe2, IconShieldHeart, IconMedicineSyrup, IconCoin,
} from '@tabler/icons-react';
import {
  dashboardYAxisVars, BLOOD_COMPONENT_OPTIONS, OUTCOME_OPTIONS, COST_OPTIONS, OVERALL_BLOOD_PRODUCT_COST, GUIDELINE_ADHERENT_OPTIONS, OVERALL_GUIDELINE_ADHERENT, PROPHYL_MED_OPTIONS,
  AGGREGATION_OPTIONS,
  dashboardYAxisOptions,
} from '../Types/application';

/**
 * Format stat values appropriately based on the variable type
 * @param yAxisVar - The dashboard variable being formatted
 * @param value - The numeric value to format
 * @param aggregation - The aggregation type ('sum' or 'avg')
 * @param fullUnits - Whether to include units in the formatted string (default: true)
 * @returns A formatted string for display
 */
export function formatValueForDisplay(
  yAxisVar: typeof dashboardYAxisVars[number],
  value: number,
  aggregation: keyof typeof AGGREGATION_OPTIONS,
  fullUnits?: boolean,
): string {
  // Show units by default unless specified otherwise
  const showFullUnits = fullUnits !== undefined ? fullUnits : true;

  // Y-Axis variable object
  const yAxisOption = dashboardYAxisOptions.find((opt) => opt.value === yAxisVar);
  if (!yAxisOption) {
    console.warn(`Invalid yAxisVar: ${yAxisVar} is not present in dashboardYAxisOptions`);
    return value.toString();
  }

  // Units for display
  const unit = yAxisOption?.units?.[aggregation] ?? '';

  // Decimal count
  const { decimals: yAxisDecimals } = yAxisOption;
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

// Icon mapping to variable type
export const icons = {
  bloodComponent: IconDropletHalf2Filled,
  adherence: IconTestPipe2,
  outcome: IconShieldHeart,
  prophylMed: IconMedicineSyrup,
  costSavings: IconCoin,
};

/**
 * @param varName Variable name to get the icon for
 * @returns Icon based on the variable type
 */
export function getIconForVar(varName: typeof dashboardYAxisVars[number]) {
  // E.g. If blood component, return blood component icon
  const bloodComponent = BLOOD_COMPONENT_OPTIONS.find((opt) => opt.value === varName);
  if (bloodComponent) return icons.bloodComponent;

  const adherence = GUIDELINE_ADHERENT_OPTIONS.find((opt) => opt.value === varName);
  if (adherence) return icons.adherence;
  if (adherence || varName === OVERALL_GUIDELINE_ADHERENT.value) return icons.adherence;

  const outcome = OUTCOME_OPTIONS.find((opt) => opt.value === varName);
  if (outcome) return icons.outcome;

  const prophylMed = PROPHYL_MED_OPTIONS.find((opt) => opt.value === varName);
  if (prophylMed) return icons.prophylMed;

  // Default icon
  return icons.bloodComponent;
}
