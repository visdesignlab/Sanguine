import React, { FC, useEffect, useRef, useLayoutEffect, useState } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { HeatMapDataPoint, ExtraPairPoint } from '../../Interfaces/ApplicationState'
import { barChartAggregationOptions, barChartValuesOptions, extraPairOptions, ChartSVG, OutcomeType, } from "../../PresetsProfile"
import { Grid, Dropdown, Menu } from "semantic-ui-react";
import HeatMap from "./HeatMap";
import axios from 'axios';
import { stateUpdateWrapperUseJSON, generateExtrapairPlotData, generateRegularData } from "../../HelperFunctions";
import NotationForm from "../Utilities/NotationForm";

interface OwnProps {
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    extraPair?: string;
    hemoglobinDataSet: any;
    notation: string;
    w: number
}

export type Props = OwnProps;

const BarChartVisualization: FC<Props> = ({ w, notation, hemoglobinDataSet, aggregatedBy, valueToVisualize, chartId, store, chartIndex, extraPair }: Props) => {
    const {
        layoutArray,
        proceduresSelection,
        showZero,
        dateRange,
        currentSelectPatientGroupIDs,
        previewMode,
        outcomesSelection,
        currentOutputFilterSet
    } = store!;
    const svgRef = useRef<SVGSVGElement>(null);
    // const [data, setData] = useState<{ original: BarChartDataPoint[]; perCase: BarChartDataPoint[]; }>({ original: [], perCase: [] });
    const [data, setData] = useState<HeatMapDataPoint[]>([]);


    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0)
    //const [dimensions, setDimensions] = useState({ height: 0, width: 0 });
    const [extraPairData, setExtraPairData] = useState<ExtraPairPoint[]>([])

    //  const [caseIDList, setCaseIDList] = useState<any>(null)
    const [extraPairArray, setExtraPairArray] = useState<string[]>([]);
    //    const [openNotationModal, setOpenNotationModal] = useState(false)
    // const [notationInput, setNotationInput] = useState(notation)
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)

    useEffect(() => {
        if (extraPair) { stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPair), setExtraPairArray) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extraPair])

    //TODO change all the dependency to w,h
    useLayoutEffect(() => {
        if (svgRef.current) {
            //  setWidth(svgRef.current.clientWidth);
            setWidth(w === 1 ? 542.28 : 1146.97)
            setHeight(svgRef.current.clientHeight)
        }
    }, [layoutArray, w]);

    useEffect(() => {
        if (previousCancelToken) {
            previousCancelToken.cancel("cancel the call?")
        }
        let temporaryDataHolder: any = {}
        //   let caseDictionary = {} as any;

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
                        //         if (singleCase[outcome] === "0") {
                        //             criteriaMet = false;
                        //         }
                        //     })
                        // }
                        if (outcomesSelection) {

                            if (singleCase[outcomesSelection] === 0) {
                                criteriaMet = false;
                            }

                        }

                        if (criteriaMet) {
                            //   caseDictionary[singleCase.CASE_ID] = true;
                            if (!temporaryDataHolder[singleCase[aggregatedBy]]) {
                                temporaryDataHolder[singleCase[aggregatedBy]] = {
                                    aggregateAttribute: singleCase[aggregatedBy],
                                    data: [],
                                    patientIDList: new Set(),

                                }
                            }
                            temporaryDataHolder[singleCase[aggregatedBy]].data.push(singleCase)
                            temporaryDataHolder[singleCase[aggregatedBy]].patientIDList.add(singleCase.PATIENT_ID)
                        }
                    })
                    const [caseCount, outputData] = generateRegularData(temporaryDataHolder, showZero, valueToVisualize)
                    stateUpdateWrapperUseJSON(data, outputData, setData)
                    // stateUpdateWrapperUseJSON(caseIDList, caseDictionary, setCaseIDList);
                    store!.totalAggregatedCaseCount = caseCount as number
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
    }, [proceduresSelection, outcomesSelection, dateRange, showZero, aggregatedBy, valueToVisualize, currentSelectPatientGroupIDs, currentOutputFilterSet, hemoglobinDataSet]);



    useEffect(() => {

        const newExtraPairData = generateExtrapairPlotData(aggregatedBy, hemoglobinDataSet, extraPairArray, data)
        stateUpdateWrapperUseJSON(extraPairData, newExtraPairData, setExtraPairData)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extraPairArray, data, hemoglobinDataSet, aggregatedBy]);



    const changeAggregation = (e: any, value: any) => {
        actions.changeChart(value.value, valueToVisualize, chartId, "HEATMAP")
    }
    const changeValue = (e: any, value: any) => {
        actions.changeChart(aggregatedBy, value.value, chartId, "HEATMAP")
    }

    const changePlotType = (e: any, value: any) => {
        actions.changeChart(aggregatedBy, valueToVisualize, chartId, "COMPARISON", value.value)
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
                <Grid.Column verticalAlign="middle" width={1} style={{ display: previewMode ? "none" : null }} >
                    <Menu icon vertical compact size="mini" borderless secondary widths={2} style={{}}>
                        <Menu.Item fitted>
                            <Dropdown disabled={extraPairArray.length >= 5} selectOnBlur={false} basic item icon="plus" compact>
                                <Dropdown.Menu>
                                    {
                                        extraPairOptions.map((d) => {
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
                        {/* <Menu.Item fitted onClick={toggleStripGraphMode}>
                            <Icon name="ellipsis vertical" />
                        </Menu.Item> */}
                        <Menu.Item fitted>
                            <Dropdown selectOnBlur={false} basic item icon="settings" compact >
                                <Dropdown.Menu>
                                    <Dropdown text="Change Aggregation" pointing basic item compact options={barChartAggregationOptions} onChange={changeAggregation} />
                                    <Dropdown text="Change Value" pointing basic item compact options={barChartValuesOptions} onChange={changeValue} />
                                    <Dropdown text="Add Outcome Comparison" pointing basic item compact options={OutcomeType} onChange={changePlotType} />
                                </Dropdown.Menu>
                            </Dropdown>
                        </Menu.Item>
                        {/* <Menu.Item fitted onClick={() => { setOpenNotationModal(true) }}>
                            <Icon name="edit" />
                        </Menu.Item> */}

                        {/* Modal for annotation. */}
                        {/* <Modal autoFocus open={openNotationModal} closeOnEscape={false} closeOnDimmerClick={false}>
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
                        </Modal> */}
                    </Menu>

                </Grid.Column>
                <Grid.Column width={(15) as any}>
                    <ChartSVG ref={svgRef}>
                        <HeatMap
                            dimensionHeight={height}
                            dimensionWidth={width}
                            data={data}
                            svg={svgRef}
                            aggregatedBy={aggregatedBy}
                            valueToVisualize={valueToVisualize}
                            // selectedVal={selectedBar}
                            chartId={chartId}
                            // stripPlotMode={stripPlotMode}
                            extraPairDataSet={extraPairData}
                        />
                    </ChartSVG>

                    {/* <Message hidden={notation.length === 0} >{notation}</Message> */}
                    <NotationForm notation={notation} chartId={chartId} />

                </Grid.Column>
            </Grid.Row>
        </Grid>
    );
}


export default inject("store")(observer(BarChartVisualization));

