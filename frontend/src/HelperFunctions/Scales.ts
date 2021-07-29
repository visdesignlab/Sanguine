import { scaleBand, scaleLinear } from "d3"
import { Offset } from "../Interfaces/Types/OffsetType"
import { greyScaleRange } from "../Presets/Constants"

export const HeatmapColorScale = scaleLinear().domain([0, 1]).range([0.1, 1])
export const HeatmapGreyScale = scaleLinear().domain([0, 1]).range(greyScaleRange)

export const AggregationScaleGenerator = (
    xVals: any[],
    dimensionHeight: number,
    currentOffset: Offset) => {
    return scaleBand()
        .domain(xVals)
        .range([dimensionHeight - currentOffset.bottom, currentOffset.top])
        .paddingInner(0.1);
}

export const CaseScaleGenerator = (caseMax: number) => {
    return scaleLinear().domain([0, caseMax]).range(greyScaleRange)
}

export const ValueScaleGenerator = (outputRange: number[], currentOffset: Offset, dimensionWidth: number, extraPairTotalWidth: number) => {
    return scaleBand()
        .domain(outputRange as any)
        .range([currentOffset.left, dimensionWidth - extraPairTotalWidth - currentOffset.right - currentOffset.margin])
        .paddingInner(0.01);
}

export const ValueScaleGeneratorFromDomainRange = (valueScaleDomain: string, valueScaleRange: string, isScaleBand: boolean) => {
    const domain = JSON.parse(valueScaleDomain);
    const range = JSON.parse(valueScaleRange);
    if (isScaleBand) {
        return scaleBand()
            .domain(domain)
            .range(range)
            .paddingInner(0.01)
    } else {
        return scaleLinear()
            .domain(domain)
            .range(range)
    }
}