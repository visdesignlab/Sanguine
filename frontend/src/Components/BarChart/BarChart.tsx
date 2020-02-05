import React, {
  FC,
  useEffect,
  useRef,
  useLayoutEffect,
  useState,
  useMemo
} from "react";
import { actions } from "../..";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import {
  select,
  selectAll,
  scaleLinear,
  scaleBand,
    mouse,
  max,
  axisBottom,
  axisLeft
} from "d3";
import {
  SingularDataPoint,
  offset,
  AxisLabelDict
} from "../../Interfaces/ApplicationState";
import {Popup} from 'semantic-ui-react'

interface OwnProps{
    xAxisName: string;
    yAxisName: string;
    // chartId: string;
    store?: Store;
    dimension: { width: number, height: number } 
  data: SingularDataPoint[];
  svg: React.RefObject<SVGSVGElement>;
  yMax: number
 
}

export type Props = OwnProps;

const BarChart: FC<Props> = ({ store, xAxisName, yAxisName, dimension, data, svg,yMax }: Props) => {

    const svgSelection = select(svg.current);
    
    const {
      perCaseSelected
    } = store!;
  
    const [xScale, yScale] = useMemo(() => {
        // const yMax = max(data.map(d=>d.yVal))||0
        const xVals = data
            .map(function(dp) {
            return dp.xVal;
            })
            .sort();
        let yScale = scaleLinear()
            .domain([0, 1.1 * yMax])
            .range([dimension.height - offset.top, offset.bottom]);
    let xScale = scaleBand()
                .domain(xVals)
                .range([offset.left, dimension.width - offset.right - offset.margin])
                .paddingInner(0.1);
        return [xScale, yScale];
        },[dimension,data,yMax])
   

  
  // useEffect(() => {
  //     svgSelection.select(".chart").selectAll('rect').on('click',()=>{})
  //   })


        //     rects

        //         .attr("opacity", d => {
        //             // if (this.state.value_to_highlight) {
        //             //   return d.x_axis === this.state.value_to_highlight ? 1 : 0.5;
        //             // }
        //             // if (this.props.current_select_set) {
        //             //   if (
        //             //     this.props.current_select_set.set_name === this.props.x_axis_name
        //             //   ) {
        //             //     return d.x_axis === this.props.current_select_set.set_value
        //             //       ? 1
        //             //       : 0.5;
        //             //   } else {
        //             //     return 1;
        //             //   }
        //             // }
        //             return 1;
        //         })
        //         .attr("transform", "translate(0,-" + (offset.bottom - offset.top) + ")")
        //         //   .on("click", function(d) {
        //         //     that.props.set_selection_handler(that.props.x_axis_name, d.x_axis);
        //         //   })

        //         })


            const xAxisLabel = axisBottom(xScale);
  const yAxisLabel = axisLeft(yScale);
  
            svgSelection
              .select(".axes")
              .select(".x-axis")
              .attr(
                "transform",
                `translate(0, ${dimension.height - offset.bottom})`
              )
              .call(xAxisLabel as any)
              .selectAll("text")
              .attr("y", 0)
              .attr("x", 9)
              .attr("dy", ".35em")
              .attr("transform", "rotate(90)")
              .style("text-anchor", "start");

            svgSelection
              .select(".axes")
              .select(".y-axis")
              .attr(
                "transform",
                `translate(${offset.left} ,-${offset.bottom - offset.top} )`
              )
              .call(yAxisLabel as any);

        svgSelection
          .select(".axes")
          .select(".x-label")
          .attr("x", 0.5 * (dimension.width + offset.left))
          .attr("y", dimension.height)
          .attr("alignment-baseline", "baseline")
          .attr("font-size", "11px")
          .attr("text-anchor", "middle")
          //.attr("transform", "rotate(90)")
          .text(
            AxisLabelDict[xAxisName] ? AxisLabelDict[xAxisName] : xAxisName
          );

        svgSelection
          .select(".axes")
          .select(".y-label")
          .attr("y", 0)
          .attr("x", -0.5 * dimension.height + 1.5*offset.bottom)
          .attr("font-size", "11px")
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "hanging")
          .attr("transform", "rotate(-90)")
          .text(() => {
            const trailing = perCaseSelected ? " / Case" : "";
            return AxisLabelDict[yAxisName]? AxisLabelDict[yAxisName]+trailing : yAxisName+trailing
          }
          );
    return (
    <>
    <g className="axes">
        <g className="x-axis"></g>
        <g className="y-axis"></g>
        <text className="x-label" style={{ textAnchor: "end" }} />
        <text className="y-label" style={{textAnchor:"end"}}/>
      </g>
            <g className="chart" transform={`translate(0,-${offset.bottom - offset.top})`}>
        {data.map((dataPoint) => {
          return (
            <Popup content={dataPoint.yVal} key={dataPoint.xVal} trigger={
              <Bar
                x={xScale(dataPoint.xVal)}
                y={yScale(dataPoint.yVal)}
                width={xScale.bandwidth()}
                height={dimension.height - yScale(dataPoint.yVal) - offset.top}
                onClick={() => {
                  actions.selectPatient(dataPoint)
                }}
              />}
            />
          );
        })}
      </g>
      <g className="rect-tooltip" style={{display:"none"}}>
        <rect fill="white" style={{ opacity: "0.5", width: "30", height: "20" }} />
        <text x="15" dy="1.2em" style={{textAnchor:"middle", fontSize:"12px",fontWeight:"bold"}}/>
      </g>
        </>
    );
}
export default inject("store")(observer(BarChart));

const Bar = styled(`rect`)`
  fill: #072f5f;
`;