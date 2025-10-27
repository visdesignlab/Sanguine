import { makeAutoObservable } from 'mobx';
import type { RootStore } from './Store';
import {
  AGGREGATION_OPTIONS, dashboardYAxisOptions, ProviderChart, ProviderChartConfig, ProviderChartData,
} from '../Types/application';
import { formatValueForDisplay } from '../Utils/dashboard';

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

  get selectedProvider(): string | null {
    return this._selectedProvider;
  }

  set selectedProvider(val: string | null) {
    if (this._selectedProvider === val) return;
    this._selectedProvider = val;
    // Recompute charts when selected provider changes
    this.getProviderCharts().catch((e) => {
      console.error('Error refreshing provider charts after provider change:', e);
    });
  }

  // Chart configurations by default
  _chartConfigs: ProviderChartConfig[] = [
    {
      chartId: '0', xAxisVar: 'rbc_adherent', yAxisVar: 'attending_provider', aggregation: 'avg', chartType: 'bar', group: 'Anemia Management',
    },
    {
      chartId: '1', xAxisVar: 'ffp_adherent', yAxisVar: 'attending_provider', aggregation: 'avg', chartType: 'bar', group: 'Anemia Management',
    },
    {
      chartId: '2', xAxisVar: 'antifibrinolytic', yAxisVar: 'attending_provider', aggregation: 'avg', chartType: 'bar', group: 'Anemia Management',
    },
    {
      chartId: '3', xAxisVar: 'b12', yAxisVar: 'attending_provider', aggregation: 'avg', chartType: 'bar', group: 'Outcomes',
    },
    {
      chartId: '4', xAxisVar: 'los', yAxisVar: 'attending_provider', aggregation: 'avg', chartType: 'bar', group: 'Outcomes',
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
    this.getProviderCharts();
  }

  /**
   * Removes chart, by ID.
   */
  removeChart(chartId: string) {
    this._chartConfigs = this._chartConfigs.filter((config) => config.chartId !== chartId);
  }

  async fetchProviderList() {
    if (!this._rootStore.duckDB) {
      return [];
    }

    try {
      const query = `
        SELECT DISTINCT attending_provider
        FROM filteredVisits
        WHERE attending_provider IS NOT NULL
        ORDER BY attending_provider;
        `;
      const res = await this._rootStore.duckDB.query(query);
      const rows = res.toArray().map((r) => r.toJSON());
      this.providerList = rows.map((r) => String(r.attending_provider)).filter((v) => v);

      // If no provider is selected yet, pick the first one so UI has a default
      if (!this.selectedProvider && this.providerList.length > 0) {
        this.selectedProvider = this.providerList[0];
      }
    } catch (e) {
      console.error('Error fetching provider list:', e);
      this.providerList = [];
    }

    return this.providerList;
  }

  async getProviderCharts() {
    if (!this._rootStore.duckDB) {
      return {};
    }

    try {
      const charts: ProviderChartData = {};

      // --- Build charts query ---
      const selectClauses = this._chartConfigs.flatMap(({ xAxisVar }) => (
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
          return `${aggFn}(${xAxisVar}) AS ${aggregation}_${xAxisVar}`;
        })
      ));

      const query = `
        SELECT attending_provider, ${selectClauses.join(', ')}
        FROM filteredVisits
        WHERE attending_provider IS NOT NULL
        GROUP BY attending_provider;
      `;

      // --- Execute query ---
      const res = await this._rootStore.duckDB.query(query);
      const rows = res.toArray().map((r) => r.toJSON());

      // --- For each chart config, bin data by x-axis ---
      this._chartConfigs.forEach((cfg) => {
        const yVar = cfg.yAxisVar;
        const xVar = cfg.xAxisVar;
        const chartKey = `${cfg.chartId}_${xVar}`;
        const aggregation = cfg.aggregation || 'avg';

        // TODO: Change to recommendation from application
        const recommendedMark = 0.74;

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
          const min = Math.min(recommendedMark, ...values);
          const max = Math.max(...values, recommendedMark);

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
