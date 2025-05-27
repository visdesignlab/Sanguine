import {
  IconButton, Menu, MenuItem, Tooltip,
} from '@mui/material';
import { useContext, useState, MouseEvent } from 'react';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import Store from '../../../Interfaces/Store';
import { AttributePlotLimit } from '../../../Presets/Constants';

function AttributePlotButtons({
  attributePlotLength,
  chartId,
  disbleButton,
  buttonOptions,
}: {
  attributePlotLength: number;
  chartId: string;
  disbleButton: boolean;
  buttonOptions: { key: string; value: string }[];
}) {
  const store = useContext(Store);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const addAttributePlot = (input: string) => {
    store.chartStore.addAttributePlot(chartId, input);
    handleClose();
  };

  return (
    <>
      <Tooltip title="Add additional attributes to the left of the chart">
        <IconButton color="primary" size="small" disabled={attributePlotLength >= AttributePlotLimit || disbleButton} onClick={handleClick}>
          <InsertChartIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {buttonOptions.map((option) => (
          <MenuItem key={option.key} onClick={() => { addAttributePlot(option.key); }}>{option.value}</MenuItem>
        ))}
      </Menu>

    </>
  );
}

export default AttributePlotButtons;
