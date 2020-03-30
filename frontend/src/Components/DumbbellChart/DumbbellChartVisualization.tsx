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
import { DumbbellDataPoint, SelectSet, BloodProductCap } from "../../Interfaces/ApplicationState"
import DumbbellChart from "./DumbbellChart"
import { Grid, Menu, Dropdown, Button } from "semantic-ui-react";
import { preop_color, postop_color, basic_gray } from "../../ColorProfile";

interface OwnProps {
  yAxis: string;
  chartId: string;
  store?: Store;
  chartIndex: number;
  //  aggregatedOption?: string;
}

export type Props = OwnProps;

const DumbbellChartVisualization: FC<Props> = ({ yAxis, chartId, store, chartIndex }: Props) => {

  const {
    layoutArray,
    filterSelection,
    actualYearRange,
    hemoglobinDataSet
  } = store!;

  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{ result: DumbbellDataPoint[] }>({ result: [] });
  const [dimension, setDimensions] = useState({ width: 0, height: 0 });
  // const [yMax, setYMax] = useState(0);
  const [xRange, setXRange] = useState({ xMin: 0, xMax: Infinity });
  const [sortMode, setSortMode] = useState("Postop");

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
    let requestingAxis = yAxis
    if (!BloodProductCap[yAxis]) {
      requestingAxis = "FFP_UNITS"
    }
    const transfusedRes = await fetch(
      `http://localhost:8000/api/request_transfused_units?transfusion_type=${requestingAxis}&year_range=${actualYearRange}&filter_selection=${filterSelection.toString()}`
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
    //let tempYMax = 0;
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
          yAxisLabel_val = BloodProductCap[yAxis] ? transfused_dict[ob.CASE_ID].transfused : ob[yAxis];
        };
        //  console.log(transfused_dict);
        //This filter out anything that has empty value
        if (yAxisLabel_val && begin_x > 0 && end_x > 0) {
          // if (!(yAxisLabel_val > 100 && yAxis === "PRBC_UNITS")) {
          //   tempYMax = yAxisLabel_val > tempYMax ? yAxisLabel_val : tempYMax;
          // }
          tempXMin = begin_x < tempXMin ? begin_x : tempXMin;
          tempXMin = end_x < tempXMin ? end_x : tempXMin;
          tempXMax = begin_x > tempXMax ? begin_x : tempXMax;
          tempXMax = end_x > tempXMax ? end_x : tempXMax;

          let new_ob: DumbbellDataPoint = {
            case: {
              visitNum: ob.VISIT_ID,
              caseId: ob.CASE_ID,
              YEAR: ob.YEAR,

              ANESTHOLOGIST_ID: ob.ANESTHOLOGIST_ID,
              SURGEON_ID: ob.SURGEON_ID,
              patientID: ob.PATIENT_ID
            },
            startXVal: begin_x,
            endXVal: end_x,

            yVal: yAxisLabel_val,

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
      // if (aggregatedOption) {
      //   let counter = {} as { [key: number]: any }
      //   cast_data.map((datapoint: DumbbellDataPoint) => {

      //     if (!counter[datapoint.case[aggregatedOption]]) {
      //       counter[datapoint.case[aggregatedOption]] = { numerator: 1, startXVal: datapoint.startXVal, endXVal: datapoint.endXVal, yVal: datapoint.yVal }
      //     }
      //     else {
      //       // const current = counter[datapoint[aggregatedOption]];
      //       counter[datapoint.case[aggregatedOption]].startXVal += datapoint.startXVal
      //       counter[datapoint.case[aggregatedOption]].endXVal += datapoint.endXVal
      //       counter[datapoint.case[aggregatedOption]].yVal += datapoint.yVal
      //       counter[datapoint.case[aggregatedOption]].numerator += 1
      //     }
      //   })
      //   cast_data = []
      //   console.log(counter)
      //   for (let key of Object.keys(counter)) {
      //     const keynum = parseInt(key)
      //     //console.log(counter[keynum])
      //     let new_ob: DumbbellDataPoint = {
      //       startXVal: counter[keynum].startXVal / counter[keynum].numerator,
      //       endXVal: counter[keynum].endXVal / counter[keynum].numerator,
      //       case: {
      //         visitNum: -1, caseId: -1,
      //         YEAR: aggregatedOption === "YEAR" ? keynum : -1,
      //         ANESTHOLOGIST_ID: aggregatedOption === "ANESTHOLOGIST_ID" ? keynum : -1,
      //         SURGEON_ID: aggregatedOption === "SURGEON_ID" ? keynum : -1,
      //         patientID: -1
      //       },
      //       yVal: counter[keynum].yVal / counter[keynum].numerator,

      //     };
      //     cast_data.push(new_ob)
      //   };

      // }

      setData({ result: cast_data });
      // setYMax(tempYMax);
      setXRange({ xMin: tempXMin, xMax: tempXMax });

    }
  }

  useEffect(() => {
    fetchChartData();
  }, [actualYearRange, filterSelection, hemoglobinDataSet]);



  return (
    <Grid style={{ height: "100%" }}>
      <Grid.Row>
        <Grid.Column verticalAlign="middle" width={2}>
          {/* <Menu icon vertical compact size="mini" borderless secondary widths={2}>
            <Menu.Item fitted>
              <Dropdown basic item icon="ellipsis horizontal" compact>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => { setSortMode("Gap") }}>
                    Gap Sort
                </Dropdown.Item>
                  <Dropdown.Item onClick={() => { setSortMode("Preop") }}>
                    Preop Sort
                </Dropdown.Item><Dropdown.Item onClick={() => { setSortMode("Postop") }}>
                    Postop Sort
                </Dropdown.Item>

                </Dropdown.Menu>
              </Dropdown>
            </Menu.Item >
          </Menu> */}
          <Button.Group vertical size="mini">
            <PreopButton basic onClick={() => { setSortMode("Preop") }}>Preop</PreopButton>
            <PostopButton basic onClick={() => { setSortMode("Postop") }}>Postop</PostopButton>
            <GapButton basic onClick={() => { setSortMode("Gap") }}>Gap</GapButton>
          </Button.Group>
        </Grid.Column>
        <Grid.Column width={14}  >
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
              // yMax={yMax}
              // aggregation={aggregatedOption}
              sortMode={sortMode}
            />
          </SVG>
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
}


export default inject("store")(observer(DumbbellChartVisualization));

const SVG = styled.svg`
  height: 100%;
  width: 100%;
`;

const PostopButton = styled(Button)`
  &&&&&{color: ${postop_color}!important;
        box-shadow: 0 0 0 1px ${postop_color} inset!important;}
`

const PreopButton = styled(Button)`
 &&&&&{color: ${preop_color}!important;
        box-shadow: 0 0 0 1px ${preop_color} inset!important;}
`

const GapButton = styled(Button)`
 &&&&&{color: ${basic_gray}!important;
        box-shadow: 0 0 0 1px ${basic_gray} inset!important;}
`