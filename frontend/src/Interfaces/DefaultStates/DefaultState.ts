import { ManualInfinity } from '../../Presets/Constants';
import { ApplicationState } from '../Types/StateTypes';

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
    PRBC_UNITS: 200,
    FFP_UNITS: 55,
    CRYO_UNITS: 70,
    PLT_UNITS: 650,
    CELL_SAVER_ML: 300,
  },
  currentSelectPatient: null,
  bloodFilter: {
    PRBC_UNITS: [0, ManualInfinity],
    FFP_UNITS: [0, ManualInfinity],
    CRYO_UNITS: [0, ManualInfinity],
    PLT_UNITS: [0, ManualInfinity],
    CELL_SAVER_ML: [0, ManualInfinity],
    PREOP_HEMO: [0, ManualInfinity],
    POSTOP_HEMO: [0, ManualInfinity],
  },
  allCases: [],
  setAllCases: (_: unknown) => { },
  filteredCases: [],
};
