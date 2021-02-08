import React, { FC, useEffect, useRef, useLayoutEffect, useState } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { BarChartDataPoint, CostBarChartDataPoint, ExtraPairPoint, SingleCasePoint } from '../../Interfaces/ApplicationState'
import { BloodProductCap, barChartValuesOptions, barChartAggregationOptions, extraPairOptions, ChartSVG, BloodProductCost } from "../../PresetsProfile"
import { Icon, Grid, Dropdown, Menu } from "semantic-ui-react";
import { create as createpd } from "pdfast";
import { sum, median } from "d3";
import axios from 'axios'
import { stateUpdateWrapperUseJSON, generateExtrapairPlotData } from "../../HelperFunctions";
import NotationForm from "../Utilities/NotationForm";
import CostBarChart from "./CostBarChart";

interface OwnProps {
    aggregatedBy: string;
    // valueToVisualize: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    //  extraPair?: string;
    hemoglobinDataSet: any;
    notation: string;
    w: number
}

export type Props = OwnProps;

const CostBarChartVisualization: FC<Props> = ({ w, notation, hemoglobinDataSet, aggregatedBy, chartId, store, chartIndex }: Props) => {
    const {
        layoutArray,
        proceduresSelection,
        showZero,
        currentSelectPatientGroupIDs,
        currentOutputFilterSet,
        previewMode,
        dateRange,
        procedureTypeSelection
    } = store!;
    const svgRef = useRef<SVGSVGElement>(null);
    // const [data, setData] = useState<{: BarChartDataPoint[]; perCase: BarChartDataPoint[]; }>({: [], perCase: [] });
    const [data, setData] = useState<
        CostBarChartDataPoint[]
    >([]);

    const [maximumCost, setMaximumCost] = useState(0);
    // const [kdeMax,setKdeMax] = useState(0)
    // const [medianVal, setMedian] = useState()
    //  const [selectedBar, setSelectedBarVal] = useState<number | null>(null);
    const [dimensionHeight, setDimensionHeight] = useState(0)
    const [dimensionWidth, setDimensionWidth] = useState(0)
    // const [dimensions, setDimensions] = useState({ height: 0, width: 0 });
    // const [extraPairData, setExtraPairData] = useState<ExtraPairPoint[]>([])
    const [costMode, setCostMode] = useState(true);
    // const [caseIDList, setCaseIDList] = useState<any>(null)
    // const [extraPairArray, setExtraPairArray] = useState([]);
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)


    // useEffect(() => {
    //     if (extraPair) { stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPair), setExtraPairArray) }
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [extraPair])

    useLayoutEffect(() => {
        if (svgRef.current) {
            setDimensionHeight(svgRef.current.clientHeight);
            setDimensionWidth(svgRef.current.clientWidth)
            //  setDimensionWidth(w === 1 ? 542.28 : 1146.97)
        }
    }, [layoutArray, w]);




    useEffect(() => {
        if (previousCancelToken) {
            previousCancelToken.cancel("cancel the call?")
        }
        let tempmaxCost = 0;
        let temporaryDataHolder: any = {}
        let caseSetReturnedFromQuery = new Set();
        let outputData: CostBarChartDataPoint[] = [];
        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call)
        axios.get(`${process.env.REACT_APP_QUERY_URL}request_transfused_units?transfusion_type=ALL_UNITS&date_range=${dateRange}&filter_selection=${proceduresSelection.toString()}&case_ids=${currentSelectPatientGroupIDs.toString()}`, {
            cancelToken: call.token
        }).then(function (response) {
            const dataResult = response.data
            if (dataResult) {
                dataResult.forEach((element: any) => {
                    caseSetReturnedFromQuery.add(element.case_id)
                })
                hemoglobinDataSet.forEach((singleCase: any) => {
                    let criteriaMet = true;
                    if (currentOutputFilterSet.length > 0) {
                        for (let selectSet of currentOutputFilterSet) {
                            if (selectSet.setName === aggregatedBy) {
                                if (!selectSet.setValues.includes(singleCase[aggregatedBy])) {
                                    criteriaMet = false;
                                }
                            }
                        }
                    }
                    if (!caseSetReturnedFromQuery.has(singleCase.CASE_ID)) {
                        criteriaMet = false;
                    }
                    else if (!procedureTypeSelection[singleCase.SURGERY_TYPE]) {
                        criteriaMet = false;
                    }
                    if (criteriaMet) {
                        if (!temporaryDataHolder[singleCase[aggregatedBy]]) {
                            temporaryDataHolder[singleCase[aggregatedBy]] = {
                                aggregateAttribute: singleCase[aggregatedBy],
                                PRBC_UNITS: 0,
                                FFP_UNITS: 0,
                                CRYO_UNITS: 0,
                                PLT_UNITS: 0,
                                CELL_SAVER_ML: 0,
                                caseNum: 0
                            }
                        }
                        temporaryDataHolder[singleCase[aggregatedBy]].PRBC_UNITS += singleCase.PRBC_UNITS;
                        temporaryDataHolder[singleCase[aggregatedBy]].FFP_UNITS += singleCase.FFP_UNITS;
                        temporaryDataHolder[singleCase[aggregatedBy]].CRYO_UNITS += singleCase.CRYO_UNITS;
                        temporaryDataHolder[singleCase[aggregatedBy]].PLT_UNITS += singleCase.PLT_UNITS;
                        temporaryDataHolder[singleCase[aggregatedBy]].CELL_SAVER_ML += singleCase.CELL_SAVER_ML;
                        temporaryDataHolder[singleCase[aggregatedBy]].caseNum += 1
                    }
                })
                console.log(temporaryDataHolder)
                Object.values(temporaryDataHolder).forEach((dataItem: any) => {
                    let newDataObj: CostBarChartDataPoint = {
                        aggregateAttribute: dataItem.aggregateAttribute,
                        dataArray: [
                            dataItem.PRBC_UNITS * (costMode ? BloodProductCost.PRBC_UNITS : 1) / dataItem.caseNum,
                            dataItem.FFP_UNITS * (costMode ? BloodProductCost.FFP_UNITS : 1) / dataItem.caseNum,
                            dataItem.CRYO_UNITS * (costMode ? BloodProductCost.CRYO_UNITS : 1) / dataItem.caseNum,
                            dataItem.PLT_UNITS * (costMode ? BloodProductCost.PLT_UNITS : 1) / dataItem.caseNum,
                            dataItem.CELL_SAVER_ML * (costMode ? BloodProductCost.CELL_SAVER_ML : 0.001) / dataItem.caseNum,
                        ],
                        caseNum: dataItem.caseNum
                    }
                    tempmaxCost = tempmaxCost > sum(newDataObj.dataArray) ? tempmaxCost : sum(newDataObj.dataArray)
                    console.log(newDataObj)
                    outputData.push(newDataObj)
                })
                stateUpdateWrapperUseJSON(data, outputData, setData);
                console.log(outputData)
                setMaximumCost(tempmaxCost)
            }
        }).catch(function (thrown) {
            if (axios.isCancel(thrown)) {
                console.log('Request canceled', thrown.message);
            } else {
                // handle error
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proceduresSelection, procedureTypeSelection, dateRange, aggregatedBy, currentOutputFilterSet, currentSelectPatientGroupIDs, costMode]);



    const changeAggregation = (e: any, value: any) => {
        actions.changeChart(value.value, "", chartId, "COST")
    }
    const changeMode = (e: any, value: any) => {
        setCostMode(!costMode)
        console.log(costMode)
    }



    return (
        <Grid style={{ height: "100%" }} >
            <Grid.Row >
                <Grid.Column verticalAlign="middle" width={1} style={{ display: previewMode ? "none" : null }}>
                    <Menu icon vertical compact size="mini" borderless secondary widths={2} >
                        <Menu.Item>
                            <Dropdown selectOnBlur={false} pointing basic item icon="settings" compact >
                                <Dropdown.Menu>
                                    <Dropdown text="Change Aggregation" pointing basic item compact options={barChartAggregationOptions} onChange={changeAggregation}></Dropdown>
                                    <Dropdown.Item text={`Show ${costMode ? "per case" : "cost"}`} onClick={changeMode} />
                                </Dropdown.Menu>

                            </Dropdown>
                        </Menu.Item>

                    </Menu>

                </Grid.Column>

                <Grid.Column width={(15) as any}>
                    <ChartSVG ref={svgRef}>
                        <CostBarChart
                            chartId={chartId}
                            dimensionWidth={dimensionWidth}
                            dimensionHeight={dimensionHeight}
                            data={data}
                            svg={svgRef}
                            aggregatedBy={aggregatedBy}
                            maximumCost={maximumCost}
                            costMode={costMode}
                        // selectedVal={selectedBar}
                        // stripPlotMode={stripPlotMode}
                        // extraPairDataSet={extraPairData}
                        />
                    </ChartSVG>
                    <NotationForm notation={notation} chartId={chartId} />

                </Grid.Column>
            </Grid.Row>
        </Grid>
    );
}


export default inject("store")(observer(CostBarChartVisualization));

