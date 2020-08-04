import React, { FC, useEffect, useRef, useLayoutEffect, useState } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { HeatMapDataPoint, ExtraPairPoint, BasicAggregatedDatePoint } from '../../Interfaces/ApplicationState'
import { BloodProductCap, barChartAggregationOptions, barChartValuesOptions, interventionChartType, extraPairOptions, ChartSVG, } from "../../PresetsProfile"
import { Icon, Grid, Dropdown, Menu, Modal, Form, Button, Message } from "semantic-ui-react";

import { sum, median, mean } from "d3";
import HeatMap from "./HeatMap";
import axios from 'axios';
import { stateUpdateWrapperUseJSON, generateExtrapairPlotData } from "../../HelperFunctions";

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
        currentSelectPatientGroup,
        previewMode,
        currentOutputFilterSet
    } = store!;
    const svgRef = useRef<SVGSVGElement>(null);
    // const [data, setData] = useState<{ original: BarChartDataPoint[]; perCase: BarChartDataPoint[]; }>({ original: [], perCase: [] });
    const [data, setData] = useState<HeatMapDataPoint[]>([]);

    const [yMax, setYMax] = useState(0);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0)
    //const [dimensions, setDimensions] = useState({ height: 0, width: 0 });
    const [extraPairData, setExtraPairData] = useState<ExtraPairPoint[]>([])
    const [stripPlotMode, setStripMode] = useState(false);
    const [caseIDList, setCaseIDList] = useState<any>(null)
    const [extraPairArray, setExtraPairArray] = useState<string[]>([]);
    const [openNotationModal, setOpenNotationModal] = useState(false)
    const [notationInput, setNotationInput] = useState(notation)
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)

    useEffect(() => {
        if (extraPair) { stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPair), setExtraPairArray) }
    }, [extraPair])


    useLayoutEffect(() => {
        if (svgRef.current) {
            //  setWidth(svgRef.current.clientWidth);
            setWidth(w === 1 ? 542.28 : 1146.97)
            setHeight(svgRef.current.clientHeight)
        }
    }, [layoutArray[chartIndex]]);

    function fetchChartData() {
        let transfused_dict = {} as any;
        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call);
        axios.get(`http://localhost:8000/api/request_transfused_units?aggregated_by=${aggregatedBy}&transfusion_type=${valueToVisualize}&date_range=${dateRange}&filter_selection=${proceduresSelection.toString()}&case_ids=${currentSelectPatientGroup.toString()}`, {
            cancelToken: call.token
        })
            .then(function (response) {
                const dataResult = response.data;
                console.log(dataResult)
                //  let caseCount = 0;
                if (dataResult) {
                    let yMaxTemp = -1;

                    // const caseList = dataResult.case_id_list;
                    let caseDictionary = {} as any;
                    //   console.log(dataResult)

                    let cast_data = (dataResult as any).map(function (ob: any) {
                        const aggregateByAttr = ob.aggregated_by;
                        let criteriaMet = true;
                        if (currentOutputFilterSet.length > 0) {
                            for (let selectSet of currentOutputFilterSet) {
                                if (selectSet.setName === aggregatedBy) {
                                    if (!selectSet.setValues.includes(aggregateByAttr)) {
                                        criteriaMet = false;
                                    }
                                }
                            }
                        }
                        if (criteriaMet) {

                            ob.case_id.map((singleId: any) => {
                                caseDictionary[singleId] = true;
                            })

                            let zeroCaseNum = 0;
                            const case_num = ob.transfused_units.length;
                            //  caseCount += case_num

                            let outputResult = ob.transfused_units;
                            zeroCaseNum = outputResult.filter((d: number) => d === 0).length

                            const total_val = sum(outputResult);

                            let countDict = {} as any
                            const cap = BloodProductCap[valueToVisualize]


                            if (valueToVisualize === "CELL_SAVER_ML") {
                                countDict[-1] = 0
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
                                    if (d === 0) {
                                        countDict[-1] += 1
                                    }
                                    else if (roundedAnswer > cap) {
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
                            })

                            const new_ob: HeatMapDataPoint = {
                                caseCount: case_num,
                                aggregateAttribute: aggregateByAttr,
                                totalVal: total_val,
                                countDict: countDict,
                                zeroCaseNum: zeroCaseNum,
                                caseIDList: ob.case_id,
                                patientIDList: ob.pat_id
                            };
                            return new_ob;
                        }
                    });
                    cast_data = cast_data.filter((d: any) => d)

                    stateUpdateWrapperUseJSON(data, cast_data, setData)
                    stateUpdateWrapperUseJSON(caseIDList, caseDictionary, setCaseIDList);

                    setYMax(yMaxTemp);
                    store!.totalAggregatedCaseCount = Object.keys(caseDictionary).length;

                }
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
    }, [proceduresSelection, dateRange, showZero, aggregatedBy, valueToVisualize, currentSelectPatientGroup, currentOutputFilterSet
        //  currentOutputFilterSet
    ]);

    const makeExtraPairData = () => {
        const newExtraPairData = generateExtrapairPlotData(caseIDList, aggregatedBy, hemoglobinDataSet, extraPairArray, data)
        stateUpdateWrapperUseJSON(extraPairData, newExtraPairData, setExtraPairData)
        // setExtraPairData(newExtraPairData)
    }

    useEffect(() => {

        makeExtraPairData();
        //console.log(extraPairData)
    }, [extraPairArray, data, hemoglobinDataSet, caseIDList]);

    const toggleStripGraphMode = () => {
        setStripMode(!stripPlotMode)
    }

    const changeAggregation = (e: any, value: any) => {
        actions.changeChart(value.value, valueToVisualize, chartId, "HEATMAP")
    }
    const changeValue = (e: any, value: any) => {
        actions.changeChart(aggregatedBy, value.value, chartId, "HEATMAP")
    }

    // const changePlotType = (e: any, value: any) => {
    //     actions.changeChart(aggregatedBy, valueToVisualize, chartId, value.value)
    // }


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
                            <Dropdown selectOnBlur={false} basic item icon="plus" compact>
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
                                    {/* <Dropdown text="Change Plot Type" pointing basic item compact options={interventionChartType} onChange={changePlotType} /> */}
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
                        <HeatMap
                            dimensionHeight={height}
                            dimensionWidth={width}
                            data={data}
                            svg={svgRef}
                            aggregatedBy={aggregatedBy}
                            valueToVisualize={valueToVisualize}
                            yMax={yMax}
                            // selectedVal={selectedBar}
                            chartId={chartId}
                            // stripPlotMode={stripPlotMode}
                            extraPairDataSet={extraPairData}
                        />
                    </ChartSVG>

                    <Message hidden={notation.length === 0} >{notation}</Message>


                </Grid.Column>
            </Grid.Row>
        </Grid>
    );
}


export default inject("store")(observer(BarChartVisualization));

