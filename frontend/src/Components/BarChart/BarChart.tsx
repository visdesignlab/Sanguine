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
  extraPairWidth,
  extraPairPadding,
  AxisLabelDict
} from "../../Interfaces/ApplicationState";
import { Popup, Button, Icon } from 'semantic-ui-react'
import SingleViolinPlot from "./SingleViolinPlot";
import SingleStripPlot from "./SingleStripPlot";
import ExtraPairDumbbell from "./ExtraPairDumbbell";
import ExtraPairBar from "./ExtraPairBar";

interface OwnProps {
  aggregatedBy: string;
  valueToVisualize: string;
  // chartId: string;
  store?: Store;
  dimensionWhole: { width: number, height: number }
  data: BarChartDataPoint[];
  svg: React.RefObject<SVGSVGElement>;
  yMax: number;
  selectedVal: number | null;
  stripPlotMode:boolean;
  extraPairDataSet:{name:string,data:any[], type:string}[];
}

export type Props = OwnProps;

const BarChart: FC<Props> = ({ extraPairDataSet,stripPlotMode,store, aggregatedBy, valueToVisualize, dimensionWhole, data, svg, yMax, selectedVal}: Props) => {

  const svgSelection = select(svg.current);

  const {
   // perCaseSelected,
    currentSelectSet
  } = store!;

  
  
  const [dimension,aggregationScale, valueScale, caseScale,lineFunction] = useMemo(() => {
    
    const caseMax = max(data.map(d => d.caseCount)) || 0;
    const caseScale = scaleLinear().domain([0, caseMax]).range([0.25, 0.8])
    const dimension = {
      height: dimensionWhole.height,
      width: dimensionWhole.width-extraPairDataSet.length*(extraPairWidth+extraPairPadding)}
    
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
    return [dimension,aggregationScale, valueScale, caseScale,lineFunction];
  }, [dimensionWhole, data, yMax,extraPairDataSet])

  const aggregationLabel = axisLeft(aggregationScale);
  const yAxisLabel = axisBottom(valueScale);

  svgSelection
    .select(".axes")
    .select(".x-axis")
    .attr(
      "transform",
      `translate(${offset.left+extraPairDataSet.length*(extraPairWidth+extraPairPadding)}, 0)`
    )
    .call(aggregationLabel as any)
    .selectAll("text")
    .attr("transform", `translate(-35,0)`)

  svgSelection
    .select(".axes")
    .select(".y-axis")
    .attr(
      "transform",
      `translate(${extraPairDataSet.length*(extraPairWidth+extraPairPadding)} ,${dimension.height - offset.bottom})`
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
    .attr("transform", `translate(${extraPairDataSet.length*(extraPairWidth+extraPairPadding)},0)`)
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
    .attr("transform", `translate(${extraPairDataSet.length*(extraPairWidth+extraPairPadding)},0)`)
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

  const outputSinglePlotElement = (dataPoint:BarChartDataPoint)=>{
    if (stripPlotMode){
      return ([<SingleStripPlot 
        isSelected = {decideIfSelected(dataPoint)}
        bandwidth={aggregationScale.bandwidth()}
        valueScale = {valueScale}
        aggregatedBy = {aggregatedBy} 
        dataPoint={dataPoint}
        howToTransform = {(`translate(-${offset.left},${aggregationScale(
          dataPoint.aggregateAttribute
        )})`).toString()}
        />])
    } else{
      return (    [<SingleViolinPlot 
        path = {lineFunction(dataPoint.kdeCal)!} 
        dataPoint={dataPoint}
        aggregatedBy = {aggregatedBy} 
        isSelected={decideIfSelected(dataPoint)} 
        howToTransform = {(`translate(0,${aggregationScale(
          dataPoint.aggregateAttribute
        )})`).toString()}
        />])
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
        transform={`translate(${offset.left+extraPairDataSet.length*(extraPairWidth+extraPairPadding)},0)`}
      >
        {data.map((dataPoint) => {
          return outputSinglePlotElement(dataPoint).concat([
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
          ]);
        })}
      </g>
      <g className="extraPairChart">
        {extraPairDataSet.map((pairData,index)=>{
          switch(pairData.type){
            case "Dumbbell":
              return (<g transform={`translate(${(extraPairWidth+extraPairPadding)*index},0)` }>
                  <ExtraPairDumbbell aggregatedScale={aggregationScale} dataSet={pairData.data}/>,
                    <ExtraPairText 
                      x={extraPairWidth/2} 
                      y={dimension.height - offset.bottom + 20} 
                      >{pairData.name}</ExtraPairText>
                </g>);
              
            case "BarChart":
              return (<g transform={`translate(${(extraPairWidth+extraPairPadding)*index},0)`}>
                  <ExtraPairBar aggregatedScale={aggregationScale} dataSet={pairData.data}/>
                  <ExtraPairText 
                      x={extraPairWidth/2} 
                      y={dimension.height - offset.bottom + 20} 
                      >{pairData.name}</ExtraPairText>
                </g>);
          }
        })}
      </g>


    </>
  );
}
export default inject("store")(observer(BarChart));

const ExtraPairText=styled(`text`)`
  font-size: 11px
  text-anchor: middle
  alignment-baseline:hanging
`
