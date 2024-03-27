import { initProvenance, Provenance } from '@visdesignlab/trrack';
import { timeFormat } from 'd3';
import { makeAutoObservable } from 'mobx';
import { createContext } from 'react';
import { ChartStore } from './ChartStore';
import { defaultState } from './DefaultState';
import { ProjectConfigStore } from './ProjectConfigStore';
import { SelectionStore } from './SelectionStore';
import { ActionEvents } from './Types/EventTypes';
import { ApplicationState } from './Types/StateTypes';
import { SingleCasePoint } from './Types/DataTypes';
import { SurgeryUrgencyArray } from '../Presets/DataDict';

export class RootStore {
  provenance: Provenance<ApplicationState, ActionEvents>;
  configStore: ProjectConfigStore;
  selectionStore: SelectionStore;
  chartStore: ChartStore;

  _allCases: SingleCasePoint[];

  private _mainCompWidth: number;

  constructor() {
    this._mainCompWidth = 0;

    this.provenance = initProvenance<ApplicationState, ActionEvents>(
      defaultState
    );
    this.provenance.done();
    this.configStore = new ProjectConfigStore(this);
    this.chartStore = new ChartStore(this);
    this.selectionStore = new SelectionStore(this);

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

  get filteredCases() {
    return this._allCases.filter((d) => {
      // Filter panel items
      if (!(d.CASE_DATE >= this.provenanceState.rawDateRange[0] && d.CASE_DATE <= this.provenanceState.rawDateRange[1])) {
        return false;
      }
      if (this.provenanceState.outcomeFilter.length > 0) {
        return !this.provenanceState.outcomeFilter.some((outcome) => !d[outcome])
      }
      if (!this.provenanceState.surgeryUrgencySelection[SurgeryUrgencyArray.indexOf(d.SURGERY_TYPE_DESC)]) {
        return false;
      }
      if (this.provenanceState.currentSelectPatientGroup.length > 0) {
        return !this.provenanceState.currentSelectPatientGroup.some((patient) => patient.CASE_ID === d.CASE_ID);
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
      const patientCodes = d.ALL_CODES.split(',');
      const procedureFiltered = !this.proceduresSelection.every((procedure) => {
        if (procedure.overlapList && procedure.overlapList.length > 0) {
          // If we're here, then we have a multiple procedures
          // Check for "only procedure"
          if (procedure.overlapList.some((subProcedure) => subProcedure.procedureName.includes('Only'))) {
            return patientCodes.every((code) => procedure.codes.includes(code));
          }

          return procedure.codes.some((code) => patientCodes.includes(code))
            && procedure.overlapList.every((subProcedure) => subProcedure.codes.some((code) => patientCodes.includes(code)));
        } else {
          // If we're here, then we have a single procedure
          return procedure.codes.some((code) => patientCodes.includes(code));
        }
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

  get dateRange() {
    return [timeFormat("%d-%b-%Y")(new Date(this.provenanceState.rawDateRange[0])), timeFormat("%d-%b-%Y")(new Date(this.provenanceState.rawDateRange[1]))];
  }
  get mainCompWidth() { return this._mainCompWidth; }
  set mainCompWidth(input: number) { this._mainCompWidth = input; }

}
const Store = createContext(new RootStore());
export default Store;