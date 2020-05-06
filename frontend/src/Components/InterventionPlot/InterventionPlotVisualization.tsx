import React, { FC, useEffect, useRef, useLayoutEffect, useState, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { InterventionDataPoint, BloodProductCap } from '../../Interfaces/ApplicationState'

import { Button, Icon, Table, Grid, Dropdown, GridColumn, Menu } from "semantic-ui-react";
import { create as createpd } from "pdfast";
import { sum, max, median, create, timeFormat, timeParse } from "d3";
import InterventionPlot from "./InterventionPlot";

interface OwnProps {
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    interventionDate: Date;
    interventionPlotType: string;
}

export type Props = OwnProps;

const InterventionPlotVisualization: FC<Props> = ({ aggregatedBy, valueToVisualize, chartId, store, chartIndex, interventionDate, interventionPlotType }: Props) => {
    const {
        layoutArray,
        filterSelection,
        showZero,
        currentSelectPatient,
        rawDateRange,
        dateRange
    } = store!;

    const svgRef = useRef<SVGSVGElement>(null);

    const [data, setData] = useState<InterventionDataPoint[]>([]);

    const [yMax, setYMax] = useState({ original: 0, perCase: 0 });

    const [dimensions, setDimensions] = useState({ height: 0, width: 0 });
    // const [extraPairData, setExtraPairData] = useState<{ name: string, data: any[], type: string }[]>([])

    // const [caseIDList, setCaseIDList] = useState<any>(null)


    useLayoutEffect(() => {
        if (svgRef.current) {
            setDimensions({
                height: svgRef.current.clientHeight,
                width: svgRef.current.clientWidth
            });
        }
    }, [layoutArray[chartIndex]]);

    useEffect(() => {

        try {
            if (interventionDate.getTime() < rawDateRange[0].getTime() || interventionDate.getTime() > rawDateRange[1].getTime()) {
                actions.removeChart(chartId)
            }
        } catch (e) {
            if (e instanceof TypeError) {
                console.log(interventionDate, typeof interventionDate, rawDateRange)
                const castInterventionDate = (typeof interventionDate === "string") ? timeParse("%Y-%m-%dT%H:%M:%S.%LZ")(interventionDate)! : interventionDate
                const castRawDateRange0 = (typeof rawDateRange[0] === "string") ? timeParse("%Y-%m-%dT%H:%M:%SZ")(rawDateRange[0])! : rawDateRange[0]
                const castRawDateRange1 = (typeof rawDateRange[1] === "string") ? timeParse("%Y-%m-%dT%H:%M:%SZ")(rawDateRange[1])! : rawDateRange[1]
                console.log(castInterventionDate, castRawDateRange1, castRawDateRange0)
                if (castInterventionDate.getTime() < castRawDateRange0.getTime() || castInterventionDate.getTime() > castRawDateRange1.getTime()) {
                    actions.removeChart(chartId)
                }

            }

        }
    }, [rawDateRange])


    async function fetchChartData() {
        const castInterventionDate = (typeof interventionDate === "string") ? timeParse("%Y-%m-%dT%H:%M:%S.%LZ")(interventionDate)! : interventionDate

        const preIntervention = await fetch(
            `http://localhost:8000/api/summarize_with_year?aggregatedBy=${aggregatedBy}&valueToVisualize=${valueToVisualize}&date_range=${[dateRange[0], timeFormat("%d-%b-%Y")(castInterventionDate)]}&filter_selection=${filterSelection.toString()}`
        );
        const preInterventiondataResult = await preIntervention.json();

        const postIntervention = await fetch(
            `http://localhost:8000/api/summarize_with_year?aggregatedBy=${aggregatedBy}&valueToVisualize=${valueToVisualize}&date_range=${[timeFormat("%d-%b-%Y")(castInterventionDate), dateRange[1]]}&filter_selection=${filterSelection.toString()}`
        )
        const postInterventionResult = await postIntervention.json();
        let caseCount = 0;
        if (preInterventiondataResult && postInterventionResult) {
            let yMaxTemp = -1;
            let perCaseYMaxTemp = -1
            //let cast_data = InterventionData
            console.log(preInterventiondataResult, postInterventionResult)
            let cast_data = (preInterventiondataResult.result as any).map(function (preIntOb: any) {
                let zeroCaseNum = 0;



                const aggregateByAttr = preIntOb.aggregatedBy;

                const case_num = preIntOb.valueToVisualize.length;

                const preIntMed = median(preIntOb.valueToVisualize);

                caseCount += case_num;


                let preRemovedZeros = preIntOb.valueToVisualize;


                if (!showZero) {
                    preRemovedZeros = preRemovedZeros.filter((d: number) => {
                        if (d > 0) {
                            return true;
                        }
                        zeroCaseNum += 1;
                        return false;
                    })
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

                preIntOb.valueToVisualize.map((d: any) => {
                    if (valueToVisualize === "CELL_SAVER_ML") {
                        const roundedAnswer = Math.floor(d / 100) * 100
                        if (roundedAnswer > cap) {
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
                    totalVal: total_val,
                    preInKdeCal: preIntPD,
                    postInKdeCal: [],
                    preInMedian: preIntMed ? preIntMed : 0,
                    postInMedian: 0,
                    preCountDict: preCountDict,
                    postCountDict: postCountDict,
                    zeroCaseNum: zeroCaseNum
                };

                return new_ob;
            });

            console.log(cast_data);


            (postInterventionResult.result as any).map((postIntOb: any) => {

                const postIntMed = median(postIntOb.valueToVisualize);
                const case_num = postIntOb.valueToVisualize.length;
                let postRemovedZeros = postIntOb.valueToVisualize;
                let zeroCaseNum = 0;
                if (!showZero) {
                    postRemovedZeros = postRemovedZeros.filter((d: number) => {
                        if (d > 0) {
                            return true;
                        }
                        zeroCaseNum += 1;
                        return false;
                    })
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

                postIntOb.valueToVisualize.map((d: any) => {
                    if (valueToVisualize === "CELL_SAVER_ML") {
                        const roundedAnswer = Math.floor(d / 100) * 100
                        if (roundedAnswer > cap) {
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

                    if (d.aggregateAttribute === postIntOb.aggregatedBy) {
                        found = true;
                        d.postCountDict = postCountDict;
                        d.postInKdeCal = postIntPD;
                        d.postInMedian = postIntMed ? postIntMed : 0;
                        d.zeroCaseNum += zeroCaseNum;
                        d.postCaseCount = case_num
                        d.totalVal += total_val
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
                        aggregateAttribute: postIntOb.aggregatedBy,
                        totalVal: total_val,
                        preInKdeCal: [],
                        postInKdeCal: postIntPD,
                        preInMedian: 0,
                        postInMedian: postIntMed ? postIntMed : 0,
                        preCountDict: preCountDict,
                        postCountDict: postCountDict,
                        zeroCaseNum: zeroCaseNum
                    };
                    cast_data.push(new_ob)
                }
            })

            setData(cast_data);
            actions.updateCaseCount("AGGREGATED", caseCount)
            setYMax({ original: yMaxTemp, perCase: perCaseYMaxTemp });

        }
    }

    useEffect(() => {
        fetchChartData();

    }, [filterSelection, dateRange, showZero]);





    return (

        <Grid style={{ height: "100%" }} >
            <Grid.Row >
                <Grid.Column verticalAlign="middle" width={1}>
                    <Menu icon vertical compact size="mini" borderless secondary widths={2}>
                        <Menu.Item>
                            <Icon name="edit" />
                        </Menu.Item>
                    </Menu>
                </Grid.Column>
                {/* {extraPairData.map((d)=>{
        return <Grid.Column><SVG></SVG></Grid.Column>
      })} */}
                <Grid.Column width={(15) as any}>
                    <SVG ref={svgRef}>

                        <InterventionPlot
                            interventionDate={timeFormat("%Y-%m-%d")((typeof interventionDate === "string") ? timeParse("%Y-%m-%dT%H:%M:%S.%LZ")(interventionDate)! : interventionDate)}
                            chartId={chartId}
                            dimensionWhole={dimensions}
                            data={data}
                            svg={svgRef}
                            aggregatedBy={aggregatedBy}
                            valueToVisualize={valueToVisualize}
                            yMax={yMax.original}
                            plotType={interventionPlotType}
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