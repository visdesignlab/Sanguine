import { useMemo } from 'react';
import {
  scaleLinear, max, format, scaleBand,
} from 'd3';
import { observer } from 'mobx-react';
import { Tooltip } from '@mui/material';
import { AttributePlotWidth } from '../../../../Presets/Constants';
import { AttributePlotData } from '../../../../Interfaces/Types/DataTypes';

function AttributePlotBar({
  plotData,
  secondaryPlotData,
  aggregationScaleDomain,
  aggregationScaleRange,
}: {
  plotData: AttributePlotData<'BarChart'>;
  secondaryPlotData?: AttributePlotData<'BarChart'>;
  aggregationScaleDomain: string;
  aggregationScaleRange: string;
}) {
  // Band scale for y‐positioning categories
  const aggregationScale = useMemo(() => {
    const domain = JSON.parse(aggregationScaleDomain).map((d: number) => d.toString());
    const range = JSON.parse(aggregationScaleRange) as [number, number];
    return scaleBand().domain(domain).range(range).paddingInner(0.1);
  }, [aggregationScaleDomain, aggregationScaleRange]);

  // Linear x-scale that is global max of all data
  const valueScale = useMemo(() => {
    // Find max from primary dataset
    const primaryMax = max(Object.values(plotData.attributeData).concat([1])) ?? 0;
    // If secondary (outcome comparison) is given, find max of both
    const globalMax = secondaryPlotData
      ? max(Object.values(secondaryPlotData.attributeData).concat([primaryMax])) ?? primaryMax
      : primaryMax;
    return scaleLinear().domain([0, globalMax]).range([0, AttributePlotWidth.BarChart]);
  }, [plotData, secondaryPlotData]);

  // Precompute bar heights
  const fullBarHeight = aggregationScale.bandwidth();
  const halfBarHeight = fullBarHeight * 0.5;

  return (
    <>
      {/* Primary bar rows */}
      <g transform={`translate(0,${secondaryPlotData ? halfBarHeight : 0})`}>
        {Object.entries(plotData.attributeData).map(([key, value], idx) => (
          <Tooltip key={idx} title={format('.4r')(value)}>
            <rect
              x={0}
              y={aggregationScale(key)}
              width={valueScale(value)}
              height={secondaryPlotData ? halfBarHeight : fullBarHeight}
              fill="#404040"
              opacity={0.8}
            />
          </Tooltip>
        ))}
      </g>

      {/* Optional outcome comparison (secondary) bar rows */}
      {secondaryPlotData && (
        <g>
          {Object.entries(secondaryPlotData.attributeData).map(([key, value], idx) => (
            <Tooltip key={idx} title={format('.4r')(value)}>
              <rect
                x={0}
                y={aggregationScale(key)}
                width={valueScale(value)}
                height={halfBarHeight}
                fill="#404040"
                opacity={0.8}
              />
            </Tooltip>
          ))}
        </g>
      )}
    </>
  );
}

export default observer(AttributePlotBar);