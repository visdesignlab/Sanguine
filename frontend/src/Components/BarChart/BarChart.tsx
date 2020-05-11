import React, {
  FC,
  useMemo,
  useEffect,
  useState
} from "react";
import { actions } from "../..";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import {
  select,
  scaleLinear,
  scaleBand,
  max,
  axisLeft,
  axisBottom,
  interpolateGreys,
  line,
  curveCatmullRom
} from "d3";
import {
  BarChartDataPoint,
  offset,
  extraPairWidth,
  extraPairPadding,
  AxisLabelDict,
  BloodProductCap
} from "../../Interfaces/ApplicationState";
import { Popup, Button, Icon } from 'semantic-ui-react'
import SingleViolinPlot from "./SingleViolinPlot";
import SingleStripPlot from "./SingleStripPlot";

import ExtraPairPlotGenerator from "../Utilities/ExtraPairPlotGenerator";

interface OwnProps {
  aggregatedBy: string;
  valueToVisualize: string;
  chartId: string;
  store?: Store;
  dimensionWhole: { width: number, height: number }
  data: BarChartDataPoint[];
  svg: React.RefObject<SVGSVGElement>;
  yMax: number;
  //  selectedVal: number | null;
  stripPlotMode: boolean;
  extraPairDataSet: { name: string, data: any[], type: string, kdeMax?: number, medianSet?: any }[];
}

export type Props = OwnProps;

