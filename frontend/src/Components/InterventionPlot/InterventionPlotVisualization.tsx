import React, { FC, useEffect, useRef, useLayoutEffect, useState, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { InterventionDataPoint, BloodProductCap, barChartAggregationOptions, barChartValuesOptions, interventionChartType, extraPairOptions } from '../../Interfaces/ApplicationState'

import { Grid, Dropdown, Menu } from "semantic-ui-react";
import { create as createpd } from "pdfast";
import { sum, median, timeFormat, timeParse } from "d3";
import InterventionPlot from "./InterventionPlot";

interface OwnProps {
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    interventionDate: number;
    interventionPlotType: string;
    extraPair?: string[];
    hemoglobinDataSet: any;
}

export type Props = OwnProps;

const InterventionPlotVisualization: FC<Props> = ({ hemoglobinDataSet, extraPair, aggregatedBy, valueToVisualize, chartId, store, chartIndex, interventionDate, interventionPlotType }: Props) => {
    const {
        layoutArray,
        filterSelection,
        showZero,
        currentSelectPatient,
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

    const [yMax, setYMax] = useState({ original: 0, perCase: 0 });

    const [dimensions, setDimensions] = useState({ height: 0, width: 0 });

    const [caseIDList, setCaseIDList] = useState<any>(null)

    useLayoutEffect(() => {
        if (svgRef.current) {
            setDimensions({
                height: svgRef.current.clientHeight,
                width: svgRef.current.clientWidth
            });
        }
    }, [layoutArray[chartIndex]]);

    useEffect(() => {
        if (new Date(interventionDate).getTime() < new Date(rawDateRange[0]).getTime() || new Date(interventionDate).getTime() > new Date(rawDateRange[1]).getTime()) {
            actions.removeChart(chartId)
        }
    }, [rawDateRange])


    async function fetchChartData() {
        // console.log()
        // const castInterventionDate = (typeof interventionDate === "string") ? timeParse("%Y-%m-%dT%H:%M:%S.%LZ")(interventionDate)! : interventionDate

        const preIntervention = await fetch(
            `http://localhost:8000/api/request_transfused_units?aggregated_by=${aggregatedBy}&transfusion_type=${valueToVisualize}&date_range=${[dateRange[0], timeFormat("%d-%b-%Y")(new Date(interventionDate))]}&filter_selection=${filterSelection.toString()}`
        );
        const preInterventiondataResult = await preIntervention.json();

        const postIntervention = await fetch(
            `http://localhost:8000/api/request_transfused_units?aggregated_by=${aggregatedBy}&transfusion_type=${valueToVisualize}&date_range=${[timeFormat("%d-%b-%Y")(new Date(interventionDate)), dateRange[1]]}&filter_selection=${filterSelection.toString()}`
        )
        const postInterventionResult = await postIntervention.json();
        let caseCount = 0;
        if (preInterventiondataResult && postInterventionResult) {
            let yMaxTemp = -1;
            let perCaseYMaxTemp = -1
            //let cast_data = InterventionData
            console.log(preInterventiondataResult, postInterventionResult)
            let caseDictionary = {} as any
            let cast_data = (preInterventiondataResult as any).map(function (preIntOb: any) {

                preIntOb.case_id.map((singleId: any) => {
                    caseDictionary[singleId] = true;
                })

                let zeroCaseNum = 0;

                const aggregateByAttr = preIntOb.aggregated_by;

                const case_num = preIntOb.transfused_units.length;

                const preIntMed = median(preIntOb.transfused_units);

                caseCount += case_num;


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

            console.log(cast_data);


            (postInterventionResult as any).map((postIntOb: any) => {

                const postIntMed = median(postIntOb.transfused_units);
                const case_num = postIntOb.transfused_units.length;
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
                caseCount += case_num

                let postIntPD = createpd(postRemovedZeros, { width: 2, min: 0, max: BloodProductCap[valueToVisualize] });

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
            setData(cast_data);
            setCaseIDList(caseDictionary)
            // actions.updateCaseCount("AGGREGATED", caseCount)
            store!.totalAggregatedCaseCount = caseCount
            setYMax({ original: yMaxTemp, perCase: perCaseYMaxTemp });
        }
    }

    useEffect(() => {
        fetchChartData();
    }, [filterSelection, dateRange, showZero, aggregatedBy, valueToVisualize]);


    //{ name: string,totalIntData:any[], preIntData: any[], postIntData: any[], type: string, kdeMax?: number, medianSet?: any }
    const makeExtraPairData = () => {
        let newExtraPairData: any[] = []
        if (extraPair) {
            extraPair.forEach((variable: string) => {
                let newData = {} as any;
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
                        newExtraPairData.push({ name: "Total Transfusion", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "BarChart" });
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

                    case "Zero Transfusion":
                        //let newDataPerCase = {} as any;
                        // console.log(data)
                        data.map((dataPoint: InterventionDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = (dataPoint.preZeroCaseNum + dataPoint.postZeroCaseNum) / (dataPoint.preCaseCount + dataPoint.postCaseCount);
                            preIntData[dataPoint.aggregateAttribute] = dataPoint.preZeroCaseNum / dataPoint.preCaseCount;
                            postIntData[dataPoint.aggregateAttribute] = dataPoint.postZeroCaseNum / dataPoint.postCaseCount;
                        });
                        newExtraPairData.push({ name: "Zero %", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Basic" });
                        break;

                    case "ROM":
                        data.map(async (dataPoint: InterventionDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = dataPoint.prePatienIDList.concat(dataPoint.postPatienIDList);
                            preIntData[dataPoint.aggregateAttribute] = dataPoint.prePatienIDList;
                            postIntData[dataPoint.aggregateAttribute] = dataPoint.postPatienIDList;
                        });
                        newExtraPairData.push({ name: "ROM", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Outcomes" });
                        break;

                    case "SOI":
                        data.map(async (dataPoint: InterventionDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = dataPoint.prePatienIDList.concat(dataPoint.postPatienIDList);
                            preIntData[dataPoint.aggregateAttribute] = dataPoint.prePatienIDList;
                            postIntData[dataPoint.aggregateAttribute] = dataPoint.postPatienIDList;
                        });
                        newExtraPairData.push({ name: "SOI", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Outcomes" });
                        break;

                    case "Mortality":
                        data.map(async (dataPoint: InterventionDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = dataPoint.prePatienIDList.concat(dataPoint.postPatienIDList);
                            preIntData[dataPoint.aggregateAttribute] = dataPoint.prePatienIDList;
                            postIntData[dataPoint.aggregateAttribute] = dataPoint.postPatienIDList;
                        });
                        newExtraPairData.push({ name: "Mortality", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Outcomes" });
                        break;

                    case "Vent":
                        data.map(async (dataPoint: InterventionDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = dataPoint.prePatienIDList.concat(dataPoint.postPatienIDList);
                            preIntData[dataPoint.aggregateAttribute] = dataPoint.prePatienIDList;
                            postIntData[dataPoint.aggregateAttribute] = dataPoint.postPatienIDList;
                        });
                        newExtraPairData.push({ name: "Vent", preIntData: preIntData, postIntData: postIntData, totalIntData: newData, type: "Outcomes" });
                        break;

                    case "Preop Hemo":
                        data.map((dataPoint: InterventionDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = [];
                            preIntData[dataPoint.aggregateAttribute] = [];
                            postIntData[dataPoint.aggregateAttribute] = [];
                        });
                        hemoglobinDataSet.map((ob: any) => {
                            const begin = parseFloat(ob.HEMO[0]);
                            if (newData[ob[aggregatedBy]] && begin > 0 && caseIDList[ob.CASE_ID]) {

                                newData[ob[aggregatedBy]].push(begin);

                                if (timeParse("%Y-%m-%dT%H:%M:%S")(ob.DATE)!.getTime() < interventionDate) {
                                    preIntData[ob[aggregatedBy]].push(begin);
                                }

                                if (timeParse("%Y-%m-%dT%H:%M:%S")(ob.DATE)!.getTime() > interventionDate) {
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
                            name: "Preop Hemo",
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

                    case "Preop Hemo":
                        data.map((dataPoint: InterventionDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = [];
                        });
                        hemoglobinDataSet.map((ob: any) => {
                            const end = parseFloat(ob.HEMO[1]);
                            if (newData[ob[aggregatedBy]] && end > 0 && caseIDList[ob.CASE_ID]) {

                                newData[ob[aggregatedBy]].push(end);

                                if (timeParse("%Y-%m-%dT%H:%M:%S")(ob.DATE)!.getTime() < interventionDate) {
                                    preIntData[ob[aggregatedBy]].push(end);
                                }

                                if (timeParse("%Y-%m-%dT%H:%M:%S")(ob.DATE)!.getTime() > interventionDate) {
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
                            name: "Preop Hemo",
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
        setExtraPairData(newExtraPairData)
    }

    useMemo(() => {
        makeExtraPairData();
        //console.log(extraPairData)
    }, [layoutArray[chartIndex], data, hemoglobinDataSet]);

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
                <Grid.Column verticalAlign="middle" width={1}>
                    <Menu icon vertical compact size="mini" borderless secondary widths={2}>
                        <Menu.Item fitted>
                            <Dropdown basic item icon="plus" compact>
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
                            <Dropdown pointing basic item icon="edit" compact >
                                <Dropdown.Menu>
                                    <Dropdown text="Change Aggregation" pointing basic item compact options={barChartAggregationOptions} onChange={changeAggregation}></Dropdown>
                                    <Dropdown text="Change Value" pointing basic item compact options={barChartValuesOptions} onChange={changeValue}></Dropdown>
                                    <Dropdown text="Change Type" pointing basic item compact options={interventionChartType} onChange={changeType}></Dropdown>
                                </Dropdown.Menu>
                            </Dropdown>
                        </Menu.Item>
                    </Menu>
                </Grid.Column>
                <Grid.Column width={(15) as any}>
                    <SVG ref={svgRef}>

                        <InterventionPlot
                            interventionDate={interventionDate}
                            chartId={chartId}
                            dimensionWhole={dimensions}
                            data={data}
                            svg={svgRef}
                            aggregatedBy={aggregatedBy}
                            valueToVisualize={valueToVisualize}
                            yMax={yMax.original}
                            plotType={interventionPlotType}
                            extraPairDataSet={extraPairData}
                        />
                    </SVG>
                </Grid.Column>
            </Grid.Row>
        </Grid>
    );
}


export default inject("store")(observer(InterventionPlotVisualization));

const SVG = styled.svg`
  height: 100%;
  width: 100%;
`;