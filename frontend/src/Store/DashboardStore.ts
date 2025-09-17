import { makeAutoObservable, observable } from 'mobx';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';

import {
  AGGREGATION_OPTIONS, // Dashboard configuration
  type DashboardChartConfig,
  type DashboardStatConfig,
  DashboardChartData,
  TimeAggregation,
  dashboardXAxisVars,
  type DashboardAggYAxisVar,
  dashboardYAxisOptions,
  TimePeriod,
  DashboardStatData,
  Cost, // Dashboard data types
} from '../Types/application';
import { compareTimePeriods } from '../Utils/dates';
import { formatValueForDisplay } from '../Utils/dashboard';

/**
 * DashboardStore manages the state of the PBM dashboard: stats, layouts, and chart data.
 */
export class DashboardStore {
  _rootStore: RootStore;

  // Initialize store with the root store
  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;
    makeAutoObservable(this, { chartData: observable.ref });
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
    ],
  };

  get chartLayouts() {
    return this._chartLayouts;
  }

  set chartLayouts(input: { [key: string]: Layout[] }) {
    this._chartLayouts = input;
  }

  // Chart configurations by default
  _chartConfigs: DashboardChartConfig[] = [
    {
      chartId: '0', xAxisVar: 'month', yAxisVar: 'rbc_units', aggregation: 'sum', chartType: 'line',
    },
    {
      chartId: '1', xAxisVar: 'quarter', yAxisVar: 'los', aggregation: 'avg', chartType: 'line',
    },
    {
      chartId: '2', xAxisVar: 'quarter', yAxisVar: 'total_blood_product_cost', aggregation: 'sum', chartType: 'bar',
    },
  ];

  get chartConfigs() {
    return this._chartConfigs;
  }

  set chartConfigs(input: DashboardChartConfig[]) {
    this._chartConfigs = input;
  }

  // Stats settings ------------------------------------------------------------
  // Stat configurations by default
  _statConfigs: DashboardStatConfig[] = [
    {
      statId: '1', yAxisVar: 'rbc_units', aggregation: 'avg', title: 'Average RBCs Transfused Per Visit',
    },
    {
      statId: '2', yAxisVar: 'plt_units', aggregation: 'avg', title: 'Average Platelets Transfused Per Visit',
    },
    {
      statId: '3', yAxisVar: 'cell_saver_ml', aggregation: 'sum', title: 'Total Cell Salvage Volume (ml) Used',
    },
    {
      statId: '4', yAxisVar: 'total_blood_product_cost', aggregation: 'sum', title: 'Total Blood Product Costs',
    },
    {
      statId: '5', yAxisVar: 'rbc_adherent', aggregation: 'avg', title: 'Guideline Adherent RBC Transfusions',
    },
    {
      statId: '6', yAxisVar: 'plt_adherent', aggregation: 'avg', title: 'Guideline Adherent Platelet Transfusions',
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
    const refreshData = input.yAxisVar !== this._chartConfigs.find((c) => c.chartId === chartId)?.yAxisVar;

    this._chartConfigs = this._chartConfigs.map((config) => {
      if (config.chartId === chartId) {
        return { ...config, ...input };
      }
      return config;
    });

    if (refreshData) {
      this.computeChartData();
    }
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
    this.computeChartData();
  }

  // Stat management -----------------------------------------------------------
  /**
   * @param statVar Variable to use for the stat (e.g. 'total_adherent')
   * @param aggregation Aggregation method to use (e.g. 'avg', 'sum')
   * @description Adds new stat to dashboard with a generated title.
   */
  addStat(statVar: DashboardStatConfig['yAxisVar'], aggregation: DashboardStatConfig['aggregation']) {
  // Generate unique ID and title internally
    const statId = `stat-${Date.now()}`;
    const opt = dashboardYAxisOptions.find((o) => o.value === statVar);
    const title = opt?.label?.[aggregation || 'sum'] || statVar;

    const fullStatConfig: DashboardStatConfig = {
      statId,
      yAxisVar: statVar,
      aggregation,
      title,
    };

    // Add the stat
    this._statConfigs = [...this._statConfigs, fullStatConfig];
    this.computeStatData();
  }

  /**
   * Remove stat from dashboard by ID
   */
  removeStat(statId: string) {
    this._statConfigs = this._statConfigs.filter((config) => config.statId !== statId);
  }

  // Dashboard data ----------------------------------------------------------------
  chartData: DashboardChartData = {} as DashboardChartData;

  statData: DashboardStatData = {} as DashboardStatData;

  async computeChartData() {
    if (!this._rootStore.duckDB) return;

    const result = {} as DashboardChartData;

    // Dynamically build the query to ensure all current charts are included
    const selectClauses = this._chartConfigs.flatMap(({ yAxisVar }) => (
      // For every aggregation option
      Object.keys(AGGREGATION_OPTIONS).map((aggregation) => {
        const aggFn = aggregation.toUpperCase();
        return yAxisVar === 'total_blood_product_cost'
          ? [
            `${aggFn}(rbc_units_cost) AS ${aggregation}_rbc_units_cost`,
            `${aggFn}(plt_units_cost) AS ${aggregation}_plt_units_cost`,
            `${aggFn}(ffp_units_cost) AS ${aggregation}_ffp_units_cost`,
            `${aggFn}(cryo_units_cost) AS ${aggregation}_cryo_units_cost`,
            `${aggFn}(cell_saver_cost) AS ${aggregation}_cell_saver_cost`,
          ]
          : `${aggFn}(${yAxisVar}) AS ${aggregation}_${yAxisVar}`;
      })
    ));
    const query = `
      SELECT 
        month,
        quarter,
        year,
        ${selectClauses.join(',\n')}
      FROM filteredVisits
      GROUP BY month, quarter, year
      ORDER BY year, quarter, month;
    `;
    const queryResult = await this._rootStore.duckDB.query(query);
    const rows = queryResult.toArray().map((row) => row.toJSON());

    // For each xAxisVar (e.g. quarter, month)...
    dashboardXAxisVars.forEach((xAxisVar) => {
      const timeAggregation = xAxisVar as TimeAggregation;
      this.chartConfigs.forEach(({ yAxisVar }) => {
        Object.keys(AGGREGATION_OPTIONS).forEach((aggregation) => {
          const aggType = aggregation as keyof typeof AGGREGATION_OPTIONS;
          const aggVar: DashboardAggYAxisVar = `${aggType}_${yAxisVar}`;
          // Format the aggregated data into chart format: (timePeriod, data)
          const chartDatum = rows
            .map((row) => {
              if (yAxisVar === 'total_blood_product_cost') {
                return {
                  timePeriod: row[timeAggregation] as TimePeriod,
                  data: {
                    rbc_units_cost: Number(row[`${aggType}_rbc_units_cost`] || 0),
                    plt_units_cost: Number(row[`${aggType}_plt_units_cost`] || 0),
                    ffp_units_cost: Number(row[`${aggType}_ffp_units_cost`] || 0),
                    cryo_units_cost: Number(row[`${aggType}_cryo_units_cost`] || 0),
                    cell_saver_cost: Number(row[`${aggType}_cell_saver_cost`] || 0),
                  },
                };
              }
              return {
                timePeriod: row[timeAggregation] as TimePeriod,
                data: Number(row[aggVar] || 0),
              };
            })
            // Filter out entries with null/undefined timePeriod or NaN data
            .filter((entry) => entry.timePeriod !== null && entry.timePeriod !== undefined && !Number.isNaN(entry.data))
            // Combine entries with the same timePeriod by summing their data values
            .reduce((acc, curr) => {
              // Combine entries with the same timePeriod by summing their data values
              const existing = acc.find((item) => item.timePeriod === curr.timePeriod);
              if (existing) {
                if (typeof existing.data === 'object' && typeof curr.data === 'object') {
                  // Sum each cost component separately
                  existing.data = {
                    rbc_units_cost: existing.data.rbc_units_cost + curr.data.rbc_units_cost,
                    plt_units_cost: existing.data.plt_units_cost + curr.data.plt_units_cost,
                    ffp_units_cost: existing.data.ffp_units_cost + curr.data.ffp_units_cost,
                    cryo_units_cost: existing.data.cryo_units_cost + curr.data.cryo_units_cost,
                    cell_saver_cost: existing.data.cell_saver_cost + curr.data.cell_saver_cost,
                  };
                } else {
                  (existing.data as number) += curr.data as number;
                }
              } else {
                acc.push(curr);
              }
              return acc;
            }, [] as { timePeriod: TimePeriod; data: number | Record<Cost, number> }[])
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

    this.chartData = result;
  }

  async computeStatData() {
    if (!this._rootStore.duckDB) return;

    const result = {} as DashboardStatData;

    const latestDateQuery = 'SELECT MAX(dsch_dtm) as latest_date FROM filteredVisits';
    const latestDateResult = await this._rootStore.duckDB.query(latestDateQuery);
    const latestDateRow = latestDateResult.toArray()[0];
    const latestDate = new Date(latestDateRow.latest_date as string);

    // Calculate current period (last 30 days)
    const currentPeriodStart = new Date(latestDate.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Find most recent full month that doesn't overlap with 30-day window
    const currentPeriodStartMonth = currentPeriodStart.getMonth();
    const currentPeriodStartYear = currentPeriodStart.getFullYear();

    let comparisonMonth = currentPeriodStartMonth - 1;
    let comparisonYear = currentPeriodStartYear;
    if (comparisonMonth < 0) {
      comparisonMonth = 11; // December
      comparisonYear -= 1;
    }
    const comparisonPeriodStart = new Date(comparisonYear, comparisonMonth, 1);
    const comparisonPeriodEnd = new Date(comparisonYear, comparisonMonth + 1, 0, 23, 59, 59, 999);
    const comparisonMonthName = comparisonPeriodStart.toLocaleDateString('en-US', { month: 'short' });

    // --- Main stats query ----
    // Return the current and comparison values for all stat configs
    const statSelects = this.statConfigs.map(({ yAxisVar, aggregation }) => {
      const aggFn = aggregation.toUpperCase();
      // Special handling for total_blood_product_cost
      if (yAxisVar === 'total_blood_product_cost') {
        return `
              ${aggFn}(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}'
                THEN rbc_units_cost + plt_units_cost + ffp_units_cost + cryo_units_cost + cell_saver_cost ELSE NULL END) AS total_blood_product_cost_current_${aggregation},
              ${aggFn}(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}'
                THEN rbc_units_cost + plt_units_cost + ffp_units_cost + cryo_units_cost + cell_saver_cost ELSE NULL END) AS total_blood_product_cost_comparison_${aggregation}
            `;
      }
      // Otherwise, return the cases in the current periods and cases in comparison periods
      return `
            ${aggFn}(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}'
              THEN ${yAxisVar} ELSE NULL END) AS ${yAxisVar}_current_${aggregation},
            ${aggFn}(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}'
              THEN ${yAxisVar} ELSE NULL END) AS ${yAxisVar}_comparison_${aggregation}
          `;
    }).join(',\n');

    const mainStatsQuery = `
    SELECT
      ${statSelects}
      FROM filteredVisits
      WHERE dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}';
    `;

    const mainStatsResult = await this._rootStore.duckDB!.query(mainStatsQuery);
    const statRow = mainStatsResult.toArray()[0];

    // --- Sparkline query (all variables, all aggs, all months) ---
    // Get the last 6 months as YYYY-mmm
    const sparklineMonths: string[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(latestDate.getFullYear(), latestDate.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthShort = d.toLocaleString('en-US', { month: 'short' });
      sparklineMonths.push(`${year}-${monthShort}`);
    }

    const sparklineSelects: string[] = [];
    this.statConfigs.forEach(({ yAxisVar, aggregation }) => {
      const aggFn = aggregation.toUpperCase();
      if (yAxisVar === 'total_blood_product_cost') {
        sparklineSelects.push(
          `${aggFn}(rbc_units_cost + plt_units_cost + ffp_units_cost + cryo_units_cost + cell_saver_cost) AS ${aggregation}_total_blood_product_cost`,
        );
        return;
      }
      sparklineSelects.push(
        `${aggFn}(${yAxisVar}) AS ${aggregation}_${yAxisVar}`,
      );
    });

    const sparklineQuery = `
    SELECT
      month,
      ${sparklineSelects.join(',\n')}
    FROM filteredVisits
    WHERE month IN (${sparklineMonths.map((m) => `'${m}'`).join(', ')})
    GROUP BY month
    ORDER BY month;
  `;
    const sparklineResult = await this._rootStore.duckDB!.query(sparklineQuery);
    const sparklineRows = sparklineResult.toArray().map((row) => row.toJSON());

    // Now fill the result object as before, but using the combined statRow and sparklineRows
    this.statConfigs.forEach(({ yAxisVar, aggregation }) => {
      const aggType = aggregation as keyof typeof AGGREGATION_OPTIONS;
      const key = `${aggType}_${yAxisVar}` as DashboardAggYAxisVar;

      const currentValue = aggType === 'sum'
        ? Number(statRow[`${yAxisVar}_current_sum`])
        : Number(statRow[`${yAxisVar}_current_avg`]);
      const comparisonValue = aggType === 'sum'
        ? Number(statRow[`${yAxisVar}_comparison_sum`])
        : Number(statRow[`${yAxisVar}_comparison_avg`]);

      // Calculate percentage change (diff)
      const diff = comparisonValue === 0
        ? (currentValue > 0 ? 100 : 0)
        : ((currentValue - comparisonValue) / comparisonValue) * 100;

      // Format the stat value (E.g. "Overall Guideline Adherence")
      let formattedValue = formatValueForDisplay(yAxisVar, currentValue, aggType);

      // For adherence variables, don't include full units
      if (yAxisVar.includes('adherent')) {
        formattedValue = formatValueForDisplay(yAxisVar, currentValue, aggType, false);
      }

      // Sparkline data for this variable/agg, in month order
      const sparklineData = sparklineMonths.map((month) => {
        const row = sparklineRows.find((r) => r.month === month);
        return row ? Number(row[`${aggregation}_${yAxisVar}`]) || 0 : 0;
      });

      // Store in result
      result[key] = {
        value: formattedValue,
        diff: Math.round(diff),
        comparedTo: comparisonMonthName,
        sparklineData,
      };
    });

    this.statData = result;
  }
}
