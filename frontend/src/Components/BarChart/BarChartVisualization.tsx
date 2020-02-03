import React, { FC, useEffect, useRef, useLayoutEffect, useState, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { select, selectAll, scaleLinear, scaleBand, mouse, axisBottom, axisLeft } from "d3";
import {SingularDataPoint} from '../../Interfaces/ApplicationState'


interface OwnProps{
    xAxis: string;
    yAxis: string;
    chartId: string;
    store?: Store;
}

export type Props = OwnProps;

const BarChart: FC<Props> = ({ xAxis,yAxis,chartId,store }: Props) => {
    const { layoutArray, filterSelection, perCaseSelected, currentSelectedChart,actualYearRange } = store!
   // const svgRef = useRef<SVGSVGElement>(null);
    const [data, setData] = useState({ result: [] });
    const [yMax, setYMax] = useState(0)
    console.log(perCaseSelected)
    async function fetchChartData() {
        const res = await fetch(`http://localhost:8000/api/summarize_with_year?x_axis=${xAxis}&y_axis=${yAxis}&year_range=${actualYearRange}&filter_selection=${filterSelection.toString()}`);
        const dataResult = await res.json();
        if (dataResult) {
            let yMaxTemp = -1;
            let cast_data = (dataResult.result as any).map(function(ob: any) {
              let y_val = perCaseSelected
                ? ob.y_axis / ob.case_count
                : ob.y_axis;
              yMaxTemp = y_val > yMaxTemp ? y_val : yMaxTemp;

              let new_ob: SingularDataPoint = {
                xVal: ob.x_axis,
                yVal: y_val
              };
              return new_ob;
            });
            console.log(dataResult);
            setData({result:cast_data});
            setYMax(yMaxTemp);
        }   
    }

    useEffect(() => {
        fetchChartData();
    }, []);

    const svg = select(`.parent-node${chartId}`).select("svg");

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
      const xVals = (data.result as SingularDataPoint[])
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

      let rects = svg.selectAll(".bars").data(data.result);

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
            const something=perCaseSelected
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
        .on("mousemove", function(d:SingularDataPoint) {
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
        .text(xAxis);

      svg
        .select(".y-label")
        .attr("y", offset.top + 5)
        .attr("x", -offset.top - 5)
        .attr("font-size", "10px")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .text(yAxis);
    }


  
    return (
        // <Bars
        // chartId={chartId}
        // data={data.result}
        // yMax={yMax}
        // xAxisName={xAxis}
        // yAxisName={yAxis}    
        // />
      <></>
    );
}
 

export default inject("store")(observer(BarChart));

// const SVG = styled.svg`
//   height: 100%;
//   width: 100%;
// `;