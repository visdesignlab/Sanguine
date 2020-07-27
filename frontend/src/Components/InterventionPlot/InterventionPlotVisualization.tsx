import React, { FC, useEffect, useRef, useLayoutEffect, useState } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { InterventionDataPoint } from '../../Interfaces/ApplicationState'
import { BloodProductCap, barChartAggregationOptions, barChartValuesOptions, interventionChartType, extraPairOptions, stateUpdateWrapperUseJSON, ChartSVG } from "../../PresetsProfile"
import { Grid, Dropdown, Menu, Icon, Modal, Form, Button, Message } from "semantic-ui-react";
import { create as createpd } from "pdfast";
import { sum, median, timeFormat, mean } from "d3";
import InterventionPlot from "./InterventionPlot";
import axios from 'axios';

interface OwnProps {
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    interventionDate: number;
    interventionPlotType: string;
    extraPair?: string;
    hemoglobinDataSet: any;
    notation: string;
    w: number
}

export type Props = OwnProps;

const InterventionPlotVisualization: FC<Props> = ({ w, notation, hemoglobinDataSet, extraPair, aggregatedBy, valueToVisualize, chartId, store, chartIndex, interventionDate, interventionPlotType }: Props) => {
    const {
        layoutArray,
        filterSelection,
        showZero,
        previewMode,
        currentSelectPatientGroup,
        rawDateRange,
        dateRange
    } = store!;

    const svgRef = useRef<SVGSVGElement>(null);

    const [extraPairData, setExtraPairData] = useState<{
        name: string,
        totalIntData: any[],
        preIntData: any[],
        postIntData: any[],
        type: string,
        kdeMax?: number,
        totalMedianSet?: any,
        preMedianSet?: any,
        postMedianSet?: any
    }[]>([])

    const [data, setData] = useState<InterventionDataPoint[]>([]);

    const [yMax, setYMax] = useState(0);

    // const [dimensions, setDimensions] = useState({ height: 0, width: 0 });

    const [width, setWidth] = useState(0)
    const [height, setHeight] = useState(0)

    const [caseIDList, setCaseIDList] = useState<any>(null)
    const [extraPairArray, setExtraPairArray] = useState([]);

    const [openNotationModal, setOpenNotationModal] = useState(false)
    const [notationInput, setNotationInput] = useState(notation)
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)


    useEffect(() => {
        if (extraPair) { stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPair), setExtraPairArray) }
    }, [extraPair])

    useLayoutEffect(() => {
        if (svgRef.current) {
            // setDimensions({
            //     height: svgRef.current.clientHeight,
            //     width: svgRef.current.clientWidth
            // });
            // setWidth(svgRef.current.clientWidth);
            setWidth(w === 1 ? 542.28 : 1146.97)
            setHeight(svgRef.current.clientHeight);
        }
    }, [layoutArray[chartIndex]]);

    useEffect(() => {
        if (new Date(interventionDate).getTime() < new Date(rawDateRange[0]).getTime() || new Date(interventionDate).getTime() > new Date(rawDateRange[1]).getTime()) {
            actions.removeChart(chartId)
        }
    }, [rawDateRange])


    function fetchChartData() {
        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call);
        const getPreInt = () => {
            return axios.get(`http://localhost:8000/api/request_transfused_units?aggregated_by=${aggregatedBy}&transfusion_type=${valueToVisualize}&date_range=${[dateRange[0], timeFormat("%d-%b-%Y")(new Date(interventionDate))]}&filter_selection=${filterSelection.toString()}&case_ids=${currentSelectPatientGroup.toString()}`, {
                cancelToken: call.token
            })
        }
        const getPostInt = () => {
            return axios.get(`http://localhost:8000/api/request_transfused_units?aggregated_by=${aggregatedBy}&transfusion_type=${valueToVisualize}&date_range=${[timeFormat("%d-%b-%Y")(new Date(interventionDate)), dateRange[1]]}&filter_selection=${filterSelection.toString()}&case_ids=${currentSelectPatientGroup.toString()}`, {
                cancelToken: call.token
            })
        }

        Promise.all([getPreInt(), getPostInt()])
            .then(function (results) {
                const preInterventiondataResult = results[0].data;
                const postInterventionResult = results[1].data;
                let caseCount = 0;
                if (preInterventiondataResult && postInterventionResult) {
                    let yMaxTemp = -1;
                    //let cast_data = InterventionData

                    let caseDictionary = {} as any
                    let cast_data = (preInterventiondataResult as any).map(function (preIntOb: any) {

                        preIntOb.case_id.map((singleId: any) => {
                            caseDictionary[singleId] = true;
                        })

                        let zeroCaseNum = 0;
                        const aggregateByAttr = preIntOb.aggregated_by;
                        const preIntMed = median(preIntOb.transfused_units);
                        let preRemovedZeros = preIntOb.transfused_units;

                        if (!showZero) {
                            preRemovedZeros = preRemovedZeros.filter((d: number) => {
                                if (d > 0) {
                                    return true;
                                }
                                zeroCaseNum += 1;
                                return false;
                            })
                        } else {
                            zeroCaseNum = preRemovedZeros.filter((d: number) => d === 0).length
                        }
                        //const case_num = removed_zeros.length;
                        const total_val = sum(preRemovedZeros);
                        const case_num = preIntOb.transfused_units.length;
                        caseCount += case_num;
                        //const medianVal = median(removed_zeros);

                        let preIntPD = createpd(preRemovedZeros, { width: 2, min: 0, max: BloodProductCap[valueToVisualize] });

                        preIntPD = [{ x: 0, y: 0 }].concat(preIntPD)
                        let reversePrePD = preIntPD.map((pair: any) => {
                            return { x: pair.x, y: - pair.y }
                        }).reverse()
                        preIntPD = preIntPD.concat(reversePrePD)


                        let preCountDict = {} as any;
                        let postCountDict = {} as any;
                        const cap = BloodProductCap[valueToVisualize]

                        if (valueToVisualize === "CELL_SAVER_ML") {
                            preCountDict[-1] = 0;
                            postCountDict[-1] = 0
                            for (let i = 0; i <= cap; i += 100) {
                                preCountDict[i] = 0
                                postCountDict[i] = 0
                            }
                        } else {
                            for (let i = 0; i <= cap; i++) {
                                preCountDict[i] = 0
                                postCountDict[i] = 0
                            }
                        }

                        preIntOb.transfused_units.map((d: any) => {
                            if (valueToVisualize === "CELL_SAVER_ML") {
                                const roundedAnswer = Math.floor(d / 100) * 100
                                if (d === 0) {
                                    preCountDict[-1] += 1
                                }
                                else if (roundedAnswer > cap) {
                                    preCountDict[cap] += 1
                                }
                                else {
                                    preCountDict[roundedAnswer] += 1
                                }
                            } else {
                                if (d > cap) {
                                    preCountDict[cap] += 1
                                } else {
                                    preCountDict[d] += 1
                                }
                            }

                        });

                        const new_ob: InterventionDataPoint = {
                            preCaseCount: case_num,
                            postCaseCount: 0,
                            aggregateAttribute: aggregateByAttr,
                            preTotalVal: total_val,
                            postTotalVal: 0,
                            preInKdeCal: preIntPD,
                            postInKdeCal: [],
                            preInMedian: preIntMed ? preIntMed : 0,
                            postInMedian: 0,
                            preCountDict: preCountDict,
                            postCountDict: postCountDict,
                            preZeroCaseNum: zeroCaseNum,
                            postZeroCaseNum: 0,
                            prePatienIDList: preIntOb.pat_id,
                            postPatienIDList: []
                        };

                        return new_ob;
                    });

                    //     console.log(cast_data);


                    (postInterventionResult as any).map((postIntOb: any) => {

                        const postIntMed = median(postIntOb.transfused_units);

                        let postRemovedZeros = postIntOb.transfused_units;
                        let zeroCaseNum = 0;

                        postIntOb.case_id.map((singleId: any) => {
                            caseDictionary[singleId] = true;
                        })

                        if (!showZero) {
                            postRemovedZeros = postRemovedZeros.filter((d: number) => {
                                if (d > 0) {
                                    return true;
                                }
                                zeroCaseNum += 1;
                                return false;
                            })
                        } else {
                            zeroCaseNum = postRemovedZeros.filter((d: number) => d === 0).length
                        }

                        const total_val = sum(postRemovedZeros);
                        const case_num = postIntOb.transfused_units.length;
                        caseCount += case_num

                        let postIntPD = createpd(postRemovedZeros, { width: 2, min: 0, max: BloodProductCap[valueToVisualize] });

                        //    console.log(postRemovedZeros)
                        postIntPD = [{ x: 0, y: 0 }].concat(postIntPD)
                        let reversePostPD = postIntPD.map((pair: any) => {
                            return { x: pair.x, y: - pair.y }
                        }).reverse()
                        postIntPD = postIntPD.concat(reversePostPD)


                        let preCountDict = {} as any;
                        let postCountDict = {} as any;
                        const cap = BloodProductCap[valueToVisualize]

                        if (valueToVisualize === "CELL_SAVER_ML") {
                            preCountDict[-1] = 0;
                            postCountDict[-1] = 0
                            for (let i = 0; i <= cap; i += 100) {
                                preCountDict[i] = 0
                                postCountDict[i] = 0
                            }
                        } else {
                            for (let i = 0; i <= cap; i++) {
                                preCountDict[i] = 0
                                postCountDict[i] = 0
                            }
                        }

                        postIntOb.transfused_units.map((d: any) => {
                            if (valueToVisualize === "CELL_SAVER_ML") {
                                const roundedAnswer = Math.floor(d / 100) * 100
                                if (d === 0) {
                                    postCountDict[-1] += 1
                                }
                                else if (roundedAnswer > cap) {
                                    postCountDict[cap] += 1
                                }
                                else {
                                    postCountDict[roundedAnswer] += 1
                                }
                            } else {
                                if (d > cap) {
                                    postCountDict[cap] += 1
                                } else {
                                    postCountDict[d] += 1
                                }
                            }

                        })
                        let found = false;
                        cast_data = cast_data.map((d: InterventionDataPoint) => {

                            if (d.aggregateAttribute === postIntOb.aggregated_by) {
                                found = true;
                                d.postCountDict = postCountDict;
                                d.postInKdeCal = postIntPD;
                                d.postInMedian = postIntMed ? postIntMed : 0;
                                d.postZeroCaseNum = zeroCaseNum;
                                d.postCaseCount = case_num
                                d.postTotalVal = total_val
                                d.postPatienIDList = postIntOb.pat_id
                                return d;
                            }
                            else {
                                return d;
                            }
                        })
                        if (!found) {
                            const new_ob: InterventionDataPoint = {
                                postCaseCount: case_num,
                                preCaseCount: 0,
                                aggregateAttribute: postIntOb.aggregated_by,
                                postTotalVal: total_val, preTotalVal: 0,
                                preInKdeCal: [],
                                postInKdeCal: postIntPD,
                                preInMedian: 0,
                                postInMedian: postIntMed ? postIntMed : 0,
                                preCountDict: preCountDict,
                                postCountDict: postCountDict,
                                postZeroCaseNum: zeroCaseNum,
                                preZeroCaseNum: 0,
                                prePatienIDList: [],
                                postPatienIDList: postIntOb.pat_id
                            };
                            cast_data.push(new_ob)
                        }
                    })

                    stateUpdateWrapperUseJSON(data, cast_data, setData)
                    stateUpdateWrapperUseJSON(caseIDList, caseDictionary, setCaseIDList)
                    // setData(cast_data);
                    // setCaseIDList(caseDictionary)
                    // actions.updateCaseCount("AGGREGATED", caseCount)
                    store!.totalAggregatedCaseCount = caseCount
                    setYMax(yMaxTemp);
                }
            }).catch(function (thrown) {
                if (axios.isCancel(thrown)) {
                    console.log('Request canceled', thrown.message);
                } else {
                    // handle error
                }
            });
    }

    useEffect(() => {
        if (previousCancelToken) {
            previousCancelToken.cancel("cancel the call.")
        }
        fetchChartData();
    }, [filterSelection, dateRange, aggregatedBy, showZero, valueToVisualize, currentSelectPatientGroup]);

    const makeExtraPairData = () => {
        let newExtraPairData: any[] = []
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
                switch (variable) {
                    case "Total Transfusion":
                        //let newDataBar = {} as any;
                        data.map((dataPoint: InterventionDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = dataPoint.preTotalVal + dataPoint.postTotalVal;
                            preIntData[dataPoint.aggregateAttribute] = dataPoint.preTotalVal;
                            postIntData[dataPoint.aggregateAttribute] = dataPoint.postTotalVal;
                        });
                        newExtraPairData.push({ name: "Total", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "BarChart" });
                        break;

                    case "Per Case":
                        // let newDataPerCase = {} as any;
                        data.map((dataPoint: InterventionDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = (dataPoint.preTotalVal + dataPoint.postTotalVal) / (dataPoint.preCaseCount + dataPoint.postCaseCount);
                            preIntData[dataPoint.aggregateAttribute] = dataPoint.preTotalVal / dataPoint.preCaseCount;
                            postIntData[dataPoint.aggregateAttribute] = dataPoint.postTotalVal / dataPoint.postCaseCount;

                        });
                        newExtraPairData.push({ name: "Per Case", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "BarChart" });
                        break;

                    //TODO Add actual number to the result so that the hover pop is showing actual numbers. 
                    case "Zero Transfusion":
                        //let newDataPerCase = {} as any;
                        // console.log(data)
                        data.map((dataPoint: InterventionDataPoint) => {

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

                        newExtraPairData.push({ name: "Zero %", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });
                        break;



                    case "Death":
                        data.map((dataPoint: InterventionDataPoint) => {
                            temporaryPreIntDataHolder[dataPoint.aggregateAttribute] = [];
                            temporaryPostIntDataHolder[dataPoint.aggregateAttribute] = [];
                            temporaryDataHolder[dataPoint.aggregateAttribute] = [];
                            newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount + dataPoint.postCaseCount };
                            preIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount };
                            postIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.postCaseCount };
                        })
                        hemoglobinDataSet.map((ob: any) => {
                            if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                                temporaryDataHolder[ob[aggregatedBy]].push(ob.DEATH)
                                if (ob.DATE < interventionDate) {
                                    temporaryPreIntDataHolder[ob[aggregatedBy]].push(ob.DEATH);
                                }

                                if (ob.DATE > interventionDate) {
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

                        newExtraPairData.push({ name: "Death", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });
                        break;

                    case "VENT":
                        data.map((dataPoint: InterventionDataPoint) => {
                            temporaryPreIntDataHolder[dataPoint.aggregateAttribute] = [];
                            temporaryPostIntDataHolder[dataPoint.aggregateAttribute] = [];
                            temporaryDataHolder[dataPoint.aggregateAttribute] = [];
                            newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount + dataPoint.postCaseCount };
                            preIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount };
                            postIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.postCaseCount };
                        })
                        hemoglobinDataSet.map((ob: any) => {
                            if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                                temporaryDataHolder[ob[aggregatedBy]].push(ob.VENT)
                                if (ob.DATE < interventionDate) {
                                    temporaryPreIntDataHolder[ob[aggregatedBy]].push(ob.VENT);
                                }

                                if (ob.DATE > interventionDate) {
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

                        newExtraPairData.push({ name: "VENT", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });
                        break;

                    case "ECMO":
                        data.map((dataPoint: InterventionDataPoint) => {
                            temporaryPreIntDataHolder[dataPoint.aggregateAttribute] = [];
                            temporaryPostIntDataHolder[dataPoint.aggregateAttribute] = [];
                            temporaryDataHolder[dataPoint.aggregateAttribute] = [];
                            newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount + dataPoint.postCaseCount };
                            preIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount };
                            postIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.postCaseCount };
                        })
                        hemoglobinDataSet.map((ob: any) => {
                            if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                                temporaryDataHolder[ob[aggregatedBy]].push(ob.ECMO)
                                if (ob.DATE < interventionDate) {
                                    temporaryPreIntDataHolder[ob[aggregatedBy]].push(ob.ECMO);
                                }

                                if (ob.DATE > interventionDate) {
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

                        newExtraPairData.push({ name: "ECMO", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });
                        break;
                    case "STROKE":
                        data.map((dataPoint: InterventionDataPoint) => {
                            temporaryPreIntDataHolder[dataPoint.aggregateAttribute] = []
                            temporaryPostIntDataHolder[dataPoint.aggregateAttribute] = []
                            temporaryDataHolder[dataPoint.aggregateAttribute] = []
                            newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount + dataPoint.postCaseCount };
                            preIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.preCaseCount };
                            postIntData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.postCaseCount };
                        })
                        hemoglobinDataSet.map((ob: any) => {
                            if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                                temporaryDataHolder[ob[aggregatedBy]].push(ob.STROKE)
                                if (ob.DATE < interventionDate) {
                                    temporaryPreIntDataHolder[ob[aggregatedBy]].push(ob.STROKE);
                                }

                                if (ob.DATE > interventionDate) {
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

                        newExtraPairData.push({ name: "Stroke", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });
                        break;

                    case "RISK":
                        // let temporaryDataHolder: any = {}
                        data.map((dataPoint: InterventionDataPoint) => {
                            temporaryPreIntDataHolder[dataPoint.aggregateAttribute] = []
                            temporaryPostIntDataHolder[dataPoint.aggregateAttribute] = []
                            temporaryDataHolder[dataPoint.aggregateAttribute] = []
                        })
                        hemoglobinDataSet.map((ob: any) => {
                            if (temporaryDataHolder[ob[aggregatedBy]] && caseIDList[ob.CASE_ID]) {
                                temporaryDataHolder[ob[aggregatedBy]].push(ob.DRG_WEIGHT)
                                if (ob.DATE < interventionDate) {
                                    temporaryPreIntDataHolder[ob[aggregatedBy]].push(ob.DRG_WEIGHT);
                                }
                                if (ob.DATE > interventionDate) {
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
                            let reverse_pd = pd.map((pair: any) => {
                                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                                return { x: pair.x, y: -pair.y };
                            }).reverse();
                            pd = pd.concat(reverse_pd);
                            newData[key] = pd;

                            pd = createpd(temporaryPreIntDataHolder[key], { min: 0, max: 30 });
                            pd = [{ x: 0, y: 0 }].concat(pd);
                            reverse_pd = pd.map((pair: any) => {
                                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                                return { x: pair.x, y: -pair.y };
                            }).reverse();
                            pd = pd.concat(reverse_pd);
                            preIntData[key] = pd;

                            pd = createpd(temporaryPostIntDataHolder[key], { min: 0, max: 30 });
                            pd = [{ x: 0, y: 0 }].concat(pd);
                            reverse_pd = pd.map((pair: any) => {
                                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                                return { x: pair.x, y: -pair.y };
                            }).reverse();
                            pd = pd.concat(reverse_pd);
                            postIntData[key] = pd;
                        }

                        newExtraPairData.push({
                            name: "RISK",
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
                        data.map((dataPoint: InterventionDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = [];
                            preIntData[dataPoint.aggregateAttribute] = [];
                            postIntData[dataPoint.aggregateAttribute] = [];
                        });
                        hemoglobinDataSet.map((ob: any) => {
                            const begin = parseFloat(ob.PREOP_HGB);
                            if (newData[ob[aggregatedBy]] && begin > 0 && caseIDList[ob.CASE_ID]) {
                                newData[ob[aggregatedBy]].push(begin);
                                if (ob.DATE < interventionDate) {
                                    preIntData[ob[aggregatedBy]].push(begin);
                                }
                                if (ob.DATE > interventionDate) {
                                    postIntData[ob[aggregatedBy]].push(begin);
                                }
                            }
                        });

                        for (let prop in newData) {
                            medianData[prop] = median(newData[prop]) || 0;
                            preMedianData[prop] = median(preIntData[prop]) || 0;
                            postMedianData[prop] = median(postIntData[prop]) || 0;

                            let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
                            pd = [{ x: 0, y: 0 }].concat(pd);
                            let reverse_pd = pd.map((pair: any) => {
                                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                                return { x: pair.x, y: -pair.y };
                            }).reverse();
                            pd = pd.concat(reverse_pd);
                            newData[prop] = pd;

                            pd = createpd(preIntData[prop], { width: 2, min: 0, max: 18 });
                            pd = [{ x: 0, y: 0 }].concat(pd);
                            reverse_pd = pd.map((pair: any) => {
                                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                                return { x: pair.x, y: -pair.y };
                            }).reverse();
                            pd = pd.concat(reverse_pd);
                            preIntData[prop] = pd;

                            pd = createpd(postIntData[prop], { width: 2, min: 0, max: 18 });
                            pd = [{ x: 0, y: 0 }].concat(pd);
                            reverse_pd = pd.map((pair: any) => {
                                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                                return { x: pair.x, y: -pair.y };
                            }).reverse();
                            pd = pd.concat(reverse_pd);
                            postIntData[prop] = pd;
                        }

                        newExtraPairData.push({
                            name: "Preop HGB",
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
                        data.map((dataPoint: InterventionDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = [];
                            preIntData[dataPoint.aggregateAttribute] = [];
                            postIntData[dataPoint.aggregateAttribute] = [];
                        });
                        hemoglobinDataSet.map((ob: any) => {
                            const end = parseFloat(ob.POSTOP_HGB);
                            if (newData[ob[aggregatedBy]] && end > 0 && caseIDList[ob.CASE_ID]) {

                                newData[ob[aggregatedBy]].push(end);

                                if (ob.DATE < interventionDate) {
                                    preIntData[ob[aggregatedBy]].push(end);
                                }

                                if (ob.DATE > interventionDate) {
                                    postIntData[ob[aggregatedBy]].push(end);
                                }
                            }
                        });

                        for (let prop in newData) {
                            medianData[prop] = median(newData[prop]);
                            preMedianData[prop] = median(preIntData[prop]);
                            postMedianData[prop] = median(postIntData[prop])

                            let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
                            pd = [{ x: 0, y: 0 }].concat(pd);
                            let reverse_pd = pd.map((pair: any) => {
                                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                                return { x: pair.x, y: -pair.y };
                            }).reverse();
                            pd = pd.concat(reverse_pd);
                            newData[prop] = pd;

                            pd = createpd(preIntData[prop], { width: 2, min: 0, max: 18 });
                            pd = [{ x: 0, y: 0 }].concat(pd);
                            reverse_pd = pd.map((pair: any) => {
                                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                                return { x: pair.x, y: -pair.y };
                            }).reverse();
                            pd = pd.concat(reverse_pd);
                            preIntData[prop] = pd;

                            pd = createpd(postIntData[prop], { width: 2, min: 0, max: 18 });
                            pd = [{ x: 0, y: 0 }].concat(pd);
                            reverse_pd = pd.map((pair: any) => {
                                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                                return { x: pair.x, y: -pair.y };
                            }).reverse();
                            pd = pd.concat(reverse_pd);
                            postIntData[prop] = pd;
                        }

                        newExtraPairData.push({
                            name: "Postop HGB",
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
        stateUpdateWrapperUseJSON(extraPairData, newExtraPairData, setExtraPairData)
        //  setExtraPairData(newExtraPairData)
    }

    useEffect(() => {
        makeExtraPairData();
        console.log(extraPairData, data)
    }, [extraPairArray, data, hemoglobinDataSet, caseIDList]);

    const changeAggregation = (e: any, value: any) => {
        actions.changeChart(value.value, valueToVisualize, chartId, "INTERVENTION")
    }
    const changeValue = (e: any, value: any) => {
        actions.changeChart(aggregatedBy, value.value, chartId, "INTERVENTION")
    }

    const changeType = (e: any, value: any) => {
        actions.changeChart(aggregatedBy, valueToVisualize, chartId, "INTERVENTION", value.value)
    }

    return (

        <Grid style={{ height: "100%" }} >
            <Grid.Row >
                <Grid.Column verticalAlign="middle" width={1} style={{ display: previewMode ? "none" : null }}>
                    <Menu icon vertical compact size="mini" borderless secondary widths={2}>
                        <Menu.Item fitted>
                            <Dropdown selectOnBlur={false} basic item icon="plus" compact>
                                <Dropdown.Menu>
                                    {
                                        extraPairOptions.map((d: { value: string; title: string }) => {
                                            return (
                                                <Dropdown.Item
                                                    onClick={() => {
                                                        actions.changeExtraPair(chartId, d.value);
                                                    }}
                                                >
                                                    {d.title}
                                                </Dropdown.Item>
                                            )
                                        })
                                    }
                                </Dropdown.Menu>
                            </Dropdown>
                        </Menu.Item >

                        <Menu.Item>
                            <Dropdown selectOnBlur={false} pointing basic item icon="settings" compact >
                                <Dropdown.Menu>
                                    <Dropdown text="Change Aggregation" pointing basic item compact options={barChartAggregationOptions} onChange={changeAggregation}></Dropdown>
                                    <Dropdown text="Change Value" pointing basic item compact options={barChartValuesOptions} onChange={changeValue}></Dropdown>
                                    <Dropdown text="Change Type" pointing basic item compact options={interventionChartType} onChange={changeType}></Dropdown>
                                </Dropdown.Menu>
                            </Dropdown>
                        </Menu.Item>

                        <Menu.Item fitted onClick={() => { setOpenNotationModal(true) }}>
                            <Icon name="edit" />
                        </Menu.Item>

                        {/* Modal for annotation. */}
                        <Modal autoFocus open={openNotationModal} closeOnEscape={false} closeOnDimmerClick={false}>
                            <Modal.Header>
                                Set the annotation for chart
              </Modal.Header>
                            <Modal.Content>
                                <Form>
                                    <Form.TextArea autoFocus
                                        value={notationInput}
                                        label="Notation"
                                        onChange={(e, d) => {
                                            if (typeof d.value === "number") {
                                                setNotationInput((d.value).toString() || "")
                                            } else {
                                                setNotationInput(d.value || "")
                                            }
                                        }
                                        }
                                    />
                                </Form>
                            </Modal.Content>
                            <Modal.Actions>
                                <Button content="Save" positive onClick={() => { setOpenNotationModal(false); actions.changeNotation(chartId, notationInput); }} />
                                <Button content="Cancel" onClick={() => { setOpenNotationModal(false) }} />
                            </Modal.Actions>
                        </Modal>

                    </Menu>
                </Grid.Column>
                <Grid.Column width={(15) as any}>
                    <ChartSVG ref={svgRef}>

                        <InterventionPlot
                            interventionDate={interventionDate}
                            chartId={chartId}
                            //dimensionWhole={dimensions}
                            dimensionWidth={width}
                            dimensionHeight={height}
                            data={data}
                            svg={svgRef}
                            aggregatedBy={aggregatedBy}
                            valueToVisualize={valueToVisualize}
                            yMax={yMax}
                            plotType={interventionPlotType}
                            extraPairDataSet={extraPairData}
                        />
                    </ChartSVG>

                    <Message hidden={notation.length === 0} >{notation}</Message>

                </Grid.Column>

            </Grid.Row>
        </Grid>
    );
}


export default inject("store")(observer(InterventionPlotVisualization));

