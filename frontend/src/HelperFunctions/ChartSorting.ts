import { BasicAggregatedDatePoint } from "../Interfaces/Types/DataTypes";

export const sortHelper = (data: BasicAggregatedDatePoint[], xAggregationOption: string, showZero: boolean, secondaryData?: BasicAggregatedDatePoint[]) => {
    let newCaseMax = 0;
    let dataXVals: string[] = []
    if (secondaryData) {
        console.log(secondaryData)
        let dataToObj: any = {}

        secondaryData.map((d) => {
            const calcualtedCaseCount = d.caseCount - (showZero ? 0 : d.zeroCaseNum)
            dataToObj[d.aggregateAttribute] = calcualtedCaseCount;
            newCaseMax = newCaseMax > calcualtedCaseCount ? newCaseMax : calcualtedCaseCount
            dataXVals.push(d.aggregateAttribute)
        })
        data.map((d) => {
            const calcualtedCaseCount = d.caseCount - (showZero ? 0 : d.zeroCaseNum)
            if (dataToObj[d.aggregateAttribute]) {
                dataToObj[d.aggregateAttribute] += calcualtedCaseCount;
            } else {
                dataToObj[d.aggregateAttribute] = calcualtedCaseCount;
                dataXVals.push(d.aggregateAttribute)
            }
            newCaseMax = newCaseMax > calcualtedCaseCount ? newCaseMax : calcualtedCaseCount;
        })
        dataXVals.sort((a, b) => {
            if (xAggregationOption === "YEAR") {
                return parseInt(a) - parseInt(b)
            } else {
                return dataToObj[a] - dataToObj[b];
            }
        })

    }
    else {
        dataXVals = data.sort((a, b) => {
            if (xAggregationOption === "YEAR") {
                return a.aggregateAttribute - b.aggregateAttribute
            } else {
                if (showZero) { return a.caseCount - b.caseCount }
                else { return (a.caseCount - a.zeroCaseNum) - (b.caseCount - b.zeroCaseNum) }
            }
        }).map((dp) => {
            newCaseMax = newCaseMax > dp.caseCount ? newCaseMax : dp.caseCount
            return dp.aggregateAttribute
        });

    }
    return [dataXVals, newCaseMax]
}

