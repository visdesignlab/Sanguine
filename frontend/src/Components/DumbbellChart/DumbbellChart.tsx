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
  axisTop,
} from "d3";
import { DumbbellDataPoint, offset, AxisLabelDict, SelectSet } from "../../Interfaces/ApplicationState";

interface OwnProps {
  yAxisName: string;
  //chartId: string;
  store?: Store;
  dimension: { width: number, height: number }
  data: DumbbellDataPoint[];
  svg: React.RefObject<SVGSVGElement>
  yMax: number;
  xRange: { xMin: number, xMax: number };
  aggregation?: string;
}

export type Props = OwnProps;

const DumbbellChart: FC<Props> = ({ yAxisName, dimension, data, svg, store, yMax, xRange, aggregation }: Props) => {

  const { dumbbellSorted, currentSelectPatient, currentSelectSet } = store!;
  const svgSelection = select(svg.current);
  data = data.sort(
    (a, b) =>
      Math.abs(a.startXVal - a.endXVal) - Math.abs(b.startXVal - b.endXVal)
  );

  const [testValueScale, valueScale] = useMemo(() => {
    const testValueScale = scaleLinear()
      .domain([0.9 * xRange.xMin, 1.1 * xRange.xMax])
      .range([dimension.height - offset.bottom, offset.top]);

    let valueScale;
    if (!dumbbellSorted) {
      valueScale = scaleLinear()
        .domain([0, 1.1 * yMax])
        .range([offset.left, dimension.width - offset.right - offset.margin]);
    }
    else {
      const indices = range(0, data.length)
      valueScale = scaleOrdinal()
        .domain(indices as any)
        .range(range(offset.left, dimension.width - offset.right - offset.margin, -(dimension.width - offset.left - offset.right) / data.length));
      // .range([dimension.height - offset.top, offset.bottom]);

    }
    return [testValueScale, valueScale];
  }, [dimension, data, yMax, xRange, dumbbellSorted]);

  const testLabel = axisLeft(testValueScale);
  if (!dumbbellSorted) {
    const yAxisLabel = axisBottom(valueScale as ScaleLinear<number, number>);
    svgSelection
      .select(".axes")
      .select(".y-axis")
      .attr(
        "transform",
        `translate(0 ,${dimension.height-offset.bottom} )`
      )
      .attr('display', null)

      .call(yAxisLabel as any);
    svgSelection
      .select(".axes")
      .select(".y-label")
      .attr("display", null)
      .attr("y", dimension.height-offset.bottom+20)
      .attr("x", 0.5 * (dimension.width + offset.left))
      .attr("font-size", "11px")
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "hanging")
      // .attr("transform", `translate(0 ,${offset.top}`)
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
    .attr("transform", `translate(${offset.left}, 0)`)
    .call(testLabel as any);



  svgSelection
    .select(".axes")
    .select(".x-label")
    .attr("x", -0.5 * dimension.height + 1.5 * offset.bottom)
    .attr("y", 0)
    .attr("transform", "rotate(-90)")
    .attr("alignment-baseline", "hanging")
    .attr("font-size", "11px")
    .attr("text-anchor", "middle")
    .text("Hemoglobin Value");


  const decideIfSelected = (d: DumbbellDataPoint) => {
    if (currentSelectPatient && d.patientID > 0) {
      return currentSelectPatient.patientID === d.patientID
    }
    else if (aggregation && currentSelectPatient) {
      return d[aggregation] === currentSelectPatient[aggregation]
    }
    else if (currentSelectSet) {
      return d[currentSelectSet.set_name] === currentSelectSet.set_value
    }
    else {
      return false;
    }
    //  return true;
  }

  const clickDumbbellHandler = (d: DumbbellDataPoint) => {
    if (aggregation) {
      actions.selectSet({ set_name: aggregation, set_value: d[aggregation] })
    } else {
      actions.selectPatient(d)
    }
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
        <line x1={offset.left} x2={dimension.width - offset.right} y1={testValueScale(11)} y2={testValueScale(11)} style={{ stroke: "#990D0D", strokeWidth: "2" }} />
        {data.map((dataPoint, index) => {
          const start = testValueScale(dataPoint.startXVal);
          const end = testValueScale(dataPoint.endXVal);
          const returning = start > end ? end : start;
          const rectDifference = Math.abs(end - start)
          return (
            <Popup
              content={`${dataPoint.startXVal} -> ${dataPoint.endXVal}, ${dataPoint.yVal}`}
              key={dataPoint.caseId}
              trigger={
                <DumbbellG
                  dataPoint={dataPoint}
                 transform={`translate(${offset.left},0)`}
                >
                  <Rect
                    x={dumbbellSorted
                      ? (valueScale as ScaleOrdinal<any, any>)(index)
                      : (valueScale as ScaleLinear<number, number>)(
                        dataPoint.yVal
                      ) - 1}
                    y={
                      returning
                    }
                    height={rectDifference}
                    isSelected={decideIfSelected(dataPoint)}
                  />
                  <Circle
                    cx={dumbbellSorted
                      ? (valueScale as ScaleOrdinal<any, any>)(index)
                      : (valueScale as ScaleLinear<number, number>)(
                        dataPoint.yVal
                      )}
                    cy={testValueScale(dataPoint.startXVal)
                    }
                    onClick={() => { clickDumbbellHandler(dataPoint) }}
                    isSelected={decideIfSelected(dataPoint)}
                  />
                  <Circle
                    cx={dumbbellSorted
                      ? (valueScale as ScaleOrdinal<any, any>)(index)
                      : (valueScale as ScaleLinear<number, number>)(
                        dataPoint.yVal
                      )}
                    cy={
                      testValueScale(dataPoint.endXVal)
                    }
                    onClick={() => {
                      clickDumbbellHandler(dataPoint)
                    }}
                    isSelected={decideIfSelected(dataPoint)}


                  />
                </DumbbellG>
              }
            />
          );
        })}
      </g>
    </>
  );
}

export default inject("store")(observer(DumbbellChart));

interface DumbbellProps {
  dataPoint: DumbbellDataPoint;
}

interface DotProps {
  isSelected: boolean;
}

// display: ${props =>
//   props.dataPoint.endXVal === 0 || props.dataPoint.startXVal === 0
//     ? "none"
//     : null} 

const DumbbellG = styled(`g`) <DumbbellProps>`

`;



const Circle = styled(`circle`) <DotProps>`
  r:4px
  fill:${props => (props.isSelected ? '#d98532' : '#20639B')}
`;

const Rect = styled(`rect`) <DotProps>`
 width:1.5px
 opacity:50%
 fill:${props => (props.isSelected ? '#d98532' : '#20639B')}
`;