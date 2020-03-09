import React, { FC, useEffect, useRef, useLayoutEffect, useState, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { BarChartDataPoint } from '../../Interfaces/ApplicationState'
import BarChart from "./BarChart"
import { Button, Icon, Table, Grid, Dropdown } from "semantic-ui-react";
import { create as createpd } from "pdfast";
import { sum } from "d3";

interface OwnProps {
  aggregatedBy: string;
  valueToVisualize: string;
  chartId: string;
  store?: Store;
  chartIndex: number;
  extraPair?:string[]
}

export type Props = OwnProps;

const BarChartVisualization: FC<Props> = ({ aggregatedBy, valueToVisualize, chartId, store, chartIndex,extraPair }: Props) => {
  const { layoutArray, filterSelection, perCaseSelected, currentSelectPatient, actualYearRange,hemoglobinDataSet } = store!
  const svgRef = useRef<SVGSVGElement>(null);
 // const [data, setData] = useState<{ original: BarChartDataPoint[]; perCase: BarChartDataPoint[]; }>({ original: [], perCase: [] });
   const [data, setData] = useState<{
     original: BarChartDataPoint[]
   }>({ original: []});
 
  const [yMax, setYMax] = useState({ original: 0, perCase: 0 });
  const [selectedBar, setSelectedBarVal] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ height: 0, width: 0 });
  const [extraPairData, setExtraPairData] = useState({})



  useLayoutEffect(() => {
    if (svgRef.current) {
      setDimensions({
        height: svgRef.current.clientHeight,
        width: svgRef.current.clientWidth
      });
    }
  }, [layoutArray[chartIndex]]);

  useEffect(() => {
    if (currentSelectPatient) {
      setSelectedBarVal(currentSelectPatient[aggregatedBy])
    }
    else {
      setSelectedBarVal(null);
    }
  }, [currentSelectPatient])

  async function fetchChartData() {
    const res = await fetch(
      `http://localhost:8000/api/summarize_with_year?aggregatedBy=${aggregatedBy}&valueToVisualize=${valueToVisualize}&year_range=${actualYearRange}&filter_selection=${filterSelection.toString()}`
    );
    const dataResult = await res.json();
    let caseCount = 0;
    if (dataResult) {
      console.log(dataResult)
      let yMaxTemp = -1;
      let perCaseYMaxTemp = -1
     // let perCaseData: BarChartDataPoint[] = [];
      let cast_data = (dataResult.result as any).map(function (ob: any) {
        // if (ob.y_axis > 1000 && valueToVisualize === "PRBC_UNITS") {
        console.log(ob)
        //This creates something like this :
        /**
         * [ { x: 0, y: 0.020833333333333332 },
  { x: 0.9090909090909091, y: 0.0625 },
  { x: 1.8181818181818181, y: 0.10416666666666667 },
  { x: 2.727272727272727, y: 0.125 },
  { x: 3.6363636363636362, y: 0.14583333333333334 },
  { x: 4.545454545454545, y: 0.16666666666666666 },
  { x: 5.454545454545454, y: 0.10416666666666667 },
  { x: 6.363636363636363, y: 0.041666666666666664 },
  { x: 7.2727272727272725, y: 0.08333333333333333 },
  { x: 8.181818181818182, y: 0.10416666666666667 },
  { x: 9.09090909090909, y: 0.041666666666666664 },
  { x: 10, y: 0 } ]
         */
        
        const case_num = ob.valueToVisualize.length;
        const aggregateByAttr = ob.aggregatedBy;
        const total_val = sum(ob.valueToVisualize);
        const pd = createpd(ob.valueToVisualize, { min: 0 });
        
        // console.log(pd)
        //   ob.y_axis -= 999
        // }
        // caseCount += ob.case_count;
        // // let y_val = perCaseSelected
        // //   ? ob.y_axis / ob.case_count
        // //   : ob.y_axis;
        // const y_val = ob.y_axis;
        // const perCaseYVal = ob.y_axis / ob.case_count
        // yMaxTemp = y_val > yMaxTemp ? y_val : yMaxTemp;
        // perCaseYMaxTemp = perCaseYVal > perCaseYMaxTemp ? perCaseYVal : perCaseYMaxTemp;
        const new_ob: BarChartDataPoint = {
          caseCount: case_num,
          aggregateAttribute: aggregateByAttr,
          totalVal: total_val,
          kdeCal:pd
        };
        // const perCaseOb: BarChartDataPoint = {
        //   xVal: ob.x_axis,
        //   yVal: y_val / ob.case_count,
        //   caseCount: ob.case_count
        // }
        // perCaseData.push(perCaseOb)
        return new_ob;
      });
      setData({ original: cast_data });
      console.log(cast_data);
      setYMax({ original: yMaxTemp, perCase: perCaseYMaxTemp });
      actions.updateCaseCount(caseCount);
    }
  }

  useEffect(() => {
    fetchChartData();
  }, [filterSelection, actualYearRange]);

  const makeExtraPairData = () => {
    let newExtraPairData = {} as any;
    if(extraPair){extraPair.forEach((variable: string) => {
      if (variable === "Hemoglobin") {
        let newData = {} as any
        data.original.map((dataPoint: BarChartDataPoint) => {
          newData[dataPoint.aggregateAttribute]=[]
        })
        hemoglobinDataSet.map((ob: any) => {
          console.log(ob[aggregatedBy])
          if (newData[ob[aggregatedBy]]) {
            newData[ob[aggregatedBy]].push([ob.hemo[0], ob.hemo[1]])
          }
        });
        newExtraPairData["Hemoglobin"] = newData;
      }
    })}
    setExtraPairData(newExtraPairData)
  }

  useEffect(() => {
    makeExtraPairData();
  }, [layoutArray]);



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
      <Grid.Column verticalAlign="middle">
        {/* <Button
            icon='plus'
            circular
            compact
            size="mini"
            floated='left'
          // attached='left'
          // onClick={actions.removeChart.bind(layout.i)}
          /> */}
        {/* <Icon name="plus" />
          </Button> */}
        <Dropdown simple item icon='plus' compact>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => { actions.changeExtraPair(chartId,"Hemoglobin")}}>Hemoglobin</Dropdown.Item>
            <Dropdown.Item onClick={() => { actions.changeExtraPair(chartId, "Distribution")}}>Distribution</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </Grid.Column>
      <Grid.Column width={15}  >
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
          <BarChart
            dimension={dimensions}
           // data={perCaseSelected ? data.perCase : data.original}
            data={data.original}
            svg={svgRef}
            aggregatedBy={aggregatedBy}
            valueToVisualize={valueToVisualize}
            yMax={perCaseSelected ? yMax.perCase : yMax.original}
            selectedVal={selectedBar}
            extraPairDataSet={extraPairData}
          />
        </SVG>
      </Grid.Column>

    </Grid>
  );
}


export default inject("store")(observer(BarChartVisualization));

const SVG = styled.svg`
  height: 100%;
  width: 100%;
`;