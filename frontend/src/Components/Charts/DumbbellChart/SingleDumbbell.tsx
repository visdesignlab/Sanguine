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
    hovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    hoverColor: string;
};

function SingleDumbbell({
  xVal,
  dataPoint,
  isSelectSet,
  showGap,
  showPostop,
  showPreop,
  circleYValStart,
  circleYValEnd,
  hovered,
  onMouseEnter,
  onMouseLeave,
  hoverColor,
}: Props) {
  const yValCalculation = circleYValStart > circleYValEnd ? circleYValEnd : circleYValStart;
  const rectHeight = Math.abs(circleYValStart - circleYValEnd);
  return (
    <Tooltip
      title={<BiggerTooltip>{`${dataPoint.startXVal} -> ${dataPoint.endXVal}, ${dataPoint.yVal}`}</BiggerTooltip>}
      arrow
      placement="top"
    >
      <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <DumbbellRect
          x={xVal - 1}
          y={yValCalculation}
          height={rectHeight}
          selected={isSelectSet}
          display={showGap ? undefined : 'none'}
          hovered={hovered}
          hoverColor={hoverColor}
        />
        <DumbbellCircle
          cx={xVal}
          cy={circleYValStart}
          isSelectSet={isSelectSet}
          isPreop
          display={showPreop ? undefined : 'none'}
          hovered={hovered}
          hoverColor={hoverColor}
        />
        <DumbbellCircle
          cx={xVal}
          cy={circleYValEnd}
          isSelectSet={isSelectSet}
          isPreop={false}
          display={showPostop ? undefined : 'none'}
          hovered={hovered}
          hoverColor={hoverColor}
        />
      </g>
    </Tooltip>
  );
}

export default observer(SingleDumbbell);
