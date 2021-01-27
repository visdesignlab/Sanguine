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
    sum,
    axisLeft,
    axisBottom
} from "d3";
import {
    CostBarChartDataPoint, ExtraPairPoint
} from "../../Interfaces/ApplicationState";
import {
    offset,
    AcronymDictionary,
    extraPairPadding,
} from "../../PresetsProfile"
import { stateUpdateWrapperUseJSON } from "../../HelperFunctions";
import SingleStackedBar from "./SingleStackedBar";

interface OwnProps {
    aggregatedBy: string;
    //  valueToVisualize: string;
    chartId: string;
    store?: Store;
    dimensionWidth: number,
    dimensionHeight: number,
    data: CostBarChartDataPoint[];
    svg: React.RefObject<SVGSVGElement>;
    maximumCost: number;
    //  selectedVal: number | null;
    stripPlotMode: boolean;
    extraPairDataSet: ExtraPairPoint[];
}



export type Props = OwnProps;

const CostBarChart: FC<Props> = ({ maximumCost, stripPlotMode, store, aggregatedBy, dimensionWidth, dimensionHeight, data, svg, chartId }: Props) => {
    const svgSelection = select(svg.current);
    const currentOffset = offset.regular;
    const [xVals, setXVals] = useState([]);
    useEffect(() => {
        const tempXVals = data.sort((a, b) => {
            if (aggregatedBy === "YEAR") {
                return a.aggregateAttribute - b.aggregateAttribute
            } else {
                return a.caseNum - b.caseNum
            }
        }).map((dp) => {
            return dp.aggregateAttribute
        });
        stateUpdateWrapperUseJSON(xVals, tempXVals, setXVals);
    }, [data, aggregatedBy])

    const aggregationScale = useCallback(() => {
        const aggregationScale = scaleBand()
            .domain(xVals)
            .range([dimensionHeight - currentOffset.bottom, currentOffset.top])
            .paddingInner(0.1);
        return aggregationScale
    }, [dimensionHeight, xVals]);

    const valueScale = useCallback(() => {
        let valueScale = scaleLinear()
            .domain([0, maximumCost])
            .range([currentOffset.left, dimensionWidth - currentOffset.right - currentOffset.margin])
        return valueScale
    }, [dimensionWidth, maximumCost])

    svgSelection
        .select(".axes")
        .select(".x-axis")
        .attr(
            "transform",
            `translate(${currentOffset.left}, 0)`
        )
        .call(axisLeft(aggregationScale()) as any)
        .selectAll("text")
        .attr("transform", `translate(-35,0)`)

    svgSelection
        .select(".axes")
        .select(".y-axis")
        .attr(
            "transform",
            `translate(0,${dimensionHeight - currentOffset.bottom})`
        )
        .call(axisBottom(valueScale()) as any);

    svgSelection
        // .select(".axes")
        .select(".x-label")
        .attr("x", dimensionWidth * 0.5 + currentOffset.margin)
        .attr("y", dimensionHeight - currentOffset.bottom + 20)
        .attr("alignment-baseline", "hanging")
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .text("Per Case Cost in Dollars");

    svgSelection
        //.select(".axes")
        .select(".y-label")
        .attr("y", dimensionHeight - currentOffset.bottom + 20)
        .attr("x", currentOffset.left - 55)
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "hanging")
        .text(
            AcronymDictionary[aggregatedBy] ? AcronymDictionary[aggregatedBy] : aggregatedBy
        );

    return <>
        <g className="axes">
            <g className="x-axis"></g>
            <g className="y-axis"></g>
            <text className="x-label" />
            <text className="y-label" />
        </g>
        <g className="chart">
            {data.map((dp) => {
                return (<SingleStackedBar
                    valueScaleDomain={JSON.stringify(valueScale().domain())}
                    valueScaleRange={JSON.stringify(valueScale().range())}
                    dataPoint={dp}
                    aggregatedBy={aggregatedBy}
                    bandwidth={aggregationScale().bandwidth()}
                    howToTransform={(`translate(0,${aggregationScale()(
                        dp.aggregateAttribute
                    )})`).toString()}
                />)
            })}
        </g>
    </>
}
export default inject("store")(observer(CostBarChart));

// const ExtraPairText = styled(`text`)`
//   font-size: 11px
//   text-anchor: middle
//   alignment-baseline:hanging
//   cursor:pointer
// `
