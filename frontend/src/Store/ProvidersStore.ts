import { makeAutoObservable } from 'mobx';
import type { RootStore } from './Store';
import {
  AGGREGATION_OPTIONS, dashboardYAxisOptions, ProviderChart, ProviderChartConfig, ProviderChartData,
  providerXAxisOptions,
} from '../Types/application';
import { compareTimePeriods } from '../Utils/dates';
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
        SELECT COUNT(DISTINCT visit_no) AS cnt
        FROM filteredVisits
        WHERE attending_provider = '${prov}' ${dateClause};
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
      chartId: '0', xAxisVar: 'quarter', yAxisVar: 'rbc_adherent', aggregation: 'avg', chartType: 'time-series-line', group: 'Anemia Management',
    },
    {
      chartId: '1', xAxisVar: 'ffp_adherent', yAxisVar: 'attending_provider', aggregation: 'avg', chartType: 'population-histogram', group: 'Anemia Management',
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
      else if (rel >= 0.7) label = 'higher than average';
      else if (rel >= 0.03) label = 'slightly higher than average';
      else if (rel <= -0.15) label = 'much lower than average';
      else if (rel <= -0.7) label = 'lower than average';
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
        WHERE attending_provider IS NOT NULL
        ORDER BY attending_provider;
        `;
      // Note: because we may have prefixed WHERE above, ensure query correctness by replacing double WHERE sequence.
      // Quick fix: if dateClause provided, the query will have "FROM filteredVisits\n WHERE ...\n WHERE attending_provider IS NOT NULL"
      // Normalize:
      const normalizedQuery = query.replace(/\n\s*WHERE\s+attending_provider/, (m) => (dateClause ? '\n AND attending_provider' : m));

      const res = await this._rootStore.duckDB.query(normalizedQuery);
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
          return `${aggFn}(${xAxisVar}) AS ${aggregation}_${xAxisVar}`;
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
          selectClause = `${aggFn}(${yVar}) AS ${alias}`;
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
        console.log("Executing line chart (all providers) query:", allQuery);
        console.log("Line chart (all providers) query results:", lineRowsAll);

        let lineRowsSel: Array<Record<string, unknown>> = [];
        if (selQuery) {
          const selRes = await this._rootStore.duckDB.query(selQuery);
          lineRowsSel = selRes.toArray().map((r) => r.toJSON());
        }

        console.log('Line chart (all) query results:', lineRowsAll);
        console.log('Line chart (selected provider) query results:', lineRowsSel);

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
              return compareTimePeriods(a[xVar] as any, b[xVar] as any);
            } catch {
              return 0;
            }
          });

          // Chart title & recommended mark (if provided in y-axis options)
          const yOption = dashboardYAxisOptions.find((o) => o.value === yVar) as any | undefined;
          const chartTitle = yOption?.label?.[agg as 'sum' | 'avg'] ?? String(yVar);
          const recommendedMark = yOption?.recommendation?.[agg] ?? NaN;

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
      console.log('Built provider charts:', this.providerChartData);
      return this.providerChartData;
    } catch (e) {
      // Error handling
      console.error('Error building provider charts:', e);
      this.providerChartData = {};
      return this.providerChartData;
    }
  }
}
