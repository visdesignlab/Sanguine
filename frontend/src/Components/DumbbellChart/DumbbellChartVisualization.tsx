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
import { Grid } from "semantic-ui-react";

interface OwnProps{
    yAxis: string;
    chartId: string;
    store?: Store;
  chartIndex: number;
  aggregatedOption?: string;
}

export type Props = OwnProps;

const DumbbellChartVisualization: FC<Props> = ({ yAxis, aggregatedOption, chartId, store,chartIndex }: Props) => {

  const {
    layoutArray,
    filterSelection,
    actualYearRange,
    hemoglobinDataSet
    } = store!;

  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{ result: DumbbellDataPoint[] }>({ result: [] });
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
  }, [layoutArray[chartIndex]]);



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
      // const hemoRes = await fetch(`http://localhost:8000/api/hemoglobin`);
      // const hemoDataResult = await hemoRes.json();
     // const hemo_data = hemoDataResult.result;
      let tempYMax = 0;
      let tempXMin = Infinity;
      let tempXMax = 0;
      if (hemoglobinDataSet) {
            //TODO:
            //How to solve the total case viewing potential discrepency?
            
        let cast_data: DumbbellDataPoint[] = hemoglobinDataSet.map((ob: any) => {
                const begin_x = +ob.HEMO[0];
                const end_x = +ob.HEMO[1];
                let yAxisLabel_val;
                
                if (transfused_dict[ob.CASE_ID]) {
                  yAxisLabel_val = transfused_dict[ob.CASE_ID].transfused;
                };
              //  console.log(transfused_dict);
                //This filter out anything that has empty value
                if (yAxisLabel_val && begin_x > 0 && end_x > 0) {
                  if (!(yAxisLabel_val > 100 && yAxis === "PRBC_UNITS")) {
                    tempYMax = yAxisLabel_val > tempYMax ? yAxisLabel_val : tempYMax;
                  }
                  tempXMin = begin_x < tempXMin ? begin_x : tempXMin;
                  tempXMin = end_x < tempXMin ? end_x : tempXMin;
                  tempXMax = begin_x > tempXMax ? begin_x : tempXMax;
                  tempXMax = end_x > tempXMax ? end_x : tempXMax;

                  let new_ob: DumbbellDataPoint = {
                    startXVal: begin_x,
                    endXVal: end_x,
                    visitNum: ob.VISIT_ID,
                    yVal: yAxisLabel_val,
                    caseId: ob.CASE_ID,
                    YEAR: ob.YEAR,
                    ANESTHOLOGIST_ID: ob.ANESTHOLOGIST_ID,
                    SURGEON_ID: ob.SURGEON_ID,
                    patientID: ob.PATIENT_ID
                  };
                  //if (new_ob.startXVal > 0 && new_ob.endXVal > 0) {
                      return new_ob;
                  //}
                }
            });
            cast_data = cast_data.filter((d: any) => d);
            let total_count = cast_data.length;
            //cast_data = cast_data.filter((d: DumbbellDataPoint) => { total_count += 1; return (d.startXVal - d.endXVal) > 0 })
          

          actions.updateCaseCount(total_count)
          //console.log(aggregatedOption)
          if (aggregatedOption) {
            let counter = {} as { [key: number]: any }
            cast_data.map((datapoint: DumbbellDataPoint) => {
              
              if (!counter[datapoint[aggregatedOption]]) {
                counter[datapoint[aggregatedOption]] = { numerator: 1, startXVal: datapoint.startXVal, endXVal:datapoint.endXVal,yVal:datapoint.yVal}
              }
              else {
               // const current = counter[datapoint[aggregatedOption]];
                counter[datapoint[aggregatedOption]].startXVal += datapoint.startXVal
                counter[datapoint[aggregatedOption]].endXVal += datapoint.endXVal
                counter[datapoint[aggregatedOption]].yVal += datapoint.yVal
                counter[datapoint[aggregatedOption]].numerator +=1
              }
            })
            cast_data = []
            console.log(counter)
            for (let key of Object.keys(counter)) {
              const keynum = parseInt(key)
              //console.log(counter[keynum])
              let new_ob: DumbbellDataPoint = {
                startXVal: counter[keynum].startXVal / counter[keynum].numerator,
                endXVal: counter[keynum].endXVal / counter[keynum].numerator,
                visitNum: -1,
                yVal: counter[keynum].yVal / counter[keynum].numerator,
                caseId: -1,
                YEAR: aggregatedOption==="YEAR"?keynum:-1,
                ANESTHOLOGIST_ID: aggregatedOption === "ANESTHOLOGIST_ID" ? keynum : -1,
                SURGEON_ID: aggregatedOption === "SURGEON_ID" ? keynum : -1,
                patientID: -1
              };
              cast_data.push(new_ob)
            };

          }

            setData({ result: cast_data });
            setYMax(tempYMax);
            setXRange({ xMin: tempXMin, xMax: tempXMax });
            
        }
    }

    useEffect(() => {
        fetchChartData();
    }, [actualYearRange, filterSelection, hemoglobinDataSet]);

    
    
  return (
    <Grid style={{ height: "100%" }}>
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
        <DumbbellChart
          svg={svgRef}
          yAxisName={yAxis}
          data={data.result}
          dimension={dimension}
          xRange={xRange}
          yMax={yMax}
          aggregation={aggregatedOption}
        />
        </SVG>
      </Grid.Column>
    </Grid>
    );}


export default inject("store")(observer(DumbbellChartVisualization));

const SVG = styled.svg`
  height: 100%;
  width: 100%;
`;