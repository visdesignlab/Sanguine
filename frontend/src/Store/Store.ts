/* eslint-disable import/no-cycle */
import { makeAutoObservable } from 'mobx';
import { createContext } from 'react';
import { DatabaseVisit } from '../Types/database';
import { DashboardStore } from './DashboardStore';
import {
  getAdherenceFlags, getOverallAdherenceFlags, getProphMedFlags, isValidVisit, safeParseDate,
} from '../Utils/store';
import {
  AdherentCountField,
  AntifibrinolyticUsed,
  ANTIFIBRINOLYTIC_USED,
  BloodComponent,
  BLOOD_COMPONENT_OPTIONS,
  COSTS,
  Cost,
  CPT_CODES,
  Month,
  Outcome,
  OverallAdherentCountField,
  OverallBloodProductCost,
  OverallTotalTransfusedField,
  ProphylMed,
  Quarter,
  TIME_CONSTANTS,
  TotalTransfusedField,
  Year,
  OVERALL_BLOOD_PRODUCT_COST,
} from '../Types/application';
import { getTimePeriodFromDate } from '../Utils/dashboard';
import { FiltersStore } from './FiltersStore';

export type Visit = DatabaseVisit & {
  dischargeDate: Date;
  month: Month | null;
  quarter: Quarter | null;
  year: Year | null;
}
& Record<BloodComponent, number>
& Record<AdherentCountField, number>
& Record<TotalTransfusedField, number>
& Record<Outcome, number>
& Record<ProphylMed, number>
& Record<AntifibrinolyticUsed, number>
& Record<OverallAdherentCountField, number>
& Record<OverallTotalTransfusedField, number>
& Record<Cost, number>
& Record<OverallBloodProductCost, number>;

export class RootStore {
  // Provenance

  // Stores
  dashboardStore: DashboardStore;

  filtersStore: FiltersStore;
  // providersStore:
  // exploreStore:

  // Visits - Main data type
  _allVisits: DatabaseVisit[] = [];

  constructor() {
    // Initialize stores
    this.dashboardStore = new DashboardStore(this);
    this.filtersStore = new FiltersStore(this);

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
        const antifibrinolyticUsed: Record<AntifibrinolyticUsed, number> = {
          [ANTIFIBRINOLYTIC_USED.value]: (prophMedFlags.txa || prophMedFlags.amicar) ? 1 : 0,
        };

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
        const totalBloodProductCosts: Record<OverallBloodProductCost, number> = {
          [OVERALL_BLOOD_PRODUCT_COST.value]: Object.values(bloodProductCosts).reduce((sum, cost) => sum + cost, 0),
        };

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
          ...antifibrinolyticUsed,
          ...overallAdherenceFlags,
          ...bloodProductCosts,
          ...totalBloodProductCosts,
        } as Visit;
      });
  }

  set allVisits(input) {
    this._allVisits = input;
  }

  get filteredVisits() {
    return this.allVisits
      // Apply filter store filters
      .filter((visit) => {
        const { filterValues } = this.filtersStore;

        // Check date range
        const dateFrom = filterValues.dateFrom.getTime();
        const dateTo = filterValues.dateTo.getTime();
        const visitDate = safeParseDate(visit.adm_dtm).getTime();
        if (visitDate < dateFrom || visitDate > dateTo) {
          return false;
        }

        // Check RBCs range
        if (visit.rbc_units < filterValues.visitRBCs[0] || visit.rbc_units > filterValues.visitRBCs[1]) {
          return false;
        }

        // Check FFPs range
        if (visit.ffp_units < filterValues.visitFFPs[0] || visit.ffp_units > filterValues.visitFFPs[1]) {
          return false;
        }

        // Check PLTs range
        if (visit.plt_units < filterValues.visitPLTs[0] || visit.plt_units > filterValues.visitPLTs[1]) {
          return false;
        }

        // Check Cryo range
        if (visit.cryo_units < filterValues.visitCryo[0] || visit.cryo_units > filterValues.visitCryo[1]) {
          return false;
        }

        // Check Cell Saver range
        if (visit.cell_saver_ml < filterValues.visitCellSaver[0] || visit.cell_saver_ml > filterValues.visitCellSaver[1]) {
          return false;
        }

        // Check death flag
        if (filterValues.death && visit.pat_expired_f === null) {
          return false;
        }
        if (filterValues.death === false && visit.pat_expired_f !== null) {
          return false;
        }

        // Check ventilator flag
        if (filterValues.vent && visit.total_vent_mins <= TIME_CONSTANTS.VENTILATOR_THRESHOLD_MINS) {
          return false;
        }
        if (filterValues.vent === false && visit.total_vent_mins >= TIME_CONSTANTS.VENTILATOR_THRESHOLD_MINS) {
          return false;
        }

        // Check length of stay
        if (visit.los < filterValues.los[0] || visit.los > filterValues.los[1]) {
          return false;
        }

        return true;
      });
  }

  get allPatients() {
    return this.allVisits.flatMap((d) => d.patient);
  }

  get allSurgeries() {
    return this.allVisits.flatMap((v) => v.surgeries);
  }
}

export const Store = createContext(new RootStore());
