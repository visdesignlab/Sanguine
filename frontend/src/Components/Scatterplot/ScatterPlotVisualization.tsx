import React, {
    FC,
    useEffect,
    useRef,
    useLayoutEffect,
    useState
} from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { ScatterDataPoint } from "../../Interfaces/ApplicationState";
import { stateUpdateWrapperUseJSON, scatterYOptions, barChartValuesOptions, ChartSVG, offset } from "../../PresetsProfile"
import { Grid, Dropdown, Menu, Icon, Modal, Form, Button, Message } from "semantic-ui-react";
import ScatterPlotChart from "./ScatterPlot";
import axios from "axios";


interface OwnProps {
    yAxis: string;
    xAxis: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    notation: string;
    hemoglobinDataSet: any;
    w: number;
    // aggregatedOption?: string;
}

export type Props = OwnProps;

const ScatterPlotVisualization: FC<Props> = ({ w, notation, chartId, hemoglobinDataSet, yAxis, xAxis, chartIndex, store }: Props) => {
    const {
        layoutArray,
        filterSelection,
        currentOutputFilterSet,
        //  perCaseSelected,
        dateRange,
        previewMode,
        showZero,
        currentSelectPatientGroup,
        //actualYearRange,

    } = store!;
    const currentOffset = offset.regular;
    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(w === 1 ? 542.28 : 1146.97);
    const [height, setHeight] = useState(0);
    const [data, setData] = useState<ScatterDataPoint[]>([]);
    const [xMin, setXMin] = useState(0);
    const [xMax, setXMax] = useState(0);
    const [yMin, setYMin] = useState(0);

    const [yMax, setYMax] = useState(0);
    const [openNotationModal, setOpenNotationModal] = useState(false)
    const [notationInput, setNotationInput] = useState(notation)
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)
    useLayoutEffect(() => {
        if (svgRef.current) {
            // setWidth(svgRef.current.clientWidth);
            setWidth(w === 1 ? 542.28 : 1146.97)
            setHeight(svgRef.current.clientHeight)
        }
    }, [layoutArray[chartIndex]]);

    function fetchChartData() {
        let transfused_dict = {} as any;
        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call);
        axios.get(`http://localhost:8000/api/request_transfused_units?transfusion_type=${xAxis}&date_range=${dateRange}&filter_selection=${filterSelection.toString()}&case_ids=${currentSelectPatientGroup.toString()}`, {
            cancelToken: call.token
        })
            .then(function (response) {
                const transfusedDataResult = response.data
                transfusedDataResult.forEach((element: any) => {
                    transfused_dict[element.case_id] = {
                        transfused: element.transfused_units || 0
                    };
                });
                let tempYMax = 0;
                let tempYMin = Infinity;
                let tempXMin = Infinity;
                let tempXMax = 0;
                if (hemoglobinDataSet) {
                    let cast_data: ScatterDataPoint[] = hemoglobinDataSet.map((ob: any) => {

                        const yValue = yAxis === "PREOP_HEMO" ? +ob.HEMO[0] : +ob.HEMO[1]
                        let xValue
                        if (transfused_dict[ob.CASE_ID]) {
                            xValue = transfused_dict[ob.CASE_ID].transfused;
                        };

                        if ((yValue && showZero && transfused_dict[ob.CASE_ID]) || (!showZero && yValue && xValue > 0)) {
                            if ((xValue > 100 && xAxis === "PRBC_UNITS")) {
                                xValue -= 999
                            }
                            if ((xValue > 100 && xAxis === "PLT_UNITS")) {
                                xValue -= 245
                            }

                            let criteriaMet = true;
                            if (currentOutputFilterSet.length > 0) {
                                for (let selectSet of currentOutputFilterSet) {
                                    if (!selectSet.set_value.includes(ob[selectSet.set_name])) {
                                        criteriaMet = false;
                                    }
                                }
                            }

                            if (criteriaMet) {
                                tempYMin = yValue < tempYMin ? yValue : tempYMin;
                                tempYMax = yValue > tempYMax ? yValue : tempYMax;
                                tempXMin = xValue < tempXMin ? xValue : tempXMin;
                                tempXMax = xValue > tempXMax ? xValue : tempXMax;
                                let new_ob: ScatterDataPoint = {
                                    xVal: xValue,
                                    yVal: yValue,
                                    randomFactor: Math.random(),
                                    case: {
                                        visitNum: ob.VISIT_ID,
                                        caseId: ob.CASE_ID,
                                        YEAR: ob.YEAR,
                                        ANESTHOLOGIST_ID: ob.ANESTHOLOGIST_ID,
                                        SURGEON_ID: ob.SURGEON_ID,
                                        patientID: ob.PATIENT_ID,
                                        DATE: ob.DATE
                                    }
                                };
                                //if (new_ob.startXVal > 0 && new_ob.endXVal > 0) {
                                return new_ob;
                                //}
                            }
                        }
                    });

                    cast_data = cast_data.filter((d: any) => d)

                    //    actions.updateCaseCount("INDIVIDUAL", cast_data.length)
                    //console.log(aggregatedOption)
                    stateUpdateWrapperUseJSON(data, cast_data, setData);
                    setXMax(tempXMax);
                    setXMin(tempXMin);
                    setYMax(tempYMax);
                    setYMin(tempYMin);
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

    //TODO reorganize this, seperate out data request and the randomization process. 

    useEffect(() => {
        if (previousCancelToken) {
            previousCancelToken.cancel("cancel the call?")
        }
        fetchChartData();
    }, [dateRange, filterSelection, hemoglobinDataSet, showZero, yAxis, xAxis, currentOutputFilterSet, currentSelectPatientGroup]);

    const changeYAxis = (e: any, value: any) => {
        actions.changeChart(xAxis, value.value, chartId, "SCATTER")
    }
    const changeXAxis = (e: any, value: any) => {
        actions.changeChart(value.value, yAxis, chartId, "SCATTER")
    }

    return (

        <Grid style={{ height: "100%" }}>
            <Grid.Row >
                <Grid.Column verticalAlign="middle" width={1} style={{ display: previewMode ? "none" : null }}>
                    <Menu icon vertical compact size="mini" borderless secondary widths={2}>

                        <Menu.Item header>
                            <Dropdown selectOnBlur={false} pointing basic item icon="settings" compact >
                                <Dropdown.Menu>
                                    <Dropdown text="Change X-Axis" pointing basic item compact options={barChartValuesOptions} onChange={changeXAxis} />
                                    <Dropdown text="Change Y-Axis" pointing basic item compact options={scatterYOptions} onChange={changeYAxis} />


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
                <Grid.Column width={15}  >
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
                        <ScatterPlotChart
                            svg={svgRef}
                            yAxisName={yAxis}
                            xAxisName={xAxis}
                            data={data}
                            width={width}
                            height={height}
                            xMax={xMax}
                            xMin={xMin}
                            yMax={yMax}
                            yMin={yMin}

                        />
                    </ChartSVG>

                    <Message hidden={notation.length === 0} >{notation}</Message>

                </Grid.Column>
            </Grid.Row>
        </Grid>)
}

export default inject("store")(observer(ScatterPlotVisualization));
