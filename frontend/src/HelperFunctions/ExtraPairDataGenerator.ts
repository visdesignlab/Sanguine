import { median, max, mean, sum } from "d3";
import { SingleCasePoint, BasicAggregatedDatePoint, ExtraPairPoint } from "../Interfaces/Types/DataTypes";
import { create as createpd } from "pdfast";

export const generateExtrapairPlotData = (aggregatedBy: string, hemoglobinDataSet: SingleCasePoint[], extraPairArray: string[], data: BasicAggregatedDatePoint[], componentName: string, bloodProductCost: any) => {
    let newExtraPairData: ExtraPairPoint[] = []
    if (extraPairArray.length > 0) {
        extraPairArray.forEach((variable: string) => {
            let newData = {} as any;
            let caseDictionary = {} as any;
            let temporaryDataHolder: any = {}
            let medianData = {} as any;
            let kdeMax_temp: any = 0
            switch (variable) {
                case "Total Transfusion":
                    //let newDataBar = {} as any;
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        newData[dataPoint.aggregateAttribute] = dataPoint.totalVal;
                    });
                    newExtraPairData.push({ name: "Total Transfusion", label: "Total", data: newData, type: "BarChart" });
                    break;
                case "Per Case":
                    // let newDataPerCase = {} as any;
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        newData[dataPoint.aggregateAttribute] = dataPoint.totalVal / dataPoint.caseCount;
                    });
                    newExtraPairData.push({ name: "Per Case", label: "Per Case", data: newData, type: "BarChart" });
                    break;
                case "Zero Transfusion":
                    //let newDataPerCase = {} as any;
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        newData[dataPoint.aggregateAttribute] = { actualVal: dataPoint.zeroCaseNum, calculated: dataPoint.zeroCaseNum / dataPoint.caseCount, outOfTotal: dataPoint.caseCount };
                    });
                    newExtraPairData.push({ name: "Zero Transfusion", label: "Zero %", data: newData, type: "Basic" });
                    break;
                //How to actually calculate the cost? what would be an apprioate formula?
                case "COST":
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        // newData[dataPoint.aggregateAttribute] = dataPoint.totalVal / (dataPoint.caseCount - dataPoint.zeroCaseNum)
                        newData[dataPoint.aggregateAttribute] = bloodProductCost[componentName] * dataPoint.totalVal / (dataPoint.caseCount)
                    });
                    newExtraPairData.push({
                        name: "COST",
                        label: "Cost",
                        data: newData,
                        type: "BarChart"
                    })
                    break;

                case "DEATH":
                    newExtraPairData.push(outcomeDataGenerate(aggregatedBy, "DEATH", "Death", data, hemoglobinDataSet));
                    break;
                case "VENT":
                    newExtraPairData.push(outcomeDataGenerate(aggregatedBy, "VENT", "Vent", data, hemoglobinDataSet));
                    break;
                case "ECMO":
                    newExtraPairData.push(outcomeDataGenerate(aggregatedBy, "ECMO", "ECMO", data, hemoglobinDataSet));
                    break;
                case "STROKE":
                    newExtraPairData.push(outcomeDataGenerate(aggregatedBy, "STROKE", "Stroke", data, hemoglobinDataSet));
                    break;
                case "AMICAR":
                    newExtraPairData.push(outcomeDataGenerate(aggregatedBy, "AMICAR", "Amicar", data, hemoglobinDataSet));
                    break;
                case "B12":
                    newExtraPairData.push(outcomeDataGenerate(aggregatedBy, "B12", "B12", data, hemoglobinDataSet));
                    break;
                case "TXA":
                    newExtraPairData.push(outcomeDataGenerate(aggregatedBy, "TXA", "TXA", data, hemoglobinDataSet));
                    break;

                case "RISK":
                    // let temporaryDataHolder: any = {}
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        temporaryDataHolder[dataPoint.aggregateAttribute] = []
                        caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList)
                    })
                    hemoglobinDataSet.forEach((ob: any) => {
                        if (temporaryDataHolder[ob[aggregatedBy]] && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
                            temporaryDataHolder[ob[aggregatedBy]].push(ob.DRG_WEIGHT)
                        }
                    })
                    for (const [key, value] of Object.entries(temporaryDataHolder)) {
                        medianData[key] = median(value as any);
                        let pd = createpd(value, { min: 0, max: 30 });
                        pd = [{ x: 0, y: 0 }].concat(pd)

                        if ((value as any).length > 5) {
                            kdeMax_temp = (max(pd, (val: any) => val.y) as any) > kdeMax_temp ? max(pd, (val: any) => val.y) : kdeMax_temp
                        }

                        let reversePd = pd.map((pair: any) => {

                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reversePd)
                        newData[key] = { kdeArray: pd, dataPoints: value };
                    }
                    newExtraPairData.push({ name: "RISK", label: "DRG Weight", data: newData, type: "Violin", medianSet: medianData, kdeMax: kdeMax_temp });
                    break;

                case "Preop HGB":
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        newData[dataPoint.aggregateAttribute] = [];
                        caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList)
                    });

                    hemoglobinDataSet.forEach((ob: SingleCasePoint) => {
                        const resultValue = ob.PREOP_HGB
                        if (newData[ob[aggregatedBy]] && resultValue > 0 && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
                            newData[ob[aggregatedBy]].push(resultValue);
                        }
                    });
                    for (let prop in newData) {
                        medianData[prop] = median(newData[prop]);
                        let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        if ((newData[prop] as any).length > 5) {
                            kdeMax_temp = (max(pd, (val: any) => val.y) as any) > kdeMax_temp ? max(pd, (val: any) => val.y) : kdeMax_temp
                        }

                        let reversePd = pd.map((pair: any) => {

                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reversePd);
                        newData[prop] = { kdeArray: pd, dataPoints: newData[prop] };
                    }
                    newExtraPairData.push({ name: "Preop HGB", label: "Preop HGB", data: newData, type: "Violin", medianSet: medianData, kdeMax: kdeMax_temp });
                    break;
                case "Postop HGB":
                    //let newData = {} as any;
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        newData[dataPoint.aggregateAttribute] = [];
                        caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList)
                    });
                    hemoglobinDataSet.forEach((ob: any) => {
                        const resultValue = parseFloat(ob.POSTOP_HGB);
                        if (newData[ob[aggregatedBy]] && resultValue > 0 && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
                            newData[ob[aggregatedBy]].push(resultValue);
                        }
                    });
                    for (let prop in newData) {
                        medianData[prop] = median(newData[prop]);
                        let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        if ((newData[prop] as any).length > 5) {
                            kdeMax_temp = (max(pd, (val: any) => val.y) as any) > kdeMax_temp ? max(pd, (val: any) => val.y) : kdeMax_temp
                        }

                        let reversePd = pd.map((pair: any) => {

                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reversePd);
                        newData[prop] = { kdeArray: pd, dataPoints: newData[prop] };
                    }
                    newExtraPairData.push({ name: "Postop HGB", label: "Postop HGB", data: newData, type: "Violin", medianSet: medianData, kdeMax: kdeMax_temp });
                    break;
                default:
                    break;
            }
        }
        )
    }
    return newExtraPairData;
}

const outcomeDataGenerate = (aggregatedBy: string, name: string, label: string, data: BasicAggregatedDatePoint[], hemoglobinDataSet: SingleCasePoint[]) => {
    let temporaryDataHolder: any = {};
    let newData = {} as any;
    let caseDictionary = {} as any;
    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
        temporaryDataHolder[dataPoint.aggregateAttribute] = [];
        caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList)
        newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.caseCount }
    })
    hemoglobinDataSet.forEach((ob: any) => {
        if (temporaryDataHolder[ob[aggregatedBy]] && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
            temporaryDataHolder[ob[aggregatedBy]].push(ob[name])
        }
    })
    for (const [key, value] of Object.entries(temporaryDataHolder)) {
        newData[key].calculated = mean(value as any);
        newData[key].actualVal = sum(value as any);

    }
    return ({ name: name, label: label, data: newData, type: "Basic" })
}