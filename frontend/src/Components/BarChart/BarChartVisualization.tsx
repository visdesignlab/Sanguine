import React, { FC, useEffect, useRef, useLayoutEffect, useState, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { BarChartDataPoint } from '../../Interfaces/ApplicationState'
import BarChart from "./BarChart"
import { Button, Icon, Table, Grid, Dropdown } from "semantic-ui-react";
import { create as createpd } from "pdfast";
import { sum,max } from "d3";

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
  // const [kdeMax,setKdeMax] = useState(0)
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
      let yMaxTemp = -1;
      let perCaseYMaxTemp = -1
     // let perCaseData: BarChartDataPoint[] = [];
      let cast_data = (dataResult.result as any).map(function (ob: any) {

        const case_num = ob.valueToVisualize.length;
        const aggregateByAttr = ob.aggregatedBy;
        const total_val = sum(ob.valueToVisualize);
        const maxY = parseFloat(max(ob.valueToVisualize)!);
        yMaxTemp = yMaxTemp < maxY ? maxY : yMaxTemp;
        let pd = createpd(ob.valueToVisualize, { min: 0.00001 });
        pd = [{ x: 0, y: 0 }].concat(pd)
        let reverse_pd = pd.map((pair: any) => {
          return { x:pair.x, y:- pair.y}
        }).reverse()
        pd = pd.concat(reverse_pd)
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
          kdeCal: pd
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
    <Grid style={{ height: "100%" }}>
      <Grid.Column verticalAlign="middle">
        <Dropdown simple item icon="plus" compact>
          <Dropdown.Menu>
            <Dropdown.Item
              onClick={() => {
                actions.changeExtraPair(chartId, "Hemoglobin");
              }}
            >
              Hemoglobin
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => {
                actions.changeExtraPair(chartId, "Per Case Bar");
              }}
            >
              Per Case Bar
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </Grid.Column>
      <Grid.Column width={15}>
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