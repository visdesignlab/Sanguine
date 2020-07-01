import React, { FC, useEffect, useRef, useLayoutEffect, useState } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { BarChartDataPoint } from '../../Interfaces/ApplicationState'
import { BloodProductCap, barChartValuesOptions, barChartAggregationOptions, interventionChartType, extraPairOptions, stateUpdateWrapperUseJSON, ChartSVG } from "../../PresetsProfile"
import BarChart from "./BarChart"
import { Button, Icon, Grid, Dropdown, Menu, Modal, Form, Message } from "semantic-ui-react";
import { create as createpd } from "pdfast";
import { sum, median } from "d3";

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
    filterSelection,
    showZero,
    currentSelectPatientGroup,
    // actualYearRange,
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
  const [extraPairData, setExtraPairData] = useState<{ name: string, data: any[], type: string }[]>([])
  const [stripPlotMode, setStripMode] = useState(false);
  const [caseIDList, setCaseIDList] = useState<any>(null)
  const [extraPairArray, setExtraPairArray] = useState([])
  const [openNotationModal, setOpenNotationModal] = useState(false)
  const [notationInput, setNotationInput] = useState(notation)

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

  // useEffect(() => {
  //   if (currentSelectPatient) {
  //     setSelectedBarVal(currentSelectPatient[aggregatedBy])
  //   }
  //   else {
  //     setSelectedBarVal(null);
  //   }
  // }, [currentSelectPatient])

  async function fetchChartData() {
    const res = await fetch(
      `http://localhost:8000/api/request_transfused_units?aggregated_by=${aggregatedBy}&transfusion_type=${valueToVisualize}&date_range=${dateRange}&filter_selection=${filterSelection.toString()}&case_ids=${currentSelectPatientGroup.toString()}`
    );
    const dataResult = await res.json();
    let caseCount = 0;
    console.log(dataResult)
    if (dataResult) {
      let yMaxTemp = -1;
      let caseDictionary = {} as any;

      //console.log(dataResult)

      let cast_data = (dataResult as any).map(function (ob: any) {
        let zeroCaseNum = 0;
        ob.case_id.map((singleId: any) => {
          caseDictionary[singleId] = true;
        })

        const aggregateByAttr = ob.aggregated_by;

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
          patienIDList: ob.pat_id
        };
        return new_ob;
      });
      stateUpdateWrapperUseJSON(data, cast_data, setData)
      stateUpdateWrapperUseJSON(caseIDList, caseDictionary, setCaseIDList)
      setYMax(yMaxTemp);
      store!.totalAggregatedCaseCount = caseCount;
      console.log(cast_data)
    }
  }

  useEffect(() => {
    fetchChartData();
  }, [filterSelection, dateRange, showZero, aggregatedBy, valueToVisualize, currentSelectPatientGroup]);

  async function makeExtraPairData() {
    let newExtraPairData: any[] = []
    if (extraPairArray.length > 0) {
      extraPairArray.forEach(async (variable: string) => {
        let newData = {} as any;
        let medianData = {} as any;
        let kdeMax = 0;
        switch (variable) {
          case "Total Transfusion":
            data.map((dataPoint: BarChartDataPoint) => {
              newData[dataPoint.aggregateAttribute] = dataPoint.totalVal;
            });
            newExtraPairData.push({ name: "Total", data: newData, type: "BarChart" });
            break;
          case "Per Case":
            data.map((dataPoint: BarChartDataPoint) => {
              newData[dataPoint.aggregateAttribute] = dataPoint.totalVal / dataPoint.caseCount;
            });
            newExtraPairData.push({ name: "Per Case", data: newData, type: "BarChart" });
            break;
          case "Zero Transfusion":
            data.map((dataPoint: BarChartDataPoint) => {
              newData[dataPoint.aggregateAttribute] = { number: dataPoint.zeroCaseNum, percentage: dataPoint.zeroCaseNum / dataPoint.caseCount };
            });
            newExtraPairData.push({ name: "Zero %", data: newData, type: "Basic" });
            break;
          case "RISK":
            data.map(async (dataPoint: BarChartDataPoint) => {
              newData[dataPoint.aggregateAttribute] = dataPoint.patienIDList;
            });
            newExtraPairData.push({ name: "RISK", data: newData, type: "Outcomes" });
            break;

          case "Mortality":
            data.map(async (dataPoint: BarChartDataPoint) => {
              newData[dataPoint.aggregateAttribute] = dataPoint.patienIDList;
            });
            newExtraPairData.push({ name: "Mortality", data: newData, type: "Outcomes" });
            break;
          case "Vent":
            data.map(async (dataPoint: BarChartDataPoint) => {
              newData[dataPoint.aggregateAttribute] = dataPoint.patienIDList;
            });
            newExtraPairData.push({ name: "Vent", data: newData, type: "Outcomes" });
            break;
          case "Preop Hemo":
            data.map((dataPoint: BarChartDataPoint) => {
              newData[dataPoint.aggregateAttribute] = [];
            });
            hemoglobinDataSet.map((ob: any) => {
              const begin = parseFloat(ob.HEMO[0]);
              if (newData[ob[aggregatedBy]] && begin > 0 && caseIDList[ob.CASE_ID]) {
                newData[ob[aggregatedBy]].push(begin);
              }
            });
            for (let prop in newData) {
              medianData[prop] = median(newData[prop]);
              let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
              pd = [{ x: 0, y: 0 }].concat(pd);
              let reverse_pd = pd.map((pair: any) => {
                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                return { x: pair.x, y: -pair.y };
              }).reverse();
              pd = pd.concat(reverse_pd);
              newData[prop] = pd;
            }
            newExtraPairData.push({ name: "Preop Hemo", data: newData, type: "Violin", kdeMax: kdeMax, medianSet: medianData });
            break;
          case "Postop Hemo":
            data.map((dataPoint: BarChartDataPoint) => {
              newData[dataPoint.aggregateAttribute] = [];
            });
            hemoglobinDataSet.map((ob: any) => {

              const end = parseFloat(ob.HEMO[1]);
              if (newData[ob[aggregatedBy]] && end > 0 && caseIDList[ob.CASE_ID]) {
                newData[ob[aggregatedBy]].push(end);
              }
            });
            for (let prop in newData) {
              medianData[prop] = median(newData[prop]);
              let pd = createpd(newData[prop], { width: 2, min: 0, max: 18 });
              pd = [{ x: 0, y: 0 }].concat(pd);
              let reverse_pd = pd.map((pair: any) => {
                kdeMax = pair.y > kdeMax ? pair.y : kdeMax;
                return { x: pair.x, y: -pair.y };
              }).reverse();
              pd = pd.concat(reverse_pd);
              newData[prop] = pd;
            }
            newExtraPairData.push({ name: "Postop Hemo", data: newData, type: "Violin", kdeMax: kdeMax, medianSet: medianData });
            break;
          default:
            break;
        }
      })
    }
    stateUpdateWrapperUseJSON(extraPairData, newExtraPairData, setExtraPairData)

  }

  //TODO change this to useMemo
  useEffect(() => {
    makeExtraPairData();
  }, [extraPairArray, data, hemoglobinDataSet]);



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
                  <Dropdown text="Change Plot Type" pointing basic item compact options={interventionChartType} onChange={changePlotType} />
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

