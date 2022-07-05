import { axisBottom, axisLeft, ScaleBand, select } from "d3";
import { FC, useCallback } from "react";
import { BloodProductCap, CaseRectWidth, CELL_SAVER_TICKS, largeFontSize, regularFontSize } from "../../../Presets/Constants";
import { AcronymDictionary } from "../../../Presets/DataDict";
import { AggregationScaleGenerator, ValueScaleGeneratorFromDomainRange } from "../../../HelperFunctions/Scales";
import { Offset } from "../../../Interfaces/Types/OffsetType";
import { useContext } from "react";
import Store from "../../../Interfaces/Store";
import { observer } from "mobx-react";

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
};
const HeatMapAxis: FC<Props> = ({ svg, currentOffset, extraPairTotalWidth, xVals, dimensionHeight, yValueOption, valueScaleRange, valueScaleDomain, xAggregationOption, dimensionWidth, isValueScaleBand }: Props) => {

    const store = useContext(Store);
    const aggregationScale = useCallback(() => {
        return AggregationScaleGenerator(xVals, dimensionHeight, currentOffset);
    }, [dimensionHeight, xVals, currentOffset]);

    const valueScale = useCallback(() => {
        return ValueScaleGeneratorFromDomainRange(valueScaleDomain, valueScaleRange, isValueScaleBand);
    }, [valueScaleDomain, valueScaleRange, isValueScaleBand]);

    const svgSelection = select(svg.current);
    const aggregationLabel = axisLeft(aggregationScale());
    let valueLabel;
    if (isValueScaleBand) {
        valueLabel = axisBottom(valueScale() as ScaleBand<string>).tickFormat((d, i) => yValueOption === "CELL_SAVER_ML" ? CELL_SAVER_TICKS[i] : (d === BloodProductCap[yValueOption] ? `${d}+` : d));
    } else {
        valueLabel = axisBottom(valueScale() as any);
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
        .attr("font-size", store.configStore.largeFont ? largeFontSize : regularFontSize)
        .attr("transform", `translate(-${CaseRectWidth + 2},0)`)
        .text((d: any) => {
            if (store.configStore.nameDictionary[xAggregationOption] && store.configStore.privateMode) {
                const name = store.configStore.nameDictionary[xAggregationOption][d];
                return name ? `${name.slice(0, 1)}${name.slice(1).toLowerCase()}` : d;
            }
            return d;
        })
        .attr("cursor", "pointer")
        .on("click", (e, d: any) => {
            store.selectionStore.selectSet(xAggregationOption, d.toString(), !e.shiftKey);
        });


    svgSelection
        .select(".axes")
        .select(".y-axis")
        .attr(
            "transform",
            `translate(0 ,${dimensionHeight - currentOffset.bottom})`
        )
        .call(valueLabel as any)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick").selectAll("line").remove())
        .call(g => g.selectAll(".tick").selectAll("text").attr("font-size", store.configStore.largeFont ? largeFontSize : regularFontSize));

    svgSelection
        .select(".x-label")
        .attr("x", (dimensionWidth - extraPairTotalWidth) * 0.5)
        .attr("y", dimensionHeight - currentOffset.bottom + 25)
        .attr("alignment-baseline", "hanging")
        .attr("font-size", store.configStore.largeFont ? largeFontSize : regularFontSize)
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${extraPairTotalWidth},0)`)
        .text(() => {
            return AcronymDictionary[yValueOption] ? AcronymDictionary[yValueOption] : yValueOption;
        });

    svgSelection
        .select(".y-label")
        .attr("y", dimensionHeight - currentOffset.bottom + 25)
        .attr("x", 20)
        .attr("font-size", store.configStore.largeFont ? largeFontSize : regularFontSize)
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "hanging")
        .attr("transform", `translate(${extraPairTotalWidth},0)`)
        .text(
            AcronymDictionary[xAggregationOption] ? AcronymDictionary[xAggregationOption] : xAggregationOption
        );

    return (
        <g className="axes">
            <g className="x-axis"></g>
            <g className="y-axis"></g>
            <text className="x-label" />
            <text className="y-label" />
        </g>);
};

export default observer(HeatMapAxis);