const BarChart: FC<Props> = ({ extraPairDataSet, stripPlotMode, store, aggregatedBy, valueToVisualize, dimensionWhole, data, svg, yMax, chartId }: Props) => {

  const svgSelection = select(svg.current);

  const {
    // perCaseSelected,
    currentSelectPatient,
    currentSelectSet,
    currentOutputFilterSet
  } = store!;

  const currentOffset = offset.regular;
  const [extraPairTotalWidth, setExtraPairTotlaWidth] = useState(0)

  useEffect(() => {
    let totalWidth = 0
    extraPairDataSet.forEach((d) => {
      totalWidth += (extraPairWidth[d.type] + extraPairPadding)
    })
    setExtraPairTotlaWidth(totalWidth)
  }, [extraPairDataSet])

  const [dimension, aggregationScale, valueScale, caseScale, lineFunction] = useMemo(() => {
    const caseMax = max(data.map(d => d.caseCount)) || 0;
    const caseScale = scaleLinear().domain([0, caseMax]).range([0.25, 0.8])
    const dimension = {
      height: dimensionWhole.height,
      width: dimensionWhole.width - extraPairTotalWidth
    }

    let kdeMax = 0
    const xVals = data
      .map(function (dp) {
        const max_temp = max(dp.kdeCal, d => d.y)
        kdeMax = kdeMax > max_temp ? kdeMax : max_temp;
        return dp.aggregateAttribute;
      })
      .sort();

    let valueScale = scaleLinear()
      .domain([0, BloodProductCap[valueToVisualize]])
      .range([currentOffset.left, dimension.width - currentOffset.right - currentOffset.margin]);

    let aggregationScale = scaleBand()
      .domain(xVals)
      .range([dimension.height - currentOffset.bottom, currentOffset.top])
      .paddingInner(0.1);

    const kdeScale = scaleLinear()
      .domain([0, kdeMax])
      .range([0.5 * aggregationScale.bandwidth(), 0])
    // const kdeReverseScale = scaleLinear().domain([0,kdeMax]).range([0.5*aggregationScale.bandwidth(),aggregationScale.bandwidth()])

    const lineFunction = line()
      .curve(curveCatmullRom)
      .y((d: any) => kdeScale(d.y))
      .x((d: any) => valueScale(d.x) - currentOffset.left);

    // const reverseLineFunction = line()
    //   .curve(curveCatmullRom)
    //   .y((d: any) => kdeScale(d.y))
    //   .x((d: any) => valueScale(d.x) - currentOffset.left);
    return [dimension, aggregationScale, valueScale, caseScale, lineFunction];
  }, [dimensionWhole, data, yMax, extraPairDataSet])

  const aggregationLabel = axisLeft(aggregationScale);
  const yAxisLabel = axisBottom(valueScale);

  svgSelection
    .select(".axes")
    .select(".x-axis")
    .attr(
      "transform",
      `translate(${currentOffset.left + extraPairTotalWidth}, 0)`
    )
    .call(aggregationLabel as any)
    .selectAll("text")
    .attr("transform", `translate(-35,0)`)

  svgSelection
    .select(".axes")
    .select(".y-axis")
    .attr(
      "transform",
      `translate(${extraPairTotalWidth} ,${dimension.height - currentOffset.bottom})`
    )
    .call(yAxisLabel as any);

  svgSelection
    // .select(".axes")
    .select(".x-label")
    .attr("x", valueScale(BloodProductCap[valueToVisualize] * 0.5))
    .attr("y", dimension.height - currentOffset.bottom + 20)
    .attr("alignment-baseline", "hanging")
    .attr("font-size", "11px")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(${extraPairTotalWidth},0)`)
    .text(() => {
      //const trailing = perCaseSelected ? " / Case" : "";
      return AxisLabelDict[valueToVisualize] ? AxisLabelDict[valueToVisualize] : valueToVisualize
    }
    );

  svgSelection
    //.select(".axes")
    .select(".y-label")
    .attr("y", dimension.height - currentOffset.bottom + 20)
    .attr("x", currentOffset.left - 55)
    .attr("font-size", "11px")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "hanging")
    .attr("transform", `translate(${extraPairTotalWidth},0)`)
    .text(
      AxisLabelDict[aggregatedBy] ? AxisLabelDict[aggregatedBy] : aggregatedBy
    );

  const decideIfSelected = (d: BarChartDataPoint) => {
    if (currentSelectPatient) {
      return currentSelectPatient[aggregatedBy] === d.aggregateAttribute
    }
    else if (currentSelectSet.length > 0) {
      //let selectSet: SelectSet;
      for (let selectSet of currentSelectSet) {
        if (aggregatedBy === selectSet.set_name && selectSet.set_value.includes(d.aggregateAttribute))
          return true;
      }
      return false;
    }
    else {
      return false;
    }
    //  return true;
  }

  const decideIfFiltered = (d: BarChartDataPoint) => {
    for (let filterSet of currentOutputFilterSet) {
      if (aggregatedBy === filterSet.set_name && filterSet.set_value.includes(d.aggregateAttribute))
        return true
    }
    return false;
  }


  // const decideIfSelected = (d: BarChartDataPoint) => {
  //   if (selectedVal) {
  //     return selectedVal === d.aggregateAttribute
  //   }
  //   else if (currentSelectSet.length > 0) {
  //     //let selectSet: SelectSet;
  //     for (let selectSet of currentSelectSet) {
  //       if (d.case[selectSet.set_name] === selectSet.set_value)
  //         return true;
  //     }
  //     return

  //   else {
  //     return false;
  //   }
  // }



  const outputSinglePlotElement = (dataPoint: BarChartDataPoint) => {
    if (stripPlotMode) {
      return ([<SingleStripPlot
        isSelected={decideIfSelected(dataPoint)}
        bandwidth={aggregationScale.bandwidth()}
        valueScale={valueScale}
        aggregatedBy={aggregatedBy}
        dataPoint={dataPoint}
        howToTransform={(`translate(-${currentOffset.left},${aggregationScale(
          dataPoint.aggregateAttribute
        )})`).toString()}
      />])
    } else {
      return ([<SingleViolinPlot
        path={lineFunction(dataPoint.kdeCal)!}
        dataPoint={dataPoint}
        aggregatedBy={aggregatedBy}
        isSelected={decideIfSelected(dataPoint)}
        isFiltered={decideIfFiltered(dataPoint)}
        howToTransform={(`translate(0,${aggregationScale(
          dataPoint.aggregateAttribute
        )})`).toString()}
      />])
    }

  }

  return (
    <>
      <line x1={1} x2={1} y1={currentOffset.top} y2={dimension.height - currentOffset.bottom} style={{ stroke: "#e5e5e5", strokeWidth: "1" }} />
      <g className="axes">
        <g className="x-axis"></g>
        <g className="y-axis"></g>
        <text className="x-label" />
        <text className="y-label" />
      </g>
      <g className="chart"
        transform={`translate(${currentOffset.left + extraPairTotalWidth},0)`}
      >
        {data.map((dataPoint) => {
          return outputSinglePlotElement(dataPoint).concat([
            <rect
              fill={interpolateGreys(caseScale(dataPoint.caseCount))}
              x={-40}
              y={aggregationScale(dataPoint.aggregateAttribute)}
              width={35}
              height={aggregationScale.bandwidth()}
            />,
            <text
              fill="white"
              x={-22.5}
              y={
                aggregationScale(dataPoint.aggregateAttribute)! +
                0.5 * aggregationScale.bandwidth()
              }
              alignmentBaseline={"central"}
              textAnchor={"middle"}
            >
              {dataPoint.caseCount}
            </text>, <line
              x1={valueScale(dataPoint.median) - currentOffset.left}
              x2={valueScale(dataPoint.median) - currentOffset.left}
              y1={aggregationScale(dataPoint.aggregateAttribute)}
              y2={
                aggregationScale(dataPoint.aggregateAttribute)! +
                aggregationScale.bandwidth()
              }
              stroke="#d98532"
              strokeWidth="2px"
            />,
          ]);
        })}
      </g>
      <g className="extraPairChart">
        <ExtraPairPlotGenerator aggregationScale={aggregationScale} extraPairDataSet={extraPairDataSet} dimension={dimension} chartId={chartId} />
      </g>


    </>
  );
}
export default inject("store")(observer(BarChart));

const ExtraPairText = styled(`text`)`
  font-size: 11px
  text-anchor: middle
  alignment-baseline:hanging
  cursor:pointer
`
