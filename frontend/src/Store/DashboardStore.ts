import { makeAutoObservable } from 'mobx';
import { mean, rollup, sum } from 'd3';
import { Layout } from 'react-grid-layout';
import type { DashboardChartConfig } from '../Types/application';
import type { RootStore } from './Store';

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

  // Chart configurations ------------------------------
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
    ],
  };

  get chartLayouts() {
    return this._chartLayouts;
  }

  set chartLayouts(input: { [key: string]: Layout[] }) {
    this._chartLayouts = input;
  }

  _chartConfigs: DashboardChartConfig[] = [
    {
      i: '0', yAxisVar: 'rbc_units', aggregation: 'sum',
    },
    {
      i: '1', yAxisVar: 'ffp_units', aggregation: 'sum',
    },
    {
      i: '2', yAxisVar: 'plt_units', aggregation: 'sum',
    },
    {
      i: '3', yAxisVar: 'cryo_units', aggregation: 'sum',
    },
  ];

  get chartConfigs() {
    return this._chartConfigs;
  }

  set chartConfigs(input: DashboardChartConfig[]) {
    this._chartConfigs = input;
  }

  setChartConfig(id: string, input: DashboardChartConfig) {
    this._chartConfigs = this._chartConfigs.map((config) => {
      if (config.i === id) {
        return { ...config, ...input };
      }
      return config;
    });
  }

  removeChart(id: string) {
    this._chartConfigs = this._chartConfigs.filter((config) => config.i !== id);

    this._chartLayouts.main = this._chartLayouts.main.filter((layout) => layout.i !== id);
    this._chartLayouts.sm = this._chartLayouts.sm.filter((layout) => layout.i !== id);
  }

  // Chart data ------------------------------
  /**
   * Returns all chart data for the dashboard
   */
  get chartData(): Record<string, { quarter: string, data: number }[] | undefined> {
    // For each visit, get the quarter and values
    const visitData = this._rootStore.allVisits.map((visit) => ({
      quarter: `${new Date(visit.dsch_dtm).getFullYear()}-Q${Math.floor((new Date(visit.dsch_dtm).getMonth()) / 3) + 1}`,

      rbc_units: visit.transfusions.reduce((s, transfusion) => s + (transfusion.rbc_units || 0), 0),
      ffp_units: visit.transfusions.reduce((s, transfusion) => s + (transfusion.ffp_units || 0), 0),
      plt_units: visit.transfusions.reduce((s, transfusion) => s + (transfusion.plt_units || 0), 0),
      cryo_units: visit.transfusions.reduce((s, transfusion) => s + (transfusion.cryo_units || 0), 0),
      cell_saver_ml: visit.transfusions.reduce((s, transfusion) => s + (transfusion.cell_saver_ml || 0), 0),

      los: (new Date(visit.dsch_dtm).getTime() - new Date(visit.adm_dtm).getTime()) / (1000 * 60 * 60 * 24),
    }));

    // Aggregate visit attributes by quarter
    const quarterlyData = rollup(
      visitData,
      (visit) => ({
        sum_rbc_units: sum(visit, (d) => d.rbc_units),
        sum_ffp_units: sum(visit, (d) => d.ffp_units),
        sum_plt_units: sum(visit, (d) => d.plt_units),
        sum_cryo_units: sum(visit, (d) => d.cryo_units),
        sum_cell_saver_ml: sum(visit, (d) => d.cell_saver_ml),

        average_rbc_units: mean(visit, (d) => d.rbc_units),
        average_ffp_units: mean(visit, (d) => d.ffp_units),
        average_plt_units: mean(visit, (d) => d.plt_units),
        average_cryo_units: mean(visit, (d) => d.cryo_units),
        average_cell_saver_ml: mean(visit, (d) => d.cell_saver_ml),

        // los: mean(visit, (d) => d.los) || 0,
        // // TODO: Add other outcomes
        // death: 0,
        // vent: 0,
        // stroke: 0,
        // ecmo: 0,
        // b12: 0,
        // iron: 0,
        // txa: 0,
        // amicar: 0,
      }),
      (d) => d.quarter,
    );

    // Return quarterly visit data sorted by date
    return Object.fromEntries(
      this.chartConfigs.map(({ i, yAxisVar, aggregation }) => [
        i,
        Array.from(quarterlyData.entries())
          .map(([quarter, group]) => ({
            quarter,
            data: group[`${aggregation}_${yAxisVar}`] || 0,
          }))
          .sort((a, b) => a.quarter.localeCompare(b.quarter)),
      ]),
    );
  }
}
