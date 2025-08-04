import { makeAutoObservable } from 'mobx';
import { mean, rollup, sum } from 'd3';
import { Layout } from 'react-grid-layout';
import {
  BloodComponentOptions,
  BloodComponent,
  GuidelineAdherenceOptions,
  AdherentCountOptions,
  TotalTransfusedOptions,
  AdherentCountField,
  TotalTransfusedField,
  OutcomeOptions,
  ProphylMedOptions,
  AggregationOptions,
  type DashboardChartConfig,
  dashboardYAxisVars,
  ProphylMed,
} from '../Types/application';
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

  // Chart configs
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
  get chartData(): Record<`${typeof AggregationOptions[number]}_${DashboardChartConfig['yAxisVar']}`, { quarter: string, data: number }[]> {
    // For each visit, get the dashboard data, un-aggregated -------------------------------------------
    const visitData = this._rootStore.allVisits.map((visit) => {
      // --- Pre-surgery periods (2 days before surgery) ---
      const preSurgeryTimePeriods = visit.surgeries.map((surgery) => {
        const surgeryStart = new Date(surgery.surgery_start_dtm);
        return [surgeryStart.getTime() - 2 * 24 * 60 * 60 * 1000, surgeryStart.getTime()];
      });

      // --- Prophylactic medications ---
      // For each visit, count number of each prophyl med given in pre-surgery period
      const prophMedFlags = visit.medications.reduce((acc, med) => {
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

      // --- Blood product units ---
      const bloodProductUnits = BloodComponentOptions.reduce((acc, component) => {
        acc[component.value] = visit.transfusions.reduce((s, t) => s + (t[component.value] || 0), 0);
        return acc;
      }, {} as Record<BloodComponent, number>);

      // --- Adherence flags ---
      const adherenceFlags = {
        // Initialize adherent count fields
        ...AdherentCountOptions.reduce((acc, field) => {
          acc[field.value] = 0;
          return acc;
        }, {} as Record<AdherentCountField, number>),

        // Initialize total transfused fields
        ...TotalTransfusedOptions.reduce((acc, field) => {
          acc[field.value] = 0;
          return acc;
        }, {} as Record<TotalTransfusedField, number>),
      };

      visit.transfusions.forEach((transfusion) => {
        // RBCS
        if ((transfusion.rbc_units && transfusion.rbc_units > 0) || (transfusion.rbc_vol && transfusion.rbc_vol > 0)) {
          const rbcLab = visit.labs
            .filter((lab) => {
              const labDrawDtm = new Date(lab.lab_draw_dtm).getTime();
              const transfusionDtm = new Date(transfusion.trnsfsn_dtm).getTime();
              return (
                ['HGB', 'Hemoglobin'].includes(lab.result_desc)
                && labDrawDtm <= transfusionDtm
                && labDrawDtm >= transfusionDtm - 2 * 60 * 60 * 1000
              );
            })
            .sort((a, b) => new Date(b.lab_draw_dtm).getTime() - new Date(a.lab_draw_dtm).getTime())
            .at(0);
          if (rbcLab && rbcLab.result_value <= 7.5) adherenceFlags.rbc_adherent += 1;
          adherenceFlags.rbc_total += 1;
        }
        // Plasma
        if ((transfusion.ffp_units && transfusion.ffp_units > 0) || (transfusion.ffp_vol && transfusion.ffp_vol > 0)) {
          const ffpLab = visit.labs
            .filter((lab) => {
              const labDrawDtm = new Date(lab.lab_draw_dtm).getTime();
              const transfusionDtm = new Date(transfusion.trnsfsn_dtm).getTime();
              return (
                ['INR'].includes(lab.result_desc)
                && labDrawDtm <= transfusionDtm
                && labDrawDtm >= transfusionDtm - 2 * 60 * 60 * 1000
              );
            })
            .sort((a, b) => new Date(b.lab_draw_dtm).getTime() - new Date(a.lab_draw_dtm).getTime())
            .at(0);
          if (ffpLab && ffpLab.result_value >= 1.5) adherenceFlags.ffp_adherent += 1;
          adherenceFlags.ffp_total += 1;
        }
        // Platelets
        if ((transfusion.plt_units && transfusion.plt_units > 0) || (transfusion.plt_vol && transfusion.plt_vol > 0)) {
          const pltLab = visit.labs
            .filter((lab) => {
              const labDrawDtm = new Date(lab.lab_draw_dtm).getTime();
              const transfusionDtm = new Date(transfusion.trnsfsn_dtm).getTime();
              return (
                ['PLT', 'Platelet Count'].includes(lab.result_desc)
                && labDrawDtm <= transfusionDtm
                && labDrawDtm >= transfusionDtm - 2 * 60 * 60 * 1000
              );
            })
            .sort((a, b) => new Date(b.lab_draw_dtm).getTime() - new Date(a.lab_draw_dtm).getTime())
            .at(0);
          if (pltLab && pltLab.result_value >= 15000) adherenceFlags.plt_adherent += 1;
          adherenceFlags.plt_total += 1;
        }
        // Cryoprecipitate
        if ((transfusion.cryo_units && transfusion.cryo_units > 0) || (transfusion.cryo_vol && transfusion.cryo_vol > 0)) {
          const cryoLab = visit.labs
            .filter((lab) => {
              const labDrawDtm = new Date(lab.lab_draw_dtm).getTime();
              const transfusionDtm = new Date(transfusion.trnsfsn_dtm).getTime();
              return (
                ['Fibrinogen'].includes(lab.result_desc)
                && labDrawDtm <= transfusionDtm
                && labDrawDtm >= transfusionDtm - 2 * 60 * 60 * 1000
              );
            })
            .sort((a, b) => new Date(b.lab_draw_dtm).getTime() - new Date(a.lab_draw_dtm).getTime())
            .at(0);
          if (cryoLab && cryoLab.result_value >= 175) adherenceFlags.cryo_adherent += 1;
          adherenceFlags.cryo_total += 1;
        }
      });

      // --- Outcome flags ---
      const outcomeFlags = {
        los: (new Date(visit.dsch_dtm).getTime() - new Date(visit.adm_dtm).getTime()) / (1000 * 60 * 60 * 24),
        death: visit.pat_expired_f ? 1 : 0,
        vent: visit.total_vent_mins > 1440 ? 1 : 0,
        stroke: visit.billing_codes.some((code) => ['99291', '1065F', '1066F'].includes(code.cpt_code)) ? 1 : 0,
        ecmo: visit.billing_codes
          .some((code) => [
            '33946', '33947', '33948', '33949', '33950', '33951', '33952', '33953', '33954', '33955',
            '33956', '33957', '33958', '33959', '33960', '33961', '33962', '33963', '33964', '33965',
            '33966', '33969', '33984', '33985', '33986', '33987', '33988', '33989',
          ].includes(code.cpt_code)) ? 1 : 0,
      };

      // --- Return cleaned visit data ---
      return {
        quarter: `${new Date(visit.dsch_dtm).getFullYear()}-Q${Math.floor((new Date(visit.dsch_dtm).getMonth()) / 3) + 1}`,
        ...bloodProductUnits,
        ...adherenceFlags,
        ...outcomeFlags,
        ...prophMedFlags,
      };
    });

    // Aggregate visit attribute values by quarter (e.g. sum RBC units per quarter) -------------------------
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
    const result = {} as Record<`${typeof AggregationOptions[number]}_${DashboardChartConfig['yAxisVar']}`, { quarter: string, data: number }[]>;
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
}
