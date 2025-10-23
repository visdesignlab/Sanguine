import { makeAutoObservable } from 'mobx';
import type { RootStore } from './Store';
import { AGGREGATION_OPTIONS, dashboardYAxisOptions, ProviderChartConfig, ProviderChartData } from '../Types/application';

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
      chartId: '0', xAxisVar: 'month', yAxisVar: 'rbc_adherent', aggregation: 'avg', chartType: 'bar', group: 'Anemia Management',
    },
    {
      chartId: '1', xAxisVar: 'quarter', yAxisVar: 'ffp_adherent', aggregation: 'avg', chartType: 'bar', group: 'Anemia Management',
    },
    {
      chartId: '2', xAxisVar: 'quarter', yAxisVar: 'plt_adherent', aggregation: 'avg', chartType: 'bar', group: 'Anemia Management',
    },
    {
      chartId: '0', xAxisVar: 'month', yAxisVar: 'death', aggregation: 'avg', chartType: 'bar', group: 'Outcomes',
    },
    {
      chartId: '1', xAxisVar: 'quarter', yAxisVar: 'stroke', aggregation: 'avg', chartType: 'bar', group: 'Outcomes',
    },
    {
      chartId: '2', xAxisVar: 'quarter', yAxisVar: 'los', aggregation: 'avg', chartType: 'bar', group: 'Outcomes',
    },
  ];

  get chartConfigs() {
    return this._chartConfigs;
  }

  set chartConfigs(input: ProviderChartConfig[]) {
    this._chartConfigs = input;
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
      const selectClauses = this._chartConfigs.flatMap(({ yAxisVar }) => (
        Object.keys(AGGREGATION_OPTIONS).flatMap((aggregation) => {
          const aggFn = aggregation.toUpperCase();

          // Special case: Sum of all blood product costs
          if (yAxisVar === 'total_blood_product_cost') {
            return [
              `${aggFn}(rbc_units_cost) AS ${aggregation}_rbc_units_cost`,
              `${aggFn}(plt_units_cost) AS ${aggregation}_plt_units_cost`,
              `${aggFn}(ffp_units_cost) AS ${aggregation}_ffp_units_cost`,
              `${aggFn}(cryo_units_cost) AS ${aggregation}_cryo_units_cost`,
              `${aggFn}(cell_saver_cost) AS ${aggregation}_cell_saver_cost`,
            ];
          }

          if (yAxisVar === 'case_mix_index') {
            return `SUM(ms_drg_weight) / COUNT(visit_no) AS ${aggregation}_case_mix_index`;
          }

          // Return aggregated attribute. (E.g. "SUM(rbc_units) AS sum_rbc_units")
          return `${aggFn}(${yAxisVar}) AS ${aggregation}_${yAxisVar}`;
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

      // Helper to round values appropriately
      const roundVal = (num: number) => {
        if (!Number.isFinite(num)) return NaN;
        return Math.abs(num - Math.round(num)) < 1e-9 ? Math.round(num) : Math.round(num * 10) / 10;
      };

      // --- For each chart config, build the histogram chart data ---
      this._chartConfigs.forEach((cfg) => {
        const yVar = cfg.yAxisVar;
        const chartKey = `${cfg.chartId}_${yVar}`;
        const aggregation = cfg.aggregation || 'avg';

        // --- Build histogram chart data for providers ---
        const provCounts = new Map<number, number>();
        rows.forEach((r) => {
          // Use rounded value as bin
          const value = r[`avg_${yVar}`];
          if (value === null || value === undefined || Number.isNaN(Number(value))) return;
          const bin = roundVal(Number(value));
          if (Number.isNaN(bin)) return;
          // Increment count for this bin
          provCounts.set(bin, (provCounts.get(bin) || 0) + 1);
        });

        // Build sorted histogram data array
        const providerHistogramData = Array.from(provCounts.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([val, count]) => ({
            [yVar]: val,
            'Number of Providers': count,
          }));

        // --- Determine provider-specific marks for comparison to histogram ---
        let providerMark: number | undefined;
        let providerName: string | null = null;
        if (this.selectedProvider) {
          const match = rows.find((r) => String(r.attending_provider) === String(this.selectedProvider));
          const matchVal = match ? match[`avg_${yVar}`] : undefined;
          if (match && matchVal !== null && matchVal !== undefined && !Number.isNaN(Number(matchVal))) {
            providerMark = roundVal(Number(matchVal));
            providerName = String(match.attending_provider);
          }
        }

        // TODO: Update recommended and best marks based on provider benchmarks
        const recommendedMark = (providerMark !== undefined && !Number.isNaN(providerMark))
          ? roundVal(providerMark * 1.2)
          : undefined;
        const bestMark = (providerMark !== undefined && !Number.isNaN(providerMark))
          ? roundVal(providerMark * 1.5)
          : undefined;

        // --- Save Chart ---
        // Get chart title
        const chartYAxis = dashboardYAxisOptions.find((o) => o.value === yVar);
        const chartTitle = chartYAxis?.label?.[aggregation] ?? yVar;

        // Save chart
        charts[chartKey] = {
          group: cfg.group || 'Ungrouped',
          title: chartTitle,
          data: providerHistogramData,
          dataKey: yVar,
          orientation: 'horizontal',
          bestMark,
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
