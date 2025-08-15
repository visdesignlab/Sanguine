import { BloodComponent, HemoOption } from '../../Presets/DataDict';
import { ProcedureEntry, Surgery } from './DataTypes';
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
    currentFilteredPatientGroup: Surgery[];
    currentSelectedPatientGroup: Surgery[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    BloodProductCost: any;
    nextAddingIndex: number;
    layoutArray: LayoutElement[];
    currentSelectPatient: Surgery | null;
    bloodFilter: Record<BloodComponent | HemoOption, [number, number]>;
    allVisits: Surgery[];
    setallVisits: (input: Surgery[]) => void;
    filteredCases: Surgery[];
};
