import { Tooltip } from '@mui/material';
import { ReactElement } from 'react';

interface ExtraPairTooltipProps {
  children: ReactElement;
  title: React.ReactNode;
}

export function ExtraPairTooltip({
  children,
  title,
}: ExtraPairTooltipProps) {
  return (
    <Tooltip
      placement="bottom"
      arrow
      title={title}
      slotProps={{
        popper: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -5],
              },
            },
          ],
          sx: {
            pointerEvents: 'none',
          },
        },
      }}
    >
      {children}
    </Tooltip>
  );
}
