import { SingleCasePoint } from "../Interfaces/Types/DataTypes";
import { SelectSet } from "../Interfaces/Types/SelectionTypes";

export const checkIfCriteriaMet = (singleCase: SingleCasePoint, procedureUrgencyFilter: [boolean, boolean, boolean], outcomeFilter: string, currentOutputFilterSet: SelectSet[], bloodComponentFilter: any, patientIDSet?: Set<number>) => {

    if (patientIDSet) {
        if (!patientIDSet.has(singleCase.CASE_ID)) {
            return false
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
    if (outcomeFilter) {
        if (singleCase[outcomeFilter] === 0) {
            return false;
        }
    }
    if (bloodComponentFilter.PRBC_UNITS[0] > singleCase.PRBC_UNITS || bloodComponentFilter.PRBC_UNITS[1] < singleCase.PRBC_UNITS) {
        return false;
    }
    if (bloodComponentFilter.CELL_SAVER_ML[0] > singleCase.CELL_SAVER_ML || bloodComponentFilter.CELL_SAVER_ML[1] < singleCase.CELL_SAVER_ML) {
        return false;
    }
    if (bloodComponentFilter.FFP_UNITS[0] > singleCase.FFP_UNITS || bloodComponentFilter.FFP_UNITS[1] < singleCase.FFP_UNITS) {
        return false;
    }
    if (bloodComponentFilter.CRYO_UNITS[0] > singleCase.CRYO_UNITS || bloodComponentFilter.CRYO_UNITS[1] < singleCase.CRYO_UNITS) {
        return false;
    }
    if (bloodComponentFilter.PLT_UNITS[0] > singleCase.PLT_UNITS || bloodComponentFilter.PLT_UNITS[1] < singleCase.PLT_UNITS) {
        return false;
    }

    return true;
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