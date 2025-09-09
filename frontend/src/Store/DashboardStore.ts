import { makeAutoObservable, observable } from 'mobx';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';

import {
  AGGREGATION_OPTIONS, // Dashboard configuration
  dashboardYAxisVars,
  type DashboardChartConfig,
  type DashboardStatConfig,
  DashboardChartData,
  TimeAggregation,
  dashboardXAxisVars,
  type DashboardAggYAxisVar,
  dashboardYAxisOptions,
  TimePeriod,
  DashboardStatData, // Dashboard data types
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
      chartId: '2', xAxisVar: 'quarter', yAxisVar: 'rbc_units_cost', aggregation: 'sum', chartType: 'bar',
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
      statId: '1', var: 'rbc_units', aggregation: 'avg', title: 'Average RBCs Transfused Per Visit',
    },
    {
      statId: '2', var: 'plt_units', aggregation: 'avg', title: 'Average Platelets Transfused Per Visit',
    },
    {
      statId: '3', var: 'cell_saver_ml', aggregation: 'sum', title: 'Total Cell Salvage Volume (ml) Used',
    },
    // {
    //   statId: '4', var: 'total_blood_product_costs', aggregation: 'sum', title: 'Total Blood Product Costs',
    // },
    // {
    //   statId: '5', var: 'rbc_adherent', aggregation: 'avg', title: 'Guideline Adherent RBC Transfusions',
    // },
    // {
    //   statId: '6', var: 'plt_adherent', aggregation: 'avg', title: 'Guideline Adherent Platelet Transfusions',
    // },
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
   * @param statVar Variable to use for the stat (e.g. 'total_adherent')
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
  chartData: DashboardChartData = {};

  statData: DashboardStatData = {} as DashboardStatData;

  async computeChartData() {
    if (!this._rootStore.duckDB) return;

    console.time('Chart data computation time');
    const result = {} as DashboardChartData;

    // --- Calculate data for every possible chart (aggregation, yAxisVar, xAxisVar) combination ---
    // For each aggregation option (e.g. sum, avg)...
    // Write one query that gets all data at once
    const query = `
      SELECT 
        month,
        quarter,
        year,

        SUM(rbc_units) AS sum_rbc_units,
        AVG(rbc_units) AS avg_rbc_units,
        SUM(plt_units) AS sum_plt_units,
        AVG(plt_units) AS avg_plt_units,
        SUM(ffp_units) AS sum_ffp_units,
        AVG(ffp_units) AS avg_ffp_units,
        SUM(cryo_units) AS sum_cryo_units,
        AVG(cryo_units) AS avg_cryo_units,
        SUM(whole_units) AS sum_whole_units,
        AVG(whole_units) AS avg_whole_units,
        SUM(cell_saver_ml) AS sum_cell_saver_ml,
        AVG(cell_saver_ml) AS avg_cell_saver_ml,

        SUM(los) AS sum_los,
        AVG(los) AS avg_los,
        SUM(death) aS sum_death,
        AVG(death) AS avg_death,
        SUM(vent) AS sum_vent,
        AVG(vent) AS avg_vent,
        SUM(stroke) AS sum_stroke,
        AVG(stroke) AS avg_stroke,
        SUM(ecmo) AS sum_ecmo,
        AVG(ecmo) AS avg_ecmo,
        
        SUM(b12) AS sum_b12,
        AVG(b12) AS avg_b12,
        SUM(iron) AS sum_iron,
        AVG(iron) AS avg_iron,
        SUM(antifibrinolytic) AS sum_antifibrinolytic,
        AVG(antifibrinolytic) AS avg_antifibrinolytic,
        
        sum(rbc_units_cost) as sum_rbc_units_cost,
        avg(rbc_units_cost) as avg_rbc_units_cost,
        sum(plt_units_cost) as sum_plt_units_cost,
        avg(plt_units_cost) as avg_plt_units_cost,
        sum(ffp_units_cost) as sum_ffp_units_cost,
        avg(ffp_units_cost) as avg_ffp_units_cost,
        sum(cryo_units_cost) as sum_cryo_units_cost,
        avg(cryo_units_cost) as avg_cryo_units_cost,
        sum(cell_saver_ml_cost) as sum_cell_saver_ml_cost,
        avg(cell_saver_ml_cost) as avg_cell_saver_ml_cost,
        -- sum(whole_cost) as sum_whole_units_cost,
        -- avg(whole_cost) as avg_whole_units_cost,

        
      FROM filteredVisits
      GROUP BY month, quarter, year
      ORDER BY year, quarter, month;
    `;
    const queryResult = await this._rootStore.duckDB.query(query);
    const rows = queryResult.toArray().map((row) => row.toJSON());

    // For each xAxisVar (e.g. quarter, month)...
    dashboardXAxisVars.forEach((xAxisVar) => {
      const timeAggregation = xAxisVar as TimeAggregation;
      // For each aggregation option (e.g. sum, avg)...
      Object.keys(AGGREGATION_OPTIONS).forEach((aggregation) => {
        const aggType = aggregation as keyof typeof AGGREGATION_OPTIONS;
        // For each yAxisVar (e.g. rbc_units, GUIDELINE_ADHERENT)...
        dashboardYAxisVars.forEach((yAxisVar) => {
          if (yAxisVar === 'total_blood_product_costs') return; // Skip for now

          const aggVar: DashboardAggYAxisVar = `${aggType}_${yAxisVar}`;
          // Format the aggregated data into chart format: (timePeriod, data)
          const chartDatum = rows
            .map((row) => ({
              timePeriod: row[timeAggregation] as TimePeriod,
              data: Number(row[aggVar] || 0),
            }))
            .reduce((acc, curr) => {
              // Combine entries with the same timePeriod by summing their data values
              const existing = acc.find((item) => item.timePeriod === curr.timePeriod);
              if (existing) {
                existing.data += curr.data;
              } else {
                acc.push(curr);
              }
              return acc;
            }, [] as { timePeriod: TimePeriod; data: number }[])
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
    console.timeEnd('Chart data computation time');
  }

  async computeStatData() {
    if (!this._rootStore.duckDB) return;

    console.time('Stat data computation time');
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

    await Promise.all(
      dashboardYAxisVars.map(async (yAxisVar) => {
      // Query to get current period and comparison period values
        const statQuery = `
        SELECT
        SUM(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}' THEN filteredVisits.${yAxisVar} ELSE 0 END) AS current_sum,
        AVG(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}' THEN filteredVisits.${yAxisVar} ELSE NULL END) AS current_avg,
        SUM(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}' THEN filteredVisits.${yAxisVar} ELSE 0 END) AS comparison_sum,
        AVG(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}' THEN filteredVisits.${yAxisVar} ELSE NULL END) AS comparison_avg
        FROM filteredVisits;
      `;

        // Execute the query
        try {
          const statResult = await this._rootStore.duckDB!.query(statQuery);
          const statRow = statResult.toArray()[0];

          await Promise.all(Object.keys(AGGREGATION_OPTIONS).map(async (aggregation) => {
            const aggType = aggregation as keyof typeof AGGREGATION_OPTIONS;
            const key = `${aggType}_${yAxisVar}` as DashboardAggYAxisVar;

            const currentValue = aggType === 'sum' ? Number(statRow.current_sum) : Number(statRow.current_avg);
            const comparisonValue = aggType === 'sum' ? Number(statRow.comparison_sum) : Number(statRow.comparison_avg);

            // Calculate percentage change (diff)
            const diff = comparisonValue === 0
              ? (currentValue > 0 ? 100 : 0)
              : ((currentValue - comparisonValue) / comparisonValue) * 100;

            // Format the stat value (E.g. "Overall Guideline Adherence")
            let formattedValue = formatValueForDisplay(yAxisVar, currentValue, aggType);

            // For adherence variables, don't include full units
            if (yAxisVar.includes('adherence')) {
              formattedValue = formatValueForDisplay(yAxisVar, currentValue, aggType, false);
            }
            // Query to get sparkline data for the past 6 months
            const sparklineQuery = `
              SELECT
              month,
              ${aggType.toUpperCase()}(${yAxisVar}) AS total
              FROM filteredVisits
              WHERE dsch_dtm >= '${new Date(latestDate.getFullYear(), latestDate.getMonth() - 5, 1).toISOString()}'
              AND dsch_dtm <= '${latestDate.toISOString()}'
              GROUP BY month
              ORDER BY month;
            `;
            const sparklineResult = await this._rootStore.duckDB!.query(sparklineQuery);
            const sparklineRows = sparklineResult.toArray().map((row) => row.toJSON());
            const sparklineData = sparklineRows.map((row) => Number(row.total) || 0);

            // Store in result
            result[key] = {
              value: formattedValue,
              diff: Math.round(diff),
              comparedTo: comparisonMonthName,
              sparklineData,
            };
          }));
        } catch (error) {
          console.error(`Error computing stat for ${yAxisVar}:`, error);
        }
      }),
    );

    this.statData = result;
    console.timeEnd('Stat data computation time');
  }
}
