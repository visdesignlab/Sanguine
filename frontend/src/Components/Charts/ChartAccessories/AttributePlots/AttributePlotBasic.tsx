import { useCallback, useContext } from 'react';
import {
  scaleLinear, format, interpolateGreys, scaleBand,
} from 'd3';
import { observer } from 'mobx-react';
import { Tooltip } from '@mui/material';
import {
  basicGray, AttributePlotWidth, greyScaleRange, largeFontSize,
} from '../../../../Presets/Constants';
import Store from '../../../../Interfaces/Store';
import { AttributePlotData } from '../../../../Interfaces/Types/DataTypes';

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

  const aggregationScale = useCallback(() => {
    const domain = JSON.parse(aggregationScaleDomain).map((d: number) => d.toString());
    const range = JSON.parse(aggregationScaleRange);

    const aggScale = scaleBand().domain(domain).range(range).paddingInner(0.1);
    return aggScale;
  }, [aggregationScaleDomain, aggregationScaleRange]);

  const valueScale = scaleLinear().domain([0, 1]).range(greyScaleRange);

  return (
    <>
      <g transform={`translate(0,${secondaryPlotData ? aggregationScale().bandwidth() * 0.5 : 0})`}>
        {Object.entries(plotData.attributeData).map(([rowName, { rowCaseCount, attributeCaseCount }], idx) => {
          // Are there any cases in this row?
          const hasData = rowCaseCount > 0;
          // Find percentage of non-zero attribute value cases out of row case count.
          const casePercent = hasData
            ? (attributeCaseCount ?? 0) / rowCaseCount
            : 0;
          return (
            <g key={idx}>
              <Tooltip title={`${attributeCaseCount}/${rowCaseCount}`}>
                <rect
                  x={0}
                  y={aggregationScale()(rowName)}
                  fill={hasData
                    ? interpolateGreys(valueScale(casePercent))
                    : 'white'}
                  opacity={0.8}
                  width={AttributePlotWidth.Basic}
                  height={(secondaryPlotData ? 0.5 : 1) * aggregationScale().bandwidth()}
                />
              </Tooltip>

              <line
                opacity={hasData ? 0 : 1}
                y1={(secondaryPlotData ? 0.5 : 1) * 0.5 * aggregationScale().bandwidth() + aggregationScale()(rowName)!}
                y2={(secondaryPlotData ? 0.5 : 1) * 0.5 * aggregationScale().bandwidth() + aggregationScale()(rowName)!}
                x1={0.35 * AttributePlotWidth.Basic}
                x2={0.65 * AttributePlotWidth.Basic}
                strokeWidth={0.5}
                stroke={basicGray}
              />

              <text
                pointerEvents="none"
                x={AttributePlotWidth.Basic * 0.5}
                y={aggregationScale()(rowName)! + (secondaryPlotData ? 0.5 : 1) * 0.5 * aggregationScale().bandwidth()}
                opacity={hasData ? 1 : 0}
                fill={valueScale(casePercent) > 0.4 ? 'white' : 'black'}
                alignmentBaseline="central"
                fontSize={store.configStore.largeFont ? largeFontSize : 12}
                textAnchor="middle"
              >
                {casePercent > 0 ? format('.0%')(casePercent) : '<1%'}
              </text>
            </g>
          );
        })}
      </g>
      <g>
        {secondaryPlotData ? Object.entries(secondaryPlotData.attributeData).map(([rowName, { rowCaseCount, attributeCaseCount }], idx) => {
        // Are there any cases in this row?
          const hasData = rowCaseCount > 0;
          // Find percentage of non-zero attribute value cases out of row case count.
          const casePercent = hasData
            ? (attributeCaseCount ?? 0) / rowCaseCount
            : 0;
          return (
            <g key={idx}>
              <Tooltip title={`${attributeCaseCount}/${rowCaseCount}`}>
                <rect
                  x={0}
                  y={aggregationScale()(rowName)}
                  fill={hasData
                    ? interpolateGreys(valueScale(casePercent))
                    : 'white'}
                  opacity={0.8}
                  width={AttributePlotWidth.Basic}
                  height={aggregationScale().bandwidth() * 0.5}
                />
              </Tooltip>

              <line
                opacity={hasData ? 0 : 1}
                y1={0.25 * aggregationScale().bandwidth() + aggregationScale()(rowName)!}
                y2={0.25 * aggregationScale().bandwidth() + aggregationScale()(rowName)!}
                x1={0.35 * AttributePlotWidth.Basic}
                x2={0.65 * AttributePlotWidth.Basic}
                strokeWidth={0.5}
                stroke={basicGray}
              />

              <text
                pointerEvents="none"
                x={AttributePlotWidth.Basic * 0.5}
                y={aggregationScale()(rowName)! + 0.25 * aggregationScale().bandwidth()}
                opacity={hasData ? 1 : 0}
                fill={valueScale(casePercent) > 0.4 ? 'white' : 'black'}
                alignmentBaseline="central"
                fontSize={store.configStore.largeFont ? largeFontSize : 12}
                textAnchor="middle"
              >
                {casePercent > 0 ? format('.0%')(casePercent) : '<1%'}
              </text>
            </g>
          );
        }) : null}
      </g>
    </>
  );
}

export default observer(AttributePlotBasic);
