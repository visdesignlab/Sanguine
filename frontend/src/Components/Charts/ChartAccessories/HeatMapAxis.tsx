import { axisBottom, axisLeft, ScaleBand, scaleBand, select } from "d3";
import { FC, useCallback } from "react"
import { BloodProductCap, CaseRectWidth, CELL_SAVER_TICKS } from "../../../Presets/Constants";
import { AcronymDictionary } from "../../../Presets/DataDict";
import { AggregationScaleGenerator, CaseScaleGenerator, ValueScaleGeneratorFromDomainRange } from "../../../HelperFunctions/Scales";
import { Offset } from "../../../Interfaces/Types/OffsetType";
import { useContext } from "react";
import Store from "../../../Interfaces/Store";

type Props = {
    svg: React.RefObject<SVGSVGElement>;
    currentOffset: Offset;
    xVals: any[];
    dimensionHeight: number;
    dimensionWidth: number;
    extraPairTotalWidth: number;
    yValueOption: string;
    valueScaleDomain: string;
    valueScaleRange: string;
    xAggregationOption: string;
    isValueScaleBand: boolean;
}
const HeatMapAxis: FC<Props> = ({ svg, currentOffset, extraPairTotalWidth, xVals, dimensionHeight, yValueOption, valueScaleRange, valueScaleDomain, xAggregationOption, dimensionWidth, isValueScaleBand }: Props) => {

    const store = useContext(Store)
    const aggregationScale = useCallback(() => {
        return AggregationScaleGenerator(xVals, dimensionHeight, currentOffset)
    }, [dimensionHeight, xVals, currentOffset]);

    const valueScale = useCallback(() => {
        return ValueScaleGeneratorFromDomainRange(valueScaleDomain, valueScaleRange, isValueScaleBand)
    }, [valueScaleDomain, valueScaleRange]);

    const svgSelection = select(svg.current);
    const aggregationLabel = axisLeft(aggregationScale());
    let valueLabel;
    if (isValueScaleBand) {
        valueLabel = axisBottom(valueScale() as ScaleBand<string>).tickFormat((d, i) => yValueOption === "CELL_SAVER_ML" ? CELL_SAVER_TICKS[i] : (d === BloodProductCap[yValueOption] ? `${d}+` : d));
    } else {
        valueLabel = axisBottom(valueScale() as any)
    }
    svgSelection
        .select(".axes")
        .select(".x-axis")
        .attr(
            "transform",
            `translate(${currentOffset.left + extraPairTotalWidth}, 0)`
        )
        .call(aggregationLabel as any)
        .selectAll("text")
        .attr("transform", `translate(-${CaseRectWidth + 2},0)`)
        .attr("cursor", "pointer")
        .on("click", (e, d: any) => {
            store.selectionStore.selectSet(xAggregationOption, d.toString(), !e.shiftKey)
        })

    svgSelection
        .select(".axes")
        .select(".y-axis")
        .attr(
            "transform",
            `translate(0 ,${dimensionHeight - currentOffset.bottom})`
        )
        .call(valueLabel as any)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick").selectAll("line").remove());

    svgSelection
        .select(".x-label")
        .attr("x", (dimensionWidth - extraPairTotalWidth) * 0.5)
        .attr("y", dimensionHeight - currentOffset.bottom + 20)
        .attr("alignment-baseline", "hanging")
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${extraPairTotalWidth},0)`)
        .text(() => {
            return AcronymDictionary[yValueOption] ? AcronymDictionary[yValueOption] : yValueOption
        });

    svgSelection
        .select(".y-label")
        .attr("y", dimensionHeight - currentOffset.bottom + 20)
        .attr("x", 0)
        .attr("font-size", "11px")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "hanging")
        .attr("transform", `translate(${extraPairTotalWidth},0)`)
        .text(
            AcronymDictionary[xAggregationOption] ? AcronymDictionary[xAggregationOption] : xAggregationOption
        );

    return <g className="axes">
        <g className="x-axis"></g>
        <g className="y-axis"></g>
        <text className="x-label" />
        <text className="y-label" />
    </g>
}

export default HeatMapAxis