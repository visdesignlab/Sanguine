import { sum, mean } from 'd3';
import {
  IconCoin, IconDropletHalf2Filled, IconMedicineSyrup, IconShieldHeart, IconTestPipe2,
} from '@tabler/icons-react';
import {
  AGGREGATION_OPTIONS,
  BLOOD_COMPONENT_OPTIONS,
  DashboardAggYAxisVar,
  dashboardYAxisOptions,
  dashboardYAxisVars,
  GUIDELINE_ADHERENCE_OPTIONS,
  OUTCOME_OPTIONS,
  OVERALL_GUIDELINE_ADHERENCE,
  PROPHYL_MED_OPTIONS,
  TimeAggregation,
  TimePeriod,
  COST_OPTIONS,
  OVERALL_BLOOD_PRODUCT_COST,
  Year,
  Month,
  Quarter,
  ANTIFIBRINOLYTIC_USED,
} from '../Types/application';
import type { Visit } from '../Store/Store';

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
    displayValue = formatMillions(rawValue, 3);
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
  const isAdherence = GUIDELINE_ADHERENCE_OPTIONS.some((opt) => opt.value === metricVar);
  const isOverallAdherence = metricVar === OVERALL_GUIDELINE_ADHERENCE.value;
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

/**
 * Calculate time period string from a date based on aggregation type
 */
export function getTimePeriodFromDate(date: Date, aggregation: 'month'): Month | null;
export function getTimePeriodFromDate(date: Date, aggregation: 'quarter'): Quarter | null
export function getTimePeriodFromDate(date: Date, aggregation: 'year'): Year | null;
export function getTimePeriodFromDate(date: Date, aggregation: TimeAggregation): TimePeriod | null {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    console.error('Invalid date for time period calculation:', date);
    return null;
  }

  const year = date.getFullYear();

  switch (aggregation) {
    case 'quarter': {
      const quarter = Math.floor(date.getMonth() / 3) + 1 as 1 | 2 | 3 | 4;
      return `${year}-Q${quarter}`;
    }
    case 'month': {
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      return `${year}-${monthName}`;
    }
    case 'year': {
      return `${year}`;
    }
    default:
      console.error('Unknown time aggregation type:', aggregation);
      return null;
  }
}

/**
 * Compare two time periods for sorting
 */
export function compareTimePeriods(a: TimePeriod, b: TimePeriod): number {
  // Extract year from both periods
  const yearA = parseInt(a.split('-')[0], 10);
  const yearB = parseInt(b.split('-')[0], 10);

  if (yearA !== yearB) {
    return yearA - yearB;
  }

  // If same year, compare based on type
  if (a.includes('Q') && b.includes('Q')) {
    // Quarter comparison
    const quarterA = parseInt(a.split('Q')[1], 10);
    const quarterB = parseInt(b.split('Q')[1], 10);
    return quarterA - quarterB;
  }

  if (a.includes('-') && b.includes('-') && !a.includes('Q') && !b.includes('Q')) {
    // Month comparison
    const monthA = a.split('-')[1];
    const monthB = b.split('-')[1];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.indexOf(monthA) - months.indexOf(monthB);
  }

  // Year only - already compared above
  return 0;
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

  const adherence = GUIDELINE_ADHERENCE_OPTIONS.find((opt) => opt.value === varName);
  if (adherence) return icons.adherence;
  if (adherence || varName === OVERALL_GUIDELINE_ADHERENCE.value) return icons.adherence;

  const outcome = OUTCOME_OPTIONS.find((opt) => opt.value === varName);
  if (outcome) return icons.outcome;

  const prophylMed = PROPHYL_MED_OPTIONS.find((opt) => opt.value === varName);
  if (prophylMed) return icons.prophylMed;

  // Default icon
  return icons.bloodComponent;
}

