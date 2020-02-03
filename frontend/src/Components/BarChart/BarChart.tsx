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
import { SingularDataPoint } from "../../Interfaces/ApplicationState";

interface OwnProps{
    xAxisName: string;
    yAxisName: string;
    // chartId: string;
    store?: Store;
    dimension: { width: number, height: number } 
    data: SingularDataPoint[];
    svg:React.RefObject<SVGSVGElement>
}

export type Props = OwnProps;

const BarChart: FC<Props> = ({ store, xAxisName, yAxisName, dimension, data, svg }: Props) => {
    const offset = { left: 70, bottom: 40, right: 10, top: 20, margin: 30 };

    const svgSelection = select(svg.current);

    const [xScale, yScale] = useMemo(() => {
        const yMax = max(data.map(d=>d.yVal))||0
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
        },[dimension,data])
    // if (svg.current) {
        // if ((svg as any).node()) {
        //     svg.attr("width", "100%").attr("height", "100%");
        //     const width = (svg as any).node().getBoundingClientRect().width;
        //     const height = (svg as any).node().getBoundingClientRect().height;
        //     
        //     const offset = { left: 70, bottom: 40, right: 10, top: 20, margin: 30 };
        //     let yScale = scaleLinear()
        //         .domain([0, 1.1 * yMax])
        //         .range([height - offset.top, offset.bottom]);
        //     let xScale = scaleBand()
        //         .domain(xVals)
        //         .range([offset.left, width - offset.right - offset.margin])
        //         .paddingInner(0.1);
        //     const rect_tooltip = svg.select(".rect-tooltip");

        //     let rects = svg
        //         .select(".chart")
        //         .selectAll(".bars")
        //         .data(data.result);

        //     rects.exit().remove();
        //     rects = (rects as any)
        //         .enter()
        //         .append("rect")
        //         .merge(rects as any);

        //     rects
        //         .attr("x", (d: SingularDataPoint) => xScale(d.xVal) as any)
        //         .attr("y", (d: SingularDataPoint) => yScale(d.yVal))
        //         .classed("bars", true)
        //         .attr("width", xScale.bandwidth())
        //         .attr(
        //             "height",
        //             (d: SingularDataPoint) => height - yScale(d.yVal) - offset.top
        //         )
        //         .attr("fill", "#072F5F")
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
        //         .on("mouseover", function () {
        //             rect_tooltip.style("display", null);
        //         })
        //         .on("mouseout", function () {
        //             rect_tooltip.style("display", "none");
        //         })
        //         .on("mousemove", function (d: SingularDataPoint) {
        //             var xPosition = mouse(this as any)[0] - 20;
        //             var yPosition = mouse(this as any)[1] - 40;
        //             rect_tooltip.attr(
        //                 "transform",
        //                 "translate(" + xPosition + "," + yPosition + ")"
        //             );

        //             rect_tooltip.select("text").text(Math.round(d.yVal * 100) / 100);
        //         });

            const xAxisLabel = axisBottom(xScale);
            const yAxisLabel = axisLeft(yScale);
            svgSelection
                .select(".axes")
                .select(".x-axis")
                .attr("transform", "translate(0," + (dimension.height - offset.bottom) + ")")
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
                    "translate(" + offset.left + ",-" + (offset.bottom - offset.top) + ")"
                )
                .call(yAxisLabel as any);

        svgSelection.select(".axes")
            .select(".x-label")
            .attr("x", dimension.height - 10)
            .attr("y", -dimension.width + offset.right)
            .attr("alignment-baseline", "hanging")
            .attr("font-size", "10px")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(90)")
            .text(xAxisName);

        svgSelection.select(".axes")
            .select(".y-label")
            .attr("y", offset.top + 5)
            .attr("x", -offset.top - 5)
            .attr("font-size", "10px")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-90)")
            .text(yAxisName);
    
    // }
    // <Bars
    // chartId={chartId}
    // data={data.result}
    // yMax={yMax}
    // xAxisName={xAxis}
    // yAxisName={yAxis}
    // />
    // <>
    // </>
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
            return (<Bar key={dataPoint.xVal} x={xScale(dataPoint.xVal)}
                y={yScale(dataPoint.yVal)}
                width={xScale.bandwidth()}
            height={dimension.height - yScale(dataPoint.yVal) - offset.top} />);
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