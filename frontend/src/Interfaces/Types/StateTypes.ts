import { BloodComponent, HemoOption } from '../../Presets/DataDict';
import { ProcedureEntry, SingleCasePoint } from './DataTypes';
import { LayoutElement } from './LayoutTypes';
import { SelectSet } from './SelectionTypes';

export type ApplicationState = {
    outcomeFilter: string[];
    rawDateRange: number[];
    proceduresSelection: ProcedureEntry[];
    surgeryUrgencySelection: [boolean, boolean, boolean];
    surgeonCasesPerformed: [number, number];
    totalAggregatedCaseCount: number;
    totalIndividualCaseCount: number;
    currentSelectSet: SelectSet[];
    currentOutputFilterSet: SelectSet[];
    showZero: boolean;
    // This two are both case ids
    currentFilteredPatientGroup: SingleCasePoint[];
    currentBrushedPatientGroup: SingleCasePoint[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    BloodProductCost: any;
    nextAddingIndex: number;
    layoutArray: LayoutElement[];
    currentSelectPatient: SingleCasePoint | null;
    bloodFilter: Record<BloodComponent | HemoOption, [number, number]>;
    allCases: SingleCasePoint[];
    setAllCases: (input: SingleCasePoint[]) => void;
    filteredCases: SingleCasePoint[];
};
