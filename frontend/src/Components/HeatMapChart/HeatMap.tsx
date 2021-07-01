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
    range
} from "d3";
import {
    HeatMapDataPoint, ExtraPairPoint
} from "../../Interfaces/ApplicationState";
import {
    offset,
    extraPairWidth,
    extraPairPadding,
    AcronymDictionary,
    BloodProductCap,
    CELL_SAVER_TICKS,
    caseRectWidth
} from "../../PresetsProfile"

import SingleHeatPlot from "./SingleHeatPlot";
import ExtraPairPlotGenerator from "../Utilities/ExtraPairPlotGenerator";
import { greyScaleRange } from "../../PresetsProfile";
import { stateUpdateWrapperUseJSON } from "../../HelperFunctions";
import SingleColorLegend from "../Utilities/SingleColorLegend";
import DualColorLegend from "../Utilities/DualColorLegend";

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
        let totalWidth = extraPairDataSet.length > 0 ? (extraPairDataSet.length + 1) * extraPairPadding : 0;
        extraPairDataSet.forEach((d) => {
            totalWidth += (extraPairWidth[d.type])
        })
        setExtraPairTotlaWidth(totalWidth)

    }, [extraPairDataSet])

    useEffect(() => {
        let newCaseMax = 0;
        const tempxVals = data
            .sort((a, b) => {
                if (aggregatedBy === "YEAR") {
                    return a.aggregateAttribute - b.aggregateAttribute
                }
                else {
                    if (showZero) { return a.caseCount - b.caseCount }
                    else { return (a.caseCount - a.zeroCaseNum) - (b.caseCount - b.zeroCaseNum) }
                }
            })
            .map((dp) => {
                if (showZero) { newCaseMax = newCaseMax > dp.caseCount ? newCaseMax : dp.caseCount }
                else {
                    newCaseMax = newCaseMax > (dp.caseCount - dp.zeroCaseNum) ? newCaseMax : (dp.caseCount - dp.zeroCaseNum)
                }
                return dp.aggregateAttribute
            })


        stateUpdateWrapperUseJSON(xVals, tempxVals, setXVals);
        setCaseMax(newCaseMax)
        //console.log(data)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, showZero, aggregatedBy])


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
    }, [dimensionWidth, extraPairTotalWidth, valueToVisualize, currentOffset]);


    const aggregationScale = useCallback(() => {
        let aggregationScale = scaleBand()
            .domain(xVals)
            .range([dimensionHeight - currentOffset.bottom, currentOffset.top])
            .paddingInner(0.1);
        return aggregationScale
    }, [dimensionHeight, xVals, currentOffset])

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
        .attr("transform", `translate(-${caseRectWidth - 2},0)`)

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
            return AcronymDictionary[valueToVisualize] ? AcronymDictionary[valueToVisualize] : valueToVisualize
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
            AcronymDictionary[aggregatedBy] ? AcronymDictionary[aggregatedBy] : aggregatedBy
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
            return <DualColorLegend dimensionWidth={dimensionWidth} />
        } else {
            return <SingleColorLegend dimensionWidth={dimensionWidth} />
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
                {outputGradientLegend()}
            </g>
            <g className="chart"
                transform={`translate(${currentOffset.left + extraPairTotalWidth},0)`}
            >
                {data.map((dataPoint) => {
                    return outputSinglePlotElement(dataPoint).concat([
                        <rect
                            fill={interpolateGreys(caseScale()(showZero ? dataPoint.caseCount : (dataPoint.caseCount - dataPoint.zeroCaseNum)))}
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
                            {showZero ? dataPoint.caseCount : (dataPoint.caseCount - dataPoint.zeroCaseNum)}
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
