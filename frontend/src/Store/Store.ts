/* eslint-disable import/no-cycle */
import { makeAutoObservable } from 'mobx';
import { createContext } from 'react';
import { DatabaseVisit } from '../Types/database';
import { DashboardStore } from './DashboardStore';
import {
  getAdherenceFlags, getOverallAdherenceFlags, getProphMedFlags, isValidVisit, safeParseDate,
} from '../Utils/store';
import {
  BloodComponent, BLOOD_COMPONENT_OPTIONS, TIME_CONSTANTS, CPT_CODES,
  COSTS,
  Cost,
  ProphylMed,
  Month,
  Quarter,
  Year,
  AdherentCountField,
  TotalTransfusedField,
  Outcome,
  OverallAdherentCountField,
  OverallTotalTransfusedField,
} from '../Types/application';
import { getTimePeriodFromDate } from '../Utils/dashboard';

export type Visit = DatabaseVisit & {
  dischargeDate: Date;
  month: Month | null; // E.g. '2023-01'
  quarter: Quarter | null; // E.g. '2023-Q1'
  year: Year | null; // E.g. '2023'

  total_blood_product_costs: number;
}
& Record<BloodComponent, number>
& Record<AdherentCountField | TotalTransfusedField, number>
& Record<Outcome, number>
& Record<ProphylMed, number>
& Record<OverallAdherentCountField | OverallTotalTransfusedField, number>
& Record<Cost, number>;

export class RootStore {
  // Provenance

  // Stores
  dashboardStore = new DashboardStore(this);
  // providersStore:
  // exploreStore:

  // Visits - Main data type
  _allVisits: DatabaseVisit[];

  constructor() {
    this._allVisits = [];

    makeAutoObservable(this);
  }

  /**
   * Returns all visits, filtering out invalid ones and calculating derived fields.
   * Derived fields include:
   * - Blood product units (e.g., rbc_units, ffp_units)
   * - Outcome flags (e.g., length of stay, death, ventilator use, stroke, ECMO)
   * - Prophylactic medication flags
   * - Adherence flags
   * - Overall adherence flags
   * - Blood product costs (e.g., rbc_cost, ffp_cost)
   * - Total blood product costs
   */
  get allVisits(): Visit[] {
    return this._allVisits
      .filter((v) => isValidVisit(v))
      // Add derived fields to each visit
      .map((visit: DatabaseVisit) => {
        const bloodProductUnits = BLOOD_COMPONENT_OPTIONS.reduce((acc, component) => {
          acc[component.value] = visit.transfusions.reduce((s: number, t) => s + (t[component.value] || 0), 0);
          return acc;
        }, {} as Record<BloodComponent, number>);

        const outcomeFlags: Record<Outcome, number> = {
          los: (safeParseDate(visit.dsch_dtm).getTime() - safeParseDate(visit.adm_dtm).getTime()) / (TIME_CONSTANTS.ONE_DAY_MS),
          death: visit.pat_expired_f ? 1 : 0,
          vent: visit.total_vent_mins > TIME_CONSTANTS.VENTILATOR_THRESHOLD_MINS ? 1 : 0,
          stroke: visit.billing_codes.some((code) => (CPT_CODES.stroke as readonly string[]).includes(code.cpt_code)) ? 1 : 0,
          ecmo: visit.billing_codes.some((code) => (CPT_CODES.ecmo as readonly string[]).includes(code.cpt_code)) ? 1 : 0,
        };

        const prophMedFlags = getProphMedFlags(visit);

        const adherenceFlags = getAdherenceFlags(visit);

        const overallAdherenceFlags = getOverallAdherenceFlags(adherenceFlags);

        const bloodProductCosts = Object.entries(COSTS).reduce((acc, [costKey, costObj]) => {
          if (!('unitCost' in costObj)) return acc;
          // Map costKey (e.g. 'rbc_cost') to blood product key (e.g. 'rbc_units')
          const productKey = costKey.slice(0, -'_cost'.length);
          acc[costKey as keyof typeof COSTS] = (bloodProductUnits[productKey as BloodComponent] || 0) * (costObj.unitCost || 0);
          return acc;
        }, {} as Record<Cost, number>);

        // All blood products combined into one cost
        const totalBloodProductCosts = Object.values(bloodProductCosts).reduce((sum, cost) => sum + cost, 0);

        return {
          ...visit,
          dischargeDate: safeParseDate(visit.dsch_dtm),
          month: getTimePeriodFromDate(safeParseDate(visit.adm_dtm), 'month'),
          quarter: getTimePeriodFromDate(safeParseDate(visit.adm_dtm), 'quarter'),
          year: getTimePeriodFromDate(safeParseDate(visit.adm_dtm), 'year'),
          ...bloodProductUnits,
          ...adherenceFlags,
          ...outcomeFlags,
          ...prophMedFlags,
          ...overallAdherenceFlags,
          ...bloodProductCosts,
          total_blood_product_costs: totalBloodProductCosts,
        };
      });
  }

  set allVisits(input) {
    this._allVisits = input;
  }

  get allPatients() {
    return this._allVisits.flatMap((d) => d.patient);
  }

  get allSurgeries() {
    return this.allVisits.flatMap((v) => v.surgeries);
  }
}

export const Store = createContext(new RootStore());
