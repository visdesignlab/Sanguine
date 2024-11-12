import {
  axisBottom, axisLeft, ScaleBand, select,
} from 'd3';
import { RefObject, useCallback, useContext } from 'react';
import { observer } from 'mobx-react';
import {
  BloodProductCap, CaseRectWidth, CELL_SAVER_TICKS, largeFontSize, regularFontSize,
} from '../../../Presets/Constants';
import { AcronymDictionary } from '../../../Presets/DataDict';
import { AggregationScaleGenerator, ValueScaleGeneratorFromDomainRange } from '../../../HelperFunctions/Scales';
import { Offset } from '../../../Interfaces/Types/OffsetType';
import Store from '../../../Interfaces/Store';

type Props = {
    svg: RefObject<SVGSVGElement>;
    currentOffset: Offset;
    xVals: string[];
    dimensionHeight: number;
    dimensionWidth: number;
    extraPairTotalWidth: number;
    yAxisVar: keyof typeof AcronymDictionary | keyof typeof BloodProductCap;
    valueScaleDomain: string;
    valueScaleRange: string;
    xAxisVar: keyof typeof BloodProductCap;
    isValueScaleBand: boolean;
};
function HeatMapAxis({
  svg, currentOffset, extraPairTotalWidth, xVals, dimensionHeight, yAxisVar, valueScaleRange, valueScaleDomain, xAxisVar, dimensionWidth, isValueScaleBand,
}: Props) {
  const store = useContext(Store);
  const aggregationScale = useCallback(() => AggregationScaleGenerator(xVals, dimensionHeight, currentOffset), [dimensionHeight, xVals, currentOffset]);

  const valueScale = useCallback(() => ValueScaleGeneratorFromDomainRange(valueScaleDomain, valueScaleRange, isValueScaleBand), [valueScaleDomain, valueScaleRange, isValueScaleBand]);

  const svgSelection = select(svg.current);
  const aggregationLabel = axisLeft(aggregationScale());
  let valueLabel;
  if (isValueScaleBand) {
    // eslint-disable-next-line no-nested-ternary, @typescript-eslint/no-explicit-any
    valueLabel = axisBottom(valueScale() as ScaleBand<string>).tickFormat((d, i) => (yAxisVar === 'CELL_SAVER_ML' ? CELL_SAVER_TICKS[i] : (d === BloodProductCap[yAxisVar as any as keyof typeof BloodProductCap] as any ? `${d}+` : d)));
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    valueLabel = axisBottom(valueScale() as any);
  }
  svgSelection
    .select('.axes')
    .select('.x-axis')
    .attr(
      'transform',
      `translate(${currentOffset.left + extraPairTotalWidth}, 0)`,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .call(aggregationLabel as any)
    .selectAll('text')
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize)
    .attr('transform', `translate(-${CaseRectWidth + 2},0)`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .text((d: any) => d)
    .attr('cursor', 'pointer')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .on('click', (e, d: any) => {
      store.selectionStore.selectSet(xAxisVar, d.toString(), !e.shiftKey);
    });

  svgSelection
    .select('.axes')
    .select('.y-axis')
    .attr(
      'transform',
      `translate(0 ,${dimensionHeight - currentOffset.bottom})`,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .call(valueLabel as any)
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick').selectAll('line').remove())
    .call((g) => g.selectAll('.tick').selectAll('text').attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize));

  svgSelection
    .select('.x-label')
    .attr('x', (dimensionWidth - extraPairTotalWidth) * 0.5)
    .attr('y', dimensionHeight - currentOffset.bottom + 25)
    .attr('alignment-baseline', 'hanging')
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize)
    .attr('text-anchor', 'middle')
    .attr('transform', `translate(${extraPairTotalWidth},0)`)
    .text(() => (AcronymDictionary[yAxisVar] ? AcronymDictionary[yAxisVar] : yAxisVar));

  svgSelection
    .select('.y-label')
    .attr('y', dimensionHeight - currentOffset.bottom + 25)
    .attr('x', 20)
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize)
    .attr('text-anchor', 'start')
    .attr('alignment-baseline', 'hanging')
    .attr('transform', `translate(${extraPairTotalWidth},0)`)
    .text(
      AcronymDictionary[xAxisVar] ? AcronymDictionary[xAxisVar] : xAxisVar,
    );

  return (
    <g className="axes">
      <g className="x-axis" />
      <g className="y-axis" />
      <text className="x-label" />
      <text className="y-label" />
    </g>
  );
}

export default observer(HeatMapAxis);
