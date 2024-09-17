import { Tooltip } from '@mui/material';
import {
  format, interpolateGreys, interpolateReds, ScaleBand,
} from 'd3';
import { observer } from 'mobx-react';
import { useCallback, useContext } from 'react';
import { HeatmapColorScale, HeatmapGreyScale, ValueScaleGeneratorFromDomainRange } from '../../../HelperFunctions/Scales';
import Store from '../../../Interfaces/Store';
import { HeatMapDataPoint } from '../../../Interfaces/Types/DataTypes';
import { basicGray } from '../../../Presets/Constants';
import { HeatMapRect } from '../../../Presets/StyledSVGComponents';

type Props = {
    valueScaleDomain: string;
    valueScaleRange: string;
    dataPoint: HeatMapDataPoint;
    howToTransform: string;
    bandwidth: number;
};
function SingleHeatRow({
  dataPoint, valueScaleDomain, valueScaleRange, howToTransform, bandwidth,
}: Props) {
  const store = useContext(Store);
  const { showZero } = store.provenanceState;
  const valueScale = useCallback(() => (ValueScaleGeneratorFromDomainRange(valueScaleDomain, valueScaleRange, true) as ScaleBand<string>), [valueScaleDomain, valueScaleRange]);

  return (
    <>
      {valueScale().domain().map((point) => {
        if (dataPoint.countDict[point]) {
          const output = dataPoint.countDict[point].length;
          const caseCount = showZero ? dataPoint.caseCount : dataPoint.caseCount - dataPoint.zeroCaseNum;
          // let disables = false;
          let colorFill = output === 0 ? 'white' : interpolateReds(HeatmapColorScale(output / caseCount));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (!showZero && point as any === 0) {
            colorFill = output === 0 ? 'white' : interpolateGreys(HeatmapGreyScale(output / (dataPoint.caseCount)));
            // disables = true;
          }

          const outputContent = (output / caseCount < 0.01 && output > 0) ? '<1%' : format('.0%')(output / caseCount);

          return (
            <g key={`${dataPoint.aggregateAttribute}-${point}`}>
              <Tooltip
                title={`${output}, ${outputContent}`}
                arrow
                key={`${dataPoint.aggregateAttribute}-${point}`}
                placement="top"
                hidden={output === 0}
              >
                <HeatMapRect
                  fill={colorFill}
                  x={valueScale()(point)}
                  transform={howToTransform}
                  width={valueScale().bandwidth()}
                  height={bandwidth}
                  key={`${dataPoint.aggregateAttribute}-${point}`}
                />
              </Tooltip>
              <line
                transform={howToTransform}
                strokeWidth={0.5}
                stroke={basicGray}
                opacity={output === 0 ? 1 : 0}
                y1={0.5 * bandwidth}
                y2={0.5 * bandwidth}
                key={`${dataPoint.aggregateAttribute} - ${point}blank`}
                x1={valueScale()(point)! + 0.35 * valueScale().bandwidth()}
                x2={valueScale()(point)! + 0.65 * valueScale().bandwidth()}
              />
            </g>
          );
        }
        return null;
      })}
    </>
  );
}

export default observer(SingleHeatRow);
