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
    interpolateReds
} from "d3";
import {
    HeatMapDataPoint,
    offset,
    extraPairWidth,
    extraPairPadding,
    AxisLabelDict,
    BloodProductCap,
    minimumOffset
} from "../../Interfaces/ApplicationState";
import { Popup, Button, Icon } from 'semantic-ui-react'

import SingleHeatPlot from "./SingleHeatPlot";
import ExtraPairPlotGenerator from "../Utilities/ExtraPairPlotGenerator";
import { secondary_gray, third_gray } from "../../ColorProfile";

interface OwnProps {
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
    store?: Store;
    dimensionWhole: { width: number, height: number }
    data: HeatMapDataPoint[];
    svg: React.RefObject<SVGSVGElement>;
    yMax: number;
    //  selectedVal: number | null;
    // stripPlotMode: boolean;
    extraPairDataSet: { name: string, data: any[], type: string, kdeMax?: number, medianSet?: any }[];
}

export type Props = OwnProps;

const HeatMap: FC<Props> = ({ extraPairDataSet, chartId, store, aggregatedBy, valueToVisualize, dimensionWhole, data, svg, yMax }: Props) => {

    const svgSelection = select(svg.current);

    const {
        // perCaseSelected,
        currentSelectPatient,
        currentOutputFilterSet,
        currentSelectSet
    } = store!;

    const [extraPairTotalWidth, setExtraPairTotlaWidth] = useState(0)

    useEffect(() => {
        let totalWidth = 0
        extraPairDataSet.forEach((d) => {
            totalWidth += (extraPairWidth[d.type] + extraPairPadding)
        })
        setExtraPairTotlaWidth(totalWidth)
    }, [extraPairDataSet])

    const [dimension, aggregationScale, valueScale, caseScale] = useMemo(() => {


        const caseMax = max(data.map(d => d.caseCount)) || 0;
        const caseScale = scaleLinear().domain([0, caseMax]).range([0.25, 0.8])
        const dimension = {
            height: dimensionWhole.height,
            width: dimensionWhole.width - extraPairTotalWidth
        }

        const xVals = data
            .map(dp => dp.aggregateAttribute)
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
            .range([offset.left, dimension.width - offset.right - offset.margin])
            .paddingInner(0.01);

        let aggregationScale = scaleBand()
            .domain(xVals)
            .range([dimension.height - offset.bottom, offset.top])
            .paddingInner(0.1);

        return [dimension, aggregationScale, valueScale, caseScale];
    }, [dimensionWhole, data, yMax, extraPairDataSet])

    const aggregationLabel = axisLeft(aggregationScale);
    const valueLabel = axisBottom(valueScale).tickFormat(d => d === BloodProductCap[valueToVisualize] ? `${d}+` : d);

    svgSelection
        .select(".axes")
        .select(".x-axis")
        .attr(
            "transform",
            `translate(${offset.left + extraPairTotalWidth}, 0)`
        )
        .call(aggregationLabel as any)
        .selectAll("text")
        .attr("transform", `translate(-35,0)`)

    svgSelection
        .select(".axes")
        .select(".y-axis")
        .attr(
            "transform",
            `translate(${extraPairTotalWidth} ,${dimension.height - offset.bottom})`
        )
        .call(valueLabel as any)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick").selectAll("line").remove());

    svgSelection
        // .select(".axes")
        .select(".x-label")
        .attr("x", dimension.width * 0.5)
        .attr("y", dimension.height - offset.bottom + 20)
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
        .attr("y", dimension.height - offset.bottom + 20)
        .attr("x", offset.left - 55)
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "hanging")
        .attr("transform", `translate(${extraPairTotalWidth},0)`)
        .text(
            AxisLabelDict[aggregatedBy] ? AxisLabelDict[aggregatedBy] : aggregatedBy
        );

    const decideIfSelected = (d: HeatMapDataPoint) => {
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
    const decideIfFiltered = (d: HeatMapDataPoint) => {
        for (let filterSet of currentOutputFilterSet) {
            if (aggregatedBy === filterSet.set_name && filterSet.set_value.includes(d.aggregateAttribute))
                return true
        }
        return false;
    }


    const outputSinglePlotElement = (dataPoint: HeatMapDataPoint) => {

        return ([<SingleHeatPlot
            isSelected={decideIfSelected(dataPoint)}
            isFiltered={decideIfFiltered(dataPoint)}
            bandwidth={aggregationScale.bandwidth()}
            valueScale={valueScale as ScaleBand<any>}
            aggregatedBy={aggregatedBy}
            dataPoint={dataPoint}
            howToTransform={(`translate(-${offset.left},${aggregationScale(
                dataPoint.aggregateAttribute
            )})`).toString()}
        />])


    }

    return (
        <>
            <line x1={1} x2={1} y1={offset.top} y2={dimension.height - offset.bottom} style={{ stroke: "#e5e5e5", strokeWidth: "1" }} />
            <g className="axes">
                <g className="x-axis"></g>
                <g className="y-axis"></g>
                <text className="x-label" />
                <text className="y-label" />
            </g>
            <g className="legend">
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
            </g>
            <g className="chart"
                transform={`translate(${offset.left + extraPairTotalWidth},0)`}
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
                        </text>,
                    ]);
                })}
            </g>
            <g className="extraPairChart">
                <ExtraPairPlotGenerator extraPairDataSet={extraPairDataSet} chartId={chartId} aggregationScale={aggregationScale} dimension={dimension} />
            </g>


        </>
    );
}
export default inject("store")(observer(HeatMap));
