import Store from "../../Interfaces/Store";
import { FC, useRef, useState, useEffect, useLayoutEffect } from "react";
import { ExtraPairInterventionPoint, ComparisonDataPoint } from "../../Interfaces/ApplicationState";
import React from "react";
import { inject, observer } from "mobx-react";
import { extraPairOptions, barChartAggregationOptions, barChartValuesOptions, interventionChartType, ChartSVG } from "../../PresetsProfile";
import axios from 'axios';
import { stateUpdateWrapperUseJSON, generateExtrapairPlotDataWithIntervention, generateComparisonData } from "../../HelperFunctions";
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
        currentSelectPatientGroupIDs,
        currentOutputFilterSet,
        dateRange,
        outcomesSelection
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
    }, [extraPair, extraPairArray])

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
    }, [layoutArray, w]);



    useEffect(() => {
        if (previousCancelToken) {
            previousCancelToken.cancel("cancel the call?")
        }
        let temporaryDataHolder: any = {}
        let caseDictionary = {} as any;

        let caseSetReturnedFromQuery = new Set();


        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call);
        axios.get(`${process.env.REACT_APP_QUERY_URL}request_transfused_units?transfusion_type=ALL_UNITS&date_range=${dateRange}&filter_selection=${proceduresSelection.toString()}&case_ids=${currentSelectPatientGroupIDs.toString()}`, {
            cancelToken: call.token
        })
            .then(function (response) {
                const transfusedDataResult = response.data;
                if (transfusedDataResult) {
                    transfusedDataResult.forEach((element: any) => {
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

                        // if (outcomesSelection.length > 0) {
                        //     outcomesSelection.forEach((outcome) => {
                        //         if (outcome !== outcomeComparison) {
                        //             if (singleCase[outcome] === "0") {
                        //                 criteriaMet = false;
                        //             }
                        //         }
                        //     })
                        // }
                        if (outcomesSelection && outcomesSelection !== outcomeComparison) {
                            if (singleCase[outcomesSelection] === "0") {
                                criteriaMet = false;
                            }
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
                                temporaryDataHolder[singleCase[aggregatedBy]].preData.push(singleCase)
                                temporaryDataHolder[singleCase[aggregatedBy]].prePatientIDList.add(singleCase.PATIENT_ID)
                                // temporaryDataHolder[singleCase[aggregatedBy]].preCaseIDList.add(singleCase.CASE_ID)
                            } else {
                                temporaryDataHolder[singleCase[aggregatedBy]].postData.push(singleCase)
                                temporaryDataHolder[singleCase[aggregatedBy]].postPatienIDList.add(singleCase.PATIENT_ID)
                                // temporaryDataHolder[singleCase[aggregatedBy]].postCaseIDList.add(singleCase.CASE_ID)
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


                    const [caseCount, outputData] = generateComparisonData(temporaryDataHolder, showZero, valueToVisualize)
                    stateUpdateWrapperUseJSON(data, outputData, setData);
                    stateUpdateWrapperUseJSON(caseIDDictionary, caseDictionary, setCaseIDList)
                    store!.totalAggregatedCaseCount = caseCount as number;
                }
            }
            )
            .catch(function (thrown) {
                if (axios.isCancel(thrown)) {
                    console.log('Request canceled', thrown.message);
                } else {
                    // handle error
                }
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proceduresSelection, hemoglobinDataSet, dateRange, aggregatedBy, showZero, valueToVisualize, currentSelectPatientGroupIDs, currentOutputFilterSet, outcomeComparison]);


    useEffect(() => {
        const newExtraPairData = generateExtrapairPlotDataWithIntervention(caseIDDictionary, aggregatedBy, hemoglobinDataSet, extraPairArray, data)
        stateUpdateWrapperUseJSON(extraPairData, newExtraPairData, setExtraPairData)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extraPairArray, data, hemoglobinDataSet, caseIDDictionary, aggregatedBy]);

    const changeAggregation = (e: any, value: any) => {
        actions.changeChart(value.value, valueToVisualize, chartId, "COMPARISON")
    }
    const changeValue = (e: any, value: any) => {
        actions.changeChart(aggregatedBy, value.value, chartId, "COMPARISON")
    }

    const changeType = (e: any, value: any) => {
        actions.changeChart(aggregatedBy, valueToVisualize, chartId, "COMPARISON", value.value)
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