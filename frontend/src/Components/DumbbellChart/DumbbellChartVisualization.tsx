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
import { DumbbellDataPoint, SelectSet } from "../../Interfaces/ApplicationState"
import DumbbellChart from "./DumbbellChart"

interface OwnProps{
    yAxis: string;
    chartId: string;
    store?: Store;
     chartIndex:number
}

export type Props = OwnProps;

const DumbbellChartVisualization: FC<Props> = ({ yAxis, chartId, store,chartIndex }: Props) => {

  const {
    layoutArray,
    filterSelection,
    actualYearRange
    } = store!;

    const svgRef = useRef<SVGSVGElement>(null);
    const [data, setData] = useState({ result: [] });
    const [dimension, setDimensions] = useState({ width: 0, height: 0 });
    const [yMax, setYMax] = useState(0);
  const [xRange, setXRange] = useState({ xMin: 0, xMax: Infinity });

    useLayoutEffect(() => {
        if (svgRef.current) {
        setDimensions({
            height: svgRef.current.clientHeight,
            width: svgRef.current.clientWidth
        });
        }
    }, [layoutArray[ chartIndex]]);



    async function fetchChartData() {
      let transfused_dict = {} as any;
      const transfusedRes = await fetch(
        `http://localhost:8000/api/request_transfuse_or_attribute?variable=${yAxis}&year_range=${actualYearRange}&filter_selection=${filterSelection.toString()}`
      );
      const transfusedDataResult = await transfusedRes.json();
      const temp_transfusion_data = transfusedDataResult.result;
      temp_transfusion_data.forEach((element: any) => {
        transfused_dict[element.case_id] = {
          transfused: element.value
        };
      });
      const hemoRes = await fetch(`http://localhost:8000/api/hemoglobin`);
      const hemoDataResult = await hemoRes.json();
      const hemo_data = hemoDataResult.result;
      let tempYMax = 0;
      let tempXMin = Infinity;
      let tempXMax = 0;
    //  console.log(hemo_data);
        if (hemo_data) {
            //TODO:
            //How to solve the total case viewing potential discrepency?
            
            let cast_data = hemo_data.map((ob: any) => {
                const begin_x = +ob.hemo[0];
                const end_x = +ob.hemo[1];
                let yAxisLabel_val;
                
                if (transfused_dict[ob.case_id]) {
                    yAxisLabel_val = transfused_dict[ob.case_id].transfused;
                    };
              //  console.log(transfused_dict);
                //This filter out anything that has empty value
                if (yAxisLabel_val) {
                    if (!(yAxisLabel_val > 100 && yAxis==="PRBC_UNITS")) {
                        tempYMax = yAxisLabel_val > tempYMax ? yAxisLabel_val : tempYMax;
                        
                    }
                    
                    tempXMin = begin_x < tempXMin ? begin_x : tempXMin;
                    tempXMin = end_x < tempXMin ? end_x : tempXMin;
                    tempXMax = begin_x > tempXMax ? begin_x : tempXMax;
                    tempXMax = end_x > tempXMax ? end_x : tempXMax;

                    let new_ob: DumbbellDataPoint = {
                    startXVal: begin_x,
                    endXVal: end_x,
                    visitNum: ob.visit_id,
                    yVal: yAxisLabel_val,
                    caseId: ob.case_id,
                    YEAR: ob.year,
                    ANESTHOLOGIST_ID: ob.anesth_id,
                    SURGEON_ID: ob.surgeon_id,
                    patientID: ob.patient_id
                    };
                    return new_ob;
                }
            });
            cast_data = cast_data.filter((d: any) => d);
            let total_count = 0;
            cast_data = cast_data.filter((d: DumbbellDataPoint) => { total_count += 1; return (d.startXVal - d.endXVal) > 0 })
           // console.log(cast_data)
            actions.updateCaseCount(total_count)
            setData({ result: cast_data });
            setYMax(tempYMax);
            setXRange({ xMin: tempXMin, xMax: tempXMax });
            
        }
    }

    useEffect(() => {
        fetchChartData();
    }, [actualYearRange,filterSelection]);

    
    
    return (
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
        <DumbbellChart
          svg={svgRef}
          yAxisName={yAxis}
          data={data.result}
          dimension={dimension}
          xRange={xRange}
          yMax={yMax}
        />
      </SVG>
    );}


export default inject("store")(observer(DumbbellChartVisualization));

const SVG = styled.svg`
  height: 100%;
  width: 100%;
`;