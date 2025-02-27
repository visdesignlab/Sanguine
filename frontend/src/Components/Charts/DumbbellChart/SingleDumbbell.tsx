import { Tooltip } from '@mui/material';
import { observer } from 'mobx-react';
import { DumbbellDataPoint } from '../../../Interfaces/Types/DataTypes';
import { BiggerTooltip } from '../../../Presets/StyledComponents';
import { DumbbellCircle, DumbbellRect } from '../../../Presets/StyledSVGComponents';

type Props = {
    xVal: number;
    dataPoint: DumbbellDataPoint;
    isSelectSet: boolean;
    showPreop: boolean;
    showPostop: boolean;
    showGap: boolean;
    circleYValStart: number;
    circleYValEnd: number;
};

function SingleDumbbell({
  xVal, dataPoint, isSelectSet, showGap, showPostop, showPreop, circleYValStart, circleYValEnd,
}: Props) {
  const yValCalculation = circleYValStart > circleYValEnd ? circleYValEnd : circleYValStart;
  const rectHeight = Math.abs(circleYValStart - circleYValEnd);
  return (
    <Tooltip
      title={<BiggerTooltip>{`${dataPoint.startYVal} -> ${dataPoint.endYVal}, ${dataPoint.xVal}`}</BiggerTooltip>}
      arrow
      placement="top"
    >
      <g>
        <DumbbellRect
          x={xVal - 1}
          y={yValCalculation}
          height={rectHeight}
          isselected={isSelectSet}
          display={showGap ? undefined : 'none'}
        />
        <DumbbellCircle
          cx={xVal}
          cy={circleYValStart}
          isSelectSet={isSelectSet}
          ispreop
          display={showPreop ? undefined : 'none'}
        />
        <DumbbellCircle
          cx={
                        xVal
                    }
          cy={circleYValEnd}
          isSelectSet={isSelectSet}
          ispreop={false}
          display={showPostop ? undefined : 'none'}
        />
      </g>
    </Tooltip>
  );
}

export default observer(SingleDumbbell);
