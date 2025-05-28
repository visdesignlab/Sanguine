/* eslint-disable import/no-cycle */
import { initProvenance, Provenance } from '@visdesignlab/trrack';
import { timeFormat } from 'd3';
import { makeAutoObservable } from 'mobx';
import { createContext } from 'react';
import { ChartStore } from './ChartStore';
import { defaultState } from './DefaultState';
import { ProjectConfigStore } from './ProjectConfigStore';
import { InteractionStore } from './InteractionStore';
import { ActionEvents } from './Types/EventTypes';
import { ApplicationState } from './Types/StateTypes';
import { Visit } from './Types/DataTypes';
import { SurgeryUrgencyArray } from '../Presets/DataDict';

export class RootStore {
  provenance: Provenance<ApplicationState, ActionEvents>;

  configStore: ProjectConfigStore;

  interactionStore: InteractionStore;

  chartStore: ChartStore;

  _allVisits: Visit[];

  private _mainCompWidth: number;

  constructor() {
    this._mainCompWidth = 0;

    this.provenance = initProvenance<ApplicationState, ActionEvents>(
      defaultState,
    );
    this.provenance.done();
    this.configStore = new ProjectConfigStore(this);
    this.chartStore = new ChartStore(this);
    this.interactionStore = new InteractionStore(this);

    this._allVisits = [];

    makeAutoObservable(this);
  }

  get provenanceState() {
    return this.provenance.getState(this.provenance.current);
  }

  get isAtRoot() {
    return this.provenance.root.id === this.provenance.current.id;
  }

  get isAtLatest() {
    return this.provenance.current.children.length === 0;
  }

  get allVisits() {
    return this._allVisits;
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

  get providerMappping() {
    return this._allVisits.reduce((acc, v) => {
      v.surgeries.map((s) => {
        if (!acc[s.surgeon_prov_id]) {
          acc[s.surgeon_prov_id] = s.surgeon_prov_name;
        }
        if (!acc[s.anesth_prov_id]) {
          acc[s.anesth_prov_id] = s.anesth_prov_name;
        }
        return null;
      });
      return acc;
    }, {} as Record<string, string>);
  }

  get filteredCases() {
    return this.allSurgeries.filter((d) => {
      // Filter panel items
      if (!(d.case_date >= this.provenanceState.rawDateRange[0] && d.case_date <= this.provenanceState.rawDateRange[1])) {
        return false;
      }
      if (this.provenanceState.outcomeFilter.length > 0) {
        return !this.provenanceState.outcomeFilter.some((outcome) => !d[outcome]);
      }
      if (!this.provenanceState.surgeryUrgencySelection[SurgeryUrgencyArray.indexOf(d.surgery_type_desc)]) {
        return false;
      }
      // surgeon cases performed
      if (this.surgeonCasesPerformedRange[d.surgeon_prov_id] < this.provenanceState.surgeonCasesPerformed[0] || this.surgeonCasesPerformedRange[d.surgeon_prov_id] > this.provenanceState.surgeonCasesPerformed[1]) {
        return false;
      }

      if (
        this.provenanceState.currentFilteredPatientGroup.length > 0
        && !this.provenanceState.currentFilteredPatientGroup.some((patient) => patient.case_id === d.case_id)
      ) {
        return false;
      }
      if (
        this.provenanceState.currentOutputFilterSet.length > 0
        && !this.provenanceState.currentOutputFilterSet.some((output) => output.setValues.includes(`${d[output.setName]}`))
      ) {
        return false;
      }

      // Blood filters (transfusions and tests)
      const bloodFiltered = Object.entries(this.provenanceState.bloodFilter)
        .some(([bloodComponent, range]) => {
          const patientValue = d[bloodComponent] as number;
          return patientValue < range[0] || patientValue > range[1];
        });
      if (bloodFiltered) {
        return false;
      }

      // Chart selection filters

      // Procedure filters
      const visit = this.allVisits.find((v) => v.visit_no === d.visit_no)!;
      const patientCodes = visit.billing_codes.map((code) => code.cpt_code);
      const procedureFiltered = !this.provenanceState.proceduresSelection.every((procedure) => {
        if (procedure.overlapList && procedure.overlapList.length > 0) {
          // If we're here, then we have a multiple procedures
          // Check for "only procedure"
          if (procedure.overlapList.some((subProcedure) => subProcedure.procedureName.includes('Only'))) {
            return patientCodes.every((code) => procedure.codes.includes(code));
          }

          return procedure.codes.some((code) => patientCodes.includes(code))
            && procedure.overlapList.every((subProcedure) => subProcedure.codes.some((code) => patientCodes.includes(code)));
        }
        // If we're here, then we have a single procedure
        return procedure.codes.some((code) => patientCodes.includes(code));
      });
      if (procedureFiltered) {
        return false;
      }

      return true;
    });
  }

  get filterRange() {
    const filterRange: Record<string, [number, number]> = {
      rbc_units: [0, 0],
      ffp_units: [0, 0],
      plt_units: [0, 0],
      cryo_units: [0, 0],
      cell_saver_ml: [0, 0],
      PREOP_HEMO: [0, 0],
      POSTOP_HEMO: [0, 0],
    };
    this.allPatients.forEach((d) => {
      Object.keys(filterRange).forEach((key) => {
        filterRange[key][1] = Math.max(d[key] as number, filterRange[key][1]);
      });
    });
    return filterRange;
  }

  get surgeonCasesPerformedRange() {
    const surgeonCases = this.allSurgeries.reduce((acc, d) => {
      if (!acc[d.surgeon_prov_id]) {
        acc[d.surgeon_prov_id] = 0;
      }
      acc[d.surgeon_prov_id] += 1;
      return acc;
    }, {} as Record<string, number>);
    return surgeonCases;
  }

  get dateRange() {
    return [timeFormat('%d-%b-%Y')(new Date(this.provenanceState.rawDateRange[0])), timeFormat('%d-%b-%Y')(new Date(this.provenanceState.rawDateRange[1]))];
  }

  get mainCompWidth() { return this._mainCompWidth; }

  set mainCompWidth(input: number) { this._mainCompWidth = input; }
}
const Store = createContext(new RootStore());
export default Store;
