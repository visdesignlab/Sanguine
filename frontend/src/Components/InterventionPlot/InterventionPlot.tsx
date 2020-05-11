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
    axisTop,
    interpolateBlues,
    axisBottom,
    interpolateGreys,
    line,
    curveCatmullRom,
    scaleOrdinal,
    range,
    ScaleOrdinal,
    ScaleBand,
    interpolateReds,
    timeFormat
} from "d3";
import {
    InterventionDataPoint,
    AxisLabelDict,
    BloodProductCap,
    offset
} from "../../Interfaces/ApplicationState";
import { Popup, Button, Icon } from 'semantic-ui-react'

//import SingleHeatPlot from "./SingleHeatPlot";

//import ExtraPairPlotGenerator from "../Utilities/ExtraPairPlotGenerator";
import { secondary_gray, third_gray } from "../../ColorProfile";
import SingleHeatCompare from "./SingleHeatCompare";
import SingleViolinCompare from "./SingleViolinCompare";

interface OwnProps {
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
    store?: Store;
    dimensionWhole: { width: number, height: number }
    data: InterventionDataPoint[];
    svg: React.RefObject<SVGSVGElement>;
    yMax: number;
    plotType: string;
    interventionDate: number;
    //  selectedVal: number | null;
    // stripPlotMode: boolean;
    //extraPairDataSet: { name: string, data: any[], type: string, kdeMax?: number, medianSet?: any }[];
}

export type Props = OwnProps;

