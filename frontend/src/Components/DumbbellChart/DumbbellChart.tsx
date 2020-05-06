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
  scalePow,
  ticks,
} from "d3";
import { DumbbellDataPoint, offset, AxisLabelDict, SelectSet } from "../../Interfaces/ApplicationState";
import CustomizedAxis from "../CustomizedAxis";
import { preop_color, basic_gray, highlight_color, postop_color } from "../../ColorProfile"

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
  sortMode: string;
}

export type Props = OwnProps;

const DumbbellChart: FC<Props> = ({ sortMode, yAxisName, dimension, data, svg, store, yMax, xRange, aggregation }: Props) => {

  const [averageForEachTransfused, setAverage] = useState<any>({})
  const [sortedData, setSortedData] = useState<DumbbellDataPoint[]>([])
  const [numberList, setNumberList] = useState<{ num: number, indexEnding: number }[]>([])

  const {
    //dumbbellSorted,
    currentSelectPatient, currentSelectSet } = store!;
  const svgSelection = select(svg.current);

  useEffect(() => {
    let tempNumberList: { num: number, indexEnding: number }[] = [];
    if (data.length > 0) {
      let tempSortedData: DumbbellDataPoint[] = [];
      switch (sortMode) {
        case "Postop":
          tempSortedData = data.sort(
            (a, b) => {
              if (a.yVal === b.yVal) {
                if (a.endXVal > b.endXVal) return 1;
                if (a.endXVal < b.endXVal) return -1;
              } else {
                if (a.yVal > b.yVal) return 1;
                if (a.yVal < b.yVal) return -1;
              }
              return 0;
            }
          );
          break;
        case "Preop":
          tempSortedData = data.sort(
            (a, b) => {
              if (a.yVal === b.yVal) {
                if (a.startXVal > b.startXVal) return 1;
                if (a.startXVal < b.startXVal) return -1;
              } else {
                if (a.yVal > b.yVal) return 1;
                if (a.yVal < b.yVal) return -1;
              }
              return 0;
            }
          );
          break;
        case "Gap":
          tempSortedData = data.sort(
            (a, b) => {
              if (a.yVal === b.yVal) {
                if (Math.abs(a.endXVal - a.startXVal) > Math.abs(b.endXVal - b.startXVal)) return 1;
                if (Math.abs(a.endXVal - a.startXVal) < Math.abs(b.endXVal - b.startXVal)) return -1;
              } else {
                if (a.yVal > b.yVal) return 1;
                if (a.yVal < b.yVal) return -1;
              }
              return 0;
            }
          );
          break;
        default:
          break;
      }

      let currentPreopSum = 0;
      let currentPostopSum = 0;
      let currentCounter = 0;
      let averageDict: any = {}
      tempSortedData.map((d, i) => {

        if (i === tempSortedData.length - 1) {
          tempNumberList.push({ num: d.yVal, indexEnding: i })
          averageDict[d.yVal] = { averageStart: currentPreopSum / currentCounter, averageEnd: currentPostopSum / currentCounter }
        }
        else if (d.yVal !== tempSortedData[i + 1].yVal) {
          tempNumberList.push({ num: d.yVal, indexEnding: i })
          averageDict[(d.yVal).toString()] = { averageStart: currentPreopSum / currentCounter, averageEnd: currentPostopSum / currentCounter }
          currentPostopSum = 0;
          currentPreopSum = 0;
          currentCounter = 0;
        }
        currentPreopSum += d.startXVal
        currentPostopSum += d.endXVal
        currentCounter += 1
      })
      setAverage(averageDict)
      setSortedData(tempSortedData)
      setNumberList(tempNumberList)
    }
  }, [data, sortMode])
  //let numberList: { num: number, indexEnding: number }[] = [];

  //console.log(data)

  const [testValueScale, valueScale] = useMemo(() => {
    const testValueScale = scaleLinear()
      .domain([0.9 * xRange.xMin, 1.1 * xRange.xMax])
      .range([dimension.height - offset.bottom, offset.top]);


    // let valueScale;
    // let valueScale = scalePow()
    //   .exponent(0.5)
    //   .domain([0, 1.1 * yMax])
    //   .range([offset.left, dimension.width - offset.right - offset.margin]);

    const indices = range(0, data.length)

    const valueScale = scaleOrdinal()
      .domain(indices as any)
      .range(range(offset.left, dimension.width - offset.right, (dimension.width - offset.left - offset.right) / (data.length + 1)));
    // console.log(ticks(offset.left, dimension.width - offset.right - offset.margin, data.length))
    // .range([offset.left, dimension.width - offset.right - offset.margin]);

    return [testValueScale, valueScale];
  }, [dimension, data, yMax, xRange,
  ]);

  const testLabel = axisLeft(testValueScale);
  //if (!dumbbellSorted) {
  // const yAxisLabel = axisBottom(valueScale as ScaleOrdinal<number, number>);
  // svgSelection
  //   .select(".axes")
  //   .select(".y-axis")
  //   .attr(
  //     "transform",
  //     `translate(0 ,${dimension.height - offset.bottom} )`
  //   )
  //   .attr('display', null)

  //   .call(yAxisLabel as any);
  svgSelection
    .select(".axes")
    .select(".y-label")
    .attr("display", null)
    .attr("y", dimension.height - offset.bottom + 20)
    .attr("x", 0.5 * (dimension.width + offset.left))
    .attr("font-size", "11px")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "hanging")
    // .attr("transform", `translate(0 ,${offset.top}`)
    .text(
      AxisLabelDict[yAxisName] ? AxisLabelDict[yAxisName] : yAxisName
    );
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

    if (currentSelectPatient && d.case.caseId > 0) {
      return currentSelectPatient.caseId === d.case.caseId
    }
    else if (aggregation && currentSelectPatient) {
      return d.case[aggregation] === currentSelectPatient[aggregation]
    }

    else {
      return false;
    }
    //  return true;
  }

  const decideIfSurgeon = (d: DumbbellDataPoint) => {

    if (currentSelectSet) {
      return d.case[currentSelectSet.set_name] === currentSelectSet.set_value
    }
    return true;

  }



  const clickDumbbellHandler = (d: DumbbellDataPoint) => {
    if (aggregation) {
      actions.selectSet({ set_name: aggregation, set_value: d.case[aggregation] })
    } else {
      actions.selectPatient(d.case)
    }
  }
  return (
    <>
      <g className="axes">
        <g className="x-axis"></g>
        <g className="y-axis" transform={`translate(0,${dimension.height - offset.bottom})`}>
          <CustomizedAxis scale={valueScale as ScaleOrdinal<any, number>} numberList={numberList} />
        </g>
        <text className="x-label" style={{ textAnchor: "end" }} />
        <text className="y-label" style={{ textAnchor: "end" }} />
      </g>
      <g className="chart-comp" >
        <line x1={offset.left} x2={dimension.width - offset.right} y1={testValueScale(11)} y2={testValueScale(11)} style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }} />


        {sortedData.map((dataPoint, index) => {
          const start = testValueScale(dataPoint.startXVal);
          const end = testValueScale(dataPoint.endXVal);
          const returning = start > end ? end : start;
          const rectDifference = Math.abs(end - start)

          const xVal = (valueScale as ScaleOrdinal<any, number>)(index)
          // valueScale(dataPoint.yVal) -
          // (Math.abs(dataPoint.startXVal - dataPoint.endXVal) / (xRange.xMax - xRange.xMin)) *
          // (valueScale(dataPoint.yVal) - valueScale(dataPoint.yVal - 1))
          // -
          // Math.random() * 3;

          return (
            <Popup
              content={`${dataPoint.startXVal} -> ${dataPoint.endXVal}, ${dataPoint.yVal}`}
              key={dataPoint.case.caseId}
              trigger={
                <DumbbellG surgeonselected={decideIfSurgeon(dataPoint)} dataPoint={dataPoint} >
                  <Rect
                    x={xVal - 1
                    }
                    y={returning}
                    height={rectDifference}
                    isselected={decideIfSelected(dataPoint)}
                  />
                  <Circle
                    cx={
                      xVal
                    }
                    cy={testValueScale(dataPoint.startXVal)}
                    onClick={() => {
                      clickDumbbellHandler(dataPoint);
                    }}
                    isselected={decideIfSelected(dataPoint)}
                    ispreop={true}
                  />
                  <Circle
                    cx={
                      xVal
                    }
                    cy={testValueScale(dataPoint.endXVal)}
                    onClick={() => {
                      clickDumbbellHandler(dataPoint);
                    }}
                    isselected={decideIfSelected(dataPoint)}
                    ispreop={false}
                  />
                </DumbbellG>
              }
            />
          );
        })}
        {numberList.map((numberOb, ind) => {
          if (Object.keys(averageForEachTransfused).length > 0) {

            const x1 = ind === 0 ? (valueScale as ScaleOrdinal<any, number>)(0) : (valueScale as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding + 1)
            const x2 = (valueScale as ScaleOrdinal<any, number>)(numberOb.indexEnding)
            const beginY = testValueScale(averageForEachTransfused[(numberOb.num).toString()].averageStart)
            const endY = testValueScale(averageForEachTransfused[numberOb.num].averageEnd)
            return ([<Line x1={x1} x2={x2} y1={beginY} y2={beginY} ispreop={true} />, <Line x1={x1} x2={x2} y1={endY} y2={endY} ispreop={false} />
            ])
          }
        })}
      </g>
    </>
  );
}

