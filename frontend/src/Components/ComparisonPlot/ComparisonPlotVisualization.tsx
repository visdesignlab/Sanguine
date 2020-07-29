import Store from "../../Interfaces/Store";
import { FC, useRef, useState, useEffect, useLayoutEffect } from "react";
import { ExtraPairInterventionPoint, ComparisonDataPoint } from "../../Interfaces/ApplicationState";
import React from "react";
import { inject, observer } from "mobx-react";
import { BloodProductCap, extraPairOptions, barChartAggregationOptions, barChartValuesOptions, interventionChartType, ChartSVG } from "../../PresetsProfile";
import axios from 'axios';
import { sum, median } from "d3";
import { create as createpd } from "pdfast";
import { stateUpdateWrapperUseJSON, generateExtrapairPlotDataWithIntervention } from "../../HelperFunctions";
import { actions } from "../..";
import { Grid, Menu, Dropdown, Icon, Modal, Form, Button, Message } from "semantic-ui-react";
import InterventionPlot from "../InterventionPlot/ComparisonPlot";


interface OwnProps {
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    outcomeComparison: string;
    extraPair?: string;
    hemoglobinDataSet: any;
    notation: string;
    w: number
}

export type Props = OwnProps;

const ComparisonPlotVisualization: FC<Props> = ({ w, outcomeComparison, notation, hemoglobinDataSet, extraPair, aggregatedBy, valueToVisualize, chartId, store, chartIndex }: Props) => {
    const {
        layoutArray,
        proceduresSelection,
        showZero,
        previewMode,
        currentSelectPatientGroup,
        currentOutputFilterSet,
        rawDateRange,
        dateRange
    } = store!;

    const svgRef = useRef<SVGSVGElement>(null);

    const [extraPairData, setExtraPairData] = useState<ExtraPairInterventionPoint[]>([])

    const [data, setData] = useState<ComparisonDataPoint[]>([]);

    // const [dimensions, setDimensions] = useState({ height: 0, width: 0 });

    const [width, setWidth] = useState(0)
    const [height, setHeight] = useState(0)

    const [caseIDDictionary, setCaseIDList] = useState<any>(null)
    const [extraPairArray, setExtraPairArray] = useState<string[]>([]);

    const [openNotationModal, setOpenNotationModal] = useState(false)
    const [notationInput, setNotationInput] = useState(notation)
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)

    useEffect(() => {
        if (extraPair) {
            stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPair), setExtraPairArray)
        }
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

    function fetchChartData() {
        let temporaryDataHolder: any = {}
        let caseDictionary = {} as any;
        let outputData: ComparisonDataPoint[] = [];
        let caseSetReturnedFromQuery = new Set()

        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call);

        axios.get(`http://localhost:8000/api/request_transfused_units?transfusion_type=ALL_UNITS&date_range=${dateRange}&filter_selection=${proceduresSelection.toString()}&case_ids=${currentSelectPatientGroup.toString()}`, {
            cancelToken: call.token
        })
            .then(function (response) {
                const transfusedDataResult = response.data;
                transfusedDataResult.forEach((element: any) => {
                    caseSetReturnedFromQuery.add(element.case_id)
                })
                console.log(caseSetReturnedFromQuery)
                hemoglobinDataSet.map((singleCase: any) => {
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

                    if (criteriaMet) {
                        caseDictionary[singleCase.CASE_ID] = true;
                        const caseOutcome = parseInt(singleCase[outcomeComparison]);
                        if (!temporaryDataHolder[singleCase[aggregatedBy]]) {
                            temporaryDataHolder[singleCase[aggregatedBy]] = {
                                aggregateAttribute: singleCase[aggregatedBy],
                                preData: [],
                                postData: [],
                                prePatientIDList: new Set(),
                                postPatienIDList: new Set(),
                                preCaseIDList: new Set(),
                                postCaseIDList: new Set()
                            }
                        }
                        if (caseOutcome > 0) {
                            temporaryDataHolder[singleCase[aggregatedBy]].preData.push(singleCase[valueToVisualize])
                            temporaryDataHolder[singleCase[aggregatedBy]].prePatientIDList.add(singleCase.PATIENT_ID)
                            temporaryDataHolder[singleCase[aggregatedBy]].preCaseIDList.add(singleCase.CASE_ID)
                        } else {
                            temporaryDataHolder[singleCase[aggregatedBy]].postData.push(singleCase[valueToVisualize])
                            temporaryDataHolder[singleCase[aggregatedBy]].postPatienIDList.add(singleCase.PATIENT_ID)
                            temporaryDataHolder[singleCase[aggregatedBy]].postCaseIDList.add(singleCase.CASE_ID)
                        }
                    }
                })
                /**Construct the following data
         * aggregateAttribute: singleCase[aggregatedBy],
                        preData: [], --- positive
                        postData: [], --- negative
                        prePatientIDList: new Set(),
                        postPatienIDList: new Set(),
                        preCaseIDList: new Set(),
                        postCaseIDList: new Set()
         */
                Object.values(temporaryDataHolder).forEach((computedData: any) => {
                    const prePatientIDArray: number[] = Array.from(computedData.prePatientIDList);
                    const postPatientIDArray: number[] = Array.from(computedData.postPatienIDList);
                    const preCaseIDArray: number[] = Array.from(computedData.preCaseIDList);
                    const postCaseIDArray: number[] = Array.from(computedData.postCaseIDList);
                    let preDataArray = computedData.preData;
                    let postDataArray = computedData.postData;
                    let preZeroNum = 0;
                    let postZeroNum = 0;
                    if (!showZero) {
                        preDataArray = preDataArray.filter((d: number) => {
                            if (d > 0) {
                                return true;
                            }
                            preZeroNum += 1;
                            return false;
                        })
                        postDataArray = postDataArray.filter((d: number) => {
                            if (d > 0) {
                                return true;
                            }
                            postZeroNum += 1;
                            return false;
                        })
                    } else {
                        preZeroNum = preDataArray.filter((d: number) => d === 0).length;
                        postZeroNum = postDataArray.filter((d: number) => d === 0).length
                    }

                    let prePD = createpd(preDataArray, { width: 2, min: 0, max: BloodProductCap[valueToVisualize] });

                    prePD = [{ x: 0, y: 0 }].concat(prePD)
                    let reversePrePD = prePD.map((pair: any) => {
                        return { x: pair.x, y: - pair.y }
                    }).reverse()
                    prePD = prePD.concat(reversePrePD)

                    let postPD = createpd(postDataArray, { width: 2, min: 0, max: BloodProductCap[valueToVisualize] });

                    postPD = [{ x: 0, y: 0 }].concat(postPD)
                    let reversePostPD = postPD.map((pair: any) => {
                        return { x: pair.x, y: - pair.y }
                    }).reverse()
                    postPD = postPD.concat(reversePostPD)


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

                    preDataArray.map((d: any) => {
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

                    postDataArray.map((d: any) => {
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

                    });

                    outputData.push(
                        {
                            aggregateAttribute: computedData.aggregateAttribute,
                            preTotalVal: sum(computedData.preData),
                            postTotalVal: sum(computedData.postData),
                            prePatienIDList: prePatientIDArray,
                            postPatienIDList: postPatientIDArray,
                            preCaseIDList: preCaseIDArray,
                            postCaseIDList: postCaseIDArray,
                            preZeroCaseNum: preZeroNum,
                            postZeroCaseNum: postZeroNum,
                            preInKdeCal: prePD,
                            postInKdeCal: postPD,
                            preCountDict: preCountDict,
                            postCountDict: postCountDict,
                            preCaseCount: preCaseIDArray.length,
                            postCaseCount: postCaseIDArray.length,
                            preInMedian: median(preDataArray) || 0,
                            postInMedian: median(postDataArray) || 0
                        }
                    )
                });
                stateUpdateWrapperUseJSON(data, outputData, setData);
                stateUpdateWrapperUseJSON(caseIDDictionary, caseDictionary, setCaseIDList)
            })
            .catch(function (thrown) {
                if (axios.isCancel(thrown)) {
                    console.log('Request canceled', thrown.message);
                } else {
                    // handle error
                }
            });

    }

    useEffect(() => {
        if (previousCancelToken) {
            previousCancelToken.cancel("cancel the call?")
        }
        fetchChartData();
    }, [proceduresSelection, dateRange, aggregatedBy, showZero, valueToVisualize, currentSelectPatientGroup]);


    useEffect(() => {
        const newExtraPairData = generateExtrapairPlotDataWithIntervention(caseIDDictionary, aggregatedBy, hemoglobinDataSet, extraPairArray, data)
        stateUpdateWrapperUseJSON(extraPairData, newExtraPairData, setExtraPairData)

    }, [extraPairArray, data, hemoglobinDataSet, caseIDDictionary]);

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

                            chartId={chartId}
                            //dimensionWhole={dimensions}
                            dimensionWidth={width}
                            dimensionHeight={height}
                            data={data}
                            svg={svgRef}
                            aggregatedBy={aggregatedBy}
                            valueToVisualize={valueToVisualize}
                            plotType="HEATMAP"
                            outcomeComparison={outcomeComparison}
                            extraPairDataSet={extraPairData}
                        />
                    </ChartSVG>

                    <Message hidden={notation.length === 0} >{notation}</Message>

                </Grid.Column>

            </Grid.Row>
        </Grid>)
}
export default inject("store")(observer(ComparisonPlotVisualization));