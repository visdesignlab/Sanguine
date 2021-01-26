import { BasicAggregatedDatePoint, ExtraPairInterventionPoint, ComparisonDataPoint, ExtraPairPoint, SingleCasePoint, HeatMapDataPoint } from "./Interfaces/ApplicationState"
import { mean, median, sum, max } from "d3";
import { create as createpd } from "pdfast";
import { BloodProductCap, BloodProductCost } from "./PresetsProfile";

export const stateUpdateWrapperUseJSON = (oldState: any, newState: any, updateFunction: (value: React.SetStateAction<any>) => void) => {
    if (JSON.stringify(oldState) !== JSON.stringify(newState)) {
        updateFunction(newState)
    }
}

export const generateExtrapairPlotDataWithIntervention = (aggregatedBy: string, hemoglobinDataSet: SingleCasePoint[], extraPairArray: string[], data: ComparisonDataPoint[], componentName: string) => {
    let newExtraPairData: ExtraPairInterventionPoint[] = []
    if (extraPairArray.length > 0) {
        extraPairArray.forEach((variable: string) => {
            let newData = {} as any;
            let temporaryDataHolder: any = {}
            let temporaryPreIntDataHolder: any = {}
            let temporaryPostIntDataHolder: any = {}
            let preIntData = {} as any;
            let postIntData = {} as any;
            let postMedianData = {} as any;
            let preMedianData = {} as any;
            let medianData = {} as any;

            let preCaseDicts = {} as any;
            let postCaseDicts = {} as any;
            let kdeMax_nonInt: any = 0;
            let kdeMax_Int: any = 0;

            switch (variable) {
                case "Total Transfusion":
                    //let newDataBar = {} as any;
                    data.forEach((dataPoint: ComparisonDataPoint) => {
                        newData[dataPoint.aggregateAttribute] = dataPoint.preTotalVal + dataPoint.postTotalVal;
                        preIntData[dataPoint.aggregateAttribute] = dataPoint.preTotalVal;
                        postIntData[dataPoint.aggregateAttribute] = dataPoint.postTotalVal;
                    });
                    //     console.log(data)
                    newExtraPairData.push({ name: "Total Transfusion", label: "Total", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "BarChart" });
                    break;

                case "Per Case":
                    // let newDataPerCase = {} as any;
                    data.forEach((dataPoint: ComparisonDataPoint) => {
                        newData[dataPoint.aggregateAttribute] = (dataPoint.preTotalVal + dataPoint.postTotalVal) / (dataPoint.preCaseCount + dataPoint.postCaseCount);
                        preIntData[dataPoint.aggregateAttribute] = dataPoint.preTotalVal / dataPoint.preCaseCount;
                        postIntData[dataPoint.aggregateAttribute] = dataPoint.postTotalVal / dataPoint.postCaseCount;

                    });
                    newExtraPairData.push({ name: "Per Case", label: "Per Case", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "BarChart" });
                    break;
                //Same as the non comparison case, what would be an appropriate formula?
                case "COST":
                    data.forEach((dataPoint: ComparisonDataPoint) => {
                        // newData[dataPoint.aggregateAttribute] = (dataPoint.preTotalVal + dataPoint.postTotalVal) / (dataPoint.preCaseCount + dataPoint.postCaseCount - dataPoint.preZeroCaseNum - dataPoint.postZeroCaseNum)
                        // preIntData[dataPoint.aggregateAttribute] = dataPoint.preTotalVal / (dataPoint.preCaseCount - dataPoint.preZeroCaseNum);
                        // postIntData[dataPoint.aggregateAttribute] = dataPoint.postTotalVal / (dataPoint.postCaseCount - dataPoint.postZeroCaseNum);
                        newData[dataPoint.aggregateAttribute] = BloodProductCost[componentName] * (dataPoint.preTotalVal + dataPoint.postTotalVal) / (dataPoint.preCaseCount + dataPoint.postCaseCount)
                        preIntData[dataPoint.aggregateAttribute] = BloodProductCost[componentName] * dataPoint.preTotalVal / (dataPoint.preCaseCount);
                        postIntData[dataPoint.aggregateAttribute] = BloodProductCost[componentName] * dataPoint.postTotalVal / (dataPoint.postCaseCount);
                    });
                    newExtraPairData.push({
                        name: "COST",
                        label: "Cost",
                        preIntData: preIntData,
                        postIntData: postIntData,
                        totalIntData: newData,
                        type: "BarChart"
                    })
                    break;

                //TODO Add actual number to the result so that the hover pop is showing actual numbers. 
                case "Zero Transfusion":
                    //let newDataPerCase = {} as any;
                    // console.log(data)
                    data.forEach((dataPoint: ComparisonDataPoint) => {

                        newData[dataPoint.aggregateAttribute] = {
                            calculated: (dataPoint.preZeroCaseNum + dataPoint.postZeroCaseNum) / (dataPoint.preCaseCount + dataPoint.postCaseCount),
                            actualVal: (dataPoint.preZeroCaseNum + dataPoint.postZeroCaseNum),
                            outOfTotal: dataPoint.preCaseCount + dataPoint.postCaseCount
                        }

                        preIntData[dataPoint.aggregateAttribute] = {
                            calculated: dataPoint.preZeroCaseNum / dataPoint.preCaseCount,
                            actualVal: dataPoint.preZeroCaseNum,
                            outOfTotal: dataPoint.preCaseCount
                        }

                        postIntData[dataPoint.aggregateAttribute] = {
                            calculated: dataPoint.postZeroCaseNum / dataPoint.postCaseCount,
                            actualVal: dataPoint.postZeroCaseNum,
                            outOfTotal: dataPoint.postCaseCount
                        }
                    });
                    console.log(newData, preIntData, postIntData)
                    newExtraPairData.push({ name: "Zero Transfusion", label: "Zero %", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });
                    break;

                case "DEATH":
                    newExtraPairData.push(outcomeComparisonDataGenerate("DEATH", "Death", data, hemoglobinDataSet, aggregatedBy));
                    break;

                case "VENT":
                    newExtraPairData.push(outcomeComparisonDataGenerate("VENT", "Vent", data, hemoglobinDataSet, aggregatedBy));
                    break;

                case "ECMO":
                    newExtraPairData.push(outcomeComparisonDataGenerate("ECMO", "ECMO", data, hemoglobinDataSet, aggregatedBy));
                    break;
                case "STROKE":
                    newExtraPairData.push(outcomeComparisonDataGenerate("STROKE", "Stroke", data, hemoglobinDataSet, aggregatedBy));
                    break;
                case "B12":
                    newExtraPairData.push(outcomeComparisonDataGenerate("B12", "B12", data, hemoglobinDataSet, aggregatedBy));
                    break;
                case "TXA":
                    newExtraPairData.push(outcomeComparisonDataGenerate("TXA", "TXA", data, hemoglobinDataSet, aggregatedBy));
                    break;
                case "AMICAR":
                    newExtraPairData.push(outcomeComparisonDataGenerate("AMICAR", "Amicar", data, hemoglobinDataSet, aggregatedBy));
                    break;

                case "RISK":
                    // let temporaryDataHolder: any = {}
                    data.forEach((dataPoint: ComparisonDataPoint) => {
                        preCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.preCaseIDList)
                        postCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.postCaseIDList)

                        temporaryPreIntDataHolder[dataPoint.aggregateAttribute] = []
                        temporaryPostIntDataHolder[dataPoint.aggregateAttribute] = []
                        temporaryDataHolder[dataPoint.aggregateAttribute] = []
                    })
                    hemoglobinDataSet.forEach((ob: any) => {
                        if (temporaryDataHolder[ob[aggregatedBy]] &&
                            (preCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID) || postCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID))) {
                            temporaryDataHolder[ob[aggregatedBy]].push(ob.DRG_WEIGHT)
                            if (preCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                temporaryPreIntDataHolder[ob[aggregatedBy]].push(ob.DRG_WEIGHT);
                            }
                            if (postCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                temporaryPostIntDataHolder[ob[aggregatedBy]].push(ob.DRG_WEIGHT);
                            }
                        }
                    })

                    for (const [key, value] of Object.entries(temporaryDataHolder)) {
                        medianData[key] = median(value as any);
                        preMedianData[key] = median(temporaryPreIntDataHolder[key]);
                        postMedianData[key] = median(temporaryPostIntDataHolder[key]);

                        let pd = createpd(value, { min: 0, max: 30 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        if ((value as any).length > 5) {
                            kdeMax_nonInt = (max(pd, (val: any) => val.y) as any) > kdeMax_nonInt ? max(pd, (val: any) => val.y) : kdeMax_nonInt
                        }

                        let reverse_pd = pd.map((pair: any) => {
                            return { x: pair.x, y: -pair.y };
                        }).reverse();

                        pd = pd.concat(reverse_pd);
                        newData[key] = { kdeArray: pd, dataPoints: value };

                        pd = createpd(temporaryPreIntDataHolder[key], { min: 0, max: 30 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        if (temporaryPreIntDataHolder[key].length > 5) {
                            kdeMax_Int = (max(pd, (val: any) => val.y) as any) > kdeMax_Int ? max(pd, (val: any) => val.y) : kdeMax_Int
                        }

                        reverse_pd = pd.map((pair: any) => {
                            // kdeMax_temp = pair.y > kdeMax_temp ? pair.y : kdeMax_temp;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        preIntData[key] = { kdeArray: pd, dataPoints: temporaryPreIntDataHolder[key] };

                        pd = createpd(temporaryPostIntDataHolder[key], { min: 0, max: 30 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        if (temporaryPostIntDataHolder[key].length > 5) {
                            kdeMax_Int = (max(pd, (val: any) => val.y) as any) > kdeMax_Int ? max(pd, (val: any) => val.y) : kdeMax_Int
                        }

                        reverse_pd = pd.map((pair: any) => {

                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        postIntData[key] = { kdeArray: pd, dataPoints: temporaryPostIntDataHolder[key] };
                    }

                    newExtraPairData.push({
                        name: "RISK",
                        label: "DRG Weight",
                        preIntData: preIntData,
                        postIntData: postIntData,
                        totalIntData: newData,
                        type: "Violin",
                        totalMedianSet: medianData,
                        preMedianSet: preMedianData,
                        postMedianSet: postMedianData,
                        totalKdeMax: kdeMax_nonInt,
                        halfKdeMax: kdeMax_Int
                    });
                    break;
                case "Preop HGB":
                    data.forEach((dataPoint: ComparisonDataPoint) => {
                        preCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.preCaseIDList)
                        postCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.postCaseIDList)

                        newData[dataPoint.aggregateAttribute] = [];
                        preIntData[dataPoint.aggregateAttribute] = [];
                        postIntData[dataPoint.aggregateAttribute] = [];
                    });
                    hemoglobinDataSet.forEach((ob: any) => {
                        const resultValue = parseFloat(ob.PREOP_HGB);
                        if (newData[ob[aggregatedBy]] && resultValue > 0 &&
                            (preCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID) || postCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID))) {
                            newData[ob[aggregatedBy]].push(resultValue);
                            if (preCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                preIntData[ob[aggregatedBy]].push(resultValue);
                            }
                            if (postCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                postIntData[ob[aggregatedBy]].push(resultValue);
                            }
                        }
                    });

                    for (let prop in newData) {
                        medianData[prop] = median(newData[prop]) || 0;
                        preMedianData[prop] = median(preIntData[prop]) || 0;
                        postMedianData[prop] = median(postIntData[prop]) || 0;

                        let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        if ((newData[prop] as any).length > 5) {
                            kdeMax_nonInt = (max(pd, (val: any) => val.y) as any) > kdeMax_nonInt ? max(pd, (val: any) => val.y) : kdeMax_nonInt
                        }

                        let reverse_pd = pd.map((pair: any) => {
                            // kdeMax_temp = pair.y > kdeMax_temp ? pair.y : kdeMax_temp;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        newData[prop] = { kdeArray: pd, dataPoints: newData[prop] };

                        pd = createpd(preIntData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        if (preIntData[prop].length > 5) {
                            kdeMax_Int = (max(pd, (val: any) => val.y) as any) > kdeMax_Int ? max(pd, (val: any) => val.y) : kdeMax_Int
                        }

                        reverse_pd = pd.map((pair: any) => {
                            //  kdeMax_temp = pair.y > kdeMax_temp ? pair.y : kdeMax_temp;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        preIntData[prop] = { kdeArray: pd, dataPoints: preIntData[prop] };

                        pd = createpd(postIntData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);
                        //  kdeMax_temp = 0
                        if (postIntData[prop].length > 5) {
                            kdeMax_Int = (max(pd, (val: any) => val.y) as any) > kdeMax_Int ? max(pd, (val: any) => val.y) : kdeMax_Int
                        }

                        reverse_pd = pd.map((pair: any) => {
                            //      kdeMax_temp = pair.y > kdeMax_temp ? pair.y : kdeMax_temp;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        postIntData[prop] = { kdeArray: pd, dataPoints: postIntData[prop] };
                    }

                    newExtraPairData.push({
                        name: "Preop HGB",
                        label: "Preop HGB",
                        preIntData: preIntData,
                        postIntData: postIntData,
                        totalIntData: newData,
                        type: "Violin",
                        totalMedianSet: medianData,
                        preMedianSet: preMedianData,
                        postMedianSet: postMedianData,
                        halfKdeMax: kdeMax_Int,
                        totalKdeMax: kdeMax_nonInt
                    });
                    break;

                case "Postop HGB":
                    data.forEach((dataPoint: ComparisonDataPoint) => {
                        preCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.preCaseIDList)
                        postCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.postCaseIDList)

                        newData[dataPoint.aggregateAttribute] = [];
                        preIntData[dataPoint.aggregateAttribute] = [];
                        postIntData[dataPoint.aggregateAttribute] = [];
                    });
                    hemoglobinDataSet.forEach((ob: any) => {
                        const resultValue = parseFloat(ob.POSTOP_HGB);
                        if (newData[ob[aggregatedBy]] && resultValue > 0 &&
                            (preCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID) || postCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID))
                        ) {
                            newData[ob[aggregatedBy]].push(resultValue);
                            if (preCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                preIntData[ob[aggregatedBy]].push(resultValue);
                            }
                            if (postCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                postIntData[ob[aggregatedBy]].push(resultValue);
                            }
                        }
                    });

                    for (let prop in newData) {
                        medianData[prop] = median(newData[prop]);
                        preMedianData[prop] = median(preIntData[prop]);
                        postMedianData[prop] = median(postIntData[prop])

                        let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        //   let kdeMax_temp = 0
                        if (newData[prop].length > 5) {
                            kdeMax_nonInt = (max(pd, (val: any) => val.y) as any) > kdeMax_nonInt ? max(pd, (val: any) => val.y) : kdeMax_nonInt

                        }

                        let reverse_pd = pd.map((pair: any) => {
                            //  kdeMax_temp = pair.y > kdeMax_temp ? pair.y : kdeMax_temp;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        newData[prop] = { kdeArray: pd, dataPoints: newData[prop] };

                        pd = createpd(preIntData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);


                        if (preIntData[prop].length > 5) {
                            kdeMax_Int = (max(pd, (val: any) => val.y) as any) > kdeMax_Int ? max(pd, (val: any) => val.y) : kdeMax_Int

                        }


                        reverse_pd = pd.map((pair: any) => {
                            //  kdeMax_temp = pair.y > kdeMax_temp ? pair.y : kdeMax_temp;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        preIntData[prop] = { kdeArray: pd, dataPoints: preIntData[prop] };

                        pd = createpd(postIntData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        if (postIntData[prop].length > 5) {
                            kdeMax_Int = (max(pd, (val: any) => val.y) as any) > kdeMax_Int ? max(pd, (val: any) => val.y) : kdeMax_Int

                        }
                        reverse_pd = pd.map((pair: any) => {
                            //   kdeMax_temp = pair.y > kdeMax_temp ? pair.y : kdeMax_temp;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        postIntData[prop] = { kdeArray: pd, dataPoints: postIntData[prop] };
                    }

                    newExtraPairData.push({
                        name: "Postop HGB", label: "Postop HGB",
                        preIntData: preIntData,
                        postIntData: postIntData,
                        totalIntData: newData,
                        type: "Violin",
                        totalMedianSet: medianData,
                        preMedianSet: preMedianData,
                        postMedianSet: postMedianData,
                        halfKdeMax: kdeMax_Int,
                        totalKdeMax: kdeMax_nonInt
                    });
                    break;

                default:
                    break;
            }
        }
        )
    }
    return newExtraPairData
}

const outcomeComparisonDataGenerate = (name: string, label: string, data: ComparisonDataPoint[], hemoglobinDataSet: SingleCasePoint[], aggregatedBy: string) => {

    let newData = {} as any;
    let temporaryDataHolder: any = {}
    let temporaryPreIntDataHolder: any = {}
    let temporaryPostIntDataHolder: any = {}
    let preIntData = {} as any;
    let postIntData = {} as any;
    let preCaseDicts = {} as any;
    let postCaseDicts = {} as any;

    data.forEach((dataPoint: ComparisonDataPoint) => {
        preCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.preCaseIDList)
        postCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.postCaseIDList)

        temporaryPreIntDataHolder[dataPoint.aggregateAttribute] = []
        temporaryPostIntDataHolder[dataPoint.aggregateAttribute] = []
        temporaryDataHolder[dataPoint.aggregateAttribute] = []
        newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount + dataPoint.postCaseCount };
        preIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount };
        postIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.postCaseCount };
    })
    hemoglobinDataSet.forEach((ob: any) => {
        if (temporaryDataHolder[ob[aggregatedBy]] &&
            (preCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID) || postCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID))) {
            temporaryDataHolder[ob[aggregatedBy]].push(ob[name])
            if (preCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                temporaryPreIntDataHolder[ob[aggregatedBy]].push(ob[name]);
            }
            if (postCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                temporaryPostIntDataHolder[ob[aggregatedBy]].push(ob[name]);
            }
        }

    })

    for (const [key, value] of Object.entries(temporaryDataHolder)) {
        newData[key].calculated = mean(value as any);
        newData[key].actualVal = sum(value as any)

        preIntData[key].calculated = mean(temporaryPreIntDataHolder[key])
        preIntData[key].actualVal = sum(temporaryPreIntDataHolder[key])

        postIntData[key].calculated = mean(temporaryPostIntDataHolder[key])
        postIntData[key].actualVal = sum(temporaryPostIntDataHolder[key])
    }

    return ({ name: name, label: label, preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });

}

export const generateExtrapairPlotData = (aggregatedBy: string, hemoglobinDataSet: SingleCasePoint[], extraPairArray: string[], data: BasicAggregatedDatePoint[], componentName: string) => {
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
                        newData[dataPoint.aggregateAttribute] = BloodProductCost[componentName] * dataPoint.totalVal / (dataPoint.caseCount)
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

export const generateComparisonData = (temporaryDataHolder: any[], showZero: boolean, valueToVisualize: string) => {
    let totalCaseCount = 0;
    let outputData: ComparisonDataPoint[] = [];
    Object.values(temporaryDataHolder).forEach((computedData: any) => {
        const prePatientIDArray: number[] = Array.from(computedData.prePatientIDList);
        const postPatientIDArray: number[] = Array.from(computedData.postPatienIDList);
        // const preCaseIDArray: number[] = Array.from(computedData.preCaseIDList);
        // const postCaseIDArray: number[] = Array.from(computedData.postCaseIDList);

        let preCaseIDArray: number[] = [];
        let postCaseIDArray: number[] = [];


        let preDataArray: SingleCasePoint[] = computedData.preData;
        let postDataArray: SingleCasePoint[] = computedData.postData;
        let preZeroNum = 0;
        let postZeroNum = 0;

        preZeroNum = preDataArray.filter((d) => {
            if (!showZero) {
                if (d[valueToVisualize] > 0) {
                    preCaseIDArray.push(d.CASE_ID)
                }
            }
            else {
                preCaseIDArray.push(d.CASE_ID)
            }
            return d[valueToVisualize] === 0;
        }).length;
        postZeroNum = postDataArray.filter((d) => {
            if (!showZero) {
                if (d[valueToVisualize] > 0) {
                    postCaseIDArray.push(d.CASE_ID)
                }
            }
            else {
                postCaseIDArray.push(d.CASE_ID)
            }
            return d[valueToVisualize] === 0;
        }).length;

        totalCaseCount += preCaseIDArray.length;
        totalCaseCount += postCaseIDArray.length;

        let preCountDict = {} as any;
        let postCountDict = {} as any;
        const cap: number = BloodProductCap[valueToVisualize]

        if (valueToVisualize === "CELL_SAVER_ML") {
            preCountDict[-1] = [];
            postCountDict[-1] = [];
            for (let i = 0; i <= cap; i += 100) {
                preCountDict[i] = [];
                postCountDict[i] = [];
            }
        } else {
            for (let i = 0; i <= cap; i++) {
                preCountDict[i] = [];
                postCountDict[i] = [];
            }
        }

        preDataArray.forEach((d: SingleCasePoint) => {
            let transfusionOutput = d[valueToVisualize] as number
            if (valueToVisualize === "PRBC_UNITS" && d[valueToVisualize] > 100) {
                transfusionOutput = (d[valueToVisualize] - 999)
            } else if (d[valueToVisualize] > 100 && valueToVisualize === "PLT_UNITS") {
                transfusionOutput = (d[valueToVisualize] - 245)
            }
            if (valueToVisualize === "CELL_SAVER_ML") {
                const roundedAnswer = Math.floor(transfusionOutput / 100) * 100
                if (transfusionOutput === 0) {
                    preCountDict[-1].push(d)
                }
                else if (roundedAnswer > cap) {
                    preCountDict[cap].push(d)
                }
                else {
                    preCountDict[roundedAnswer].push(d)
                }
            } else {
                if ((transfusionOutput) > cap) {
                    preCountDict[cap].push(d)
                } else {
                    preCountDict[(transfusionOutput)].push(d)
                }
            }

        });

        postDataArray.forEach((d: SingleCasePoint) => {
            let transfusionOutput = d[valueToVisualize] as number
            if (valueToVisualize === "PRBC_UNITS" && d[valueToVisualize] > 100) {
                transfusionOutput = (d[valueToVisualize] - 999)
            } else if (d[valueToVisualize] > 100 && valueToVisualize === "PLT_UNITS") {
                transfusionOutput = (d[valueToVisualize] - 245)
            }
            if (valueToVisualize === "CELL_SAVER_ML") {
                const roundedAnswer = Math.floor(transfusionOutput / 100) * 100
                if (transfusionOutput === 0) {
                    postCountDict[-1].push(d)
                }
                else if (roundedAnswer > cap) {
                    postCountDict[cap].push(d)
                }
                else {
                    postCountDict[roundedAnswer].push(d)
                }
            } else {
                if ((transfusionOutput) > cap) {
                    postCountDict[cap].push(d)
                } else {
                    postCountDict[(transfusionOutput)].push(d)
                }
            }

        });

        outputData.push(
            {

                aggregateAttribute: computedData.aggregateAttribute,
                preTotalVal: sum(preDataArray, d => {
                    if (valueToVisualize === "PRBC_UNITS" && d[valueToVisualize] > 100) {
                        return (d[valueToVisualize] - 999)
                    } else if (d[valueToVisualize] > 100 && valueToVisualize === "PLT_UNITS") {
                        return (d[valueToVisualize] - 245)
                    }
                    return (d[valueToVisualize] as number)
                }
                ),
                postTotalVal: sum(postDataArray, d => {
                    if (valueToVisualize === "PRBC_UNITS" && d[valueToVisualize] > 100) {
                        return (d[valueToVisualize] - 999)
                    } else if (d[valueToVisualize] > 100 && valueToVisualize === "PLT_UNITS") {
                        return (d[valueToVisualize] - 245)
                    }
                    return (d[valueToVisualize] as number)
                }),
                prePatienIDList: prePatientIDArray,
                postPatienIDList: postPatientIDArray,
                preCaseIDList: preCaseIDArray,
                postCaseIDList: postCaseIDArray,
                preZeroCaseNum: preZeroNum,
                postZeroCaseNum: postZeroNum,
                preCountDict: preCountDict,
                postCountDict: postCountDict,
                preCaseCount: preDataArray.length,
                postCaseCount: postDataArray.length,
            }
        )
    });
    return [totalCaseCount, outputData]
}

export const generateRegularData = (temporaryDataHolder: any[], showZero: boolean, valueToVisualize: string) => {
    let totalCaseCount = 0;
    let outputData: HeatMapDataPoint[] = [];
    Object.values(temporaryDataHolder).forEach((computedData: any) => {
        const patientIDArray: number[] = Array.from(computedData.patientIDList);

        let caseIDArray: number[] = [];


        let dataArray: SingleCasePoint[] = computedData.data;
        let zeroNum = 0;

        zeroNum = dataArray.filter((d) => {
            if (!showZero) {
                if (d[valueToVisualize] > 0) {
                    caseIDArray.push(d.CASE_ID)
                }
            }
            else {
                caseIDArray.push(d.CASE_ID)
            }
            return d[valueToVisualize] === 0;
        }).length;


        totalCaseCount += caseIDArray.length;

        let countDict = {} as any;
        const cap: number = BloodProductCap[valueToVisualize]

        if (valueToVisualize === "CELL_SAVER_ML") {
            countDict[-1] = [];
            for (let i = 0; i <= cap; i += 100) {
                countDict[i] = [];
            }
        } else {
            for (let i = 0; i <= cap; i++) {
                countDict[i] = [];
            }
        }

        dataArray.forEach((d: SingleCasePoint) => {

            let transfusionOutput = d[valueToVisualize] as number
            if (valueToVisualize === "PRBC_UNITS" && d[valueToVisualize] > 100) {
                transfusionOutput = (d[valueToVisualize] - 999)
            } else if (d[valueToVisualize] > 100 && valueToVisualize === "PLT_UNITS") {
                transfusionOutput = (d[valueToVisualize] - 245)
            }

            if (valueToVisualize === "CELL_SAVER_ML") {
                const roundedAnswer = Math.floor(transfusionOutput / 100) * 100
                if (transfusionOutput === 0) {
                    countDict[-1].push(d)
                }
                else if (roundedAnswer > cap) {
                    countDict[cap].push(d)
                }
                else {
                    countDict[roundedAnswer].push(d)
                }
            } else {
                if ((transfusionOutput) > cap) {
                    countDict[cap].push(d)
                } else {
                    countDict[(transfusionOutput)].push(d)
                }
            }

        });

        outputData.push(
            {
                aggregateAttribute: computedData.aggregateAttribute,
                totalVal: sum(dataArray, d => {
                    if (valueToVisualize === "PRBC_UNITS" && d[valueToVisualize] > 100) {
                        return (d[valueToVisualize] - 999)
                    } else if (d[valueToVisualize] > 100 && valueToVisualize === "PLT_UNITS") {
                        return (d[valueToVisualize] - 245)
                    }
                    return (d[valueToVisualize] as number)
                }),
                patientIDList: patientIDArray,
                caseIDList: caseIDArray,
                zeroCaseNum: zeroNum,
                countDict: countDict,
                caseCount: dataArray.length
            }
        )
    });

    return [totalCaseCount, outputData]

}