export default inject("store")(observer(DumbbellChart));

interface DumbbellProps {
  dataPoint: DumbbellDataPoint;
  surgeonselected: boolean;
}

interface DotProps {
  isselected: boolean;
  ispreop: boolean;
}
interface RectProps {
  isselected: boolean;
}

interface AverageLineProps {
  ispreop: boolean;
}
// display: ${props =>
//   props.dataPoint.endXVal === 0 || props.dataPoint.startXVal === 0
//     ? "none"
//     : null} 

const DumbbellG = styled(`g`) <DumbbellProps>`
    visibility:${props => (props.surgeonselected ? "visible" : "hidden")}
`;


const Circle = styled(`circle`) <DotProps>`
  r:4px
  fill: ${props => (props.isselected ? highlight_color : props.ispreop ? preop_color : postop_color)};
  opacity:${props => props.isselected ? 1 : 0.5}
`;

const Rect = styled(`rect`) <RectProps>`
 width:1.5px
 opacity:${props => props.isselected ? 1 : 0.5}
 fill: ${props => (props.isselected ? highlight_color : basic_gray)};
`;

const Line = styled(`line`) < AverageLineProps>`
    stroke: ${props => (props.ispreop ? preop_color : postop_color)};
    stroke-width:2px  
    stroke-dasharray: 5,5
    `