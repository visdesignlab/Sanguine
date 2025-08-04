import { makeAutoObservable } from 'mobx';
import { mean, rollup, sum } from 'd3';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';
import { TransfusionEvent, Visit } from '../Types/database';

import {
  BloodComponentOptions,
  BloodComponent,
  GuidelineAdherenceOptions,
  AdherentCountField,
  TotalTransfusedField,
  OutcomeOptions,
  Outcome,
  ProphylMedOptions,
  ProphylMed,
  AggregationOptions,
  dashboardYAxisVars,
  DashboardChartData,
  CPT_CODES,
  type DashboardChartConfig,
} from '../Types/application';

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

  // Chart settings ------------------------------
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

  // Chart configurations
  _chartConfigs: DashboardChartConfig[] = [
    {
      i: '0', yAxisVar: 'rbc_units', aggregation: 'sum',
    },
    {
      i: '1', yAxisVar: 'rbc_adherence', aggregation: 'average',
    },
    {
      i: '2', yAxisVar: 'los', aggregation: 'average',
    },
    {
      i: '3', yAxisVar: 'iron', aggregation: 'average',
    },
  ];

  get chartConfigs() {
    return this._chartConfigs;
  }

  set chartConfigs(input: DashboardChartConfig[]) {
    this._chartConfigs = input;
  }

  // Chart management ------------------------------
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

  // Chart data ------------------------------------------
  /**
   * Returns all chart data for the dashboard
   */
  get chartData(): DashboardChartData {
    // For each visit, get the dashboard data, un-aggregated ------
    const visitData = this._rootStore.allVisits.map((visit: Visit) => {
      const prophMedFlags = this.getProphMedFlags(visit);
      const bloodProductUnits = this.getBloodProductUnits(visit);
      const adherenceFlags = this.getAdherenceFlags(visit);
      const outcomeFlags = this.getOutcomeFlags(visit);

      // Return cleaned visit data
      return {
        quarter: `${new Date(visit.dsch_dtm).getFullYear()}-Q${Math.floor((new Date(visit.dsch_dtm).getMonth()) / 3) + 1}`,
        ...bloodProductUnits,
        ...adherenceFlags,
        ...outcomeFlags,
        ...prophMedFlags,
      };
    });

    // Aggregate visit attribute values by quarter (e.g. sum RBC units per quarter) -----
    const quarterlyData = rollup(
      visitData,
      (visit) => {
        const agg: Record<string, number | undefined> = {};

        // Blood Components
        for (const { value } of BloodComponentOptions) {
          agg[`sum_${value}`] = sum(visit, (d) => d[value]);
          agg[`average_${value}`] = mean(visit, (d) => d[value]);
        }

        // Guideline Adherence
        for (const { value, adherentCount, totalTransfused } of GuidelineAdherenceOptions) {
          agg[`sum_${value}`] = sum(visit, (d) => d[adherentCount]);
          agg[`average_${value}`] = mean(visit, (d) => (d[totalTransfused] > 0 ? d[adherentCount] / d[totalTransfused] : null));
        }

        // Outcomes
        for (const { value } of OutcomeOptions) {
          agg[`sum_${value}`] = sum(visit, (d) => d[value]);
          agg[`average_${value}`] = mean(visit, (d) => d[value]);
        }

        // Prophylactic Medications
        for (const { value } of ProphylMedOptions) {
          agg[`sum_${value}`] = sum(visit, (d) => d[value]);
          agg[`average_${value}`] = mean(visit, (d) => d[value]);
        }

        // TODO: Cost calculations

        return agg;
      },
      (d) => d.quarter,
    );

    // Return every possible chart configuration - (combinations of aggregation and yAxisVar) --------------------------------
    const result = {} as DashboardChartData;
    for (const aggregation of AggregationOptions) {
      for (const yAxisVar of dashboardYAxisVars) {
        const key = `${aggregation}_${yAxisVar}` as `${typeof aggregation}_${typeof yAxisVar}`;
        const data = Array.from(quarterlyData.entries())
          .map(([quarter, group]) => ({
            quarter,
            data: group[`${aggregation}_${yAxisVar}`] || 0,
          }))
          .sort((a, b) => a.quarter.localeCompare(b.quarter));
        result[key] = data;
      }
    }
    return result;
  }

  // Helper functions for chart data -------------------------------------
  /**
   * Calculate pre-surgery time periods (2 days before each surgery)
   */
  getPreSurgeryTimePeriods(visit: Visit): [number, number][] {
    return visit.surgeries.map((surgery) => {
      const twoDays = 2 * 24 * 60 * 60 * 1000;
      const surgeryStart = new Date(surgery.surgery_start_dtm);
      return [surgeryStart.getTime() - twoDays, surgeryStart.getTime()];
    });
  }

  /**
   * Calculate prophylactic medication flags for a visit
   */
  getProphMedFlags(visit: Visit): Record<ProphylMed, number> {
    return visit.medications.reduce((acc: Record<ProphylMed, number>, med) => {
      const preSurgeryTimePeriods = this.getPreSurgeryTimePeriods(visit);
      const medTime = new Date(med.order_dtm).getTime();
      // Check if med given pre-surgery
      if (preSurgeryTimePeriods.some(([start, end]) => medTime >= start && medTime <= end)) {
        const lowerMedName = med.medication_name.toLowerCase();
        // Increase count if med matches prophyl med type
        ProphylMedOptions.forEach((medType) => {
          if (medType.aliases.some((alias) => lowerMedName.includes(alias))) {
            acc[medType.value] = 1;
          }
        });
      }
      return acc;
    }, ProphylMedOptions.reduce((acc, medType) => {
      acc[medType.value] = 0;
      return acc;
    }, {} as Record<ProphylMed, number>));
  }

  /**
   * Calculate blood product units for a visit
   */
  getBloodProductUnits(visit: Visit): Record<BloodComponent, number> {
    return BloodComponentOptions.reduce((acc, component) => {
      acc[component.value] = visit.transfusions.reduce((s: number, t) => s + (t[component.value] || 0), 0);
      return acc;
    }, {} as Record<BloodComponent, number>);
  }

  /**
   * Check if a blood product was transfused
   */
  private isBloodProductTransfused(transfusion: TransfusionEvent, bloodProductUnit: readonly string[]): boolean {
    return bloodProductUnit.some((field) => {
      if (!(field in transfusion)) {
        throw new Error(`Field "${field}" is not a key of TransfusionEvent`);
      }
      const value = transfusion[field as keyof TransfusionEvent];
      return typeof value === 'number' && value > 0;
    });
  }

  /**
 * Calculate adherence flags for a visit
 */
  getAdherenceFlags(visit: Visit): Record<AdherentCountField | TotalTransfusedField, number> {
    const adherenceFlags = {
    // For each adherence spec, initialize counts
      ...GuidelineAdherenceOptions.reduce((acc, spec) => {
        acc[spec.adherentCount] = 0;
        acc[spec.totalTransfused] = 0;
        return acc;
      }, {} as Record<AdherentCountField | TotalTransfusedField, number>),
    };

    // For each transfusion, count adherence and total transfused for each blood product
    visit.transfusions.forEach((transfusion: TransfusionEvent) => {
      // For each adherence spec (rbc, ffp), check if transfusion adheres to guidelines
      GuidelineAdherenceOptions.forEach(({
        transfusionUnits, labDesc, adherenceCheck, adherentCount, totalTransfused,
      }) => {
      // Check if blood product unit given
        if (this.isBloodProductTransfused(transfusion, transfusionUnits)) {
        // Find relevant lab result within 2 hours of transfusion
          const relevantLab = visit.labs
            .filter((lab) => {
              const twoHoursInMs = 2 * 60 * 60 * 1000;
              const labDrawDtm = new Date(lab.lab_draw_dtm).getTime();
              const transfusionDtm = new Date(transfusion.trnsfsn_dtm).getTime();
              return (
                labDesc.includes(lab.result_desc)
            && labDrawDtm <= transfusionDtm
            && labDrawDtm >= transfusionDtm - twoHoursInMs
              );
            })
            .sort((a, b) => new Date(b.lab_draw_dtm).getTime() - new Date(a.lab_draw_dtm).getTime())
            .at(0);

          // If relevant lab exists and adheres to guidelines, increment counts
          if (relevantLab && adherenceCheck(relevantLab.result_value)) {
            adherenceFlags[adherentCount] += 1;
          }
          // Increment total [blood product] transfused regardless
          adherenceFlags[totalTransfused] += 1;
        }
      });
    });
    return adherenceFlags;
  }

  /**
   * Check if a visit has any of the specified CPT codes
   */
  private hasMatchingCptCode(visit: Visit, cptCodes: readonly string[]): boolean {
    return visit.billing_codes.some((code) => cptCodes.includes(code.cpt_code));
  }

  /**
   * Calculate outcome flags for a visit
   */
  getOutcomeFlags(visit: Visit): Record<Outcome, number> {
    return {
      los: (new Date(visit.dsch_dtm).getTime() - new Date(visit.adm_dtm).getTime()) / (1000 * 60 * 60 * 24),
      death: visit.pat_expired_f ? 1 : 0,
      vent: visit.total_vent_mins > 1440 ? 1 : 0,
      stroke: this.hasMatchingCptCode(visit, CPT_CODES.stroke) ? 1 : 0,
      ecmo: this.hasMatchingCptCode(visit, CPT_CODES.ecmo) ? 1 : 0,
    } as Record<Outcome, number>;
  }
}
