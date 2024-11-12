import { useContext, useState, MouseEvent } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import { NestedMenuItem } from 'mui-nested-menu';
import {
  IconButton, Menu, MenuItem, Tooltip,
} from '@mui/material';
import { observer } from 'mobx-react';
import Store from '../../../Interfaces/Store';
import {
  addOptions, Outcome, OutcomeOptions, typeDiction,
} from '../../../Presets/DataDict';
import { xAxisOption, yAxisOption } from '../../../Interfaces/Types/LayoutTypes';
import { DropdownInputTypes } from '../../../Interfaces/Types/DropdownInputType';

type Props = {
  xAxisVar: xAxisOption;
  yAxisVar: yAxisOption;
  chartTypeIndexinArray: number;
  chartId: string;
  xChangeable?: boolean;
  yChangeable?: boolean;
  outcomeChangeable?: boolean;
};

function ChartConfigMenu({
  xAxisVar, yAxisVar, chartTypeIndexinArray, chartId, xChangeable = false, yChangeable = false, outcomeChangeable = false,
}: Props) {
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
    store.chartStore.changeChart(key as xAxisOption, yAxisVar, chartId, typeDiction[chartTypeIndexinArray], 'NONE');
    handleClose();
  };

  const changeYAxis = (userInput: DropdownInputTypes) => {
    const { key } = userInput;
    store.chartStore.changeChart(xAxisVar, key as yAxisOption, chartId, typeDiction[chartTypeIndexinArray], 'NONE');
    handleClose();
  };

  const changeOutcome = (userInput: DropdownInputTypes) => {
    const { key } = userInput;
    store.chartStore.changeChart(xAxisVar, yAxisVar, chartId, typeDiction[chartTypeIndexinArray], key as Outcome);
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
        {xChangeable ? (
          <NestedMenuItem
            label="Change X Axis"
            parentMenuOpen={open}
          >
            {addOptions[chartTypeIndexinArray][0].map((option) => (
              <MenuItem key={option.key} onClick={() => { changeXAxis(option); }}>{option.value}</MenuItem>
            ))}
          </NestedMenuItem>
        ) : []}
        {yChangeable ? (
          <NestedMenuItem
            label="Change Y Axis"
            parentMenuOpen={open}
          >
            {addOptions[chartTypeIndexinArray][1].map((option) => (
              <MenuItem key={option.key} onClick={() => { changeYAxis(option); }}>{option.value}</MenuItem>
            ))}
            {chartTypeIndexinArray === 0 ? <MenuItem key="NONE" onClick={() => { changeYAxis(noneOption); }}>None</MenuItem> : null}
          </NestedMenuItem>
        ) : []}
        {outcomeChangeable ? (
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
