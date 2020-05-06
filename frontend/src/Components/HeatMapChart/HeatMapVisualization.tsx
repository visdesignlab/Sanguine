import React, { FC, useEffect, useRef, useLayoutEffect, useState, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { HeatMapDataPoint, BloodProductCap, barChartAggregationOptions, barChartValuesOptions } from '../../Interfaces/ApplicationState'

import { Button, Icon, Table, Grid, Dropdown, GridColumn, Menu } from "semantic-ui-react";
import { create as createpd } from "pdfast";
import { sum, max, median, create } from "d3";
import HeatMap from "./HeatMap";

interface OwnProps {
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    extraPair?: string[];
}

export type Props = OwnProps;

const BarChartVisualization: FC<Props> = ({ aggregatedBy, valueToVisualize, chartId, store, chartIndex, extraPair }: Props) => {
    const {
        layoutArray,
        filterSelection,
        showZero,
        currentSelectPatient,
        dateRange,
        hemoglobinDataSet
    } = store!;
    const svgRef = useRef<SVGSVGElement>(null);
    // const [data, setData] = useState<{ original: BarChartDataPoint[]; perCase: BarChartDataPoint[]; }>({ original: [], perCase: [] });
    const [data, setData] = useState<{
        original: HeatMapDataPoint[]
    }>({ original: [] });

    const [yMax, setYMax] = useState({ original: 0, perCase: 0 });
    // const [kdeMax,setKdeMax] = useState(0)
    // const [medianVal, setMedian] = useState()
    //  const [selectedBar, setSelectedBarVal] = useState<number | null>(null);
    const [dimensions, setDimensions] = useState({ height: 0, width: 0 });
    const [extraPairData, setExtraPairData] = useState<{ name: string, data: any[], type: string }[]>([])
    const [stripPlotMode, setStripMode] = useState(false);
    const [caseIDList, setCaseIDList] = useState<any>(null)


    useLayoutEffect(() => {
        if (svgRef.current) {
            setDimensions({
                height: svgRef.current.clientHeight,
                width: svgRef.current.clientWidth
            });
        }
    }, [layoutArray[chartIndex]]);

    // useEffect(() => {
    //   if (currentSelectPatient) {
    //     setSelectedBarVal(currentSelectPatient[aggregatedBy])
    //   }
    //   else {
    //     setSelectedBarVal(null);
    //   }
    // }, [currentSelectPatient])

    async function fetchChartData() {
        const res = await fetch(
            `http://localhost:8000/api/summarize_with_year?aggregatedBy=${aggregatedBy}&valueToVisualize=${valueToVisualize}&date_range=${dateRange}&filter_selection=${filterSelection.toString()}`
        );
        const dataResult = await res.json();
        let caseCount = 0;
        if (dataResult) {
            let yMaxTemp = -1;
            let perCaseYMaxTemp = -1
            // let perCaseData: BarChartDataPoint[] = [];
            const caseList = dataResult.case_id_list;
            let caseDictionary = {} as any;
            caseList.map((singleId: any) => {
                caseDictionary[singleId] = true;
            })
            setCaseIDList(caseDictionary)
            let cast_data = (dataResult.result as any).map(function (ob: any) {
                let zeroCaseNum = 0;
                const aggregateByAttr = ob.aggregatedBy;

                const case_num = ob.valueToVisualize.length;
                caseCount += case_num

                let outputResult = ob.valueToVisualize;
                const total_val = sum(outputResult);

                let countDict = {} as any
                const cap = BloodProductCap[valueToVisualize]

                if (valueToVisualize === "CELL_SAVER_ML") {
                    for (let i = 0; i <= cap; i += 100) {
                        countDict[i] = 0
                    }
                } else {
                    for (let i = 0; i <= cap; i++) {
                        countDict[i] = 0
                    }
                }

                outputResult.map((d: any) => {
                    if (valueToVisualize === "CELL_SAVER_ML") {
                        const roundedAnswer = Math.floor(d / 100) * 100
                        if (roundedAnswer > cap) {
                            countDict[cap] += 1
                        }
                        else {
                            countDict[roundedAnswer] += 1
                        }
                    } else {
                        if (d > cap) {
                            countDict[cap] += 1
                        } else {
                            countDict[d] += 1
                        }
                    }
                    // if (!countDict[d]) {
                    //     countDict[d] = 1
                    // } else {
                    //     countDict[d] += 1
                    // }
                })

                const new_ob: HeatMapDataPoint = {
                    caseCount: case_num,
                    aggregateAttribute: aggregateByAttr,
                    totalVal: total_val,
                    countDict: countDict,
                    zeroCaseNum: zeroCaseNum
                };

                return new_ob;
            });
            setData({ original: cast_data });
            actions.updateCaseCount("AGGREGATED", caseCount)
            setYMax({ original: yMaxTemp, perCase: perCaseYMaxTemp });


        }
    }

    useEffect(() => {
        fetchChartData();

    }, [filterSelection, dateRange, showZero, aggregatedBy, valueToVisualize]);


    const makeExtraPairData = () => {
        let newExtraPairData: any[] = []
        if (extraPair) {
            extraPair.forEach((variable: string) => {
                let newData = {} as any;
                let kdeMax = 0;
                let medianData = {} as any;
                switch (variable) {
                    case "Total Transfusion":
                        //let newDataBar = {} as any;
                        data.original.map((dataPoint: HeatMapDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = dataPoint.totalVal
                        })
                        newExtraPairData.push({ name: "Total", data: newData, type: "BarChart" });
                        break;
                    case "Per Case Transfusion":
                        // let newDataPerCase = {} as any;
                        data.original.map((dataPoint: HeatMapDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = dataPoint.totalVal / dataPoint.caseCount
                        })
                        newExtraPairData.push({ name: "Per Case", data: newData, type: "BarChart" });
                        break;
                    case "Zero Transfusion Cases":
                        //let newDataPerCase = {} as any;
                        data.original.map((dataPoint: HeatMapDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = dataPoint.zeroCaseNum / dataPoint.caseCount
                        })
                        newExtraPairData.push({ name: "Zero %", data: newData, type: "Basic" });
                        break;
                    case "Preop Hemo":
                        //let newData = {} as any;
                        data.original.map((dataPoint: HeatMapDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = [];
                        });
                        hemoglobinDataSet.map((ob: any) => {
                            const begin = parseFloat(ob.HEMO[0]);
                            // const end = parseFloat(ob.HEMO[1]);
                            if (newData[ob[aggregatedBy]] && begin > 0 && caseIDList[ob.CASE_ID]) {
                                newData[ob[aggregatedBy]].push(begin);
                            }
                        });

                        for (let prop in newData) {
                            medianData[prop] = median(newData[prop])
                            let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
                            pd = [{ x: 0, y: 0 }].concat(pd)
                            let reverse_pd = pd.map((pair: any) => {
                                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                                return { x: pair.x, y: - pair.y }
                            }).reverse()
                            pd = pd.concat(reverse_pd)
                            newData[prop] = pd
                        }
                        newExtraPairData.push({ name: "Preop Hemo", data: newData, type: "Violin", kdeMax: kdeMax, medianSet: medianData });
                        break;
                    case "Postop Hemo":
                        //let newData = {} as any;
                        data.original.map((dataPoint: HeatMapDataPoint) => {
                            newData[dataPoint.aggregateAttribute] = [];
                        });
                        hemoglobinDataSet.map((ob: any) => {
                            // const begin = parseFloat(ob.HEMO[0]);
                            const end = parseFloat(ob.HEMO[1]);
                            if (newData[ob[aggregatedBy]] && end > 0 && caseIDList[ob.CASE_ID]) {
                                newData[ob[aggregatedBy]].push(end);
                            }
                        });

                        for (let prop in newData) {
                            medianData[prop] = median(newData[prop])
                            let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
                            pd = [{ x: 0, y: 0 }].concat(pd)
                            let reverse_pd = pd.map((pair: any) => {
                                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                                return { x: pair.x, y: - pair.y }
                            }).reverse()
                            pd = pd.concat(reverse_pd)
                            newData[prop] = pd
                        }

                        newExtraPairData.push({ name: "Postop Hemo", data: newData, type: "Violin", kdeMax: kdeMax, medianSet: medianData });
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
    }, [layoutArray, data, hemoglobinDataSet]);

    const toggleStripGraphMode = () => {
        setStripMode(!stripPlotMode)
    }

    const changeAggregation = (e: any, value: any) => {
        actions.changeChart(value.value, valueToVisualize, chartId, "HEATMAP")
    }
    const changeValue = (e: any, value: any) => {
        actions.changeChart(aggregatedBy, value.value, chartId, "HEATMAP")
    }


    //  return true;



    return (
        // <Bars
        // chartId={chartId}
        // data={data.result}
        // yMax={yMax}
        // aggregatedByName={aggregatedBy}
        // valueToVisualizeName={valueToVisualize}
        // />
        <Grid style={{ height: "100%" }} >
            <Grid.Row >
                <Grid.Column verticalAlign="middle" width={1}>
                    <Menu icon vertical compact size="mini" borderless secondary widths={2}>
                        <Menu.Item fitted>
                            <Dropdown basic item icon="plus" compact>
                                <Dropdown.Menu>
                                    <Dropdown.Item
                                        onClick={() => {
                                            actions.changeExtraPair(chartId, "Preop Hemo");
                                        }}
                                    >
                                        Preop Hemoglobin
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => {
                                            actions.changeExtraPair(chartId, "Postop Hemo");
                                        }}
                                    >
                                        Postop Hemoglobin
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => {
                                            actions.changeExtraPair(chartId, "Total Transfusion");
                                        }}
                                    >
                                        Total Transfusion
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => {
                                            actions.changeExtraPair(chartId, "Per Case Transfusion");
                                        }}
                                    >
                                        Per Case Transfusion
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => {
                                            actions.changeExtraPair(chartId, "Zero Transfusion Cases");
                                        }}
                                    >
                                        Zero Transfusion Cases
                                    </Dropdown.Item>

                                </Dropdown.Menu>
                            </Dropdown>
                        </Menu.Item >
                        <Menu.Item fitted onClick={toggleStripGraphMode}>
                            <Icon name="ellipsis vertical" />
                        </Menu.Item>
                        <Menu.Item header>
                            <Dropdown pointing basic item icon="edit" compact >
                                <Dropdown.Menu>
                                    <Dropdown text="Change Aggregation" pointing basic item compact options={barChartAggregationOptions} onChange={changeAggregation}></Dropdown>
                                    <Dropdown text="Change Value" pointing basic item compact options={barChartValuesOptions} onChange={changeValue}></Dropdown>
                                </Dropdown.Menu>
                            </Dropdown>
                        </Menu.Item>
                    </Menu>
                </Grid.Column>
                <Grid.Column width={(15) as any}>
                    <SVG ref={svgRef}>
                        <HeatMap
                            dimensionWhole={dimensions}
                            data={data.original}
                            svg={svgRef}
                            aggregatedBy={aggregatedBy}
                            valueToVisualize={valueToVisualize}
                            yMax={yMax.original}
                            // selectedVal={selectedBar}
                            chartId={chartId}
                            // stripPlotMode={stripPlotMode}
                            extraPairDataSet={extraPairData}
                        />
                    </SVG>
                </Grid.Column>
            </Grid.Row>
        </Grid>
    );
}


export default inject("store")(observer(BarChartVisualization));

const SVG = styled.svg`
  height: 100%;
  width: 100%;
`;