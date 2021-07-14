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

export const produceAvailableCasesForIntervention = (transfusedDataResult: any, hemoglobinDataSet: SingleCasePoint[], procedureUrgencyFilter: [boolean, boolean, boolean], outcomeFilter: string, aggregatedBy: string, outcomeComparison: string) => {
    let caseSetReturnedFromQuery = new Set();
    let temporaryDataHolder: any = {};
    transfusedDataResult.forEach((element: any) => {
        caseSetReturnedFromQuery.add(element.case_id);
    })
    hemoglobinDataSet.forEach((singleCase: SingleCasePoint) => {

        if (checkIfCriteriaMet(caseSetReturnedFromQuery, singleCase, procedureUrgencyFilter, outcomeFilter)) {
            const caseOutcome = singleCase[outcomeComparison];
            if (!temporaryDataHolder[singleCase[aggregatedBy]]) {
                temporaryDataHolder[singleCase[aggregatedBy]] = {
                    aggregateAttribute: singleCase[aggregatedBy],
                    preData: [],
                    postData: [],
                    prePatientIDList: new Set(),
                    postPatienIDList: new Set(),
                    preCaseIDList: new Set(),
                    postCaseIDList: new Set()
                }
            }
            if (caseOutcome > 0) {
                temporaryDataHolder[singleCase[aggregatedBy]].preData.push(singleCase);
                temporaryDataHolder[singleCase[aggregatedBy]].prePatientIDList.add(singleCase.PATIENT_ID);
            } else {
                temporaryDataHolder[singleCase[aggregatedBy]].postData.push(singleCase);
                temporaryDataHolder[singleCase[aggregatedBy]].postPatienIDList.add(singleCase.PATIENT_ID);
            }
        }
    })
    return temporaryDataHolder;
}

const checkIfCriteriaMet = (caseSetReturnedFromQuery: Set<unknown>, singleCase: SingleCasePoint, procedureUrgencyFilter: [boolean, boolean, boolean], outcomeFilter: string) => {
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