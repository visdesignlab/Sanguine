import { scaleBand, scaleLinear } from 'd3';
import { Offset } from '../Interfaces/Types/OffsetType';
import { greyScaleRange } from '../Presets/Constants';

export const HeatmapColorScale = scaleLinear().domain([0, 1]).range([0.1, 1]);
export const HeatmapGreyScale = scaleLinear().domain([0, 1]).range(greyScaleRange);

export const AggregationScaleGenerator = (
  xVals: string[],
  dimensionHeight: number,
  currentOffset: Offset,
) => scaleBand()
  .domain(xVals)
  .range([dimensionHeight - currentOffset.bottom, 0])
  .paddingInner(0.1);

export const CaseScaleGenerator = (caseMax: number) => scaleLinear().domain([0, caseMax]).range(greyScaleRange);

export const ValueScaleGenerator = (outputRange: number[], currentOffset: Offset, dimensionWidth: number, attributePlotTotalWidth: number) => scaleBand()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .domain(outputRange as any)
  .range([currentOffset.left + attributePlotTotalWidth, dimensionWidth - currentOffset.right - currentOffset.margin])
  .paddingInner(0.01);

export const ValueScaleGeneratorFromDomainRange = (valueScaleDomain: string, valueScaleRange: string, isScaleBand: boolean) => {
  const domain = JSON.parse(valueScaleDomain);
  const range = JSON.parse(valueScaleRange);
  if (isScaleBand) {
    return scaleBand()
      .domain(domain)
      .range(range)
      .paddingInner(0.01);
  }
  return scaleLinear()
    .domain(domain)
    .range(range);
};
