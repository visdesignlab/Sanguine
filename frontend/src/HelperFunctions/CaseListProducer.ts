import { FilterType, SingleCasePoint } from "../Interfaces/Types/DataTypes";
import { SelectSet } from "../Interfaces/Types/SelectionTypes";

export const checkIfCriteriaMet = (singleCase: SingleCasePoint, procedureUrgencyFilter: [boolean, boolean, boolean], outcomeFilter: string[], currentOutputFilterSet: SelectSet[], allFilters: FilterType, patientIDSet?: Set<number>) => {

    if (patientIDSet) {
        if (!patientIDSet.has(singleCase.CASE_ID)) {
            return false;
        }
    }
    if (currentOutputFilterSet.length > 0) {
        for (let selectSet of currentOutputFilterSet) {
            if (!selectSet.setValues.includes((singleCase[selectSet.setName]).toString())) {
                return false;
            }
        }
    }
    if (!procedureUrgencyFilter[singleCase.SURGERY_TYPE]) {
        return false;
    }

    for (const d of outcomeFilter) {
        if (singleCase[d] === 0) {
            return false;
        }
    }
    for (const d of Object.keys(allFilters)) {
        if (allFilters[d][0] > singleCase[d] || allFilters[d][1] < singleCase[d]) {
            return false;
        }
    }
    return true;
};

export const bloodComponentOutlierHandler = (input: number, yValueOption: string) => {
    if ((input > 100 && yValueOption === "PRBC_UNITS")) {
        input -= 999;
    }
    if ((input > 100 && yValueOption === "PLT_UNITS")) {
        input -= 245;
    }
    return input;
};