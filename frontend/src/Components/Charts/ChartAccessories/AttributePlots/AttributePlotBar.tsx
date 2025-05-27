import { useCallback } from 'react';
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
  const aggregationScale = useCallback(() => {
    const domain = JSON.parse(aggregationScaleDomain).map((d: number) => d.toString());
    const range = JSON.parse(aggregationScaleRange);
    const aggScale = scaleBand().domain(domain).range(range).paddingInner(0.1);
    return aggScale;
  }, [aggregationScaleDomain, aggregationScaleRange]);

  const valueScale = useCallback(() => {
    let maxVal = max(Object.values(plotData));
    if (secondaryPlotData) {
      maxVal = max(Object.values(secondaryPlotData).concat([maxVal]));
    }
    const valScale = scaleLinear().domain([0, maxVal]).range([0, AttributePlotWidth.BarChart]);
    return valScale;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotData]);

  return (
    <>
      <g transform={`translate(0,${secondaryPlotData ? aggregationScale().bandwidth() * 0.5 : 0})`}>
        {Object.entries(plotData).map(([val, dataVal], idx) => (
          <Tooltip title={format('.4r')(dataVal)} key={idx}>
            <rect
              x={0}
              y={aggregationScale()(val)}
              fill="#404040"
              opacity={0.8}
              width={valueScale()(dataVal)}
              height={(secondaryPlotData ? 0.5 : 1) * aggregationScale().bandwidth()}
            />
          </Tooltip>
        ))}
      </g>
      <g>
        {secondaryPlotData ? Object.entries(secondaryPlotData).map(([val, dataVal], idx) => (
          <Tooltip title={format('.4r')(dataVal)} key={idx}>
            <rect
              x={0}
              y={aggregationScale()(val)}
              fill="#404040"
              opacity={0.8}
              width={valueScale()(dataVal)}
              height={aggregationScale().bandwidth() * 0.5}
            />
          </Tooltip>
        )) : null}
      </g>
    </>
  );
}

export default (observer(AttributePlotBar));
