import { useCallback, useContext } from 'react';
import {
  scaleLinear, format, interpolateGreys, scaleBand,
} from 'd3';
import { observer } from 'mobx-react';
import { Tooltip } from '@mui/material';
import {
  basicGray, ExtraPairWidth, greyScaleRange, largeFontSize,
} from '../../../../Presets/Constants';
import Store from '../../../../Interfaces/Store';

interface OwnProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataSet: any[];
  aggregationScaleDomain: string;
  aggregationScaleRange: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secondaryDataSet?: any[];
}

type Props = OwnProps;

function ExtraPairBasic({
  secondaryDataSet, dataSet, aggregationScaleRange, aggregationScaleDomain,
}: Props) {
  const store = useContext(Store);

  const aggregationScale = useCallback(() => {
    const domain = JSON.parse(aggregationScaleDomain).map((d: number) => d.toString());
    const range = JSON.parse(aggregationScaleRange);

    const aggScale = scaleBand().domain(domain).range(range).paddingInner(0.1);
    return aggScale;
  }, [aggregationScaleDomain, aggregationScaleRange]);

  const valueScale = scaleLinear().domain([0, 1]).range(greyScaleRange);

  return (
    <>
      <g transform={`translate(0,${secondaryDataSet ? aggregationScale().bandwidth() * 0.5 : 0})`}>
        {Object.entries(dataSet).map(([val, dataVal], idx) => (
          <g key={idx}>
            <Tooltip title={`${dataVal.actualVal}/${dataVal.outOfTotal}`}>
              <rect
                x={0}
                y={aggregationScale()(val)}
                fill={!Number.isNaN(dataVal.calculated) ? interpolateGreys(valueScale(dataVal.calculated)) : 'white'}
                opacity={0.8}
                width={ExtraPairWidth.Basic}
                height={(secondaryDataSet ? 0.5 : 1) * aggregationScale().bandwidth()}
              />
            </Tooltip>
            <line
              opacity={!Number.isNaN(dataVal.calculated) ? 0 : 1}
              y1={(secondaryDataSet ? 0.5 : 1) * 0.5 * aggregationScale().bandwidth() + aggregationScale()(val)!}
              y2={(secondaryDataSet ? 0.5 : 1) * 0.5 * aggregationScale().bandwidth() + aggregationScale()(val)!}
              x1={0.35 * ExtraPairWidth.Basic}
              x2={0.65 * ExtraPairWidth.Basic}
              strokeWidth={0.5}
              stroke={basicGray}
            />
            <text
              x={ExtraPairWidth.Basic * 0.5}
              y={aggregationScale()(val)! + (secondaryDataSet ? 0.5 : 1) * 0.5 * aggregationScale().bandwidth()}
              opacity={!Number.isNaN(dataVal.calculated) ? 1 : 0}
              fill={valueScale(dataVal.calculated) > 0.4 ? 'white' : 'black'}
              alignmentBaseline="central"
              fontSize={store.configStore.largeFont ? largeFontSize : 12}
              textAnchor="middle"
            >
              {Math.round(dataVal.calculated * 100) === 0 && dataVal.calculated > 0 ? '<1%' : format('.0%')(dataVal.calculated)}
            </text>
          </g>
        ))}
      </g>
      <g>
        {secondaryDataSet ? Object.entries(secondaryDataSet).map(([val, dataVal], idx) => (
          <g key={idx}>
            <Tooltip title={`${dataVal.actualVal}/${dataVal.outOfTotal}`}>
              <rect
                x={0}
                y={aggregationScale()(val)}
                fill={!Number.isNaN(dataVal.calculated) ? interpolateGreys(valueScale(dataVal.calculated)) : 'white'}
                opacity={0.8}
                width={ExtraPairWidth.Basic}
                height={aggregationScale().bandwidth() * 0.5}
              />
            </Tooltip>
            <line
              opacity={!Number.isNaN(dataVal.calculated) ? 0 : 1}
              y1={0.25 * aggregationScale().bandwidth() + aggregationScale()(val)!}
              y2={0.25 * aggregationScale().bandwidth() + aggregationScale()(val)!}
              x1={0.35 * ExtraPairWidth.Basic}
              x2={0.65 * ExtraPairWidth.Basic}
              strokeWidth={0.5}
              stroke={basicGray}
            />
            <text
              x={ExtraPairWidth.Basic * 0.5}
              y={aggregationScale()(val)! + 0.25 * aggregationScale().bandwidth()}
              opacity={!Number.isNaN(dataVal.calculated) ? 1 : 0}
              fill={valueScale(dataVal.calculated) > 0.4 ? 'white' : 'black'}
              alignmentBaseline="central"
              fontSize={store.configStore.largeFont ? largeFontSize : 12}
              textAnchor="middle"
            >
              {Math.round(dataVal.calculated * 100) === 0 && dataVal.calculated > 0 ? '<1%' : format('.0%')(dataVal.calculated)}
            </text>
          </g>
        )) : null}
      </g>
    </>
  );
}

export default observer(ExtraPairBasic);
