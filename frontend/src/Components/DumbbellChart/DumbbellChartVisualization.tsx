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
import { DumbbellDataPoint, SelectSet, BloodProductCap, dumbbellFacetOptions, barChartValuesOptions } from "../../Interfaces/ApplicationState"
import DumbbellChart from "./DumbbellChart"
import { Grid, Menu, Dropdown, Button } from "semantic-ui-react";
import { preop_color, postop_color, basic_gray, third_gray } from "../../ColorProfile";

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
    //actualYearRange,
    hemoglobinDataSet,
    dateRange,
    showZero,
    currentOutputFilterSet
  } = store!;

  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{ result: DumbbellDataPoint[] }>({ result: [] });
  const [dimension, setDimensions] = useState({ width: 0, height: 0 });
  // const [yMax, setYMax] = useState(0);
  const [xRange, setXRange] = useState({ xMin: 0, xMax: Infinity });
  const [sortMode, setSortMode] = useState("Postop");
  const [showingAttr, setShowingAttr] = useState({ preop: true, postop: true, gap: true })

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
      `http://localhost:8000/api/request_transfused_units?transfusion_type=${requestingAxis}&date_range=${dateRange}&filter_selection=${filterSelection.toString()}`
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
      let existingCaseID = new Set();
      let cast_data: DumbbellDataPoint[] = hemoglobinDataSet.map((ob: any) => {
        const begin_x = +ob.HEMO[0];
        const end_x = +ob.HEMO[1];
        let yAxisLabel_val;

        if (transfused_dict[ob.CASE_ID]) {
          yAxisLabel_val = BloodProductCap[yAxis] ? transfused_dict[ob.CASE_ID].transfused : ob[yAxis];
        };
        if (yAxisLabel_val !== undefined && begin_x > 0 && end_x > 0 && !existingCaseID.has(ob.CASE_ID)) {
          if ((showZero) || (!showZero && yAxisLabel_val > 0)) {
            if ((yAxisLabel_val > 100 && yAxis === "PRBC_UNITS")) {
              yAxisLabel_val -= 999
            }
            if ((yAxisLabel_val > 100 && yAxis === "PLT_UNITS")) {
              yAxisLabel_val -= 245
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
              existingCaseID.add(ob.CASE_ID)
              //if (new_ob.startXVal > 0 && new_ob.endXVal > 0) {
              return new_ob;
            }
          }
          //}
        }
      });
      cast_data = cast_data.filter((d: any) => d);
      setData({ result: cast_data });
      setXRange({ xMin: tempXMin, xMax: tempXMax });

    }
  }

  useEffect(() => {
    fetchChartData();
  }, [dateRange, filterSelection, hemoglobinDataSet, yAxis, showZero, currentOutputFilterSet]);

  const changeXVal = (e: any, value: any) => {
    actions.changeChart(value.value, "HEMO_VALUE", chartId, "DUMBBELL")
  }

  return (
    <Grid style={{ height: "100%" }}>
      <Grid.Row>
        <Grid.Column verticalAlign="middle" width={2}>
          <Menu text compact size="mini" vertical>
            <Menu.Item header>Show</Menu.Item>
            <Menu.Menu>
              <Button.Group vertical size="mini">
                <PreopButton basic={!showingAttr.preop} onClick={() => { setShowingAttr({ preop: !showingAttr.preop, postop: showingAttr.postop, gap: showingAttr.gap }) }} >Preop</PreopButton>
                <PostopButton basic={!showingAttr.postop} onClick={() => { setShowingAttr({ preop: showingAttr.preop, postop: !showingAttr.postop, gap: showingAttr.gap }) }}>Postop</PostopButton>
                <GapButton basic={!showingAttr.gap} onClick={() => { setShowingAttr({ preop: showingAttr.preop, postop: showingAttr.postop, gap: !showingAttr.gap }) }} >Gap</GapButton>
              </Button.Group>
            </Menu.Menu>

            <Menu.Item header>Sort By</Menu.Item>
            <Menu.Menu>
              <Button.Group vertical size="mini">
                <PreopButton basic={sortMode !== "Preop"} onClick={() => { setSortMode("Preop") }}>Preop</PreopButton>
                <PostopButton basic={sortMode !== "Postop"} onClick={() => { setSortMode("Postop") }}>Postop</PostopButton>
                <GapButton basic={sortMode !== "Gap"} onClick={() => { setSortMode("Gap") }}>Gap</GapButton>
              </Button.Group>
            </Menu.Menu>
            <Menu.Item header>
              <Dropdown text="Change Facet" pointing basic item icon="edit" compact options={dumbbellFacetOptions.concat(barChartValuesOptions)} onChange={changeXVal}>
              </Dropdown>
            </Menu.Item>
          </Menu>
          {/* <OptionsP>Show</OptionsP>
          <Button.Group vertical size="mini">
            <PreopButton basic={!showingAttr.preop} onClick={() => { setShowingAttr({ preop: !showingAttr.preop, postop: showingAttr.postop, gap: showingAttr.gap }) }} >Preop</PreopButton>
            <PostopButton basic={!showingAttr.postop} onClick={() => { setShowingAttr({ preop: showingAttr.preop, postop: !showingAttr.postop, gap: showingAttr.gap }) }}>Postop</PostopButton>
            <GapButton basic={!showingAttr.gap} onClick={() => { setShowingAttr({ preop: showingAttr.preop, postop: showingAttr.postop, gap: !showingAttr.gap }) }} >Gap</GapButton>
          </Button.Group>
          <OptionsP>Sort By</OptionsP>
          <Button.Group vertical size="mini">
            <PreopButton basic={sortMode !== "Preop"} onClick={() => { setSortMode("Preop") }}>Preop</PreopButton>
            <PostopButton basic={sortMode !== "Postop"} onClick={() => { setSortMode("Postop") }}>Postop</PostopButton>
            <GapButton basic={sortMode !== "Gap"} onClick={() => { setSortMode("Gap") }}>Gap</GapButton>
          </Button.Group> */}
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
              showingAttr={showingAttr}
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

interface ActiveProps {
  active: boolean;
}

const PostopMenuItem = styled(Menu.Item) <ActiveProps>`
  &&&&&{color: ${props => props.active ? postop_color : third_gray}!important;
        }
`

const PreopMenuItem = styled(Menu.Item) <ActiveProps>`
 &&&&&{color: ${props => props.active ? preop_color : third_gray}!important;}
`

const GapMenuItem = styled(Menu.Item)`
  &&&&&{color: ${props => props.active ? basic_gray : third_gray}!important;}
`
const GapButton = styled(Button)`
  &&&&& {color: ${basic_gray}!important;
box - shadow: 0 0 0 1px ${basic_gray} inset!important;}`


const PostopButton = styled(Button)`
   &&&&& {color: ${postop_color}!important;
box - shadow: 0 0 0 1px ${postop_color} inset!important;}`

const PreopButton = styled(Button)`
  &&&&& { color: ${ preop_color} !important;
box - shadow: 0 0 0 1px ${ preop_color} inset!important;}`


const OptionsP = styled.p`
  margin-top:5px;
  margin-bottom:5px;
  margin-left:1px;
`