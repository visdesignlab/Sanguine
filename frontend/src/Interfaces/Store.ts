/* eslint-disable import/no-cycle */
import { initProvenance, Provenance } from '@visdesignlab/trrack';
import { timeFormat } from 'd3';
import { makeAutoObservable } from 'mobx';
import { createContext } from 'react';
import { ChartStore } from './ChartStore';
import { defaultState } from './PresetStates/DefaultState';
import { ProjectConfigStore } from './ProjectConfigStore';
import { InteractionStore } from './InteractionStore';
import { ActionEvents } from './Types/EventTypes';
import { ApplicationState } from './Types/StateTypes';
import { SingleCasePoint } from './Types/DataTypes';
import { SurgeryUrgencyArray } from '../Presets/DataDict';

export class RootStore {
  provenance: Provenance<ApplicationState, ActionEvents>;

  configStore: ProjectConfigStore;

  interactionStore: InteractionStore;

  chartStore: ChartStore;

  _allCases: SingleCasePoint[];

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

    this._allCases = [];

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

  get allCases() {
    return this._allCases;
  }

  set allCases(input: SingleCasePoint[]) {
    this._allCases = input;
  }

  get providerMapping(): Record<string, string> {
    const surgeons = this._allCases.map((d) => [d.SURGEON_PROV_ID, d.SURGEON_PROV_NAME]);
    const anesths = this._allCases.map((d) => [d.ANESTH_PROV_ID, d.ANESTH_PROV_NAME]);
    return Object.fromEntries(
      [...surgeons, ...anesths].filter((d) => d[0] !== null && d[1] !== null),
    );
  }

  get filteredCases() {
    return this._allCases.filter((d) => {
      // Date range filter
      if (!(d.CASE_DATE >= this.provenanceState.rawDateRange[0] && d.CASE_DATE <= this.provenanceState.rawDateRange[1])) {
        return false;
      }
      // Outcome filter
      if (this.provenanceState.outcomeFilter.length > 0) {
        // Return false instead of direct return statement to allow for AND logic
        if (this.provenanceState.outcomeFilter.some((outcome) => !d[outcome])) {
          return false;
        }
      }
      // Surgery urgency filter
      if (!this.provenanceState.surgeryUrgencySelection[SurgeryUrgencyArray.indexOf(d.SURGERY_TYPE_DESC)]) {
        return false;
      }
      // Surgeon cases performed filter
      if (this.surgeonCasesPerformedRange[d.SURGEON_PROV_ID] < this.provenanceState.surgeonCasesPerformed[0] || this.surgeonCasesPerformedRange[d.SURGEON_PROV_ID] > this.provenanceState.surgeonCasesPerformed[1]) {
        return false;
      }
      // Patients filter
      if (
        this.provenanceState.currentFilteredPatientGroup.length > 0
        && !this.provenanceState.currentFilteredPatientGroup.some((patient) => patient.CASE_ID === d.CASE_ID)
      ) {
        return false;
      }
      // Output filter set
      if (
        this.provenanceState.currentOutputFilterSet.length > 0
        && !this.provenanceState.currentOutputFilterSet.some((output) => output.setValues.includes(`${d[output.setName]}`))
      ) {
        return false;
      }

      // Blood filters (transfusions and tests) ------------------
      const bloodFiltered = Object.entries(this.provenanceState.bloodFilter)
        .some(([bloodComponent, range]) => {
          const patientValue = d[bloodComponent] as number;
          return patientValue < range[0] || patientValue > range[1];
        });
      if (bloodFiltered) {
        return false;
      }

      // Procedure filters -------------------------------
      const hasAnyProcedure = this.provenanceState.proceduresSelection.length > 0;

      // If there are selected procedures, filter cases based on the selected procedures
      const procedureFiltered = hasAnyProcedure && !this.provenanceState.proceduresSelection.some((procedure) => {
        const patientCodes = d.ALL_CODES.split(',');

        // Sub-procedures selected (overlapList)
        if (procedure.overlapList && procedure.overlapList.length > 0) {
          return procedure.codes.some((code) => patientCodes.includes(code))
            && procedure.overlapList.some((subProcedure) => subProcedure.codes.some((code) => patientCodes.includes(code)));
        }

        // Main procedure selected
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
      PRBC_UNITS: [0, 0],
      FFP_UNITS: [0, 0],
      PLT_UNITS: [0, 0],
      CRYO_UNITS: [0, 0],
      CELL_SAVER_ML: [0, 0],
      PREOP_HEMO: [0, 0],
      POSTOP_HEMO: [0, 0],
    };
    this.allCases.forEach((d) => {
      Object.keys(filterRange).forEach((key) => {
        filterRange[key][1] = Math.max(d[key] as number, filterRange[key][1]);
      });
    });
    return filterRange;
  }

  get surgeonCasesPerformedRange() {
    const surgeonCases = this._allCases.reduce((acc, d) => {
      if (!acc[d.SURGEON_PROV_ID]) {
        acc[d.SURGEON_PROV_ID] = 0;
      }
      acc[d.SURGEON_PROV_ID] += 1;
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
