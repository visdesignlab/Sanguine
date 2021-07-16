import { HeatMapDataPoint } from "../Interfaces/Types/DataTypes";

export const HeatMapSortNoComparison = (data: HeatMapDataPoint[], xAggregationOption: string, showZero: boolean,) => {
    let newCaseMax = 0;
    const tempxVals = data
        .sort((a, b) => {
            if (xAggregationOption === "YEAR") {
                return a.aggregateAttribute - b.aggregateAttribute
            }
            else {
                if (showZero) { return a.caseCount - b.caseCount }
                else { return (a.caseCount - a.zeroCaseNum) - (b.caseCount - b.zeroCaseNum) }
            }
        })
        .map((dp) => {
            if (showZero) { newCaseMax = newCaseMax > dp.caseCount ? newCaseMax : dp.caseCount }
            else {
                newCaseMax = newCaseMax > (dp.caseCount - dp.zeroCaseNum) ? newCaseMax : (dp.caseCount - dp.zeroCaseNum)
            }
            return dp.aggregateAttribute
        })
    return [tempxVals, newCaseMax]
}

