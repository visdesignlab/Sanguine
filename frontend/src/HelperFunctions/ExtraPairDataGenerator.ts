import { median, max, mean, sum } from "d3";
import { SingleCasePoint, BasicAggregatedDatePoint, ExtraPairPoint } from "../Interfaces/Types/DataTypes";
import { create as createpd } from "pdfast";

export const generateExtrapairPlotData = (aggregatedBy: string, hemoglobinDataSet: SingleCasePoint[], extraPairArray: string[], data: BasicAggregatedDatePoint[]) => {
    let newExtraPairData: ExtraPairPoint[] = [];
    if (extraPairArray.length > 0) {
        extraPairArray.forEach((variable: string) => {
            let newData = {} as any;
            let caseDictionary = {} as any;
            let temporaryDataHolder: any = {};
            let medianData = {} as any;
            let kdeMax_temp: any = 0;
            switch (variable) {

                case "TOTAL_TRANS":
                    //let newDataBar = {} as any;
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        newData[dataPoint.aggregateAttribute] = dataPoint.totalVal;
                    });
                    newExtraPairData.push({ name: "TOTAL_TRANS", label: "Total", data: newData, type: "BarChart" });
                    break;
                case "PER_CASE":
                    // let newDataPerCase = {} as any;
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        newData[dataPoint.aggregateAttribute] = dataPoint.totalVal / dataPoint.caseCount;
                    });
                    newExtraPairData.push({ name: "PER_CASE", label: "Per Case", data: newData, type: "BarChart" });
                    break;
                case "ZERO_TRANS":
                    //let newDataPerCase = {} as any;
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        newData[dataPoint.aggregateAttribute] = { actualVal: dataPoint.zeroCaseNum, calculated: dataPoint.zeroCaseNum / dataPoint.caseCount, outOfTotal: dataPoint.caseCount };
                    });
                    newExtraPairData.push({ name: "ZERO_TRANS", label: "Zero %", data: newData, type: "Basic" });
                    break;
                case 'IVIRON':
                case 'ORALIRON':
                case "DEATH":
                case "VENT":
                case "ECMO":
                case "STROKE":
                case "AMICAR":
                case "RENAL_FAILURE":
                case "TXA":
                    newExtraPairData.push(outcomeDataGenerate(aggregatedBy, variable, variable, data, hemoglobinDataSet));
                    break;
                case 'TOTAL_LOS':
                case "DRG_WEIGHT":
                    // let temporaryDataHolder: any = {}
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        temporaryDataHolder[dataPoint.aggregateAttribute] = [];
                        caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList);
                    });
                    let valueMax = 0;
                    hemoglobinDataSet.forEach((ob: any) => {
                        if (temporaryDataHolder[ob[aggregatedBy]] && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
                            temporaryDataHolder[ob[aggregatedBy]].push(ob[variable]);
                            valueMax = valueMax > ob[variable] ? valueMax : ob[variable];
                        }
                    });
                    for (const [key, value] of Object.entries(temporaryDataHolder)) {
                        medianData[key] = median(value as any);
                        let pd = createpd(value, { min: 0, max: variable === 'DRG_WEIGHT' ? 30 : valueMax });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        if ((value as any).length > 5) {
                            kdeMax_temp = (max(pd, (val: any) => val.y) as any) > kdeMax_temp ? max(pd, (val: any) => val.y) : kdeMax_temp;
                        }

                        let reversePd = pd.map((pair: any) => {

                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reversePd);
                        newData[key] = { kdeArray: pd, dataPoints: value };
                    }
                    newExtraPairData.push({ name: variable, label: variable, data: newData, type: "Violin", medianSet: medianData, kdeMax: kdeMax_temp, valueMax: variable === 'DRG_WEIGHT' ? 30 : valueMax });
                    break;
                case "POSTOP_HGB":
                case "PREOP_HGB":
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        newData[dataPoint.aggregateAttribute] = [];
                        caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList);
                    });

                    hemoglobinDataSet.forEach((ob: SingleCasePoint) => {
                        const resultValue = ob[variable];
                        if (newData[ob[aggregatedBy]] && resultValue > 0 && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
                            newData[ob[aggregatedBy]].push(resultValue);
                        }
                    });
                    for (let prop in newData) {
                        medianData[prop] = median(newData[prop]);
                        let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        if ((newData[prop] as any).length > 5) {
                            kdeMax_temp = (max(pd, (val: any) => val.y) as any) > kdeMax_temp ? max(pd, (val: any) => val.y) : kdeMax_temp;
                        }

                        let reversePd = pd.map((pair: any) => {

                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reversePd);
                        newData[prop] = { kdeArray: pd, dataPoints: newData[prop] };
                    }
                    newExtraPairData.push({ name: variable, label: variable, data: newData, type: "Violin", medianSet: medianData, kdeMax: kdeMax_temp, valueMax: 18 });
                    break;
                default:
                    break;
            }
        }
        );
    }
    return newExtraPairData;
};

const outcomeDataGenerate = (aggregatedBy: string, name: string, label: string, data: BasicAggregatedDatePoint[], hemoglobinDataSet: SingleCasePoint[]) => {
    let temporaryDataHolder: any = {};
    let newData = {} as any;
    let caseDictionary = {} as any;
    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
        temporaryDataHolder[dataPoint.aggregateAttribute] = [];
        caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList);
        newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.caseCount };
    });
    hemoglobinDataSet.forEach((ob: any) => {
        if (temporaryDataHolder[ob[aggregatedBy]] && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
            temporaryDataHolder[ob[aggregatedBy]].push(ob[name]);
        }
    });
    for (const [key, value] of Object.entries(temporaryDataHolder)) {
        newData[key].calculated = mean(value as any);
        newData[key].actualVal = sum(value as any);

    }
    return ({ name: name, label: label, data: newData, type: "Basic" });
};