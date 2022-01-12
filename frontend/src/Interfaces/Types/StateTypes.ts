import { ProcedureEntry, SingleCasePoint } from "./DataTypes";
import { LayoutElement } from "./LayoutTypes";
import { SelectSet } from "./SelectionTypes";

export type ApplicationState = {
    outcomeFilter: string[];
    rawDateRange: number[];
    proceduresSelection: ProcedureEntry[];
    surgeryUrgencySelection: [boolean, boolean, boolean];
    totalAggregatedCaseCount: number;
    totalIndividualCaseCount: number;
    currentSelectSet: SelectSet[];
    currentOutputFilterSet: SelectSet[];
    showZero: boolean;
    //This two are both case ids
    currentSelectPatientGroup: SingleCasePoint[];
    currentBrushedPatientGroup: SingleCasePoint[];
    BloodProductCost: any;
    nextAddingIndex: number;
    layoutArray: LayoutElement[];
    currentSelectPatient: SingleCasePoint | null;
    bloodComponentFilter: any;
    testValueFilter: any;
};