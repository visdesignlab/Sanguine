import React, {
    FC,
    useEffect,
    useState,
    useCallback
} from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import {
    select,
    scaleLinear,
    scaleBand,
    axisLeft,
    axisBottom,
    interpolateGreys,
    range,
    interpolateReds
} from "d3";
import {
    HeatMapDataPoint, ExtraPairPoint
} from "../../Interfaces/ApplicationState";
import {
    offset,
    extraPairWidth,
    extraPairPadding,
    AxisLabelDict,
    BloodProductCap,
    CELL_SAVER_TICKS,
    caseRectWidth
} from "../../PresetsProfile"

import SingleHeatPlot from "./SingleHeatPlot";
import ExtraPairPlotGenerator from "../Utilities/ExtraPairPlotGenerator";
import { third_gray, greyScaleRange, highlight_orange } from "../../PresetsProfile";
import { stateUpdateWrapperUseJSON } from "../../HelperFunctions";

interface OwnProps {
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
    store?: Store;
    //dimensionWhole: { width: number, height: number }
    dimensionWidth: number,
    dimensionHeight: number,
    data: HeatMapDataPoint[];
    svg: React.RefObject<SVGSVGElement>;


    extraPairDataSet: ExtraPairPoint[];
}

export type Props = OwnProps;

