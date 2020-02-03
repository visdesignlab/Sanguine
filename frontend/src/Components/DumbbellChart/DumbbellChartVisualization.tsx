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
  axisBottom,
  axisLeft
} from "d3";
import {DumbbellDataPoint} from "../../Interfaces/ApplicationState"

interface OwnProps{
    yAxis: string;
    chartId: string;
    store?: Store;
}

export type Props = OwnProps;

const DumbbellChart: FC<Props> = ({ yAxis, chartId, store }: Props) => {
    const {
      layoutArray,
      filterSelection,
      perCaseSelected,
      currentSelectedChart,
      actualYearRange
    } = store!;
    // const svgRef = useRef<SVGSVGElement>(null);
    const [data, setData] = useState({ result: [] });
    const [yMax, setYMax] = useState(0);
    const [xRange, setXRange] = useState({ min: 0, max: Infinity })
    
    async function fetchChartData() {
      let transfused_dict = {} as any;
      const transfusedRes = await fetch(
        `http://localhost:8000/api/request_transfused?transfusion_type=${yAxis}&year_range=${actualYearRange}&filter_selection=${filterSelection.toString()}`
      );
      const transfusedDataResult = await transfusedRes.json();
      const temp_transfusion_data = transfusedDataResult.result;
      temp_transfusion_data.forEach((element: any) => {
        transfused_dict[element.case_id] = {
          transfused: element.transfused
        };
      });
      console.log(transfused_dict);
      const hemoRes = await fetch(`http://localhost:8000/api/hemoglobin`);
      const hemoDataResult = await hemoRes.json();
      const hemo_data = hemoDataResult.result;
      let tempYMax = 0;
      let tempXMin = Infinity;
      let tempXMax = 0;
    //  console.log(hemo_data);
        if (hemo_data) {
            let cast_data = hemo_data.map((ob: any) => {
                const begin_x = +ob.hemo[0];
                const end_x = +ob.hemo[1];
                let yAxisLabel_val;
            
                if (transfused_dict[ob.case_id]) {
                    yAxisLabel_val = transfused_dict[ob.case_id].transfused;
                    };
                //console.log(yAxisLabel_val)
                //This filter out anything that has empty value
                if (yAxisLabel_val) {
                    if (yAxisLabel_val < 100 && yAxis==="PRBC_UNITS") {
                        tempYMax = yAxisLabel_val > tempYMax ? yAxisLabel_val : tempYMax;
                    }
                    tempXMin = begin_x < tempXMin ? begin_x : tempXMin;
                    tempXMin = end_x < tempXMin ? end_x : tempXMin;
                    tempXMax = begin_x > tempXMax ? begin_x : tempXMax;
                    tempXMax = end_x > tempXMax ? end_x : tempXMax;

                    let new_ob: DumbbellDataPoint = {
                    startXVal: begin_x,
                    endXVal: end_x,
                    visitNum: ob.visit_id,
                    yVal: yAxisLabel_val,
                    caseId: ob.case_id,
                    YEAR: ob.year,
                    ANESTHOLOGIST_ID: ob.anesth_id,
                    SURGEON_ID: ob.surgeon_id,
                    patientID: ob.patient_id
                    };
                    return new_ob;
                }
            });
            cast_data = cast_data.filter((d: any) => d);
            setData({ result: cast_data });
            setYMax(tempYMax);
            setXRange({ min: tempXMin, max: tempXMax });
            
        }
    }

    useEffect(() => {
        fetchChartData();
    }, []);

    const svg = select(`.parent-node${chartId}`).select("svg");

    if ((svg as any).node()) { 
        // console.log(data)
        if (!(svg.select("#x-axis") as any).node()) {
            svg.append("g").attr("id", "x-axis");
            svg.append("g").attr("id", "y-axis");
            svg.append("g").attr("id", "chart-comp");
            svg
                .append("text")
                .text("chart #" + chartId)
                .attr("alignment-baseline", "hanging")
                .attr("x", 0)
                .attr("font-size", "10px")
                .attr("y", 0);
            svg
                .append("text")
                .attr("class", "x-label")
                .attr("text-anchor", "end");
            svg
                .append("text")
                .attr("class", "y-label")
                .attr("text-anchor", "end");
            
            let circle_tooltip = svg
              .append("g")
              .attr("class", "circle-tooltip")
              .style("display", "none");
            circle_tooltip
              .append("rect")
              .attr("width", 30)
              .attr("height", 20)
              .attr("fill", "white")
              .style("opacity", 0.5);

            circle_tooltip
              .append("text")
              .attr("x", 15)
              .attr("dy", "1.2em")
              .style("text-anchor", "middle")
              .attr("font-size", "12px")
              .attr("font-weight", "bold");
        }
        svg.attr("width", "100%").attr("height", "100%");
        const width = (svg as any).node().getBoundingClientRect().width;
        const height = (svg as any).node().getBoundingClientRect().height;
        const offset = { left: 70, bottom: 40, right: 10, top: 20 };

        const yScale = scaleLinear()
          .domain([0, 1.1 * yMax])
          .range([height - offset.top, offset.bottom]);
        const xScale = scaleLinear()
          .domain([0.9 * xRange.min, 1.1 * xRange.max])
          .range([offset.left, width - offset.right]);
        const circle_tooltip = svg.select(".circle-tooltip");

        let components = svg
          .select("#chart-comp")
          .selectAll("g")
          .data(data.result);
        components.exit().remove();
        components = (components as any)
          .enter()
          .append("g")
          .merge(components as any);
        components.selectAll("circle").remove();
        components.selectAll("rect").remove();
        components
          .append("circle")
          .attr("cx", (d: DumbbellDataPoint) => xScale(d.startXVal) as any)
          .attr("cy", (d: DumbbellDataPoint) => yScale(d.yVal))
          .attr("r", "1%")
          .attr("fill", "#ba9407")
          .attr("opacity", (d:DumbbellDataPoint) => {
            if (d.startXVal === 0) {
              return 0;
            }
            // if (that.props.current_select_case) {
            //   return d.case_id === that.props.current_select_case ? 1 : 0.5;
            // } else if (that.props.current_select_set) {
            //   switch (that.props.current_select_set.set_name) {
            //     case "YEAR":
            //       return d.YEAR === that.props.current_select_set.set_value
            //         ? 1
            //         : 0.5;
            //     case "SURGEON_ID":
            //       return d.SURGEON_ID ===
            //         that.props.current_select_set.set_value
            //         ? 1
            //         : 0.5;
            //     case "ANESTHOLOGIST_ID":
            //       return d.ANESTHOLOGIST_ID ===
            //         that.props.current_select_set.set_value
            //         ? 1
            //         : 0.5;
            //     default:
            //       return d.yAxisLabel ? 1 : 0;
            //   }
            // } 
            else {
              return d.yVal ? 1 : 0;
            }
          });
        components
          .append("circle")
          .attr("cx", (d: DumbbellDataPoint) => xScale(d.endXVal) as any)
          .attr("cy", (d: DumbbellDataPoint) => yScale(d.yVal))
          .attr("r", "1%")
          .attr("fill", "#20639B")
          .attr("opacity", (d:DumbbellDataPoint) => {
            if (d.endXVal === 0) {
              return 0;
            }
            // if (that.props.current_select_case) {
            //   return d.case_id === that.props.current_select_case ? 1 : 0.5;
            // } else if (that.props.current_select_set) {
            //   switch (that.props.current_select_set.set_name) {
            //     case "YEAR":
            //       return d.YEAR === that.props.current_select_set.set_value
            //         ? 1
            //         : 0.5;
            //     case "SURGEON_ID":
            //       return d.SURGEON_ID ===
            //         that.props.current_select_set.set_value
            //         ? 1
            //         : 0.5;
            //     case "ANESTHOLOGIST_ID":
            //       return d.ANESTHOLOGIST_ID ===
            //         that.props.current_select_set.set_value
            //         ? 1
            //         : 0.5;
            //     default:
            //       return d.yAxisLabel ? 1 : 0;
            //   }
            // }
            return d.yVal ? 1 : 0;
          });
        components
          .append("rect")
          .attr("x", (d: DumbbellDataPoint) => {
            const start = xScale(d.startXVal);
            const end = xScale(d.endXVal);
            const returning = start > end ? end : start;
            return returning;
          })
          .attr("y", (d: DumbbellDataPoint) => yScale(d.yVal) - 1)
          .attr("height", "2px")
          .attr("opacity", (d: DumbbellDataPoint) => {
            if (d.startXVal === 0 || d.endXVal === 0) {
              return 0;
            }
            return d.yVal ? 0.5 : 0;
          })
          .attr("width", (d: DumbbellDataPoint) =>
            Math.abs(xScale(d.endXVal) - xScale(d.startXVal))
          );

        components
          .attr(
            "transform",
            "translate(0,-" + (offset.bottom - offset.top) + ")"
          )
          .on("mouseover", function() {
            circle_tooltip.style("display", null);
          })
          .on("mouseout", function() {
            circle_tooltip.style("display", "none");
          })
          .on("mousemove", function(d:DumbbellDataPoint) {
            var xPosition = mouse(this as any)[0] - 20;
            var yPosition = mouse(this as any)[1] - 40;
            circle_tooltip.attr(
              "transform",
              "translate(" + xPosition + "," + yPosition + ")"
            );
            circle_tooltip
              .select("text")
              .text(
                "start " +
                  d.startXVal +
                  " end " +
                  d.endXVal +
                  " transfused " +
                  d.yVal
              );
          })
          .on("click", function(d:DumbbellDataPoint) {
            // console.log(d.visit_no);
            // that.props.ID_selection_handler(d.visit_no);
            console.log(d.caseId);
            //that.props.ID_selection_handler(d.case_id);
            //d3.event.stopPropagation();
          });

        const xAxisLabel = axisBottom(xScale);
        const yAxisLabel = axisLeft(yScale);

        svg
          .select("#x-axis")
          .attr("transform", "translate(0," + (height - offset.bottom) + ")")
          .call(xAxisLabel as any);

        svg
          .select("#y-axis")
          .attr(
            "transform",
            "translate(" +
              offset.left +
              ",-" +
              (offset.bottom - offset.top) +
              ")"
          )
          .call(yAxisLabel as any);
        svg
          .select(".x-label")
          .attr("x", width - 10)
          .attr("y", height - 10)
          .attr("alignment-baseline", "baseline")
          .attr("font-size", "10px")
          .attr("text-anchor", "end")
          .text("hemoglobin");

        svg
          .select(".y-label")
          .attr("y", offset.top + 5)
          .attr("x", -offset.top - 5)
          .attr("font-size", "10px")
          .attr("text-anchor", "end")
          .attr("transform", "rotate(-90)")
          .text(yAxis);
    }

    return (<></>)
}

export default inject("store")(observer(DumbbellChart));