import { makeAutoObservable } from 'mobx';
import { mean, rollup, sum } from 'd3';
import { Layout } from 'react-grid-layout';
import { AggregationOptions, type DashboardChartConfig, dashboardYAxisVars } from '../Types/application';
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
  get chartData(): Record<`${typeof AggregationOptions[number]}_${DashboardChartConfig['yAxisVar']}`, { quarter: string, data: number }[]> {
    // For each visit, get the quarter and values
    const visitData = this._rootStore.allVisits.map((visit) => {
      const preSurgeryTimePeriods = visit.surgeries.map((surgery) => {
        const surgeryStart = new Date(surgery.surgery_start_dtm);

        // [start - 2 days, start]
        return [surgeryStart.getTime() - 2 * 24 * 60 * 60 * 1000, surgeryStart.getTime()];
      });

      // Prophylactic medications
      const {
        b12,
        iron,
        txa,
        amicar,
      } = visit.medications.reduce((acc, med) => {
        const medTime = new Date(med.order_dtm).getTime();
        if (preSurgeryTimePeriods.some(([start, end]) => medTime >= start && medTime <= end)) {
          const lowerMedName = med.medication_name.toLowerCase();
          if (lowerMedName.includes('b12') || lowerMedName.includes('cobalamin')) {
            acc.b12 = 1;
          }
          if (lowerMedName.includes('iron') || lowerMedName.includes('ferrous') || lowerMedName.includes('ferric')) {
            acc.iron = 1;
          }
          if (lowerMedName.includes('tranexamic') || lowerMedName.includes('txa')) {
            acc.txa = 1;
          }
          if (lowerMedName.includes('amicar') || lowerMedName.includes('aminocaproic')) {
            acc.amicar = 1;
          }
        }
        return acc;
      }, {
        b12: 0,
        iron: 0,
        txa: 0,
        amicar: 0,
      });

      // Crude guideline adherence for a given blood product
      const {
        rbcAdherent,
        rbcTotal,
        ffpAdherent,
        ffpTotal,
        pltAdherent,
        pltTotal,
        cryoAdherent,
        cryoTotal,
      } = visit.transfusions.reduce((acc, transfusion) => {
        // RBCS
        if ((transfusion.rbc_units && transfusion.rbc_units > 0) || (transfusion.rbc_vol && transfusion.rbc_vol > 0)) {
          // Find the RBC lab test for this transfusion, prior to the transfusion time, sorted time descending
          const rbcLab = visit.labs
            // Within 2 hours of the transfusion
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
          if (rbcLab && rbcLab.result_value <= 7.5) {
            // If the lab result is within the normal range, return 1 (adherent), otherwise 0 (not adherent)
            acc.rbcAdherent += 1;
          }
          acc.rbcTotal += 1; // Count this transfusion
        }

        // Plasma
        if ((transfusion.ffp_units && transfusion.ffp_units > 0) || (transfusion.ffp_vol && transfusion.ffp_vol > 0)) {
          // Find the FFP lab test for this transfusion, prior to the transfusion time, sorted time descending
          const ffpLab = visit.labs
            // Within 2 hours of the transfusion
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

          if (ffpLab && ffpLab.result_value >= 1.5) {
            // If the lab result is within the normal range, return 1 (adherent), otherwise 0 (not adherent)
            acc.ffpAdherent += 1;
          }
          acc.ffpTotal += 1; // Count this transfusion
        }

        // Platelets
        if ((transfusion.plt_units && transfusion.plt_units > 0) || (transfusion.plt_vol && transfusion.plt_vol > 0)) {
          // Find the platelet lab test for this transfusion, prior to the transfusion time, sorted time descending
          const pltLab = visit.labs
            // Within 2 hours of the transfusion
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

          if (pltLab && pltLab.result_value >= 15000) {
            // If the lab result is within the normal range, return 1 (adherent), otherwise 0 (not adherent)
            acc.pltAdherent += 1;
          }
          acc.pltTotal += 1; // Count this transfusion
        }

        // Cryoprecipitate
        if ((transfusion.cryo_units && transfusion.cryo_units > 0) || (transfusion.cryo_vol && transfusion.cryo_vol > 0)) {
          // Find the cryo lab test for this transfusion, prior to the transfusion time, sorted time descending
          const cryoLab = visit.labs
            // Within 2 hours of the transfusion
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
          if (cryoLab && cryoLab.result_value >= 175) {
            // If the lab result is within the normal range, return 1 (adherent), otherwise 0 (not adherent)
            acc.cryoAdherent += 1;
          }
          acc.cryoTotal += 1; // Count this transfusion
        }

        return acc;
      }, {
        rbcAdherent: 0,
        rbcTotal: 0,
        ffpAdherent: 0,
        ffpTotal: 0,
        pltAdherent: 0,
        pltTotal: 0,
        cryoAdherent: 0,
        cryoTotal: 0,
      });

      return ({
        quarter: `${new Date(visit.dsch_dtm).getFullYear()}-Q${Math.floor((new Date(visit.dsch_dtm).getMonth()) / 3) + 1}`,

        // Blood products
        rbc_units: visit.transfusions.reduce((s, transfusion) => s + (transfusion.rbc_units || 0), 0),
        ffp_units: visit.transfusions.reduce((s, transfusion) => s + (transfusion.ffp_units || 0), 0),
        plt_units: visit.transfusions.reduce((s, transfusion) => s + (transfusion.plt_units || 0), 0),
        cryo_units: visit.transfusions.reduce((s, transfusion) => s + (transfusion.cryo_units || 0), 0),
        cell_saver_ml: visit.transfusions.reduce((s, transfusion) => s + (transfusion.cell_saver_ml || 0), 0),

        // For a transfusion, if no test, not adherent, if a test, check test value.
        rbcAdherent,
        rbcTotal,
        ffpAdherent,
        ffpTotal,
        pltAdherent,
        pltTotal,
        cryoAdherent,
        cryoTotal,

        // Outcomes
        los: (new Date(visit.dsch_dtm).getTime() - new Date(visit.adm_dtm).getTime()) / (1000 * 60 * 60 * 24),
        death: visit.pat_expired_f ? 1 : 0,
        vent: visit.total_vent_mins > 1440 ? 1 : 0,
        // TODO: ECMO & Stroke codes pulled from somewhere
        stroke: visit.billing_codes.some((code) => ['99291', '1065F', '1066F'].includes(code.cpt_code)) ? 1 : 0,
        ecmo: visit.billing_codes
          .some((code) => ['33946', '33947', '33948', '33949', '33950', '33951', '33952', '33953', '33954', '33955', '33956', '33957', '33958', '33959', '33960', '33961', '33962', '33963', '33964', '33965', '33966', '33969', '33984', '33985', '33986', '33987', '33988', '33989']
            .includes(code.cpt_code)) ? 1 : 0,

        // Prophylactic medications
        b12,
        iron,
        txa,
        amicar,
      });
    });

    // Aggregate visit attributes by quarter
    const quarterlyData = rollup(
      visitData,
      (visit) => ({
        // Blood Products
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

        // Guideline adherence for each blood product
        sum_rbc_adherence: sum(visit, (d) => d.rbcAdherent),
        sum_ffp_adherence: sum(visit, (d) => d.ffpAdherent),
        sum_plt_adherence: sum(visit, (d) => d.pltAdherent),
        sum_cryo_adherence: sum(visit, (d) => d.cryoAdherent),

        average_rbc_adherence: mean(visit, (d) => (d.rbcTotal > 0 ? d.rbcAdherent / d.rbcTotal : null)),
        average_ffp_adherence: mean(visit, (d) => (d.ffpTotal > 0 ? d.ffpAdherent / d.ffpTotal : null)),
        average_plt_adherence: mean(visit, (d) => (d.pltTotal > 0 ? d.pltAdherent / d.pltTotal : null)),
        average_cryo_adherence: mean(visit, (d) => (d.cryoTotal > 0 ? d.cryoAdherent / d.cryoTotal : null)),

        // Outcomes
        sum_los: sum(visit, (d) => d.los),
        sum_death: sum(visit, (d) => d.death),
        sum_vent: sum(visit, (d) => d.vent),
        sum_stroke: sum(visit, (d) => d.stroke),
        sum_ecmo: sum(visit, (d) => d.ecmo),

        average_los: mean(visit, (d) => d.los),
        average_death: mean(visit, (d) => d.death),
        average_vent: mean(visit, (d) => d.vent),
        average_stroke: mean(visit, (d) => d.stroke),
        average_ecmo: mean(visit, (d) => d.ecmo),

        // Prophylactic medications
        sum_b12: sum(visit, (d) => d.b12),
        sum_iron: sum(visit, (d) => d.iron),
        sum_txa: sum(visit, (d) => d.txa),
        sum_amicar: sum(visit, (d) => d.amicar),

        average_b12: mean(visit, (d) => d.b12),
        average_iron: mean(visit, (d) => d.iron),
        average_txa: mean(visit, (d) => d.txa),
        average_amicar: mean(visit, (d) => d.amicar),

        // Cost calculations
      }),
      (d) => d.quarter,
    );

    // Return every combination of aggregation and yAxisVar
    // Build all possible keys from AggregationOptions and all yAxisVars
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
