import { SingleCasePoint } from "./DataTypes";
import { LayoutElement } from "./LayoutTypes";
import { SelectSet } from "./SelectionTypes";

export type ApplicationState = {
    outcomeFilter: string;
    rawDateRange: number[];
    proceduresSelection: string[];
    surgeryUrgencySelection: [boolean, boolean, boolean];
    //rawproceduresSelection: string;
    totalAggregatedCaseCount: number;
    totalIndividualCaseCount: number;
    // dumbbellSorted: boolean;
    currentSelectSet: SelectSet[];
    currentOutputFilterSet: SelectSet[];
    // currentSelectPatient: SingleCasePoint[] | null;
    showZero: boolean;
    //This two are both case ids
    currentSelectPatientGroup: SingleCasePoint[];
    currentBrushedPatientGroup: SingleCasePoint[];
    BloodProductCost: any;
    nextAddingIndex: number;
    layoutArray: LayoutElement[];
    currentSelectPatient: SingleCasePoint | null;
}