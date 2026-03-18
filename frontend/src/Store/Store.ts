// region Imports
import {
  makeAutoObservable, reaction, runInAction, observable, computed, createAtom, type IAtom,
} from 'mobx';
import { createContext } from 'react';
import { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import { initProvenance, Provenance, NodeID } from '@visdesignlab/trrack';
import { Layout } from 'react-grid-layout';
// @ts-expect-error: rgl utils not typed
import { compact } from 'react-grid-layout/build/utils';

import {
  AGGREGATION_OPTIONS,
  Cost,
  DashboardAggYAxisVar,
  DashboardChartConfig,
  DashboardChartData,
  DashboardStatConfig,
  DashboardStatData,
  ExploreChartConfig,
  ExploreChartData,
  ExploreTableConfig,
  ExploreTableRow,
  ProcedureHierarchyResponse,
  TimeAggregation,
  TimePeriod,
  dashboardXAxisVars,
  dashboardYAxisOptions,
  DEFAULT_UNIT_COSTS,
  ProviderChart,
  ProviderChartConfig,
  ProviderChartData,
  providerXAxisOptions,
} from '../Types/application';
import { compareTimePeriods, safeParseDate } from '../Utils/dates';
import { formatValueForDisplay } from '../Utils/dashboard';
import { expandTimePeriod } from '../Utils/expandTimePeriod';
import { HistogramData } from '../Types/database';
import {
  BLOOD_PRODUCTS_ARRAY,
  BloodComponent,
  CELL_SAVER_ML, PLT_UNITS, RBC_UNITS,
} from '../Types/bloodProducts';

export const MANUAL_INFINITY = Number.MAX_SAFE_INTEGER;

export const DEFAULT_CHART_LAYOUTS: { [key: string]: Layout[] } = {
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

export const DEFAULT_CHART_CONFIGS: DashboardChartConfig[] = [
  {
    chartId: '0', xAxisVar: 'month', yAxisVar: RBC_UNITS, aggregation: 'sum', chartType: 'line',
  },
  {
    chartId: '1', xAxisVar: 'quarter', yAxisVar: 'los', aggregation: 'avg', chartType: 'line',
  },
  {
    chartId: '2', xAxisVar: 'quarter', yAxisVar: 'total_blood_product_cost', aggregation: 'sum', chartType: 'bar',
  },
];

export const DEFAULT_STAT_CONFIGS: DashboardStatConfig[] = [
  {
    statId: '1', yAxisVar: RBC_UNITS, aggregation: 'avg', title: 'Average RBCs Transfused Per Visit',
  },
  {
    statId: '2', yAxisVar: PLT_UNITS, aggregation: 'avg', title: 'Average Platelets Transfused Per Visit',
  },
  {
    statId: '3', yAxisVar: CELL_SAVER_ML, aggregation: 'sum', title: 'Total Cell Salvage Volume (ml) Used',
  },
  {
    statId: '4', yAxisVar: 'total_blood_product_cost', aggregation: 'sum', title: 'Total Blood Product Costs',
  },
  {
    statId: '5', yAxisVar: 'rbc_units_adherent', aggregation: 'avg', title: 'Percentage of RBC Units Transfused According to Guidelines',
  },
  {
    statId: '6', yAxisVar: 'plt_units_adherent', aggregation: 'avg', title: 'Percentage of Platelet Units Transfused According to Guidelines',
  },
];

// endregion

// region Types
export interface ApplicationState {
  filterValues: {
    dateFrom: string; // Store dates as strings in Trrack
    dateTo: string;
    rbc_units: [number, number];
    ffp_units: [number, number];
    plt_units: [number, number];
    cryo_units: [number, number];
    cell_saver_ml: [number, number];
    b12: boolean | null;
    iron: boolean | null;
    antifibrinolytic: boolean | null;
    los: [number, number];
    death: boolean | null;
    vent: boolean | null;
    stroke: boolean | null;
    ecmo: boolean | null;
    departmentIds: string[];
    procedureIds: string[];
  };
  selections: {
    selectedTimePeriods: string[];
  };
  dashboard: {
    chartConfigs: DashboardChartConfig[];
    statConfigs: DashboardStatConfig[];
    chartLayouts: { [key: string]: Layout[] };
  };
  explore: {
    chartConfigs: ExploreChartConfig[];
    chartLayouts: { [key: string]: Layout[] };
  };
  settings: {
    unitCosts: Record<Cost, number>;
  };
  ui: {
    activeTab: string;
    leftToolbarOpened: boolean;
    activeLeftPanel: number | null;
    selectedVisitNo: number | null;
    filterPanelExpandedItems: string[];
    showFilterHistograms: boolean;
  };
}

// Legacy tab names are still normalized when reading provenance state
// so older saved URLs/states continue to open the correct renamed tabs.
const ACTIVE_TAB_ALIASES: Record<string, string> = {
  Dashboard: 'Hospital',
  Explore: 'Department',
  Providers: 'Provider',
};

const normalizeActiveTab = (activeTab: string) => ACTIVE_TAB_ALIASES[activeTab] || activeTab;

// endregion

/**
 * ProvidersStore manages provider data for the provider view.
 */
export class ProvidersStore {
  _rootStore: RootStore;

  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;
    makeAutoObservable(this);
  }

  providerChartData: ProviderChartData = {};

  providerList: string[] = [];

  _selectedProvider: string | null = null;

  // Number of unique surgeries performed by the selected provider (all time)
  selectedProvSurgCount: number | null = null;

  selectedProvRbcUnits: number | null = null;

  selectedProvCmi: number | null = null;

  averageProvCmi: number | null = null;

  cmiComparisonLabel: string = 'within typical range';

  // Current date range applied for Providers view (nullable = all time)
  dateStart: string | null = null;

  dateEnd: string | null = null;

  earliestDate: string | null = null;

  async findEarliestDate(): Promise<string | null> {
    if (!this._rootStore.duckDB) {
      return null;
    }

    try {
      const query = `
        SELECT MIN(dsch_dtm) AS earliest_date
        FROM filteredVisits
        WHERE dsch_dtm IS NOT NULL;
      `;
      const res = await this._rootStore.duckDB.query(query);
      const rows = res.toArray().map((r: { toJSON: () => Record<string, unknown> }) => r.toJSON());
      const earliestDate = rows[0]?.earliest_date ?? null;
      return earliestDate ? String(earliestDate) : null;
    } catch (e) {
      console.error('Error finding earliest discharge date:', e);
      return null;
    }
  }

  /**
   * Set date range for Providers view and refresh provider-related data.
   */
  setDateRange(startDate: string | null, endDate: string | null) {
    this.dateStart = startDate || null;
    this.dateEnd = endDate || null;

    // Refresh provider view data constrained to this date range
    this.getProviderCharts(this.dateStart, this.dateEnd).catch((e) => {
      console.error('Error refreshing provider charts after date range change:', e);
    });
    this.fetchProviderList(this.dateStart, this.dateEnd).catch((e) => {
      console.error('Error refreshing provider list after date range change:', e);
    });
    // If a selected provider exists, refresh provider-specific stats constrained to date range
    if (this.selectedProvider) {
      this.fetchSelectedProvSurgCount(this.dateStart, this.dateEnd).catch((e) => {
        console.error('Error refreshing surgery count after date range change:', e);
      });
      this.fetchSelectedProvRbcUnits(this.dateStart, this.dateEnd).catch((e) => {
        console.error('Error refreshing RBC units after date range change:', e);
      });
      this.fetchCmiComparison(this.dateStart, this.dateEnd).catch((e) => {
        console.error('Error refreshing CMI comparison after date range change:', e);
      });
    }
  }

  /**
     * Fetch count of unique surgeries for the currently selected provider.
     * If startDate/endDate provided, restrict to that discharge date range.
     * Sets selectedProvSurgCount to 0 when no provider is selected or duckDB missing.
     */
  async fetchSelectedProvSurgCount(startDate?: string | null, endDate?: string | null) {
    if (!this._rootStore.duckDB || !this.selectedProvider) {
      this.selectedProvSurgCount = 0;
      return this.selectedProvSurgCount;
    }

    try {
      // protect single quotes in provider name
      const prov = String(this.selectedProvider).replace(/'/g, "''");

      let dateClause = '';
      if (startDate) dateClause += ` AND dsch_dtm >= DATE '${startDate}'`;
      if (endDate) dateClause += ` AND dsch_dtm <= DATE '${endDate}'`;

      const query = `
        SELECT COUNT(DISTINCT case_id) AS cnt
        FROM filteredSurgeryCases
        WHERE (surgeon_prov_name = '${prov}' OR anesth_prov_name = '${prov}') ${dateClause.replace('dsch_dtm', 'case_date')};
      `;
      const res = await this._rootStore.duckDB.query(query);
      const rows = res.toArray().map((r: { toJSON: () => Record<string, unknown> }) => r.toJSON());
      const cnt = rows[0]?.cnt ?? 0;
      this.selectedProvSurgCount = Number(cnt) || 0;
    } catch (e) {
      console.error('Error fetching selected provider surgery count:', e);
      this.selectedProvSurgCount = 0;
    }

    return this.selectedProvSurgCount;
  }

  async fetchSelectedProvRbcUnits(startDate?: string | null, endDate?: string | null) {
    // If no DB or no selected provider, set to zero and return
    if (!this._rootStore.duckDB || !this.selectedProvider) {
      this.selectedProvRbcUnits = 0;
      return this.selectedProvRbcUnits;
    }

    try {
      const prov = String(this.selectedProvider).replace(/'/g, "''");

      // Build WHERE clause (optionally constrain by discharge date range)
      let dateClause = '';
      if (startDate) {
        // duckdb accepts DATE 'YYYY-MM-DD' or comparable formats
        dateClause += ` AND dsch_dtm >= DATE '${startDate}'`;
      }
      if (endDate) {
        dateClause += ` AND dsch_dtm <= DATE '${endDate}'`;
      }

      const query = `
        SELECT SUM(rbc_units) AS total_rbc
        FROM filteredVisits
        WHERE attending_provider = '${prov}' ${dateClause};
      `;

      const res = await this._rootStore.duckDB.query(query);
      const rows = res.toArray().map((r: { toJSON: () => Record<string, unknown> }) => r.toJSON());

      const total = rows[0]?.total_rbc ?? 0;
      this.selectedProvRbcUnits = Number(total) || 0;
    } catch (e) {
      console.error('Error fetching selected provider RBC units:', e);
      this.selectedProvRbcUnits = 0;
    }

    return this.selectedProvRbcUnits;
  }

  get selectedProvider(): string | null {
    return this._selectedProvider;
  }

  set selectedProvider(val: string | null) {
    if (this._selectedProvider === val) return;
    this._selectedProvider = val;
    // Recompute charts and stats when selected provider changes, respecting current date range
    const s = this.dateStart ?? null;
    const eDate = this.dateEnd ?? null;
    this.getProviderCharts(s, eDate).catch((e) => {
      console.error('Error refreshing provider charts after provider change:', e);
    });
    // Refresh surgery count for the newly selected provider
    this.fetchSelectedProvSurgCount(s, eDate).catch((e) => {
      console.error('Error fetching surgery count after provider change:', e);
    });
    // Refresh RBC units (all time by default) when provider changes
    this.fetchSelectedProvRbcUnits(s, eDate).catch((e) => {
      console.error('Error fetching RBC units after provider change:', e);
    });
    this.fetchCmiComparison(s, eDate).catch((e) => {
      console.error('Error fetching CMI comparison after provider change:', e);
    });
  }

  // Chart configurations by default
  _chartConfigs: ProviderChartConfig[] = [
    {
      chartId: '0', xAxisVar: 'quarter', yAxisVar: 'rbc_units_adherent', aggregation: 'avg', chartType: 'time-series-line', group: 'Anemia Management',
    },
    {
      chartId: '1', xAxisVar: 'ffp_units_adherent', yAxisVar: 'attending_provider', aggregation: 'avg', chartType: 'population-histogram', group: 'Anemia Management',
    },
    {
      chartId: '2', xAxisVar: 'antifibrinolytic', yAxisVar: 'attending_provider', aggregation: 'avg', chartType: 'population-histogram', group: 'Anemia Management',
    },
    {
      chartId: '3', xAxisVar: 'b12', yAxisVar: 'attending_provider', aggregation: 'avg', chartType: 'population-histogram', group: 'Outcomes',
    },
    {
      chartId: '4', xAxisVar: 'quarter', yAxisVar: 'los', aggregation: 'avg', chartType: 'time-series-line', group: 'Outcomes',
    },
    {
      chartId: '5', xAxisVar: 'quarter', yAxisVar: 'rbc_units_cost', aggregation: 'avg', chartType: 'time-series-line', group: 'Costs',
    },
  ];

  get chartConfigs() {
    return this._chartConfigs;
  }

  set chartConfigs(input: ProviderChartConfig[]) {
    this._chartConfigs = input;
  }

  /**
     * Adds new chart
     * @param config Chart data specification for chart to add
     */
  addChart(config: ProviderChartConfig) {
    this._chartConfigs = [config, ...this._chartConfigs];
    this.getProviderCharts(this.dateStart, this.dateEnd);
  }

  /**
   * Removes chart, by ID.
   */
  removeChart(chartId: string) {
    this._chartConfigs = this._chartConfigs.filter((config) => config.chartId !== chartId);
  }

  /**
   * Fetches CMI for all providers (optionally bounded by date range),
   * computes average CMI across providers and selected provider CMI,
   * and sets cmiComparisonLabel based on relative difference.
   */
  async fetchCmiComparison(startDate?: string | null, endDate?: string | null) {
    if (!this._rootStore.duckDB || !this.selectedProvider) {
      this.selectedProvCmi = null;
      this.averageProvCmi = null;
      this.cmiComparisonLabel = 'within typical range';
      return this.cmiComparisonLabel;
    }

    try {
      let dateClause = '';
      if (startDate) dateClause += ` WHERE dsch_dtm >= DATE '${startDate}'`;
      if (endDate) {
        dateClause += `${dateClause ? ' AND' : ' WHERE'} dsch_dtm <= DATE '${endDate}'`;
      }

      const query = `
        SELECT attending_provider, SUM(ms_drg_weight) / COUNT(visit_no) AS cmi
        FROM filteredVisits
        ${dateClause}
        GROUP BY attending_provider;
      `;
      const res = await this._rootStore.duckDB.query(query);
      const rows = res.toArray().map((r: { toJSON: () => Record<string, unknown> }) => r.toJSON());

      const cmiValues = rows
        .map((r) => {
          const v = Number(r.cmi);
          return Number.isFinite(v) ? v : NaN;
        })
        .filter(Number.isFinite);

      if (cmiValues.length === 0) {
        this.selectedProvCmi = null;
        this.averageProvCmi = null;
        this.cmiComparisonLabel = 'within typical range';
        return this.cmiComparisonLabel;
      }

      const avg = cmiValues.reduce((a, b) => a + b, 0) / cmiValues.length;
      this.averageProvCmi = avg;

      const match = rows.find((r) => String(r.attending_provider) === String(this.selectedProvider));
      this.selectedProvCmi = match && match.cmi != null ? Number(match.cmi) : null;

      // relative difference
      const sel = this.selectedProvCmi ?? avg;
      const rel = avg === 0 ? 0 : (sel - avg) / avg;

      // thresholds (tunable)
      let label = 'within typical range';
      if (rel >= 0.15) label = 'much higher than average';
      else if (rel >= 0.07) label = 'higher than average';
      else if (rel >= 0.03) label = 'slightly higher than average';
      else if (rel <= -0.15) label = 'much lower than average';
      else if (rel <= -0.07) label = 'lower than average';
      else if (rel <= -0.03) label = 'slightly lower than average';
      else label = 'within typical range';

      this.cmiComparisonLabel = label;
      return this.cmiComparisonLabel;
    } catch (e) {
      console.error('Error fetching CMI comparison:', e);
      this.selectedProvCmi = null;
      this.averageProvCmi = null;
      this.cmiComparisonLabel = 'within typical range';
      return this.cmiComparisonLabel;
    }
  }

  async fetchProviderList(startDate?: string | null, endDate?: string | null) {
    if (!this._rootStore.duckDB) {
      return [];
    }

    try {
      let dateClause = '';
      if (startDate) dateClause += ` WHERE dsch_dtm >= DATE '${startDate}'`;
      if (endDate) {
        dateClause += `${dateClause ? ' AND' : ' WHERE'} dsch_dtm <= DATE '${endDate}'`;
      }

      const query = `
        SELECT DISTINCT attending_provider
        FROM filteredVisits
        ${dateClause}
        ${dateClause ? ' AND' : ' WHERE'} attending_provider IS NOT NULL
        ORDER BY attending_provider;
        `;
      const res = await this._rootStore.duckDB.query(query);
      const rows = res.toArray().map((r) => r.toJSON());
      this.providerList = rows.map((r) => String(r.attending_provider)).filter((v) => v);

      // If no provider is selected yet, pick the first one so UI has a default
      if (!this.selectedProvider && this.providerList.length > 0) {
        this.selectedProvider = this.providerList[0];
        // ensure surgery count populated for default provider
        this.fetchSelectedProvSurgCount(startDate, endDate).catch((e) => {
          console.error('Error fetching surgery count for default provider:', e);
        });
      }
    } catch (e) {
      console.error('Error fetching provider list:', e);
      this.providerList = [];
    }

    return this.providerList;
  }

  async getProviderCharts(startDate?: string | null, endDate?: string | null) {
    if (!this._rootStore.duckDB) {
      return {};
    }

    try {
      const charts: ProviderChartData = {};

      // --- Prepare date clause used for queries ---
      let dateClause = '';
      if (startDate) dateClause += ` AND dsch_dtm >= DATE '${startDate}'`;
      if (endDate) dateClause += ` AND dsch_dtm <= DATE '${endDate}'`;

      // Create histogram charts ----------------------
      // --- Build charts query ---
      const histConfigs = this._chartConfigs.filter((cfg) => cfg.chartType === 'population-histogram');
      const selectClauses = histConfigs.flatMap(({ xAxisVar }) => (
        Object.keys(AGGREGATION_OPTIONS).flatMap((aggregation) => {
          const aggFn = aggregation.toUpperCase();

          // Special case: Sum of all blood product costs
          if (xAxisVar === 'total_blood_product_cost') {
            return [
              `${aggFn}(rbc_units_cost) AS ${aggregation}_rbc_units_cost`,
              `${aggFn}(plt_units_cost) AS ${aggregation}_plt_units_cost`,
              `${aggFn}(ffp_units_cost) AS ${aggregation}_ffp_units_cost`,
              `${aggFn}(cryo_units_cost) AS ${aggregation}_cryo_units_cost`,
              `${aggFn}(cell_saver_cost) AS ${aggregation}_cell_saver_cost`,
            ];
          }

          if (xAxisVar === 'case_mix_index') {
            return `SUM(ms_drg_weight) / COUNT(visit_no) AS ${aggregation}_case_mix_index`;
          }

          // Return aggregated attribute. (E.g. "SUM(rbc_units) AS sum_rbc_units")
          return `${aggFn}(CAST(${xAxisVar} AS DOUBLE)) AS ${aggregation}_${xAxisVar}`;
        })
      ));

      // --- Histograms ----
      const histQuery = `
          SELECT attending_provider, ${selectClauses.join(', ')}
          FROM filteredVisits
          WHERE attending_provider IS NOT NULL ${dateClause}
          GROUP BY attending_provider;
        `;

      // --- Execute query ---
      const res = await this._rootStore.duckDB.query(histQuery);
      const rows = res.toArray().map((r) => r.toJSON());

      // --- For each chart config, bin data by x-axis ---
      histConfigs.forEach((cfg) => {
        const yVar = cfg.yAxisVar;
        const xVar = cfg.xAxisVar;
        const chartKey = `${cfg.chartId}_${xVar}`;
        const aggregation = cfg.aggregation || 'avg';

        // --- Recommended mark ---
        const opt = providerXAxisOptions.find((o) => o.value === xVar) as
          | { recommendation?: Partial<Record<keyof typeof AGGREGATION_OPTIONS, number>> }
          | undefined;
        const recommendedMark = opt?.recommendation?.[aggregation as keyof typeof AGGREGATION_OPTIONS] ?? NaN;

        // Collect numeric x values
        const values: number[] = [];
        rows.forEach((r) => {
          const value = r[`${aggregation}_${xVar}`];
          if (value === null || value === undefined) return;
          const num = Number(value);
          if (Number.isNaN(num) || !Number.isFinite(num)) return;
          values.push(num);
        });

        let providerChartData: ProviderChart['data'] = [];

        if (values.length === 0) {
          providerChartData = [];
        } else {
          // Determine min/max including recommended mark if applicable
          let min: number;
          let max: number;
          if (!Number.isNaN(recommendedMark)) {
            min = Math.min(recommendedMark, ...values);
            max = Math.max(...values, recommendedMark);
          } else {
            min = Math.min(...values);
            max = Math.max(...values);
          }

          // Count unique values after rounding to 2 decimals
          const uniqueRounded = new Set(values.map((v) => Number(v.toFixed(2)))).size;
          const bins = Math.min(uniqueRounded || 1, 20);

          // Edge case of 1 bin
          if (min === max) {
            providerChartData = [{
              [xVar]: Number(min.toFixed(2)),
              [yVar]: values.length,
            }];
            // Otherwise, bin normally
          } else {
            const binCount = Math.max(1, bins);
            const binWidth = (max - min) / binCount;
            // Initialize counts
            const counts = new Array<number>(binCount).fill(0);

            // Assign each value to a bin
            values.forEach((v) => {
              let idx = Math.floor((v - min) / binWidth);
              if (idx < 0) idx = 0;
              if (idx >= binCount) idx = binCount - 1;
              counts[idx] += 1;
            });

            // Convert bins to chart data using bin center as x value
            providerChartData = counts.map((count, i) => {
              const center = min + (i + 0.5) * binWidth;
              return {
                [xVar]: Number(center.toFixed(2)),
                [yVar]: count,
              };
            });
          }
        }

        // --- Determine provider-specific marks for comparison ---
        let providerMark: number | undefined;
        let providerName: string | null = null;
        if (this.selectedProvider) {
          const match = rows.find((r) => String(r.attending_provider) === String(this.selectedProvider));
          const matchVal = match ? match[`${aggregation}_${xVar}`] : undefined;
          if (match && matchVal !== null && matchVal !== undefined && !Number.isNaN(Number(matchVal))) {
            providerMark = Number(Number(matchVal).toFixed(2));
            providerName = String(match.attending_provider);
          }
        }

        // --- Save Chart ---
        const chartXAxis = dashboardYAxisOptions.find((o) => o.value === xVar);
        const chartTitle = chartXAxis?.label?.[aggregation] ?? xVar;

        charts[chartKey] = {
          group: cfg.group || 'Ungrouped',
          title: chartTitle,
          data: providerChartData,
          dataKey: xVar,
          orientation: 'horizontal',
          recommendedMark,
          providerMark,
          providerName,
        };
      });

      // Create time-series line charts ----------------------
      const lineConfigs = this._chartConfigs.filter((cfg) => cfg.chartType === 'time-series-line');

      // Build unique select clauses for the query based on yAxis variables used by line charts.
      const lineSelectMap = new Map<string, { select: string; alias: string; yVar: string; agg: string }>();
      lineConfigs.forEach((cfg) => {
        const agg = (cfg.aggregation || 'avg').toLowerCase();
        const aggFn = agg.toUpperCase();
        const yVar = cfg.yAxisVar;

        // Special-case: case_mix_index computed from ms_drg_weight / COUNT(visit_no)
        let alias: string;
        let selectClause: string;
        if (yVar === 'case_mix_index') {
          alias = `${agg}_case_mix_index`;
          selectClause = `SUM(ms_drg_weight) / COUNT(visit_no) AS ${alias}`;
        } else {
          alias = `${agg}_${yVar}`;
          selectClause = `${aggFn}(CAST(${yVar} AS DOUBLE)) AS ${alias}`;
        }

        if (!lineSelectMap.has(alias)) {
          lineSelectMap.set(alias, {
            select: selectClause,
            alias,
            yVar,
            agg,
          });
        }
      });

      if (lineConfigs.length > 0) {
        const lineSelects = Array.from(lineSelectMap.values()).map((v) => v.select).join(', ');

        // Build two queries: one aggregated across ALL providers by time period,
        // and one aggregated for the selected provider (if any). We'll merge results
        // in JS to produce points with both values (e.g. { month: '2022-Jan', los_all: 10, los_provider: 9 }).
        const provEscaped = this.selectedProvider ? String(this.selectedProvider).replace(/'/g, "''") : null;

        // Query for everyone (grouped by time)
        const allQuery = `
          SELECT month, quarter, year, ${lineSelects}
          FROM filteredVisits
          WHERE attending_provider IS NOT NULL ${dateClause}
          GROUP BY month, quarter, year;
        `;

        // Query for selected provider (grouped by time) if provider selected
        const selQuery = provEscaped ? `
          SELECT month, quarter, year, ${lineSelects}
          FROM filteredVisits
          WHERE attending_provider = '${provEscaped}' ${dateClause}
          GROUP BY month, quarter, year;
        ` : null;

        // Execute queries (selected provider query only when needed)
        const allRes = await this._rootStore.duckDB.query(allQuery);
        const lineRowsAll = allRes.toArray().map((r) => r.toJSON());

        let lineRowsSel: Array<Record<string, unknown>> = [];
        if (selQuery) {
          const selRes = await this._rootStore.duckDB.query(selQuery);
          lineRowsSel = selRes.toArray().map((r) => r.toJSON());
        }

        // For each line chart config, build chart data
        lineConfigs.forEach((cfg) => {
          const agg = (cfg.aggregation || 'avg').toLowerCase();
          const yVar = cfg.yAxisVar;
          const xVar = cfg.xAxisVar as 'month' | 'quarter' | 'year';
          const alias = `${agg}_${yVar}`;
          const chartKey = `${cfg.chartId}_${xVar}`;

          // Build point list from query results: one point per time period (month/quarter/year)
          const points: Array<Record<string, string | number | undefined>> = [];

          // Aggregate rows by the configured x-axis (month/quarter/year) so "All Providers"
          // is grouped at the same granularity as the chart (not always by month).
          const aggregateRowsByX = (rowsArr: Array<Record<string, unknown>>) => {
            const buckets = new Map<string, number[]>();
            rowsArr.forEach((r) => {
              const timeVal = r[xVar];
              if (timeVal === null || timeVal === undefined) return;
              const timePeriod = String(timeVal);
              const raw = r[alias];
              if (raw === null || raw === undefined) return;
              const num = Number(raw);
              if (!Number.isFinite(num)) return;
              const arr = buckets.get(timePeriod) ?? [];
              arr.push(num);
              buckets.set(timePeriod, arr);
            });

            const aggregated = new Map<string, number>();
            buckets.forEach((arr, tp) => {
              let val: number;
              if (agg === 'sum') val = arr.reduce((a, b) => a + b, 0);
              else if (agg === 'min') val = Math.min(...arr);
              else if (agg === 'max') val = Math.max(...arr);
              else /* 'avg' or fallback */ val = arr.reduce((a, b) => a + b, 0) / arr.length;
              aggregated.set(tp, val);
            });
            return aggregated;
          };

          const allMap = aggregateRowsByX(lineRowsAll);
          const selMap = aggregateRowsByX(lineRowsSel);

          const allLabel = 'All';
          const providerLabel = this.selectedProvider ? String(this.selectedProvider) : null;

          // Build points from aggregated maps
          Array.from(allMap.keys()).forEach((timePeriod) => {
            const numAll = allMap.get(timePeriod);
            if (numAll === undefined || !Number.isFinite(numAll)) return;
            const numSel = selMap.get(timePeriod);

            const point: Record<string, string | number | undefined> = {
              [xVar]: timePeriod,
              [allLabel]: Number(numAll),
            };
            if (providerLabel) {
              if (numSel !== undefined && Number.isFinite(numSel)) {
                point[providerLabel] = Number(numSel);
              } else {
                point[providerLabel] = undefined;
              }
            }
            points.push(point);
          });

          // Sort by time period using compareTimePeriods (safely cast to TimePeriod)
          points.sort((a, b) => {
            try {
              return compareTimePeriods(a[xVar] as TimePeriod, b[xVar] as TimePeriod);
            } catch {
              return 0;
            }
          });

          // Chart title & recommended mark (if provided in y-axis options)
          const yOption = dashboardYAxisOptions.find((o) => o.value === yVar);
          const chartTitle = (yOption as { label?: Record<string, string> })?.label?.[agg as 'sum' | 'avg'] ?? String(yVar);
          const recommendedMark = (yOption as { recommendation?: Record<string, number> })?.recommendation?.[agg] ?? NaN;

          // Provider-specific mark is not available from this time-aggregated query (leave undefined)
          let providerMark: number | undefined;
          const providerName: string | null = this.selectedProvider ? String(this.selectedProvider) : null;

          charts[chartKey] = {
            group: cfg.group || 'Ungrouped',
            title: chartTitle,
            data: points,
            dataKey: xVar,
            orientation: 'horizontal',
            recommendedMark,
            providerMark,
            providerName,
          };
        });
      }

      // Update store
      this.providerChartData = charts;
      return this.providerChartData;
    } catch (e) {
      // Error handling
      console.error('Error building provider charts:', e);
      this.providerChartData = {};
      return this.providerChartData;
    }
  }
}

export class RootStore {
  // region Initial State
  provenance: Provenance<ApplicationState, string, { type: string; value: string }> | null = null;

  _provenanceAtom: IAtom;

  deletedStateKeys: Set<string> = new Set();

  duckDB: AsyncDuckDBConnection | null = null;

  procedureHierarchy: ProcedureHierarchyResponse | null = null;

  providersStore: ProvidersStore;

  // --- Dashboard State ---
  _baseDashboardLayouts: { [key: string]: Layout[] } | null = null;

  dashboardChartData: DashboardChartData = {} as DashboardChartData;

  dashboardStatData: DashboardStatData = {} as DashboardStatData;

  // --- Explore State ---
  exploreInitialChartConfigs: ExploreChartConfig[] = [];

  exploreInitialChartLayouts: { [key: string]: Layout[] } = { main: [] };

  _transientExploreLayouts: { [key: string]: Layout[] } | null = null;

  exploreChartData: ExploreChartData = {};

  // --- Filters State ---
  _initialFilterValues = {
    dateFrom: new Date(new Date().getFullYear() - 5, 0, 1),
    dateTo: new Date(),
    rbc_units: [0, MANUAL_INFINITY] as [number, number],
    ffp_units: [0, MANUAL_INFINITY] as [number, number],
    plt_units: [0, MANUAL_INFINITY] as [number, number],
    cryo_units: [0, MANUAL_INFINITY] as [number, number],
    cell_saver_ml: [0, MANUAL_INFINITY] as [number, number],
    b12: null as boolean | null,
    iron: null as boolean | null,
    antifibrinolytic: null as boolean | null,
    los: [0, MANUAL_INFINITY] as [number, number],
    death: null as boolean | null,
    vent: null as boolean | null,
    stroke: null as boolean | null,
    ecmo: null as boolean | null,
    departmentIds: [] as string[],
    procedureIds: [] as string[],
  };

  histogramData: Record<string, HistogramData> = {};

  getHistogramData(bloodProduct: BloodComponent) {
    return this.histogramData[bloodProduct];
  }

  get rbc_unitsHistogramData() { return this.histogramData.rbc_units; }

  get ffp_unitsHistogramData() { return this.histogramData.ffp_units; }

  get plt_unitsHistogramData() { return this.histogramData.plt_units; }

  get cryo_unitsHistogramData() { return this.histogramData.cryo_units; }

  get cell_saver_mlHistogramData() { return this.histogramData.cell_saver_ml; }

  get losHistogramData() { return this.histogramData.los; }

  // --- Selections State ---
  selectedVisits: { visit_no: number, [key: string]: unknown }[] = [];

  selectedVisitNos: number[] = [];

  // --- Common ---
  allVisitsLength = 0;

  filteredVisitsLength = 0;
  // endregion

  // region Constructor
  constructor() {
    this._provenanceAtom = createAtom('provenance');
    this.providersStore = new ProvidersStore(this);

    makeAutoObservable(this, {
      provenance: false,
      _provenanceAtom: false,
      savedStates: computed,
      canUndo: computed,
      canRedo: computed,
      currentState: computed,
      uiState: computed,
      dashboardChartData: observable.ref,
      exploreChartData: observable.ref,
      procedureHierarchy: observable.ref,
      selectedVisits: observable.ref,
      selectedVisitNos: observable.ref,
      providersStore: false,
    });

    this.initReactions();
  }

  // --- Common Helpers ---
  get state() {
    return this.currentState;
  }
  // endregion

  // region Actions ---
  actions = {
    updateFilter: (filterKey: keyof ApplicationState['filterValues'], value: ApplicationState['filterValues'][typeof filterKey]) => {
      this.applyAction(`Update Filter: ${filterKey}`, (state, val) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          ...val,
        },
      }), { [filterKey]: value });
    },
    updateProcedureFilters: (filters: Pick<ApplicationState['filterValues'], 'departmentIds' | 'procedureIds'>) => {
      this.applyAction('Update Department and Procedure Filters', (state, nextFilters) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          ...nextFilters,
        },
      }), filters);
    },
    resetAllFilters: () => {
      this.applyAction('Reset All Filters', (state) => {
        const initial = this.initialFilterValues;

        // Deep copy to avoid reference issues
        const initialFiltersStringified = JSON.parse(JSON.stringify({
          dateFrom: initial.dateFrom.toISOString(),
          dateTo: initial.dateTo.toISOString(),
          rbc_units: initial.rbc_units,
          ffp_units: initial.ffp_units,
          plt_units: initial.plt_units,
          cryo_units: initial.cryo_units,
          cell_saver_ml: initial.cell_saver_ml,
          b12: initial.b12,
          iron: initial.iron,
          antifibrinolytic: initial.antifibrinolytic,
          los: initial.los,
          death: initial.death,
          vent: initial.vent,
          stroke: initial.stroke,
          ecmo: initial.ecmo,
          departmentIds: initial.departmentIds,
          procedureIds: initial.procedureIds,
        }));

        return {
          ...state,
          filterValues: initialFiltersStringified,
        };
      }, null);
    },
    updateSelection: (timePeriods: string[]) => {
      this.applyAction('Update Selection', (state, periods) => ({
        ...state,
        selections: {
          ...state.selections,
          selectedTimePeriods: periods,
        },
      }), timePeriods);
    },
    updateDashboardState: (dashboardState: Partial<ApplicationState['dashboard']>, label: string = 'Update Dashboard') => {
      this.applyAction(label, (state, partial) => ({
        ...state,
        dashboard: {
          ...state.dashboard,
          ...partial,
        },
      }), dashboardState);
    },
    setUiState: (partialUiState: Partial<ApplicationState['ui']>) => {
      this.applyAction('Update UI State', (state, partial) => ({
        ...state,
        ui: {
          ...state.ui,
          ...partial,
        },
      }), partialUiState);
    },
    updateExploreState: (exploreState: Partial<ApplicationState['explore']>, label: string = 'Update Explore State') => {
      this.applyAction(label, (state, partial) => ({
        ...state,
        explore: {
          ...state.explore,
          ...partial,
        },
      }), exploreState);
    },
    updateSettings: (unitCosts: Record<Cost, number>) => {
      this.applyAction('Update Settings', (state, costs) => ({
        ...state,
        settings: {
          ...state.settings,
          unitCosts: costs,
        },
      }), unitCosts);
    },
    resetDateFilters: (initialDates: { dateFrom: string, dateTo: string }) => {
      this.applyAction('Reset Date Filters', (state, dates) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          dateFrom: dates.dateFrom,
          dateTo: dates.dateTo,
        },
      }), initialDates);
    },
    resetBloodComponentFilters: (initialFilters: Pick<ApplicationState['filterValues'], BloodComponent>) => {
      this.applyAction('Reset Blood Component Filters', (state, filters) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          ...filters,
        },
      }), initialFilters);
    },
    resetMedicationsFilters: (initialFilters: Pick<ApplicationState['filterValues'], 'b12' | 'iron' | 'antifibrinolytic'>) => {
      this.applyAction('Reset Medication Filters', (state, filters) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          ...filters,
        },
      }), initialFilters);
    },
    resetOutcomeFilters: (initialFilters: Pick<ApplicationState['filterValues'], 'los' | 'death' | 'vent' | 'stroke' | 'ecmo'>) => {
      this.applyAction('Reset Outcome Filters', (state, filters) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          ...filters,
        },
      }), initialFilters);
    },
    resetProcedureFilters: (initialFilters: Pick<ApplicationState['filterValues'], 'departmentIds' | 'procedureIds'>) => {
      this.applyAction('Reset Department and Procedure Filters', (state, filters) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          ...filters,
        },
      }), initialFilters);
    },
    clearSelection: () => {
      this.applyAction('Clear Selected Visits', (state) => ({
        ...state,
        selections: {
          ...state.selections,
          selectedTimePeriods: [],
        },
      }), null);
    },
  };
  // endregion

  // region Provenance
  /**
   * Initialize the provenance store with current store values.
   * This should be called after data is loaded and default filter values are calculated.
   */
  init() {
    if (this.provenance) {
      console.warn('ProvenanceStore already initialized');
      return;
    }
    const rawInitialState: ApplicationState = {
      filterValues: {
        dateFrom: this.initialFilterValues.dateFrom.toISOString(),
        dateTo: this.initialFilterValues.dateTo.toISOString(),
        rbc_units: [...this.initialFilterValues.rbc_units],
        ffp_units: [...this.initialFilterValues.ffp_units],
        plt_units: [...this.initialFilterValues.plt_units],
        cryo_units: [...this.initialFilterValues.cryo_units],
        cell_saver_ml: [...this.initialFilterValues.cell_saver_ml],
        b12: this.initialFilterValues.b12,
        iron: this.initialFilterValues.iron,
        antifibrinolytic: this.initialFilterValues.antifibrinolytic,
        los: [...this.initialFilterValues.los],
        death: this.initialFilterValues.death,
        vent: this.initialFilterValues.vent,
        stroke: this.initialFilterValues.stroke,
        ecmo: this.initialFilterValues.ecmo,
        departmentIds: [...this.initialFilterValues.departmentIds],
        procedureIds: [...this.initialFilterValues.procedureIds],
      },
      selections: {
        selectedTimePeriods: [],
      },
      dashboard: {
        chartConfigs: JSON.parse(JSON.stringify(DEFAULT_CHART_CONFIGS || [])),
        statConfigs: JSON.parse(JSON.stringify(DEFAULT_STAT_CONFIGS || [])),
        chartLayouts: JSON.parse(JSON.stringify(DEFAULT_CHART_LAYOUTS || {})),
      },
      explore: {
        chartConfigs: JSON.parse(JSON.stringify(this.exploreInitialChartConfigs || [])),
        chartLayouts: JSON.parse(JSON.stringify(this.exploreInitialChartLayouts || {})),
      },
      settings: {
        unitCosts: { ...DEFAULT_UNIT_COSTS },
      },
      ui: {
        activeTab: 'Hospital',
        leftToolbarOpened: true,
        activeLeftPanel: null,
        selectedVisitNo: null,
        filterPanelExpandedItems: ['date-filters', 'blood-component-filters', 'department-procedure-filters'],
        showFilterHistograms: false,
      },
    };

    const initialState = JSON.parse(JSON.stringify(rawInitialState));

    // Create new provenance instance
    this.provenance = initProvenance<ApplicationState, string, { type: string; value: string }>(initialState, {
      loadFromUrl: true,
    });

    // Set up observer
    this.provenance.addGlobalObserver((_graph, _changeType) => {
      runInAction(() => {
        this._provenanceAtom.reportChanged();
      });
    });

    this.provenance.done();

    // Check for provState key
    const hasUrlParam = window.location.search.includes('provState') || window.location.hash.includes('provState');

    // If we're at the root, create an initial state
    if (this.provenance.current.id === this.provenance.root.id && !hasUrlParam) {
      this.provenance.apply({
        apply: (state: ApplicationState) => ({
          state,
          label: 'Initial State',
          stateSaveMode: 'Complete',
          actionType: 'Regular',
          eventType: 'Regular',
          event: 'Initial State',
          meta: {
            type: 'Regular',
            value: 'Initial State',
          },
        }),
      }, 'Initial State');

      // Auto-save as Initial State so it appears in the menu
      this.saveState('Initial State');
    }
  }

  /**
   * Helper to apply an action to the provenance graph reducing boilerplate.
   */
  applyAction<T>(
    label: string,
    updater: (state: ApplicationState, payload: T) => ApplicationState,
    payload: T,
  ) {
    if (!this.provenance) return;
    this.provenance.apply({
      apply: (state: ApplicationState) => {
        const newState = updater(state, payload);
        return {
          state: newState,
          label,
          stateSaveMode: 'Complete',
          actionType: 'Regular',
          eventType: 'Regular',
          event: label,
          meta: {
            type: 'Regular',
            value: label,
          },
        };
      },
    }, label);
  }

  // Save/Restore --------------------------------------------------------------

  /**
   * Helper to generate consistent composite keys for states.
   */
  getUniqueStateId(nodeId: string, name: string) {
    return `${nodeId}|${name}`;
  }

  /**
   * Save the current state as a named state.
   */
  saveState(name: string, screenshot?: string) {
    if (!this.provenance) return;
    const currentNodeId = this.provenance.current.id;

    // Add the name and screenshot as artifacts to the current node (state)
    this.provenance.addArtifact({ type: 'name', value: name }, currentNodeId);
    if (screenshot) {
      this.provenance.addArtifact({ type: 'screenshot', value: screenshot }, currentNodeId);
    }

    // Generate a unique key for the state
    const key = this.getUniqueStateId(currentNodeId, name);

    // If the state has been deleted, remove it from the deleted states set
    if (this.deletedStateKeys.has(key)) {
      this.deletedStateKeys.delete(key);
    }

    // Trigger reactivity so UI updates
    runInAction(() => {
      this._provenanceAtom.reportChanged();
    });
  }

  removeState(nodeId: NodeID, name: string) {
    this.deletedStateKeys.add(this.getUniqueStateId(nodeId, name));
    // Trigger reactivity
    runInAction(() => {
      this._provenanceAtom.reportChanged();
    });
  }

  /**
   * Auto-save the current state as "Current State" if it differs from "Initial State".
   * Removes any existing transient "Current State" entries.
   */
  saveTempCurrentState(screenshot?: string) {
    // 1. Check if current state matches "Initial State"
    const initialStateNode = this.savedStates.find((s) => s.name === 'Initial State');
    let isInitial = false;

    if (initialStateNode) {
      const initialState = this.provenance?.getState(initialStateNode.id);
      if (initialState && this.areStatesEqual(this.currentState, initialState)) {
        isInitial = true;
      }
    }

    // 2. If NOT Initial State, Save (or Update) "Current State"
    if (!isInitial) {
      // Remove any existing "Current State" entries to keep it transient
      const existingCurrentStates = this.savedStates.filter((s) => s.name === 'Current State');
      existingCurrentStates.forEach((s) => this.removeState(s.id, s.name!));

      this.saveState('Current State', screenshot);
    }
  }

  /**
   * Promotes a state (renames it) to the next available "State N".
   */
  saveCurrentStateAsNew(id: string): string {
    const newName = this.getNextStateName();
    this.renameState(id, 'Current State', newName); // Explicitly rename "Current State"
    return newName;
  }

  renameState(nodeId: NodeID, oldName: string, newName: string) {
    if (!this.provenance) return;

    // "Delete" the old name
    this.deletedStateKeys.add(this.getUniqueStateId(nodeId, oldName));

    this.provenance.addArtifact({ type: 'name', value: newName }, nodeId);
    // Ensure new name isn't deleted
    this.deletedStateKeys.delete(this.getUniqueStateId(nodeId, newName));

    // Trigger reactivity
    runInAction(() => {
      this._provenanceAtom.reportChanged();
    });
  }

  /**
   * Returns the list of saved states derived from the provenance graph.
   * Filters out states that have been explicitly deleted.
   */
  get savedStates() {
    this._provenanceAtom.reportObserved();

    const { provenance } = this;
    if (!provenance) return [];

    // For each node (state) in the provenance graph ...
    return Object.values(provenance.graph.nodes)
      .flatMap((node) => {
        // Get all artifacts (names and screenshots) associated with this node
        const artifacts = provenance.getAllArtifacts(node.id);
        if (!artifacts.length) return [];

        const nodeWithCreatedOn = node as { createdOn?: number; metadata?: { createdOn?: number } };
        const timestamp = nodeWithCreatedOn.createdOn || nodeWithCreatedOn.metadata?.createdOn || 0;
        const screenshot = artifacts.find((a) => a.artifact.type === 'screenshot')?.artifact.value;
        const names = new Set(
          artifacts
            .filter((a) => a.artifact.type === 'name' && a.artifact.value)
            .map((a) => a.artifact.value as string),
        );

        // Return an array of saved states for this node
        return Array.from(names)
          .map((name) => ({
            id: node.id,
            name,
            screenshot,
            timestamp,
            uniqueId: this.getUniqueStateId(node.id, name),
          }))
          // Filter out deleted states
          .filter((state) => !this.deletedStateKeys.has(state.uniqueId));
      })
      // Sort by timestamp
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  get canUndo() {
    this._provenanceAtom.reportObserved();

    if (!this.provenance) return false;
    const { current } = this.provenance;
    const { root } = this.provenance;

    return current.id !== root.id && current.label !== 'Initial State';
  }

  get canRedo() {
    this._provenanceAtom.reportObserved();

    if (!this.provenance) return false;
    const { current } = this.provenance;
    return current.children.length > 0;
  }

  /**
   * Generates the next default state name (e.g. "State 1", "State 2")
   */
  getNextStateName(): string {
    const savedNames = this.savedStates.map((s) => s.name || '');
    let maxNum = 0;
    const regex = /^State (\d+)$/;

    // Find the highest currently numbered state (e.g. State 2)
    savedNames.forEach((name) => {
      const match = name.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!Number.isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    // Return the next state name (e.g. State 3)
    return `State ${maxNum + 1}`;
  }

  /**
   * Deeply compares two application states to see if they are effectively the same.
   * Ignores UI state (active tab, etc.) as that is transient.
   */
  areStatesEqual(stateA: ApplicationState, stateB: ApplicationState): boolean {
    // Helper for deep equality
    const isEqual = (a: unknown, b: unknown): boolean => {
      if (a === b) return true;
      if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

      const objA = a as Record<string, unknown>;
      const objB = b as Record<string, unknown>;

      const keysA = Object.keys(objA);
      const keysB = Object.keys(objB);

      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!isEqual(objA[key], objB[key])) return false;
      }
      return true;
    };

    // Compare relevant sections
    return isEqual(stateA.filterValues, stateB.filterValues)
      && isEqual(stateA.selections, stateB.selections)
      && isEqual(stateA.dashboard, stateB.dashboard)
      && isEqual(stateA.explore, stateB.explore)
      && isEqual(stateA.settings, stateB.settings);
  }

  get currentState(): ApplicationState {
    this._provenanceAtom.reportObserved();

    if (!this.provenance) {
      // Return default/empty state if not initialized
      return {
        filterValues: {},
        selections: {
          selectedTimePeriods: [],
        },
        dashboard: {},
        explore: {},
        settings: {},
        ui: {
          activeTab: 'Hospital',
          leftToolbarOpened: true,
          activeLeftPanel: null,
          selectedVisitNo: null,
          filterPanelExpandedItems: [],
          showFilterHistograms: false,
        },
      } as unknown as ApplicationState;
    }
    const state = this.provenance.getState(this.provenance.current);
    return {
      ...state,
      ui: {
        ...state.ui,
        activeTab: normalizeActiveTab(state.ui.activeTab),
      },
    };
  }

  get uiState() {
    return this.currentState.ui;
  }

  restoreState(nodeId: NodeID) {
    if (!this.provenance) return;
    this.provenance.goToNode(nodeId);
  }

  restoreToInitialState() {
    if (!this.provenance) return;

    // Find the node labeled "Initial State"
    const nodes = Object.values(this.provenance.graph.nodes);
    const initialNode = nodes.find((n) => n.label === 'Initial State');

    if (initialNode) {
      this.provenance.goToNode(initialNode.id);
    } else {
      console.error("Could not find 'Initial State' node to restore to.");
    }
  }

  getShareUrl(_nodeId: NodeID): string | null {
    if (!this.provenance) return null;
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?config=${this.provenance.exportState()}`;
  }
  // endregion

  // region Computed Accessors
  get unitCosts() {
    const { state } = this;
    return (state && state.settings && state.settings.unitCosts) ? state.settings.unitCosts : DEFAULT_UNIT_COSTS;
  }

  set unitCosts(costs: Record<Cost, number>) {
    this.actions.updateSettings(costs);
  }

  get selectedTimePeriods() {
    return this.state.selections?.selectedTimePeriods || [];
  }
  // endregion

  // region Dashboard

  get dashboardChartLayouts() {
    if (this._baseDashboardLayouts) {
      return this._baseDashboardLayouts;
    }
    const { state } = this;
    return (state && state.dashboard && state.dashboard.chartLayouts) ? state.dashboard.chartLayouts : DEFAULT_CHART_LAYOUTS;
  }

  set dashboardChartLayouts(input: { [key: string]: Layout[] }) {
    if (this.state.ui.activeTab !== 'Hospital') return;
    this._baseDashboardLayouts = input;
  }

  updateDashboardLayout(input: { [key: string]: Layout[] }) {
    this.actions.updateDashboardState({ chartLayouts: input }, 'Update Dashboard Layout');
    this._baseDashboardLayouts = null;
  }

  /** @returns The current dashboard chart configurations */
  get dashboardChartConfigs() {
    const { state } = this;
    return (state && state.dashboard && state.dashboard.chartConfigs) ? state.dashboard.chartConfigs : DEFAULT_CHART_CONFIGS;
  }

  set dashboardChartConfigs(input: DashboardChartConfig[]) {
    this.actions.updateDashboardState({ chartConfigs: input }, 'Update Dashboard Config');
  }

  /** @returns The current dashboard stat configurations */
  get dashboardStatConfigs() {
    const { state } = this;
    return (state && state.dashboard && state.dashboard.statConfigs) ? state.dashboard.statConfigs : DEFAULT_STAT_CONFIGS;
  }

  set dashboardStatConfigs(input: DashboardStatConfig[]) {
    this.actions.updateDashboardState({ statConfigs: input }, 'Update Stat Configs');
  }

  setDashboardChartConfig(chartId: string, input: DashboardChartConfig) {
    const currentConfigs = this.dashboardChartConfigs;
    const newConfigs = currentConfigs.map((config) => {
      if (config.chartId === chartId) return { ...config, ...input };
      return config;
    });
    this.actions.updateDashboardState({ chartConfigs: newConfigs }, 'Update Dashboard Config');
  }

  removeDashboardChart(chartId: string) {
    const currentLayouts = this.dashboardChartLayouts;
    const currentConfigs = this.dashboardChartConfigs;

    // Filter out the chart from the layouts
    const filteredMain = (currentLayouts.main || []).filter((layout) => layout.i !== chartId);
    const filteredSm = (currentLayouts.sm || []).filter((layout) => layout.i !== chartId);

    // Update chart layouts
    const newLayouts = {
      main: compact(filteredMain, 'vertical', 2),
      sm: compact(filteredSm, 'vertical', 1),
    };
    const newConfigs = currentConfigs.filter((config) => config.chartId !== chartId);
    this.actions.updateDashboardState({ chartConfigs: newConfigs, chartLayouts: newLayouts }, 'Remove Chart');
  }

  /**
   * Adds a new chart to the dashboard.
   * @param config The chart configuration to add.
   */
  addDashboardChart(config: DashboardChartConfig) {
    const currentConfigs = this.dashboardChartConfigs;
    const currentLayouts = this.dashboardChartLayouts;
    const newConfigs = [config, ...currentConfigs];

    // Set new chart layouts for main and sm breakpoints
    const newMainLayouts = currentLayouts.main.map((layout) => ({ ...layout, y: layout.y + 1 }));
    newMainLayouts.unshift({
      i: config.chartId, x: 0, y: 0, w: 2, h: 1, maxH: 2,
    });

    const newSmLayouts = currentLayouts.sm ? currentLayouts.sm.map((layout) => ({ ...layout, y: layout.y + 1 })) : [];
    if (currentLayouts.sm) {
      newSmLayouts.unshift({
        i: config.chartId, x: 0, y: 0, w: 1, h: 1, maxH: 2,
      });
    }

    // Assign new chart layouts
    const newLayouts = {
      ...currentLayouts,
      main: compact(newMainLayouts, 'vertical', 2),
      ...(currentLayouts.sm && { sm: compact(newSmLayouts, 'vertical', 1) }),
    };

    this.actions.updateDashboardState({ chartConfigs: newConfigs, chartLayouts: newLayouts }, 'Add Chart');
  }

  /**
   * Adds a new stat to the dashboard.
   * @param statVar The variable to display on the y-axis.
   * @param aggregation The aggregation function to use.
   */
  addDashboardStat(statVar: DashboardStatConfig['yAxisVar'], aggregation: DashboardStatConfig['aggregation']) {
    const statId = `stat-${Date.now()}`;
    // Get stat label
    const opt = dashboardYAxisOptions.find((o) => o.value === statVar);
    const title = opt?.label?.[aggregation || 'sum'] || statVar;
    // Create new stat config
    const fullStatConfig: DashboardStatConfig = {
      statId, yAxisVar: statVar, aggregation, title,
    };
    // Add new stat to dashboard
    const currentStats = this.dashboardStatConfigs;
    this.actions.updateDashboardState({ statConfigs: [...currentStats, fullStatConfig] }, 'Add Stat');
  }

  removeDashboardStat(statId: string) {
    const currentStats = this.dashboardStatConfigs;
    this.actions.updateDashboardState({ statConfigs: currentStats.filter((config) => config.statId !== statId) }, 'Remove Stat');
  }

  resetDashboard() {
    this.actions.updateDashboardState({
      chartConfigs: JSON.parse(JSON.stringify(DEFAULT_CHART_CONFIGS)),
      statConfigs: JSON.parse(JSON.stringify(DEFAULT_STAT_CONFIGS)),
      chartLayouts: JSON.parse(JSON.stringify(DEFAULT_CHART_LAYOUTS)),
    }, 'Reset Dashboard to Defaults');
  }

  async computeDashboardChartData() {
    if (!this.duckDB) return;
    const result = {} as DashboardChartData;

    // For each chart, build the 'select' clauses
    const selectClauses = this.dashboardChartConfigs.flatMap(({ yAxisVar }) => (
      Object.keys(AGGREGATION_OPTIONS).flatMap((aggregation) => {
        const aggFn = aggregation.toUpperCase();
        if (yAxisVar === 'total_blood_product_cost') {
          return [
            `${aggFn}(rbc_units_cost) AS ${aggregation}_rbc_units_cost`,
            `${aggFn}(plt_units_cost) AS ${aggregation}_plt_units_cost`,
            `${aggFn}(ffp_units_cost) AS ${aggregation}_ffp_units_cost`,
            `${aggFn}(cryo_units_cost) AS ${aggregation}_cryo_units_cost`,
            `${aggFn}(whole_cost) AS ${aggregation}_whole_cost`,
            `${aggFn}(cell_saver_cost) AS ${aggregation}_cell_saver_cost`,
          ];
        }
        if (yAxisVar === 'case_mix_index') {
          return `SUM(ms_drg_weight) / COUNT(visit_no) AS ${aggregation}_case_mix_index`;
        }
        // Special case: Overall adherence – return raw numerator & denominator sums
        if (yAxisVar === 'overall_units_adherent' && aggregation === 'avg') {
          const baseSum = 'rbc_units + ffp_units + plt_units + cryo_units';
          return [
            `SUM(${yAxisVar}) AS ${aggregation}_${yAxisVar}`,
            `SUM(${baseSum}) AS ${aggregation}_${yAxisVar}_den`,
          ];
        }
        // Average adherence – return raw numerator & denominator sums
        if (yAxisVar.endsWith('_adherent') && aggregation === 'avg') {
          const baseUnit = yAxisVar.replace('_adherent', '');
          return [
            `SUM(${yAxisVar}) AS ${aggregation}_${yAxisVar}`,
            `SUM(${baseUnit}) AS ${aggregation}_${yAxisVar}_den`,
          ];
        }
        return `${aggFn}(CAST(${yAxisVar} AS DOUBLE)) AS ${aggregation}_${yAxisVar}`;
      })
    ));

    // Get the data from each chart, grouped by month, quarter, and year
    const query = `
      SELECT
        month,
        quarter,
        year,
        COUNT(visit_no) AS visit_count,
        ${selectClauses.join(',\n')}
      FROM aggregatedVisits
      GROUP BY month, quarter, year
      ORDER BY year, quarter, month;
    `;
    const queryResult = await this.duckDB.query(query);
    const rows = queryResult.toArray().map((row) => row.toJSON());

    // For each x-axis variable (month, quarter, year)...
    dashboardXAxisVars.forEach((xAxisVar) => {
      const timeAggregation = xAxisVar as TimeAggregation;
      // For each y-axis variable (e.g. rbc_units)...
      this.dashboardChartConfigs.forEach(({ yAxisVar }) => {
        // For each aggregation (sum, avg)
        Object.keys(AGGREGATION_OPTIONS).forEach((aggregation) => {
          const aggType = aggregation as keyof typeof AGGREGATION_OPTIONS;
          const aggVar: DashboardAggYAxisVar = `${aggType}_${yAxisVar}`;
          // Get the data for this chart
          const chartDatum = rows
            .map((row) => {
              // Special case for total blood product cost
              if (yAxisVar === 'total_blood_product_cost') {
                return {
                  timePeriod: row[timeAggregation] as TimePeriod,
                  data: {
                    rbc_units_cost: Number(row[`${aggType}_rbc_units_cost`] || 0),
                    plt_units_cost: Number(row[`${aggType}_plt_units_cost`] || 0),
                    ffp_units_cost: Number(row[`${aggType}_ffp_units_cost`] || 0),
                    cryo_units_cost: Number(row[`${aggType}_cryo_units_cost`] || 0),
                    whole_cost: Number(row[`${aggType}_whole_cost`] || 0),
                    cell_saver_cost: Number(row[`${aggType}_cell_saver_cost`] || 0),
                  },
                  counts_per_period: Number(row.visit_count || 0),
                };
              }
              // Adherence avg: pass through raw numerator + denominator for correct aggregation
              if (yAxisVar.endsWith('_adherent') && aggType === 'avg') {
                return {
                  timePeriod: row[timeAggregation] as TimePeriod,
                  data: Number(row[aggVar] || 0),
                  counts_per_period: Number(row.visit_count || 0),
                  _adherence_den: Number(row[`${aggVar}_den`] || 0),
                };
              }
              // Otherwise, return the data for this chart
              return {
                timePeriod: row[timeAggregation] as TimePeriod,
                data: Number(row[aggVar] || 0),
                counts_per_period: Number(row.visit_count || 0),
              };
            })
            // Filter out null and undefined time periods
            .filter((entry) => entry.timePeriod !== null && entry.timePeriod !== undefined && !Number.isNaN(entry.data))
            // Reduce the data to a single array of objects
            .reduce((acc, curr) => {
              const existing = acc.find((item) => item.timePeriod === curr.timePeriod);

              if (existing) {
                // SUM: Accumulate values directly
                if (aggType === 'sum') {
                  if (typeof existing.data === 'object' && typeof curr.data === 'object') {
                    existing.data = {
                      rbc_units_cost: existing.data.rbc_units_cost + curr.data.rbc_units_cost,
                      plt_units_cost: existing.data.plt_units_cost + curr.data.plt_units_cost,
                      ffp_units_cost: existing.data.ffp_units_cost + curr.data.ffp_units_cost,
                      cryo_units_cost: existing.data.cryo_units_cost + curr.data.cryo_units_cost,
                      whole_cost: existing.data.whole_cost + curr.data.whole_cost,
                      cell_saver_cost: existing.data.cell_saver_cost + curr.data.cell_saver_cost,
                    };
                  } else {
                    (existing.data as number) += curr.data as number;
                  }
                  // AVG: Track raw data to re-calculate weighted average
                } else if (aggType === 'avg') {
                  // Adherence avg: accumulate raw numerator & denominator sums
                  if (curr._adherence_den !== undefined) {
                    (existing.data as number) += curr.data as number;
                    existing._adherence_den = (existing._adherence_den || 0) + curr._adherence_den;
                  } else {
                    existing.counts_per_period!.push(curr.counts_per_period || 0);
                    existing.data_per_period!.push(curr.data);
                    const totalCount = existing.counts_per_period!.reduce((a, b) => a + b, 0);

                    if (typeof existing.data === 'object' && typeof curr.data === 'object') {
                      const costKeys = Object.keys(existing.data) as (keyof typeof existing.data)[];
                      const avgObj: Record<string, number> = {};
                      for (const key of costKeys) {
                        const values = existing.data_per_period!.map((d) => (typeof d === 'object' ? d[key] : 0));
                        const weighted = existing.counts_per_period!.map((count, idx) => (count * (values[idx] || 0)) / (totalCount || 1));
                        avgObj[key] = weighted.reduce((a, b) => a + b, 0);
                      }
                      existing.data = avgObj;
                    } else {
                      const terms = existing.counts_per_period!.map((count, idx) => (count * (existing.data_per_period ? (existing.data_per_period[idx] as number) : 0)) / (totalCount || 1));
                      existing.data = terms.reduce((a, b) => a + b, 0);
                    }
                  }
                }
              } else {
                // If new time period: Initialize tracking arrays
                acc.push({ ...curr, counts_per_period: curr.counts_per_period ? [curr.counts_per_period] : [], data_per_period: [curr.data] });
              }
              return acc;
            }, [] as { timePeriod: TimePeriod; data: number | Record<Cost, number>, counts_per_period?: number[], data_per_period?: (number | Record<Cost, number>)[], _adherence_den?: number }[])
            // Compute final values and clean up tracking fields
            .map((entry) => {
              // Adherence avg: compute the ratio from accumulated numerator / denominator
              if (entry._adherence_den !== undefined) {
                entry.data = entry._adherence_den > 0 ? (entry.data as number) / entry._adherence_den : 0;
              }
              delete entry.counts_per_period;
              delete entry.data_per_period;
              delete entry._adherence_den;
              return entry as { timePeriod: TimePeriod; data: number | Record<Cost, number> };
            })
            // Sort the data by time period
            .sort((a, b) => compareTimePeriods(a.timePeriod, b.timePeriod));

          const compositeKey = `${aggVar}_${xAxisVar}` as keyof DashboardChartData;
          result[compositeKey] = chartDatum;
        });
      });
    });
    this.dashboardChartData = result;
  }

  async computeDashboardStatData() {
    if (!this.duckDB) return;
    const result = {} as DashboardStatData;
    // Get the latest date
    const latestDateQuery = 'SELECT MAX(dsch_dtm) as latest_date FROM filteredVisits';
    const latestDateResult = await this.duckDB.query(latestDateQuery);
    const latestDateRow = latestDateResult.toArray()[0];
    const latestDate = new Date(latestDateRow.latest_date as string);
    // Get the start of the current period
    const currentPeriodStart = new Date(latestDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    const currentPeriodStartMonth = currentPeriodStart.getUTCMonth();
    const currentPeriodStartYear = currentPeriodStart.getUTCFullYear();
    // Get the start of the comparison period
    let comparisonMonth = currentPeriodStartMonth - 1;
    let comparisonYear = currentPeriodStartYear;
    if (comparisonMonth < 0) {
      comparisonMonth = 11;
      comparisonYear -= 1;
    }
    const comparisonPeriodStart = new Date(Date.UTC(comparisonYear, comparisonMonth, 1));
    const comparisonPeriodEnd = new Date(Date.UTC(comparisonYear, comparisonMonth + 1, 0, 23, 59, 59, 999));
    const comparisonMonthName = comparisonPeriodStart.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    // Build the select statements for the stats data
    const statSelects = [
      // Visit counts
      `
      COUNT(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}'
        THEN visit_no ELSE NULL END) AS visit_count_current_sum,
      COUNT(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}'
        THEN visit_no ELSE NULL END) AS visit_count_comparison_sum,
      COUNT(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}'
        THEN visit_no ELSE NULL END) AS visit_count_current_avg,
      COUNT(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}'
        THEN visit_no ELSE NULL END) AS visit_count_comparison_avg
      `,
      // For each stat, add the appropriate select statement
      this.dashboardStatConfigs.map(({ yAxisVar, aggregation }) => {
        const aggFn = aggregation.toUpperCase();
        // Exception: Total blood product cost
        if (yAxisVar === 'total_blood_product_cost') {
          return `
                ${aggFn}(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}'
                  THEN rbc_units_cost + plt_units_cost + ffp_units_cost + cryo_units_cost + whole_cost + cell_saver_cost ELSE NULL END) AS total_blood_product_cost_current_${aggregation},
                ${aggFn}(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}'
                  THEN rbc_units_cost + plt_units_cost + ffp_units_cost + cryo_units_cost + whole_cost + cell_saver_cost ELSE NULL END) AS total_blood_product_cost_comparison_${aggregation}
              `;
        }
        // Exception: Case mix index
        if (yAxisVar === 'case_mix_index') {
          return `
                SUM(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}'
                  THEN ms_drg_weight ELSE NULL END) / visit_count_current_sum AS case_mix_index_current_${aggregation},
                SUM(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}'
                  THEN ms_drg_weight ELSE NULL END) / visit_count_comparison_sum AS case_mix_index_comparison_${aggregation}
              `;
        }
        // Special case: Overall adherence (avg. adherent units as percentage of total units)
        if (yAxisVar === 'overall_units_adherent' && aggregation === 'avg') {
          const baseSum = 'rbc_units + ffp_units + plt_units + cryo_units';
          return `
                CASE WHEN SUM(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}' THEN (${baseSum}) ELSE 0 END) > 0 
                  THEN CAST(SUM(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}' THEN ${yAxisVar} ELSE 0 END) AS DOUBLE) / 
                       SUM(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}' THEN (${baseSum}) ELSE 0 END) 
                  ELSE NULL END AS ${yAxisVar}_current_${aggregation},
                CASE WHEN SUM(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}' THEN (${baseSum}) ELSE 0 END) > 0 
                  THEN CAST(SUM(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}' THEN ${yAxisVar} ELSE 0 END) AS DOUBLE) / 
                       SUM(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}' THEN (${baseSum}) ELSE 0 END) 
                  ELSE NULL END AS ${yAxisVar}_comparison_${aggregation}
              `;
        }
        // Avg. adherent units as percentage of total units
        if (yAxisVar.endsWith('_adherent') && aggregation === 'avg') {
          const baseUnit = yAxisVar.replace('_adherent', '');
          return `
                CASE WHEN SUM(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}' THEN ${baseUnit} ELSE 0 END) > 0 
                  THEN CAST(SUM(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}' THEN ${yAxisVar} ELSE 0 END) AS DOUBLE) / 
                       SUM(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}' THEN ${baseUnit} ELSE 0 END) 
                  ELSE NULL END AS ${yAxisVar}_current_${aggregation},
                CASE WHEN SUM(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}' THEN ${baseUnit} ELSE 0 END) > 0 
                  THEN CAST(SUM(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}' THEN ${yAxisVar} ELSE 0 END) AS DOUBLE) / 
                       SUM(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}' THEN ${baseUnit} ELSE 0 END) 
                  ELSE NULL END AS ${yAxisVar}_comparison_${aggregation}
              `;
        }
        // Default: Other stats
        return `
              ${aggFn}(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}'
                THEN CAST(${yAxisVar} AS DOUBLE) ELSE NULL END) AS ${yAxisVar}_current_${aggregation},
              ${aggFn}(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}'
                THEN CAST(${yAxisVar} AS DOUBLE) ELSE NULL END) AS ${yAxisVar}_comparison_${aggregation}
            `;
      }),
    ].join(',\n');

    // Get the stats data within the correct time period
    const mainStatsQuery = `
    SELECT
      ${statSelects}
      FROM aggregatedVisits
      WHERE dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}';
    `;
    const mainStatsResult = await this.duckDB!.query(mainStatsQuery);
    const statRow = mainStatsResult.toArray()[0];

    // Get the sparkline months from the last 6 months
    const sparklineMonths: string[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(latestDate.getUTCFullYear(), latestDate.getUTCMonth() - i, 1));
      const year = d.getUTCFullYear();
      const monthShort = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      sparklineMonths.push(`${year}-${monthShort}`);
    }

    // Build the select statements for the sparkline data
    const sparklineSelects: string[] = [];
    // For each stat, add the appropriate select statement
    this.dashboardStatConfigs.forEach(({ yAxisVar, aggregation }) => {
      const aggFn = aggregation.toUpperCase();
      // Exception: Total blood product cost
      if (yAxisVar === 'total_blood_product_cost') {
        sparklineSelects.push(
          `${aggFn}(rbc_units_cost + plt_units_cost + ffp_units_cost + cryo_units_cost + whole_cost + cell_saver_cost) AS ${aggregation}_total_blood_product_cost`,
        );
        return;
      }
      // Exception: Case mix index
      if (yAxisVar === 'dsch_dtm') {
        sparklineSelects.push(
          `COUNT(dsch_dtm) AS ${aggregation}_dsch_dtm`,
        );
        return;
      }
      // Exception: Case mix index
      if (yAxisVar === 'case_mix_index') {
        sparklineSelects.push(
          `SUM(ms_drg_weight) / COUNT(visit_no) AS ${aggregation}_case_mix_index`,
        );
        return;
      }
      // Special case: Overall Adherence (Avg. adherent units as percentage of total units)
      if (yAxisVar === 'overall_units_adherent' && aggregation === 'avg') {
        const baseSum = 'rbc_units + ffp_units + plt_units + cryo_units';
        sparklineSelects.push(
          `CASE WHEN SUM(${baseSum}) > 0 THEN CAST(SUM(${yAxisVar}) AS DOUBLE) / SUM(${baseSum}) ELSE NULL END AS ${aggregation}_${yAxisVar}`,
        );
        return;
      }
      // Avg. adherent units as percentage of total units
      if (yAxisVar.endsWith('_adherent') && aggregation === 'avg') {
        const baseUnit = yAxisVar.replace('_adherent', '');
        sparklineSelects.push(
          `CASE WHEN SUM(${baseUnit}) > 0 THEN CAST(SUM(${yAxisVar}) AS DOUBLE) / SUM(${baseUnit}) ELSE NULL END AS ${aggregation}_${yAxisVar}`,
        );
        return;
      }
      // Default: Other stats
      sparklineSelects.push(
        `${aggFn}(CAST(${yAxisVar} AS DOUBLE)) AS ${aggregation}_${yAxisVar}`,
      );
    });

    // Get the sparkline data grouped by month
    const sparklineQuery = `
    SELECT
      month,
      ${sparklineSelects.join(',\n')}
    FROM aggregatedVisits
    WHERE month IN (${sparklineMonths.map((m) => `'${m}'`).join(', ')})
    GROUP BY month
    ORDER BY month;
  `;
    const sparklineResult = await this.duckDB!.query(sparklineQuery);
    const sparklineRows = sparklineResult.toArray().map((row) => row.toJSON());

    // Update the dashboard stats
    this.dashboardStatConfigs.forEach(({ yAxisVar, aggregation }) => {
      // Key of the stat
      const aggType = aggregation as keyof typeof AGGREGATION_OPTIONS;
      const key = `${aggType}_${yAxisVar}` as DashboardAggYAxisVar;

      // Get the current and comparison values to calculate the diff
      const currentValue = aggType === 'sum' ? Number(statRow[`${yAxisVar}_current_sum`]) : Number(statRow[`${yAxisVar}_current_avg`]);
      const comparisonValue = aggType === 'sum' ? Number(statRow[`${yAxisVar}_comparison_sum`]) : Number(statRow[`${yAxisVar}_comparison_avg`]);
      const diff = comparisonValue === 0 ? (currentValue > 0 ? 100 : 0) : ((currentValue - comparisonValue) / comparisonValue) * 100;

      // Format the stat value
      let formattedValue = formatValueForDisplay(yAxisVar, currentValue, aggType);
      if (yAxisVar.includes('adherent')) {
        formattedValue = formatValueForDisplay(yAxisVar, currentValue, aggType, false);
      }

      // Get the sparkline data for each month
      const sparklineData = sparklineMonths.map((month) => {
        const row = sparklineRows.find((r) => r.month === month);
        return row ? Number(row[`${aggregation}_${yAxisVar}`]) || 0 : 0;
      });

      // Add the stat to the result
      result[key] = {
        value: formattedValue,
        diff: Math.round(diff),
        comparedTo: comparisonMonthName,
        sparklineData,
      };
    });
    this.dashboardStatData = result;
  }
  // endregion

  // region Explore

  get exploreChartLayouts() {
    if (this._transientExploreLayouts) {
      return this._transientExploreLayouts;
    }
    const { state } = this;
    return (state && state.explore && state.explore.chartLayouts) ? state.explore.chartLayouts : this.exploreInitialChartLayouts;
  }

  set exploreChartLayouts(input: { [key: string]: Layout[] }) {
    if (this.state.ui.activeTab !== 'Department') return;
    this._transientExploreLayouts = input;
  }

  updateExploreLayout(input: { [key: string]: Layout[] }) {
    this.actions.updateExploreState({ chartLayouts: input }, 'Update Explore Layout');
    this._transientExploreLayouts = null;
  }

  get exploreChartConfigs() {
    const { state } = this;
    return (state && state.explore && state.explore.chartConfigs) ? state.explore.chartConfigs : this.exploreInitialChartConfigs;
  }

  set exploreChartConfigs(input: ExploreChartConfig[]) {
    this.actions.updateExploreState({ chartConfigs: input }, 'Update Explore Config');
  }

  loadExplorePreset(configs: ExploreChartConfig[], layouts: { [key: string]: Layout[] }) {
    this.actions.updateExploreState({ chartConfigs: configs, chartLayouts: layouts }, 'Load Explore Preset');
    this._transientExploreLayouts = null;
  }

  addExploreChart(config: ExploreChartConfig) {
    const currentConfigs = this.exploreChartConfigs;
    const currentLayouts = this.exploreChartLayouts;
    const newConfigs = [config, ...currentConfigs];
    const shifted = currentLayouts.main.map((l) => ({ ...l, y: l.y + 2 }));
    shifted.unshift({
      i: config.chartId, x: 0, y: 0, w: 4, h: 3, maxH: 4,
    });
    const newLayouts = { ...currentLayouts, main: compact(shifted, 'vertical', 4) };
    this.actions.updateExploreState({ chartConfigs: newConfigs, chartLayouts: newLayouts }, 'Add Explore Chart');
    this._transientExploreLayouts = null;
  }

  removeExploreChart(chartId: string) {
    const currentConfigs = this.exploreChartConfigs;
    const currentLayouts = this.exploreChartLayouts;
    const newConfigs = currentConfigs.filter((config) => config.chartId !== chartId);
    // Filter the layouts for the main and sm breakpoints
    const filteredMain = (currentLayouts.main || []).filter((layout) => layout.i !== chartId);
    const filteredSm = (currentLayouts.sm || []).filter((layout) => layout.i !== chartId);
    const newLayouts = { ...currentLayouts, main: compact(filteredMain, 'vertical', 2), ...(currentLayouts.sm ? { sm: compact(filteredSm, 'vertical', 1) } : {}) };
    this.actions.updateExploreState({ chartConfigs: newConfigs, chartLayouts: newLayouts }, 'Remove Explore Chart');
    this._transientExploreLayouts = null;
  }

  updateExploreChartConfig(updatedConfig: ExploreChartConfig) {
    this.exploreChartConfigs = this.exploreChartConfigs.map((cfg) => (cfg.chartId === updatedConfig.chartId ? updatedConfig : cfg));
  }
  // endregion

  // region Filters

  get initialFilterValues() {
    return this._initialFilterValues;
  }

  get filterValues() {
    const { state } = this;
    const rawFilters = state.filterValues;
    if (!rawFilters || Object.keys(rawFilters).length === 0) {
      return this._initialFilterValues;
    }

    const mergedFilters = {
      ...this._initialFilterValues,
      ...rawFilters,
      departmentIds: Array.isArray(rawFilters.departmentIds) ? rawFilters.departmentIds : this._initialFilterValues.departmentIds,
      procedureIds: Array.isArray(rawFilters.procedureIds) ? rawFilters.procedureIds : this._initialFilterValues.procedureIds,
    };

    return {
      ...mergedFilters,
      dateFrom: new Date(mergedFilters.dateFrom),
      dateTo: new Date(mergedFilters.dateTo),
    };
  }

  /**
   * Sets a filter value and updates the state
   * @param key The key of the filter value to set
   * @param value The value to set
   */
  setFilterValue<T extends keyof typeof this._initialFilterValues>(key: T, value: typeof this._initialFilterValues[T]) {
    let val: ApplicationState['filterValues'][keyof ApplicationState['filterValues']] | typeof this._initialFilterValues[T] = value;

    // If the key is dateFrom or dateTo, parse the value as a date
    if (key === 'dateFrom' || key === 'dateTo') {
      if (typeof value === 'string') {
        val = safeParseDate(value).toISOString();
      } else if (value instanceof Date) {
        val = value.toISOString();
      }
    }

    // Update the filter value
    this.actions.updateFilter(key as keyof ApplicationState['filterValues'], val as ApplicationState['filterValues'][keyof ApplicationState['filterValues']]);
  }

  setProcedureFilters(departmentIds: string[], procedureIds: string[]) {
    this.actions.updateProcedureFilters({
      departmentIds: [...departmentIds],
      procedureIds: [...procedureIds],
    });
  }

  async calculateDefaultFilterValues() {
    if (!this.duckDB) return;
    // Default filter values based on visit-level min and max values
    const result = await this.duckDB.query(`
      WITH visit_rollups AS (
        SELECT
          visit_no,
          MIN(adm_dtm) AS min_adm_dtm,
          MAX(dsch_dtm) AS max_dsch_dtm,
          SUM(COALESCE(rbc_units, 0)) AS rbc_units,
          SUM(COALESCE(ffp_units, 0)) AS ffp_units,
          SUM(COALESCE(plt_units, 0)) AS plt_units,
          SUM(COALESCE(cryo_units, 0)) AS cryo_units,
          SUM(COALESCE(cell_saver_ml, 0)) AS cell_saver_ml,
          MAX(COALESCE(los, 0)) AS los
        FROM visits
        GROUP BY visit_no
      )
      SELECT
        MIN(min_adm_dtm) AS min_adm,
        MAX(max_dsch_dtm) AS max_dsch,
        MIN(rbc_units) AS min_rbc,
        MAX(rbc_units) AS max_rbc,
        MIN(ffp_units) AS min_ffp,
        MAX(ffp_units) AS max_ffp,
        MIN(plt_units) AS min_plt,
        MAX(plt_units) AS max_plt,
        MIN(cryo_units) AS min_cryo,
        MAX(cryo_units) AS max_cryo,
        MIN(cell_saver_ml) AS min_cell_saver,
        MAX(cell_saver_ml) AS max_cell_saver,
        MIN(los) AS min_los,
        MAX(los) AS max_los
      FROM visit_rollups;
    `);
    const row = result.toArray()[0].toJSON();

    const dateFrom = safeParseDate(row.min_adm);
    const dateTo = safeParseDate(row.max_dsch);
    this._initialFilterValues = {
      ...this._initialFilterValues,
      dateFrom,
      dateTo,
      rbc_units: [Number(row.min_rbc), Number(row.max_rbc)],
      ffp_units: [Number(row.min_ffp), Number(row.max_ffp)],
      plt_units: [Number(row.min_plt), Number(row.max_plt)],
      cryo_units: [Number(row.min_cryo), Number(row.max_cryo)],
      cell_saver_ml: [Number(row.min_cell_saver), Number(row.max_cell_saver)],
      los: [Number(row.min_los), Number(row.max_los)],
    };
  }

  /**
   * Returns the number of date filters that are applied
   */
  get dateFiltersAppliedCount(): number {
    const filters = this.filterValues;
    const dateFrom = safeParseDate(filters.dateFrom);
    const dateTo = safeParseDate(filters.dateTo);
    const initDateFrom = safeParseDate(this._initialFilterValues.dateFrom);
    const initDateTo = safeParseDate(this._initialFilterValues.dateTo);
    return (dateFrom.getTime() !== initDateFrom.getTime() || dateTo.getTime() !== initDateTo.getTime()) ? 1 : 0;
  }

  /**
   * Returns the number of outcome filters that are applied
   */
  get outcomeFiltersAppliedCount(): number {
    let count = 0;
    const filters = this.filterValues;
    const keys = ['los', 'death', 'vent', 'stroke', 'ecmo'] as const;
    keys.forEach((key) => {
      if (key === 'los' ? (filters.los[0] !== this._initialFilterValues.los[0] || filters.los[1] !== this._initialFilterValues.los[1]) : filters[key] !== this._initialFilterValues[key]) {
        count += 1;
      }
    });
    return count;
  }

  /**
   * Returns the number of medication filters that are applied
   */
  get medicationsFiltersAppliedCount(): number {
    let count = 0;
    const filters = this.filterValues;
    const keys = ['b12', 'iron', 'antifibrinolytic'] as const;
    keys.forEach((key) => {
      if (filters[key] !== this._initialFilterValues[key]) count += 1;
    });
    return count;
  }

  /**
   * Returns the number of blood component filters that are applied
   */
  get bloodComponentFiltersAppliedCount(): number {
    let count = 0;
    const filters = this.filterValues;
    const keys = BLOOD_PRODUCTS_ARRAY;
    keys.forEach((key) => {
      const [min, max] = filters[key] as [number, number];
      const [initMin, initMax] = this._initialFilterValues[key] as [number, number];
      if (min !== initMin || max !== initMax) count += 1;
    });
    return count;
  }

  /**
   * Returns the number of department/procedure filters that are applied
   */
  get procedureFiltersAppliedCount(): number {
    let count = 0;
    const { departmentIds, procedureIds } = this.filterValues;
    if (departmentIds.length > 0) count += 1;
    if (procedureIds.length > 0) count += 1;
    return count;
  }

  /**
   * Returns number of departments represented by current department/procedure filters.
   */
  get procedureDepartmentsAppliedCount(): number {
    const { departmentIds, procedureIds } = this.filterValues;
    const involvedDepartmentIds = new Set(departmentIds);

    for (const procedureId of procedureIds) {
      if (procedureId) {
        const separatorIndex = procedureId.indexOf('__');
        if (separatorIndex > 0) {
          involvedDepartmentIds.add(procedureId.slice(0, separatorIndex));
        }
      }
    }

    return involvedDepartmentIds.size;
  }

  /**
   * Returns the total number of filters that are applied
   */
  get totalFiltersAppliedCount(): number {
    return this.dateFiltersAppliedCount
      + this.bloodComponentFiltersAppliedCount
      + this.medicationsFiltersAppliedCount
      + this.outcomeFiltersAppliedCount
      + this.procedureFiltersAppliedCount;
  }

  resetAllFilters() {
    this.actions.resetAllFilters();
  }

  resetDateFilters() {
    this.actions.resetDateFilters({
      dateFrom: this._initialFilterValues.dateFrom.toISOString(),
      dateTo: this._initialFilterValues.dateTo.toISOString(),
    });
  }

  resetBloodComponentFilters() {
    this.actions.resetBloodComponentFilters({
      rbc_units: [...this._initialFilterValues.rbc_units],
      ffp_units: [...this._initialFilterValues.ffp_units],
      plt_units: [...this._initialFilterValues.plt_units],
      cryo_units: [...this._initialFilterValues.cryo_units],
      cell_saver_ml: [...this._initialFilterValues.cell_saver_ml],
    });
  }

  resetMedicationsFilters() {
    this.actions.resetMedicationsFilters({
      b12: this._initialFilterValues.b12,
      iron: this._initialFilterValues.iron,
      antifibrinolytic: this._initialFilterValues.antifibrinolytic,
    });
  }

  resetOutcomeFilters() {
    this.actions.resetOutcomeFilters({
      los: [...this._initialFilterValues.los],
      death: this._initialFilterValues.death,
      vent: this._initialFilterValues.vent,
      stroke: this._initialFilterValues.stroke,
      ecmo: this._initialFilterValues.ecmo,
    });
  }

  resetProcedureFilters() {
    this.actions.resetProcedureFilters({
      departmentIds: [...this._initialFilterValues.departmentIds],
      procedureIds: [...this._initialFilterValues.procedureIds],
    });
  }

  /**
   * Generates histogram data for the filter sliders
   */
  async generateHistogramData() {
    if (!this.duckDB) return;
    const components = [...BLOOD_PRODUCTS_ARRAY, 'los'];
    const histogramData: Record<string, { units: string, count: number }[]> = {};
    // For each component, generate histogram data
    await Promise.all(components.map(async (component) => {
      const visitValueExpression = component === 'los'
        ? 'MAX(COALESCE(los, 0))'
        : `SUM(COALESCE(${component}, 0))`;

      const histogramDataQueryResult = await this.duckDB!.query(`
        WITH visit_values AS (
          SELECT
            visit_no,
            ${visitValueExpression} AS visit_value
          FROM filteredVisits
          GROUP BY visit_no
        ),
        histogram_bins AS (
          SELECT
            CASE
              WHEN '${component}' = 'cell_saver_ml' THEN
                CASE
                  WHEN visit_value = 0 THEN 0
                  ELSE CEIL(visit_value / 50.0) * 50
                END
              ELSE
                visit_value
            END AS bin_value
          FROM visit_values
          WHERE visit_value IS NOT NULL
        )
        SELECT
          bin_value,
          COUNT(*) AS visit_count
        FROM histogram_bins
        GROUP BY bin_value
        ORDER BY bin_value;`);
      // Map the result to the histogram data
      histogramData[component] = histogramDataQueryResult
        .toArray()
        .map((row) => {
          // eslint-disable-next-line camelcase
          const { bin_value, visit_count } = row.toJSON();

          return {
            units: String(bin_value),
            count: Number(visit_count),
          };
        });
    }));
    this.histogramData = histogramData;
  }
  // endregion

  // region Selections

  async addSelectedTimePeriod(timePeriod: string) {
    if (!timePeriod) return;
    const next = new Set<string>(this.selectedTimePeriods);
    for (const p of expandTimePeriod(timePeriod)) next.add(p);
    this.actions.updateSelection(Array.from(next));
  }

  async removeSelectedTimePeriod(timePeriod: string) {
    if (!timePeriod) return;
    const next = new Set<string>(this.selectedTimePeriods);
    for (const p of expandTimePeriod(timePeriod)) next.delete(p);
    this.actions.updateSelection(Array.from(next));
  }

  resetSelections() {
    this.actions.clearSelection();
  }

  async getVisitInfo(visitNo: number) {
    if (!this.duckDB) return null;
    const result = await this.duckDB.query(`SELECT * FROM filteredVisits WHERE visit_no = ${visitNo}`);
    return result.toArray().map((row) => row.toJSON())[0] || null;
  }

  async updateSelectedVisits() {
    if (!this.duckDB) return;
    // Only match month-level selections (e.g., 2020-Jan)
    const monthRe = /^\d{4}-[A-Za-z]{3}$/;
    const months = this.selectedTimePeriods.filter((p) => monthRe.test(p));
    if (months.length === 0) {
      this.selectedVisits = [];
      this.selectedVisitNos = [];
      return;
    }
    // Escape single quotes for SQL strings
    const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
    const result = await this.duckDB.query(`SELECT visit_no FROM filteredVisits WHERE month IN (${months.map(q).join(', ')})`);
    this.selectedVisitNos = result.toArray().map((row) => Number(row.toJSON().visit_no));
  }
  // endregion

  // region Reactions

  // React to filter, selection, and configuration changes by updating the data
  initReactions() {
    reaction(
      () => this.state.filterValues,
      async () => { await this.updateFilteredData(); },
      { fireImmediately: false },
    );
    reaction(
      () => [this.state.dashboard.chartConfigs, this.state.dashboard.statConfigs],
      async () => {
        await this.computeDashboardChartData();
        await this.computeDashboardStatData();
      },
    );
    reaction(
      () => this.state.selections.selectedTimePeriods,
      async () => { await this.updateSelectedVisits(); },
    );
    reaction(
      () => this.state.settings.unitCosts,
      async () => { await this.updateCostsTable(); },
    );
    reaction(
      () => this.state.explore.chartConfigs,
      async () => { await this.computeExploreChartData(); },
    );
  }

  // endregion

  // region Data Update Functions

  async updateFilteredData() {
    if (!this.duckDB) return;
    const { filterValues } = this;
    if (!filterValues.dateFrom || !filterValues.dateTo) return;
    const dateFrom = filterValues.dateFrom.toISOString();
    const dateTo = filterValues.dateTo.toISOString();

    // Generate the visit-level HAVING conditions --------
    const visitFilterConditions: string[] = [];
    const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

    const sumRangeFilterKeys = ['rbc_units', 'ffp_units', 'plt_units', 'cryo_units', 'cell_saver_ml'] as const;
    sumRangeFilterKeys.forEach((key) => {
      const [min, max] = filterValues[key];
      const [initialMin, initialMax] = this._initialFilterValues[key];
      if (min !== initialMin || max !== initialMax) {
        visitFilterConditions.push(`SUM(COALESCE(${key}, 0)) BETWEEN ${min} AND ${max}`);
      }
    });

    const [losMin, losMax] = filterValues.los;
    const [initialLosMin, initialLosMax] = this._initialFilterValues.los;
    if (losMin !== initialLosMin || losMax !== initialLosMax) {
      visitFilterConditions.push(`MAX(COALESCE(los, 0)) BETWEEN ${losMin} AND ${losMax}`);
    }

    const booleanFilterKeys = ['b12', 'iron', 'antifibrinolytic', 'death', 'vent', 'stroke', 'ecmo'] as const;
    booleanFilterKeys.forEach((key) => {
      const value = filterValues[key];
      if (typeof value === 'boolean') {
        visitFilterConditions.push(`BOOL_OR(CAST(COALESCE(${key}, 0) AS INTEGER) = ${value ? 1 : 0})`);
      }
    });

    // Use list-native predicates to avoid UNNEST/CTE rescans on each filter update.
    // Only allow slug-like IDs (alphanumeric, underscore, hyphen) to be interpolated into SQL.
    const safeIdPattern = /^[A-Za-z0-9_-]+$/;

    if (filterValues.departmentIds.length > 0) {
      const safeDepartmentIds = filterValues.departmentIds.filter((id) => safeIdPattern.test(id));
      if (safeDepartmentIds.length > 0) {
        const departmentIdList = safeDepartmentIds.map(sqlString).join(', ');
        visitFilterConditions.push(`BOOL_OR(list_has_any(department_ids, [${departmentIdList}]::VARCHAR[]))`);
      }
    }

    if (filterValues.procedureIds.length > 0) {
      const safeProcedureIds = filterValues.procedureIds.filter((id) => safeIdPattern.test(id));
      if (safeProcedureIds.length > 0) {
        const procedureIdList = safeProcedureIds.map(sqlString).join(', ');
        visitFilterConditions.push(`BOOL_OR(list_has_any(procedure_ids, [${procedureIdList}]::VARCHAR[]))`);
      }
    }

    // Add date filters if applied
    if (this.dateFiltersAppliedCount > 0) {
      visitFilterConditions.push(`BOOL_OR(adm_dtm BETWEEN '${dateFrom}' AND '${dateTo}')`);
    }

    // Join the visit-level filter conditions with AND
    const visitFiltersToApply = visitFilterConditions.join(' AND ');

    // Query to filter the filteredVisitIds table at visit level --------
    await this.duckDB.query(`
      TRUNCATE TABLE filteredVisitIds;
      INSERT INTO filteredVisitIds
        SELECT visit_no
        FROM visits
        GROUP BY visit_no
        ${visitFiltersToApply ? `HAVING ${visitFiltersToApply}` : ''}
        ;
    `);

    // Update all the data retrievers
    await this.updateFilteredVisitsLength();
    await this.computeDashboardChartData();
    await this.computeDashboardStatData();
    await this.computeExploreChartData();
    await this.generateHistogramData();
    await this.updateSelectedVisits();

    // Refresh provider view data if active
    if (this.providersStore) {
      await this.providersStore.fetchProviderList(this.providersStore.dateStart, this.providersStore.dateEnd);
      await this.providersStore.getProviderCharts(this.providersStore.dateStart, this.providersStore.dateEnd);
      if (this.providersStore.selectedProvider) {
        await this.providersStore.fetchSelectedProvSurgCount(this.providersStore.dateStart, this.providersStore.dateEnd);
        await this.providersStore.fetchSelectedProvRbcUnits(this.providersStore.dateStart, this.providersStore.dateEnd);
        await this.providersStore.fetchCmiComparison(this.providersStore.dateStart, this.providersStore.dateEnd);
      }
    }
  }

  async computeExploreChartData(): Promise<void> {
    const promises = this.exploreChartConfigs.map(async (config) => {
      if (config.chartType === 'exploreTable') {
        // Configuration of table (rowVar, columns, aggregation, etc.)
        const tableConfig = config as ExploreTableConfig;

        // Build column selection clauses based on config.columns
        const columnClauses: string[] = [];

        // Iterate over the columns and build the column selection clauses
        tableConfig.columns.forEach((col) => {
          const { colVar } = col;
          let colAggregation = config.aggregation || col.aggregation;

          if (colAggregation === 'none' && colVar !== tableConfig.rowVar) {
            colAggregation = 'sum';
          }

          const aggFn = colAggregation.toUpperCase();

          // If this column is the grouping variable, select it directly
          if (colVar === tableConfig.rowVar) {
            columnClauses.push(colVar);
            return;
          }

          // Special case: percent_*_rbc columns
          if (colVar.startsWith('percent_')) {
            const match = colVar.match(/percent_(\d+|above_5)_rbc/);
            if (match) {
              const count = match[1];
              const condition = count === 'above_5' ? 'rbc_units >= 5' : `rbc_units = ${count}`;

              if (colAggregation === 'avg') {
                columnClauses.push(`AVG(CAST(${condition} AS INT)) * 100.0 AS ${colVar}`);
              } else if (colAggregation === 'sum') {
                columnClauses.push(`SUM(CAST(${condition} AS INT)) AS ${colVar}`);
              }
            }
            return;
          }

          // Special case: cases (visit count)
          if (colVar === 'cases') {
            columnClauses.push(`COUNT(*) AS ${colVar}`);
            return;
          }

          // Special case: identity columns (attending_provider, year, quarter) - return strings (e.g. Dr. Provider)
          if (['attending_provider', 'year', 'quarter'].includes(colVar)) {
            if (colVar === tableConfig.rowVar) {
              columnClauses.push(`${colVar}`);
            } else {
              columnClauses.push(`string_agg(DISTINCT CAST(${colVar} AS VARCHAR), ', ') AS ${colVar}`);
            }
            return;
          }

          // Special case: total_cost (stacked bar components)
          if (colVar === 'total_cost') {
            const comps = ['rbc_units_cost', 'ffp_units_cost', 'plt_units_cost', 'cryo_units_cost', 'whole_cost'];
            comps.forEach((c) => {
              columnClauses.push(`${aggFn}(${c}) AS ${c.replace('_units_cost', '_cost')}`);
            });
            columnClauses.push(`${aggFn}(${comps.join(' + ')}) AS total_cost`);
            return;
          }

          // Special case: salvage_savings
          if (colVar === 'salvage_savings') {
            columnClauses.push(`${aggFn}(cell_saver_cost) AS salvage_savings`);
            return;
          }

          // Standard numeric & boolean fields
          const booleanFields = ['death', 'vent', 'stroke', 'ecmo', 'b12', 'iron', 'antifibrinolytic'];
          if (booleanFields.includes(colVar) && (colAggregation === 'avg' || colAggregation === 'sum')) {
            if (colAggregation === 'avg') {
              // Calculate percentage: AVG(1|0) * 100
              columnClauses.push(`AVG(CAST(${colVar} AS INT)) * 100.0 AS ${colVar}`);
            } else {
              // Count occurrences: SUM(1|0)
              columnClauses.push(`SUM(CAST(${colVar} AS INT)) AS ${colVar}`);
            }
          } else if (col.type === 'violin') {
            // Special case for violin: fetch all values as a list for distribution
            // We use apr_drg_weight specifically for drg_weight colVar
            const dbCol = colVar === 'drg_weight' ? 'apr_drg_weight' : colVar;
            columnClauses.push(`list(CAST(${dbCol} AS DOUBLE)) AS ${colVar}`);
          } else {
            // Standard numeric aggregation
            columnClauses.push(`${aggFn}(${colVar}) AS ${colVar}`);
          }
        });

        // Ensure the grouping variable is selected
        if (!columnClauses.some((clause) => clause.includes(tableConfig.rowVar) && !clause.includes('STRING_AGG'))) {
          columnClauses.unshift(tableConfig.rowVar);
        }

        // Build the query
        const query = `
          SELECT
            ${columnClauses.join(',\n            ')}
          FROM filteredVisits
          GROUP BY ${tableConfig.rowVar}
          ORDER BY ${tableConfig.rowVar};
        `;

        try {
          const queryResult = await this.duckDB!.query(query);
          const rows = queryResult.toArray().map((row: { toJSON: () => unknown }) => row.toJSON() as unknown as ExploreTableRow);

          if (tableConfig.twoValsPerRow) {
            console.warn('twoValsPerRow is not yet fully implemented, using basic data');
          }

          return { id: config.chartId, data: rows };
        } catch (error) {
          console.error('Error executing explore table query:', error);
          return { id: config.chartId, data: [] };
        }
      }
      if (config.chartType === 'dumbbell') {
        // TODO: Don't limit to only 10,000 surgeries.
        const query = `
          SELECT
             CAST(case_id AS VARCHAR) as case_id,
             surgeon_prov_id,
             surgeon_prov_name,
             CAST(visit_no AS VARCHAR) as visit_no,
             pre_hgb,
             post_hgb,

             pre_plt,
             post_plt,
             pre_fibrinogen,
             post_fibrinogen,
             pre_inr,
             post_inr,
             anesth_prov_id,
             anesth_prov_name,
             intraop_rbc_units,
             intraop_plt_units,
             intraop_cryo_units,
             intraop_ffp_units,
             intraop_whole_units,
             intraop_cell_saver_ml,
             (CAST(epoch(surgery_start_dtm) AS DOUBLE) * 1000) as surgery_start_dtm
          FROM filteredSurgeryCases
          ORDER BY surgery_start_dtm
          LIMIT 10000
        `;
        try {
          const result = await this.duckDB!.query(query);
          const data = result.toArray().map((row) => row.toJSON());
          return { id: config.chartId, data };
        } catch (error) {
          console.error('Error executing dumbbell query:', error);
          return { id: config.chartId, data: [] };
        }
      }
      if (config.chartType === 'scatterPlot') {
        // TODO: Don't limit to only 10,000 surgeries.
        const query = `
           SELECT
             CAST(case_id AS VARCHAR) as case_id,
             surgeon_prov_id,
             surgeon_prov_name,
             anesth_prov_id,
             anesth_prov_name,
             year,
             quarter,
             month,

             intraop_rbc_units AS rbc_units,
             intraop_ffp_units AS ffp_units,
             intraop_plt_units AS plt_units,
             intraop_cryo_units AS cryo_units,
             intraop_whole_units AS whole_units,
             intraop_cell_saver_ml AS cell_saver_ml,

             los,
             death,
             vent,
             stroke,
             ecmo,

             pre_hgb, post_hgb,
             pre_plt, post_plt,
             pre_fibrinogen, post_fibrinogen,
             pre_inr, post_inr,

             total_cost,
             rbc_cost
           FROM filteredSurgeryCases
           LIMIT 10000
        `;
        try {
          const result = await this.duckDB!.query(query);
          const data = result.toArray().map((row) => row.toJSON());

          // We need to group by the 'grouping variable'.
          const groupingVar = 'groupingVar' in config ? String((config as Record<string, unknown>).groupingVar) : 'surgeon_prov_id';

          // We can do the grouping in JS.
          const grouped: Record<string, Record<string, unknown>[]> = {};
          data.forEach((row) => {
            const key = String(row[groupingVar] || 'Unknown');
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(row as Record<string, unknown>);
          });

          const formattedData = Object.entries(grouped).map(([name, groupData]) => ({
            name,
            data: groupData,
          }));

          return { id: config.chartId, data: formattedData };
        } catch (error) {
          console.error('Error executing scatter query:', error);
          return { id: config.chartId, data: [] };
        }
      }
      return { id: config.chartId, data: [] };
    });

    const results = await Promise.all(promises);
    const data: ExploreChartData = {};
    results.forEach(({ id, data: d }) => {
      data[id] = d;
    });

    this.exploreChartData = data;
  }

  async updateFilteredVisitsLength() {
    if (!this.duckDB) return;
    const result = await this.duckDB.query('SELECT COUNT(DISTINCT visit_no) AS count FROM filteredVisitIds;');
    this.filteredVisitsLength = Number(result.toArray()[0].toJSON().count);
  }

  async updateAllVisitsLength() {
    if (!this.duckDB) return;
    const result = await this.duckDB.query('SELECT COUNT(DISTINCT visit_no) AS count FROM visits;');
    this.allVisitsLength = Number(result.toArray()[0].toJSON().count);
  }

  async updateCostsTable() {
    if (!this.duckDB) return;
    await this.duckDB.query(`
      DELETE FROM costs;
      INSERT INTO costs VALUES (${this.unitCosts.rbc_units_cost}, ${this.unitCosts.ffp_units_cost}, ${this.unitCosts.plt_units_cost}, ${this.unitCosts.cryo_units_cost}, ${this.unitCosts.whole_cost}, ${this.unitCosts.cell_saver_cost});
    `);
    await this.computeDashboardStatData();
    await this.computeDashboardChartData();
  }
  // endregion
}

export const Store = createContext(new RootStore());
