import { useContext, useMemo } from 'react';
import {
  scaleLinear, format, interpolateGreys, scaleBand,
} from 'd3';
import { observer } from 'mobx-react';
import {
  basicGray, AttributePlotWidth, greyScaleRange, largeFontSize,
} from '../../../../Presets/Constants';
import Store from '../../../../Interfaces/Store';
import { AttributePlotData } from '../../../../Interfaces/Types/DataTypes';
import { AttributePlotTooltip } from './AttributePlotTooltip';

function AttributePlotBasic({
  plotData,
  secondaryPlotData,
  aggregationScaleRange,
  aggregationScaleDomain,
}: {
  plotData: AttributePlotData<'Basic'>;
  secondaryPlotData?: AttributePlotData<'Basic'>;
  aggregationScaleDomain: string;
  aggregationScaleRange: string;
}) {
  const store = useContext(Store);

  // Band scale for vertical row positioning
  const aggScale = useMemo(() => {
    const domain = JSON.parse(aggregationScaleDomain).map((d: number) => d.toString());
    const range = JSON.parse(aggregationScaleRange) as number[];
    return scaleBand<string>()
      .domain(domain)
      .range(range)
      .paddingInner(0.1);
  }, [aggregationScaleDomain, aggregationScaleRange]);

  // Linear color scale (0,1) to greyscale
  const colorScale = useMemo(
    () => scaleLinear<number>().domain([0, 1]).range(greyScaleRange),
    [],
  );

  /**
   * Render all rows of the attribute plot
   * @param data  Attribute counts by row
   * @param heightFactor  Fraction of vertical space to use per row
   */
  const renderRows = (
    data: AttributePlotData<'Basic'>,
    heightFactor: number,
  ) => Object.entries(data.attributeData).map(
    ([rowName, { rowCaseCount, attributeCaseCount }], idx) => {
      const hasData = rowCaseCount > 0;
      // Attribute percentage label (Ex: 3/5 cases used TXA)
      const attributePercent = hasData ? (attributeCaseCount ?? 0) / rowCaseCount : 0;

      // Positioning and color
      const y = aggScale(rowName)!;
      const barHeight = aggScale.bandwidth() * heightFactor;
      const midY = y + barHeight * 0.5;
      const fillColor = hasData ? interpolateGreys(colorScale(attributePercent)) : 'white';
      const textColor = colorScale(attributePercent) > 0.4 ? 'white' : 'black';

      return (
        <g key={idx}>
          {/* Bar for row */}
          <AttributePlotTooltip title={`${attributeCaseCount}/${rowCaseCount}`}>
            <rect
              x={0}
              y={y}
              width={AttributePlotWidth.Basic}
              height={barHeight}
              fill={fillColor}
              opacity={0.8}
            />
          </AttributePlotTooltip>

          {/* If no data, draw a small line to indicate “empty” */}
          {!hasData && (
          <line
            x1={0.35 * AttributePlotWidth.Basic}
            x2={0.65 * AttributePlotWidth.Basic}
            y1={midY}
            y2={midY}
            stroke={basicGray}
            strokeWidth={0.5}
          />
          )}

          {/* Attribute percentage label (Ex: 3/5 cases used TXA) */}
          {hasData && (
          <text
            x={AttributePlotWidth.Basic * 0.5}
            y={midY}
            textAnchor="middle"
            alignmentBaseline="central"
            fill={textColor}
            fontSize={store.configStore.largeFont ? largeFontSize : 12}
            pointerEvents="none"
          >
            {attributePercent > 0 ? format('.0%')(attributePercent) : '<1%'}
          </text>
          )}
        </g>
      );
    },
  );
  // Half vertical bandwidth for secondary plot positioning
  const halfBand = aggScale.bandwidth() * 0.5;

  return (
    <>
      {/* Primary plot shift down by half‐band if there’s an outcome comparison (secondary) */}
      <g
        transform={
          secondaryPlotData
            ? `translate(0, ${halfBand})`
            : undefined
        }
      >
        {renderRows(plotData, secondaryPlotData ? 0.5 : 1)}
      </g>

      {/* Optional outcome-comparison (secondary) plot - always half‐height */}
      {secondaryPlotData && (
        <g>{renderRows(secondaryPlotData, 0.5)}</g>
      )}
    </>
  );
}

export default observer(AttributePlotBasic);
