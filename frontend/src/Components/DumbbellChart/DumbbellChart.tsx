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
  median,
} from "d3";
import { DumbbellDataPoint, minimumOffset, AxisLabelDict, SelectSet } from "../../Interfaces/ApplicationState";
import CustomizedAxis from "../CustomizedAxis";
import { preop_color, basic_gray, highlight_color, postop_color } from "../../ColorProfile"

interface OwnProps {
  yAxisName: string;
  //chartId: string;
  store?: Store;
  dimension: { width: number, height: number }
  data: DumbbellDataPoint[];
  svg: React.RefObject<SVGSVGElement>
  // yMax: number;
  xRange: { xMin: number, xMax: number };
  aggregation?: string;
  sortMode: string;
  showingAttr: { preop: boolean, postop: boolean, gap: boolean }
}

export type Props = OwnProps;

const DumbbellChart: FC<Props> = ({ showingAttr, sortMode, yAxisName, dimension, data, svg, store, xRange, aggregation }: Props) => {

  const [averageForEachTransfused, setAverage] = useState<any>({})
  const [sortedData, setSortedData] = useState<DumbbellDataPoint[]>([])
  const [numberList, setNumberList] = useState<{ num: number, indexEnding: number }[]>([])
  const [datapointsDict, setDataPointDict] = useState<{ title: any, dataPointList: DumbbellDataPoint[] }[]>([])

  const {
    //dumbbellSorted,
    currentSelectPatient, currentSelectSet } = store!;
  const svgSelection = select(svg.current);

  useEffect(() => {
    let tempNumberList: { num: number, indexEnding: number }[] = [];
    let tempDatapointsDict: { title: any, dataPointList: DumbbellDataPoint[] }[] = [];
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

      let currentPreopSum: number[] = [];
      let currentPostopSum: number[] = [];
      let dataPointList: DumbbellDataPoint[] = [];
      let averageDict: any = {}
      tempSortedData.map((d, i) => {
        dataPointList.push(d)
        if (i === tempSortedData.length - 1) {
          tempNumberList.push({ num: d.yVal, indexEnding: i })
          averageDict[d.yVal] = { averageStart: median(currentPreopSum), averageEnd: median(currentPostopSum) }
          tempDatapointsDict.push({ title: d.yVal, dataPointList: dataPointList })
        }
        else if (d.yVal !== tempSortedData[i + 1].yVal) {
          tempNumberList.push({ num: d.yVal, indexEnding: i })
          averageDict[(d.yVal).toString()] = { averageStart: median(currentPreopSum), averageEnd: median(currentPostopSum) }
          tempDatapointsDict.push({ title: d.yVal, dataPointList: dataPointList })
          currentPostopSum = [];
          currentPreopSum = [];
          dataPointList = [];
        }
        currentPreopSum.push(d.startXVal)
        currentPostopSum.push(d.endXVal)

      })
      setAverage(averageDict)
      setSortedData(tempSortedData)
      setDataPointDict(tempDatapointsDict)
      setNumberList(tempNumberList)
    }
  }, [data, sortMode])
  //let numberList: { num: number, indexEnding: number }[] = [];

  //console.log(data)

  const [testValueScale, valueScale] = useMemo(() => {
    const testValueScale = scaleLinear()
      .domain([0.9 * xRange.xMin, 1.1 * xRange.xMax])
      .range([dimension.height - minimumOffset.bottom, minimumOffset.top]);


    // let valueScale;
    // let valueScale = scalePow()
    //   .exponent(0.5)
    //   .domain([0, 1.1 * yMax])
    //   .range([minimumOffset.left, dimension.width - minimumOffset.right - minimumOffset.margin]);

    const indices = range(0, data.length)

    const valueScale = scaleOrdinal()
      .domain(indices as any)
      .range(range(minimumOffset.left, dimension.width - minimumOffset.right, (dimension.width - minimumOffset.left - minimumOffset.right) / (data.length + 1)));
    // console.log(ticks(minimumOffset.left, dimension.width - minimumOffset.right - minimumOffset.margin, data.length))
    // .range([minimumOffset.left, dimension.width - minimumOffset.right - minimumOffset.margin]);
    console.log(datapointsDict)
    return [testValueScale, valueScale];
  }, [dimension, data, xRange, datapointsDict]);

  const testLabel = axisLeft(testValueScale);
  //if (!dumbbellSorted) {
  // const yAxisLabel = axisBottom(valueScale as ScaleOrdinal<number, number>);
  // svgSelection
  //   .select(".axes")
  //   .select(".y-axis")
  //   .attr(
  //     "transform",
  //     `translate(0 ,${dimension.height - minimumOffset.bottom} )`
  //   )
  //   .attr('display', null)

  //   .call(yAxisLabel as any);
  svgSelection
    .select(".axes")
    .select(".y-label")
    .attr("display", null)
    .attr("y", dimension.height - minimumOffset.bottom + 20)
    .attr("x", 0.5 * (dimension.width + minimumOffset.left))
    .attr("font-size", "11px")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "hanging")
    // .attr("transform", `translate(0 ,${minimumOffset.top}`)
    .text(
      AxisLabelDict[yAxisName] ? AxisLabelDict[yAxisName] : yAxisName
    );
  svgSelection.select('.axes')
    .select(".x-axis")
    .attr("transform", `translate(${minimumOffset.left}, 0)`)
    .call(testLabel as any);



  svgSelection
    .select(".axes")
    .select(".x-label")
    .attr("x", -0.5 * dimension.height + 1.5 * minimumOffset.bottom)
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
        <g className="y-axis" transform={`translate(0,${dimension.height - minimumOffset.bottom})`}>
          <CustomizedAxis scale={valueScale as ScaleOrdinal<any, number>} numberList={numberList} />
        </g>
        <text className="x-label" style={{ textAnchor: "end" }} />
        <text className="y-label" style={{ textAnchor: "end" }} />
      </g>
      <g className="chart-comp" >
        <line x1={minimumOffset.left} x2={dimension.width - minimumOffset.right} y1={testValueScale(13)} y2={testValueScale(13)} style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }} />


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
              key={`${dataPoint.case.visitNum}-${dataPoint.case.caseId}`}
              trigger={
                <DumbbellG surgeonselected={decideIfSurgeon(dataPoint)} dataPoint={dataPoint} >
                  <Rect
                    x={xVal - 1
                    }
                    y={returning}
                    height={rectDifference}
                    isselected={decideIfSelected(dataPoint)}
                    display={showingAttr.gap ? undefined : "none"}
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
                    display={showingAttr.preop ? undefined : "none"}
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
                    display={showingAttr.postop ? undefined : "none"}
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
  opacity:${props => props.isselected ? 1 : 0.8}
`;

const Rect = styled(`rect`) <RectProps>`
 width:1.5px
 opacity:${props => props.isselected ? 1 : 0.5}
 fill: ${props => (props.isselected ? highlight_color : basic_gray)};
`;

const Line = styled(`line`) < AverageLineProps>`
    stroke: ${props => (props.ispreop ? preop_color : postop_color)};
    stroke-width:3px  
    `