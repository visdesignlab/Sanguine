import { makeAutoObservable } from 'mobx';
import { rollup } from 'd3';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';

import {
  TIME_CONSTANTS, // Time constants
  AGGREGATION_OPTIONS, // Dashboard configuration
  dashboardYAxisVars,
  type DashboardChartConfig,
  type DashboardStatConfig,
  DashboardChartData, DashboardStatData,
  TimeAggregation,
  dashboardXAxisVars,
  type DashboardAggYAxisVar,
  dashboardYAxisOptions,
  COST_OPTIONS, // Dashboard data types
} from '../Types/application';
import {
  aggregateVisitsBySumAvg,
  compareTimePeriods, formatValueForDisplay, getTimePeriodFromDate,
} from '../Utils/dashboard';

/**
 * DashboardStore manages the state of the PBM dashboard: stats, layouts, and chart data.
 */
export class DashboardStore {
  _rootStore: RootStore;

  // Initialize store with the root store
  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;
    makeAutoObservable(this);
  }

  // Chart settings ------------------------------------------------------------

  // Chart Layouts
  _chartLayouts: { [key: string]: Layout[] } = {
    main: [
      {
        i: '0', x: 0, y: 0, w: 2, h: 1, maxH: 2,
      },
      {
        i: '1', x: 0, y: 1, w: 1, h: 1, maxH: 2,
      },
      {
        i: '2', x: 1, y: 1, w: 1, h: 1, maxH: 2,
      },
      {
        i: '3', x: 0, y: 2, w: 2, h: 1, maxH: 2,
      },
      {
        i: '4', x: 0, y: 2, w: 2, h: 1, maxH: 2,
      },
    ],
  };

  get chartLayouts() {
    return this._chartLayouts;
  }

  set chartLayouts(input: { [key: string]: Layout[] }) {
    this._chartLayouts = input;
  }

  // Chart configurations
  _chartConfigs: DashboardChartConfig[] = [
    {
      chartId: '0', xAxisVar: 'quarter', yAxisVar: 'rbc_units', aggregation: 'sum',
    },
    {
      chartId: '1', xAxisVar: 'quarter', yAxisVar: 'rbc_adherence', aggregation: 'avg',
    },
    {
      chartId: '2', xAxisVar: 'quarter', yAxisVar: 'los', aggregation: 'avg',
    },
    {
      chartId: '3', xAxisVar: 'quarter', yAxisVar: 'iron', aggregation: 'avg',
    },
    {
      chartId: '4', xAxisVar: 'quarter', yAxisVar: 'total_blood_product_costs', aggregation: 'sum', chartType: 'bar',
    },
  ];

  get chartConfigs() {
    return this._chartConfigs;
  }

  set chartConfigs(input: DashboardChartConfig[]) {
    this._chartConfigs = input;
  }

  // Stats settings ------------------------------------------------------------
  // Stat configurations
  _statConfigs: DashboardStatConfig[] = [
    {
      statId: '1', var: 'overall_adherence', aggregation: 'avg', title: 'Overall Guideline Adherence',
    },
    {
      statId: '2', var: 'los', aggregation: 'avg', title: 'Average Length of Stay',
    },
    {
      statId: '3', var: 'ffp_units', aggregation: 'sum', title: 'Total Plasma Transfused',
    },
  ];

  get statConfigs() {
    return this._statConfigs;
  }

  set statConfigs(input: DashboardStatConfig[]) {
    this._statConfigs = input;
  }

  // Chart management ----------------------------------------------------------
  /**
   * Initializes the dashboard with default chart configurations.
   */
  setChartConfig(chartId: string, input: DashboardChartConfig) {
    this._chartConfigs = this._chartConfigs.map((config) => {
      if (config.chartId === chartId) {
        return { ...config, ...input };
      }
      return config;
    });
  }

  /**
   * Removes chart from the dashboard by ID.
   */
  removeChart(chartId: string) {
    this._chartConfigs = this._chartConfigs.filter((config) => config.chartId !== chartId);
    this._chartLayouts.main = this._chartLayouts.main.filter((layout) => layout.i !== chartId);
    this._chartLayouts.sm = this._chartLayouts.sm.filter((layout) => layout.i !== chartId);
  }

  /**
   * Adds new chart to the top of the dashboard
   * @param config Chart data specification for chart to add
   */
  addChart(config: DashboardChartConfig) {
    // Chart data - Add chart config to beginning of array ----
    this._chartConfigs = [config, ...this._chartConfigs];

    // Layouts - create a new layout object ----
    const newMainLayouts = this._chartLayouts.main.map((layout) => ({
      ...layout,
      y: layout.y + 1,
    }));

    // Add new chart layout at the top (full width)
    newMainLayouts.unshift({
      i: config.chartId,
      x: 0,
      y: 0,
      w: 2, // Full width (2 columns)
      h: 1,
      maxH: 2,
    });

    // Also handle sm breakpoint if it exists
    const newSmLayouts = this._chartLayouts.sm ? this._chartLayouts.sm.map((layout) => ({
      ...layout,
      y: layout.y + 1,
    })) : [];

    if (this._chartLayouts.sm) {
      newSmLayouts.unshift({
        i: config.chartId,
        x: 0,
        y: 0,
        w: 1, // Full width for small (1 column)
        h: 1,
        maxH: 2,
      });
    }

    // Replace the entire layouts object
    this._chartLayouts = {
      ...this._chartLayouts,
      main: newMainLayouts,
      ...(this._chartLayouts.sm && { sm: newSmLayouts }),
    };
  }

  // Stat management -----------------------------------------------------------
  /**
   * @param statVar Variable to use for the stat (e.g. 'total_adherence')
   * @param aggregation Aggregation method to use (e.g. 'avg', 'sum')
   * @description Adds new stat to dashboard with a generated title.
   */
  addStat(statVar: DashboardStatConfig['var'], aggregation: DashboardStatConfig['aggregation']) {
  // Generate unique ID and title internally
    const statId = `stat-${Date.now()}`;
    const opt = dashboardYAxisOptions.find((o) => o.value === statVar);
    const title = opt?.label?.[aggregation || 'sum'] || statVar;

    const fullStatConfig: DashboardStatConfig = {
      statId,
      var: statVar,
      aggregation,
      title,
    };

    // Add the stat
    this._statConfigs = [...this._statConfigs, fullStatConfig];
  }

  /**
   * Remove stat from dashboard by ID
   */
  removeStat(statId: string) {
    this._statConfigs = this._statConfigs.filter((config) => config.statId !== statId);
  }

  // Dashboard data ----------------------------------------------------------------
  /**
   * Returns all possible chart data needed for the dashboard.
   * Optimized to avoid redundant mapping/filtering/aggregation.
   */
  get chartData() {
    const result = {} as DashboardChartData;

    // --- Add the timePeriod (E.g month) for all visits ---
    const timePeriodMap: Record<TimeAggregation, Array<{ [key: string]: any }>> = {} as any;
    dashboardXAxisVars.forEach((xAxisVar) => {
      const timeAggregation = xAxisVar as TimeAggregation;
      timePeriodMap[timeAggregation] = this._rootStore.allVisits
        .map((visit) => ({
          ...visit,
          timePeriod: getTimePeriodFromDate(visit.dischargeDate, timeAggregation),
        }))
        .filter((visit) => visit.timePeriod !== null);
    });

    // --- Calculate data for every possible chart (aggregation, yAxisVar, xAxisVar) combination ---
    // For each aggregation option (e.g. sum, avg)...
    Object.keys(AGGREGATION_OPTIONS).forEach((aggregation) => {
      const aggType = aggregation as keyof typeof AGGREGATION_OPTIONS;
      // For each xAxisVar (e.g. quarter, month)...
      dashboardXAxisVars.forEach((xAxisVar) => {
        const timeAggregation = xAxisVar as TimeAggregation;
        const visitsWithPeriod = timePeriodMap[timeAggregation];

        // --- Special handling for Blood Product Costs stacked bar ---
        if (dashboardYAxisVars.includes('total_blood_product_costs')) {
          const aggVar: DashboardAggYAxisVar = `${aggType}_total_blood_product_costs`;
          const aggregatedData = rollup(
            visitsWithPeriod,
            (visits) => {
              const obj: Record<string, number> = {};
              COST_OPTIONS.forEach(({ value: costVar }) => {
                obj[costVar] = aggType === 'sum'
                  ? visits.reduce((acc, v) => acc + (v[costVar] || 0), 0)
                  : visits.length > 0
                    ? visits.reduce((acc, v) => acc + (v[costVar] || 0), 0) / visits.length
                    : 0;
              });
              return obj;
            },
            (d) => d.timePeriod,
          );
          const chartDatum = Array.from(aggregatedData.entries())
            .map(([timePeriod, data]) => ({
              timePeriod: timePeriod!,
              ...data,
            }))
            .sort((a, b) => compareTimePeriods(a.timePeriod, b.timePeriod));
          result[`${aggVar}_${xAxisVar}`] = chartDatum;
        }

        // --- Aggregate all other yAxisVars by time period, sum, and avg ---
        const aggregatedData = rollup(
          visitsWithPeriod,
          (visits) => aggregateVisitsBySumAvg(visits),
          (d) => d.timePeriod,
        );

        // For each yAxisVar (e.g. rbc_units, guideline_adherence)...
        dashboardYAxisVars.forEach((yAxisVar) => {
          if (yAxisVar === 'total_blood_product_costs') return; // Already handled above
          const aggVar: DashboardAggYAxisVar = `${aggType}_${yAxisVar}`;
          // Format the aggregated data into chart format: (timePeriod, data)
          const chartDatum = Array.from(aggregatedData.entries())
            .map(([timePeriod, aggregations]) => ({
              timePeriod: timePeriod!,
              data: aggregations[aggVar] || 0,
            }))
            .sort((a, b) => compareTimePeriods(a.timePeriod, b.timePeriod));

          // Log filtered data for debugging
          if (chartDatum.length === 0) {
            console.warn(`No data after filtering for xAxisVar "${xAxisVar}" and aggVar "${aggVar}"`);
          }

          // Return result (E.g. Key: "sum_rbc_units_quarter", Value: chartDatum)
          const compositeKey = `${aggVar}_${xAxisVar}` as keyof DashboardChartData;
          result[compositeKey] = chartDatum;
        });
      });
    });

    return result;
  }

  /**
   * Returns all stat chart data needed for the dashboard.
   * Optimized to avoid redundant filtering and aggregation.
   */
  get statData() {
    // --- Find the current period (last 30 days) for the stats ---
    const latestDate = new Date(Math.max(...this._rootStore.allVisits.map((v) => v.dischargeDate.getTime())));

    // Calculate current period (last 30 days)
    const currentPeriodStart = new Date(latestDate.getTime() - (30 * TIME_CONSTANTS.ONE_DAY_MS));

    // Find most recent full month that doesn't overlap with 30-day window
    const currentPeriodStartMonth = currentPeriodStart.getMonth();
    const currentPeriodStartYear = currentPeriodStart.getFullYear();

    // --- Find comparison period (closest non-overlapping calendar month) for the stats ---
    let comparisonMonth = currentPeriodStartMonth - 1;
    let comparisonYear = currentPeriodStartYear;
    if (comparisonMonth < 0) {
      comparisonMonth = 11; // December
      comparisonYear -= 1;
    }
    const comparisonPeriodStart = new Date(comparisonYear, comparisonMonth, 1);
    const comparisonPeriodEnd = new Date(comparisonYear, comparisonMonth + 1, 0, 23, 59, 59, 999);
    const comparisonMonthName = comparisonPeriodStart.toLocaleDateString('en-US', { month: 'short' });

    // --- Sparkline Data - Find intermediate periods between current and comparison periods ---
    const intermediatePeriodNumber = 4;
    const sparklineStart = comparisonPeriodStart < currentPeriodStart ? comparisonPeriodStart : currentPeriodStart;
    const sparklineEnd = latestDate;
    const intervalMs = Math.floor((sparklineEnd.getTime() - sparklineStart.getTime()) / intermediatePeriodNumber);

    // Calculate sparkline periods
    const sparklinePeriods: Array<{ start: Date, end: Date }> = [];
    for (let i = 0; i < intermediatePeriodNumber; i += 1) {
      const periodStart = new Date(sparklineStart.getTime() + i * intervalMs);
      const periodEnd = new Date(periodStart.getTime() + intervalMs - 1);
      sparklinePeriods.push({ start: periodStart, end: periodEnd });
    }

    // --- Find visits from each time period (current, comparison, sparkline periods) ---
    const currentPeriodVisits: typeof this._rootStore.allVisits = [];
    const comparisonPeriodVisits: typeof this._rootStore.allVisits = [];
    const sparklineVisits: typeof this._rootStore.allVisits[] = Array(intermediatePeriodNumber).fill(null).map(() => []);

    for (const v of this._rootStore.allVisits) {
      const t = v.dischargeDate.getTime();
      if (t >= currentPeriodStart.getTime() && t <= latestDate.getTime()) {
        currentPeriodVisits.push(v);
      }
      if (t >= comparisonPeriodStart.getTime() && t <= comparisonPeriodEnd.getTime()) {
        comparisonPeriodVisits.push(v);
      }
      for (let i = 0; i < intermediatePeriodNumber; i += 1) {
        if (t >= sparklinePeriods[i].start.getTime() && t <= sparklinePeriods[i].end.getTime()) {
          sparklineVisits[i].push(v);
        }
      }
    }

    // --- For each period of visits, aggregate by sum and average ---
    const currentPeriodData = aggregateVisitsBySumAvg(currentPeriodVisits);
    const comparisonPeriodData = aggregateVisitsBySumAvg(comparisonPeriodVisits);
    const sparklinePeriodData = sparklineVisits.map((visits) => aggregateVisitsBySumAvg(visits));

    // --- Return data for every possible stat (aggregation, yAxisVar) combination ---
    const result = {} as DashboardStatData;
    // For each aggregation option (e.g. sum, avg)...
    Object.keys(AGGREGATION_OPTIONS).forEach((aggregation) => {
      const aggType = aggregation as keyof typeof AGGREGATION_OPTIONS;
      // For each yAxisVar (e.g. rbc_units, guideline_adherence)...
      dashboardYAxisVars.forEach((yAxisVar) => {
        const key = `${aggType}_${yAxisVar}` as DashboardAggYAxisVar;
        // Calculate percentage change (diff)
        const currentValue = currentPeriodData[key] || 0;
        const comparisonValue = comparisonPeriodData[key] || 0;
        const diff = comparisonValue === 0
          ? (currentValue > 0 ? 100 : 0)
          : ((currentValue - comparisonValue) / comparisonValue) * 100;

        // Format the stat value (E.g. "Overall Guideline Adherence")
        const formattedValue = formatValueForDisplay(yAxisVar, currentValue, aggType);

        // Sparkline calculation
        const sparklineData: number[] = sparklinePeriodData.map((periodData) => (periodData[key] || 0) ** 2);

        // Return result
        result[key] = {
          value: formattedValue, // E.g. "85 Units"
          diff: Math.round(diff), // E.g. 20 (percentage change)
          comparedTo: comparisonMonthName || '', // E.g. "Jan"
          sparklineData, // E.g. [80, 90, 85, 95]
        };
      });
    });

    return result;
  }
}
