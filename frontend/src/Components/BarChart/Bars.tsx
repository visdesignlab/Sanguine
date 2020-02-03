import React, { FC, useEffect, useMemo } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import {
  scaleLinear,
  scaleBand,
  min,
  max,
  select,
  axisBottom,
  axisLeft,
    selectAll,
  mouse
} from "d3";
import styled from "styled-components";
import { actions } from "../..";
import {SingularDataPoint} from '../../Interfaces/ApplicationState'

interface OwnProps{
    store?: Store;
    xAxisName: string;
    yAxisName: string;
    yMax: number;
    chartId: string;
    data:SingularDataPoint[]
}

type Props = OwnProps

const Bars: FC<Props> = ({ store, chartId,data,yMax ,xAxisName,yAxisName}: Props) => {
    
    const svg = select(`.parent-node${chartId}`)
        .select('svg');
    
    if ((svg as any).node()) {
        svg.attr("width", "100%").attr("height", "100%");
        svg.append("g").attr("id", "x-axis");
        svg.append("g").attr("id", "y-axis");
        svg
          .append("text")
          .text("chart #" + chartId)
          .attr("alignment-baseline", "hanging")
          .attr("x", 0)
          .attr("y", 0)
          .attr("font-size", "10px");

        svg
          .append("text")
          .attr("class", "x-label")
          .attr("text-anchor", "end");
        svg
          .append("text")
          .attr("class", "y-label")
          .attr("text-anchor", "end");


      const width = (svg as any).node().getBoundingClientRect().width;
      const height = (svg as any).node().getBoundingClientRect().height;
      const xVals = data
        .map(function(dp) {
          return dp.xVal;
        })
        .sort();
      const offset = { left: 70, bottom: 40, right: 10, top: 20, margin: 30 };
      let yScale = scaleLinear()
        .domain([0, 1.1 * yMax])
        .range([height - offset.top, offset.bottom]);
      let xScale = scaleBand()
        .domain(xVals)
        .range([offset.left, width - offset.right - offset.margin])
        .paddingInner(0.1);
      const rect_tooltip = svg.select(".rect-tooltip");

      let rects = svg
        .selectAll(".bars")
        .data(data);

      rects.exit().remove();
      console.log(yScale);
      rects = (rects as any)
        .enter()
        .append("rect")
          .merge(rects as any);
        
      rects
        .attr("x", (d: SingularDataPoint) => xScale(d.xVal) as any)
        .attr("y", (d: SingularDataPoint) => yScale(d.yVal))
        .classed("bars", true)
        .attr("width", xScale.bandwidth())
        .attr(
          "height",
          (d: SingularDataPoint) => height - yScale(d.yVal) - offset.top
        )
        .attr("fill", "#072F5F")
        .attr("opacity", d => {
          // if (this.state.value_to_highlight) {
          //   return d.x_axis === this.state.value_to_highlight ? 1 : 0.5;
          // }
          // if (this.props.current_select_set) {
          //   if (
          //     this.props.current_select_set.set_name === this.props.x_axis_name
          //   ) {
          //     return d.x_axis === this.props.current_select_set.set_value
          //       ? 1
          //       : 0.5;
          //   } else {
          //     return 1;
          //   }
          // }
          return 1;
        })
        .attr("transform", "translate(0,-" + (offset.bottom - offset.top) + ")")
        //   .on("click", function(d) {
        //     that.props.set_selection_handler(that.props.x_axis_name, d.x_axis);
        //   })
        .on("mouseover", function() {
          rect_tooltip.style("display", null);
        })
        .on("mouseout", function() {
          rect_tooltip.style("display", "none");
        })
        .on("mousemove", function(d) {
          var xPosition = mouse(this as any)[0] - 20;
          var yPosition = mouse(this as any)[1] - 40;
          rect_tooltip.attr(
            "transform",
            "translate(" + xPosition + "," + yPosition + ")"
          );

          rect_tooltip.select("text").text(Math.round(d.yVal * 100) / 100);
        });

      const xAxisLabel = axisBottom(xScale);
      const yAxisLabel = axisLeft(yScale);
      svg
        .select("#x-axis")
        .attr("transform", "translate(0," + (height - offset.bottom) + ")")
        .call(xAxisLabel as any)
        .selectAll("text")
        .attr("y", 0)
        .attr("x", 9)
        .attr("dy", ".35em")
        .attr("transform", "rotate(90)")
        .style("text-anchor", "start");

      svg
        .select("#y-axis")
        .attr(
          "transform",
          "translate(" + offset.left + ",-" + (offset.bottom - offset.top) + ")"
        )
        .call(yAxisLabel as any);

      svg
        .select(".x-label")
        .attr("x", height - 10)
        .attr("y", -width + offset.right)
        .attr("alignment-baseline", "hanging")
        .attr("font-size", "10px")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(90)")
        .text(xAxisName);

      svg
        .select(".y-label")
        .attr("y", offset.top + 5)
        .attr("x", -offset.top - 5)
        .attr("font-size", "10px")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .text(yAxisName);
    }

    return(<></>)
}

export default inject ('store')(observer(Bars))