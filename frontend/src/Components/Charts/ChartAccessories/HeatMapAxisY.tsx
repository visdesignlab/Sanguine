import { axisLeft, select } from "d3";
import { FC, useCallback } from "react";
import { CaseRectWidth, largeFontSize, regularFontSize } from "../../../Presets/Constants";
import { AggregationScaleGenerator } from "../../../HelperFunctions/Scales";
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

    const svgSelection = select(svg.current);
    const aggregationLabel = axisLeft(aggregationScale());

    svgSelection
        .select(".axes-y")
        .select(".y-axis")
        .attr(
            "transform",
            `translate(${currentOffset.left + extraPairTotalWidth}, 0)`
        )
        .call(aggregationLabel as any)
        .selectAll("text")
        .attr("font-size", store.configStore.largeFont ? largeFontSize : regularFontSize)
        .attr("transform", `translate(-${CaseRectWidth + 2},0)`)
        .text((d: any) => d)
        .attr("cursor", "pointer")
        .on("click", (e, d: any) => {
            store.selectionStore.selectSet(xAggregationOption, d.toString(), !e.shiftKey);
        });

    return (
        <g className="axes-y">
            <g className="y-axis"></g>
        </g>);
};

export default observer(HeatMapAxis);