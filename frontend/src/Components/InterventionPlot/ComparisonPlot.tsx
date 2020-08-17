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
    interpolateReds,
    timeFormat
} from "d3";
import {
    ComparisonDataPoint, ExtraPairInterventionPoint
} from "../../Interfaces/ApplicationState";
import {
    AxisLabelDict,
    BloodProductCap,
    offset,
    CELL_SAVER_TICKS,
    extraPairWidth,
    extraPairPadding,
    Accronym,
    caseRectWidth,
} from "../../PresetsProfile"

//import SingleHeatPlot from "./SingleHeatPlot";

//import ExtraPairPlotGenerator from "../Utilities/ExtraPairPlotGenerator";
import { third_gray, preop_color, postop_color, greyScaleRange } from "../../PresetsProfile";
import SingleHeatCompare from "./SingleHeatCompare";
import InterventionExtraPairGenerator from "../Utilities/InterventionExtraPairGenerator";
import { stateUpdateWrapperUseJSON } from "../../HelperFunctions";


interface OwnProps {
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
    store?: Store;
    // dimensionWhole: { width: number, height: number }
    dimensionWidth: number,
    dimensionHeight: number;
    data: ComparisonDataPoint[];
    svg: React.RefObject<SVGSVGElement>;

    plotType: string;
    interventionDate?: number;
    outcomeComparison?: string;
    //  selectedVal: number | null;
    // stripPlotMode: boolean;
    extraPairDataSet: ExtraPairInterventionPoint[];
}

export type Props = OwnProps;

