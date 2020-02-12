import React, {
  FC,
  useEffect,
  useRef,
  useLayoutEffect,
  useState,
  useMemo
} from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { Popup } from "semantic-ui-react";
import {
  select,
  range,
  scaleLinear,
  scaleOrdinal,
  mouse,
  axisBottom,
  axisLeft,
  ScaleLinear,
  ScaleOrdinal,
} from "d3";
import { DumbbellDataPoint, offset, AxisLabelDict, SelectSet } from "../../Interfaces/ApplicationState";
      
interface OwnProps{
  yAxisName: string;
    //chartId: string;
  store?: Store;
  dimension: { width: number, height: number } 
  data: DumbbellDataPoint[];
  svg: React.RefObject<SVGSVGElement>
  yMax: number;
  xRange: { xMin: number, xMax: number };
}

export type Props = OwnProps;

const DumbbellChart: FC<Props> = ({ yAxisName, dimension, data, svg, store, yMax, xRange }: Props) => {

  const { dumbbellSorted,currentSelectPatient,currentSelectSet }=store!;
  const svgSelection = select(svg.current);
  data = data.sort(
    (a, b) =>
      Math.abs(a.startXVal - a.endXVal) - Math.abs(b.startXVal - b.endXVal)
  );

  const [xScale, yScale] = useMemo(() => {
    const xScale = scaleLinear()
      .domain([0.9 * xRange.xMin, 1.1 * xRange.xMax])
      .range([
        offset.left,
        dimension.width - offset.right - offset.margin
      ]);

    let yScale;
    if (!dumbbellSorted) {
     yScale = scaleLinear()
      .domain([0, 1.1 * yMax])
      .range([dimension.height - offset.top, offset.bottom]);
    }
    else {
      const indices = range(0,data.length)
      yScale = scaleOrdinal()
        .domain(indices as any)
       .range(range(dimension.height - offset.top, offset.bottom, -(dimension.height - offset.top - offset.bottom) / data.length));
       // .range([dimension.height - offset.top, offset.bottom]);
      
    }
    return [xScale, yScale];
  }, [dimension, data, yMax, xRange,dumbbellSorted]);

  const xAxisLabel = axisBottom(xScale);
  if (!dumbbellSorted){
    const yAxisLabel = axisLeft(yScale as ScaleLinear<number, number>);
      svgSelection
    .select(".axes")
        .select(".y-axis")
        .attr('display',null)
    .attr("transform",
      `translate(${offset.left} ,-${offset.bottom - offset.top} )`)
        .call(yAxisLabel as any);
            svgSelection
              .select(".axes")
              .select(".y-label")
              .attr("display", null)
              .attr("y", 0)
              .attr("x", -0.5 * dimension.height + 1.5 * offset.bottom)
              .attr("font-size", "11px")
              .attr("text-anchor", "middle")
              .attr("alignment-baseline", "hanging")
              .attr("transform", "rotate(-90)")
              .text(
                AxisLabelDict[yAxisName] ? AxisLabelDict[yAxisName] : yAxisName
              );
  }
  else {
     svgSelection
       .select(".axes")
       .select(".y-axis")
       .attr("display", "none");
    svgSelection
      .select(".axes")
      .select(".y-label")
      .attr("display", "none");
  }
  

  svgSelection.select('.axes')
    .select(".x-axis")
    .attr("transform", `translate(0, ${(dimension.height - offset.bottom)})`)
    .call(xAxisLabel as any);


  
        svgSelection
          .select(".axes")
          .select(".x-label")
          .attr("x", 0.5 * (dimension.width + offset.left))
          .attr("y", dimension.height)
          .attr("alignment-baseline", "baseline")
          .attr("font-size", "11px")
          .attr("text-anchor", "middle")
          .text("Hemoglobin Value");


  const decideIfSelected = (d: DumbbellDataPoint) => {
    if (currentSelectPatient) {
      return currentSelectPatient.patientID===d.patientID
    }
    else if (currentSelectSet) {
      return d[currentSelectSet.set_name]===currentSelectSet.set_value
    }
    else {
      return false;
    }
  //  return true;
  }
      
    return (
      <>
        <g className="axes">
          <g className="x-axis"></g>
          <g className="y-axis"></g>
          <text className="x-label" style={{ textAnchor: "end" }} />
          <text className="y-label" style={{ textAnchor: "end" }} />
        </g>
        <g className="chart-comp" >
          <line x1={xScale(11)} x2={xScale(11)} y1={dimension.height-offset.bottom} y2={0} style={{ stroke: "#990D0D",strokeWidth:"2"}} />
          {data.map((dataPoint,index) => {
            const start = xScale(dataPoint.startXVal);
            const end = xScale(dataPoint.endXVal);
            const returning = start > end ? end : start;
            const rectwidth = Math.abs(end - start)
            return (
              <Popup
                content={`${dataPoint.startXVal} -> ${dataPoint.endXVal}`}
                key={dataPoint.caseId}
                trigger={
                  <DumbbellG 
                    dataPoint={dataPoint}
                    transform={`translate(0,-${offset.bottom - offset.top})`}
                  >
                    <Rect
                      x={returning}
                      y={
                        dumbbellSorted
                          ? (yScale as ScaleOrdinal<any, any>)(index)
                          : (yScale as ScaleLinear<number, number>)(
                              dataPoint.yVal
                            ) - 1
                      }
                      width={rectwidth}
                      isSelected={decideIfSelected(dataPoint)}
                    />
                    <Circle
                      cx={xScale(dataPoint.startXVal)}
                      cy={
                        dumbbellSorted
                          ? (yScale as ScaleOrdinal<any, any>)(index)
                          : (yScale as ScaleLinear<number, number>)(
                            dataPoint.yVal
                          )}
                      onClick={() => { actions.selectPatient(dataPoint) }}
                      isSelected={decideIfSelected(dataPoint)}
                    />
                    <Circle
                      cx={xScale(dataPoint.endXVal)}
                      cy={
                        dumbbellSorted
                          ? (yScale as ScaleOrdinal<any, any>)(index)
                          : (yScale as ScaleLinear<number, number>)(
                              dataPoint.yVal
                            )
                      }
                      onClick={() => {
                        actions.selectPatient(dataPoint)
                      }}
                      isSelected={decideIfSelected(dataPoint)}
                      
                      
                    />
                  </DumbbellG>
                }
              />
            );
        })}
        </g>
        <g className=".circle-tooltip" style={{ display: "none" }}>
          <rect
            style={{ width: "30", height: "20", fill: "white", opacity: "0.5" }}
          />
          <text
            x="15"
            dy="1.2em"
            style={{
              textAnchor: "middle",
              fontSize: "12px",
              fontWeight: "bold"
            }}
          />
        </g>
      </>
    );
  }

export default inject("store")(observer(DumbbellChart));

interface DumbbellProps{
  dataPoint: DumbbellDataPoint;
}

interface DotProps{
  isSelected: boolean;
}

  // display: ${props =>
  //   props.dataPoint.endXVal === 0 || props.dataPoint.startXVal === 0
  //     ? "none"
  //     : null} 

const DumbbellG = styled(`g`)<DumbbellProps>`

`;



const Circle = styled(`circle`)<DotProps>`
  r:4px
  fill:${props => (props.isSelected ?'#d98532':'#20639B')}
`;

const Rect = styled(`rect`) <DotProps>`
 height:1.5px
 opacity:50%
 fill:${props => (props.isSelected ? '#d98532' : '#20639B')}
`;