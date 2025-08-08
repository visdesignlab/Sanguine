import { sum, mean } from 'd3';
import {
  AGGREGATION_OPTIONS,
  BLOOD_COMPONENT_OPTIONS,
  DashboardAggYAxisVar,
  DashboardChartConfig,
  DashboardStatConfig,
  dashboardYAxisOptions,
  dashboardYAxisVars,
  GUIDELINE_ADHERENCE_OPTIONS,
  OUTCOME_OPTIONS,
  OVERALL_GUIDELINE_ADHERENCE,
  PROPHYL_MED_OPTIONS,
  TIME_CONSTANTS,
  TimeAggregation,
  TimePeriod,
} from '../Types/application';
import { Visit } from '../Types/database';
import { safeParseDate } from './store';
import { type RootStore } from '../Store/Store';

/**
 * Format stat values appropriately based on the variable type
 * @param yAxisVar - The dashboard variable being formatted
 * @param value - The numeric value to format
 * @param aggregation - The aggregation type ('sum' or 'avg')
 * @returns A formatted string for display
 */
export function formatStatValue(yAxisVar: typeof dashboardYAxisVars[number], value: number, aggregation?: keyof typeof AGGREGATION_OPTIONS): string {
  // Find the option that matches this variable
  const yAxisOption = dashboardYAxisOptions.find((opt) => opt.value === yAxisVar);

  if (!yAxisOption || !('unit' in yAxisOption)) {
    console.warn(`No unit found for variable: ${yAxisVar}`);
    return value.toFixed(0);
  }

  const { unit } = yAxisOption;
  // Check if this is an adherence metric
  const isAdherence = GUIDELINE_ADHERENCE_OPTIONS.some((opt) => opt.value === yAxisVar);
  // Determine if we should show decimals
  const showDecimals = aggregation === 'avg' || isAdherence;

  // Special formatting based on unit type
  switch (unit) {
    case '%':
      // Adherence percentages should show decimals
      return `${(value * 100).toFixed(1)}%`;
    default:
      // Units, cases, ml - averages show decimals, totals don't
      return `${value.toFixed(showDecimals ? 1 : 0)} ${unit}`;
  }
}

/**
 * Generate a stat title based on the variable and aggregation type
 */
export function generateStatTitle(statVar: DashboardStatConfig['var'], aggregation: keyof typeof AGGREGATION_OPTIONS): string {
  const yAxisOption = dashboardYAxisOptions.find((opt) => opt.value === statVar);
  const label = yAxisOption?.label || statVar;
  // Check if this is a blood component with units using the typed options
  const bloodComponentOption = BLOOD_COMPONENT_OPTIONS.find((opt) => opt.value === statVar);
  const hasUnits = bloodComponentOption && bloodComponentOption.unit === 'units';

  if (aggregation === 'avg') {
    if (statVar === 'los') {
      return 'Average Length of Stay';
    }
    if (hasUnits) {
      return `Average ${label} Per Visit`;
    }
    return `Average ${label}`;
  }

  // For sums, use "Total" prefix
  return `Total ${label}`;
}

/**
 * Determines if a percentage change is "good" based on the metric type
 * @param metricVar - The dashboard variable being measured
 * @param diffPercent - The percentage change (positive or negative)
 * @returns true if the change is considered good, false if bad
 */
export function isMetricChangeGood(metricVar: typeof dashboardYAxisVars[number], diffPercent: number): boolean {
// Blood components and outcomes - lower is better (negative change is good)
  const isBloodComponent = BLOOD_COMPONENT_OPTIONS.some((opt) => opt.value === metricVar);
  const isOutcome = OUTCOME_OPTIONS.some((opt) => opt.value === metricVar);

  // Guideline adherence and prophylactic medications - higher is better (positive change is good)
  const isAdherence = GUIDELINE_ADHERENCE_OPTIONS.some((opt) => opt.value === metricVar);
  const isOverallAdherence = metricVar === OVERALL_GUIDELINE_ADHERENCE.value;
  const isProphylMed = PROPHYL_MED_OPTIONS.some((opt) => opt.value === metricVar);

  if (isBloodComponent || isOutcome) {
  // For blood components and outcomes, negative change is good
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

/**
   * @param yAxisVar Variable to use for the chart (e.g. 'rbc_units')
   * @param aggregation Aggregation type ('sum' or 'avg')
   * @returns Chart title based on yAxis variable and aggregation type
   */
export function generateChartTitle(yAxisVar: DashboardChartConfig['yAxisVar'], aggregation: keyof typeof AGGREGATION_OPTIONS): string {
  const option = dashboardYAxisOptions.find((opt) => opt.value === yAxisVar);
  const label = option?.label || yAxisVar;

  const aggregationText = aggregation.charAt(0).toUpperCase() + aggregation.slice(1);
  const ofText = aggregation === 'sum' ? ' of' : '';
  const perVisitText = aggregation === 'avg' ? ' Per Visit' : '';

  return `${aggregationText}${ofText} ${label}${perVisitText}`;
}

/**
   * Calculate pre-surgery time periods (2 days before each surgery)
   */
export function getPreSurgeryTimePeriods(visit: Visit): [number, number][] {
  return visit.surgeries.map((surgery) => {
    try {
      const surgeryStart = safeParseDate(surgery.surgery_start_dtm);
      return [surgeryStart.getTime() - TIME_CONSTANTS.TWO_DAYS_MS, surgeryStart.getTime()];
    } catch (error) {
      console.warn('Invalid surgery_start_dtm:', surgery.surgery_start_dtm, error);
      return [0, 0];
    }
  });
}

/**
 * Aggregate visit y-axis variables data for the dashboard
 * (E.g. rbc_units -> sum_rbc_units, avg_rbc_units, etc.)
 * Aggregates by each y-axis aggregation type (sum, avg)
*/
export function aggregateYAxisVisitVars(visits: RootStore['allVisits']) {
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
  } catch (error) {
    console.error('Error aggregating time period data:', error);
  }

  return aggregations;
}
