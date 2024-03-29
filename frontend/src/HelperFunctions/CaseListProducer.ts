import { SingleCasePoint } from "../Interfaces/Types/DataTypes";
import { SelectSet } from "../Interfaces/Types/SelectionTypes";
import { BloodComponentOptions, ScatterYOptions } from "../Presets/DataDict";

export const checkIfCriteriaMet = (singleCase: SingleCasePoint, procedureUrgencyFilter: [boolean, boolean, boolean], outcomeFilter: string[], currentOutputFilterSet: SelectSet[], bloodComponentFilter: any, testValueFilter: any, patientIDSet?: Set<number>) => {

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
    let toReturn = true;
    outcomeFilter.forEach((d) => {
        if (singleCase[d] === 0) {
            toReturn = false;
        }
    });
    BloodComponentOptions.forEach((d) => {
        if (bloodComponentFilter[d.key][0] > singleCase[d.key] || bloodComponentFilter[d.key][1] < singleCase[d.key]) {
            toReturn = false;
        }
    });
    ScatterYOptions.forEach((d) => {
        if (testValueFilter[d.key][0] > singleCase[d.key] || testValueFilter[d.key][1] < singleCase[d.key]) {
            toReturn = false;
        }
    });
    return toReturn;
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