const InterventionPlot: FC<Props> = ({ extraPairDataSet, chartId, plotType, outcomeComparison, interventionDate, store, aggregatedBy, valueToVisualize, dimensionHeight, dimensionWidth, data, svg }: Props) => {

    const svgSelection = select(svg.current);
    const differentialSquareWidth = 10;

    const {
        // perCaseSelected,
        //  currentSelectPatient,
        currentOutputFilterSet,
        currentSelectSet,
        showZero
    } = store!;

    const currentOffset = offset.intervention;
    const [extraPairTotalWidth, setExtraPairTotlaWidth] = useState(0);
    // const [kdeMax, setKdeMax] = useState(0);
    const [xVals, setXVals] = useState([]);
    const [caseMax, setCaseMax] = useState(0);
    const [preTotal, setPreTotal] = useState(0);
    const [postTotal, setPostTotal] = useState(0)
    // const [preZeroMax, setPreZeroMax] = useState(0)
    // const [postZeroMax,setPostZeroMax] = useState(0)

    useEffect(() => {
        let totalWidth = extraPairDataSet.length > 0 ? (extraPairDataSet.length + 1) * extraPairPadding : 0;
        extraPairDataSet.forEach((d) => {
            totalWidth += (extraPairWidth[d.type])
        })
        setExtraPairTotlaWidth(totalWidth)
    }, [extraPairDataSet])

    useEffect(() => {

        let newCaseMax = 0;

        let newPreTotal = 0;
        let newPostTotal = 0;
        const newXvals = data
            .sort((a, b) => {
                if (aggregatedBy === "YEAR") {
                    return a.aggregateAttribute - b.aggregateAttribute
                }
                else {
                    if (showZero) {
                        return (a.postCaseCount + a.preCaseCount - a.preZeroCaseNum - a.postZeroCaseNum) -
                            (b.postCaseCount + b.preCaseCount - b.preZeroCaseNum - b.postZeroCaseNum)
                    }
                    else {
                        return a.postCaseCount + a.preCaseCount - b.postCaseCount - b.preCaseCount
                    }
                }
            })
            .map(dp => {
                const preCaseCount = showZero ? (dp.preCaseCount) : (dp.preCaseCount - dp.preZeroCaseNum);
                const postCaseCount = showZero ? dp.postCaseCount : (dp.postCaseCount - dp.postZeroCaseNum);
                // if (showZero) {
                //     newCaseMax = newCaseMax > (dp.preCaseCount + dp.postCaseCount) ? newCaseMax : (dp.preCaseCount + dp.postCaseCount);
                // }
                // else {
                //     newCaseMax = newCaseMax > (dp.preCaseCount + dp.postCaseCount - dp.preZeroCaseNum - dp.postZeroCaseNum) ? newCaseMax : (dp.preCaseCount + dp.postCaseCount - dp.preZeroCaseNum - dp.postZeroCaseNum);
                // }
                newCaseMax = newCaseMax > (preCaseCount + postCaseCount) ? newCaseMax : (preCaseCount + postCaseCount);
                newPreTotal += preCaseCount;
                newPostTotal += postCaseCount;
                //  const max_temp = max([max(dp.preInKdeCal, d => d.y), max(dp.postInKdeCal, d => d.y)])
                //  newkdeMax = newkdeMax > max_temp ? newkdeMax : max_temp;
                return dp.aggregateAttribute
            });
        stateUpdateWrapperUseJSON(xVals, newXvals, setXVals);
        setPreTotal(newPreTotal);
        setPostTotal(newPostTotal)
        // setKdeMax(newkdeMax);
        setCaseMax(newCaseMax);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, aggregatedBy, showZero])

    const aggregationScale = useCallback(() => {
        let aggregationScale = scaleBand()
            .domain(xVals)
            .range([dimensionHeight - currentOffset.bottom, currentOffset.top])
            .paddingInner(0.1);
        return aggregationScale
    }, [xVals, dimensionHeight, currentOffset])

    const valueScale = useCallback(() => {
        let outputRange
        if (valueToVisualize === "CELL_SAVER_ML") {
            outputRange = [-1].concat(range(0, BloodProductCap[valueToVisualize] + 100, 100))
        } else {
            outputRange = range(0, BloodProductCap[valueToVisualize] + 1)
        }
        //console.log(data)
        let valueScale = scaleBand()
            .domain(outputRange as any)
            .range([currentOffset.left, (dimensionWidth - extraPairTotalWidth) - currentOffset.right - currentOffset.margin])
            .paddingInner(0.01);
        return valueScale
    }, [dimensionWidth, extraPairTotalWidth, valueToVisualize, currentOffset])

    const caseScale = useCallback(() => {
        const caseScale = scaleLinear().domain([0, caseMax]).range(greyScaleRange);
        return caseScale
    }, [caseMax])

    const linearValueScale = useCallback(() => {
        let linearValueScale = scaleLinear()
            .domain([0, BloodProductCap[valueToVisualize]])
            .range([currentOffset.left, (dimensionWidth - extraPairTotalWidth) - currentOffset.right - currentOffset.margin]);

        return linearValueScale;
    }, [extraPairTotalWidth, dimensionWidth, valueToVisualize, currentOffset])

    // const lineFunction = useCallback(() => {
    //     const kdeScale = scaleLinear()
    //         .domain([0, kdeMax])
    //         .range([0.25 * aggregationScale().bandwidth(), 0])
    //     const lineFunction = line()
    //         .curve(curveCatmullRom)
    //         .y((d: any) => kdeScale(d.y))
    //         .x((d: any) => linearValueScale()(d.x) - currentOffset.left);
    //     return lineFunction

    // }, [kdeMax, aggregationScale()])

    const aggregationLabel = axisLeft(aggregationScale());

    const valueLabel = plotType === "HEATMAP" ? axisBottom(valueScale()).tickFormat((d, i) => valueToVisualize === "CELL_SAVER_ML" ? CELL_SAVER_TICKS[i] : (d === BloodProductCap[valueToVisualize] ? `${d}+` : d)) : axisBottom(linearValueScale());

    svgSelection
        .select(".axes")
        .select(".x-axis")
        .attr(
            "transform",
            `translate(${currentOffset.left + extraPairTotalWidth}, 0)`
        )
        .call(aggregationLabel as any)
        .selectAll("text")
        .attr("transform", `translate(${-caseRectWidth - differentialSquareWidth + 2},0)`)

    svgSelection
        .select(".axes")
        .select(".y-axis")
        .attr(
            "transform",
            `translate(${extraPairTotalWidth} ,${dimensionHeight - currentOffset.bottom})`
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

    const decideIfSelected = (d: ComparisonDataPoint) => {
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
    }


    const decideIfFiltered = (d: ComparisonDataPoint) => {
        for (let filterSet of currentOutputFilterSet) {
            if (aggregatedBy === filterSet.setName && filterSet.setValues.includes(d.aggregateAttribute))
                return true
        }
        return false;
    }

    // const decideSinglePatientSelect = (d: ComparisonDataPoint) => {
    //     if (currentSelectPatient) {
    //         return currentSelectPatient[aggregatedBy] === d.aggregateAttribute;
    //     } else {
    //         return false;
    //     }
    // }




    const outputSinglePlotElement = (dataPoint: ComparisonDataPoint) => {
        return ([<SingleHeatCompare
            isSelected={decideIfSelected(dataPoint)}
            isFiltered={decideIfFiltered(dataPoint)}
            bandwidth={aggregationScale().bandwidth()}
            valueScaleDomain={JSON.stringify(valueScale().domain())}
            valueScaleRange={JSON.stringify(valueScale().range())}
            aggregatedBy={aggregatedBy}
            dataPoint={dataPoint}
            howToTransform={(`translate(-${currentOffset.left},${aggregationScale()(
                dataPoint.aggregateAttribute
            )})`).toString()}
        />])
        // if (plotType === "HEATMAP") {
        //     return ([<SingleHeatCompare
        //         isSelected={decideIfSelected(dataPoint)}
        //         isFiltered={decideIfFiltered(dataPoint)}
        //         bandwidth={aggregationScale().bandwidth()}
        //         valueScaleDomain={JSON.stringify(valueScale().domain())}
        //         valueScaleRange={JSON.stringify(valueScale().range())}
        //         aggregatedBy={aggregatedBy}
        //         dataPoint={dataPoint}
        //         howToTransform={(`translate(-${currentOffset.left},${aggregationScale()(
        //             dataPoint.aggregateAttribute
        //         )})`).toString()}
        //     />])


        // }
        // else {
        //     return ([<SingleViolinCompare
        //         preIntPath={lineFunction()(dataPoint.preInKdeCal)!}
        //         postIntPath={lineFunction()(dataPoint.postInKdeCal)!}
        //         dataPoint={dataPoint}
        //         aggregatedBy={aggregatedBy}
        //         isSelected={decideIfSelected(dataPoint)}
        //         isFiltered={decideIfFiltered(dataPoint)}
        //         preIntHowToTransform={(`translate(0,${aggregationScale()(
        //             dataPoint.aggregateAttribute
        //         )})`).toString()}
        //         postIntHowToTransform={(`translate(0,${aggregationScale()(dataPoint.aggregateAttribute)! + aggregationScale().bandwidth() * 0.5})`).toString()}
        //     />])
        // }

    }

    const outputTextElement = (dataPoint: ComparisonDataPoint) => {
        if (aggregationScale().bandwidth() > 30) {
            return ([<text
                fill="white"
                x={-caseRectWidth}
                y={
                    aggregationScale()(dataPoint.aggregateAttribute)! +
                    0.25 * aggregationScale().bandwidth()
                }
                alignmentBaseline={"central"}
                textAnchor={"middle"}
                fontSize="12px"
            >
                {dataPoint.preCaseCount}
            </text>, <text
                fill="white"
                x={-caseRectWidth}
                y={
                    aggregationScale()(dataPoint.aggregateAttribute)! +
                    0.75 * aggregationScale().bandwidth()
                }
                alignmentBaseline={"central"}
                textAnchor={"middle"}
                fontSize="12px"
            >
                {dataPoint.postCaseCount}
            </text>])
        } else {
            return ([<text
                fill="white"
                x={-caseRectWidth}
                y={
                    aggregationScale()(dataPoint.aggregateAttribute)! +
                    0.5 * aggregationScale().bandwidth()
                }
                alignmentBaseline={"central"}
                textAnchor={"middle"}
                fontSize="12px"
            >
                {dataPoint.preCaseCount + dataPoint.postCaseCount}
            </text>])
        }
    }

    const outputGradientLegend = () => {
        if (!showZero) {
            return [<rect
                x={0.8 * (dimensionWidth)}
                y={0}
                width={0.2 * (dimensionWidth)}
                height={7.5}
                fill="url(#gradient1)" />,
            <rect
                x={0.8 * (dimensionWidth)}
                y={7.5}
                width={0.2 * (dimensionWidth)}
                height={7.5}
                fill="url(#gradient2)" />]
        } else {
            return <rect
                x={0.8 * (dimensionWidth)}
                y={0}
                width={0.2 * (dimensionWidth)}
                height={15}
                fill="url(#gradient1)" />
        }
    }




    return (
        <>
            <line x1={1} x2={1} y1={currentOffset.top} y2={dimensionHeight - currentOffset.bottom} style={{ stroke: "#e5e5e5", strokeWidth: "1" }} />
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
                    <linearGradient id="gradient2" x1="0" x2="1" y1="0" y2="0" colorInterpolation="CIE-LCHab">
                        <stop offset="0%" stopColor={interpolateGreys(0.25)} />
                        <stop offset="50%" stopColor={interpolateGreys(0.525)} />
                        <stop offset="100%" stopColor={interpolateGreys(0.8)} />
                    </linearGradient>
                </defs>

                {outputGradientLegend()}

                <text
                    x={0.8 * (dimensionWidth)}
                    y={15}
                    alignmentBaseline={"hanging"}
                    textAnchor={"start"}
                    fontSize="11px"
                    fill={third_gray}>
                    0%
                </text>
                <text
                    x={1 * (dimensionWidth)}
                    y={15}
                    alignmentBaseline={"hanging"}
                    textAnchor={"end"}
                    fontSize="11px"
                    fill={third_gray}>
                    100%
                </text>
            </g>
            <g>
                <rect x={0.7 * (dimensionWidth)}
                    y={0}
                    width={differentialSquareWidth}
                    height={12}
                    fill={preop_color}
                    opacity={0.65} />
                <rect x={0.7 * (dimensionWidth)}
                    y={12}
                    width={differentialSquareWidth}
                    height={12}
                    fill={postop_color}
                    opacity={0.65} />
                <text
                    x={0.7 * (dimensionWidth) - 1}
                    y={6}
                    alignmentBaseline={"middle"}
                    textAnchor={"end"}
                    fontSize="11px"
                    fill={third_gray}>
                    {` ${interventionDate ? `Pre Intervine` : `True`} ${preTotal}/${preTotal + postTotal}`}
                </text>
                <text
                    x={0.7 * (dimensionWidth) - 1}
                    y={18}
                    alignmentBaseline={"middle"}
                    textAnchor={"end"}
                    fontSize="11px"
                    fill={third_gray}>
                    {`${interventionDate ? `Post Intervine` : `False`} ${postTotal}/${preTotal + postTotal}`}
                </text>
                <text
                    x={0.1 * (dimensionWidth)}
                    y={0}
                    alignmentBaseline="hanging"
                    textAnchor="start"
                    fontSize="11px"
                    fill={third_gray}
                >
                    <tspan x="0" dy="1em">{interventionDate ? `Intervention:` : `Comparing Outcome:`}</tspan>
                    <tspan x="0" dy="1em">{interventionDate ? timeFormat("%Y-%m-%d")(new Date(interventionDate)) : ((Accronym as any)[outcomeComparison || ""]) || outcomeComparison}</tspan>

                    {/* {interventionDate ?
                    `Intervention: ${timeFormat("%Y-%m-%d")(new Date(interventionDate))}`
                    : `Comparing Outcome: ${((Accronym as any)[outcomeComparison || ""]) || outcomeComparison}`} */}

                </text>
            </g>

            <g className="chart"
                transform={`translate(${currentOffset.left + extraPairTotalWidth},0)`}
            >
                {data.map((dataPoint) => {

                    return outputSinglePlotElement(dataPoint)
                        .concat([

                            <rect
                                fill={interpolateGreys(caseScale()(showZero ? dataPoint.preCaseCount : (dataPoint.preCaseCount - dataPoint.preZeroCaseNum)))}
                                x={-caseRectWidth - 15}
                                y={aggregationScale()(dataPoint.aggregateAttribute)}
                                width={caseRectWidth}
                                height={aggregationScale().bandwidth() * 0.5}
                            />,
                            <rect fill={interpolateGreys(caseScale()(showZero ? dataPoint.postCaseCount : (dataPoint.postCaseCount - dataPoint.postZeroCaseNum)))}
                                x={-caseRectWidth - 15}
                                y={aggregationScale()(dataPoint.aggregateAttribute)! + aggregationScale().bandwidth() * 0.5} width={caseRectWidth}
                                height={aggregationScale().bandwidth() * 0.5} />,
                            <rect
                                fill={preop_color}
                                x={-15}
                                y={aggregationScale()(dataPoint.aggregateAttribute)}
                                width={differentialSquareWidth}
                                opacity={0.65}
                                height={aggregationScale().bandwidth() * 0.47}
                            />,
                            <rect fill={postop_color}
                                x={-15}
                                y={aggregationScale()(dataPoint.aggregateAttribute)! + aggregationScale().bandwidth() * 0.5}
                                width={differentialSquareWidth}
                                opacity={0.65}
                                height={aggregationScale().bandwidth() * 0.47} />,
                            <rect x={-caseRectWidth - 15} y={aggregationScale()(dataPoint.aggregateAttribute)} width={caseRectWidth} fill="none" height={aggregationScale().bandwidth()}
                                //   stroke={decideSinglePatientSelect(dataPoint) ? highlight_orange : "none"}
                                strokeWidth={2} />



                        ].concat(outputTextElement(dataPoint)));
                })}
            </g>
            <g className="extraPairChart">
                <InterventionExtraPairGenerator
                    extraPairDataSet={extraPairDataSet} chartId={chartId}
                    aggregationScaleDomain={JSON.stringify(aggregationScale().domain())}
                    aggregationScaleRange={JSON.stringify(aggregationScale().range())} height={dimensionHeight} />
            </g>



        </>
    );
}
export default inject("store")(observer(InterventionPlot));
