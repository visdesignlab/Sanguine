import { SingleCasePoint } from "../Interfaces/Types/DataTypes";
import { SelectSet } from "../Interfaces/Types/SelectionTypes";

export const checkIfCriteriaMet = (singleCase: SingleCasePoint, procedureUrgencyFilter: [boolean, boolean, boolean], outcomeFilter: string, currentOutputFilterSet: SelectSet[], patientIDSet?: Set<number>) => {
    let criteriaMet = true;
    if (patientIDSet) {
        criteriaMet = patientIDSet.has(singleCase.CASE_ID)
    }
    if (currentOutputFilterSet.length > 0) {
        for (let selectSet of currentOutputFilterSet) {
            if (!selectSet.setValues.includes((singleCase[selectSet.setName]).toString())) {
                criteriaMet = false;
                break;
            }
        }
    }
    if (!procedureUrgencyFilter[singleCase.SURGERY_TYPE]) {
        criteriaMet = false;
    }
    if (outcomeFilter) {
        if (singleCase[outcomeFilter] === 0) {
            criteriaMet = false;
        }
    }
    return criteriaMet;
}

export const bloodComponentOutlierHandler = (input: number, yValueOption: string) => {
    if ((input > 100 && yValueOption === "PRBC_UNITS")) {
        input -= 999
    }
    if ((input > 100 && yValueOption === "PLT_UNITS")) {
        input -= 245
    }
    return input
}