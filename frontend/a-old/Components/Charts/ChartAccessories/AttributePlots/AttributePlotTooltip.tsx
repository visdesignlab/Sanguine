import { Tooltip } from '@mui/material';
import { ReactElement } from 'react';

// shared values
const bgColor = '#fff';
const textColor = '#000';
const border = `1px solid ${textColor}`;
const disablePointer = { pointerEvents: 'none' };

export function AttributePlotTooltip({
  children,
  title,
}: {children: ReactElement, title: React.ReactNode}) {
  const tooltipSx = {
    disablePointer,
    backgroundColor: bgColor,
    color: textColor,
    borderColor: { border },
  };

  const arrowSx = {
    disablePointer,
    color: bgColor,
    '&:before': { border },
  };

  return (
    <Tooltip
      placement="top"
      arrow
      title={title}
      slotProps={{
        popper: {
          modifiers: [{ name: 'offset', options: { offset: [0, -5] } }],
          sx: disablePointer,
        },
        tooltip: { sx: tooltipSx },
        arrow: { sx: arrowSx },
      }}
    >
      {children}
    </Tooltip>
  );
}
