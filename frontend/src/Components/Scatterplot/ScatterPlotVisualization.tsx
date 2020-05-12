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
import { ScatterDataPoint } from "../../Interfaces/ApplicationState";
import { Grid } from "semantic-ui-react";
import ScatterPlotChart from "./ScatterPlotChart";

interface OwnProps {
    yAxis: string;
    xAxis: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    hemoglobinDataSet: any;
    // aggregatedOption?: string;
}

export type Props = OwnProps;

const ScatterPlotVisualization: FC<Props> = ({ hemoglobinDataSet, yAxis, xAxis, chartIndex, store }: Props) => {
    const {
        layoutArray,
        filterSelection,
        //  perCaseSelected,
        dateRange,
        //actualYearRange,

    } = store!;
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimension, setDimensions] = useState({ width: 0, height: 0 });
    const [data, setData] = useState<{ result: ScatterDataPoint[] }>({ result: [] });
    const [yRange, setYRange] = useState({ yMin: 0, yMax: Infinity });
    const [xRange, setXRange] = useState({ xMin: 0, xMax: Infinity });

    useLayoutEffect(() => {
        if (svgRef.current) {
            setDimensions({
                height: svgRef.current.clientHeight,
                width: svgRef.current.clientWidth
            });
        }
    }, [layoutArray[chartIndex]]);

    async function fetchChartData() {
        let transfused_dict = {} as any;
        console.log(xAxis, yAxis)
        const transfusedRes = await fetch(
            `http://localhost:8000/api/request_transfused_units?transfusion_type=${xAxis}&date_range=${dateRange}&filter_selection=${filterSelection.toString()}`
        );
        const transfusedDataResult = await transfusedRes.json();
        const temp_transfusion_data = transfusedDataResult.result;

        temp_transfusion_data.forEach((element: any) => {
            transfused_dict[element.case_id] = {
                transfused: element.transfused
            };
        });
        // const hemoRes = await fetch(`http://localhost:8000/api/hemoglobin`);
        // const hemoDataResult = await hemoRes.json();
        // const hemo_data = hemoDataResult.result;
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
                if (xValue && yValue > 0) {
                    if (!(xValue > 100 && xAxis === "PRBC_UNITS")) {
                        tempXMin = xValue < tempXMin ? xValue : tempXMin;
                        // tempXMin = end_x < tempXMin ? end_x : tempXMin;
                        // tempXMax = begin_x > tempXMax ? begin_x : tempXMax;
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
            //   let total_count = cast_data.length;
            //cast_data = cast_data.filter((d: DumbbellDataPoint) => { total_count += 1; return (d.startXVal - d.endXVal) > 0 })

            //
            // actions.updateCaseCount(total_count)
            //console.log(aggregatedOption)

            setData({ result: cast_data });
            setYRange({ yMin: tempYMin, yMax: tempYMax });
            setXRange({ xMin: tempXMin, xMax: tempXMax });

        }
    }

    useEffect(() => {
        fetchChartData();
    }, [dateRange, filterSelection, hemoglobinDataSet]);

    return (<Grid style={{ height: "100%" }}>
        <Grid.Column width={16}  >
            <SVG ref={svgRef}>
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
                    data={data.result}
                    dimension={dimension}
                    xRange={xRange}
                    yRange={yRange}

                />
            </SVG>
        </Grid.Column>
    </Grid>)
}

export default inject("store")(observer(ScatterPlotVisualization));

const SVG = styled.svg`
  height: 100%;
  width: 100%;
`;