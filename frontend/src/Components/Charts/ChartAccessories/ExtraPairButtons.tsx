import {
  IconButton, Menu, MenuItem, Tooltip,
} from '@mui/material';
import { useContext, useState, MouseEvent } from 'react';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import Store from '../../../Interfaces/Store';
import { ExtraPairOptions } from '../../../Presets/DataDict';
import { ExtraPairLimit } from '../../../Presets/Constants';

type Props = {
    extraPairLength: number;
    chartId: string;
    disbleButton: boolean;
};
function ExtraPairButtons({ extraPairLength, chartId, disbleButton }: Props) {
  const store = useContext(Store);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const extraPairHandling = (input: string) => {
    store.chartStore.addExtraPair(chartId, input);
    handleClose();
  };

  return (
    <>
      <Tooltip title="Add additional attributes to the left of the chart">
        <IconButton color="primary" size="small" disabled={extraPairLength >= ExtraPairLimit || disbleButton} onClick={handleClick}>
          <InsertChartIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {ExtraPairOptions.map((option) => (
          <MenuItem key={option.key} onClick={() => { extraPairHandling(option.key); }}>{option.text}</MenuItem>
        ))}
      </Menu>

    </>
  );
}

export default ExtraPairButtons;
