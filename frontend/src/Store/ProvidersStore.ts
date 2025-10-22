import { makeAutoObservable } from 'mobx';
import type { RootStore } from './Store';
import { dashboardYAxisOptions, ProviderChartData } from '../Types/application';

type ProviderChart = {
    group?: string;
    title: string;
    data: Array<Record<string, string | number | boolean | null>>;
    dataKey: string;
    bestMark?: number;
    recommendedMark?: number;
    providerMark?: number;
    providerName?: string | null;
    orientation: 'horizontal' | 'vertical';
  };

/**
 * ProvidersStore manages provider data for the provider view.
 */
export class ProvidersStore {
  _rootStore: RootStore;

  providerChartData: ProviderChartData = {};

  providerList: string[] = [];

  // backing field for selectedProvider — use getter/setter so changes trigger chart recalculation
  _selectedProvider: string | null = null;

  get selectedProvider(): string | null {
    return this._selectedProvider;
  }

  set selectedProvider(val: string | null) {
    if (this._selectedProvider === val) return;
    this._selectedProvider = val;
    // Recompute charts when selected provider changes. Fire-and-forget; errors logged.
    this.getProviderCharts().catch((e) => {
      console.error('Error refreshing provider charts after provider change:', e);
    });
  }

  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;
    makeAutoObservable(this);
  }

  // Chart configurations by default
  _chartConfigs = [
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

  set chartConfigs(input: any[]) {
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
      const charts: Record<string, ProviderChart> = {};

      for (const cfg of this._chartConfigs) {
        const yVar = cfg.yAxisVar;
        const chartKey = `${cfg.chartId}_${yVar}`;
        const aggregation = cfg.aggregation || 'avg';

        // Query average per provider for this metric
        const query = `
          SELECT attending_provider, AVG(${yVar}) AS avg_val
          FROM filteredVisits
          WHERE attending_provider IS NOT NULL
          GROUP BY attending_provider;
        `;
        const res = await this._rootStore.duckDB.query(query);
        const rows = res.toArray().map((r) => r.toJSON());

        // helper to round values same way we bucket them
        const roundVal = (num: number) => {
          if (!Number.isFinite(num)) return NaN;
          return Math.abs(num - Math.round(num)) < 1e-9 ? Math.round(num) : Math.round(num * 10) / 10;
        };

        // Build a simple frequency distribution (bucket by rounded value)
        const freq = new Map<number, number>();
        rows.forEach((r) => {
          const raw = r.avg_val;
          if (raw === null || raw === undefined || Number.isNaN(Number(raw))) return;
          const num = Number(raw);
          const rounded = roundVal(num);
          if (Number.isNaN(rounded)) return;
          freq.set(rounded, (freq.get(rounded) || 0) + 1);
        });

        const data = Array.from(freq.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([val, count]) => ({
            [yVar]: val,
            'Number of Providers': count,
          }));

        // Determine provider-specific marks if a provider is selected
        let providerMark: number | undefined;
        let providerName: string | null = null;
        if (this.selectedProvider) {
          const match = rows.find((r) => String(r.attending_provider) === String(this.selectedProvider));
          if (match && match.avg_val !== null && match.avg_val !== undefined && !Number.isNaN(Number(match.avg_val))) {
            providerMark = roundVal(Number(match.avg_val));
            providerName = String(match.attending_provider);
          }
        }

        const recommendedMark = (providerMark !== undefined && !Number.isNaN(providerMark))
          ? roundVal(providerMark * 1.2)
          : undefined;
        const bestMark = (providerMark !== undefined && !Number.isNaN(providerMark))
          ? roundVal(providerMark * 1.5)
          : undefined;

        const chartYAxis = dashboardYAxisOptions.find((o) => o.value === yVar);
        const yLabel = chartYAxis?.label?.[aggregation] ?? yVar;

        charts[chartKey] = {
          group: cfg.group || 'Ungrouped',
          title: yLabel,
          data,
          dataKey: yVar,
          orientation: 'horizontal',
          bestMark,
          recommendedMark,
          providerMark,
          providerName,
        };
      }

      this.providerChartData = charts;

      return this.providerChartData;
    } catch (e) {
      console.error('Error building provider charts:', e);
      this.providerChartData = {};
      return this.providerChartData;
    }
  }
}
