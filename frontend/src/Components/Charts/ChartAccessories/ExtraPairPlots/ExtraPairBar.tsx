import { useCallback } from 'react';
import {
  scaleLinear, max, format, scaleBand,
} from 'd3';
import { observer } from 'mobx-react';
import { Tooltip } from '@mui/material';
import { ExtraPairWidth } from '../../../../Presets/Constants';

export type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataSet: any[];
  aggregationScaleDomain: string;
  aggregationScaleRange: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secondaryDataSet?: any[];
};

function ExtraPairBar({
  secondaryDataSet, dataSet, aggregationScaleDomain, aggregationScaleRange,
}: Props) {
  const aggregationScale = useCallback(() => {
    const domain = JSON.parse(aggregationScaleDomain).map((d: number) => d.toString());
    const range = JSON.parse(aggregationScaleRange);
    const aggScale = scaleBand().domain(domain).range(range).paddingInner(0.1);
    return aggScale;
  }, [aggregationScaleDomain, aggregationScaleRange]);

  const valueScale = useCallback(() => {
    let maxVal = max(Object.values(dataSet));
    if (secondaryDataSet) {
      maxVal = max(Object.values(secondaryDataSet).concat([maxVal]));
    }
    const valScale = scaleLinear().domain([0, maxVal]).range([0, ExtraPairWidth.BarChart]);
    return valScale;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSet]);

  return (
    <>
      <g transform={`translate(0,${secondaryDataSet ? aggregationScale().bandwidth() * 0.5 : 0})`}>
        {Object.entries(dataSet).map(([val, dataVal], idx) => (
          <Tooltip title={format('.4r')(dataVal)} key={idx}>
            <rect
              x={0}
              y={aggregationScale()(val)}
              fill="#404040"
              opacity={0.8}
              width={valueScale()(dataVal)}
              height={(secondaryDataSet ? 0.5 : 1) * aggregationScale().bandwidth()}
            />
          </Tooltip>
        ))}
      </g>
      <g>
        {secondaryDataSet ? Object.entries(secondaryDataSet).map(([val, dataVal], idx) => (
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

export default (observer(ExtraPairBar));
