import { SingleCasePoint } from "../Interfaces/Types/DataTypes";

export const produceAvailableCasesForNonIntervention = (transfusedDataResult: any, hemoglobinDataSet: SingleCasePoint[], procedureUrgencyFilter: [boolean, boolean, boolean], outcomeFilter: string, aggregatedBy: string) => {
    let caseSetReturnedFromQuery = new Set();
    let temporaryDataHolder: any = {};
    transfusedDataResult.forEach((element: any) => {
        caseSetReturnedFromQuery.add(element.case_id);
    })
    hemoglobinDataSet.forEach((singleCase: SingleCasePoint) => {
        if (checkIfCriteriaMet(caseSetReturnedFromQuery, singleCase, procedureUrgencyFilter, outcomeFilter)) {
            //   caseDictionary[singleCase.CASE_ID] = true;
            if (!temporaryDataHolder[singleCase[aggregatedBy]]) {
                temporaryDataHolder[singleCase[aggregatedBy]] = {
                    aggregateAttribute: singleCase[aggregatedBy],
                    data: [],
                    patientIDList: new Set(),
                }
            }
            temporaryDataHolder[singleCase[aggregatedBy]].data.push(singleCase);
            temporaryDataHolder[singleCase[aggregatedBy]].patientIDList.add(singleCase.PATIENT_ID);
        }
    })
    return temporaryDataHolder;
}



export const checkIfCriteriaMet = (caseSetReturnedFromQuery: Set<unknown>, singleCase: SingleCasePoint, procedureUrgencyFilter: [boolean, boolean, boolean], outcomeFilter: string) => {
    let criteriaMet = true;
    // if (currentOutputFilterSet.length > 0) {
    //     for (let selectSet of currentOutputFilterSet) {
    //         if (selectSet.setName === aggregatedBy) {
    //             if (!selectSet.setValues.includes(singleCase[aggregatedBy])) {
    //                 criteriaMet = false;
    //             }
    //         }
    //     }
    // }
    if (!caseSetReturnedFromQuery.has(singleCase.CASE_ID)) {
        criteriaMet = false;
    }
    else if (!procedureUrgencyFilter[singleCase.SURGERY_TYPE]) {
        criteriaMet = false;
    }
    else if (outcomeFilter) {
        if (singleCase[outcomeFilter] === 0) {
            criteriaMet = false;
        }
    }
    return criteriaMet;
}

export const checkIfCriteriaMetDup = (singleCase: SingleCasePoint, procedureUrgencyFilter: [boolean, boolean, boolean], outcomeFilter: string) => {
    let criteriaMet = true;
    // if (currentOutputFilterSet.length > 0) {
    //     for (let selectSet of currentOutputFilterSet) {
    //         if (selectSet.setName === aggregatedBy) {
    //             if (!selectSet.setValues.includes(singleCase[aggregatedBy])) {
    //                 criteriaMet = false;
    //             }
    //         }
    //     }
    // }
    if (!procedureUrgencyFilter[singleCase.SURGERY_TYPE]) {
        criteriaMet = false;
    }
    else if (outcomeFilter) {
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