import { axisBottom, ScaleBand, select } from 'd3';
import { RefObject, useCallback, useContext } from 'react';
import { observer } from 'mobx-react';
import {
  BloodProductCap, CELL_SAVER_TICKS, largeFontSize, regularFontSize,
} from '../../../Presets/Constants';
import { AcronymDictionary } from '../../../Presets/DataDict';
import { ValueScaleGeneratorFromDomainRange } from '../../../HelperFunctions/Scales';
import { Offset } from '../../../Interfaces/Types/OffsetType';
import Store from '../../../Interfaces/Store';

type Props = {
  svg: RefObject<SVGSVGElement>;
  currentOffset: Offset;
  dimensionHeight: number;
  dimensionWidth: number;
  extraPairTotalWidth: number;
  yValueOption: keyof typeof AcronymDictionary | keyof typeof BloodProductCap;
  valueScaleDomain: string;
  valueScaleRange: string;
  xAggregationOption: keyof typeof AcronymDictionary;
  isValueScaleBand: boolean;
};
function HeatMapAxis({
  svg, currentOffset, extraPairTotalWidth, dimensionHeight, yValueOption, valueScaleRange, valueScaleDomain, xAggregationOption, dimensionWidth, isValueScaleBand,
}: Props) {
  const store = useContext(Store);

  const valueScale = useCallback(() => ValueScaleGeneratorFromDomainRange(valueScaleDomain, valueScaleRange, isValueScaleBand), [valueScaleDomain, valueScaleRange, isValueScaleBand]);

  const svgSelection = select(svg.current);
  let valueLabel;
  if (isValueScaleBand) {
    // eslint-disable-next-line no-nested-ternary, @typescript-eslint/no-explicit-any
    valueLabel = axisBottom(valueScale() as ScaleBand<string>).tickFormat((d, i) => (yValueOption === 'CELL_SAVER_ML' ? CELL_SAVER_TICKS[i] : (d === BloodProductCap[yValueOption as any as keyof typeof BloodProductCap] as any ? `${d}+` : d)));
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    valueLabel = axisBottom(valueScale() as any);
  }

  svgSelection
    .select('.axes-x')
    .select('.x-axis')
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
    .text(() => (AcronymDictionary[yValueOption] ? AcronymDictionary[yValueOption] : yValueOption));

  svgSelection
    .select('.y-label')
    .attr('y', dimensionHeight - currentOffset.bottom + 25)
    .attr('x', 20)
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize)
    .attr('text-anchor', 'start')
    .attr('alignment-baseline', 'hanging')
    .attr('transform', `translate(${extraPairTotalWidth},0)`)
    .text(
      AcronymDictionary[xAggregationOption] ? AcronymDictionary[xAggregationOption] : xAggregationOption,
    );

  return (
    <g className="axes-x">
      <g className="x-axis" />
      <text className="x-label" />
      <text className="y-label" />
    </g>
  );
}

export default observer(HeatMapAxis);
