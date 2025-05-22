import { ManualInfinity } from '../Presets/Constants';
import { ApplicationState } from './Types/StateTypes';

const today = new Date();
today.setDate(today.getDate() + 1);

export const defaultState: ApplicationState = {
  layoutArray: [],
  surgeryUrgencySelection: [true, true, true],
  surgeonCasesPerformed: [5, ManualInfinity],
  outcomeFilter: [],
  rawDateRange: [new Date(2018, 2, 6).getTime(), today.getTime()],
  proceduresSelection: [],
  totalAggregatedCaseCount: 0,
  totalIndividualCaseCount: 0,
  currentOutputFilterSet: [],
  currentSelectSet: [],
  nextAddingIndex: 0,
  showZero: true,
  currentFilteredPatientGroup: [],
  currentSelectedPatientGroup: [],
  BloodProductCost: {
    rbc_units: 200,
    ffp_units: 55,
    cryo_units: 70,
    plt_units: 650,
    cell_saver_ml: 300,
  },
  currentSelectPatient: null,
  bloodFilter: {
    rbc_units: [0, ManualInfinity],
    ffp_units: [0, ManualInfinity],
    cryo_units: [0, ManualInfinity],
    plt_units: [0, ManualInfinity],
    cell_saver_ml: [0, ManualInfinity],
    PREOP_HEMO: [0, ManualInfinity],
    POSTOP_HEMO: [0, ManualInfinity],
  },
  allVisits: [],
  setallVisits: (_: unknown) => { },
  filteredCases: [],
};
