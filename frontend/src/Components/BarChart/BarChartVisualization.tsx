import React, { FC, useEffect, useRef, useLayoutEffect, useState, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { select, selectAll, scaleLinear, scaleBand, mouse, axisBottom, axisLeft } from "d3";
import { BarChartDataPoint } from '../../Interfaces/ApplicationState'
import BarChart from "./BarChart"

interface OwnProps{
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
  store?: Store;
   chartIndex:number
}

export type Props = OwnProps;

const BarChartVisualization: FC<Props> = ({ aggregatedBy,valueToVisualize,chartId,store,chartIndex }: Props) => {
    const { layoutArray, filterSelection, perCaseSelected, currentSelectPatient,actualYearRange } = store!
    const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{ original: BarChartDataPoint[]; perCase: BarChartDataPoint[]; }>({ original: [],perCase:[] });
  const [yMax, setYMax] = useState({original:0,perCase:0});
  const [selectedBar, setSelectedBarVal] = useState<number|null>(null);
  const [dimensions, setDimensions] = useState({ height: 0, width: 0 });

  

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
  },[currentSelectPatient])
    
    async function fetchChartData() {
      const res = await fetch(`http://localhost:8000/api/summarize_with_year?x_axis=${aggregatedBy}&y_axis=${valueToVisualize}&year_range=${actualYearRange}&filter_selection=${filterSelection.toString()}`);
      const dataResult = await res.json();
      let caseCount = 0;
        if (dataResult) {
          let yMaxTemp = -1;
          let perCaseYMaxTemp = -1
          let perCaseData:BarChartDataPoint[] = [];
          let cast_data = (dataResult.result as any).map(function (ob: any) {
            if (ob.y_axis > 1000 && valueToVisualize === "PRBC_UNITS") {
              ob.y_axis-=999
            }
              caseCount += ob.case_count;
              // let y_val = perCaseSelected
              //   ? ob.y_axis / ob.case_count
              //   : ob.y_axis;
            const y_val = ob.y_axis;
            const perCaseYVal = ob.y_axis / ob.case_count
            yMaxTemp = y_val > yMaxTemp ? y_val : yMaxTemp;
            perCaseYMaxTemp = perCaseYVal > perCaseYMaxTemp ? perCaseYVal : perCaseYMaxTemp;
              const new_ob: BarChartDataPoint = {
                xVal: ob.x_axis,
                yVal: y_val,
                caseCount: ob.case_count
              };
            const perCaseOb: BarChartDataPoint = {
              xVal: ob.x_axis,
              yVal: y_val/ob.case_count,
              caseCount:ob.case_count
            }
            perCaseData.push(perCaseOb)
              return new_ob;
            });
            setData({original:cast_data,perCase:perCaseData});
          setYMax({original:yMaxTemp,perCase:perCaseYMaxTemp});
          actions.updateCaseCount(caseCount);
        }   
    }

    useEffect(() => {
        fetchChartData();
    }, [filterSelection, actualYearRange]);


 
    //  return true;
  

 
    return (
      // <Bars
      // chartId={chartId}
      // data={data.result}
      // yMax={yMax}
      // aggregatedByName={aggregatedBy}
      // valueToVisualizeName={valueToVisualize}
      // />

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
          data={perCaseSelected?data.perCase:data.original}
          svg={svgRef}
          aggregatedBy={aggregatedBy}
          valueToVisualize={valueToVisualize}
          yMax={perCaseSelected?yMax.perCase:yMax.original}
          selectedVal={selectedBar}
        />
      </SVG>
    );
}
 

export default inject("store")(observer(BarChartVisualization));

const SVG = styled.svg`
  height: 100%;
  width: 100%;
`;