const HeatMap: FC<Props> = ({ extraPairDataSet, chartId, store, aggregatedBy, valueToVisualize, dimensionHeight, dimensionWidth, data, svg }: Props) => {

    const svgSelection = select(svg.current);

    const {
        showZero,
        //currentSelectPatient,
        currentOutputFilterSet,
        currentSelectSet
    } = store!;

    const currentOffset = offset.regular;
    const [extraPairTotalWidth, setExtraPairTotlaWidth] = useState(0)
    const [xVals, setXVals] = useState<any[]>([]);
    const [caseMax, setCaseMax] = useState(0);
    //  const [zeroMax, setZeroMax] = useState(0);


    useEffect(() => {
        let totalWidth = 0
        extraPairDataSet.forEach((d) => {
            totalWidth += (extraPairWidth[d.type] + extraPairPadding)
        })
        setExtraPairTotlaWidth(totalWidth)
    }, [extraPairDataSet])

    useEffect(() => {
        let newCaseMax = 0;
        const tempxVals = data
            .sort((a, b) => {
                if (aggregatedBy === "YEAR") { return a.aggregateAttribute - b.aggregateAttribute }
                else {
                    return a.caseCount - b.caseCount
                }
            })
            .map((dp) => {
                newCaseMax = newCaseMax > dp.caseCount ? newCaseMax : dp.caseCount
                return dp.aggregateAttribute
            })


        stateUpdateWrapperUseJSON(xVals, tempxVals, setXVals);
        setCaseMax(newCaseMax)
    }, [data])


    const valueScale = useCallback(() => {
        let outputRange
        if (valueToVisualize === "CELL_SAVER_ML") {
            outputRange = [-1].concat(range(0, BloodProductCap[valueToVisualize] + 100, 100))

        } else {
            outputRange = range(0, BloodProductCap[valueToVisualize] + 1)
        }

        let valueScale = scaleBand()
            .domain(outputRange as any)
            .range([currentOffset.left, dimensionWidth - extraPairTotalWidth - currentOffset.right - currentOffset.margin])
            .paddingInner(0.01);

        return valueScale
    }, [dimensionWidth, extraPairTotalWidth, valueToVisualize]);


    const aggregationScale = useCallback(() => {
        let aggregationScale = scaleBand()
            .domain(xVals)
            .range([dimensionHeight - currentOffset.bottom, currentOffset.top])
            .paddingInner(0.1);
        return aggregationScale
    }, [dimensionHeight, xVals, aggregatedBy])

    const caseScale = useCallback(() => {
        // const caseMax = max(data.map(d => d.caseCount)) || 0;
        const caseScale = scaleLinear().domain([0, caseMax]).range(greyScaleRange)
        return caseScale;
    }, [caseMax])

    const aggregationLabel = axisLeft(aggregationScale());

    const valueLabel = axisBottom(valueScale()).tickFormat((d, i) => valueToVisualize === "CELL_SAVER_ML" ? CELL_SAVER_TICKS[i] : (d === BloodProductCap[valueToVisualize] ? `${d}+` : d));

    svgSelection
        .select(".axes")
        .select(".x-axis")
        .attr(
            "transform",
            `translate(${currentOffset.left + extraPairTotalWidth}, 0)`
        )
        .call(aggregationLabel as any)
        .selectAll("text")
        .attr("transform", `translate(-${caseRectWidth - 4},0)`)

    svgSelection
        .select(".axes")
        .select(".y-axis")
        .attr(
            "transform",
            `translate(${extraPairTotalWidth} ,${dimensionHeight - currentOffset.bottom})`
        )
        .call(valueLabel as any)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick").selectAll("line").remove());

    svgSelection
        // .select(".axes")
        .select(".x-label")
        .attr("x", (dimensionWidth - extraPairTotalWidth) * 0.5)
        .attr("y", dimensionHeight - currentOffset.bottom + 20)
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
        .attr("y", dimensionHeight - currentOffset.bottom + 20)
        .attr("x", currentOffset.left - 55)
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "hanging")
        .attr("transform", `translate(${extraPairTotalWidth},0)`)
        .text(
            AxisLabelDict[aggregatedBy] ? AxisLabelDict[aggregatedBy] : aggregatedBy
        );

    const decideIfSelected = (d: HeatMapDataPoint) => {
        // if (currentSelectPatient && currentSelectPatient[aggregatedBy] === d.aggregateAttribute) {
        //   return true;
        // }
        if (currentSelectSet.length > 0) {
            //let selectSet: SelectSet;
            for (let selectSet of currentSelectSet) {
                if (aggregatedBy === selectSet.setName && selectSet.setValues.includes(d.aggregateAttribute))
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
            if (aggregatedBy === filterSet.setName && filterSet.setValues.includes(d.aggregateAttribute))
                return true
        }
        return false;
    }
    // const decideSinglePatientSelect = (d: HeatMapDataPoint) => {
    //     if (currentSelectPatient) {
    //         return currentSelectPatient[aggregatedBy] === d.aggregateAttribute;
    //     } else {
    //         return false;
    //     }
    // }


    const outputSinglePlotElement = (dataPoint: HeatMapDataPoint) => {

        return ([<SingleHeatPlot
            isSelected={decideIfSelected(dataPoint)}
            isFiltered={decideIfFiltered(dataPoint)}
            //   isSinglePatientSelect={decideSinglePatientSelect(dataPoint)}
            bandwidth={aggregationScale().bandwidth()}
            valueScaleDomain={JSON.stringify(valueScale().domain())}
            valueScaleRange={JSON.stringify(valueScale().range())}
            //            valueScale={valueScale as ScaleBand<any>}
            aggregatedBy={aggregatedBy}
            dataPoint={dataPoint}
            howToTransform={(`translate(-${currentOffset.left},${aggregationScale()(
                dataPoint.aggregateAttribute
            )})`).toString()}

        />])


    }

    const outputGradientLegend = () => {
        if (!showZero) {
            return [<rect
                x={0.7 * (dimensionWidth - extraPairTotalWidth)}
                y={0}
                width={0.2 * (dimensionWidth - extraPairTotalWidth)}
                height={7.5}
                fill="url(#gradient1)" />, <rect
                x={0.7 * (dimensionWidth - extraPairTotalWidth)}
                y={7.5}
                width={0.2 * (dimensionWidth - extraPairTotalWidth)}
                height={7.5}
                fill="url(#gradient2)" />]
        } else {
            return <rect
                x={0.7 * (dimensionWidth - extraPairTotalWidth)}
                y={0}
                width={0.2 * (dimensionWidth - extraPairTotalWidth)}
                height={15}
                fill="url(#gradient1)" />
        }
    }

    return (
        <>
            <line x1={1}
                x2={1}
                y1={currentOffset.top}
                y2={dimensionHeight - currentOffset.bottom}
                style={{ stroke: "#e5e5e5", strokeWidth: "1" }} />
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
                    <linearGradient id="gradient2" x1="0" x2="1" y1="0" y2="0" colorInterpolation="CIE-LCHab">
                        <stop offset="0%" stopColor={interpolateGreys(0.25)} />
                        <stop offset="50%" stopColor={interpolateGreys(0.525)} />
                        <stop offset="100%" stopColor={interpolateGreys(0.8)} />
                    </linearGradient>
                </defs>
                {outputGradientLegend()}
                <text
                    x={0.7 * (dimensionWidth - extraPairTotalWidth)}
                    y={15}
                    alignmentBaseline={"hanging"}
                    textAnchor={"start"}
                    fontSize="11px"
                    fill={third_gray}>
                    0%
                </text>
                <text
                    x={0.9 * (dimensionWidth - extraPairTotalWidth)}
                    y={15}
                    alignmentBaseline={"hanging"}
                    textAnchor={"end"}
                    fontSize="11px"
                    fill={third_gray}>
                    100%
                </text>
            </g>
            <g className="chart"
                transform={`translate(${currentOffset.left + extraPairTotalWidth},0)`}
            >
                {data.map((dataPoint) => {
                    return outputSinglePlotElement(dataPoint).concat([
                        <rect
                            fill={interpolateGreys(caseScale()(dataPoint.caseCount))}
                            x={-caseRectWidth - 5}
                            y={aggregationScale()(dataPoint.aggregateAttribute)}
                            width={caseRectWidth}
                            height={aggregationScale().bandwidth()}
                            // stroke={decideSinglePatientSelect(dataPoint) ? highlight_orange : "none"}
                            strokeWidth={2}
                        />,
                        <text
                            fill="white"
                            x={-20}
                            y={
                                aggregationScale()(dataPoint.aggregateAttribute)! +
                                0.5 * aggregationScale().bandwidth()
                            }
                            alignmentBaseline={"central"}
                            textAnchor={"middle"}
                            fontSize="12px"
                        >
                            {dataPoint.caseCount}
                        </text>,
                    ]);
                })}
            </g>
            <g className="extraPairChart">
                <ExtraPairPlotGenerator
                    extraPairDataSet={extraPairDataSet}
                    chartId={chartId}
                    aggregationScaleDomain={JSON.stringify(aggregationScale().domain())}
                    aggregationScaleRange={JSON.stringify(aggregationScale().range())}
                    height={dimensionHeight} />
            </g>


        </>
    );
}
export default inject("store")(observer(HeatMap));
