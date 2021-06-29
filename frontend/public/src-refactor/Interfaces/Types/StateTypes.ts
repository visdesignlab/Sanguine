import { SingleCasePoint } from "./DataTypes";
import { LayoutElement } from "./LayoutTypes";
import { SelectSet } from "./SelectionTypes";

export type ApplicationState = {
    outcomesSelection: string;
    rawDateRange: number[];
    proceduresSelection: string[];
    procedureTypeSelection: [boolean, boolean, boolean];
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
}