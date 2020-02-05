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
import { DumbbellDataPoint, offset, AxisLabelDict } from "../../Interfaces/ApplicationState";
      
interface OwnProps{
  yAxisName: string;
    //chartId: string;
  store?: Store;
  dimension: { width: number, height: number } 
  data: DumbbellDataPoint[];
  svg: React.RefObject<SVGSVGElement>
  yMax: number;
  xRange: {xMin:number,xMax:number}
}

export type Props = OwnProps;

const DumbbellChart: FC<Props> = ({ yAxisName, dimension, data, svg, store, yMax, xRange }: Props) => {

  const { dumbbellSorted }=store!;
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

 
  //     const circle_tooltip = svg.select(".circle-tooltip");

  //     let components = svg
  //       .select(".chart-comp")
  //       .selectAll("g")
  //       .data(data.result);
  //     components.exit().remove();
  //     components = (components as any)
  //       .enter()
  //       .append("g")
  //       .merge(components as any);
  //     components.selectAll("circle").remove();
  //     components.selectAll("rect").remove();
  //     components
  //       .append("rect")
  //       .attr("x", (d: DumbbellDataPoint) => {
  //         const start = xScale(d.startXVal);
  //         const end = xScale(d.endXVal);
  //         const returning = start > end ? end : start;
  //         return returning;
  //       })
  //       .attr("y", (d: DumbbellDataPoint) => yScale(d.yVal) - 1)
  //       .attr("height", "2px")
  //       .attr("opacity", (d: DumbbellDataPoint) => {
  //         if (d.startXVal === 0 || d.endXVal === 0) {
  //           return 0;
  //         }
  //         return d.yVal ? 0.5 : 0;
  //       })
  //       .attr("width", (d: DumbbellDataPoint) =>
  //         Math.abs(xScale(d.endXVal) - xScale(d.startXVal))
  //       );
  //     components
  //       .append("circle")
  //       .attr("cx", (d: DumbbellDataPoint) => xScale(d.startXVal) as any)
  //       .attr("cy", (d: DumbbellDataPoint) => yScale(d.yVal))
  //       .attr("r", "1%")
  //       .attr("fill", "#ba9407")
  //       .attr("opacity", (d:DumbbellDataPoint) => {
  //         if (d.startXVal === 0) {
  //           return 0;
  //         }
  //         // if (that.props.current_select_case) {
  //         //   return d.case_id === that.props.current_select_case ? 1 : 0.5;
  //         // } else if (that.props.current_select_set) {
  //         //   switch (that.props.current_select_set.set_name) {
  //         //     case "YEAR":
  //         //       return d.YEAR === that.props.current_select_set.set_value
  //         //         ? 1
  //         //         : 0.5;
  //         //     case "SURGEON_ID":
  //         //       return d.SURGEON_ID ===
  //         //         that.props.current_select_set.set_value
  //         //         ? 1
  //         //         : 0.5;
  //         //     case "ANESTHOLOGIST_ID":
  //         //       return d.ANESTHOLOGIST_ID ===
  //         //         that.props.current_select_set.set_value
  //         //         ? 1
  //         //         : 0.5;
  //         //     default:
  //         //       return d.yAxisLabel ? 1 : 0;
  //         //   }
  //         // }
  //         else {
  //           return d.yVal ? 1 : 0;
  //         }
  //       });
  //     components
  //       .append("circle")
  //       .attr("cx", (d: DumbbellDataPoint) => xScale(d.endXVal) as any)
  //       .attr("cy", (d: DumbbellDataPoint) => yScale(d.yVal))
  //       .attr("r", "1%")
  //       .attr("fill", "#20639B")
  //       .attr("opacity", (d:DumbbellDataPoint) => {
  //         if (d.endXVal === 0) {
  //           return 0;
  //         }
  //         // if (that.props.current_select_case) {
  //         //   return d.case_id === that.props.current_select_case ? 1 : 0.5;
  //         // } else if (that.props.current_select_set) {
  //         //   switch (that.props.current_select_set.set_name) {
  //         //     case "YEAR":
  //         //       return d.YEAR === that.props.current_select_set.set_value
  //         //         ? 1
  //         //         : 0.5;
  //         //     case "SURGEON_ID":
  //         //       return d.SURGEON_ID ===
  //         //         that.props.current_select_set.set_value
  //         //         ? 1
  //         //         : 0.5;
  //         //     case "ANESTHOLOGIST_ID":
  //         //       return d.ANESTHOLOGIST_ID ===
  //         //         that.props.current_select_set.set_value
  //         //         ? 1
  //         //         : 0.5;
  //         //     default:
  //         //       return d.yAxisLabel ? 1 : 0;
  //         //   }
  //         // }
  //         return d.yVal ? 1 : 0;
  //       });

  //     components
  //       .attr(
  //         "transform",
  //         "translate(0,-" + (offset.bottom - offset.top) + ")"
  //       )
  //       .on("mouseover", function() {
  //         circle_tooltip.style("display", null);
  //       })
  //       .on("mouseout", function() {
  //         circle_tooltip.style("display", "none");
  //       })
  //       .on("mousemove", function(d:DumbbellDataPoint) {
  //         var xPosition = mouse(this as any)[0] - 20;
  //         var yPosition = mouse(this as any)[1] - 40;
  //         circle_tooltip.attr(
  //           "transform",
  //           "translate(" + xPosition + "," + yPosition + ")"
  //         );
  //         circle_tooltip
  //           .select("text")
  //           .text(
  //             "start " +
  //               d.startXVal +
  //               " end " +
  //               d.endXVal +
  //               " transfused " +
  //               d.yVal
  //           );
  //       })
  //       .on("click", function(d:DumbbellDataPoint) {
  //         // console.log(d.visit_no);
  //         // that.props.ID_selection_handler(d.visit_no);
  //         console.log(d.caseId);
  //         //that.props.ID_selection_handler(d.case_id);
  //         //d3.event.stopPropagation();
  //       });

  const xAxisLabel = axisBottom(xScale);
  if (!dumbbellSorted){
    const yAxisLabel = axisLeft(yScale as ScaleLinear<number, number>);
      svgSelection
    .select(".axes")
    .select(".y-axis")
    .attr("transform",
      `translate(${offset.left} ,-${offset.bottom - offset.top} )`)
        .call(yAxisLabel as any);
            svgSelection
          .select(".axes")
          .select(".y-label")
          .attr("y", 0)
          .attr("x", -0.5 * dimension.height + 1.5*offset.bottom)
          .attr("font-size", "11px")
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "hanging")
          .attr("transform", "rotate(-90)")
          .text(
            AxisLabelDict[yAxisName] ? AxisLabelDict[yAxisName] : yAxisName
          );
  }
  else {
    //TODO
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


            

    return (
      <>
        <g className="axes">
          <g className="x-axis"></g>
          <g className="y-axis"></g>
          <text className="x-label" style={{ textAnchor: "end" }} />
          <text className="y-label" style={{ textAnchor: "end" }} />
        </g>
        <g className="chart-comp" >
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
                    />
                    <Circle
                      cx={xScale(dataPoint.startXVal)}
                      cy={
                        dumbbellSorted
                          ? (yScale as ScaleOrdinal<any, any>)(index)
                          : (yScale as ScaleLinear<number, number>)(
                              dataPoint.yVal
                            )
                      }
                      fill="#ba9407"
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
                      fill="#20639B"
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
  // display: ${props =>
  //   props.dataPoint.endXVal === 0 || props.dataPoint.startXVal === 0
  //     ? "none"
  //     : null} 

const DumbbellG = styled(`g`)<DumbbellProps>`

`;

const Circle = styled(`circle`)`
  r:0.8%
`;

const Rect = styled(`rect`)`
 height:1.5px
 opacity:50%
`;