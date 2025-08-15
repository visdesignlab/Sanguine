import { useContext, useState, MouseEvent } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import { NestedMenuItem } from 'mui-nested-menu';
import {
  IconButton, Menu, MenuItem, Tooltip,
} from '@mui/material';
import { observer } from 'mobx-react';
import Store from '../../../Interfaces/Store';
import { addOptions, Outcome, OutcomeOptions } from '../../../Presets/DataDict';
import { LayoutElement, xAxisOption, yAxisOption } from '../../../Interfaces/Types/LayoutTypes';
import { DropdownInputTypes } from '../../../Interfaces/Types/DropdownInputType';

function ChartConfigMenu({ layout }: { layout: LayoutElement }) {
  const {
    xAxisVar, yAxisVar, i: chartId, chartType,
  } = layout;
  const store = useContext(Store);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const changeXAxis = (userInput: DropdownInputTypes) => {
    const { key } = userInput;
    store.chartStore.changeChart(key as xAxisOption, yAxisVar, chartId, chartType, 'NONE');
    handleClose();
  };

  const changeYAxis = (userInput: DropdownInputTypes) => {
    const { key } = userInput;
    store.chartStore.changeChart(xAxisVar, key as yAxisOption, chartId, chartType, 'NONE');
    handleClose();
  };

  const changeOutcome = (userInput: DropdownInputTypes) => {
    const { key } = userInput;
    store.chartStore.changeChart(xAxisVar, yAxisVar, chartId, chartType, key as Outcome);
    handleClose();
  };

  const noneOption = { key: 'NONE', value: 'None' };
  const OutcomeDropdownOptions = [...OutcomeOptions, noneOption];

  return (
    <>
      <Tooltip title="Update chart attributes">
        <IconButton size="small" onClick={handleClick}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {['DUMBBELL', 'SCATTER', 'HEATMAP'].includes(chartType) ? (
          <NestedMenuItem
            label="Change X Axis"
            parentMenuOpen={open}
          >
            {addOptions[chartType].x.map((option) => (
              <MenuItem key={option.key} onClick={() => { changeXAxis(option); }}>{option.value}</MenuItem>
            ))}
          </NestedMenuItem>
        ) : []}
        {['SCATTER', 'HEATMAP', 'COST'].includes(chartType) ? (
          <NestedMenuItem
            label="Change Y Axis"
            parentMenuOpen={open}
          >
            {addOptions[chartType].y.map((option) => (
              <MenuItem key={option.key} onClick={() => { changeYAxis(option); }}>{option.value}</MenuItem>
            ))}
          </NestedMenuItem>
        ) : []}
        {['HEATMAP', 'COST'].includes(chartType) ? (
          <NestedMenuItem
            label="Change Outcome Comparison"
            parentMenuOpen={open}
          >
            {OutcomeDropdownOptions.map((option) => (
              <MenuItem key={option.key} onClick={() => { changeOutcome(option); }}>{option.value}</MenuItem>
            ))}
          </NestedMenuItem>
        ) : []}
      </Menu>
    </>
  );
}

export default observer(ChartConfigMenu);