/**
 * Aggregate visit y-axis variables data for the dashboard
 * (E.g. rbc_units -> sum_rbc_units, avg_rbc_units, etc.)
 * Aggregates by each y-axis aggregation type (sum, avg)
*/
export function aggregateVisitsBySumAvg(visits: Visit[]) {
  const aggregations: Record<DashboardAggYAxisVar, number> = {} as Record<DashboardAggYAxisVar, number>;

  try {
    // Aggregate Blood components, Outcomes, Prophylactic Meds by sum and average
    [BLOOD_COMPONENT_OPTIONS, OUTCOME_OPTIONS, PROPHYL_MED_OPTIONS].forEach((options) => {
      options.forEach(({ value }) => {
        const sumKey: DashboardAggYAxisVar = `sum_${value}`;
        const avgKey: DashboardAggYAxisVar = `avg_${value}`;

        aggregations[sumKey] = sum(visits, (d) => d[value as keyof typeof d] as number || 0);
        aggregations[avgKey] = mean(visits, (d) => d[value as keyof typeof d] as number || 0) || 0;
      });
    });

    // Aggregate Antifibrinolytic use by sum and average
    const antifibVar = ANTIFIBRINOLYTIC_USED.value;
    const antifibSumKey: DashboardAggYAxisVar = `sum_${antifibVar}`;
    const antifibAggKey: DashboardAggYAxisVar = `avg_${antifibVar}`;

    aggregations[antifibSumKey] = sum(visits, (d) => d[antifibVar as keyof typeof d] as number || 0);
    aggregations[antifibAggKey] = mean(visits, (d) => d[antifibVar as keyof typeof d] as number || 0) || 0;

    // Aggregate Guideline Adherence by sum and average
    GUIDELINE_ADHERENCE_OPTIONS.forEach(({ value, adherentCount, totalTransfused }) => {
      const totalAdherent = visits.reduce((acc, d) => acc + (d[adherentCount] || 0), 0);
      const totalTransfusions = visits.reduce((acc, d) => acc + (d[totalTransfused] || 0), 0);

      const sumKey: DashboardAggYAxisVar = `sum_${value}`;
      const avgKey: DashboardAggYAxisVar = `avg_${value}`;

      aggregations[sumKey] = totalAdherent;
      aggregations[avgKey] = totalTransfusions > 0 ? totalAdherent / totalTransfusions : 0;
    });

    // Aggregate Overall Guideline Adherence by sum and average
    const { value, adherentCount, totalTransfused } = OVERALL_GUIDELINE_ADHERENCE;

    const totalAdherent = visits.reduce((acc, d) => acc + (d[adherentCount] || 0), 0);
    const totalTransfusions = visits.reduce((acc, d) => acc + (d[totalTransfused] || 0), 0);

    const sumKey: DashboardAggYAxisVar = `sum_${value}`;
    const avgKey: DashboardAggYAxisVar = `avg_${value}`;

    aggregations[sumKey] = totalAdherent;
    aggregations[avgKey] = totalTransfusions > 0 ? totalAdherent / totalTransfusions : 0;

    // Aggregate cost per blood product by sum and average
    COST_OPTIONS.forEach(({ value: costVar }) => {
      const costSumKey: DashboardAggYAxisVar = `sum_${costVar}`;
      const costAvgKey: DashboardAggYAxisVar = `avg_${costVar}`;
      // Each visit has cost fields like rbc_cost, ffp_cost, etc.
      aggregations[costSumKey] = sum(visits, (d) => d[costVar as keyof typeof d] as number || 0);
      aggregations[costAvgKey] = mean(visits, (d) => d[costVar as keyof typeof d] as number || 0) || 0;
    });

    // Aggregate overall blood product cost (total)
    const totalCostKey = OVERALL_BLOOD_PRODUCT_COST.value as keyof typeof visits[0];
    aggregations[`sum_${totalCostKey}` as DashboardAggYAxisVar] = sum(visits, (v) => v[totalCostKey] as number || 0);
    aggregations[`avg_${totalCostKey}` as DashboardAggYAxisVar] = mean(visits, (v) => v[totalCostKey] as number || 0) || 0;
  } catch (error) {
    console.error('Error aggregating time period data:', error);
  }

  return aggregations;
}
