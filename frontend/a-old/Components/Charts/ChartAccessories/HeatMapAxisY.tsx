import { axisLeft, select } from 'd3';
import { RefObject, useCallback, useContext } from 'react';
import { observer } from 'mobx-react';
import {
  CaseRectWidth, largeFontSize, regularFontSize,
} from '../../../Presets/Constants';
import { AggregationScaleGenerator } from '../../../HelperFunctions/Scales';
import { Offset } from '../../../Interfaces/Types/OffsetType';
import Store from '../../../Interfaces/Store';
import { Aggregation } from '../../../Presets/DataDict';
import { usePrivateProvLabel } from '../../Hooks/UsePrivateModeLabeling';

type Props = {
    svg: RefObject<SVGSVGElement>;
    currentOffset: Offset;
    xVals: string[];
    dimensionHeight: number;
    attributePlotTotalWidth: number;
    yAxisVar: Aggregation;
};
function HeatMapAxis({
  svg, currentOffset, attributePlotTotalWidth, xVals, dimensionHeight, yAxisVar,
}: Props) {
  const store = useContext(Store);
  const aggregationScale = useCallback(() => AggregationScaleGenerator(xVals, dimensionHeight, currentOffset), [dimensionHeight, xVals, currentOffset]);

  const svgSelection = select(svg.current);
  const aggregationLabel = axisLeft(aggregationScale());

  // Gets the provider name depending on the private mode setting
  const getLabel = usePrivateProvLabel();

  svgSelection
    .select('.axes-y')
    .select('.y-axis')
    .attr(
      'transform',
      `translate(${currentOffset.left + attributePlotTotalWidth}, 0)`,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .call(aggregationLabel as any)
    .selectAll('text')
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize)
    .attr('transform', `translate(-${CaseRectWidth + 2},0)`)
    .attr('pointer-events', 'none')
    .style('user-select', 'none')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .text((d: any) => getLabel(d, yAxisVar));

  return (
    <g className="axes-y">
      <g className="y-axis" />
    </g>
  );
}

export default observer(HeatMapAxis);
