import { makeAutoObservable, observable } from 'mobx';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';
import {
  ExploreChartConfig, ExploreTableConfig, ExploreTableColumn, ExploreChartData,
} from '../Types/application';

import { dummyData, dummyDataTwoVals } from '../Components/Views/ExploreView/Charts/exploreTableDummyData';

export class ExploreStore {
  _rootStore: RootStore;

  // Initialize store with the root store
  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;
    makeAutoObservable(this, { chartData: observable.ref });
  }

  _chartLayouts: { [key: string]: Layout[] } = {
    main: [],
  };

  get chartLayouts() {
    return this._chartLayouts;
  }

  set chartLayouts(input: { [key: string]: Layout[] }) {
    this._chartLayouts = input;
  }

  _chartConfigs: ExploreChartConfig[] = [];

  get chartConfigs() {
    return this._chartConfigs;
  }

  set chartConfigs(input: ExploreChartConfig[]) {
    this._chartConfigs = input;
    this.computeChartData();
  }

  // Explore View Chart Data -----------------------------------
  chartData: ExploreChartData = {} as ExploreChartData;

  async computeChartData(): Promise<void> {
    const data: ExploreChartData = {};

    for (const config of this._chartConfigs) {
      if (config.chartType === 'exploreTable') {
        const tableConfig = config as ExploreTableConfig;

        // Build column selection clauses based on config.columns
        const columnClauses: string[] = [];

        const isFiltered = this._rootStore.filteredVisitsLength !== this._rootStore.allVisitsLength;
        const costColumns = ['rbc_units_cost', 'ffp_units_cost', 'plt_units_cost', 'cryo_units_cost', 'cell_saver_cost'];
        const usesCostColumns = tableConfig.columns.some((col) => costColumns.includes(col.colVar));

        const sourceTable = (!isFiltered && !usesCostColumns) ? 'visits' : 'filteredVisits';

        tableConfig.columns.forEach((col) => {
          const { colVar, aggregation } = col;

          // Special case: percent_*_rbc columns
          // These require calculating percentages from RBC unit counts
          if (colVar.startsWith('percent_')) {
            const match = colVar.match(/percent_(\d+|above_5)_rbc/);
            if (match) {
              const count = match[1];
              let condition: string;

              if (count === 'above_5') {
                condition = 'rbc_units >= 5';
              } else {
                condition = `rbc_units = ${count}`;
              }

              // Calculate percentage of visits matching the condition
              if (aggregation === 'avg' || aggregation === 'sum') {
                // Use COUNT FILTER which is faster than SUM CASE
                columnClauses.push(
                  `(COUNT(*) FILTER (WHERE ${condition}) * 100.0 / COUNT(*)) AS ${colVar}`
                );
              } else {
                // For 'none', we'd need individual visit data - use array aggregation
                columnClauses.push(
                  `LIST(CASE WHEN ${condition} THEN 100 ELSE 0 END) AS ${colVar}`
                );
              }
            }
          }
          // Special case: cases (visit count)
          else if (colVar === 'cases') {
            if (aggregation === 'none') {
              // For violin/heatmap, return individual counts as array
              columnClauses.push(`LIST(1) AS ${colVar}`);
            } else {
              columnClauses.push(`COUNT(*) AS ${colVar}`);
            }
          }
          // Special case: attending_provider, year, quarter (text/categorical fields, should be in GROUP BY)
          else if (['attending_provider', 'year', 'quarter'].includes(colVar)) {
            if (colVar === tableConfig.rowVar) {
              columnClauses.push(`${colVar}`);
            } else {
              // Cast to string to ensure consistency (especially for numerical years)
              // Use DISTINCT and avoid massive string composition if possible, but STRING_AGG is needed for "list of values" if not grouping by it
              columnClauses.push(`STRING_AGG(DISTINCT CAST(${colVar} AS STRING), ', ') AS ${colVar}`);
            }
          }
          // Standard numeric fields with aggregation
          else {
            const aggFn = aggregation === 'none' ? 'LIST' : aggregation.toUpperCase();

            // Handle boolean fields (convert to percentage for sum/avg)
            const booleanFields = ['death', 'vent', 'stroke', 'ecmo', 'b12', 'iron', 'antifibrinolytic'];
            if (booleanFields.includes(colVar) && (aggregation === 'avg' || aggregation === 'sum')) {
              // Convert boolean to percentage
              columnClauses.push(
                `(COUNT(*) FILTER (WHERE ${colVar} = TRUE) * 100.0 / COUNT(*)) AS ${colVar}`
              );
            } else if (aggregation === 'none') {
              // For violin/heatmap visualization, collect all values
              columnClauses.push(`LIST(${colVar}) AS ${colVar}`);
            } else {
              columnClauses.push(`${aggFn}(${colVar}) AS ${colVar}`);
            }
          }
        });

        // Add the rowVar to the SELECT (it will be in GROUP BY)
        if (!columnClauses.includes(tableConfig.rowVar)) {
          columnClauses.unshift(tableConfig.rowVar);
        }

        // Build the query
        const query = `
          SELECT 
            ${columnClauses.join(',\n            ')}
          FROM ${sourceTable}
          GROUP BY ${tableConfig.rowVar}
          ORDER BY ${tableConfig.rowVar};
        `;

        try {
          const startTime = performance.now();
          const queryResult = await this._rootStore.duckDB!.query(query);
          const rows = queryResult.toArray().map((row: any) => row.toJSON());
          const endTime = performance.now();

          // If twoValsPerRow is enabled, we need to transform the data
          // This would require a different query structure - TODO for now
          if (tableConfig.twoValsPerRow) {
            // For now, use dummy data transformation similar to exploreTableDummyData
            console.warn('twoValsPerRow is not yet fully implemented, using basic data');
          }

          data[config.chartId] = rows;
        } catch (error) {
          console.error('Error executing explore table query:', error);
          data[config.chartId] = [];
        }
      }
      if (config.chartType === 'scatterPlot') {
        data[config.chartId] = dummyData;
      }
      if (config.chartType === 'cost') {
        data[config.chartId] = dummyData;
      }
    }
    this.chartData = data;
  }

  // Adds a new chart to the top of the layout
  addChart(config: ExploreChartConfig) {
    // Add to chart configs
    this._chartConfigs = [config, ...this._chartConfigs];

    const shifted = this._chartLayouts.main.map((l) => ({ ...l, y: l.y + 1 }));
    shifted.unshift({
      i: config.chartId,
      x: 0,
      y: 0,
      w: 2,
      h: 1,
      maxH: 2,
    });
    this._chartLayouts = { ...this._chartLayouts, main: shifted };
  }

  // Removes chart from layouts (position) and config (info)
  removeChart(chartId: string) {
    this._chartConfigs = this._chartConfigs.filter((config) => config.chartId !== chartId);
    Object.keys(this._chartLayouts).forEach((key) => {
      this._chartLayouts[key] = this._chartLayouts[key].filter((layout) => layout.i !== chartId);
    });
  }

  updateChartConfig(updatedConfig: ExploreChartConfig) {
    this.chartConfigs = this._chartConfigs.map((cfg) => (cfg.chartId === updatedConfig.chartId ? updatedConfig : cfg));
  }
}