const InterventionPlot: FC<Props> = ({ plotType, interventionDate, store, aggregatedBy, valueToVisualize, dimensionWhole, data, svg, yMax }: Props) => {

    const svgSelection = select(svg.current);

    const {
        // perCaseSelected,
        currentSelectPatient,
        currentOutputFilterSet,
        currentSelectSet
    } = store!;

    const currentOffset = offset.intervention;

    const [dimension, aggregationScale, valueScale, caseScale, lineFunction, linearValueScale] = useMemo(() => {

        const caseMax = max(data.map(d => (d.preCaseCount + d.postCaseCount))) || 0;
        const caseScale = scaleLinear().domain([0, caseMax]).range([0.25, 0.8])
        const dimension = {
            height: dimensionWhole.height,
            width: dimensionWhole.width
        }


        let kdeMax = 0
        const xVals = data

            .map(dp => {
                const max_temp = max([max(dp.preInKdeCal, d => d.y), max(dp.postInKdeCal, d => d.y)])
                kdeMax = kdeMax > max_temp ? kdeMax : max_temp;
                return dp.aggregateAttribute
            })
            .sort();
        let outputRange
        if (valueToVisualize === "CELL_SAVER_ML") {
            outputRange = range(0, BloodProductCap[valueToVisualize] + 100, 100)
        } else {
            outputRange = range(0, BloodProductCap[valueToVisualize] + 1)
        }
        //console.log(data)
        let valueScale = scaleBand()
            .domain(outputRange as any)
            .range([currentOffset.left, dimension.width - currentOffset.right - currentOffset.margin])
            .paddingInner(0.01);


        let linearValueScale = scaleLinear()
            .domain([0, BloodProductCap[valueToVisualize]])
            .range([currentOffset.left, dimension.width - currentOffset.right - currentOffset.margin]);

        let aggregationScale = scaleBand()
            .domain(xVals)
            .range([dimension.height - currentOffset.bottom, currentOffset.top])
            .paddingInner(0.1);




        const kdeScale = scaleLinear()
            .domain([0, kdeMax])
            .range([0.25 * aggregationScale.bandwidth(), 0])

        const lineFunction = line()
            .curve(curveCatmullRom)
            .y((d: any) => kdeScale(d.y))
            .x((d: any) => linearValueScale(d.x) - currentOffset.left);

        return [dimension, aggregationScale, valueScale, caseScale, lineFunction, linearValueScale];
    }, [dimensionWhole, data, yMax])

    const aggregationLabel = axisLeft(aggregationScale);
    const valueLabel = plotType === "HEATMAP" ? axisBottom(valueScale).tickFormat(d => d === BloodProductCap[valueToVisualize] ? `${d}+` : d) : axisBottom(linearValueScale);

    svgSelection
        .select(".axes")
        .select(".x-axis")
        .attr(
            "transform",
            `translate(${currentOffset.left}, 0)`
        )
        .call(aggregationLabel as any)
        .selectAll("text")
        .attr("transform", `translate(-35,0)`)

    svgSelection
        .select(".axes")
        .select(".y-axis")
        .attr(
            "transform",
            `translate(0 ,${dimension.height - currentOffset.bottom})`
        )
        .call(valueLabel as any);

    if (plotType === "HEATMAP") {
        svgSelection
            .select(".axes")
            .select(".y-axis")
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick").selectAll("line").remove());
    }

    svgSelection
        // .select(".axes")
        .select(".x-label")
        .attr("x", dimension.width * 0.5)
        .attr("y", dimension.height - currentOffset.bottom + 20)
        .attr("alignment-baseline", "hanging")
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        // .attr("transform", `translate(${extraPairTotalWidth},0)`)
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
        // .attr("transform", `translate(${extraPairTotalWidth},0)`)
        .text(
            AxisLabelDict[aggregatedBy] ? AxisLabelDict[aggregatedBy] : aggregatedBy
        );

    const decideIfSelected = (d: InterventionDataPoint) => {
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
    const decideIfFiltered = (d: InterventionDataPoint) => {
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


    const outputSinglePlotElement = (dataPoint: InterventionDataPoint) => {

        if (plotType === "HEATMAP") {
            return ([<SingleHeatCompare
                isSelected={decideIfSelected(dataPoint)}
                isFiltered={decideIfFiltered(dataPoint)}
                bandwidth={aggregationScale.bandwidth()}
                valueScale={valueScale as ScaleBand<any>}
                aggregatedBy={aggregatedBy}
                dataPoint={dataPoint}
                howToTransform={(`translate(-${currentOffset.left},${aggregationScale(
                    dataPoint.aggregateAttribute
                )})`).toString()}
            />])


        }
        else {
            return ([<SingleViolinCompare
                preIntPath={lineFunction(dataPoint.preInKdeCal)!}
                postIntPath={lineFunction(dataPoint.postInKdeCal)!}
                dataPoint={dataPoint}
                aggregatedBy={aggregatedBy}
                isSelected={decideIfSelected(dataPoint)}
                isFiltered={decideIfFiltered(dataPoint)}
                preIntHowToTransform={(`translate(0,${aggregationScale(
                    dataPoint.aggregateAttribute
                )})`).toString()}
                postIntHowToTransform={(`translate(0,${aggregationScale(dataPoint.aggregateAttribute)! + aggregationScale.bandwidth() * 0.5})`).toString()}
            />])
        }

    }

    const outputTextElement = (dataPoint: InterventionDataPoint) => {
        if (aggregationScale.bandwidth() > 40) {
            return ([<text
                fill="white"
                x={-22.5}
                y={
                    aggregationScale(dataPoint.aggregateAttribute)! +
                    0.25 * aggregationScale.bandwidth()
                }
                alignmentBaseline={"central"}
                textAnchor={"middle"}
            >
                {dataPoint.preCaseCount}
            </text>, <text
                fill="white"
                x={-22.5}
                y={
                    aggregationScale(dataPoint.aggregateAttribute)! +
                    0.75 * aggregationScale.bandwidth()
                }
                alignmentBaseline={"central"}
                textAnchor={"middle"}
            >
                {dataPoint.postCaseCount}
            </text>])
        } else {
            return ([<text
                fill="white"
                x={-22.5}
                y={
                    aggregationScale(dataPoint.aggregateAttribute)! +
                    0.5 * aggregationScale.bandwidth()
                }
                alignmentBaseline={"central"}
                textAnchor={"middle"}
            >
                {dataPoint.preCaseCount + dataPoint.postCaseCount}
            </text>])
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

            <g className="legend" display={plotType === "HEATMAP" ? "" : "None"}>
                <defs>
                    <linearGradient id="gradient1" x1="0" x2="1" y1="0" y2="0" colorInterpolation="CIE-LCHab">
                        <stop offset="0%" stopColor={interpolateReds(0.1)} />
                        <stop offset="50%" stopColor={interpolateReds(0.55)} />
                        <stop offset="100%" stopColor={interpolateReds(1)} />
                    </linearGradient>
                </defs>
                <rect
                    x={0.7 * dimension.width}
                    y={0}
                    width={0.2 * dimension.width}
                    height={10}
                    fill="url(#gradient1)" />
                <text
                    x={0.7 * dimension.width}
                    y={10}
                    alignmentBaseline={"hanging"}
                    textAnchor={"start"}
                    fontSize="11px"
                    fill={third_gray}>
                    0%
                </text>
                <text
                    x={0.9 * dimension.width}
                    y={10}
                    alignmentBaseline={"hanging"}
                    textAnchor={"end"}
                    fontSize="11px"
                    fill={third_gray}>
                    100%
                </text>
                <text
                    x={0.5 * dimension.width}
                    y={0}
                    alignmentBaseline="hanging"
                    textAnchor="middle"
                    fontSize="13px"
                    fill={third_gray}
                >Intervention: {timeFormat("%Y-%m-%d")(new Date(interventionDate))}</text>
            </g>

            <g className="chart"
                transform={`translate(${currentOffset.left},0)`}
            >
                {data.map((dataPoint) => {
                    return outputSinglePlotElement(dataPoint)

                        .concat([
                            <rect
                                fill={interpolateGreys(caseScale(dataPoint.preCaseCount))}
                                x={-40}
                                y={aggregationScale(dataPoint.aggregateAttribute)}
                                width={35}
                                height={aggregationScale.bandwidth() * 0.5}
                            />,
                            <rect fill={interpolateGreys(caseScale(dataPoint.postCaseCount))}
                                x={-40}
                                y={aggregationScale(dataPoint.aggregateAttribute)! + aggregationScale.bandwidth() * 0.5} width={35}
                                height={aggregationScale.bandwidth() * 0.5} />,



                        ].concat(outputTextElement(dataPoint)));
                })}
            </g>



        </>
    );
}
export default inject("store")(observer(InterventionPlot));
