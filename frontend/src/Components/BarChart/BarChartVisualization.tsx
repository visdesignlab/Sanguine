import React, { FC, useEffect, useRef, useLayoutEffect, useState, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { select, selectAll, scaleLinear, scaleBand, mouse, axisBottom, axisLeft } from "d3";
import { SingularDataPoint } from '../../Interfaces/ApplicationState'
import BarChart from "./BarChart"

interface OwnProps{
    xAxis: string;
    yAxis: string;
    chartId: string;
    store?: Store;
}

export type Props = OwnProps;

const BarChartVisualization: FC<Props> = ({ xAxis,yAxis,chartId,store }: Props) => {
    const { layoutArray, filterSelection, perCaseSelected, currentSelectedChart,actualYearRange } = store!
    const svgRef = useRef<SVGSVGElement>(null);
    const [data, setData] = useState({ result: [] });
    const [yMax, setYMax] = useState(0)
    const [dimensions, setDimensions] = useState({ height: 0, width: 0 });

    useLayoutEffect(() => {
      if (svgRef.current) {
        setDimensions({
          height: svgRef.current.clientHeight,
          width: svgRef.current.clientWidth
        });
      }
    }, []);
    
    async function fetchChartData() {
        const res = await fetch(`http://localhost:8000/api/summarize_with_year?x_axis=${xAxis}&y_axis=${yAxis}&year_range=${actualYearRange}&filter_selection=${filterSelection.toString()}`);
        const dataResult = await res.json();
        if (dataResult) {
          let yMaxTemp = -1;
          let cast_data = (dataResult.result as any).map(function (ob: any) {
              
              let y_val = perCaseSelected
                ? ob.y_axis / ob.case_count
                : ob.y_axis;
            yMaxTemp = y_val > yMaxTemp ? y_val : yMaxTemp;

              const new_ob: SingularDataPoint = {
                xVal: ob.x_axis,
                yVal: y_val
              };
              return new_ob;
            });
            setData({result:cast_data});
            setYMax(yMaxTemp);
        }   
    }

    useEffect(() => {
        fetchChartData();
    }, [perCaseSelected,filterSelection,actualYearRange]);

 
    return (
      // <Bars
      // chartId={chartId}
      // data={data.result}
      // yMax={yMax}
      // xAxisName={xAxis}
      // yAxisName={yAxis}
      // />

      <SVG ref={svgRef}>
        <text
          x="0"
          y="0"
          style={{
            fontSize: "10px",
            alignmentBaseline: "hanging"
          }}
        >
          chart # ${chartId}
        </text>
        <BarChart
          dimension={dimensions}
          data={data.result}
          svg={svgRef}
          xAxisName={xAxis}
          yAxisName={yAxis}
          yMax={yMax}
        />
      </SVG>
    );
}
 

export default inject("store")(observer(BarChartVisualization));

const SVG = styled.svg`
  height: 100%;
  width: 100%;
`;