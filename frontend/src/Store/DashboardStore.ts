import { makeAutoObservable } from 'mobx';
import { mean, rollup, sum } from 'd3';
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
  _chartConfigs: { [key: string]: DashboardChartConfig[] } = {
    main: [
      {
        i: '0', x: 0, y: 0, w: 2, h: 1, maxH: 2, yAxisVar: 'rbc_units', aggregation: 'sum',
      },
      {
        i: '1', x: 0, y: 1, w: 1, h: 1, maxH: 2, yAxisVar: 'ffp_units', aggregation: 'sum',
      },
      {
        i: '2', x: 1, y: 1, w: 1, h: 1, maxH: 2, yAxisVar: 'plt_units', aggregation: 'sum',
      },
      {
        i: '3', x: 0, y: 2, w: 2, h: 1, maxH: 2, yAxisVar: 'cryo_units', aggregation: 'sum',
      },
    ],
  };

  get chartConfigs(): { [key: string]: DashboardChartConfig[] } {
    return this._chartConfigs;
  }

  set chartConfigs(input: { [key: string]: DashboardChartConfig[] }) {
    this._chartConfigs = input;
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
        rbc_units: sum(visit, (d) => d.rbc_units),
        ffp_units: sum(visit, (d) => d.ffp_units),
        plt_units: sum(visit, (d) => d.plt_units),
        cryo_units: sum(visit, (d) => d.cryo_units),
        cell_saver_ml: sum(visit, (d) => d.cell_saver_ml),
        los: mean(visit, (d) => d.los) || 0,
        // TODO: Add other outcomes
        death: 0,
        vent: 0,
        stroke: 0,
        ecmo: 0,
        b12: 0,
        iron: 0,
        txa: 0,
        amicar: 0,
      }),
      (d) => d.quarter,
    );

    // Return quarterly visit data sorted by date
    return Object.fromEntries(
      this.chartConfigs.main.map(({ i, yAxisVar }) => [
        i,
        Array.from(quarterlyData.entries())
          .map(([quarter, group]) => ({
            quarter,
            data: group[yAxisVar],
          }))
          .sort((a, b) => a.quarter.localeCompare(b.quarter)),
      ]),
    );
  }
}
