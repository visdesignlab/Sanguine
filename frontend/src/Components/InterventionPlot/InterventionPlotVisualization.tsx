import React, { FC, useEffect, useRef, useLayoutEffect, useState } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { ComparisonDataPoint, ExtraPairInterventionPoint } from '../../Interfaces/ApplicationState'
import { BloodProductCap, barChartAggregationOptions, barChartValuesOptions, interventionChartType, extraPairOptions, ChartSVG } from "../../PresetsProfile"
import { Grid, Dropdown, Menu, Icon, Modal, Form, Button, Message } from "semantic-ui-react";
import { create as createpd } from "pdfast";
import { sum, median, timeFormat, mean } from "d3";
import InterventionPlot from "./ComparisonPlot";
import axios from 'axios';
import { stateUpdateWrapperUseJSON, generateExtrapairPlotDataWithIntervention } from "../../HelperFunctions";

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
            return axios.get(`http://localhost:8000/api/request_transfused_units?aggregated_by=${aggregatedBy}&transfusion_type=${valueToVisualize}&date_range=${[dateRange[0], timeFormat("%d-%b-%Y")(new Date(interventionDate))]}&filter_selection=${proceduresSelection.toString()}&case_ids=${currentSelectPatientGroup.toString()}`, {
                cancelToken: call.token
            })
        }
        const getPostInt = () => {
            return axios.get(`http://localhost:8000/api/request_transfused_units?aggregated_by=${aggregatedBy}&transfusion_type=${valueToVisualize}&date_range=${[timeFormat("%d-%b-%Y")(new Date(interventionDate)), dateRange[1]]}&filter_selection=${proceduresSelection.toString()}&case_ids=${currentSelectPatientGroup.toString()}`, {
                cancelToken: call.token
            })
        }

        Promise.all([getPreInt(), getPostInt()])
            .then(function (results) {
                const preInterventiondataResult = results[0].data;
                const postInterventionResult = results[1].data;
                let caseCount = 0;
                if (preInterventiondataResult && postInterventionResult) {

                    //let castData = InterventionData

                    let caseDictionary = {} as any
                    let castData = (preInterventiondataResult as any).map(function (preIntOb: any) {
                        const aggregateByAttr = preIntOb.aggregated_by;
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
                            preIntOb.case_id.map((singleId: any) => {
                                caseDictionary[singleId] = true;
                            })

                            let zeroCaseNum = 0;

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

                            const new_ob: ComparisonDataPoint = {
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
                                postPatienIDList: [],
                                preCaseIDList: preIntOb.case_id,
                                postCaseIDList: []
                            };

                            return new_ob;
                        }
                    });

                    castData = castData.filter((d: any) => d);

                    (postInterventionResult as any).map((postIntOb: any) => {

                        let criteriaMet = true;
                        if (currentOutputFilterSet.length > 0) {
                            for (let selectSet of currentOutputFilterSet) {
                                if (selectSet.setName === aggregatedBy) {
                                    if (!selectSet.setValues.includes(postIntOb.aggregated_by)) {
                                        criteriaMet = false;
                                    }
                                }
                            }
                        }
                        if (criteriaMet) {
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
                            castData = castData.map((d: ComparisonDataPoint) => {

                                if (d.aggregateAttribute === postIntOb.aggregated_by) {
                                    found = true;
                                    d.postCountDict = postCountDict;
                                    d.postInKdeCal = postIntPD;
                                    d.postInMedian = postIntMed ? postIntMed : 0;
                                    d.postZeroCaseNum = zeroCaseNum;
                                    d.postCaseCount = case_num
                                    d.postTotalVal = total_val
                                    d.postPatienIDList = postIntOb.pat_id
                                    d.postCaseIDList = postIntOb.case_id
                                    return d;
                                }
                                else {
                                    return d;
                                }
                            })
                            if (!found) {
                                const new_ob: ComparisonDataPoint = {
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
                                    postPatienIDList: postIntOb.pat_id,
                                    preCaseIDList: [],
                                    postCaseIDList: postIntOb.case_id
                                };
                                castData.push(new_ob)
                            }
                        }

                    })

                    castData = castData.filter((d: any) => d)

                    stateUpdateWrapperUseJSON(data, castData, setData)
                    stateUpdateWrapperUseJSON(caseIDList, caseDictionary, setCaseIDList)
                    // setData(castData);
                    // setCaseIDList(caseDictionary)
                    // actions.updateCaseCount("AGGREGATED", caseCount)
                    store!.totalAggregatedCaseCount = caseCount

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
    }, [proceduresSelection, dateRange, aggregatedBy, showZero, valueToVisualize, currentSelectPatientGroup, currentOutputFilterSet]);


    useEffect(() => {
        const newExtraPairData = generateExtrapairPlotDataWithIntervention(caseIDList, aggregatedBy, hemoglobinDataSet, extraPairArray, data)
        stateUpdateWrapperUseJSON(extraPairData, newExtraPairData, setExtraPairData)
        console.log(extraPairData)
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

