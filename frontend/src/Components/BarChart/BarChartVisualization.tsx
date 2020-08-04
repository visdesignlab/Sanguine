import React, { FC, useEffect, useRef, useLayoutEffect, useState } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { BarChartDataPoint, ExtraPairPoint, BasicAggregatedDatePoint } from '../../Interfaces/ApplicationState'
import { BloodProductCap, barChartValuesOptions, barChartAggregationOptions, interventionChartType, extraPairOptions, ChartSVG } from "../../PresetsProfile"
import BarChart from "./BarChart"
import { Button, Icon, Grid, Dropdown, Menu, Modal, Form, Message } from "semantic-ui-react";
import { create as createpd } from "pdfast";
import { sum, median, mean } from "d3";
import axios from 'axios'
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
        currentSelectPatientGroupIDs,
        currentOutputFilterSet,
        previewMode,
        dateRange,

    } = store!;
    const svgRef = useRef<SVGSVGElement>(null);
    // const [data, setData] = useState<{: BarChartDataPoint[]; perCase: BarChartDataPoint[]; }>({: [], perCase: [] });
    const [data, setData] = useState<
        BarChartDataPoint[]
    >([]);

    const [yMax, setYMax] = useState(0);
    // const [kdeMax,setKdeMax] = useState(0)
    // const [medianVal, setMedian] = useState()
    //  const [selectedBar, setSelectedBarVal] = useState<number | null>(null);
    const [dimensionHeight, setDimensionHeight] = useState(0)
    const [dimensionWidth, setDimensionWidth] = useState(0)
    // const [dimensions, setDimensions] = useState({ height: 0, width: 0 });
    const [extraPairData, setExtraPairData] = useState<ExtraPairPoint[]>([])
    const [stripPlotMode, setStripMode] = useState(false);
    const [caseIDList, setCaseIDList] = useState<any>(null)
    const [extraPairArray, setExtraPairArray] = useState([])
    const [openNotationModal, setOpenNotationModal] = useState(false)
    const [notationInput, setNotationInput] = useState(notation)
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)


    useEffect(() => {
        if (extraPair) { stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPair), setExtraPairArray) }
    }, [extraPair])

    useLayoutEffect(() => {
        if (svgRef.current) {
            setDimensionHeight(svgRef.current.clientHeight);
            // setDimensionWidth(svgRef.current.clientWidth)
            setDimensionWidth(w === 1 ? 542.28 : 1146.97)
        }
    }, [layoutArray[chartIndex]]);


    function fetchChartData() {

        let caseCount = 0;
        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call)
        axios.get(`http://localhost:8000/api/request_transfused_units?aggregated_by=${aggregatedBy}&transfusion_type=${valueToVisualize}&date_range=${dateRange}&filter_selection=${proceduresSelection.toString()}&case_ids=${currentSelectPatientGroupIDs.toString()}`, {
            cancelToken: call.token
        }).then(function (response) {
            const dataResult = response.data
            if (dataResult) {
                let yMaxTemp = -1;
                let caseDictionary = {} as any;



                let cast_data = (dataResult as any).map(function (ob: any) {

                    let zeroCaseNum = 0;
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



                        const case_num = ob.transfused_units.length;
                        caseCount += case_num

                        const medianVal = median(ob.transfused_units);

                        let removed_zeros = ob.transfused_units;
                        if (!showZero) {
                            removed_zeros = ob.transfused_units.filter((d: number) => {
                                if (d > 0) {
                                    return true;
                                }
                                zeroCaseNum += 1;
                                return false;
                            })
                        } else {
                            zeroCaseNum = removed_zeros.filter((d: number) => d === 0).length
                        }

                        const total_val = sum(removed_zeros);

                        let pd = createpd(removed_zeros, { width: 2, min: 0, max: BloodProductCap[valueToVisualize] });
                        pd = [{ x: 0, y: 0 }].concat(pd)
                        let reverse_pd = pd.map((pair: any) => {
                            return { x: pair.x, y: - pair.y }
                        }).reverse()
                        pd = pd.concat(reverse_pd)

                        const new_ob: BarChartDataPoint = {
                            caseCount: case_num,
                            aggregateAttribute: aggregateByAttr,
                            totalVal: total_val,
                            kdeCal: pd,
                            median: medianVal ? medianVal : 0,
                            actualDataPoints: ob.transfused_units,
                            zeroCaseNum: zeroCaseNum,
                            patientIDList: ob.pat_id,
                            caseIDList: ob.case_id
                        };
                        return new_ob;
                    }
                });

                cast_data = cast_data.filter((d: any) => d)
                stateUpdateWrapperUseJSON(data, cast_data, setData)
                stateUpdateWrapperUseJSON(caseIDList, caseDictionary, setCaseIDList)
                setYMax(yMaxTemp);
                store!.totalAggregatedCaseCount = caseCount;
                console.log(cast_data)
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
    }, [proceduresSelection, dateRange, showZero, aggregatedBy, valueToVisualize, currentSelectPatientGroupIDs]);


    useEffect(() => {
        let caseDictionary = {} as any;
        let newData = data.map((d: BasicAggregatedDatePoint) => {
            let criteriaMet = true;
            if (currentOutputFilterSet.length > 0) {
                for (let selectSet of currentOutputFilterSet) {
                    if (selectSet.setName === aggregatedBy) {
                        if (!selectSet.setValues.includes(d.aggregateAttribute)) {
                            criteriaMet = false;
                        }
                    }
                }
            }
            if (criteriaMet) {
                d.caseIDList.map((singleId: any) => {
                    caseDictionary[singleId] = true;
                })
                return d
            }
        })
        newData = newData.filter((d: any) => d);
        stateUpdateWrapperUseJSON(data, newData, setData)
        stateUpdateWrapperUseJSON(caseIDList, caseDictionary, setCaseIDList);
    }, [currentOutputFilterSet])


    useEffect(() => {
        console.log("using effect")
        const newExtraPairData = generateExtrapairPlotData(caseIDList, aggregatedBy, hemoglobinDataSet, extraPairArray, data)
        stateUpdateWrapperUseJSON(extraPairData, newExtraPairData, setExtraPairData)

    }, [extraPairArray, data, hemoglobinDataSet, caseIDList]);



    const toggleStripGraphMode = () => {
        setStripMode(!stripPlotMode)
    }

    const changeAggregation = (e: any, value: any) => {
        actions.changeChart(value.value, valueToVisualize, chartId, "VIOLIN")
    }
    const changeValue = (e: any, value: any) => {
        actions.changeChart(aggregatedBy, value.value, chartId, "VIOLIN")
    }

    const changePlotType = (e: any, value: any) => {
        actions.changeChart(aggregatedBy, valueToVisualize, chartId, value.value)
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
                <Grid.Column verticalAlign="middle" width={1} style={{ display: previewMode ? "none" : null }}>
                    <Menu icon vertical compact size="mini" borderless secondary widths={2} >
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
                        <Menu.Item fitted onClick={toggleStripGraphMode}>
                            <Icon name="ellipsis vertical" />
                        </Menu.Item>
                        <Menu.Item>
                            <Dropdown selectOnBlur={false} pointing basic item icon="settings" compact >
                                <Dropdown.Menu>
                                    <Dropdown text="Change Aggregation" pointing basic item compact options={barChartAggregationOptions} onChange={changeAggregation}></Dropdown>
                                    <Dropdown text="Change Value" pointing basic item compact options={barChartValuesOptions} onChange={changeValue}></Dropdown>
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
                        {/* <text
          x="0"
          y="0"
          style={{
            fontSize: "10px",
            alignmentBaseline: "hanging"
          }}
        >
          chart # ${chartId}
        </text> */}
                        <BarChart
                            chartId={chartId}
                            width={dimensionWidth}
                            height={dimensionHeight}
                            data={data}
                            svg={svgRef}
                            aggregatedBy={aggregatedBy}
                            valueToVisualize={valueToVisualize}
                            yMax={yMax}
                            // selectedVal={selectedBar}
                            stripPlotMode={stripPlotMode}
                            extraPairDataSet={extraPairData}
                        />
                    </ChartSVG>
                    {/* <Container>{notation}</Container> */}
                    <Message hidden={notation.length === 0} >{notation}</Message>

                </Grid.Column>
            </Grid.Row>
        </Grid>
    );
}


export default inject("store")(observer(BarChartVisualization));

