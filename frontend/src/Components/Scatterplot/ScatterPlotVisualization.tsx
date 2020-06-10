import React, {
    FC,
    useEffect,
    useRef,
    useLayoutEffect,
    useState
} from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { ScatterDataPoint, stateUpdateWrapperUseJSON, scatterYOptions, barChartValuesOptions, ChartSVG } from "../../Interfaces/ApplicationState";
import { Grid, Dropdown, Menu, Icon, Modal, Form, Button, Message } from "semantic-ui-react";
import ScatterPlotChart from "./ScatterPlot";

interface OwnProps {
    yAxis: string;
    xAxis: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    notation: string;
    hemoglobinDataSet: any;
    // aggregatedOption?: string;
}

export type Props = OwnProps;

const ScatterPlotVisualization: FC<Props> = ({ notation, chartId, hemoglobinDataSet, yAxis, xAxis, chartIndex, store }: Props) => {
    const {
        layoutArray,
        filterSelection,
        //  perCaseSelected,
        dateRange,
        showZero
        //actualYearRange,

    } = store!;
    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [data, setData] = useState<ScatterDataPoint[]>([]);
    const [xMin, setXMin] = useState(0);
    const [xMax, setXMax] = useState(0);
    const [yMin, setYMin] = useState(0);
    const [yMax, setYMax] = useState(0);
    const [openNotationModal, setOpenNotationModal] = useState(false)
    const [notationInput, setNotationInput] = useState(notation)

    useLayoutEffect(() => {
        if (svgRef.current) {
            setWidth(svgRef.current.clientWidth);
            setHeight(svgRef.current.clientHeight)
        }
    }, [layoutArray[chartIndex]]);

    async function fetchChartData() {
        let transfused_dict = {} as any;
        const transfusedRes = await fetch(
            `http://localhost:8000/api/request_transfused_units?transfusion_type=${xAxis}&date_range=${dateRange}&filter_selection=${filterSelection.toString()}`
        );
        const transfusedDataResult = await transfusedRes.json();
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
                // const begin_x = +ob.HEMO[0];
                // const end_x = +ob.HEMO[1];
                const yValue = yAxis === "PREOP_HEMO" ? +ob.HEMO[0] : +ob.HEMO[1]
                let xValue

                if (transfused_dict[ob.CASE_ID]) {
                    xValue = transfused_dict[ob.CASE_ID].transfused;
                };
                //  console.log(transfused_dict);
                //This filter out anything that has empty value
                if ((yValue && showZero && transfused_dict[ob.CASE_ID]) || (!showZero && yValue && xValue > 0)) {
                    if (!(xValue > 100 && xAxis === "PRBC_UNITS")) {
                        tempXMin = xValue < tempXMin ? xValue : tempXMin;
                        tempXMax = xValue > tempXMax ? xValue : tempXMax;
                    }
                    tempYMin = yValue < tempYMin ? yValue : tempYMin;
                    // tempXMin = end_x < tempXMin ? end_x : tempXMin;
                    // tempXMax = begin_x > tempXMax ? begin_x : tempXMax;
                    tempYMax = yValue > tempYMax ? yValue : tempYMax;

                    let new_ob: ScatterDataPoint = {
                        xVal: xValue,
                        yVal: yValue,
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
            });
            cast_data = cast_data.filter((d: any) => d);
            //let total_count = cast_data.length;
            //cast_data = cast_data.filter((d: DumbbellDataPoint) => { total_count += 1; return (d.startXVal - d.endXVal) > 0 })

            //
            actions.updateCaseCount("INDIVIDUAL", cast_data.length)
            //console.log(aggregatedOption)
            stateUpdateWrapperUseJSON(data, cast_data, setData);
            setXMax(tempXMax);
            setXMin(tempXMin);
            setYMax(tempYMax);
            setYMin(tempYMin)
            // setYRange({ yMin: tempYMin, yMax: tempYMax });
            // setXRange({ xMin: tempXMin, xMax: tempXMax });

        }
    }

    useEffect(() => {
        fetchChartData();
    }, [dateRange, filterSelection, showZero, hemoglobinDataSet, yAxis, xAxis]);

    const changeYAxis = (e: any, value: any) => {

        actions.changeChart(xAxis, value.value, chartId, "SCATTER")
    }
    const changeXAxis = (e: any, value: any) => {
        actions.changeChart(value.value, yAxis, chartId, "SCATTER")
    }

    return (

        <Grid style={{ height: "100%" }}>
            <Grid.Row >
                <Grid.Column verticalAlign="middle" width={1}>
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

                    <Message hidden={notation.length === 0} color="green">{notation}</Message>

                </Grid.Column>
            </Grid.Row>
        </Grid>)
}

export default inject("store")(observer(ScatterPlotVisualization));
