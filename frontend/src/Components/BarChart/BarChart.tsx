import React, {
  FC,
  useMemo,
  useEffect
} from "react";
import { actions } from "../..";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import {
  select,
  scaleLinear,
  scaleBand,
  max,
  axisLeft,
  axisTop,
  interpolateBlues,
  axisBottom,
  interpolateGreys,
  line,
  curveCardinal
} from "d3";
import {
  BarChartDataPoint,
  offset,
  AxisLabelDict
} from "../../Interfaces/ApplicationState";
import { Popup, Button, Icon } from 'semantic-ui-react'

interface OwnProps {
  aggregatedBy: string;
  valueToVisualize: string;
  // chartId: string;
  store?: Store;
  dimension: { width: number, height: number }
  data: BarChartDataPoint[];
  svg: React.RefObject<SVGSVGElement>;
  yMax: number;
  selectedVal: number | null;
  stripPlotMode:boolean;
}

export type Props = OwnProps;

const BarChart: FC<Props> = ({ stripPlotMode,store, aggregatedBy, valueToVisualize, dimension, data, svg, yMax, selectedVal}: Props) => {

  const svgSelection = select(svg.current);

  const {
   // perCaseSelected,
    currentSelectSet
  } = store!;

  useEffect(()=>{
    console.log(stripPlotMode);
  },[stripPlotMode])


  
  const [aggregationScale, valueScale, caseScale,lineFunction] = useMemo(() => {
    
    const caseMax = max(data.map(d => d.caseCount)) || 0;
    const caseScale = scaleLinear().domain([0, caseMax]).range([0.25, 0.8])
    let kdeMax = 0
    const xVals = data
      .map(function (dp) {
        const max_temp = max(dp.kdeCal, d => d.y)
        kdeMax = kdeMax > max_temp ? kdeMax : max_temp;
        return dp.aggregateAttribute;
      })
      .sort();
    
    let valueScale = scaleLinear()
      .domain([0, 1.1 * yMax])
      .range([offset.left, dimension.width - offset.right - offset.margin]);
    let aggregationScale = scaleBand()
      .domain(xVals)
      .range([dimension.height - offset.bottom, offset.top])
      .paddingInner(0.1);
    
    const kdeScale = scaleLinear().domain([0, kdeMax]).range([0.5 * aggregationScale.bandwidth(), 0])
   // const kdeReverseScale = scaleLinear().domain([0,kdeMax]).range([0.5*aggregationScale.bandwidth(),aggregationScale.bandwidth()])
    
    const lineFunction = line()
      .curve(curveCardinal)
      .y((d: any) => kdeScale(d.y))
      .x((d: any) => valueScale(d.x) - offset.left);
      
    // const reverseLineFunction = line()
    //   .curve(curveCardinal)
    //   .y((d: any) => kdeScale(d.y))
    //   .x((d: any) => valueScale(d.x) - offset.left);
    return [aggregationScale, valueScale, caseScale,lineFunction];
  }, [dimension, data, yMax])

  const aggregationLabel = axisLeft(aggregationScale);
  const yAxisLabel = axisBottom(valueScale);

  svgSelection
    .select(".axes")
    .select(".x-axis")
    .attr(
      "transform",
      `translate(${offset.left}, 0)`
    )
    .call(aggregationLabel as any)
    .selectAll("text")
    .attr("transform", `translate(-35,0)`)

  svgSelection
    .select(".axes")
    .select(".y-axis")
    .attr(
      "transform",
      `translate(0 ,${dimension.height - offset.bottom})`
    )
    .call(yAxisLabel as any);

  svgSelection
    .select(".axes")
    .select(".x-label")
    .attr("x", valueScale(yMax*0.5)+offset.left)
    .attr("y", dimension.height - offset.bottom + 20)
    .attr("alignment-baseline", "hanging")
    .attr("font-size", "11px")
    .attr("text-anchor", "middle")
    //.attr("transform", "rotate(90)")
    .text(() => {
      //const trailing = perCaseSelected ? " / Case" : "";
      return AxisLabelDict[valueToVisualize] ? AxisLabelDict[valueToVisualize]  : valueToVisualize 
    }
    );

  svgSelection
    .select(".axes")
    .select(".y-label")
    .attr("y", dimension.height - offset.bottom + 20)
    .attr("x", offset.left)
    .attr("font-size", "11px")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "hanging")
    // .attr("transform", "rotate(-90)")
    .text(
      AxisLabelDict[aggregatedBy] ? AxisLabelDict[aggregatedBy] : aggregatedBy
    );

  const decideIfSelected = (d: BarChartDataPoint) => {
    if (selectedVal) {
      return selectedVal === d.aggregateAttribute
    }
    else if (currentSelectSet) {
      return (
        currentSelectSet.set_name === aggregatedBy &&
        currentSelectSet.set_value === d.aggregateAttribute
      );
    }
    else {
      return false;
    }
  }
  return (
    <>
      <line x1={1} x2={1} y1={offset.top} y2={dimension.height - offset.bottom} style={{ stroke: "#e5e5e5", strokeWidth: "1" }} />
      <g className="axes">
        <g className="x-axis"></g>
        <g className="y-axis"></g>
        <text className="x-label" style={{ textAnchor: "end" }} />
        <text className="y-label" style={{ textAnchor: "end" }} />
      </g>
      <g className="chart"
        transform={`translate(${offset.left},0)`}
      >
        {data.map((dataPoint) => {
          return [
            <rect
              fill={interpolateGreys(caseScale(dataPoint.caseCount))}
              x={-40}
              y={aggregationScale(dataPoint.aggregateAttribute)}
              width={35}
              height={aggregationScale.bandwidth()}
            />,
            <text
              fill="white"
              x={-22.5}
              y={
                aggregationScale(dataPoint.aggregateAttribute)! +
                0.5 * aggregationScale.bandwidth()
              }
              alignmentBaseline={"central"}
              textAnchor={"middle"}
            >
              {dataPoint.caseCount}
            </text>,

            <Popup
              content={dataPoint.totalVal}
              key={dataPoint.aggregateAttribute}
              trigger={
                // <Bar
                //   x={0}
                //   y={aggregationScale(dataPoint.aggregateAttribute)}
                //   //CHANGE TODO
                //   width={ - offset.left}
                //   height={aggregationScale.bandwidth()}
                //   onClick={() => {
                //     actions.selectSet({
                //       set_name: aggregatedBy,
                //       set_value: dataPoint.aggregateAttribute
                //     });
                //   }}
                //   isselected={decideIfSelected(dataPoint)}
                // />

                <ViolinLine
                  d={lineFunction(dataPoint.kdeCal)!}
                  onClick={() => {
                    actions.selectSet({
                      set_name: aggregatedBy,
                      set_value: dataPoint.aggregateAttribute
                    });
                  }}
                  isselected={decideIfSelected(dataPoint)}
                  transform={`translate(0,${aggregationScale(
                    dataPoint.aggregateAttribute
                  )})`}
                />
              }
            />,
            <line
              x1={valueScale(dataPoint.median) - offset.left}
              x2={valueScale(dataPoint.median) - offset.left}
              y1={aggregationScale(dataPoint.aggregateAttribute)}
              y2={
                aggregationScale(dataPoint.aggregateAttribute)! +
                aggregationScale.bandwidth()
              }
              stroke="#d98532"
              strokeWidth="2px"
            />
          ];
        })}
      </g>


    </>
  );
}
export default inject("store")(observer(BarChart));

interface ViolinLineProp {
  isselected: boolean;
}
const ViolinLine = styled(`path`)<ViolinLineProp>`
  fill: ${props => (props.isselected ? "#d98532" : "#404040")};
  stroke: ${props => (props.isselected ? "#d98532" : "#404040")};
`;

