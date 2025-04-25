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

type Props = {
    svg: RefObject<SVGSVGElement>;
    currentOffset: Offset;
    xVals: string[];
    dimensionHeight: number;
    extraPairTotalWidth: number;
    yAxisVar: Aggregation;
};
function HeatMapAxis({
  svg, currentOffset, extraPairTotalWidth, xVals, dimensionHeight, yAxisVar,
}: Props) {
  const store = useContext(Store);
  const aggregationScale = useCallback(() => AggregationScaleGenerator(xVals, dimensionHeight, currentOffset), [dimensionHeight, xVals, currentOffset]);

  const svgSelection = select(svg.current);
  const aggregationLabel = axisLeft(aggregationScale());

  const privateModeNaming = useCallback((input: string) => {
    // Use provider name if private mode is OFF and xAxisVar includes 'PROV_ID'
    if (!store.configStore.privateMode && yAxisVar.includes('PROV_ID')) {
      const name = store.providerMappping[Number(input)] as string;
      return name ? `${name.slice(0, 1)}${name.slice(1).toLowerCase()}` : input;
    }
    return input;
  }, [store.configStore.privateMode, store.providerMappping, yAxisVar]);

  svgSelection
    .select('.axes-y')
    .select('.y-axis')
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
    .text((d: any) => privateModeNaming(d))
    .attr('cursor', 'pointer')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .on('click', (e, d: any) => {
      store.selectionStore.selectSet(yAxisVar, d.toString(), !e.shiftKey);
    });

  return (
    <g className="axes-y">
      <g className="y-axis" />
    </g>
  );
}

export default observer(HeatMapAxis);
