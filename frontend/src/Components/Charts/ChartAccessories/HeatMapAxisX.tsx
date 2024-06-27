import { axisBottom, ScaleBand, select } from "d3";
import { FC, useCallback } from "react";
import { BloodProductCap, CELL_SAVER_TICKS, largeFontSize, regularFontSize } from "../../../Presets/Constants";
import { AcronymDictionary } from "../../../Presets/DataDict";
import { ValueScaleGeneratorFromDomainRange } from "../../../HelperFunctions/Scales";
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

    const valueScale = useCallback(() => {
        return ValueScaleGeneratorFromDomainRange(valueScaleDomain, valueScaleRange, isValueScaleBand);
    }, [valueScaleDomain, valueScaleRange, isValueScaleBand]);

    const svgSelection = select(svg.current);
    let valueLabel;
    if (isValueScaleBand) {
        valueLabel = axisBottom(valueScale() as ScaleBand<string>).tickFormat((d, i) => yValueOption === "CELL_SAVER_ML" ? CELL_SAVER_TICKS[i] : (d === BloodProductCap[yValueOption] ? `${d}+` : d));
    } else {
        valueLabel = axisBottom(valueScale() as any);
    }

    svgSelection
        .select(".axes-x")
        .select(".x-axis")
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
        <g className="axes-x">
            <g className="x-axis"></g>
            <text className="x-label" />
            <text className="y-label" />
        </g>);
};

export default observer(HeatMapAxis);