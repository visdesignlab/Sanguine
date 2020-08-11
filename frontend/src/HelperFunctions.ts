import { BasicAggregatedDatePoint, ExtraPairInterventionPoint, ComparisonDataPoint, ExtraPairPoint, SingleCasePoint, HeatMapDataPoint } from "./Interfaces/ApplicationState"
import { mean, median, sum, max } from "d3";
import { create as createpd } from "pdfast";
import { BloodProductCap } from "./PresetsProfile";

export const stateUpdateWrapperUseJSON = (oldState: any, newState: any, updateFunction: (value: React.SetStateAction<any>) => void) => {
    if (JSON.stringify(oldState) !== JSON.stringify(newState)) {
        updateFunction(newState)
    }
}

export const generateExtrapairPlotDataWithIntervention = (caseIDList: any, aggregatedBy: string, hemoglobinDataSet: [], extraPairArray: string[], data: ComparisonDataPoint[]) => {
    let newExtraPairData: ExtraPairInterventionPoint[] = []
    if (extraPairArray.length > 0) {
        extraPairArray.forEach((variable: string) => {
            let newData = {} as any;
            let temporaryDataHolder: any = {}
            let temporaryPreIntDataHolder: any = {}
            let temporaryPostIntDataHolder: any = {}
            let preIntData = {} as any;
            let postIntData = {} as any;
            let kdeMax = 0;
            let postMedianData = {} as any;
            let preMedianData = {} as any;
            let medianData = {} as any;

            let preCaseDicts = {} as any;
            let postCaseDicts = {} as any;

            switch (variable) {
                case "Total Transfusion":
                    //let newDataBar = {} as any;
                    data.forEach((dataPoint: ComparisonDataPoint) => {
                        newData[dataPoint.aggregateAttribute] = dataPoint.preTotalVal + dataPoint.postTotalVal;
                        preIntData[dataPoint.aggregateAttribute] = dataPoint.preTotalVal;
                        postIntData[dataPoint.aggregateAttribute] = dataPoint.postTotalVal;
                    });
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

                    newExtraPairData.push({ name: "Zero Transfusion", label: "Zero %", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });
                    break;

                case "Death":
                    data.forEach((dataPoint: ComparisonDataPoint) => {
                        temporaryPreIntDataHolder[dataPoint.aggregateAttribute] = [];
                        temporaryPostIntDataHolder[dataPoint.aggregateAttribute] = [];
                        temporaryDataHolder[dataPoint.aggregateAttribute] = [];
                        newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount + dataPoint.postCaseCount };
                        preIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount };
                        postIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.postCaseCount };
                        preCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.preCaseIDList)
                        postCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.postCaseIDList)
                    })
                    hemoglobinDataSet.forEach((ob: any) => {
                        if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                            temporaryDataHolder[ob[aggregatedBy]].push(ob.DEATH)
                            if (preCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                temporaryPreIntDataHolder[ob[aggregatedBy]].push(ob.DEATH);
                            }
                            if (postCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                temporaryPostIntDataHolder[ob[aggregatedBy]].push(ob.DEATH);
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

                    newExtraPairData.push({ name: "Death", label: "Death", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });
                    break;

                case "VENT":
                    data.forEach((dataPoint: ComparisonDataPoint) => {
                        preCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.preCaseIDList)
                        postCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.postCaseIDList)

                        temporaryPreIntDataHolder[dataPoint.aggregateAttribute] = [];
                        temporaryPostIntDataHolder[dataPoint.aggregateAttribute] = [];
                        temporaryDataHolder[dataPoint.aggregateAttribute] = [];
                        newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount + dataPoint.postCaseCount };
                        preIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount };
                        postIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.postCaseCount };
                    })
                    hemoglobinDataSet.forEach((ob: any) => {
                        if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                            temporaryDataHolder[ob[aggregatedBy]].push(ob.VENT)
                            if (preCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                temporaryPreIntDataHolder[ob[aggregatedBy]].push(ob.VENT);
                            }
                            if (postCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                temporaryPostIntDataHolder[ob[aggregatedBy]].push(ob.VENT);
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

                    newExtraPairData.push({ name: "VENT", label: "Vent", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });
                    break;

                case "ECMO":
                    data.forEach((dataPoint: ComparisonDataPoint) => {
                        preCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.preCaseIDList)
                        postCaseDicts[dataPoint.aggregateAttribute] = new Set(dataPoint.postCaseIDList)

                        temporaryPreIntDataHolder[dataPoint.aggregateAttribute] = [];
                        temporaryPostIntDataHolder[dataPoint.aggregateAttribute] = [];
                        temporaryDataHolder[dataPoint.aggregateAttribute] = [];
                        newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount + dataPoint.postCaseCount };
                        preIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount };
                        postIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.postCaseCount };
                    })
                    hemoglobinDataSet.forEach((ob: any) => {
                        if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                            temporaryDataHolder[ob[aggregatedBy]].push(ob.ECMO)
                            if (preCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                temporaryPreIntDataHolder[ob[aggregatedBy]].push(ob.ECMO);
                            }
                            if (postCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                temporaryPostIntDataHolder[ob[aggregatedBy]].push(ob.ECMO);
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

                    newExtraPairData.push({ name: "ECMO", label: "ECMO", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });
                    break;
                case "STROKE":
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
                        if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                            temporaryDataHolder[ob[aggregatedBy]].push(ob.STROKE)
                            if (preCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                temporaryPreIntDataHolder[ob[aggregatedBy]].push(ob.STROKE);
                            }
                            if (postCaseDicts[ob[aggregatedBy]].has(ob.CASE_ID)) {
                                temporaryPostIntDataHolder[ob[aggregatedBy]].push(ob.STROKE);
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

                    newExtraPairData.push({ name: "STROKE", label: "Stroke", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });
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
                        if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
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

                        let kdeMax_temp: number = (max(pd, (d: any) => (d.y as number)) || 0)

                        kdeMax = kdeMax > kdeMax_temp ? kdeMax : kdeMax_temp;

                        let reverse_pd = pd.map((pair: any) => {
                            //       kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        newData[key] = pd;

                        pd = createpd(temporaryPreIntDataHolder[key], { min: 0, max: 30 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        kdeMax_temp = (max(pd, (d: any) => (d.y as number)) || 0)

                        kdeMax = kdeMax > kdeMax_temp ? kdeMax : kdeMax_temp;

                        reverse_pd = pd.map((pair: any) => {
                            //kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        preIntData[key] = pd;

                        pd = createpd(temporaryPostIntDataHolder[key], { min: 0, max: 30 });
                        pd = [{ x: 0, y: 0 }].concat(pd);
                        kdeMax_temp = (max(pd, (d: any) => (d.y as number)) || 0)

                        kdeMax = kdeMax > kdeMax_temp ? kdeMax : kdeMax_temp
                        reverse_pd = pd.map((pair: any) => {
                            //  kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        postIntData[key] = pd;
                    }

                    newExtraPairData.push({
                        name: "RISK",
                        label: "Risk",
                        preIntData: preIntData,
                        postIntData: postIntData,
                        totalIntData: newData,
                        type: "Violin",
                        kdeMax: kdeMax,
                        totalMedianSet: medianData,
                        preMedianSet: preMedianData,
                        postMedianSet: postMedianData
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
                        if (newData[ob[aggregatedBy]] && resultValue > 0 && caseIDList[ob.CASE_ID]) {
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

                        let kdeMax_temp: number = (max(pd, (d: any) => (d.y as number)) || 0)

                        kdeMax = kdeMax > kdeMax_temp ? kdeMax : kdeMax_temp

                        let reverse_pd = pd.map((pair: any) => {
                            //       kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        newData[prop] = pd;

                        pd = createpd(preIntData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        kdeMax_temp = (max(pd, (d: any) => (d.y as number)) || 0)

                        kdeMax = kdeMax > kdeMax_temp ? kdeMax : kdeMax_temp

                        reverse_pd = pd.map((pair: any) => {
                            //   kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        preIntData[prop] = pd;

                        pd = createpd(postIntData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);
                        kdeMax_temp = (max(pd, (d: any) => (d.y as number)) || 0)

                        kdeMax = kdeMax > kdeMax_temp ? kdeMax : kdeMax_temp

                        reverse_pd = pd.map((pair: any) => {
                            //kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        postIntData[prop] = pd;
                    }

                    newExtraPairData.push({
                        name: "Preop HGB",
                        label: "Preop HGB",
                        preIntData: preIntData,
                        postIntData: postIntData,
                        totalIntData: newData,
                        type: "Violin",
                        kdeMax: kdeMax,
                        totalMedianSet: medianData,
                        preMedianSet: preMedianData,
                        postMedianSet: postMedianData
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
                        if (newData[ob[aggregatedBy]] && resultValue > 0 && caseIDList[ob.CASE_ID]) {
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

                        let kdeMax_temp: number = (max(pd, (d: any) => (d.y as number)) || 0)

                        kdeMax = kdeMax > kdeMax_temp ? kdeMax : kdeMax_temp

                        let reverse_pd = pd.map((pair: any) => {
                            //    kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        newData[prop] = pd;

                        pd = createpd(preIntData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        kdeMax_temp = (max(pd, (d: any) => (d.y as number)) || 0)

                        kdeMax = kdeMax > kdeMax_temp ? kdeMax : kdeMax_temp;

                        reverse_pd = pd.map((pair: any) => {
                            //    kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        preIntData[prop] = pd;

                        pd = createpd(postIntData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);

                        kdeMax_temp = (max(pd, (d: any) => (d.y as number)) || 0)

                        kdeMax = kdeMax > kdeMax_temp ? kdeMax : kdeMax_temp;

                        reverse_pd = pd.map((pair: any) => {
                            //     kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reverse_pd);
                        postIntData[prop] = pd;
                    }

                    newExtraPairData.push({
                        name: "Postop HGB", label: "Postop HGB",
                        preIntData: preIntData,
                        postIntData: postIntData,
                        totalIntData: newData,
                        type: "Violin",
                        kdeMax: kdeMax,
                        totalMedianSet: medianData,
                        preMedianSet: preMedianData,
                        postMedianSet: postMedianData
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

export const generateExtrapairPlotData = (caseIDList: any, aggregatedBy: string, hemoglobinDataSet: [], extraPairArray: string[], data: BasicAggregatedDatePoint[]) => {
    let newExtraPairData: ExtraPairPoint[] = []
    if (extraPairArray.length > 0) {
        extraPairArray.forEach((variable: string) => {
            let newData = {} as any;
            let kdeMax = 0;
            let temporaryDataHolder: any = {}
            let medianData = {} as any;
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

                case "Death":
                    // let temporaryDataHolder: any = {}
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        temporaryDataHolder[dataPoint.aggregateAttribute] = []
                        newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.caseCount }
                    })
                    hemoglobinDataSet.forEach((ob: any) => {
                        if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                            temporaryDataHolder[ob[aggregatedBy]].push(ob.DEATH)
                        }
                    })
                    for (const [key, value] of Object.entries(temporaryDataHolder)) {
                        newData[key].calculated = mean(value as any);
                        newData[key].actualVal = sum(value as any);

                    }
                    newExtraPairData.push({ name: "Death", label: "Death", data: newData, type: "Basic" });
                    break;


                case "VENT":
                    // let temporaryDataHolder:any = {}
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        temporaryDataHolder[dataPoint.aggregateAttribute] = []
                        newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.caseCount }
                    })
                    hemoglobinDataSet.forEach((ob: any) => {
                        if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                            temporaryDataHolder[ob[aggregatedBy]].push(ob.VENT)
                        }
                    })
                    for (const [key, value] of Object.entries(temporaryDataHolder)) {
                        newData[key].calculated = mean(value as any);
                        newData[key].actualVal = sum(value as any);
                    }
                    newExtraPairData.push({ name: "VENT", label: "Vent", data: newData, type: "Basic" });
                    break;
                case "ECMO":
                    // let temporaryDataHolder:any = {}
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        temporaryDataHolder[dataPoint.aggregateAttribute] = []
                        newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.caseCount }
                    })
                    hemoglobinDataSet.forEach((ob: any) => {
                        if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                            temporaryDataHolder[ob[aggregatedBy]].push(ob.ECMO)
                        }
                    })
                    for (const [key, value] of Object.entries(temporaryDataHolder)) {
                        newData[key].calculated = mean(value as any);
                        newData[key].actualVal = sum(value as any);
                    }
                    newExtraPairData.push({ name: "ECMO", label: "ECMO", data: newData, type: "Basic" });
                    break;
                case "STROKE":
                    // let temporaryDataHolder:any = {}
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        temporaryDataHolder[dataPoint.aggregateAttribute] = []
                        newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.caseCount }
                    })
                    hemoglobinDataSet.forEach((ob: any) => {
                        if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                            temporaryDataHolder[ob[aggregatedBy]].push(ob.STROKE)
                        }
                    })
                    for (const [key, value] of Object.entries(temporaryDataHolder)) {
                        newData[key].calculated = mean(value as any);
                        newData[key].actualVal = sum(value as any);
                    }
                    newExtraPairData.push({ name: "STROKE", label: "Stroke", data: newData, type: "Basic" });
                    break;

                case "RISK":
                    // let temporaryDataHolder: any = {}
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        temporaryDataHolder[dataPoint.aggregateAttribute] = []
                    })
                    hemoglobinDataSet.forEach((ob: any) => {
                        if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                            temporaryDataHolder[ob[aggregatedBy]].push(ob.DRG_WEIGHT)
                        }
                    })
                    for (const [key, value] of Object.entries(temporaryDataHolder)) {
                        medianData[key] = median(value as any);
                        let pd = createpd(value, { min: 0, max: 30 });
                        pd = [{ x: 0, y: 0 }].concat(pd)
                        let kdeMax_temp: number = (max(pd, (d: any) => (d.y as number)) || 0)

                        kdeMax = kdeMax > kdeMax_temp ? kdeMax : kdeMax_temp;

                        let reversePd = pd.map((pair: any) => {
                            // kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reversePd)
                        newData[key] = pd
                    }
                    newExtraPairData.push({ name: "RISK", label: "Risk", data: newData, type: "Violin", kdeMax: kdeMax, medianSet: medianData });
                    break;

                case "Preop HGB":
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        newData[dataPoint.aggregateAttribute] = [];
                    });
                    hemoglobinDataSet.forEach((ob: any) => {
                        const resultValue = parseFloat(ob.PREOP_HGB);
                        if (newData[ob[aggregatedBy]] && resultValue > 0 && caseIDList[ob.CASE_ID]) {
                            newData[ob[aggregatedBy]].push(resultValue);
                        }
                    });
                    for (let prop in newData) {
                        medianData[prop] = median(newData[prop]);
                        let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);
                        let kdeMax_temp: number = (max(pd, (d: any) => (d.y as number)) || 0)

                        kdeMax = kdeMax > kdeMax_temp ? kdeMax : kdeMax_temp;

                        let reversePd = pd.map((pair: any) => {
                            // kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reversePd);
                        newData[prop] = pd;
                    }
                    newExtraPairData.push({ name: "Preop HGB", label: "Preop HGB", data: newData, type: "Violin", kdeMax: kdeMax, medianSet: medianData });
                    break;
                case "Postop HGB":
                    //let newData = {} as any;
                    data.forEach((dataPoint: BasicAggregatedDatePoint) => {
                        newData[dataPoint.aggregateAttribute] = [];
                    });
                    hemoglobinDataSet.forEach((ob: any) => {
                        const resultValue = parseFloat(ob.POSTOP_HGB);
                        if (newData[ob[aggregatedBy]] && resultValue > 0 && caseIDList[ob.CASE_ID]) {
                            newData[ob[aggregatedBy]].push(resultValue);
                        }
                    });
                    for (let prop in newData) {
                        medianData[prop] = median(newData[prop]);
                        let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
                        pd = [{ x: 0, y: 0 }].concat(pd);
                        let kdeMax_temp: number = (max(pd, (d: any) => (d.y as number)) || 0)

                        kdeMax = kdeMax > kdeMax_temp ? kdeMax : kdeMax_temp;

                        let reversePd = pd.map((pair: any) => {
                            //  kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                            return { x: pair.x, y: -pair.y };
                        }).reverse();
                        pd = pd.concat(reversePd);
                        newData[prop] = pd;
                    }
                    newExtraPairData.push({ name: "Postop HGB", label: "Postop HGB", data: newData, type: "Violin", kdeMax: kdeMax, medianSet: medianData });
                    break;
                default:
                    break;
            }
        }
        )
    }
    return newExtraPairData;
}

export const generateComparisonData = (temporaryDataHolder: any[], showZero: boolean, valueToVisualize: string) => {
    let caseCount = 0;
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
        if (!showZero) {
            preDataArray = preDataArray.filter((d: SingleCasePoint) => {
                if (d[valueToVisualize] > 0) {
                    preCaseIDArray.push(d.CASE_ID)
                    return true;
                }
                preZeroNum += 1;
                return false;
            })
            postDataArray = postDataArray.filter((d: SingleCasePoint) => {
                if (d[valueToVisualize] > 0) {
                    postCaseIDArray.push(d.CASE_ID)
                    return true;
                }
                postZeroNum += 1;
                return false;
            })
        } else {
            preZeroNum = preDataArray.filter((d) => {
                preCaseIDArray.push(d.CASE_ID)
                return d[valueToVisualize] === 0;
            }).length;
            postZeroNum = postDataArray.filter((d) => {
                postCaseIDArray.push(d.CASE_ID)
                return d[valueToVisualize] === 0;
            }).length;

        }

        caseCount += preCaseIDArray.length;
        caseCount += postCaseIDArray.length;

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
            if (valueToVisualize === "CELL_SAVER_ML") {
                const roundedAnswer = Math.floor(d[valueToVisualize] / 100) * 100
                if (d[valueToVisualize] === 0) {
                    preCountDict[-1].push(d)
                }
                else if (roundedAnswer > cap) {
                    preCountDict[cap].push(d)
                }
                else {
                    preCountDict[roundedAnswer].push(d)
                }
            } else {
                if ((d[valueToVisualize]) > cap) {
                    preCountDict[cap].push(d)
                } else {
                    preCountDict[(d[valueToVisualize])].push(d)
                }
            }

        });

        postDataArray.forEach((d: SingleCasePoint) => {
            if (valueToVisualize === "CELL_SAVER_ML") {
                const roundedAnswer = Math.floor(d[valueToVisualize] / 100) * 100
                if (d[valueToVisualize] === 0) {
                    postCountDict[-1].push(d)
                }
                else if (roundedAnswer > cap) {
                    postCountDict[cap].push(d)
                }
                else {
                    postCountDict[roundedAnswer].push(d)
                }
            } else {
                if ((d[valueToVisualize]) > cap) {
                    postCountDict[cap].push(d)
                } else {
                    postCountDict[(d[valueToVisualize])].push(d)
                }
            }

        });

        outputData.push(
            {

                aggregateAttribute: computedData.aggregateAttribute,
                preTotalVal: sum(preDataArray, d => (d[valueToVisualize] as number)),
                postTotalVal: sum(postDataArray, d => (d[valueToVisualize] as number)),
                prePatienIDList: prePatientIDArray,
                postPatienIDList: postPatientIDArray,
                preCaseIDList: preCaseIDArray,
                postCaseIDList: postCaseIDArray,
                preZeroCaseNum: preZeroNum,
                postZeroCaseNum: postZeroNum,
                preCountDict: preCountDict,
                postCountDict: postCountDict,
                preCaseCount: preCaseIDArray.length,
                postCaseCount: postCaseIDArray.length,
            }
        )
    });
    return [caseCount, outputData]
}

export const generateRegularData = (temporaryDataHolder: any[], showZero: boolean, valueToVisualize: string) => {
    let caseCount = 0;
    let outputData: HeatMapDataPoint[] = [];
    Object.values(temporaryDataHolder).forEach((computedData: any) => {
        const patientIDArray: number[] = Array.from(computedData.patientIDList);

        let caseIDArray: number[] = [];


        let dataArray: SingleCasePoint[] = computedData.data;
        let zeroNum = 0;
        if (!showZero) {

            dataArray = dataArray.filter((d: SingleCasePoint) => {
                if (d[valueToVisualize] > 0) {
                    caseIDArray.push(d.CASE_ID)
                    return true;
                }
                zeroNum += 1;
                return false;
            })
        } else {
            zeroNum = dataArray.filter((d) => {
                caseIDArray.push(d.CASE_ID)
                return d[valueToVisualize] === 0;
            }).length;
        }

        caseCount += caseIDArray.length;

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
            if (valueToVisualize === "CELL_SAVER_ML") {
                const roundedAnswer = Math.floor(d[valueToVisualize] / 100) * 100
                if (d[valueToVisualize] === 0) {
                    countDict[-1].push(d)
                }
                else if (roundedAnswer > cap) {
                    countDict[cap].push(d)
                }
                else {
                    countDict[roundedAnswer].push(d)
                }
            } else {
                if ((d[valueToVisualize]) > cap) {
                    countDict[cap].push(d)
                } else {
                    countDict[(d[valueToVisualize])].push(d)
                }
            }

        });

        outputData.push(
            {
                aggregateAttribute: computedData.aggregateAttribute,
                totalVal: sum(dataArray, d => (d[valueToVisualize] as number)),
                patientIDList: patientIDArray,
                caseIDList: caseIDArray,
                zeroCaseNum: zeroNum,
                countDict: countDict,
                caseCount: dataArray.length
            }
        )
    });
    return [caseCount, outputData]
}